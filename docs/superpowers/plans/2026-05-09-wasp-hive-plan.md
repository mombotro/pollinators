# Wasp Hive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a destructible wasp hive on the map — the physical spawn point of all waves, an alternate win condition, and a honey-powered escalating threat.

**Architecture:** `WaspHiveSystem` coordinates a `WaspHive` entity, honey tracking, wave spawning with flanking, and HP regen. Pure math is in static methods for testability. `WaveManager` stays unchanged. GameScene replaces `_spawnWave`/`_edgePoint` with `waspHiveSystem.spawnWave()`.

**Tech Stack:** Phaser 3.87, Vite 5, Vitest 2, vanilla JS

---

## File Map

```
src/entities/WaspHive.js          CREATE — destructible sprite, hp/takeDamage/heal
src/systems/WaspHiveSystem.js     CREATE — honey tracking, scaling, regen, wave spawn, flank math
tests/WaspHiveSystem.test.js      CREATE — pure logic: countMult, powerChance, regenAmount, calcFlankWaypoint
src/entities/HunterWasp.js        MODIFY — _speedMult, _flankWaypoint, setFlankWaypoint, waypoint travel
src/entities/RaiderWasp.js        MODIFY — _flankWaypoint, setFlankWaypoint, waypoint travel
src/scenes/BootScene.js           MODIFY — add 'wasp-hive' texture
src/scenes/GameScene.js           MODIFY — wire WaspHiveSystem, honey callbacks, stinger overlap, remove _spawnWave/_edgePoint
src/scenes/GameOverScene.js       MODIFY — wonByDestruction headline
src/constants.js                  MODIFY — add WASP_HIVE block
```

---

### Task 1: Constants, WaspHive entity, BootScene texture

**Files:**
- Modify: `src/constants.js`
- Create: `src/entities/WaspHive.js`
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Add WASP_HIVE constants**

In `src/constants.js`, add after the `WIND` block:

```js
export const WASP_HIVE = {
  HP: 30,
  REGEN_INTERVAL: 10000,
  REGEN_BASE: 0.5,
  REGEN_PER_HONEY: 0.1,
};
```

- [ ] **Step 2: Create WaspHive entity**

Create `src/entities/WaspHive.js`:

```js
import Phaser from 'phaser';
import { WASP_HIVE } from '../constants.js';

export default class WaspHive extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'wasp-hive');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setImmovable(true);
    this.hp = WASP_HIVE.HP;
    this.maxHp = WASP_HIVE.HP;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => { if (this.active) this.clearTint(); });
    return this.hp <= 0;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }
}
```

- [ ] **Step 3: Add wasp-hive texture to BootScene**

In `src/scenes/BootScene.js`, inside `create()` before `g.destroy()`, add:

```js
// wasp-hive: dark amber with black void center — distinct from player hive
g.clear();
g.fillStyle(0x884400);
g.fillRect(0, 0, 64, 64);
g.fillStyle(0xcc6600);
g.fillRect(8, 8, 48, 48);
g.fillStyle(0x000000);
g.fillCircle(32, 32, 12);
g.generateTexture('wasp-hive', 64, 64);
```

- [ ] **Step 4: Run tests**

```
npx vitest run
```

Expected: 47 tests PASS (no new tests yet — entity is Phaser-dependent)

- [ ] **Step 5: Commit**

```
git add src/constants.js src/entities/WaspHive.js src/scenes/BootScene.js
git commit -m "feat: WaspHive entity and WASP_HIVE constants"
```

---

### Task 2: WaspHiveSystem pure logic + tests

**Files:**
- Create: `src/systems/WaspHiveSystem.js` (pure static methods only for now)
- Create: `tests/WaspHiveSystem.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/WaspHiveSystem.test.js`:

