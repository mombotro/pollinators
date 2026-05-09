# Meta-Progression & LocalStorage Design

**Goal:** Add persistent royal jelly currency earned from runs, a between-run upgrade screen, and LocalStorage save/load so progress carries across sessions.

**Architecture:** A single pure-JS `MetaSave` class owns all persistence. GameScene reads the save once at create-time and applies upgrades to entity objects directly. No existing system is restructured — integration is additive.

**Tech Stack:** Phaser 3.87, Vite 5, Vitest 2, vanilla JS

**Series:** Plan 4 of 4.

---

## Data Model

LocalStorage key: `bee-game-save`

```js
{
  jellyBalance: 0,
  upgrades: {
    BEE_SPEED_META:   0,   // levels purchased (0 = not bought)
    BEE_HP_META:      0,
    HIVE_HP_META:     0,
    HIVE_STORAGE_META: 0,
    START_WORKER:     0,   // 0 or 1
    START_ARMOR:      0,
    START_HONEY:      0,
    START_GUARD:      0,
  },
  highScore: 0,
  lastRun: null,           // { score, waves, timeSurvived, won } after first run
}
```

Missing or corrupted saves fall back to defaults silently.

---

## MetaSave (`src/systems/MetaSave.js`)

Pure-JS static class, no Phaser dependency.

```js
const KEY = 'bee-game-save';

export default class MetaSave {
  static load()                        // returns full save object (defaults if missing)
  static save(data)                    // writes full object to localStorage
  static addJelly(amount)              // load → add → save
  static purchaseUpgrade(key, cost)    // deduct jelly, increment level, save; returns false if can't afford
  static getUpgradeLevel(key)          // load → return upgrades[key] ?? 0
  static reset()                       // wipes to defaults
}
```

All mutations are load-mutate-save. No in-memory cache — always reads from localStorage so multiple tabs stay consistent (not a concern for a single-page game, but keeps the class simple).

---

## Meta Currency

**Name:** Royal Jelly

**Earned per run:** `Math.floor(score / 10)`

Current score formula: `honey × 10 + waves × 100`

Typical yields:
- Poor run (5 honey, 2 waves): ~70 jelly
- Average run (50 honey, 10 waves): ~150 jelly
- Strong winning run (100 honey, 20 waves): ~300 jelly

Jelly is added and saved in `GameOverScene` before the screen is shown.

---

## Upgrades

| Key | Type | Effect per level | Cost per level | Max levels |
|-----|------|-----------------|----------------|------------|
| `BEE_SPEED_META` | stat boost | +20 bee base speed | 50j | 3 |
| `BEE_HP_META` | stat boost | +2 bee base max HP | 75j | 3 |
| `HIVE_HP_META` | stat boost | +5 hive base max HP | 75j | 3 |
| `HIVE_STORAGE_META` | stat boost | +50 honey storage | 100j | 3 |
| `START_WORKER` | unlock | begin each run with 1 worker bee | 100j | 1 |
| `START_ARMOR` | unlock | begin with 1 bee armor | 150j | 1 |
| `START_HONEY` | unlock | begin with 30 honey | 80j | 1 |
| `START_GUARD` | unlock | begin with 1 guard post at hive | 200j | 1 |

Total jelly to max everything: 3×(50+75+75+100) + 100+150+80+200 = 900 + 530 = **1430 jelly** (~5–10 runs to fully unlock).

---

## GameScene Integration

At the top of `GameScene.create()`, after all entities are initialized:

```js
const save = MetaSave.load();
const u = save.upgrades;

// Stat boosts applied to entity objects (not constants)
if (u.BEE_SPEED_META)    this.player._speed   += u.BEE_SPEED_META * 20;
if (u.BEE_HP_META)       { this.player.maxHp  += u.BEE_HP_META * 2; this.player.hp = this.player.maxHp; }
if (u.HIVE_HP_META)      { this.hive.maxHp    += u.HIVE_HP_META * 5; this.hive.hp  = this.hive.maxHp; }
if (u.HIVE_STORAGE_META) this.resources.setHoneyStorage(HIVE.HONEY_STORAGE + u.HIVE_STORAGE_META * 50);

// Unlocks (all bypass honey cost — these are meta gifts)
if (u.START_WORKER) {
  const w = new WorkerBee(this, this.hiveX, this.hiveY);
  w.init(this.hive, this.flowers);
  this.workers.add(w);
}
if (u.START_ARMOR)  this.player.armor = 1;
if (u.START_HONEY)  { this.resources.addPendingSap(30); this.resources.convertSap(30); }
if (u.START_GUARD)  {
  const post = new GuardPost(this, this.hiveX + 80, this.hiveY);
  this._towerList.push(post);
}
```

`START_GUARD` constructs the post directly (bypasses `_placeTower` cost check — it's a meta gift).

---

## Screen Flow

```
MenuScene
  [ START ]    → PlacementScene → GameScene → GameOverScene → MenuScene
  [ UPGRADES ] → MetaUpgradeScene → MenuScene
```

No forced routing post-run. Player chooses when to spend jelly.

### GameOverScene changes

- Calls `MetaSave.addJelly(earned)` on init
- Updates `lastRun` and `highScore` in save
- Displays: result, score, **+X royal jelly**, last run stats, all-time high score
- Single `[ BACK TO MENU ]` button

### MetaUpgradeScene

- Header: `Royal Jelly: X`
- 8 upgrade rows: name, current level / max, cost, clickable button
- Button states: normal (can afford), dim (can't afford or maxed)
- `[ BACK TO MENU ]` at bottom
- All reads/writes go through `MetaSave`

### MenuScene changes

- Add `[ UPGRADES ]` button below `[ START ]`

---

## File Map

```
src/
  systems/
    MetaSave.js              CREATE
  scenes/
    GameOverScene.js         MODIFY — add jelly, stats, high score display
    MetaUpgradeScene.js      MODIFY — full upgrade UI (replaces stub)
    MenuScene.js             MODIFY — add Upgrades button
    GameScene.js             MODIFY — apply meta upgrades in create()
tests/
  MetaSave.test.js           CREATE — load/save/addJelly/purchaseUpgrade/reset
```

---

## Testing

`MetaSave.test.js` tests pure logic with a `localStorage` mock:

- `load()` returns defaults when key missing
- `load()` returns defaults when JSON is corrupt
- `addJelly(100)` persists balance
- `purchaseUpgrade(key, cost)` deducts jelly and increments level
- `purchaseUpgrade` returns false and makes no change when balance insufficient
- `reset()` restores defaults
