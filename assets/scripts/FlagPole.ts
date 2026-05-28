import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/**
 * FlagPole — end-of-level flag.
 *
 * When the player contacts the flag:
 *   1. Play level clear music
 *   2. Flag slides down the pole (tween animation)
 *   3. Award remaining-time bonus
 *   4. Trigger level clear sequence
 *
 * Requires: cc.PhysicsBoxCollider (sensor = true)
 * Node must be in group "flag".
 */
@ccclass
export default class FlagPole extends cc.Component {

    @property({ type: cc.Node, tooltip: 'The flag sprite node (child that slides down)' })
    flagSprite: cc.Node = null;

    @property({ tooltip: 'Y position of the pole base (flag slides to here)' })
    poleBaseY: number = 0;

    @property({ type: cc.AudioClip, tooltip: 'Level clear jingle' })
    levelClearSound: cc.AudioClip = null;

    private _triggered: boolean = false;

    onBeginContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        if (this._triggered) return;
        if (otherCollider.node.group !== 'player') return;

        this._triggered = true;

        // Stop BGM and play level clear jingle
        if (AudioManager.instance) {
            AudioManager.instance.stopBGM();
            if (this.levelClearSound) {
                AudioManager.instance.playSFX(this.levelClearSound);
            }
        }

        // Slide the flag down to the base!
        if (this.flagSprite) {
            cc.tween(this.flagSprite)
                .to(1.0, { y: this.poleBaseY }, { easing: 'sineIn' })
                .start();
        }

        // Score bonus for height on pole
        const player = otherCollider.node;
        const heightRatio = Math.max(0, Math.min(1, (player.y - this.node.y) / 200));
        const heightBonus = Math.floor(heightRatio * 5000);
        if (GameManager.instance) {
            GameManager.instance.addScore(heightBonus);
        }

        // Trigger level clear after delay
        this.scheduleOnce(() => {
            if (GameManager.instance) {
                GameManager.instance.levelClear();
            }
        }, 3.0);
    }
}