```js
import { describe, it, expect } from 'vitest';
import WaspHiveSystem from '../src/systems/WaspHiveSystem.js';

describe('WaspHiveSystem.countMult', () => {
  it('returns 1 at 0 honey stolen', () => {
    expect(WaspHiveSystem.countMult(0)).toBe(1);
  });
  it('returns 1.15 at 50 honey stolen', () => {
    expect(WaspHiveSystem.countMult(50)).toBeCloseTo(1.15);
  });
  it('returns 1.30 at 100 honey stolen', () => {
    expect(WaspHiveSystem.countMult(100)).toBeCloseTo(1.30);
  });
  it('caps at 3 at high honey', () => {
    expect(WaspHiveSystem.countMult(10000)).toBe(3);
  });
});

describe('WaspHiveSystem.powerChance', () => {
  it('returns 0 at 0 honey', () => {
    expect(WaspHiveSystem.powerChance(0)).toBe(0);
  });
  it('returns 0.3 at 60 honey', () => {
    expect(WaspHiveSystem.powerChance(60)).toBeCloseTo(0.3);
  });
  it('caps at 0.6 at 200+ honey', () => {
    expect(WaspHiveSystem.powerChance(200)).toBe(0.6);
    expect(WaspHiveSystem.powerChance(999)).toBe(0.6);
  });
});

describe('WaspHiveSystem.regenAmount', () => {
  it('returns REGEN_BASE at 0 honey stolen', () => {
    expect(WaspHiveSystem.regenAmount(0)).toBeCloseTo(0.5);
  });
  it('returns 0.5 + 5*0.1 = 1.0 at 100 honey stolen', () => {
    // floor(100/20) = 5 ticks, 5 * 0.1 = 0.5 extra, total = 1.0
    expect(WaspHiveSystem.regenAmount(100)).toBeCloseTo(1.0);
  });
});

describe('WaspHiveSystem.calcFlankWaypoint', () => {
  it('returns a point on the map edge', () => {
    const W = 2560, H = 1440;
    // Hive at top-left, player hive at center
    const wp = WaspHiveSystem.calcFlankWaypoint(200, 200, 1280, 720, W, H, Math.PI / 2);
    expect(wp.x >= 0 && wp.x <= W).toBe(true);
    expect(wp.y >= 0 && wp.y <= H).toBe(true);
    // Should be on an edge (one coord near 0 or max)
    const onEdge = wp.x <= 1 || wp.x >= W - 1 || wp.y <= 1 || wp.y >= H - 1;
    expect(onEdge).toBe(true);
  });

  it('flank angle is perpendicular to direct path', () => {
    const W = 2560, H = 1440;
    // Direct path goes right (east). Rotate 90deg = south. Should hit bottom edge (y=H).
    const wp = WaspHiveSystem.calcFlankWaypoint(100, 720, 1280, 720, W, H, Math.PI / 2);
    expect(wp.y).toBeCloseTo(H, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/WaspHiveSystem.test.js
```

Expected: FAIL — "Cannot find module '../src/systems/WaspHiveSystem.js'"

- [ ] **Step 3: Implement WaspHiveSystem pure static methods**

Create `src/systems/WaspHiveSystem.js`:

```js
import { WASP_HIVE, WORLD } from '../constants.js';

export default class WaspHiveSystem {
  // ── Pure static methods (testable) ─────────────────────────────────────

  static countMult(totalHoneyStolen) {
    return Math.min(3, 1 + Math.floor(totalHoneyStolen / 50) * 0.15);
  }

  static powerChance(totalHoneyStolen) {
    return Math.min(0.6, totalHoneyStolen / 200);
  }

  static regenAmount(totalHoneyStolen) {
    return WASP_HIVE.REGEN_BASE + Math.floor(totalHoneyStolen / 20) * WASP_HIVE.REGEN_PER_HONEY;
  }

  // rotateBy is in radians — how far to rotate the direct angle for flanking
  static calcFlankWaypoint(hiveX, hiveY, playerHiveX, playerHiveY, worldW, worldH, rotateBy) {
    const directAngle = Math.atan2(playerHiveY - hiveY, playerHiveX - hiveX);
    const flankAngle = directAngle + rotateBy;
    const dx = Math.cos(flankAngle);
    const dy = Math.sin(flankAngle);
    const tX = dx > 0 ? (worldW - hiveX) / dx : dx < 0 ? -hiveX / dx : Infinity;
    const tY = dy > 0 ? (worldH - hiveY) / dy : dy < 0 ? -hiveY / dy : Infinity;
    const t = Math.min(tX, tY);
    return {
      x: Math.max(0, Math.min(worldW, hiveX + t * dx)),
      y: Math.max(0, Math.min(worldH, hiveY + t * dy)),
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/WaspHiveSystem.test.js
```

