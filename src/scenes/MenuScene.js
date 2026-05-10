import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this._gpAWasDown = false;
    const cx = 640, cy = 360;

    this.add.dom(cx, cy - 310).createFromHTML(
      '<img src="bee.gif" style="width:180px;height:auto;display:block;">'
    );

    this.add.text(cx, cy - 70, 'PollinHaters', {
      fontSize: '72px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 40, 'Protect the hive. Survive 10 minutes.', {
      fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const btnStart = this.add.text(cx, cy + 120, '[ START ]', {
      fontSize: '36px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnStart.on('pointerover', () => btnStart.setColor('#ffffff'));
    btnStart.on('pointerout',  () => btnStart.setColor('#ffd700'));
    btnStart.on('pointerdown', () => this.scene.start('GameScene'));

    const btnUpgrades = this.add.text(cx, cy + 180, '[ UPGRADES ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnUpgrades.on('pointerover', () => btnUpgrades.setColor('#ffffff'));
    btnUpgrades.on('pointerout',  () => btnUpgrades.setColor('#ffd700'));
    btnUpgrades.on('pointerdown', () => this.scene.start('MetaUpgradeScene'));
  }

  update() {
    const gp = this.input.gamepad;
    const pad = gp?.total > 0 ? gp.gamepads.find(p => p?.connected) : null;
    const aDown = pad?.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWasDown) this.scene.start('GameScene');
    this._gpAWasDown = aDown;
  }
}
