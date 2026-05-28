import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/**
 * LevelSelect — controls the level selection scene.
 *
 * Shows level buttons (locked/unlocked) and a back button.
 * Each level button loads the Game scene with the selected level.
 */
@ccclass
export default class LevelSelect extends cc.Component {

    @property({ type: [cc.Node], tooltip: 'Level button nodes (ordered by level index)' })
    levelButtons: cc.Node[] = [];

    @property({ type: cc.Node, tooltip: 'Back button node' })
    backButton: cc.Node = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Unlocked level button sprite' })
    unlockedFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Locked level button sprite' })
    lockedFrame: cc.SpriteFrame = null;

    @property({ type: cc.Node, tooltip: 'Title node' })
    titleNode: cc.Node = null;

    start() {
        // Update button states
        this._refreshButtons();

        // Animate title
        if (this.titleNode) {
            cc.tween(this.titleNode)
                .repeatForever(
                    cc.tween()
                        .by(1.0, { y: 10 }, { easing: 'sineInOut' })
                        .by(1.0, { y: -10 }, { easing: 'sineInOut' })
                )
                .start();
        }

        // Animate buttons entrance
        for (let i = 0; i < this.levelButtons.length; i++) {
            const btn = this.levelButtons[i];
            const targetX = btn.x;
            btn.x = -500;
            btn.opacity = 0;
            cc.tween(btn)
                .delay(i * 0.15)
                .to(0.4, { x: targetX, opacity: 255 }, { easing: 'backOut' })
                .start();
        }
    }

    private _refreshButtons() {
        const gm = GameManager.instance;
        if (!gm) return;

        for (let i = 0; i < this.levelButtons.length; i++) {
            const btn = this.levelButtons[i];
            const unlocked = i < gm.unlockedLevels.length && gm.unlockedLevels[i];

            // Set button sprite
            const sprite = btn.getComponent(cc.Sprite);
            if (sprite) {
                sprite.spriteFrame = unlocked ? this.unlockedFrame : this.lockedFrame;
            }

            // Set button interactivity
            const button = btn.getComponent(cc.Button);
            if (button) {
                button.interactable = unlocked;
            }

            // Set label
            const label = btn.getComponentInChildren(cc.Label);
            if (label) {
                label.string = unlocked ? `World ${i + 1}` : '🔒';
            }

            // Opacity for locked
            btn.opacity = unlocked ? 255 : 150;
        }
    }

    // ── Button callbacks (wire in editor) ──────────────────────────
    public onLevelClicked(event: cc.Event, levelIndexStr: string) {
        const levelIndex = parseInt(levelIndexStr, 10);
        if (GameManager.instance) {
            GameManager.instance.resetGame();
            GameManager.instance.startGame(levelIndex);
        }
    }

    public onLevel1Clicked() { this.onLevelClicked(null, '0'); }
    public onLevel2Clicked() { this.onLevelClicked(null, '1'); }
    public onLevel3Clicked() { this.onLevelClicked(null, '2'); }

    public onBackClicked() {
        cc.director.loadScene('StartMenu');
    }
}
