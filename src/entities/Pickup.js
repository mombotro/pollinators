import Phaser from 'phaser';
import { PICKUP, XP } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class Pickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'pickups', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.type = 'xp';
    this.setScale(0.1);
    this.setActive(false).setVisible(false);
  }

  fire(x, y, type) {
    this.type = type;
    const frame = type === 'health' ? 2 : type === 'honey' ? 1 : 0;
    this.setTexture('pickups', frame);
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
      SoundSynth.play('health');
      player.setTint(0x00ff00);
      scene.time.delayedCall(150, () => { if (player.active) player.clearTint(); });
    } else if (this.type === 'xp') {
      SoundSynth.play('xp');
      scene._collectXp(XP.WASP_KILL);
    } else if (this.type === 'honey') {
      SoundSynth.play('pickup');
      scene.resources.addHoney(PICKUP.HONEY_AMOUNT);
    }
    this.release();
    return true;
  }
}
