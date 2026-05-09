import { describe, it, expect } from 'vitest';
import { pickFlowerType } from '../src/constants.js';

describe('pickFlowerType', () => {
  it('roll 1 → COMMON',     () => expect(pickFlowerType(1)).toBe('COMMON'));
  it('roll 65 → COMMON',    () => expect(pickFlowerType(65)).toBe('COMMON'));
  it('roll 66 → RARE',      () => expect(pickFlowerType(66)).toBe('RARE'));
  it('roll 85 → RARE',      () => expect(pickFlowerType(85)).toBe('RARE'));
  it('roll 86 → AROMATIC',  () => expect(pickFlowerType(86)).toBe('AROMATIC'));
  it('roll 100 → AROMATIC', () => expect(pickFlowerType(100)).toBe('AROMATIC'));
});
