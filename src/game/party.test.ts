import { describe, expect, it } from 'vitest';
import { createMember, gainXp, promote, skillsFor, statsAt, winsToNextRank, xpToNext } from './party';

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

describe('ranks', () => {
  it('promotion raises stats, grants the new HP and unlocks a skill', () => {
    const m = createMember('Lefty', 'pitcher');
    const before = { ...m.stats };
    const skill = promote(m);
    expect(skill).toBe('curveball');
    expect(m.rank).toBe(1);
    expect(m.stats.mag).toBeGreaterThan(before.mag);
    expect(m.hp).toBe(m.stats.maxHp);
    expect(skillsFor(m)).toEqual(['fastball', 'curveball']);
  });

  it('levelling keeps the rank bonus', () => {
    const m = createMember('Rocco', 'slugger');
    promote(m);
    gainXp(m, xpToNext(1));
    expect(m.stats).toEqual(statsAt('slugger', 2, 1));
  });

  it('counts wins needed for the next rank', () => {
    expect(winsToNextRank(0, 3)).toBe(7);
    expect(winsToNextRank(0, 12)).toBe(0);
    expect(winsToNextRank(3, 999)).toBeNull();
  });

  it('never repeats a skill a class already has', () => {
    const m = createMember('Util', 'utility');
    promote(m);
    promote(m);
    promote(m);
    expect(new Set(skillsFor(m)).size).toBe(skillsFor(m).length);
  });
});
