import Phaser from 'phaser';
import { PICKUP, XP } from '../constants.js';

export default class Pickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'xp-gem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.type = 'xp';
    this.setActive(false).setVisible(false);
  }

  fire(x, y, type) {
    this.type = type;
    this.setTexture(type === 'health' ? 'health-pickup' : 'xp-gem');
    this.setPosition(x, y).setActive(true).setVisible(true);
    if (this.body) this.body.setEnable(true);
    this.body.reset(x, y);
    this.setVelocity(Phaser.Math.Between(-10, 10), Phaser.Math.Between(-10, 10));
    this.setDrag(10, 10);
  }

  release() {
    this.setActive(false).setVisible(false);
    if (this.body) { this.body.setEnable(false); this.body.setVelocity(0, 0); }
  }

  onCollect(player, scene) {
    if (!this.active) return false;
    if (this.type === 'health') {
      if (player.hp >= player.maxHp) return false;
      player.hp = Math.min(player.maxHp, player.hp + PICKUP.HEAL_AMOUNT);
      player.setTint(0x00ff00);
      scene.time.delayedCall(150, () => { if (player.active) player.clearTint(); });
    } else if (this.type === 'xp') {
      scene._collectXp(XP.WASP_KILL);
    }
    this.release();
    return true;
  }
}
