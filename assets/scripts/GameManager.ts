import FirebaseManager from './FirebaseManager';
const { ccclass, property } = cc._decorator;

/**
 * GameManager — singleton that persists across all scenes.
 * Tracks lives, score, coins, current level, player state (big/small),
 * and orchestrates game flow (scene transitions, game over, level clear).
 */
@ccclass
export default class GameManager extends cc.Component {

    private static _instance: GameManager = null;

    // ── Persistent game state ──────────────────────────────────────
    /** Number of remaining lives (default 3) */
    public lives: number = 3;

    /** Accumulated score */
    public score: number = 0;

    /** Accumulated coins; every 100 coins grants 1 extra life */
    public coins: number = 0;

    /** Currently selected level index (0-based) */
    public currentLevel: number = 0;

    /** Whether Mario is in "big" (Super) form */
    public isBigMario: boolean = false;

    /** Levels that have been unlocked */
    public unlockedLevels: boolean[] = [true, false, false];

    /** High score (persisted via cc.sys.localStorage) */
    public highScore: number = 0;

    // ── Game state enum (public for external checks) ───────────────
    public static readonly STATE_PLAYING  = 0;
    public static readonly STATE_PAUSED   = 1;
    public static readonly STATE_GAMEOVER = 2;
    public static readonly STATE_CLEAR    = 3;
    public static readonly STATE_DYING    = 4;

    public gameState: number = GameManager.STATE_PLAYING;

    // ── Singleton accessor ─────────────────────────────────────────
    public static get instance(): GameManager {
        return GameManager._instance;
    }

    // ── Lifecycle ──────────────────────────────────────────────────
    onLoad() {
        if (GameManager._instance && GameManager._instance !== this) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
        cc.game.addPersistRootNode(this.node);

        // Restore persisted high score
        const saved = cc.sys.localStorage.getItem('mario_highscore');
        if (saved) {
            this.highScore = parseInt(saved, 10) || 0;
        }

        // Listen for firebase login to restore cloud highscore
        cc.systemEvent.on('firebase-login', async () => {
            if (FirebaseManager.instance) {
                const cloudScore = await FirebaseManager.instance.fetchMyHighScore();
                if (cloudScore > this.highScore) {
                    this.highScore = cloudScore;
                    cc.sys.localStorage.setItem('mario_highscore', String(this.highScore));
                }
            }
        });
    }

    // ── Score ──────────────────────────────────────────────────────
    public addScore(points: number): void {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            cc.sys.localStorage.setItem('mario_highscore', String(this.highScore));
            if (FirebaseManager.instance) {
                FirebaseManager.instance.saveHighScore(this.highScore);
            }
        }
        cc.systemEvent.emit('score-changed', this.score);
    }

    // ── Coins ──────────────────────────────────────────────────────
    public addCoin(): void {
        this.coins += 1;
        if (this.coins >= 100) {
            this.coins -= 100;
            this.addLife();
        }
        cc.systemEvent.emit('coins-changed', this.coins);
    }

    // ── Lives ──────────────────────────────────────────────────────
    public addLife(): void {
        this.lives += 1;
        cc.systemEvent.emit('lives-changed', this.lives);
    }

    public loseLife(): void {
        this.lives -= 1;
        cc.systemEvent.emit('lives-changed', this.lives);
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    // ── Mario power state ──────────────────────────────────────────
    public setMarioBig(big: boolean): void {
        this.isBigMario = big;
        cc.systemEvent.emit('mario-power-changed', big);
    }

    // ── Game flow ──────────────────────────────────────────────────
    public startGame(level: number): void {
        this.currentLevel = level;
        this.gameState = GameManager.STATE_PLAYING;
        this.isBigMario = false;
        cc.director.loadScene('Game');
    }

    public gameOver(): void {
        this.gameState = GameManager.STATE_GAMEOVER;
        if (FirebaseManager.instance) {
            FirebaseManager.instance.saveHighScore(this.highScore);
        }
        cc.systemEvent.emit('game-over');
    }

    public levelClear(): void {
        this.gameState = GameManager.STATE_CLEAR;
        // Unlock next level
        const next = this.currentLevel + 1;
        if (next < this.unlockedLevels.length) {
            this.unlockedLevels[next] = true;
        } else {
            // Final level finished! Submit the highscore.
            if (FirebaseManager.instance) {
                FirebaseManager.instance.saveHighScore(this.highScore);
            }
        }
        cc.systemEvent.emit('level-clear');
    }

    public resetGame(): void {
        this.lives = 3;
        this.score = 0;
        this.coins = 0;
        this.isBigMario = false;
        this.gameState = GameManager.STATE_PLAYING;
    }

    public goToMenu(): void {
        this.resetGame();
        cc.director.loadScene('StartMenu');
    }

    public retryLevel(): void {
        if (this.lives > 0) {
            this.gameState = GameManager.STATE_PLAYING;
            this.isBigMario = false;
            cc.director.loadScene('Game');
        } else {
            this.goToMenu();
        }
    }

    public pauseGame(): void {
        if (this.gameState === GameManager.STATE_PLAYING) {
            this.gameState = GameManager.STATE_PAUSED;
            cc.director.pause();
            cc.systemEvent.emit('game-paused');
        }
    }

    public resumeGame(): void {
        if (this.gameState === GameManager.STATE_PAUSED) {
            this.gameState = GameManager.STATE_PLAYING;
            cc.director.resume();
            cc.systemEvent.emit('game-resumed');
        }
    }
}
