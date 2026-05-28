const { ccclass, property } = cc._decorator;

/**
 * KillZone — placed below the visible level area.
 *
 * When the player falls into this trigger collider, they die.
 * Should be a wide, thin node at the bottom of the level with:
 *   - cc.RigidBody (Static)
 *   - cc.PhysicsBoxCollider (sensor = true)
 *   - Node group: "killzone"
 */
@ccclass
export default class KillZone extends cc.Component {

    onBeginContact(
        contact: cc.PhysicsContact,
        selfCollider: cc.PhysicsCollider,
        otherCollider: cc.PhysicsCollider
    ) {
        const otherGroup = otherCollider.node.group;

        if (otherGroup === 'player') {
            const player = otherCollider.node.getComponent('Player');
            if (player) {
                (player as any).die();
            }
        }

        // Also destroy enemies that fall out of bounds
        if (otherGroup === 'enemy') {
            otherCollider.node.destroy();
        }

        // Destroy items that fall out of bounds
        if (otherGroup === 'item') {
            otherCollider.node.destroy();
        }
    }
}
