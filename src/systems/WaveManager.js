export default class WaveManager {
  constructor({ firstWaveDelay, waveInterval, baseCount, countIncrement }) {
    this._waveInterval = waveInterval;
    this._baseCount = baseCount;
    this._countIncrement = countIncrement;
    this._waveNumber = 0;
    this._nextWaveAt = firstWaveDelay;
  }

  // Pass total elapsed ms from Phaser's `time` argument. Returns wave spec or null.
  update(elapsed) {
    if (elapsed < this._nextWaveAt) return null;

    this._waveNumber++;
    this._nextWaveAt += this._waveInterval;

    const n = this._waveNumber;
    const total = this._baseCount + (n - 1) * this._countIncrement;
    const raiderCount = n >= 3 ? Math.floor(total * 0.4) : 0;
    const archerCount = n >= 4 ? Math.max(1, Math.floor(total * 0.2)) : 0;
    const hunterCount = Math.max(0, total - raiderCount - archerCount);

    return { number: n, hunterCount, raiderCount, archerCount };
  }

  getWaveNumber() { return this._waveNumber; }
}
