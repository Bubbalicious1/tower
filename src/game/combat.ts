import type { Rng } from '../rng';

/** A participant in battle; party members and enemies share this shape. */
export interface Fighter {
  key: string;
  name: string;
  side: 'party' | 'enemy';
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  defending: boolean;
}

export const isAlive = (f: Fighter): boolean => f.hp > 0;

/**
 * Speed-based turn order for one round. Each fighter's speed gets up to 25%
 * random variance so faster characters usually, but not always, go first.
 */
export function turnOrder<T extends Fighter>(fighters: readonly T[], rng: Rng): T[] {
  return fighters
    .filter(isAlive)
    .map((f) => ({ f, roll: f.spd * (1 + rng() * 0.25) }))
    .sort((a, b) => b.roll - a.roll)
    .map((x) => x.f);
}

/**
 * Modernized FF1 targeting: if the chosen target died before this action
 * resolves, hit another living fighter on the same side instead of wasting
 * the turn. Returns undefined when that whole side is down.
 */
export function resolveTarget<T extends Fighter>(target: T, pool: readonly T[]): T | undefined {
  if (isAlive(target)) return target;
  return pool.find(isAlive);
}

export interface Hit {
  amount: number;
  crit: boolean;
}

const variance = (rng: Rng) => 0.9 + rng() * 0.2;

export function physDamage(a: Fighter, t: Fighter, power: number, rng: Rng): Hit {
  const crit = rng() < 1 / 16;
  let dmg = (a.atk * 2 * power - t.def) * variance(rng);
  if (crit) dmg *= 1.5;
  if (t.defending) dmg /= 2;
  return { amount: Math.max(1, Math.round(dmg)), crit };
}

export function magDamage(a: Fighter, t: Fighter, power: number, rng: Rng): Hit {
  let dmg = (a.mag * 2.5 * power + 4 - t.def * 0.5) * variance(rng);
  if (t.defending) dmg /= 2;
  return { amount: Math.max(1, Math.round(dmg)), crit: false };
}

export function healAmount(a: Fighter, power: number, rng: Rng): number {
  return Math.max(1, Math.round((a.mag * 2 * power + 8) * variance(rng)));
}

/** Chance to escape, based on the average speed of each side. */
export function fleeChance(party: readonly Fighter[], enemies: readonly Fighter[]): number {
  const avg = (fs: readonly Fighter[]) => {
    const alive = fs.filter(isAlive);
    return alive.reduce((s, f) => s + f.spd, 0) / Math.max(1, alive.length);
  };
  const p = 0.5 + (avg(party) - avg(enemies)) * 0.04;
  return Math.min(0.95, Math.max(0.2, p));
}

export function applyDamage(t: Fighter, amount: number): void {
  t.hp = Math.max(0, t.hp - amount);
}

export function applyHeal(t: Fighter, amount: number): number {
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + amount);
  return t.hp - before;
}
