import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/**
 * StartMenu — controls the start menu scene.
 *
 * Displays the game title, a start button, and plays menu BGM.
 * Initializes GameManager and AudioManager singletons if not already present.
 */
@ccclass
export default class StartMenu extends cc.Component {

    @property({ type: cc.Node, tooltip: 'Title image node' })
    titleNode: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'Start button node' })
    startButton: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'High score label node' })
    highScoreNode: cc.Node = null;

    @property({ type: cc.AudioClip, tooltip: 'Menu BGM clip' })
    menuBGM: cc.AudioClip = null;

    onLoad() {
        // Ensure GameManager exists
        if (!GameManager.instance) {
            const gmNode = new cc.Node('GameManager');
            gmNode.addComponent(GameManager);
            cc.director.getScene().addChild(gmNode);
        }

        // Ensure AudioManager exists
        if (!AudioManager.instance) {
            const amNode = new cc.Node('AudioManager');
            amNode.addComponent(AudioManager);
            cc.director.getScene().addChild(amNode);
        }
    }

    start() {
        // Play menu BGM
        if (AudioManager.instance && this.menuBGM) {
            AudioManager.instance.playBGM(this.menuBGM);
        }

        // Title bounce animation
        if (this.titleNode) {
            cc.tween(this.titleNode)
                .repeatForever(
                    cc.tween()
                        .by(0.8, { y: 15 }, { easing: 'sineInOut' })
                        .by(0.8, { y: -15 }, { easing: 'sineInOut' })
                )
                .start();
        }

        // Start button pulse
        if (this.startButton) {
            cc.tween(this.startButton)
                .repeatForever(
                    cc.tween()
                        .to(0.6, { scale: 1.05 }, { easing: 'sineInOut' })
                        .to(0.6, { scale: 1.0 }, { easing: 'sineInOut' })
                )
                .start();
        }

        // Show high score
        if (this.highScoreNode && GameManager.instance) {
            const label = this.highScoreNode.getComponent(cc.Label);
            if (label) {
                label.string = `HIGH SCORE: ${String(GameManager.instance.highScore).padStart(6, '0')}`;
            }
        }
    }

    // ── Button callback (wire in editor) ───────────────────────────
    public onStartClicked() {
        cc.director.loadScene('LevelSelect');
    }
}
