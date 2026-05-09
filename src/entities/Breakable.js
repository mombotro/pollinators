import Phaser from 'phaser';
import { BREAKABLE } from '../constants.js';
import Pickup from './Pickup.js';

export default class Breakable extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'breakable');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    
    this.hp = BREAKABLE.HP;
  }

  // Returns true if destroyed
  takeDamage(amount) {
    if (!this.active) return false;
    
    this.hp -= amount;
    
    // Flash white when hit
    this.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    
    if (this.hp <= 0) {
      this._break();
      return true;
    }
    return false;
  }

  _break() {
    // 50% chance for health or XP
    const type = Math.random() < 0.5 ? 'health' : 'xp';
    const pickup = new Pickup(this.scene, this.x, this.y, type);
    this.scene.pickups.add(pickup);
    
    this.destroy();
  }
}
