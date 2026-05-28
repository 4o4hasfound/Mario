import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/** Enemy type enum */
enum EnemyType {
    GOOMBA = 0,
    TURTLE = 1,
    FLOWER = 2,
}

/**
 * Enemy — handles all enemy types: Goomba, Turtle, Flower (Piranha Plant).
 *
 * - Goomba: patrols left/right, dies when stomped (flatten + remove).
 * - Turtle: patrols, becomes a shell when stomped; shell can be kicked.
 * - Flower: stationary, pops up/down from a pipe periodically.
 *
 * Requires: cc.RigidBody (Dynamic for Goomba/Turtle, Static for Flower)
 *           cc.PhysicsBoxCollider
 *           cc.Sprite
 * Node must be in group "enemy".
 */
@ccclass
export default class Enemy extends cc.Component {

    @property({ type: cc.Enum(EnemyType), tooltip: 'Type of enemy' })
    enemyType: EnemyType = EnemyType.GOOMBA;

    @property({ tooltip: 'Horizontal patrol speed' })
    moveSpeed: number = 60;

    @property({ tooltip: 'Points awarded when killed' })
    scoreValue: number = 100;

    @property({ type: cc.SpriteAtlas, tooltip: 'Enemy sprite atlas' })
    atlas: cc.SpriteAtlas = null;

