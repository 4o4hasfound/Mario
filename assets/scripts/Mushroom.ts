import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/**
 * Mushroom — Super Mushroom power-up.
 *
 * After spawning from a question block:
 *   - Moves horizontally at constant speed
 *   - Bounces off walls (reverses direction)
 *   - On contact with player: makes Mario big, adds score
 *   - Falls due to gravity, lands on ground
 *
 * Requires: cc.RigidBody (Dynamic), cc.PhysicsBoxCollider
 * Node must be in group "item".
 */
@ccclass
export default class Mushroom extends cc.Component {

    @property({ tooltip: 'Horizontal movement speed' })
    moveSpeed: number = 80;

    @property({ tooltip: 'Points awarded on collection' })
    scoreValue: number = 1000;

    @property({ type: cc.AudioClip, tooltip: 'Collection sound' })
    collectSound: cc.AudioClip = null;

    // ── Internal ───────────────────────────────────────────────────
    private _rb: cc.RigidBody = null;
    private _direction: number = 1; // 1 = right, -1 = left
    private _collected: boolean = false;

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
        this.node.group = 'item';
    }

    update(dt: number) {
        if (this._collected) return;
        if (!this._rb) return;

        // Move horizontally
        const vel = this._rb.linearVelocity;
        vel.x = this._direction * this.moveSpeed;
        this._rb.linearVelocity = vel;
    }

    onBeginContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        if (this._collected) {
            contact.disabled = true; // Disable all further physical bounces!
            return;
        }

        const otherGroup = otherCollider.node.group;

        // Collected by player
        if (otherGroup === 'player') {
            contact.disabled = true; // Prevents physics bouncing!
            this._collected = true;

            // Make Mario big
            const player = otherCollider.node.getComponent('Player');
            if (player) {
                (player as any).grow();
            }

            if (AudioManager.instance && this.collectSound) {
                AudioManager.instance.playSFX(this.collectSound);
            }

            if (GameManager.instance) {
                GameManager.instance.addScore(this.scoreValue);
            }

            // Score popup
            this._showScorePopup();

            // Disable visuals immediately
            this.node.scale = 0;
            const sprite = this.getComponent(cc.Sprite);
            if (sprite) sprite.enabled = false;
            
            // To ensure it can't be interacted with again in any physics step, schedule full teardown
            this.scheduleOnce(() => {
                if (this.node.isValid) {
                    const collider = this.getComponent(cc.PhysicsBoxCollider);
                    if (collider) collider.enabled = false;
                    this.node.active = false;
                    this.node.removeFromParent();
                    this.node.destroy();
                }
            });
            return;
        }

        // Bounce off walls
        if (otherGroup === 'ground' || otherGroup === 'default' || otherGroup === 'block') {
            const normal = contact.getWorldManifold().normal;
            if (Math.abs(normal.x) > 0.7) {
                this._direction *= -1;
            }
        }
    }

    private _showScorePopup() {
        const popup = new cc.Node('ScorePopup');
        const label = popup.addComponent(cc.Label);
        label.string = `+${this.scoreValue}`;
        label.fontSize = 14;
        label.lineHeight = 18;
        popup.color = cc.Color.WHITE;
        popup.setPosition(this.node.x, this.node.y + 20);
        if (this.node.parent) {
            this.node.parent.addChild(popup);
        }
        cc.tween(popup)
            .by(0.5, { y: 40, opacity: -255 })
            .call(() => { popup.destroy(); })
            .start();
    }
}
