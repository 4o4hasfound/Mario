import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/** Player states */
enum PlayerState {
    IDLE = 0,
    WALKING,
    JUMPING,
    DYING,
    GROWING,
}

/**
 * Player — main player controller.
 *
 * Handles keyboard input, physics movement, jump, ground detection,
 * collision with enemies / blocks / items, death & respawn, and
 * sprite animation (walk / jump / idle / die).
 *
 * Requires a cc.RigidBody (Dynamic) and cc.PhysicsBoxCollider on the same node.
 */
@ccclass
export default class Player extends cc.Component {

    // ── Inspector properties ───────────────────────────────────────
    @property({ tooltip: 'Horizontal move speed (px/s)' })
    moveSpeed: number = 200;

    @property({ tooltip: 'Jump impulse applied to rigid body' })
    jumpForce: number = 585;

    @property({ tooltip: 'Maximum horizontal velocity' })
    maxSpeedX: number = 300;

    @property({ type: [cc.SpriteFrame], tooltip: 'Frames for small Mario walking' })
    smallWalkFrames: cc.SpriteFrame[] = [];

    @property({ type: cc.SpriteFrame, tooltip: 'Frame for small Mario jumping' })
    smallJumpFrame: cc.SpriteFrame = null;

    @property({ type: [cc.SpriteFrame], tooltip: 'Frames for big Mario walking' })
    bigWalkFrames: cc.SpriteFrame[] = [];

    @property({ type: cc.SpriteFrame, tooltip: 'Frame for big Mario jumping' })
    bigJumpFrame: cc.SpriteFrame = null;

