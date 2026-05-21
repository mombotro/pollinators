# Hunter Wasp Melee-Only + Buildable Unlocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hunter wasps destroy themselves on player contact, and buildable towers/soldiers are unlocked individually via royal jelly in a new MetaUpgradeScene tab.

**Architecture:** Two independent changes. (1) One-line behavior tweak in GameScene's player-wasp overlap handler. (2) MetaSave gains 5 new unlock keys; MetaUpgradeScene grows a second tab toggled by tab buttons; BuildMenu filters locked items on show(). The tab system reuses the existing row/scroll infrastructure — two row arrays, one active at a time.

**Tech Stack:** Phaser 3, Vite, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/scenes/GameScene.js` | Hunter player-overlap: remove lastHit guard, add destroy+drop after attack |
| `src/systems/MetaSave.js` | Add 5 unlock keys to DEFAULTS() |
| `tests/MetaSave.test.js` | Tests for new unlock key defaults and purchase |
| `src/scenes/MetaUpgradeScene.js` | Tab buttons, buildable rows, per-tab scroll, _switchTab(), refund update |
| `src/ui/BuildMenu.js` | unlockKey per item, filter invisible on show(), track _visibleIndices for gpUpdate |

---

## Task 1: Hunter Wasp Dies on Player Hit

**Files:**
- Modify: `src/scenes/GameScene.js:327-338`

- [ ] **Step 1: Edit the player-wasp overlap handler**

In `src/scenes/GameScene.js`, find the block starting at line 327 (inside the `this.physics.add.overlap(this.wasps, this.player, ...)` callback). Replace:

```js
      if (wasp.waspType !== 'hunter') return;
      if (now - wasp.lastHit < WASP.HIT_COOLDOWN) return;
      wasp.lastHit = now;

      const sap = this.resources.getSapCarried('player');
      if (sap > 0) {
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
        this.waspHiveSystem.onHoneyStolen(Math.max(1, WASP.SAP_STEAL - this.player.armor));
      } else {
        if (bee.takeDamage(WASP.DAMAGE)) this._onPlayerDeath();
      }
```

With:

```js
      if (wasp.waspType !== 'hunter') return;

      const sap = this.resources.getSapCarried('player');
      if (sap > 0) {
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
        this.waspHiveSystem.onHoneyStolen(Math.max(1, WASP.SAP_STEAL - this.player.armor));
      } else {
        if (bee.takeDamage(WASP.DAMAGE)) this._onPlayerDeath();
      }
      this._dropPickup(wasp.x, wasp.y, wasp.honeyCarried ? 'honey' : 'xp');
      if (Math.random() < 0.10) this._dropPickup(wasp.x, wasp.y, 'health');
      wasp.destroy();
