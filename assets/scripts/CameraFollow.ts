const { ccclass, property } = cc._decorator;

/**
 * CameraFollow — smoothly follows the player node along the X axis.
 * Clamps to level bounds so the camera never shows beyond the level edges.
 * Optionally follows Y when player is above a threshold.
 */
@ccclass
export default class CameraFollow extends cc.Component {

    @property({ type: cc.Node, tooltip: 'The player node to follow' })
    target: cc.Node = null;

    @property({ tooltip: 'Smoothing factor (0 = instant, 1 = very slow)' })
    smoothing: number = 0.1;

    @property({ tooltip: 'Minimum camera X (left bound of level)' })
    minX: number = 0;

    @property({ tooltip: 'Maximum camera X (right bound of level)' })
    maxX: number = 5000;

    @property({ tooltip: 'Minimum camera Y' })
    minY: number = 0;

    @property({ tooltip: 'Maximum camera Y' })
    maxY: number = 600;

    @property({ tooltip: 'Y threshold — camera follows Y only above this value' })
    yThreshold: number = 200;

    @property({ tooltip: 'Whether to follow the Y axis' })
    followY: boolean = false;

    @property({ type: cc.Node, tooltip: 'Optional background node for parallax effect' })
    background: cc.Node = null;

    @property({ tooltip: 'Parallax ratio for background (0 = static, 1 = same speed)' })
    parallaxRatio: number = 0.3;

    private _camera: cc.Camera = null;
    private _bgStartX: number = 0;
    private _camStartX: number = 0;

    onLoad() {
        this._camera = this.getComponent(cc.Camera);
        if (this.background) {
            this._bgStartX = this.background.x;
            this.background.active = false; // Hide the tiny default blue square!
        }
        this._camStartX = this.node.x;
    }

    lateUpdate(dt: number) {
        // Auto-find player if not set (makes it foolproof!)
        if (!this.target) {
            this.target = cc.find('Canvas/GameRoot/LevelContainer/Player') || cc.find('LevelContainer/Player') || cc.find('Player');
        }

        if (!this.target || !this.target.parent || !this.node.parent) return;

        // Convert target's position to world space, then to the camera's parent's space!
        // This fixes the bug where Mario appears stuck to the left edge if the level 
        // is placed in a different coordinate anchor than the Camera.
        const targetWorldPos = this.target.parent.convertToWorldSpaceAR(this.target.position);
        const cameraLocalPos = this.node.parent.convertToNodeSpaceAR(targetWorldPos);

        // Target position
        let targetX = cameraLocalPos.x;
        let targetY = this.node.y;

        if (this.followY && cameraLocalPos.y > this.yThreshold) {
            targetY = cameraLocalPos.y;
        }

        // Clamp
        targetX = cc.misc.clampf(targetX, this.minX, this.maxX);
        targetY = cc.misc.clampf(targetY, this.minY, this.maxY);

        // Smooth follow
        this.node.x = cc.misc.lerp(this.node.x, targetX, 1 - this.smoothing);
        this.node.y = cc.misc.lerp(this.node.y, targetY, 1 - this.smoothing);

        // Parallax background
        if (this.background) {
            const camDeltaX = this.node.x - this._camStartX;
            this.background.x = this._bgStartX + camDeltaX * this.parallaxRatio;
        }

        // Keep UI glued to the camera's position so it doesn't get left behind
        let uiNode = cc.find('Canvas/HUD') || cc.find('Canvas/UI Layer') || cc.find('Canvas/UIManager') || cc.find('Canvas/UI');
        if (uiNode) {
            uiNode.x = this.node.x;
            uiNode.y = this.node.y;
            uiNode.zIndex = 100; // Ensure the UI is drawn on top of everything
        }
    }

    /**
     * Update level bounds dynamically (called by LevelBuilder after level is built).
     */
    public setLevelBounds(minX: number, maxX: number, minY: number, maxY: number) {
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;
        
        // Instantly snap to target to avoid the "flying" lerp effect at start!
        if (this.target && this.target.parent && this.node.parent) {
            const targetWorldPos = this.target.parent.convertToWorldSpaceAR(this.target.position);
            const cameraLocalPos = this.node.parent.convertToNodeSpaceAR(targetWorldPos);
            this.node.x = cc.misc.clampf(cameraLocalPos.x, this.minX, this.maxX);
        }
    }
}
