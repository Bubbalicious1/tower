import { describe, expect, it } from 'vitest';
import { createMember, gainXp, statsAt, xpToNext } from './party';

describe('party levelling', () => {
  it('levels up across multiple thresholds and grows stats', () => {
    const m = createMember('Rocco', 'slugger');
    const total = xpToNext(1) + xpToNext(2) + 3;
    expect(gainXp(m, total)).toBe(2);
    expect(m.level).toBe(3);
    expect(m.xp).toBe(3);
    expect(m.stats).toEqual(statsAt('slugger', 3));
    expect(m.hp).toBe(m.stats.maxHp);
  });
});
