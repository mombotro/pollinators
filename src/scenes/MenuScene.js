import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    this._selIdx = 0;
    this._gpAWasDown = false;
    this._gpDirWasDown = false;
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

    btnStart.on('pointerover', () => { this._selIdx = 0; this._refreshHighlight(); });
    btnStart.on('pointerout',  () => this._refreshHighlight());
    btnStart.on('pointerdown', () => this.scene.start('GameScene'));

    const btnUpgrades = this.add.text(cx, cy + 180, '[ UPGRADES ]', {
      fontSize: '28px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnUpgrades.on('pointerover', () => { this._selIdx = 1; this._refreshHighlight(); });
    btnUpgrades.on('pointerout',  () => this._refreshHighlight());
    btnUpgrades.on('pointerdown', () => this.scene.start('MetaUpgradeScene'));

    this._btns = [btnStart, btnUpgrades];
    this._actions = [
      () => this.scene.start('GameScene'),
      () => this.scene.start('MetaUpgradeScene'),
    ];
    this._refreshHighlight();
  }

  _refreshHighlight() {
    this._btns.forEach((b, i) =>
      b.setColor(i === this._selIdx ? '#ffffff' : '#ffd700')
    );
  }

  update() {
    const gp = this.input.gamepad;
    const pad = gp?.total > 0 ? gp.gamepads.find(p => p?.connected) : null;
    if (!pad) return;

    // D-pad / left stick navigate
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWasDown) {
      const dy = pad.buttons[12]?.pressed || pad.leftStick.y < -0.4 ? -1 : 1;
      this._selIdx = (this._selIdx + dy + this._btns.length) % this._btns.length;
      this._refreshHighlight();
    }
    this._gpDirWasDown = dirDown;

    // A confirms
    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWasDown) this._actions[this._selIdx]();
    this._gpAWasDown = aDown;
  }
}
