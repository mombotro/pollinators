import Phaser from 'phaser';
import MetaSave from '../systems/MetaSave.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) {
    this.won              = data.won              ?? false;
    this.score            = data.score            ?? 0;
    this.waves            = data.waves            ?? 0;
    this.timeSurvived     = data.timeSurvived     ?? 0;
    this.wonByDestruction = data.wonByDestruction ?? false;

    const earned = Math.floor(this.score / 10);
    MetaSave.addJelly(earned);
    this.earned = earned;

    const s = MetaSave.load();
    if (this.score > s.highScore) {
      s.highScore = this.score;
    }
    s.lastRun = { score: this.score, waves: this.waves, timeSurvived: this.timeSurvived, won: this.won };
    MetaSave.save(s);
    this.highScore = MetaSave.load().highScore;
  }

  create() {
    const cx = 640, cy = 360;
    const s28 = { fontSize: '28px', color: '#ffffff' };
    const sGold = { fontSize: '32px', color: '#ffd700' };

    const headline = this.wonByDestruction
      ? 'WASP HIVE DESTROYED'
      : this.won ? 'YOU WIN!' : 'HIVE DESTROYED';
    const headlineColor = (this.won || this.wonByDestruction) ? '#ffd700' : '#ff4444';

    this.add.text(cx, 120, headline, {
      fontSize: '56px',
      color: headlineColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 210, `Score: ${this.score}`, sGold).setOrigin(0.5);
    this.add.text(cx, 260, `Waves survived: ${this.waves}`, s28).setOrigin(0.5);

    const mins = Math.floor(this.timeSurvived / 60);
    const secs = String(this.timeSurvived % 60).padStart(2, '0');
    this.add.text(cx, 300, `Time: ${mins}:${secs}`, s28).setOrigin(0.5);

    this.add.text(cx, 360, `+${this.earned} Royal Jelly`, {
      fontSize: '36px', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 420, `All-time high score: ${this.highScore}`, {
      fontSize: '24px', color: '#aaaaaa',
    }).setOrigin(0.5);

    const btn = this.add.text(cx, 500, '[ BACK TO MENU ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#ffd700'));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
