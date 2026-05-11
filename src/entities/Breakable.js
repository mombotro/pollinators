import Phaser from 'phaser';
import { BREAKABLE } from '../constants.js';
import SoundSynth from '../systems/SoundSynth.js';

export default class Breakable extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'pickups', 4);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
    this.setScale(0.08);
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
    SoundSynth.play('break');
    const type = Math.random() < 0.5 ? 'health' : 'xp';
    this.scene._dropPickup(this.x, this.y, type);
    this.setFrame(5);
    this.setActive(false);
    if (this.body) this.body.setEnable(false);
    this.scene.time.delayedCall(400, () => { if (this.scene) this.destroy(); });
  }
}
