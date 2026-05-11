import Phaser from 'phaser';
import { TOWER } from '../constants.js';

export default class PoisonHoney extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'misc', 9);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.08);
    this.body.setImmovable(true);
    this.towerType = 'poison-honey';
    this._uses = TOWER.POISON_HONEY_USES;
  }

  consume() {
    this._uses--;
    this.setAlpha(0.3 + 0.7 * (this._uses / TOWER.POISON_HONEY_USES));
    if (this._uses <= 0) this._deplete();
  }

  _deplete() {
    this.setActive(false);
    if (this.body) this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 400,
      onComplete: () => { if (this.scene) this.destroy(); },
    });
  }
}
