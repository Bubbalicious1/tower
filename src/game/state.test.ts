import { describe, expect, it } from 'vitest';
import { createMember } from './party';
import { depthOf, isTownUnlocked, migrate, newGame } from './state';

describe('save state', () => {
  it('migrates v1 saves, keeping levels and gold', () => {
    const m = createMember('Rocco', 'slugger');
    const { rank: _rank, ...v1Member } = { ...m, level: 4 };
    const v2 = migrate({ version: 1, party: [v1Member], gold: 55, items: { drink: 2 }, depth: 5, seed: 1, pos: null, defeated: [], opened: [], encounters: 0 });
    expect(v2?.version).toBe(2);
    expect(v2?.gold).toBe(55);
    expect(v2?.party[0].level).toBe(4);
    expect(v2?.party[0].rank).toBe(0);
    expect(v2?.town).toBe(0);
  });

  it('rejects unknown versions', () => {
    expect(migrate({ version: 99 })).toBeNull();
  });

  it('unlocks towns one base at a time and scales depth by town', () => {
    const s = newGame();
    expect(isTownUnlocked(s, 0)).toBe(true);
    expect(isTownUnlocked(s, 1)).toBe(false);
    s.basesFound = 1;
    expect(isTownUnlocked(s, 1)).toBe(true);
    expect(isTownUnlocked(s, 2)).toBe(false);
    s.town = 2;
    s.floor = 3;
    expect(depthOf(s)).toBe(9);
  });
});