Expected: 8 tests PASS

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

Expected: 55 tests PASS

- [ ] **Step 6: Commit**

```
git add src/systems/WaspHiveSystem.js tests/WaspHiveSystem.test.js
git commit -m "feat: WaspHiveSystem pure logic — scaling, regen, flank math"
```

---

### Task 3: Flanking waypoints in HunterWasp and RaiderWasp

**Files:**
- Modify: `src/entities/HunterWasp.js`
- Modify: `src/entities/RaiderWasp.js`

- [ ] **Step 1: Update HunterWasp constructor**

In `src/entities/HunterWasp.js`, inside the constructor after `this.slowedUntil = 0;`, add:

```js
    this._speedMult = 1;
    this._flankWaypoint = null;
```

- [ ] **Step 2: Add setFlankWaypoint to HunterWasp**

After the `setTarget` method, add:

```js
  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }
```

- [ ] **Step 3: Add waypoint travel to HunterWasp.update()**

At the very top of the `update(time, windVec)` method body, before the existing `isRetreating` check, insert:

```js
    if (this._flankWaypoint) {
      const speed = (time < this.slowedUntil
        ? WASP.HUNTER_SPEED * TOWER.RESIN_TRAP_SLOW
        : WASP.HUNTER_SPEED) * this._speedMult;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (dist <= 50) {
        this._flankWaypoint = null;
      } else {
        this.setMaxVelocity(speed, speed);
        const ax = (this._flankWaypoint.x - this.x) / dist;
        const ay = (this._flankWaypoint.y - this.y) / dist;
        this.setAcceleration(ax * speed * 10, ay * speed * 10);
        if (this.body.velocity.lengthSq() > 10) {
          const targetRotation = this.body.velocity.angle() + Math.PI / 2;
          this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, 0.15);
        }
        return;
      }
    }
```

- [ ] **Step 4: Use _speedMult in HunterWasp normal movement**

In `HunterWasp.update()`, find the two lines that read `const speed = time < this.slowedUntil ...` (in the retreating block and in the normal targeting block). Update both to multiply by `this._speedMult`:

```js
    // In retreating block:
    const speed = (time < this.slowedUntil
      ? WASP.HUNTER_SPEED * TOWER.RESIN_TRAP_SLOW
      : WASP.HUNTER_SPEED) * this._speedMult;

    // In normal targeting block (second occurrence):
    const speed = (time < this.slowedUntil
      ? WASP.HUNTER_SPEED * TOWER.RESIN_TRAP_SLOW
      : WASP.HUNTER_SPEED) * this._speedMult;
```

- [ ] **Step 5: Update RaiderWasp — add _flankWaypoint and setFlankWaypoint**

In `src/entities/RaiderWasp.js`, inside the constructor after `this.lastHit = 0;`, add:

```js
    this._flankWaypoint = null;
```

After the `retreat()` method, add:

```js
  setFlankWaypoint(x, y) { this._flankWaypoint = { x, y }; }
```

- [ ] **Step 6: Add waypoint travel to RaiderWasp.update()**

At the very top of the `update(time, windVec)` method body, before the existing `isRetreating` check, insert:

```js
    if (this._flankWaypoint) {
      const speed = time < this.slowedUntil
        ? WASP.RAIDER_SPEED * TOWER.RESIN_TRAP_SLOW
        : WASP.RAIDER_SPEED;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this._flankWaypoint.x, this._flankWaypoint.y);
      if (dist <= 50) {
        this._flankWaypoint = null;
      } else {
        this.scene.physics.moveToObject(this, this._flankWaypoint, speed);
        return;
      }
    }
```

- [ ] **Step 7: Run full test suite**

```
npx vitest run
```

Expected: 55 tests PASS

- [ ] **Step 8: Commit**

```
git add src/entities/HunterWasp.js src/entities/RaiderWasp.js
git commit -m "feat: flank waypoints and speedMult in HunterWasp and RaiderWasp"
```

---

### Task 4: WaspHiveSystem full implementation (placement, regen, spawnWave)

**Files:**
- Modify: `src/systems/WaspHiveSystem.js`

Replace the entire contents of `src/systems/WaspHiveSystem.js` with:

