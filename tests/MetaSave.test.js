import { describe, it, expect, beforeEach } from 'vitest';
import MetaSave from '../src/systems/MetaSave.js';

// Minimal localStorage mock
const store = {};
const localStorageMock = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('MetaSave', () => {
  beforeEach(() => { delete store['bee-game-save']; });

  it('load() returns defaults when key missing', () => {
    const s = MetaSave.load();
    expect(s.jellyBalance).toBe(0);
    expect(s.highScore).toBe(0);
    expect(s.lastRun).toBeNull();
    expect(s.upgrades.BEE_SPEED_META).toBe(0);
    expect(s.upgrades.START_WORKER).toBe(0);
  });

  it('load() returns defaults when JSON is corrupt', () => {
    store['bee-game-save'] = '{bad json{{';
    const s = MetaSave.load();
    expect(s.jellyBalance).toBe(0);
  });

  it('addJelly persists balance', () => {
    MetaSave.addJelly(100);
    expect(MetaSave.load().jellyBalance).toBe(100);
    MetaSave.addJelly(50);
    expect(MetaSave.load().jellyBalance).toBe(150);
  });

  it('purchaseUpgrade deducts jelly and increments level', () => {
    MetaSave.addJelly(200);
    const ok = MetaSave.purchaseUpgrade('BEE_SPEED_META', 50);
    expect(ok).toBe(true);
    expect(MetaSave.load().jellyBalance).toBe(150);
    expect(MetaSave.load().upgrades.BEE_SPEED_META).toBe(1);
  });

  it('purchaseUpgrade returns false and makes no change when balance insufficient', () => {
    MetaSave.addJelly(30);
    const ok = MetaSave.purchaseUpgrade('BEE_SPEED_META', 50);
    expect(ok).toBe(false);
    expect(MetaSave.load().jellyBalance).toBe(30);
    expect(MetaSave.load().upgrades.BEE_SPEED_META).toBe(0);
  });

  it('getUpgradeLevel returns 0 for unpurchased', () => {
    expect(MetaSave.getUpgradeLevel('START_ARMOR')).toBe(0);
  });

  it('reset() restores defaults', () => {
    MetaSave.addJelly(500);
    MetaSave.purchaseUpgrade('BEE_SPEED_META', 50);
    MetaSave.reset();
    const s = MetaSave.load();
    expect(s.jellyBalance).toBe(0);
    expect(s.upgrades.BEE_SPEED_META).toBe(0);
  });

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
});
