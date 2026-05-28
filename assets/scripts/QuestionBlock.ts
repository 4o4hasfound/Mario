import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

/** What the question block contains */
enum BlockContent {
    COIN = 0,
    MUSHROOM = 1,
}

/**
 * QuestionBlock — interactive question mark block.
 *
 * When hit from below by the player:
 *   - Bounce animation (tween up then back)
 *   - Spawn item (coin or super mushroom)
 *   - Switch to "used" appearance
 *   - Play sound effect
 *
 * Requires: cc.RigidBody (Static), cc.PhysicsBoxCollider
 * Node must be in group "block".
 */
@ccclass
export default class QuestionBlock extends cc.Component {

    @property({ type: cc.Enum(BlockContent), tooltip: 'What this block contains' })
    content: BlockContent = BlockContent.COIN;

    @property({ type: cc.SpriteFrame, tooltip: 'Active (question mark) sprite frame' })
    activeFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Used (empty) sprite frame' })
    usedFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Mushroom sprite frame' })
    mushroomFrame: cc.SpriteFrame = null;

    @property({ type: cc.Prefab, tooltip: 'Mushroom prefab to spawn' })
    mushroomPrefab: cc.Prefab = null;

    @property({ type: cc.Prefab, tooltip: 'Coin effect prefab to spawn' })
    coinPrefab: cc.Prefab = null;

    @property({ type: cc.AudioClip, tooltip: 'Coin collected sound' })
    coinSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip, tooltip: 'Power-up appear sound' })
    powerUpAppearSound: cc.AudioClip = null;

    @property({ type: cc.AudioClip, tooltip: 'Bump sound when hit used block' })
    bumpSound: cc.AudioClip = null;

    // ── Internal ───────────────────────────────────────────────────
    private _isUsed: boolean = false;
    private _sprite: cc.Sprite = null;
    private _originalY: number = 0;
    private _isBouncing: boolean = false;

    // Animation frames for the ? block
    private _animFrames: cc.SpriteFrame[] = [];
    private _animIndex: number = 0;
    private _animTimer: number = 0;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
        this._originalY = this.node.y;

        if (this.activeFrame) {
            this._sprite.spriteFrame = this.activeFrame;
        }
    }

    update(dt: number) {
        if (this._isUsed) return;

        // Subtle pulsing glow on active blocks
        this._animTimer += dt;
        if (this._animTimer >= 0.5) {
            this._animTimer = 0;
            // Simple brightness oscillation
            const t = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
            this.node.opacity = 200 + t * 55;
        }
    }

    /**
     * Called by Player when hitting this block from below.
     * @param isBigMario Whether the player is big Mario (affects brick breaking)
     */
    public onHit(isBigMario: boolean) {
        if (this._isBouncing) return;

        if (this._isUsed) {
            // Play bump sound for used block
            if (AudioManager.instance && this.bumpSound) {
                AudioManager.instance.playSFX(this.bumpSound);
            }
            return;
        }

        this._isUsed = true;
        this._isBouncing = true;

        // Switch to used sprite
        if (this.usedFrame) {
            this._sprite.spriteFrame = this.usedFrame;
        }
        this.node.opacity = 255;

        // Bounce animation
        cc.tween(this.node)
            .by(0.08, { y: 12 }, { easing: 'sineOut' })
            .by(0.08, { y: -12 }, { easing: 'sineIn' })
            .call(() => {
                this._isBouncing = false;
                this.node.y = this._originalY; // ensure exact position
            })
            .start();

        // Spawn content
        switch (this.content) {
            case BlockContent.COIN:
                this._spawnCoin();
                break;
            case BlockContent.MUSHROOM:
                this._spawnMushroom();
                break;
        }
    }

    private _spawnCoin() {
        if (AudioManager.instance && this.coinSound) {
            AudioManager.instance.playSFX(this.coinSound);
        }
        if (GameManager.instance) {
            GameManager.instance.addScore(200);
            GameManager.instance.addCoin();
        }

        // Coin fly-up effect
        if (this.coinPrefab) {
            const coin = cc.instantiate(this.coinPrefab);
            coin.setPosition(this.node.x, this.node.y + this.node.height);
            this.node.parent.addChild(coin);
            cc.tween(coin)
                .by(0.3, { y: 60 }, { easing: 'sineOut' })
                .by(0.2, { y: -20, opacity: -255 }, { easing: 'sineIn' })
                .call(() => { coin.destroy(); })
                .start();
        } else {
            // No prefab — create a simple visual effect
            this._createSimpleCoinEffect();
        }
    }

    private _createSimpleCoinEffect() {
        const coinNode = new cc.Node('CoinEffect');
        const label = coinNode.addComponent(cc.Label);
        label.string = '+200';
        label.fontSize = 16;
        label.lineHeight = 20;
        coinNode.color = cc.Color.YELLOW;
        coinNode.setPosition(this.node.x, this.node.y + this.node.height + 10);
        this.node.parent.addChild(coinNode);

        cc.tween(coinNode)
            .by(0.4, { y: 40, opacity: -255 })
            .call(() => { coinNode.destroy(); })
            .start();
    }

    private _spawnMushroom() {
        if (AudioManager.instance && this.powerUpAppearSound) {
            AudioManager.instance.playSFX(this.powerUpAppearSound);
        }

        if (this.mushroomPrefab) {
            const mushroom = cc.instantiate(this.mushroomPrefab);
            mushroom.setPosition(this.node.x, this.node.y + this.node.height);
            this.node.parent.addChild(mushroom);

            // Rise from block
            cc.tween(mushroom)
                .by(0.3, { y: 32 }, { easing: 'sineOut' })
                .call(() => {
                    // Enable physics on mushroom after rise
                    const rb = mushroom.getComponent(cc.RigidBody);
                    if (rb) rb.enabledContactListener = true;
                })
                .start();
        } else {
            // No prefab — create mushroom node at runtime
            this._createRuntimeMushroom();
        }
    }

    private _createRuntimeMushroom() {
        const mushroomNode = new cc.Node('Mushroom');
        mushroomNode.group = 'item';

        // Add sprite
        const sprite = mushroomNode.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this.mushroomFrame) {
            sprite.spriteFrame = this.mushroomFrame;
        }

        // Add rigid body
        const rb = mushroomNode.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.enabledContactListener = true;
        rb.linearDamping = 0;

        // Add collider
        const collider = mushroomNode.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(28, 28);
        collider.friction = 0.3;
        collider.restitution = 0;
        collider.sensor = false;

        // Add Mushroom script
        const mushroomComp = mushroomNode.addComponent('Mushroom');

        mushroomNode.setPosition(this.node.x, this.node.y + this.node.height + 16);
        mushroomNode.width = 28;
        mushroomNode.height = 28;
        this.node.parent.addChild(mushroomNode);

        // Rise animation
        const startY = mushroomNode.y;
        mushroomNode.y = this.node.y;
        cc.tween(mushroomNode)
            .to(0.4, { y: startY }, { easing: 'sineOut' })
            .start();
    }
}