    @property({ type: cc.AudioClip, tooltip: 'Sound when stomped' })
    stompSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip, tooltip: 'Sound when shell kicked' })
    kickSound: cc.AudioClip = null;

    // ── Internal ───────────────────────────────────────────────────
    private _rb: cc.RigidBody = null;
    private _sprite: cc.Sprite = null;
    private _isDead: boolean = false;
    private _isShell: boolean = false;     // Turtle shell state
    private _shellMoving: boolean = false;
    private _direction: number = -1;       // -1 = left, 1 = right
    private _isActive: boolean = false;    // Only move when activated (on screen)

    // Walk animation
    private _walkFrames: cc.SpriteFrame[] = [];
    private _walkIndex: number = 0;
    private _walkTimer: number = 0;
    private readonly WALK_FRAME_INTERVAL = 0.2;

    // Flower pop-up
    private _flowerBaseY: number = 0;
    private _flowerPopHeight: number = 32;
    private _flowerTimer: number = 0;
    private _flowerUp: boolean = false;

    // Activation distance from camera
    private readonly ACTIVATION_DISTANCE = 2000;

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
        this._sprite = this.getComponent(cc.Sprite);
        this._loadFrames();

        if (this.enemyType === EnemyType.FLOWER) {
            this._flowerBaseY = this.node.y;
            // Flower doesn't move horizontally
            if (this._rb) {
                this._rb.type = cc.RigidBodyType.Static;
            }
        }
    }

    private _loadFrames() {
        if (!this.atlas) return;
        this._walkFrames = [];
        const allFrames = this.atlas.getSpriteFrames();
        
        // Since frames are just numbered (e.g., turtle_0.png, turtle_1.png),
        // the first two frames (index 0 and 1) are the walking frames for both Goomba and Turtle.
        if (allFrames.length >= 2) {
            this._walkFrames = [allFrames[0], allFrames[1]];
        } else {
            this._walkFrames = allFrames;
        }

        if (this._walkFrames.length > 0) {
            this._sprite.spriteFrame = this._walkFrames[0];
        }
    }

    update(dt: number) {
        if (this._isDead) return;
        if (GameManager.instance && GameManager.instance.gameState !== GameManager.STATE_PLAYING) return;

        // Check activation
        this._checkActivation();
        if (!this._isActive) return;

        switch (this.enemyType) {
            case EnemyType.GOOMBA:
            case EnemyType.TURTLE:
                this._updatePatrol(dt);
                break;
            case EnemyType.FLOWER:
                this._updateFlower(dt);
                break;
        }

        this._updateWalkAnimation(dt);
    }

    private _checkActivation() {
        // Activate when near camera (approximate: use canvas center)
        const cam = cc.Camera.main;
        if (!cam) {
            this._isActive = true;
            return;
        }
        const camX = cam.node.x;
        this._isActive = Math.abs(this.node.x - camX) < this.ACTIVATION_DISTANCE;
    }

    // ── Patrol movement ────────────────────────────────────────────
    private _updatePatrol(dt: number) {
        if (this._isShell && !this._shellMoving) return; // Static shell

        // Chase player
        if (!this._isShell) {
            let player = this.node.parent.getChildByName('Player');
            if (player) {
                this._direction = player.x < this.node.x ? -1 : 1;
            }
        }

        let speed = this._isShell ? this.moveSpeed * 3 : this.moveSpeed;

        // Prevent falling off ledges when chasing
        const physicsManager = cc.director.getPhysicsManager();
        if (physicsManager.enabled && !this._isShell) {
            const scaleX = Math.abs(this.node.scaleX);
            const scaleY = Math.abs(this.node.scaleY);
            const frontX = this.node.x + this._direction * (this.node.width * scaleX / 2 + 5);
            const p1 = cc.v2(frontX, this.node.y);
            const p2 = cc.v2(frontX, this.node.y - (this.node.height * scaleY / 2 + 20));
            
            const results = physicsManager.rayCast(p1, p2, cc.RayCastType.Any);
            if (results.length === 0) {
                // No ground ahead! Stop moving so it doesn't fall off the ledge
                speed = 0;
            }
        }

        const vel = this._rb.linearVelocity;
        vel.x = this._direction * speed;
        this._rb.linearVelocity = vel;

        // Flip sprite
        this.node.scaleX = this._direction > 0 ? -Math.abs(this.node.scaleX) : Math.abs(this.node.scaleX);
    }

    private _updateWalkAnimation(dt: number) {
        if (this._isShell || this.enemyType === EnemyType.FLOWER) return;
        if (this._walkFrames.length === 0) return;

        this._walkTimer += dt;
        if (this._walkTimer >= this.WALK_FRAME_INTERVAL) {
            this._walkTimer = 0;
            this._walkIndex = (this._walkIndex + 1) % this._walkFrames.length;
            this._sprite.spriteFrame = this._walkFrames[this._walkIndex];
        }
    }

    // ── Flower behavior ────────────────────────────────────────────
    private _updateFlower(dt: number) {
        this._flowerTimer += dt;
        const cycleDuration = 3.0; // seconds per up/down cycle

        if (!this._flowerUp && this._flowerTimer >= cycleDuration) {
            this._flowerUp = true;
            this._flowerTimer = 0;
            cc.tween(this.node)
                .to(0.5, { y: this._flowerBaseY + this._flowerPopHeight }, { easing: 'sineOut' })
                .delay(1.5)
                .to(0.5, { y: this._flowerBaseY }, { easing: 'sineIn' })
                .call(() => { this._flowerUp = false; this._flowerTimer = 0; })
                .start();
        }
    }

    // ── Collision ──────────────────────────────────────────────────
    onBeginContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        if (this._isDead) return;

        const otherGroup = otherCollider.node.group;

        // Reverse direction on wall/ground/block side contact
        if (otherGroup === 'ground' || otherGroup === 'default' || otherGroup === 'block') {
            const normal = contact.getWorldManifold().normal;
            // Horizontal contact (wall)
            if (Math.abs(normal.x) > 0.7) {
                this._direction *= -1;
            }
        }

        // Enemy-enemy collision
        if (otherGroup === 'enemy') {
            const otherEnemy = otherCollider.node.getComponent(Enemy);
            // If this is a moving shell, kill the other enemy
            if (this._isShell && this._shellMoving && otherEnemy) {
                otherEnemy.onStomped();
            } else if (!this._isShell) {
                this._direction *= -1;
            }
        }
    }

    // ── Public: called by Player when stomped ──────────────────────
    public onStomped() {
        if (this._isDead) return;

        if (AudioManager.instance) AudioManager.instance.playSFX(this.stompSound);
        if (GameManager.instance) GameManager.instance.addScore(this.scoreValue);

        switch (this.enemyType) {
            case EnemyType.GOOMBA:
                this._dieGoomba();
                break;
            case EnemyType.TURTLE:
                if (!this._isShell) {
                    this._becomeShell();
                } else if (!this._shellMoving) {
                    this._kickShell();
                } else {
                    this._stopShell();
                }
                break;
            case EnemyType.FLOWER:
                this._dieFlower();
                break;
        }
    }

    // ── Goomba death ───────────────────────────────────────────────
    private _dieGoomba() {
        this._isDead = true;
        // Flatten sprite
        this.node.scaleY = 0.3;
        // Disable physics
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (collider) collider.enabled = false;
        if (this._rb) this._rb.linearVelocity = cc.v2(0, 0);

        // Show squished frame if available
        if (this.atlas) {
            const frames = this.atlas.getSpriteFrames();
            for (const f of frames) {
                if (f.name.toLowerCase().includes('dead') || f.name.toLowerCase().includes('flat') || f.name.toLowerCase().includes('squish')) {
                    this._sprite.spriteFrame = f;
                    break;
                }
            }
        }

        // Remove after delay
        this.scheduleOnce(() => {
            this.node.destroy();
        }, 0.5);
    }

    // ── Turtle shell ───────────────────────────────────────────────
    private _becomeShell() {
        this._isShell = true;
        this._shellMoving = false;
        const vel = this._rb.linearVelocity;
        vel.x = 0;
        this._rb.linearVelocity = vel;

        // Show shell frame
        if (this.atlas) {
            const frames = this.atlas.getSpriteFrames();
            let shellFrame = null;
            for (const f of frames) {
                if (f.name.toLowerCase().includes('shell') || f.name.toLowerCase().includes('hide')) {
                    shellFrame = f;
                    break;
                }
            }
            // Fallback for numbered sprites (e.g., turtle_4.png is usually the shell)
            if (!shellFrame && this.enemyType === EnemyType.TURTLE && frames.length > 0) {
                shellFrame = frames.length >= 5 ? frames[4] : frames[frames.length - 1];
            }
            if (shellFrame) {
                this._sprite.spriteFrame = shellFrame;
            }
        }

        // Auto-recover after 5 seconds if not kicked
        this.scheduleOnce(() => {
            if (this._isShell && !this._shellMoving && !this._isDead) {
                this._isShell = false;
                this._loadFrames();
            }
        }, 5.0);
    }

    private _kickShell() {
        this._shellMoving = true;
        // Determine kick direction based on player position
        const player = cc.find('Canvas/Player');
        if (player) {
            this._direction = player.x < this.node.x ? 1 : -1;
        }
        if (AudioManager.instance) AudioManager.instance.playSFX(this.kickSound);
    }

    private _stopShell() {
        this._shellMoving = false;
        const vel = this._rb.linearVelocity;
        vel.x = 0;
        this._rb.linearVelocity = vel;
    }

    // ── Flower death ───────────────────────────────────────────────
    private _dieFlower() {
        this._isDead = true;
        cc.tween(this.node)
            .to(0.3, { opacity: 0, y: this.node.y - 20 })
            .call(() => { this.node.destroy(); })
            .start();
    }

    // ── Public getters ─────────────────────────────────────────────
    public get isDead(): boolean { return this._isDead; }
    public get isShell(): boolean { return this._isShell; }
}
