import Phaser from 'phaser';
import { TOWER } from '../constants.js';

export default class ResinTrap extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'misc', 8);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(0.1);
    this.body.setImmovable(true);
    this.towerType = 'resin';
    this._uses = TOWER.RESIN_TRAP_USES;
    this._inRadius = new Set();
  }

  update(time, wasps) {
    if (!this.active) return;

    const currentInRadius = new Set();

    wasps.getChildren().forEach(wasp => {
      if (!wasp.active) return;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, wasp.x, wasp.y);
      if (dist <= TOWER.RESIN_TRAP_RADIUS) {
        currentInRadius.add(wasp);
        wasp.slowedUntil = time + TOWER.RESIN_TRAP_DURATION;
        // First frame this wasp enters the radius — consume a use
        if (!this._inRadius.has(wasp)) {
          this._uses--;
          this._updateVisual();
          if (this._uses <= 0) {
            this._break();
            return;
          }
        }
      }
    });

    this._inRadius = currentInRadius;
  }

  _updateVisual() {
    const ratio = this._uses / TOWER.RESIN_TRAP_USES;
    this.setAlpha(0.4 + 0.6 * ratio);
  }

  _break() {
    this._inRadius.clear();
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        this.setActive(false).setVisible(false);
        if (this.body) this.body.enable = false;
      },
    });
  }
}
