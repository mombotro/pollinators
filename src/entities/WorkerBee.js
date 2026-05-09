import Phaser from 'phaser';
import { WORKER } from '../constants.js';

const STATE = { SEEK: 'seek', COLLECT: 'collect', RETURN: 'return' };

export default class WorkerBee extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-bee');
    scene.add.existing(this);
    this.setScale(0.6);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.hp = WORKER.HP;
    this.maxHp = WORKER.HP;
    this.alive = true;
    this._sap = 0;
    this._state = STATE.SEEK;
    this._target = null;
    this._hive = null;
    this._flowers = null;
    this.setDrag(800, 800);
  }

  // Call after construction. hive = Hive sprite, flowers = staticGroup.
  init(hive, flowers) {
    this._hive = hive;
    this._flowers = flowers;
    this._state = STATE.SEEK;
  }

  update(time, delta, resources) {
    if (!this.alive) return;
    switch (this._state) {
      case STATE.SEEK:    this._seekFlower();           break;
      case STATE.COLLECT: this._collectSap();           break;
      case STATE.RETURN:  this._returnToHive(resources); break;
    }
  }

  _seekFlower() {
    // Find nearest unclaimed flower with sap
    let nearest = null, nearestDist = Infinity;
    this._flowers.getChildren().forEach(f => {
      if (!f.active || f.sapRemaining <= 0 || f.claimedBy || f.lifecycle === 'young') return;
      const d = Phaser.Math.Distance.Between(this.x, this.y, f.x, f.y);
      if (d < nearestDist) { nearest = f; nearestDist = d; }
    });
    if (!nearest) { this.setAcceleration(0, 0); return; }
    nearest.claimedBy = this;
    this._target = nearest;
    this._state = STATE.COLLECT;
    this._movePhysics(this._target.x, this._target.y, WORKER.SPEED);
  }

  _collectSap() {
    if (!this._target || !this._target.active || this._target.sapRemaining <= 0) {
      if (this._target) this._target.claimedBy = null;
      this._target = null;
      this._state = STATE.SEEK;
      return;
    }
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._target.x, this._target.y);
    if (dist > 24) {
      this._movePhysics(this._target.x, this._target.y, WORKER.SPEED);
      return;
    }
    // Arrived — collect as much as capacity allows
    const space = WORKER.SAP_CAPACITY - this._sap;
    if (space > 0) this._sap += this._target.collectSap(space);
    this._target.claimedBy = null;
    this._target = null;
    this._state = STATE.RETURN;
    this._movePhysics(this._hive.x, this._hive.y, WORKER.SPEED);
  }

  _returnToHive(resources) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this._hive.x, this._hive.y);
    if (dist > 32) {
      this._movePhysics(this._hive.x, this._hive.y, WORKER.SPEED);
      return;
    }
    // Deposit directly into pending sap pool
    resources.addPendingSap(this._sap);
    this._sap = 0;
    this._state = STATE.SEEK;
  }

  _movePhysics(tx, ty, speed) {
    this.setMaxVelocity(speed, speed);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (dist > 5) {
      const ax = (tx - this.x) / dist;
      const ay = (ty - this.y) / dist;
      this.setAcceleration(ax * speed * 10, ay * speed * 10);
    } else {
      this.setAcceleration(0, 0);
    }
    
    if (this.body.velocity.lengthSq() > 10) {
      const targetRotation = this.body.velocity.angle() + Math.PI / 2;
      this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.15);
    }
  }

  // Returns true if worker died.
  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      this.alive = false;
      if (this._target) { this._target.claimedBy = null; this._target = null; }
      this.setVisible(false).setActive(false);
      this.body.enable = false;
      return true;
    }
    return false;
  }
}
