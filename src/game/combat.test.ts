import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { fleeChance, physDamage, resolveTarget, turnOrder, type Fighter } from './combat';

const fighter = (key: string, over: Partial<Fighter> = {}): Fighter => ({
  key,
  name: key,
  side: 'party',
  hp: 10,
  maxHp: 10,
  mp: 0,
  maxMp: 0,
  atk: 10,
  def: 5,
  mag: 5,
  spd: 5,
  defending: false,
  ...over,
});

describe('turnOrder', () => {
  it('skips the fallen and usually puts much faster fighters first', () => {
    const rng = mulberry32(1);
    const fast = fighter('fast', { spd: 20 });
    const slow = fighter('slow', { spd: 2 });
    const down = fighter('down', { hp: 0, spd: 99 });
    for (let i = 0; i < 50; i++) {
      expect(turnOrder([slow, down, fast], rng).map((f) => f.key)).toEqual(['fast', 'slow']);
    }
  });
});

describe('resolveTarget', () => {
  it('retargets to a living fighter when the chosen one is down', () => {
    const a = fighter('a', { hp: 0 });
    const b = fighter('b');
    expect(resolveTarget(a, [a, b])).toBe(b);
    expect(resolveTarget(b, [a, b])).toBe(b);
    expect(resolveTarget(a, [a])).toBeUndefined();
  });
});

describe('physDamage', () => {
  it('always deals at least 1 and defending halves damage', () => {
    const rng = mulberry32(2);
    const weak = fighter('weak', { atk: 1 });
    const tank = fighter('tank', { def: 99 });
    expect(physDamage(weak, tank, 1, rng).amount).toBe(1);

    let normal = 0;
    let guarded = 0;
    for (let i = 0; i < 500; i++) {
      normal += physDamage(fighter('a'), fighter('t'), 1, rng).amount;
      guarded += physDamage(fighter('a'), fighter('t', { defending: true }), 1, rng).amount;
    }
    expect(guarded / normal).toBeGreaterThan(0.4);
    expect(guarded / normal).toBeLessThan(0.6);
  });
});

describe('fleeChance', () => {
  it('is clamped and favors faster parties', () => {
    const fast = [fighter('p', { spd: 50 })];
    const slow = [fighter('e', { spd: 1 })];
    expect(fleeChance(fast, slow)).toBe(0.95);
    expect(fleeChance(slow, fast)).toBe(0.2);
  });
});
