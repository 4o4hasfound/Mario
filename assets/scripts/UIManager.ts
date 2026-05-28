import GameManager from './GameManager';

const { ccclass, property } = cc._decorator;

/**
 * UIManager — manages the in-game HUD display.
 *
 * Shows: lives count, score, coin count, timer countdown.
 * Also manages Game Over and Level Clear overlays.
 *
 * Attach to a fixed UI layer (Widget-anchored) that doesn't scroll with the camera.
 */
@ccclass
export default class UIManager extends cc.Component {

    // ── HUD Elements ───────────────────────────────────────────────
    @property({ type: cc.Label, tooltip: 'Score label' })
    scoreLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: 'Coin count label' })
    coinLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: 'Lives count label' })
    livesLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: 'Timer label' })
    timerLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: 'Level name label' })
    levelNameLabel: cc.Label = null;

    // ── Overlay panels ─────────────────────────────────────────────
    @property({ type: cc.Node, tooltip: 'Game Over overlay panel' })
    gameOverPanel: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'Level Clear overlay panel' })
    levelClearPanel: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'Pause overlay panel' })
    pausePanel: cc.Node = null;

    @property({ type: cc.Label, tooltip: 'Final score label on game over panel' })
    finalScoreLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: 'Clear score label on level clear panel' })
    clearScoreLabel: cc.Label = null;

    @property({ type: cc.Label, tooltip: 'Time bonus label on level clear panel' })
    timeBonusLabel: cc.Label = null;

    // ── Timer ──────────────────────────────────────────────────────
    @property({ tooltip: 'Time limit in seconds' })
    timeLimit: number = 300;

    private _timeRemaining: number = 300;
    private _timerRunning: boolean = true;

    // ── Lifecycle ──────────────────────────────────────────────────
    onLoad() {
        // Hide overlays initially
        if (this.gameOverPanel) this.gameOverPanel.active = false;
        if (this.levelClearPanel) this.levelClearPanel.active = false;
        if (this.pausePanel) this.pausePanel.active = false;

        this._timeRemaining = this.timeLimit;

        // Listen to game events
        cc.systemEvent.on('score-changed', this._onScoreChanged, this);
        cc.systemEvent.on('coins-changed', this._onCoinsChanged, this);
        cc.systemEvent.on('lives-changed', this._onLivesChanged, this);
        cc.systemEvent.on('game-over', this._onGameOver, this);
        cc.systemEvent.on('level-clear', this._onLevelClear, this);
        cc.systemEvent.on('game-paused', this._onPause, this);
        cc.systemEvent.on('game-resumed', this._onResume, this);

        // Keyboard listener for pause
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    start() {
        this._refreshAll();
    }

    onDestroy() {
        cc.systemEvent.off('score-changed', this._onScoreChanged, this);
        cc.systemEvent.off('coins-changed', this._onCoinsChanged, this);
        cc.systemEvent.off('lives-changed', this._onLivesChanged, this);
        cc.systemEvent.off('game-over', this._onGameOver, this);
        cc.systemEvent.off('level-clear', this._onLevelClear, this);
        cc.systemEvent.off('game-paused', this._onPause, this);
        cc.systemEvent.off('game-resumed', this._onResume, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
    }

    update(dt: number) {
        if (!this._timerRunning) return;
        if (!GameManager.instance || GameManager.instance.gameState !== GameManager.STATE_PLAYING) return;

        this._timeRemaining -= dt;
        if (this._timeRemaining <= 0) {
            this._timeRemaining = 0;
            this._timerRunning = false;
            // Time's up — player dies
            cc.systemEvent.emit('time-up');
            const player = cc.find('Canvas/Player');
            if (player) {
                const playerComp = player.getComponent('Player');
                if (playerComp) (playerComp as any).die();
            }
        }

        this._updateTimer();
    }

    // ── Refresh all HUD elements ───────────────────────────────────
    private _refreshAll() {
        const gm = GameManager.instance;
        if (!gm) return;

        if (this.scoreLabel) this.scoreLabel.string = this._padScore(gm.score);
        if (this.coinLabel) this.coinLabel.string = `x${gm.coins}`;
        if (this.livesLabel) this.livesLabel.string = `x${gm.lives}`;
        if (this.levelNameLabel) this.levelNameLabel.string = `WORLD ${gm.currentLevel + 1}-1`;
        this._updateTimer();
    }

    private _updateTimer() {
        if (this.timerLabel) {
            this.timerLabel.string = String(Math.ceil(this._timeRemaining));
        }

        // Flash red when low time
        if (this.timerLabel && this._timeRemaining <= 30) {
            this.timerLabel.node.color = (Math.floor(this._timeRemaining * 2) % 2 === 0)
                ? cc.Color.RED
                : cc.Color.WHITE;
        }
    }

    private _padScore(score: number): string {
        return String(score).padStart(6, '0');
    }

    // ── Event handlers ─────────────────────────────────────────────
    private _onScoreChanged(score: number) {
        if (this.scoreLabel) this.scoreLabel.string = this._padScore(score);
    }

    private _onCoinsChanged(coins: number) {
        if (this.coinLabel) this.coinLabel.string = `x${coins}`;
    }

    private _onLivesChanged(lives: number) {
        if (this.livesLabel) this.livesLabel.string = `x${lives}`;
    }

    private _onGameOver() {
        this._timerRunning = false;
        if (this.gameOverPanel) {
            this.gameOverPanel.active = true;
            this.gameOverPanel.opacity = 0;
            cc.tween(this.gameOverPanel)
                .to(0.5, { opacity: 255 })
                .start();
        }
        if (this.finalScoreLabel && GameManager.instance) {
            this.finalScoreLabel.string = `SCORE: ${this._padScore(GameManager.instance.score)}`;
        }
    }

    private _onLevelClear() {
        this._timerRunning = false;
        if (this.levelClearPanel) {
            this.levelClearPanel.active = true;
            this.levelClearPanel.opacity = 0;
            cc.tween(this.levelClearPanel)
                .to(0.5, { opacity: 255 })
                .start();
        }

        // Time bonus: remaining seconds × 50 points
        const timeBonus = Math.ceil(this._timeRemaining) * 50;
        if (GameManager.instance) GameManager.instance.addScore(timeBonus);

        if (this.clearScoreLabel && GameManager.instance) {
            this.clearScoreLabel.string = `SCORE: ${this._padScore(GameManager.instance.score)}`;
        }
        if (this.timeBonusLabel) {
            this.timeBonusLabel.string = `TIME BONUS: +${timeBonus}`;
        }
    }

    private _onPause() {
        if (this.pausePanel) this.pausePanel.active = true;
    }

    private _onResume() {
        if (this.pausePanel) this.pausePanel.active = false;
    }

    private _onKeyDown(event: cc.Event.EventKeyboard) {
        if (event.keyCode === cc.macro.KEY.escape || event.keyCode === cc.macro.KEY.p) {
            const gm = GameManager.instance;
            if (!gm) return;
            if (gm.gameState === GameManager.STATE_PLAYING) {
                gm.pauseGame();
            } else if (gm.gameState === GameManager.STATE_PAUSED) {
                gm.resumeGame();
            }
        }
    }

    // ── Button callbacks (wire in editor) ──────────────────────────
    public onRetryClicked() {
        if (GameManager.instance) GameManager.instance.retryLevel();
    }

    public onMenuClicked() {
        if (GameManager.instance) GameManager.instance.goToMenu();
    }

    public onNextLevelClicked() {
        if (GameManager.instance) {
            const nextLevel = GameManager.instance.currentLevel + 1;
            GameManager.instance.startGame(nextLevel);
        }
    }

    public onResumeClicked() {
        if (GameManager.instance) GameManager.instance.resumeGame();
    }

    /** Update the time limit (called by LevelBuilder) */
    public setTimeLimit(seconds: number) {
        this.timeLimit = seconds;
        this._timeRemaining = seconds;
        this._timerRunning = true;
    }
}