- [ ] **Step 1: Write complete WaspHiveSystem**

```js
import Phaser from 'phaser';
import { WASP_HIVE, WASP, WORLD, TOWER } from '../constants.js';
import WaspHive from '../entities/WaspHive.js';
import HunterWasp from '../entities/HunterWasp.js';
import RaiderWasp from '../entities/RaiderWasp.js';

export default class WaspHiveSystem {
  constructor({ scene, playerHiveX, playerHiveY }) {
    this._scene = scene;
    this._playerHiveX = playerHiveX;
    this._playerHiveY = playerHiveY;
    this._totalHoneyStolen = 0;
    this._lastRegenAt = 0;

    const { x, y } = this._randomPosition(playerHiveX, playerHiveY);
    this._hive = new WaspHive(scene, x, y);
  }

  get hive() { return this._hive; }

  onHoneyStolen(amount) {
    this._totalHoneyStolen += amount;
  }

  update(time) {
    if (!this._hive.active) return;
    if (time - this._lastRegenAt < WASP_HIVE.REGEN_INTERVAL) return;
    this._lastRegenAt = time;
    this._hive.heal(WaspHiveSystem.regenAmount(this._totalHoneyStolen));
  }

  spawnWave(waveSpec) {
    if (!this._hive.active) return;
    const hx = this._hive.x;
    const hy = this._hive.y;
    const mult = WaspHiveSystem.countMult(this._totalHoneyStolen);
    const hunterCount = Math.floor(waveSpec.hunterCount * mult);
    const raiderCount = Math.floor(waveSpec.raiderCount * mult);
    const pc = WaspHiveSystem.powerChance(this._totalHoneyStolen);

    for (let i = 0; i < hunterCount; i++) {
      const w = new HunterWasp(this._scene, hx, hy);
      w.setTarget(this._scene.player);
      if (Math.random() < pc) { w.hp = 2; w._speedMult = 1.25; }
      this._scene.wasps.add(w);
      if (Math.random() < 0.5) {
        const rotDir = Math.random() < 0.5 ? 1 : -1;
        const rotAmt = (Math.random() * (150 - 90) + 90) * Math.PI / 180 * rotDir;
        const wp = WaspHiveSystem.calcFlankWaypoint(hx, hy, this._playerHiveX, this._playerHiveY, WORLD.WIDTH, WORLD.HEIGHT, rotAmt);
        w.setFlankWaypoint(wp.x, wp.y);
      }
    }

    for (let i = 0; i < raiderCount; i++) {
      const guardPosts = this._scene._towerList.filter(t => t.towerType === 'guard' && t.active && t.hp > 0);
      const target = guardPosts.length > 0 && Math.random() < 0.4
        ? Phaser.Utils.Array.GetRandom(guardPosts)
        : this._scene.hive;
      const w = new RaiderWasp(this._scene, hx, hy, this._scene.hive, target);
      if (Math.random() < pc) { w.hp = 2; }
      this._scene.wasps.add(w);
      if (Math.random() < 0.5) {
        const rotDir = Math.random() < 0.5 ? 1 : -1;
        const rotAmt = (Math.random() * (150 - 90) + 90) * Math.PI / 180 * rotDir;
        const wp = WaspHiveSystem.calcFlankWaypoint(hx, hy, this._playerHiveX, this._playerHiveY, WORLD.WIDTH, WORLD.HEIGHT, rotAmt);
        w.setFlankWaypoint(wp.x, wp.y);
      }
    }
  }

  _randomPosition(playerHiveX, playerHiveY) {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(200, WORLD.WIDTH - 200);
      const y = Phaser.Math.Between(200, WORLD.HEIGHT - 200);
      if (Phaser.Math.Distance.Between(x, y, playerHiveX, playerHiveY) >= 800) {
        return { x, y };
      }
    }
    // Fallback: corner opposite the default hive placement
    return { x: 400, y: 400 };
  }

  // ── Pure static methods (testable) ─────────────────────────────────────

  static countMult(totalHoneyStolen) {
    return Math.min(3, 1 + Math.floor(totalHoneyStolen / 50) * 0.15);
  }

  static powerChance(totalHoneyStolen) {
    return Math.min(0.6, totalHoneyStolen / 200);
  }

  static regenAmount(totalHoneyStolen) {
    return WASP_HIVE.REGEN_BASE + Math.floor(totalHoneyStolen / 20) * WASP_HIVE.REGEN_PER_HONEY;
  }

  static calcFlankWaypoint(hiveX, hiveY, playerHiveX, playerHiveY, worldW, worldH, rotateBy) {
    const directAngle = Math.atan2(playerHiveY - hiveY, playerHiveX - hiveX);
    const flankAngle = directAngle + rotateBy;
    const dx = Math.cos(flankAngle);
    const dy = Math.sin(flankAngle);
    const tX = dx > 0 ? (worldW - hiveX) / dx : dx < 0 ? -hiveX / dx : Infinity;
    const tY = dy > 0 ? (worldH - hiveY) / dy : dy < 0 ? -hiveY / dy : Infinity;
    const t = Math.min(tX, tY);
    return {
      x: Math.max(0, Math.min(worldW, hiveX + t * dx)),
      y: Math.max(0, Math.min(worldH, hiveY + t * dy)),
    };
  }
}
```

