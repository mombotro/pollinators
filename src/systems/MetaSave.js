const KEY = 'bee-game-save';

function DEFAULTS() {
  return {
    jellyBalance: 0,
    upgrades: {
      BEE_SPEED_META:    0,
      BEE_HP_META:       0,
      HIVE_HP_META:      0,
      HIVE_STORAGE_META: 0,
      START_WORKER:      0,
      START_ARMOR:       0,
      START_HONEY:       0,
      START_GUARD:       0,
      START_SOLDIER:     0,
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

export default class MetaSave {
  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULTS();
      const parsed = JSON.parse(raw);
      const d = DEFAULTS();
      return {
        jellyBalance:  parsed.jellyBalance  ?? d.jellyBalance,
        highScore:     parsed.highScore     ?? d.highScore,
        lastRun:       parsed.lastRun       ?? d.lastRun,
        upgrades: { ...d.upgrades, ...(parsed.upgrades ?? {}) },
      };
    } catch {
      return DEFAULTS();
    }
  }

  static save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  static addJelly(amount) {
    const s = MetaSave.load();
    s.jellyBalance += amount;
    MetaSave.save(s);
  }

  static purchaseUpgrade(key, cost) {
    const s = MetaSave.load();
    if (s.jellyBalance < cost) return false;
    s.jellyBalance -= cost;
    s.upgrades[key] = (s.upgrades[key] ?? 0) + 1;
    MetaSave.save(s);
    return true;
  }

  static getUpgradeLevel(key) {
    return MetaSave.load().upgrades[key] ?? 0;
  }

  static reset() {
    MetaSave.save(DEFAULTS());
  }
}