```

The `lastHit` cooldown is removed — the wasp dies immediately on first contact so no repeat-hit guard is needed. The drop mirrors what happens when the wasp is killed by a stinger.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`. Spawn a hunter wasp (playground mode → Spawn Hunter) and walk into it. Verify:
- Hunter disappears on contact
- Player takes damage (or loses sap if carrying any)
- XP gem drops at impact point
- Dashing through a hunter still works (pre-existing dash path is unaffected)

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: hunter wasp destroys itself on player contact"
```

---

## Task 2: MetaSave — Unlock Key Defaults

**Files:**
- Modify: `src/systems/MetaSave.js`
- Modify: `tests/MetaSave.test.js`

- [ ] **Step 1: Write failing tests**

Add to `tests/MetaSave.test.js` (after existing tests):

```js
  describe('buildable unlock keys', () => {
    it('load() defaults all unlock keys to 0', () => {
      const s = MetaSave.load();
      expect(s.upgrades.UNLOCK_RESIN_TRAP).toBe(0);
      expect(s.upgrades.UNLOCK_GUARD_POST).toBe(0);
      expect(s.upgrades.UNLOCK_POISON_HONEY).toBe(0);
      expect(s.upgrades.UNLOCK_NECTAR_FOUNTAIN).toBe(0);
      expect(s.upgrades.UNLOCK_RECRUIT_SOLDIER).toBe(0);
    });

    it('purchaseUpgrade sets unlock key to 1', () => {
      MetaSave.addJelly(200);
      MetaSave.purchaseUpgrade('UNLOCK_RESIN_TRAP', 50);
      expect(MetaSave.load().upgrades.UNLOCK_RESIN_TRAP).toBe(1);
    });

    it('reset() clears unlock keys back to 0', () => {
      MetaSave.addJelly(200);
      MetaSave.purchaseUpgrade('UNLOCK_RESIN_TRAP', 50);
      MetaSave.reset();
      expect(MetaSave.load().upgrades.UNLOCK_RESIN_TRAP).toBe(0);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```
npm test
```

Expected: 3 failures — `UNLOCK_RESIN_TRAP` etc. are `undefined`, not `0`.

- [ ] **Step 3: Add unlock keys to MetaSave DEFAULTS**

In `src/systems/MetaSave.js`, update `DEFAULTS()`:

```js
function DEFAULTS() {
  return {
    jellyBalance: 0,
    upgrades: {
      BEE_SPEED_META:           0,
      BEE_HP_META:              0,
      HIVE_HP_META:             0,
      HIVE_STORAGE_META:        0,
      START_WORKER:             0,
      START_ARMOR:              0,
      START_HONEY:              0,
      START_GUARD:              0,
      START_SOLDIER:            0,
      SOLDIER_DMG_META:         0,
      UNLOCK_RESIN_TRAP:        0,
      UNLOCK_GUARD_POST:        0,
      UNLOCK_POISON_HONEY:      0,
      UNLOCK_NECTAR_FOUNTAIN:   0,
      UNLOCK_RECRUIT_SOLDIER:   0,
    },
    highScore: 0,
    lastRun: null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/MetaSave.js tests/MetaSave.test.js
git commit -m "feat: add buildable unlock keys to MetaSave defaults"
```

---

## Task 3: MetaUpgradeScene — Buildables Tab

**Files:**
- Modify: `src/scenes/MetaUpgradeScene.js`

This task rewrites the scene significantly. The full replacement is given below.

### What changes:
- Title moves to y=40
- Royal Jelly text moves to y=82
- Tab buttons added at y=110: `[ UPGRADES ]` and `[ BUILDABLES ]`
- `SCROLL_TOP` stays 145, `SCROLL_BOTTOM` stays 625
- `_upgradeRows` replaces `_rows` for the existing upgrades
- `_buildableRows` is the new second tab
- Per-tab scroll: `_upgradeScrollY`, `_buildableScrollY`, `_upgradeMaxScroll`, `_buildableMaxScroll`
- `_switchTab(tab)` shows/hides rows, rebuilds gamepad nav array
- `_doScroll()`, `_repositionRows()`, `_ensureVisible()` operate on active tab
- `_doRefund()` covers both arrays
- Gamepad: left/right D-pad switches tabs

- [ ] **Step 1: Replace MetaUpgradeScene.js**

Replace the full content of `src/scenes/MetaUpgradeScene.js` with:

```js
import Phaser from 'phaser';
import MetaSave from '../systems/MetaSave.js';

const UPGRADES = [
  { key: 'BEE_SPEED_META',    label: 'Bee Speed',      cost: 50,  max: 3, desc: '+20 speed per level' },
  { key: 'BEE_HP_META',       label: 'Bee Health',     cost: 75,  max: 3, desc: '+2 max HP per level' },
  { key: 'HIVE_HP_META',      label: 'Hive Health',    cost: 75,  max: 3, desc: '+5 hive max HP per level' },
  { key: 'HIVE_STORAGE_META', label: 'Honey Storage',  cost: 100, max: 3, desc: '+50 storage per level' },
  { key: 'START_WORKER',      label: 'Start: Worker',  cost: 100, max: 1, desc: 'Begin each run with 1 worker bee' },
  { key: 'START_ARMOR',       label: 'Start: Armor',   cost: 150, max: 1, desc: 'Begin with 1 armor' },
  { key: 'START_HONEY',       label: 'Start: Honey',   cost: 80,  max: 1, desc: 'Begin with 30 honey' },
  { key: 'START_GUARD',       label: 'Start: Guard',   cost: 200, max: 1, desc: 'Begin with 1 guard post' },
  { key: 'START_SOLDIER',     label: 'Start: Soldier', cost: 120, max: 1, desc: 'Begin with 1 soldier bee escort' },
  { key: 'SOLDIER_DMG_META',  label: 'Soldier Damage', cost: 100, max: 3, desc: '+1 soldier damage per level' },
  { key: 'QUICK_RUN_META',    label: 'Quick Run',      cost: 50,  max: 3, desc: 'Survive 1 minute less per level (min 7 min)' },
  { key: 'LONG_RUN_META',     label: 'Longer Run',     cost: 75,  max: 99, desc: 'Survive 5 minutes more per level (no cap)' },
  { key: 'HARD_MODE_META',    label: 'Hard Mode',      cost: 75,  max: 3,  desc: '+2 wasps per wave per level (self-challenge)' },
  { key: 'EXTRA_HIVES_META',  label: 'Extra Hive',     cost: 200, max: 2,  desc: '+1 enemy wasp hive per level (harder, more threats)' },
];

const BUILDABLE_UNLOCKS = [
  { key: 'UNLOCK_RESIN_TRAP',       label: 'Resin Trap',       cost: 50,  max: 1, desc: 'Unlock: slows wasps that walk through resin' },
  { key: 'UNLOCK_GUARD_POST',       label: 'Guard Post',       cost: 100, max: 1, desc: 'Unlock: guard bee that orbits and fires stingers' },
  { key: 'UNLOCK_POISON_HONEY',     label: 'Poison Honey',     cost: 150, max: 1, desc: 'Unlock: lure that poisons wasps and sends them to hive' },
  { key: 'UNLOCK_NECTAR_FOUNTAIN',  label: 'Nectar Fountain',  cost: 150, max: 1, desc: 'Unlock: generates honey passively over time' },
  { key: 'UNLOCK_RECRUIT_SOLDIER',  label: 'Recruit Soldier',  cost: 100, max: 1, desc: 'Unlock: hire soldier bees during a run' },
];

const ROW_H         = 52;
const SCROLL_TOP    = 145;
const SCROLL_BOTTOM = 625;
const SCROLL_H      = SCROLL_BOTTOM - SCROLL_TOP;
const COL_NAME      = 180;
const COL_LVL       = 720;
const COL_BTN       = 940;

export default class MetaUpgradeScene extends Phaser.Scene {
  constructor() { super('MetaUpgradeScene'); }

  create() {
    const cx = 640;

    this.add.text(cx, 40, 'UPGRADES', {
      fontSize: '44px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._jellyText = this.add.text(cx, 82, '', {
      fontSize: '26px', color: '#ffcc00',
    }).setOrigin(0.5);

    // Tab buttons
    this._tabUpgradeBtn = this.add.text(cx - 120, 110, '[ UPGRADES ]', {
      fontSize: '19px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._tabBuildBtn = this.add.text(cx + 120, 110, '[ BUILDABLES ]', {
      fontSize: '19px', color: '#888888',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._tabUpgradeBtn.on('pointerdown', () => this._switchTab('upgrades'));
    this._tabBuildBtn.on('pointerdown',   () => this._switchTab('buildables'));

    // Scroll mask
    const maskGfx = this.make.graphics({ add: false });
    maskGfx.fillRect(0, SCROLL_TOP, 1280, SCROLL_H);
    const scrollMask = maskGfx.createGeometryMask();

    this._upgradeScrollY   = 0;
    this._buildableScrollY = 0;
    this._upgradeMaxScroll   = Math.max(0, UPGRADES.length * ROW_H - SCROLL_H);
    this._buildableMaxScroll = Math.max(0, BUILDABLE_UNLOCKS.length * ROW_H - SCROLL_H);
    this._activeTab = 'upgrades';

    this._upgradeRows   = this._buildRows(UPGRADES, scrollMask);
    this._buildableRows = this._buildRows(BUILDABLE_UNLOCKS, scrollMask);

    // Scroll arrows
    this._arrowUp   = this.add.text(cx, SCROLL_TOP - 14, '▲', { fontSize: '18px', color: '#888888' }).setOrigin(0.5);
    this._arrowDown = this.add.text(cx, SCROLL_BOTTOM + 14, '▼', { fontSize: '18px', color: '#888888' }).setOrigin(0.5);

    // Separator lines
    const sepGfx = this.add.graphics();
    sepGfx.lineStyle(1, 0x444444, 1);
    sepGfx.lineBetween(100, SCROLL_TOP - 1, 1180, SCROLL_TOP - 1);
    sepGfx.lineBetween(100, SCROLL_BOTTOM + 1, 1180, SCROLL_BOTTOM + 1);

    // Footer buttons
    this._refundBtn = this.add.text(cx - 220, 660, '[ REFUND ALL ]', {
      fontSize: '20px', color: '#ffaa00',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._refundBtn.on('pointerover', () => this._refundBtn.setColor('#ffffff'));
    this._refundBtn.on('pointerout',  () => this._refundBtn.setColor('#ffaa00'));
    this._refundBtn.on('pointerdown', () => this._doRefund());

    this._resetBtn = this.add.text(cx + 220, 660, '[ RESET SAVE ]', {
      fontSize: '20px', color: '#ff4444',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._resetBtn.on('pointerover', () => { if (!this._resetBtn._pending) this._resetBtn.setColor('#ff8888'); });
    this._resetBtn.on('pointerout',  () => { if (!this._resetBtn._pending) this._resetBtn.setColor('#ff4444'); });
    this._resetBtn.on('pointerdown', () => this._doReset());

    this._backBtn = this.add.text(cx, 703, '[ BACK TO MENU ]', {
      fontSize: '26px', color: '#ffd700',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._backBtn.on('pointerover', () => this._backBtn.setColor('#ffffff'));
    this._backBtn.on('pointerout',  () => this._backBtn.setColor('#ffd700'));
    this._backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.input.on('wheel', (_ptr, _objs, _dx, deltaY) => {
      this._doScroll(deltaY > 0 ? 48 : -48);
    });

    this._gpIdx    = 0;
    this._gpAWas   = true;
    this._gpBWas   = true;
    this._gpDirWas = true;
    this._gpLRWas  = true;

    this._switchTab('upgrades');
    this._refresh();
  }

  _buildRows(defs, scrollMask) {
    return defs.map((def, i) => {
      const baseY = SCROLL_TOP + i * ROW_H + ROW_H / 2;

      const nameText = this.add.text(COL_NAME, baseY, def.label, {
        fontSize: '21px', color: '#ffffff',
      }).setOrigin(0, 0.5).setMask(scrollMask);

      const descText = this.add.text(COL_NAME, baseY + 16, def.desc, {
        fontSize: '13px', color: '#888888',
      }).setOrigin(0, 0.5).setMask(scrollMask);

      const levelText = this.add.text(COL_LVL, baseY, '', {
        fontSize: '21px', color: '#cccccc',
      }).setOrigin(0.5, 0.5).setMask(scrollMask);

      const btn = this.add.text(COL_BTN, baseY, '', {
        fontSize: '19px', color: '#ffd700',
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).setMask(scrollMask);

      btn.on('pointerover', () => { if (btn._enabled) btn.setColor('#ffffff'); });
      btn.on('pointerout',  () => { if (btn._enabled) btn.setColor('#ffd700'); });
      btn.on('pointerdown', () => {
        if (!btn._enabled) return;
        MetaSave.purchaseUpgrade(def.key, def.cost);
        this._refresh();
      });

      return { def, nameText, descText, levelText, btn, baseY };
    });
  }

  _switchTab(tab) {
    this._activeTab = tab;

    this._upgradeRows.forEach(r => {
      r.nameText.setVisible(tab === 'upgrades');
      r.descText.setVisible(tab === 'upgrades');
      r.levelText.setVisible(tab === 'upgrades');
      r.btn.setVisible(tab === 'upgrades');
    });
    this._buildableRows.forEach(r => {
      r.nameText.setVisible(tab === 'buildables');
      r.descText.setVisible(tab === 'buildables');
      r.levelText.setVisible(tab === 'buildables');
      r.btn.setVisible(tab === 'buildables');
    });

    this._tabUpgradeBtn.setColor(tab === 'upgrades'   ? '#ffd700' : '#888888');
    this._tabBuildBtn.setColor(  tab === 'buildables' ? '#ffd700' : '#888888');

    const rows = tab === 'upgrades' ? this._upgradeRows : this._buildableRows;
    this._navObjs    = [...rows.map(r => r.nameText), this._refundBtn, this._resetBtn, this._backBtn];
    this._navColors  = [...rows.map(() => '#ffffff'), '#ffaa00', '#ff4444', '#ffd700'];
    this._navActions = [
      ...rows.map(r => () => {
        if (r.btn._enabled) { MetaSave.purchaseUpgrade(r.def.key, r.def.cost); this._refresh(); }
      }),
      () => this._doRefund(),
      () => this._doReset(),
      () => this.scene.start('MenuScene'),
    ];
    this._gpIdx = 0;

    this._repositionRows();
    this._updateArrows();
    this._refresh();
  }

  _doScroll(dy) {
    if (this._activeTab === 'upgrades') {
      this._upgradeScrollY = Phaser.Math.Clamp(this._upgradeScrollY + dy, 0, this._upgradeMaxScroll);
    } else {
      this._buildableScrollY = Phaser.Math.Clamp(this._buildableScrollY + dy, 0, this._buildableMaxScroll);
    }
    this._repositionRows();
    this._updateArrows();
  }

  _repositionRows() {
    const scrollY = this._activeTab === 'upgrades' ? this._upgradeScrollY : this._buildableScrollY;
    const rows    = this._activeTab === 'upgrades' ? this._upgradeRows    : this._buildableRows;
    rows.forEach((row, i) => {
      const y = SCROLL_TOP + i * ROW_H + ROW_H / 2 - scrollY;
      row.nameText.setY(y);
      row.descText.setY(y + 16);
      row.levelText.setY(y);
      row.btn.setY(y);
    });
  }

  _updateArrows() {
    const scrollY   = this._activeTab === 'upgrades' ? this._upgradeScrollY   : this._buildableScrollY;
    const maxScroll = this._activeTab === 'upgrades' ? this._upgradeMaxScroll  : this._buildableMaxScroll;
    this._arrowUp.setAlpha(scrollY > 0 ? 1 : 0.2);
    this._arrowDown.setAlpha(scrollY < maxScroll ? 1 : 0.2);
  }

  _ensureVisible(rowIdx) {
    const rows    = this._activeTab === 'upgrades' ? this._upgradeRows    : this._buildableRows;
    const scrollY = this._activeTab === 'upgrades' ? this._upgradeScrollY : this._buildableScrollY;
    if (rowIdx >= rows.length) return;
    const rowTop = rowIdx * ROW_H;
    const rowBot = rowTop + ROW_H;
    if (rowTop < scrollY) {
      this._doScroll(rowTop - scrollY);
    } else if (rowBot > scrollY + SCROLL_H) {
      this._doScroll(rowBot - (scrollY + SCROLL_H));
    }
  }

  _doRefund() {
    const s = MetaSave.load();
    [...UPGRADES, ...BUILDABLE_UNLOCKS].forEach(def => {
      s.jellyBalance += (s.upgrades[def.key] ?? 0) * def.cost;
      s.upgrades[def.key] = 0;
    });
    MetaSave.save(s);
    this._refresh();
  }

  _doReset() {
    if (!this._resetBtn._pending) {
      this._resetBtn._pending = true;
      this._resetBtn.setText('[ CONFIRM? ]').setColor('#ff8888');
      this.time.delayedCall(3000, () => {
        if (this._resetBtn._pending) {
          this._resetBtn._pending = false;
          this._resetBtn.setText('[ RESET SAVE ]').setColor('#ff4444');
          this._gpRefresh();
        }
      });
    } else {
      this._resetBtn._pending = false;
      MetaSave.reset();
      this._resetBtn.setText('[ RESET SAVE ]').setColor('#ff4444');
      this._refresh();
    }
  }

  _refresh() {
    const s = MetaSave.load();
    this._jellyText.setText(`Royal Jelly: ${s.jellyBalance}`);

    [...this._upgradeRows, ...this._buildableRows].forEach(({ def, levelText, btn }) => {
      const level = s.upgrades[def.key] ?? 0;
      const maxed = level >= def.max;
      const canAfford = s.jellyBalance >= def.cost;
      levelText.setText(`${level} / ${def.max}`);
      if (maxed) {
        btn.setText('MAXED').setColor('#555555');
        btn._enabled = false;
      } else if (canAfford) {
        btn.setText(`[ BUY ${def.cost}j ]`).setColor('#ffd700');
        btn._enabled = true;
      } else {
        btn.setText(`[ BUY ${def.cost}j ]`).setColor('#555555');
        btn._enabled = false;
      }
    });
    this._gpRefresh();
    this._updateArrows();
  }

  _gpRefresh() {
    if (!this._navObjs) return;
    this._navObjs.forEach((obj, i) => {
      obj.setColor(i === this._gpIdx ? '#ffff44' : this._navColors[i]);
    });
  }

  update() {
    const gp  = this.input.gamepad;
    const pad = gp?.total > 0 ? gp.gamepads.find(p => p?.connected) : null;
    if (!pad) return;

    // Left/right: switch tabs
    const lrDown = pad.buttons[14]?.pressed || pad.buttons[15]?.pressed ||
                   Math.abs(pad.leftStick.x) > 0.4;
    if (lrDown && !this._gpLRWas) {
      const tabs = ['upgrades', 'buildables'];
      const idx  = tabs.indexOf(this._activeTab);
      const dx   = (pad.buttons[14]?.pressed || pad.leftStick.x < -0.4) ? -1 : 1;
      this._switchTab(tabs[(idx + dx + tabs.length) % tabs.length]);
    }
    this._gpLRWas = lrDown;

    // Up/down: navigate rows
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + this._navObjs.length) % this._navObjs.length;
      this._gpRefresh();
      const rows = this._activeTab === 'upgrades' ? this._upgradeRows : this._buildableRows;
      if (this._gpIdx < rows.length) this._ensureVisible(this._gpIdx);
    }
    this._gpDirWas = dirDown;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) this._navActions[this._gpIdx]?.();
    this._gpAWas = aDown;

    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWas) this.scene.start('MenuScene');
    this._gpBWas = bDown;
  }
}
```

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`. Navigate to UPGRADES screen. Verify:
- Two tab buttons visible: `[ UPGRADES ]` and `[ BUILDABLES ]`
- Clicking `[ BUILDABLES ]` switches to the unlock list (5 entries: Resin Trap 50j, Guard Post 100j, Poison Honey 150j, Nectar Fountain 150j, Recruit Soldier 100j)
- Clicking `[ UPGRADES ]` switches back
- Buying an unlock with enough jelly works (buy Resin Trap for 50j: jelly decreases, shows MAXED)
- REFUND ALL returns jelly from both tabs
- Scroll arrows and mouse wheel work in both tabs

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MetaUpgradeScene.js
git commit -m "feat: add buildables unlock tab to MetaUpgradeScene"
```

---

## Task 4: BuildMenu — Filter Locked Items

**Files:**
- Modify: `src/ui/BuildMenu.js`

- [ ] **Step 1: Replace BuildMenu.js**

Replace the full content of `src/ui/BuildMenu.js` with:

```js
import { TOWER, WORKER, SOLDIER, NECTAR_FOUNTAIN } from '../constants.js';
import MetaSave from '../systems/MetaSave.js';

export default class BuildMenu {
  constructor(scene, onSelect, getHoney) {
    this._scene    = scene;
    this._onSelect = onSelect;
    this._getHoney = getHoney;

    const s  = { fontSize: '17px', color: '#ffd700', stroke: '#000', strokeThickness: 3 };
    const hs = { ...s, fontSize: '20px', color: '#ffffff' };

    this._bg = scene.add.rectangle(640, 380, 440, 342, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(200);

    this._title = scene.add.text(640, 270, 'BUILD  (B to close)', hs)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201);

    this._allItems = [
      { key: 'resin-trap',      cost: TOWER.RESIN_TRAP_COST,    label: `Resin Trap  ${TOWER.RESIN_TRAP_COST}h`,      unlockKey: 'UNLOCK_RESIN_TRAP'      },
      { key: 'guard-post',      cost: TOWER.GUARD_POST_COST,    label: `Guard Post  ${TOWER.GUARD_POST_COST}h`,      unlockKey: 'UNLOCK_GUARD_POST'      },
      { key: 'poison-honey',    cost: TOWER.POISON_HONEY_COST,  label: `Poison Honey  ${TOWER.POISON_HONEY_COST}h`,  unlockKey: 'UNLOCK_POISON_HONEY'    },
      { key: 'nectar-fountain', cost: NECTAR_FOUNTAIN.COST,     label: `Nectar Fountain  ${NECTAR_FOUNTAIN.COST}h`,  unlockKey: 'UNLOCK_NECTAR_FOUNTAIN' },
      { key: 'recruit-worker',  cost: WORKER.COST,              label: `Recruit Worker  ${WORKER.COST}h`                                                   },
      { key: 'recruit-soldier', cost: SOLDIER.COST,             label: `Recruit Soldier  ${SOLDIER.COST}h`,          unlockKey: 'UNLOCK_RECRUIT_SOLDIER' },
    ];

    // Create one button per item (repositioned on show() for visible items only)
    this._buttons = this._allItems.map((item) => {
      const btn = scene.add.text(640, 310, item.label, s)
        .setOrigin(0.5, 0).setScrollFactor(0).setDepth(201).setInteractive();
      btn._enabled = true;
      btn.on('pointerover', () => { if (btn._enabled) btn.setColor('#ffffff'); });
      btn.on('pointerout',  () => this._gpRefresh());
      btn.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        if (!btn._enabled) return;
        this._onSelect(item.key);
        this.hide();
      });
      return btn;
    });

    this._gpIdx    = 0;
    this._gpAWas   = false;
    this._gpBWas   = false;
    this._gpDirWas = false;
    this._visibleIndices = [];

    this.hide();
  }

  show() {
    this._visible = true;
    this._gpIdx = 0;

    const save = MetaSave.load();
    this._visibleIndices = [];

    this._allItems.forEach((item, i) => {
      const locked = item.unlockKey && !(save.upgrades[item.unlockKey] >= 1);
      if (locked) {
        this._buttons[i].setVisible(false).disableInteractive();
      } else {
        this._visibleIndices.push(i);
        this._buttons[i].setVisible(true).setInteractive();
      }
    });

    // Reposition visible buttons compactly
    this._visibleIndices.forEach((itemIdx, slot) => {
      this._buttons[itemIdx].setY(310 + slot * 36);
    });

    // Resize bg to fit visible count
    const count = this._visibleIndices.length;
    const bgH   = Math.max(80, 60 + count * 36 + 20);
    const bgY   = 270 + bgH / 2;
    this._bg.setSize(440, bgH).setY(bgY);

    [this._bg, this._title].forEach(o => o.setVisible(true));
    this._refreshAffordability();
    this._gpRefresh();
  }

  hide() {
    this._visible = false;
    [this._bg, this._title, ...this._buttons].forEach(o => o.setVisible(false));
    this._buttons.forEach(b => b.disableInteractive());
  }

  get visible() { return this._visible; }

  _refreshAffordability() {
    if (!this._getHoney) return;
    const honey = this._getHoney();
    this._visibleIndices.forEach(i => {
      this._buttons[i]._enabled = honey >= this._allItems[i].cost;
    });
  }

  _gpRefresh() {
    this._refreshAffordability();
    this._visibleIndices.forEach((itemIdx, slot) => {
      const btn = this._buttons[itemIdx];
      if (slot === this._gpIdx) btn.setColor('#ffffff');
      else if (!btn._enabled)   btn.setColor('#555555');
      else                      btn.setColor('#ffd700');
    });
  }

  gpUpdate(pad) {
    const dirDown = pad.buttons[12]?.pressed || pad.buttons[13]?.pressed ||
                    Math.abs(pad.leftStick.y) > 0.4;
    if (dirDown && !this._gpDirWas) {
      const dy = (pad.buttons[12]?.pressed || pad.leftStick.y < -0.4) ? -1 : 1;
      this._gpIdx = (this._gpIdx + dy + this._visibleIndices.length) % this._visibleIndices.length;
      this._gpRefresh();
    }
    this._gpDirWas = dirDown;

    const aDown = pad.buttons[0]?.pressed ?? false;
    if (aDown && !this._gpAWas) {
      const itemIdx = this._visibleIndices[this._gpIdx];
      if (itemIdx !== undefined && this._buttons[itemIdx]._enabled) {
        this._onSelect(this._allItems[itemIdx].key);
        this.hide();
      }
    }
    this._gpAWas = aDown;

    const bDown = pad.buttons[1]?.pressed ?? false;
    if (bDown && !this._gpBWas) this.hide();
    this._gpBWas = bDown;
  }
}
```

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`. Start a run with nothing unlocked in meta:
- Open build menu (B key) → verify only `Recruit Worker` appears (all others locked)
- Exit, go to UPGRADES → BUILDABLES tab, buy Resin Trap (50j if you have jelly)
- Start a new run, open build menu → Resin Trap should now appear alongside Recruit Worker
- Buy and place a Resin Trap to confirm placement still works

- [ ] **Step 3: Run full test suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/BuildMenu.js
git commit -m "feat: filter locked buildables from build menu based on meta unlocks"
```

---

## Self-Review

**Spec coverage:**
- ✅ Hunter dies on player hit (Task 1)
- ✅ Hunter no stingers — already true, no code change needed (confirmed in exploration)
- ✅ 5 buildables locked by default (Task 2 + 4); Recruit Worker always free (Task 4)
- ✅ Royal jelly unlock in separate tab (Task 3)
- ✅ Locked items hidden entirely from build menu (Task 4)
- ✅ Refund All covers both tabs (Task 3 `_doRefund`)
- ✅ Gamepad tab switching (Task 3 update() left/right)

**Type/name consistency:**
- `BUILDABLE_UNLOCKS` defined in Task 3, referenced in same file only ✅
- `_upgradeRows` / `_buildableRows` consistent across `_switchTab`, `_repositionRows`, `_updateArrows`, `_ensureVisible`, `_refresh` ✅
- `_visibleIndices` defined in constructor, populated in `show()`, used in `_gpRefresh()`, `gpUpdate()`, `_refreshAffordability()` ✅
- Unlock keys `UNLOCK_RESIN_TRAP` etc. consistent between MetaSave DEFAULTS (Task 2) and `_allItems` unlockKey fields (Task 4) ✅

**No placeholders found.**
