import Phaser from 'phaser';
import { PICKUP, XP } from '../constants.js';

export default class Pickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    super(scene, x, y, type === 'health' ? 'health-pickup' : 'xp-gem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.type = type; // 'health' or 'xp'
    
    // Pickups drift slightly
    this.setVelocity(Phaser.Math.Between(-10, 10), Phaser.Math.Between(-10, 10));
    this.setDrag(10, 10);
  }

  // Returns true if successfully collected
  onCollect(player, scene) {
    if (!this.active) return false;
    
    if (this.type === 'health') {
      if (player.hp >= player.maxHp) return false; // Don't pick up health if full
      player.hp = Math.min(player.maxHp, player.hp + PICKUP.HEAL_AMOUNT);
      
      // Visual feedback
      player.setTint(0x00ff00);
      scene.time.delayedCall(150, () => { if (player.active) player.clearTint(); });
      
    } else if (this.type === 'xp') {
      scene.xp += XP.WASP_KILL;
    }
    
    this.destroy();
    return true;
  }
}