- [ ] **Step 2: Run full test suite**

```
npx vitest run
```

Expected: 55 tests PASS (pure static methods unchanged — tests still pass)

- [ ] **Step 3: Commit**

```
git add src/systems/WaspHiveSystem.js
git commit -m "feat: WaspHiveSystem placement, regen, and wave spawning with flanking"
```

---

### Task 5: GameScene integration

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Add WaspHiveSystem import**

At the top of `src/scenes/GameScene.js`, after the existing imports, add:

```js
import WaspHiveSystem from '../systems/WaspHiveSystem.js';
```

- [ ] **Step 2: Create WaspHiveSystem in create()**

In `GameScene.create()`, after the `WaveManager` construction block (after `this.waveManager = new WaveManager({...});`), add:

```js
    this.waspHiveSystem = new WaspHiveSystem({
      scene: this,
      playerHiveX: this.hiveX,
      playerHiveY: this.hiveY,
    });
```

- [ ] **Step 3: Add stinger overlap with WaspHive**

After the existing `this.physics.add.overlap(this.stingers, this.wasps, ...)` block, add:

```js
    this.physics.add.overlap(this.stingers, this.waspHiveSystem.hive, (stinger, waspHive) => {
      stinger.destroy();
      if (waspHive.takeDamage(stinger.damage)) {
        this._endGame(true, true);
      }
    });
```

- [ ] **Step 4: Add honey stolen callbacks**

In the hunter-player collision handler (around line 208), find:

```js
        this.resources.stealSap('player', Math.max(1, WASP.SAP_STEAL - this.player.armor));
```

Add immediately after it:

```js
        this.waspHiveSystem.onHoneyStolen(Math.max(1, WASP.SAP_STEAL - this.player.armor));
```

In the wasp-hive collision handler, find:

```js
        this.resources.stealHoney(WASP.HONEY_STEAL);
```

Add immediately after it:

```js
        this.waspHiveSystem.onHoneyStolen(WASP.HONEY_STEAL);
```

- [ ] **Step 5: Wire waspHiveSystem.update() in update loop**

In `GameScene.update()`, find the line:

```js
    const wave = this.waveManager.update(this._playTime);
    if (wave) this._spawnWave(wave);
```

Replace with:

```js
    const wave = this.waveManager.update(this._playTime);
    if (wave) this.waspHiveSystem.spawnWave(wave);
    this.waspHiveSystem.update(this._gameTime);
```

- [ ] **Step 6: Delete _spawnWave and _edgePoint**

Remove the `_spawnWave(waveSpec)` method and the `_edgePoint()` method entirely from `GameScene`. They are fully replaced by `WaspHiveSystem.spawnWave()`.

- [ ] **Step 7: Run full test suite**

```
npx vitest run
```

Expected: 55 tests PASS

- [ ] **Step 8: Commit**

```
git add src/scenes/GameScene.js
git commit -m "feat: wire WaspHiveSystem into GameScene — spawn, regen, honey tracking"
```

---

### Task 6: GameOverScene wonByDestruction headline

**Files:**
- Modify: `src/scenes/GameScene.js` — update `_endGame` signature
- Modify: `src/scenes/GameOverScene.js` — alternate headline

