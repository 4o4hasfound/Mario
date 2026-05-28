import GameManager from './GameManager';
import AudioManager from './AudioManager';
import { Levels, LevelConfig, EnemyDef, CoinDef } from './LevelData';
import { cloudBase64, mountainBase64 } from './BgAssets';

const { ccclass, property } = cc._decorator;

/**
 * LevelBuilder — constructs the level from LevelData at runtime.
 * Simplified to use less block properties — grabs frames from tilesAtlas and itemsAtlas automatically.
 */
@ccclass
export default class LevelBuilder extends cc.Component {

    // ── Asset references (drag in Inspector) ───────────────────────
    @property({ type: cc.SpriteFrame, tooltip: 'Ground block frame' })
    groundFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Brick block frame' })
    brickFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Hard block frame' })
    hardBlockFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Pipe top frame (32x16)' })
    pipeTopFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Pipe body frame (32x16)' })
    pipeBodyFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Question block frame' })
    questionBlockFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Used block frame' })
    usedBlockFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Coin frame' })
    coinFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteFrame, tooltip: 'Mushroom frame' })
    mushroomFrame: cc.SpriteFrame = null;

    @property({ type: cc.SpriteAtlas, tooltip: 'Goomba sprite atlas' })
    goombaAtlas: cc.SpriteAtlas = null;

    @property({ type: cc.SpriteAtlas, tooltip: 'Turtle sprite atlas' })
    turtleAtlas: cc.SpriteAtlas = null;

    @property({ type: cc.SpriteAtlas, tooltip: 'Flower sprite atlas' })
    flowerAtlas: cc.SpriteAtlas = null;

    @property({ type: [cc.SpriteFrame], tooltip: 'Frames for small Mario walking' })
    smallWalkFrames: cc.SpriteFrame[] = [];

    @property({ type: cc.SpriteFrame, tooltip: 'Frame for small Mario jumping' })
    smallJumpFrame: cc.SpriteFrame = null;

    @property({ type: [cc.SpriteFrame], tooltip: 'Frames for big Mario walking' })
    bigWalkFrames: cc.SpriteFrame[] = [];

    @property({ type: cc.SpriteFrame, tooltip: 'Frame for big Mario jumping' })
    bigJumpFrame: cc.SpriteFrame = null;

    // ── Audio references ───────────────────────────────────────────
    @property({ type: cc.AudioClip }) jumpSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) deathSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) powerUpSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) powerDownSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) stompSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) coinSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) powerUpAppearSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) kickSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) levelClearSound: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) gameBGM: cc.AudioClip = null;

    // ── Scene references ───────────────────────────────────────────
    @property({ type: cc.Node, tooltip: 'Camera node with CameraFollow script' })
    cameraNode: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'UI Manager node' })
    uiNode: cc.Node = null;

    @property({ type: cc.Node, tooltip: 'Background node' })
    backgroundNode: cc.Node = null;

    // ── Internal ───────────────────────────────────────────────────
    private _levelContainer: cc.Node = null;
    private _playerNode: cc.Node = null;
    
    onLoad() {
        // Enable physics
        cc.director.getPhysicsManager().enabled = true;
        cc.director.getPhysicsManager().gravity = cc.v2(0, -960);
        
        this._levelContainer = new cc.Node('LevelContainer');
        this.node.addChild(this._levelContainer);
    }

    start() {
        const gm = GameManager.instance;
        const levelIndex = gm ? gm.currentLevel : 0;
        const levelConfig = Levels[levelIndex] || Levels[0];

        this._buildLevel(levelConfig);

        // Play BGM
        if (AudioManager.instance && this.gameBGM) {
            AudioManager.instance.playBGM(this.gameBGM);
        }
    }

    private _buildLevel(config: LevelConfig) {
        const { width, height, tileSize, tiles, enemies, coins,
                playerStartCol, playerStartRow, flagCol, flagRow, timeLimit } = config;

        this._buildTiles(tiles, width, height, tileSize);
        this._spawnPlayer(playerStartCol, playerStartRow, tileSize);

        for (const e of enemies) {
            this._spawnEnemy(e, tileSize);
        }

        for (const c of coins) {
            this._spawnCoin(c, tileSize);
        }

        this._spawnFlag(flagCol, flagRow, tileSize);
        this._spawnHut(flagCol + 5, flagRow, tileSize);
        this._spawnKillZone(width, tileSize);

        // Configure camera bounds (auto-find if not linked)
        let camNode = this.cameraNode || cc.find('Canvas/Main Camera') || cc.find('Main Camera');
        if (camNode) {
            const camFollow = camNode.getComponent('CameraFollow');
            if (camFollow) {
                const halfCanvas = cc.winSize.width / 2;
                (camFollow as any).target = this._playerNode;
                // Unclamp the left bound (-9999) so the camera is ALWAYS centered on Mario
                (camFollow as any).setLevelBounds(-9999, width * tileSize - halfCanvas, 0, 600);
            } else {
                cc.warn("LevelBuilder: Found Camera node, but it's missing the CameraFollow script!");
            }
        } else {
            cc.warn("LevelBuilder: Could not find Camera node! Make sure it is named 'Main Camera' under Canvas.");
        }

        // Configure UI timer (auto-find if not linked)
        let finalUiNode = this.uiNode || cc.find('Canvas/UI Layer') || cc.find('Canvas/UIManager') || cc.find('Canvas/UI');
        if (finalUiNode) {
            const uiMgr = finalUiNode.getComponent('UIManager');
            if (uiMgr) {
                (uiMgr as any).setTimeLimit(timeLimit);
            }
        }

        this._setupBackground(width, tileSize);
    }

    private _buildTiles(tiles: number[][], width: number, height: number, tileSize: number) {
        for (let row = 0; row < height; row++) {
            let runStart = -1;
            let runType = 0;

            for (let col = 0; col <= width; col++) {
                const tileId = col < width ? tiles[row][col] : 0;

                if (tileId === 1 || tileId === 7) {
                    if (runStart < 0) {
                        runStart = col;
                        runType = tileId;
                    }
                } else {
                    if (runStart >= 0) {
                        this._createGroundRun(runStart, col - 1, row, tileSize, runType);
                        runStart = -1;
                    }

                    if (tileId === 2) {
                        this._createBrick(col, row, tileSize);
                    } else if (tileId === 3 || tileId === 4) {
                        this._createQuestionBlock(col, row, tileSize, tileId);
                    } else if (tileId === 5 || tileId === 6) {
                        this._createPipeTile(col, row, tileSize, tileId);
                    }
                }
            }
        }
    }

    private _createGroundRun(startCol: number, endCol: number, row: number, tileSize: number, tileType: number) {
        const count = endCol - startCol + 1;
        const nodeWidth = count * tileSize;
        const x = startCol * tileSize + nodeWidth / 2;
        const y = row * tileSize + tileSize / 2;

        const node = new cc.Node('Ground');
        node.group = 'ground';
        node.setPosition(x, y);
        node.width = nodeWidth;
        node.height = tileSize;

        for (let i = 0; i < count; i++) {
            const tileNode = new cc.Node('Tile');
            const sprite = tileNode.addComponent(cc.Sprite);
            sprite.spriteFrame = (tileType === 7) ? this.hardBlockFrame : this.groundFrame;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            tileNode.width = tileSize;
            tileNode.height = tileSize;
            tileNode.setPosition((i - (count - 1) / 2) * tileSize, 0);
            node.addChild(tileNode);
        }

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(nodeWidth, tileSize);
        collider.offset = cc.v2(0, 0);
        collider.friction = 0.5;
        collider.restitution = 0;
        collider.apply();

        this._levelContainer.addChild(node);
    }

    private _createBrick(col: number, row: number, tileSize: number) {
        const node = new cc.Node('Brick');
        node.group = 'block';
        node.setPosition(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2);

        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = this.brickFrame;
        
        node.width = tileSize;
        node.height = tileSize;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(tileSize, tileSize);
        collider.friction = 0.5;
        collider.apply();

        this._levelContainer.addChild(node);
    }

    private _createQuestionBlock(col: number, row: number, tileSize: number, tileId: number) {
        const node = new cc.Node('QuestionBlock');
        node.group = 'block';
        node.setPosition(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2);

        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = this.questionBlockFrame;
        
        node.width = tileSize;
        node.height = tileSize;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(tileSize, tileSize);
        collider.friction = 0.5;
        collider.apply();

        const qb = node.addComponent('QuestionBlock') as any;
        qb.content = (tileId === 4) ? 1 : 0;
        qb.activeFrame = this.questionBlockFrame;
        qb.usedFrame = this.usedBlockFrame;
        qb.mushroomFrame = this.mushroomFrame;
        qb.coinSound = this.coinSound;
        qb.powerUpAppearSound = this.powerUpAppearSound;

        this._levelContainer.addChild(node);
    }

    private _createPipeTile(col: number, row: number, tileSize: number, tileId: number) {
        const node = new cc.Node('Pipe');
        node.group = 'ground';
        node.setPosition(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2);

        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = (tileId === 6) ? this.pipeTopFrame : this.pipeBodyFrame;

        // Pipe sprites are 32x16, meaning they are 2 tiles wide. 
        // We set width to tileSize * 2, height to tileSize.
        node.width = tileSize * 2;
        node.height = tileSize;

        // Shift position right so it matches the grid since width is doubled
        node.setPosition(col * tileSize + tileSize, row * tileSize + tileSize / 2);

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(tileSize * 2, tileSize);
        collider.friction = 0.5;
        collider.apply();

        this._levelContainer.addChild(node);
    }

    private _spawnPlayer(col: number, row: number, tileSize: number) {
        const node = new cc.Node('Player');
        node.group = 'player';
        node.anchorY = 0; // Anchor at bottom so growing/shrinking expands upwards seamlessly!
        node.setPosition(col * tileSize + tileSize / 2, row * tileSize);
        node.width = 24;
        node.height = 32;

        const sprite = node.addComponent(cc.Sprite);
        if (this.smallWalkFrames && this.smallWalkFrames.length > 0) {
            sprite.spriteFrame = this.smallWalkFrames[0];
        }
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.enabledContactListener = true;
        rb.linearDamping = 0;
        rb.angularDamping = 0;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(24, 28);
        collider.offset = cc.v2(0, 14); // bottom touches 0
        collider.friction = 0; // Prevent sticking to walls!
        collider.restitution = 0;
        collider.density = 1;
        collider.apply();

        const playerComp = node.addComponent('Player') as any;
        playerComp.smallWalkFrames = this.smallWalkFrames;
        playerComp.smallJumpFrame = this.smallJumpFrame;
        playerComp.bigWalkFrames = this.bigWalkFrames;
        playerComp.bigJumpFrame = this.bigJumpFrame;
        playerComp.jumpSound = this.jumpSound;
        playerComp.deathSound = this.deathSound;
        playerComp.powerUpSound = this.powerUpSound;
        playerComp.powerDownSound = this.powerDownSound;
        playerComp.stompSound = this.stompSound;

        this._levelContainer.addChild(node);
        this._playerNode = node;
    }

    private _spawnEnemy(def: EnemyDef, tileSize: number) {
        const node = new cc.Node('Enemy_' + def.type);
        node.group = 'enemy';
        node.setPosition(def.col * tileSize + tileSize / 2, def.row * tileSize + 16);
        node.width = 28;
        node.height = 28;

        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.TRIMMED;

        let atlas: cc.SpriteAtlas = null;
        let enemyType = 0;
        switch (def.type) {
            case 'goomba':
                atlas = this.goombaAtlas;
                enemyType = 0;
                break;
            case 'turtle':
                atlas = this.turtleAtlas;
                enemyType = 1;
                node.height = 36;
                break;
            case 'flower':
                atlas = this.flowerAtlas;
                enemyType = 2;
                break;
        }

        if (atlas) {
            const frames = atlas.getSpriteFrames();
            if (frames.length > 0) {
                sprite.spriteFrame = frames[0];
            }
        }

        // Scale up enemies since TRIMMED sizeMode uses original small sprite dimensions
        if (def.type === 'goomba' || def.type === 'turtle') {
            node.scale = 2;
        }

        const rb = node.addComponent(cc.RigidBody);
        rb.type = (def.type === 'flower') ? cc.RigidBodyType.Static : cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(node.width, node.height);
        collider.friction = 0.3;
        collider.restitution = 0;
        collider.apply();

        const enemyComp = node.addComponent('Enemy') as any;
        enemyComp.enemyType = enemyType;
        enemyComp.atlas = atlas;
        enemyComp.stompSound = this.stompSound;
        enemyComp.kickSound = this.kickSound;

        this._levelContainer.addChild(node);
    }

    private _spawnCoin(def: CoinDef, tileSize: number) {
        const node = new cc.Node('Coin');
        node.group = 'item';
        node.setPosition(def.col * tileSize + tileSize / 2, def.row * tileSize + tileSize / 2);

        const sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this.coinFrame) {
            sprite.spriteFrame = this.coinFrame;
        }

        node.width = 16;
        node.height = 16;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(16, 16);
        collider.sensor = true;
        collider.apply();

        const coinComp = node.addComponent('Coin') as any;
        coinComp.coinSound = this.coinSound;

        this._levelContainer.addChild(node);
    }

    private _spawnFlag(col: number, row: number, tileSize: number) {
        const poleNode = new cc.Node('FlagPole');
        poleNode.group = 'flag';
        poleNode.setPosition(col * tileSize + tileSize / 2, row * tileSize + 80);

        const poleSprite = poleNode.addComponent(cc.Sprite);
        poleSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        poleSprite.type = cc.Sprite.Type.TILED;
        poleSprite.spriteFrame = this.pipeBodyFrame;
        poleNode.color = cc.Color.WHITE;
        poleNode.width = 16;
        poleNode.height = 160;

        const flagNode = new cc.Node('Flag');
        const flagSprite = flagNode.addComponent(cc.Sprite);
        
        // We will just color a box to act as a flag to use even fewer block references
        flagSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        flagNode.width = 32;
        flagNode.height = 32;
        flagNode.color = cc.Color.RED; // Red flag block
        flagNode.setPosition(16, 60);
        poleNode.addChild(flagNode);

        const rb = poleNode.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = poleNode.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(32, 160);
        collider.sensor = true;
        collider.apply();

        const flagComp = poleNode.addComponent('FlagPole') as any;
        flagComp.flagSprite = flagNode;
        flagComp.poleBaseY = -64;
        flagComp.levelClearSound = this.levelClearSound;

        this._levelContainer.addChild(poleNode);
    }

    private _spawnHut(col: number, row: number, tileSize: number) {
        const hutNode = new cc.Node('Hut');
        hutNode.setPosition(col * tileSize, row * tileSize);
        
        // A simple 3x3 castle structure using hard blocks
        const positions = [
            // Left wall
            cc.v2(0, 0), cc.v2(0, tileSize), cc.v2(0, tileSize * 2),
            // Right wall
            cc.v2(tileSize * 2, 0), cc.v2(tileSize * 2, tileSize), cc.v2(tileSize * 2, tileSize * 2),
            // Roof
            cc.v2(tileSize, tileSize * 2),
            // Door background (black)
            cc.v2(tileSize, tileSize), cc.v2(tileSize, 0)
        ];

        for (let i = 0; i < positions.length; i++) {
            const block = new cc.Node('HutBlock');
            block.setPosition(positions[i].x + tileSize/2, positions[i].y + tileSize/2);
            block.width = tileSize;
            block.height = tileSize;
            const sprite = block.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            
            if (i >= 7) {
                // Door
                sprite.spriteFrame = this.groundFrame; // Use any frame so we can tint it
                block.color = cc.Color.BLACK; // Pitch black door
            } else {
                sprite.spriteFrame = this.hardBlockFrame;
            }
            hutNode.addChild(block);
        }
        
        this._levelContainer.addChild(hutNode);
    }

    private _spawnKillZone(levelWidth: number, tileSize: number) {
        const node = new cc.Node('KillZone');
        node.group = 'killzone';
        node.setPosition(levelWidth * tileSize / 2, -200);
        node.width = levelWidth * tileSize + 200;
        node.height = 50;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        rb.enabledContactListener = true;

        const collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(node.width, node.height);
        collider.sensor = true;
        collider.apply();

        node.addComponent('KillZone');

        this._levelContainer.addChild(node);
    }

    private _setupBackground(levelWidth: number, tileSize: number) {
        let bgNode = this.backgroundNode || cc.find('Canvas/Background') || cc.find('Canvas/bg');
        
        // 1. Force the camera to render a sky blue background so it is never pitch black
        let cam = cc.Camera.main;
        if (cam) {
            cam.backgroundColor = new cc.Color(107, 140, 255); // Classic Mario Sky Blue
            cam.clearFlags = cc.Camera.ClearFlags.DEPTH | cc.Camera.ClearFlags.STENCIL | cc.Camera.ClearFlags.COLOR;
        }

        if (!bgNode) return;
        
        // Try to add a sprite if one doesn't exist, to support coloring the node itself
        if (!bgNode.getComponent(cc.Sprite)) {
            let sprite = bgNode.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
        bgNode.width = levelWidth * tileSize + 2000; // Extend to ensure no edges show
        bgNode.height = 1000;
        bgNode.color = new cc.Color(107, 140, 255);
        
        // Create Parallax Layer for scenery
        let parallaxLayer = new cc.Node('ParallaxLayer');
        bgNode.parent.addChild(parallaxLayer, bgNode.zIndex + 1);
        
        let parallaxComp = parallaxLayer.addComponent('ParallaxBackground') as any;
        parallaxComp.parallaxRatio = 0.5;

        // Generate proper clouds, mountains, and bushes
        cc.assetManager.loadRemote(cloudBase64, { ext: '.png' }, (err, cloudTex: cc.Texture2D) => {
            if (err) return;
            cc.assetManager.loadRemote(mountainBase64, { ext: '.png' }, (err2, mountainTex: cc.Texture2D) => {
                if (err2) return;
                
                let cloudFrame = new cc.SpriteFrame(cloudTex);
                // Fix filtering so it's crispy pixels
                cloudTex.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);
                
                let mountainFrame = new cc.SpriteFrame(mountainTex);
                mountainTex.setFilters(cc.Texture2D.Filter.NEAREST, cc.Texture2D.Filter.NEAREST);

                // Increase density of background elements (levelWidth / 8)
                for (let i = 0; i < levelWidth / 8; i++) {
                    let bgElement = new cc.Node('BgElement');
                    let sprite = bgElement.addComponent(cc.Sprite);
                    
                    let type = i % 3; // 0 = cloud, 1 = mountain, 2 = bush
                    
                    if (type === 0) {
                        sprite.spriteFrame = cloudFrame;
                        bgElement.y = 120 + Math.random() * 150; // High in the sky
                    } else if (type === 1) {
                        sprite.spriteFrame = mountainFrame;
                        bgElement.y = 48; // On the ground
                    } else {
                        // Bush (Classic Mario Trick: tinted cloud sprite!)
                        sprite.spriteFrame = cloudFrame;
                        bgElement.color = new cc.Color(73, 208, 32); // Bush green
                        bgElement.y = 48; // On the ground
                    }
                    
                    sprite.sizeMode = cc.Sprite.SizeMode.TRIMMED;
                    bgElement.scale = 2; // Scale 2x for classic look
                    bgElement.x = (i * 8 * tileSize) + Math.random() * 200;
                    
                    parallaxLayer.addChild(bgElement);
                }
            });
        });
    }
}
