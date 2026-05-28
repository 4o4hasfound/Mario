const { ccclass, property } = cc._decorator;

/**
 * AudioManager — singleton that handles all background music and sound effects.
 * Persists across scenes. Uses cc.audioEngine internally.
 * BGM plays in a loop; SFX plays one-shot without interrupting BGM.
 */
@ccclass
export default class AudioManager extends cc.Component {

    private static _instance: AudioManager = null;

    @property({ type: cc.AudioClip, tooltip: 'Menu background music' })
    menuBGM: cc.AudioClip = null;

    @property({ type: cc.AudioClip, tooltip: 'Level 1 background music' })
    gameBGM1: cc.AudioClip = null;

    @property({ type: cc.AudioClip, tooltip: 'Level 2 background music' })
    gameBGM2: cc.AudioClip = null;

    @property({ type: cc.AudioClip, tooltip: 'Level 3 background music' })
    gameBGM3: cc.AudioClip = null;

    @property({ tooltip: 'BGM volume 0-1' })
    bgmVolume: number = 0.5;

    @property({ tooltip: 'SFX volume 0-1' })
    sfxVolume: number = 0.8;

    private _bgmId: number = -1;

    public static get instance(): AudioManager {
        return AudioManager._instance;
    }

    onLoad() {
        if (AudioManager._instance && AudioManager._instance !== this) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        cc.game.addPersistRootNode(this.node);
    }

    // ── BGM ────────────────────────────────────────────────────────

    /**
     * Play a background music clip on loop.
     * Stops any currently-playing BGM first.
     */
    public playBGM(clip: cc.AudioClip): void {
        if (!clip) return;
        this.stopBGM();
        this._bgmId = cc.audioEngine.play(clip, true, this.bgmVolume);
    }

    /** Play the BGM associated with the given level index. */
    public playLevelBGM(level: number): void {
        const clips = [this.gameBGM1, this.gameBGM2, this.gameBGM3];
        const clip = clips[level] || this.gameBGM1;
        this.playBGM(clip);
    }

    /** Play menu BGM. */
    public playMenuBGM(): void {
        this.playBGM(this.menuBGM);
    }

    public stopBGM(): void {
        if (this._bgmId >= 0) {
            cc.audioEngine.stop(this._bgmId);
            this._bgmId = -1;
        }
    }

    public pauseBGM(): void {
        if (this._bgmId >= 0) {
            cc.audioEngine.pause(this._bgmId);
        }
    }

    public resumeBGM(): void {
        if (this._bgmId >= 0) {
            cc.audioEngine.resume(this._bgmId);
        }
    }

    // ── SFX ────────────────────────────────────────────────────────

    /** Play a one-shot sound effect. Does NOT stop BGM. */
    public playSFX(clip: cc.AudioClip): void {
        if (!clip) return;
        cc.audioEngine.play(clip, false, this.sfxVolume);
    }

    // ── Volume control ─────────────────────────────────────────────

    public setBGMVolume(v: number): void {
        this.bgmVolume = cc.misc.clampf(v, 0, 1);
        if (this._bgmId >= 0) {
            cc.audioEngine.setVolume(this._bgmId, this.bgmVolume);
        }
    }

    public setSFXVolume(v: number): void {
        this.sfxVolume = cc.misc.clampf(v, 0, 1);
    }
}
