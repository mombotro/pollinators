import Phaser from 'phaser';
import { TOWER } from '../constants.js';
import GuardBee from '../entities/GuardBee.js';

export default class GuardPost extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'misc', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.1);
    this.body.setImmovable(true);
    this.towerType = 'guard';
    this.hp = TOWER.GUARD_POST_HP;
    this.maxHp = TOWER.GUARD_POST_HP;
    this._guard = new GuardBee(scene, x, y, this);
  }

  get guard() { return this._guard; }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => {
      if (!this.active) return;
      if (this.hp <= 0) { this.setFrame(1); this.clearTint(); }
      else this.clearTint();
    });
    if (this.hp <= 0) {
      this._guard.alive = false;
      this._guard.setVisible(false).setActive(false);
      if (this._guard.body) this._guard.body.enable = false;
      this.setAlpha(0.45);
      this.body.enable = false;
    }
  }
}
