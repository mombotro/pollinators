# Design: Hunter Wasp Melee-Only + Buildable Unlocks
Date: 2026-05-21

## Overview

Two independent changes:
1. Hunter wasps become true melee-kamikaze units — they crash into the player and die on contact.
2. Buildables (towers + recruit soldier) are locked by default and unlocked with royal jelly in a new tab in MetaUpgradeScene.

---

## Change 1: Hunter Wasp Melee-Only (Dies on Hit)

### Behavior

- Hunter wasps do NOT fire stingers (already true — no change to HunterWasp.js logic needed here).
- When a hunter overlaps the player, it performs its attack (steal sap OR deal damage, same as now) and then **destroys itself**.
- On destroy: drop XP or honey pickup (same as when killed by player damage).
- Remove the `lastHit` cooldown check for the player-hit case — it's irrelevant since the wasp dies.
- The `WASP.HIT_COOLDOWN` guard stays for non-player targets (workers, hive) where the hunter survives.

### Files Changed

- `src/scenes/GameScene.js` — player-wasp overlap handler (~line 327). After attack logic, call `wasp.destroy()` and `this._dropPickup(wasp.x, wasp.y, wasp.honeyCarried ? 'honey' : 'xp')`.

### Edge Cases

- Dash attack: player dashing through hunter still kills the hunter via `wasp.takeDamage(1)` path — no change needed.
- Hunter targeting workers/hive: unaffected. Only the player-overlap branch destroys on hit.

---

## Change 2: Buildable Unlocks via Royal Jelly

### Locked by Default

All build menu items except Recruit Worker require a one-time royal jelly unlock:

| Buildable        | Unlock Key              | Cost |
|------------------|-------------------------|------|
| Resin Trap       | `UNLOCK_RESIN_TRAP`     | 50j  |
| Guard Post       | `UNLOCK_GUARD_POST`     | 100j |
| Poison Honey     | `UNLOCK_POISON_HONEY`   | 150j |
| Nectar Fountain  | `UNLOCK_NECTAR_FOUNTAIN`| 150j |
| Recruit Soldier  | `UNLOCK_RECRUIT_SOLDIER`| 100j |

Recruit Worker is always available (no unlock required).

### MetaUpgradeScene — Two Tabs

Tab buttons added below the title:
- `[ UPGRADES ]` (current content)
- `[ BUILDABLES ]` (new)

Active tab button highlighted. Both row-sets created at scene `create()` time and toggled visible/invisible on tab switch. Scroll state is independent per tab. `_maxScroll`, `_scrollY`, `_rows` become per-tab (e.g. `_upgradeRows`, `_buildableRows`).

Refund All refunds both tabs. Reset Save clears both.

Gamepad nav: D-pad left/right switches tabs; up/down navigates within active tab.

### BuildMenu — Filter Locked Items

On `show()`, `BuildMenu` calls `MetaSave.load()` and checks each item's unlock key. Items with no unlock key (Recruit Worker) are always shown. Locked items are excluded from the rendered list entirely.

Since `_items` and `_buttons` are built in the constructor but visibility is dynamic, the simplest implementation is to rebuild the visible button list on each `show()` call, or hide/show buttons based on lock state. **Hide/show approach**: buttons for locked items get `setVisible(false)` and `disableInteractive()`; the `_bg` height adjusts to match visible item count.

### MetaSave — New Keys

`MetaSave.purchaseUpgrade` already handles arbitrary keys — no structural change needed. The unlock definitions are just new entries in the `BUILDABLE_UNLOCKS` array in MetaUpgradeScene. Default value for any unlock key in save data is `0` (locked); `1` = unlocked.

### Files Changed

- `src/scenes/MetaUpgradeScene.js` — add tab buttons, second row-set for buildable unlocks, tab-switch logic, update `_doRefund` to cover both arrays.
- `src/ui/BuildMenu.js` — on `show()`, filter `_items` by checking `MetaSave.load().upgrades[unlockKey]`. Each item in `_items` gets an optional `unlockKey` field.
- `src/systems/MetaSave.js` — verify `reset()` and `load()` defaults handle new keys correctly (likely no change needed).

---

## What Does NOT Change

- HunterWasp movement, flanking, retreat, honey-steal behavior: unchanged.
- Worker/hive collision with hunters: unchanged.
- Existing meta upgrades (stats, start bonuses): untouched.
- Build menu honey affordability checks: unchanged.
- Stinger Turret is not in the build menu currently — not affected.
