const { ccclass, property } = cc._decorator;

@ccclass
export default class ParallaxBackground extends cc.Component {
    @property(cc.Node)
    cameraNode: cc.Node = null;

    @property
    parallaxRatio: number = 0.5; // 0.5 means it moves at half the camera speed (appears further back)

    private _startPos: cc.Vec2 = cc.v2(0, 0);
    private _startCameraPos: cc.Vec2 = cc.v2(0, 0);

    start() {
        this._startPos = cc.v2(this.node.x, this.node.y);
        if (!this.cameraNode) {
            let cam = cc.Camera.main;
            if (cam) this.cameraNode = cam.node;
        }
        if (this.cameraNode) {
            this._startCameraPos = cc.v2(this.cameraNode.x, this.cameraNode.y);
        }
    }

    update(dt: number) {
        if (!this.cameraNode) return;
        
        // Calculate how much the camera has moved
        let travelX = this.cameraNode.x - this._startCameraPos.x;
        
        // Move the parallax layer by a fraction of that travel
        this.node.x = this._startPos.x + travelX * this.parallaxRatio;
    }
}
