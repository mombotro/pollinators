import Phaser from 'phaser';
import { BEE } from '../constants.js';

export default class Stinger extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'stinger');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = BEE.STINGER_DAMAGE;
    this._lifetimeEvent = null;
    this.setActive(false).setVisible(false);
  }

  fire(x, y, damage, maxDist, speed, targetX, targetY) {
    this.damage = damage ?? BEE.STINGER_DAMAGE;
    const dist  = maxDist ?? BEE.STINGER_RANGE;
    const spd   = speed   ?? BEE.STINGER_SPEED;
    this.setPosition(x, y).setActive(true).setVisible(true);
    if (this.body) this.body.setEnable(true);
    this.body.reset(x, y);
    const angleRad = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    this.setRotation(angleRad);
    this.body.setVelocity(Math.cos(angleRad) * spd, Math.sin(angleRad) * spd);
    if (this._lifetimeEvent) this._lifetimeEvent.remove(false);
    this._lifetimeEvent = this.scene.time.delayedCall(
      (dist / spd) * 1000,
      () => this.release(),
    );
  }

  release() {
    if (this._lifetimeEvent) { this._lifetimeEvent.remove(false); this._lifetimeEvent = null; }
    this.setActive(false).setVisible(false);
    if (this.body) { this.body.setEnable(false); this.body.setVelocity(0, 0); }
  }
}