- [ ] **Step 1: Update _endGame to accept wonByDestruction**

In `GameScene._endGame`, replace:

```js
  _endGame(won) {
    if (this._ended) return;
    this._ended = true;
    const score = this._calculateScore();
    const waves = this.waveManager.getWaveNumber();
    const timeSurvived = Math.floor(this._playTime / 1000);
    this.scene.start('GameOverScene', { won, score, waves, timeSurvived });
  }
```

With:

```js
  _endGame(won, wonByDestruction = false) {
    if (this._ended) return;
    this._ended = true;
    const score = this._calculateScore();
    const waves = this.waveManager.getWaveNumber();
    const timeSurvived = Math.floor(this._playTime / 1000);
    this.scene.start('GameOverScene', { won, score, waves, timeSurvived, wonByDestruction });
  }
```

- [ ] **Step 2: Update GameOverScene init**

In `src/scenes/GameOverScene.js`, in `init(data)`, add after `this.timeSurvived = ...`:

```js
    this.wonByDestruction = data.wonByDestruction ?? false;
```

- [ ] **Step 3: Update GameOverScene headline**

In `GameOverScene.create()`, replace:

```js
    this.add.text(cx, 120, this.won ? 'YOU WIN!' : 'HIVE DESTROYED', {
      fontSize: '56px',
      color: this.won ? '#ffd700' : '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
```

With:

```js
    const headline = this.wonByDestruction
      ? 'WASP HIVE DESTROYED'
      : this.won ? 'YOU WIN!' : 'HIVE DESTROYED';
    const headlineColor = (this.won || this.wonByDestruction) ? '#ffd700' : '#ff4444';

    this.add.text(cx, 120, headline, {
      fontSize: '56px',
      color: headlineColor,
      fontStyle: 'bold',
    }).setOrigin(0.5);
```

- [ ] **Step 4: Run full test suite**

```
npx vitest run
```

Expected: 55 tests PASS

- [ ] **Step 5: Commit**

```
git add src/scenes/GameScene.js src/scenes/GameOverScene.js
git commit -m "feat: alternate win condition — wasp hive destroyed headline"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| WaspHive entity, hp/takeDamage/heal | Task 1 |
| WASP_HIVE constants | Task 1 |
| wasp-hive texture in BootScene | Task 1 |
| WaspHiveSystem.countMult, powerChance, regenAmount, calcFlankWaypoint | Task 2 |
| Tests for all pure static methods | Task 2 |
| HunterWasp _speedMult, setFlankWaypoint, waypoint travel | Task 3 |
| RaiderWasp setFlankWaypoint, waypoint travel | Task 3 |
| WaspHiveSystem full implementation (placement, regen, spawnWave) | Task 4 |
| Random placement ≥800px from player hive, ≥200px from edges | Task 4 |
| 50% flankers per wave with 90–150° rotation | Task 4 |
| Powered wasps: hp=2, speed+25% | Task 4 |
| countMult and powerChance applied to wave | Task 4 |
| GameScene: WaspHiveSystem wired in create() | Task 5 |
| Stinger→WaspHive overlap triggers _endGame(true, true) | Task 5 |
| onHoneyStolen called on SAP_STEAL and HONEY_STEAL | Task 5 |
| waspHiveSystem.update() called in update loop | Task 5 |
| _spawnWave and _edgePoint deleted | Task 5 |
| _endGame wonByDestruction flag | Task 6 |
| GameOverScene "WASP HIVE DESTROYED" headline | Task 6 |

**Placeholder scan:** None found.

**Type consistency:**
- `WaspHiveSystem.calcFlankWaypoint(hx, hy, phx, phy, W, H, rotateBy)` — defined Task 2 static, used in Task 4 `spawnWave` with same 7-arg signature ✓
- `w.setFlankWaypoint(wp.x, wp.y)` — defined Task 3, called Task 4 ✓
- `waspHive.takeDamage(stinger.damage)` — `takeDamage(amount)` defined Task 1 ✓
- `waspHive.heal(amount)` — defined Task 1, called in Task 4 `update()` ✓
- `this._endGame(true, true)` — second param `wonByDestruction = false` added Task 6 ✓