    @property({ type: cc.AudioClip })
    jumpSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    deathSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    powerUpSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    powerDownSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip })
    stompSound: cc.AudioClip = null;

    // ── Internal state ─────────────────────────────────────────────
    private _rb: cc.RigidBody = null;
    private _sprite: cc.Sprite = null;
    private _state: PlayerState = PlayerState.IDLE;
    private _isGrounded: boolean = false;
    private _groundContacts: number = 0;
    private _inputLeft: boolean = false;
    private _inputRight: boolean = false;
    private _inputJump: boolean = false;
    private _facingRight: boolean = true;
    private _isBig: boolean = false;
    private _isDying: boolean = false;
    private _isInvincible: boolean = false;
    private _invincibleTimer: number = 0;

    private _walkIndex: number = 0;
    private _walkTimer: number = 0;
    private readonly WALK_FRAME_INTERVAL = 0.1; // seconds per frame

    // Spawn position
    private _spawnPos: cc.Vec2 = cc.v2(0, 0);

    // ── Lifecycle ──────────────────────────────────────────────────
    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
        this._sprite = this.getComponent(cc.Sprite);
        this._spawnPos = cc.v2(this.node.x, this.node.y);

        // Keyboard listeners
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    start() {
        // Init hitbox properly
        this._setBig(this._isBig, false);
        // Check if Mario should start big (e.g. from GameManager state)
        if (GameManager.instance && GameManager.instance.isBigMario) {
            this._setBig(true, false);
        }
    }

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number) {
        if (this._isDying) return;
        
        // Allow updating during normal play AND during level clear (so Mario can walk off)
        if (GameManager.instance) {
            const state = GameManager.instance.gameState;
            if (state !== GameManager.STATE_PLAYING && state !== GameManager.STATE_CLEAR) {
                return;
            }
        }

        this._handleMovement(dt);
        this._handleJump();
        this._updateAnimation(dt);
        this._updateInvincibility(dt);
        this._checkOutOfBounds();
    }

    // ── Input ──────────────────────────────────────────────────────
    private onKeyDown(event: cc.Event.EventKeyboard) {
        if (GameManager.instance && GameManager.instance.gameState !== GameManager.STATE_PLAYING) return;
        switch (event.keyCode) {
            case cc.macro.KEY.left:
            case cc.macro.KEY.a:
                this._inputLeft = true;
                break;
            case cc.macro.KEY.right:
            case cc.macro.KEY.d:
                this._inputRight = true;
                break;
            case cc.macro.KEY.space:
            case cc.macro.KEY.up:
            case cc.macro.KEY.w:
                this._inputJump = true;
                break;
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard) {
        if (GameManager.instance && GameManager.instance.gameState !== GameManager.STATE_PLAYING) return;
        switch (event.keyCode) {
            case cc.macro.KEY.left:
            case cc.macro.KEY.a:
                this._inputLeft = false;
                break;
            case cc.macro.KEY.right:
            case cc.macro.KEY.d:
                this._inputRight = false;
                break;
            case cc.macro.KEY.space:
            case cc.macro.KEY.up:
            case cc.macro.KEY.w:
                this._inputJump = false;
                break;
        }
    }

    // ── Movement ───────────────────────────────────────────────────
    private _handleMovement(dt: number) {
        const vel = this._rb.linearVelocity;
        let targetVx = 0;

        if (this._inputLeft) targetVx -= this.moveSpeed;
        if (this._inputRight) targetVx += this.moveSpeed;

        if (targetVx === 0) {
            // Forcefully snap X velocity to 0 when no keys are pressed 
            // to completely eliminate any physics drifting or sliding on start!
            vel.x = 0;
        } else {
            // Smooth acceleration
            vel.x = cc.misc.lerp(vel.x, targetVx, 0.2);
            // Clamp
            vel.x = cc.misc.clampf(vel.x, -this.maxSpeedX, this.maxSpeedX);
        }

        this._rb.linearVelocity = vel;

        // Flip sprite
        if (targetVx > 0 && !this._facingRight) {
            this._facingRight = true;
            this.node.scaleX = Math.abs(this.node.scaleX);
        } else if (targetVx < 0 && this._facingRight) {
            this._facingRight = false;
            this.node.scaleX = -Math.abs(this.node.scaleX);
        }

        // Update state
        if (this._isGrounded) {
            this._state = Math.abs(vel.x) > 10 ? PlayerState.WALKING : PlayerState.IDLE;
        }
    }

    private _handleJump() {
        if (this._inputJump && this._isGrounded) {
            const vel = this._rb.linearVelocity;
            vel.y = this.jumpForce;
            this._rb.linearVelocity = vel;
            this._isGrounded = false;
            this._state = PlayerState.JUMPING;
            this._inputJump = false; // consume
            if (AudioManager.instance) AudioManager.instance.playSFX(this.jumpSound);
        }
    }

    // ── Animation ──────────────────────────────────────────────────
    private _updateAnimation(dt: number) {
        const walkFrames = this._isBig ? this.bigWalkFrames : this.smallWalkFrames;
        const jumpFrame = this._isBig ? this.bigJumpFrame : this.smallJumpFrame;

        if (this._state === PlayerState.JUMPING && jumpFrame) {
            this._sprite.spriteFrame = jumpFrame;
        } else if (this._state === PlayerState.WALKING && walkFrames.length > 0) {
            this._walkTimer += dt;
            if (this._walkTimer >= this.WALK_FRAME_INTERVAL) {
                this._walkTimer = 0;
                this._walkIndex = (this._walkIndex + 1) % walkFrames.length;
                this._sprite.spriteFrame = walkFrames[this._walkIndex];
            }
        } else if (this._state === PlayerState.IDLE && walkFrames.length > 0) {
            this._sprite.spriteFrame = walkFrames[0];
        }
    }

    // ── Invincibility flicker ──────────────────────────────────────
    private _updateInvincibility(dt: number) {
        if (!this._isInvincible) return;
        this._invincibleTimer -= dt;
        // Flicker effect
        this.node.opacity = (Math.floor(this._invincibleTimer * 10) % 2 === 0) ? 255 : 100;
        if (this._invincibleTimer <= 0) {
            this._isInvincible = false;
            this.node.opacity = 255;
        }
    }

    // ── Out of bounds ──────────────────────────────────────────────
    private _checkOutOfBounds() {
        if (this.node.y < -200) {
            this.die();
        }
    }

    // ── Collision ──────────────────────────────────────────────────
    onBeginContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        const otherNode = otherCollider.node;
        const group = otherNode.group;

        // Ground contact — check normal direction
        const worldManifold = contact.getWorldManifold();
        const normal = worldManifold.normal;
        // If contact normal points upward relative to this body, we are standing on something
        // Normal points from self to other in Cocos 2.x Box2D
        const isBelow = normal.y < -0.5; // other is below us → we landed on it
        const isAbove = normal.y > 0.5;  // other is above us → we hit it from below

        if (group === 'ground' || group === 'default') {
            if (isBelow) {
                this._groundContacts++;
                this._isGrounded = true;
                this._state = PlayerState.IDLE;
            }
        }

        // Question block — hit from below
        if (group === 'block') {
            if (isAbove) {
                // Trigger the block
                const block = otherNode.getComponent('QuestionBlock');
                if (block) block.onHit(this._isBig);
            }
            if (isBelow) {
                this._groundContacts++;
                this._isGrounded = true;
            }
        }

        // Enemy collision
        if (group === 'enemy') {
            if (isBelow) {
                // Stomped on enemy
                const enemy = otherNode.getComponent('Enemy');
                if (enemy) {
                    enemy.onStomped();
                    // Bounce player
                    const vel = this._rb.linearVelocity;
                    vel.y = this.jumpForce * 0.6;
                    this._rb.linearVelocity = vel;
                    if (AudioManager.instance) AudioManager.instance.playSFX(this.stompSound);
                }
            } else {
                // Hit by enemy from side or below
                this.takeDamage();
            }
        }

        // Item / Power-up
        if (group === 'item') {
            // Handled by the item script itself
        }

        // Flag
        if (group === 'flag') {
            this._onFlagReached(otherNode);
        }

        // Kill zone
        if (group === 'killzone') {
            this.die();
        }
    }

    onEndContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        const otherNode = otherCollider.node;
        const group = otherNode.group;

        if (group === 'ground' || group === 'default' || group === 'block') {
            const worldManifold = contact.getWorldManifold();
            const normal = worldManifold.normal;
            if (normal.y < -0.5) {
                this._groundContacts = Math.max(0, this._groundContacts - 1);
                if (this._groundContacts === 0) {
                    this._isGrounded = false;
                }
            }
        }
    }

    // ── Damage & Death ─────────────────────────────────────────────
    public takeDamage() {
        if (this._isInvincible || this._isDying) return;

        if (this._isBig) {
            // Shrink from big to small
            this.scheduleOnce(() => {
                this._setBig(false, true);
                this._isInvincible = true;
                this._invincibleTimer = 2.0;
                if (AudioManager.instance) AudioManager.instance.playSFX(this.powerDownSound);
            });
        } else {
            this.die();
        }
    }

    public die() {
        if (this._isDying) return;
        this._isDying = true;
        this._state = PlayerState.DYING;

        if (AudioManager.instance) {
            AudioManager.instance.stopBGM();
            AudioManager.instance.playSFX(this.deathSound);
        }

        // Disable physics
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (collider) collider.enabled = false;

        // Death jump animation
        cc.tween(this.node)
            .by(0.3, { y: 80 }, { easing: 'sineOut' })
            .by(0.6, { y: -400 }, { easing: 'sineIn' })
            .call(() => {
                if (GameManager.instance) {
                    GameManager.instance.setMarioBig(false);
                    GameManager.instance.loseLife();
                    // If still has lives, respawn after short delay
                    if (GameManager.instance.lives > 0) {
                        this.scheduleOnce(() => {
                            GameManager.instance.retryLevel();
                        }, 1.5);
                    }
                }
            })
            .start();
    }

    // ── Power-ups ──────────────────────────────────────────────────
    public grow() {
        if (this._isBig) return;
        this.scheduleOnce(() => {
            this._setBig(true, true);
            if (AudioManager.instance) AudioManager.instance.playSFX(this.powerUpSound);
            if (GameManager.instance) GameManager.instance.setMarioBig(true);
            if (GameManager.instance) GameManager.instance.addScore(1000);
        });
    }

    private _setBig(big: boolean, animate: boolean) {
        const wasBig = this._isBig;
        this._isBig = big;
        
        // Resize visual node (no node.y changes needed since anchorY is 0)
        if (big) {
            this.node.height = 64;
            this.node.width = 32;
        } else {
            this.node.height = 32;
            this.node.width = 32;
        }

        // Resize collider
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (collider) {
            collider.friction = 0; // Prevent Mario from sticking to walls!
            if (big) {
                collider.size = cc.size(24, 60); // Slightly thinner
                collider.offset = cc.v2(0, 30); // center of 60 is 30, so bottom touches 0
            } else {
                collider.size = cc.size(24, 28);
                collider.offset = cc.v2(0, 14); // center of 28 is 14, so bottom touches 0
            }
            collider.apply();
        }

        if (animate) {
            // Flicker effect during transformation
            let flickerCount = 0;
            this.schedule(() => {
                this.node.opacity = (flickerCount % 2 === 0) ? 255 : 100;
                flickerCount++;
            }, 0.08, 10);
            this.scheduleOnce(() => { this.node.opacity = 255; }, 1.0);
        }
    }

    // ── Flag ───────────────────────────────────────────────────────
    private _onFlagReached(poleNode: cc.Node) {
        if (GameManager.instance) {
            if (GameManager.instance.gameState === GameManager.STATE_CLEAR) return; // Prevent double trigger!
            GameManager.instance.gameState = GameManager.STATE_CLEAR;
        }
        // Disable input
        this._inputLeft = false;
        this._inputRight = false;
        // Immediately stop all physics to prevent gravity/velocity fighting the tween!
        // Must defer to next frame because Box2D world is locked during onBeginContact
        this.scheduleOnce(() => {
            if (!this.node.isValid) return;

            if (this._rb) {
                this._rb.type = cc.RigidBodyType.Static;
                this._rb.linearVelocity = cc.v2(0, 0);
            }
            
            // Face the pole (right)
            this._facingRight = true;
            this.node.scaleX = Math.abs(this.node.scaleX);
            
            // Snap to the left side of the pole
            this.node.x = poleNode.x - 16;
            
            // Use idle frame for sliding
            const walkFrames = this._isBig ? this.bigWalkFrames : this.smallWalkFrames;
            if (walkFrames.length > 0) this._sprite.spriteFrame = walkFrames[0];

            // New Custom sequence: Shoot up, arc right, land, and walk into hut!
            const groundY = poleNode.y - 80; // Accurate top of the ground surface
            
            cc.tween(this.node)
                .call(() => {
                    // Face right and jump!
                    this.node.scaleX = Math.abs(this.node.scaleX);
                    const jumpFrame = this._isBig ? this.bigJumpFrame : this.smallJumpFrame;
                    if (jumpFrame) this._sprite.spriteFrame = jumpFrame;
                })
                // Shoot UP and right
                .by(0.4, { y: 250, x: 60 }, { easing: 'sineOut' })
                // Arc down to the ground, landing just in front of the hut
                .to(0.4, { y: groundY, x: poleNode.x + 130 }, { easing: 'sineIn' })
                .call(() => {
                    // Land and start walking animation loop
                    if (walkFrames.length > 1) {
                        this.schedule(() => {
                            this._walkIndex = (this._walkIndex + 1) % walkFrames.length;
                            this._sprite.spriteFrame = walkFrames[this._walkIndex];
                        }, this.WALK_FRAME_INTERVAL);
                    }
                })
                // Walk horizontally directly into the center of the hut's black door (at col + 6)
                .to(0.8, { x: poleNode.x + 192 })
                .call(() => {
                    this.node.active = false; // Vanish into the dark door!
                })
                .start();
        });
    }

    // ── Public getters ─────────────────────────────────────────────
    public get isBig(): boolean { return this._isBig; }
    public get isGrounded(): boolean { return this._isGrounded; }
    public get state(): PlayerState { return this._state; }
}
