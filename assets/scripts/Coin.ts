import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/**
 * Coin — collectible coin placed in the level.
 *
 * When the player contacts this node:
 *   - Adds 1 coin + 200 score
 *   - Plays coin sound
 *   - Fly-up + fade animation, then destroy
 *
 * Requires: cc.PhysicsBoxCollider (sensor = true)
 * Node must be in group "item".
 */
@ccclass
export default class Coin extends cc.Component {

    @property({ tooltip: 'Score value per coin' })
    scoreValue: number = 200;

    @property({ type: cc.AudioClip, tooltip: 'Coin collect sound' })
    coinSound: cc.AudioClip = null;

    @property({ type: cc.SpriteAtlas, tooltip: 'Coin sprite atlas for animation' })
    atlas: cc.SpriteAtlas = null;

    // ── Internal ───────────────────────────────────────────────────
    private _collected: boolean = false;
    private _sprite: cc.Sprite = null;
    private _animFrames: cc.SpriteFrame[] = [];
    private _animIndex: number = 0;
    private _animTimer: number = 0;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
        this.node.group = 'item';

        // Load spinning animation frames
        if (this.atlas) {
            const frames = this.atlas.getSpriteFrames();
            for (const f of frames) {
                const name = f.name.toLowerCase();
                if (name.includes('coin') || name.includes('spin')) {
                    this._animFrames.push(f);
                }
            }
        }
    }

    update(dt: number) {
        if (this._collected) return;

        // Spin animation
        if (this._animFrames.length > 1) {
            this._animTimer += dt;
            if (this._animTimer >= 0.15) {
                this._animTimer = 0;
                this._animIndex = (this._animIndex + 1) % this._animFrames.length;
                this._sprite.spriteFrame = this._animFrames[this._animIndex];
            }
        } else {
            // Simple rotation if no atlas frames
            this.node.angle += dt * 180;
        }
    }

    onBeginContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        if (this._collected) return;
        if (otherCollider.node.group !== 'player') return;

        this._collected = true;

        if (AudioManager.instance && this.coinSound) {
            AudioManager.instance.playSFX(this.coinSound);
        }

        if (GameManager.instance) {
            GameManager.instance.addScore(this.scoreValue);
            GameManager.instance.addCoin();
        }

        // Collect animation: fly up + fade
        cc.tween(this.node)
            .by(0.3, { y: 50, opacity: -255 }, { easing: 'sineOut' })
            .call(() => { this.node.destroy(); })
            .start();
    }
}
