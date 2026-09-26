import type { Stats } from './classes';
import type { SkillKind } from './skills';
import { randInt, pick, type Rng } from '../rng';

export interface EnemySkill {
  name: string;
  kind: Exclude<SkillKind, 'heal'>;
  power: number;
  /** Chance per turn to use this instead of a plain attack. */
  chance: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  stats: Stats;
  xp: number;
  gold: number;
  /** Shallowest dungeon floor this enemy appears on. */
  minDepth: number;
  skill?: EnemySkill;
  /** Bosses guard a town's base; they never appear in random groups. */
  boss?: boolean;
  /** Reuse another enemy's sprite (placeholder art), optionally tinted. */
  sprite?: string;
  tint?: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  rat: {
    id: 'rat',
    name: 'Rally Rat',
    stats: { maxHp: 16, maxMp: 0, atk: 6, def: 2, mag: 0, spd: 6 },
    xp: 5,
    gold: 4,
    minDepth: 1,
  },
  bat: {
    id: 'bat',
    name: 'Foul Bat',
    stats: { maxHp: 12, maxMp: 0, atk: 5, def: 1, mag: 0, spd: 11 },
    xp: 6,
    gold: 3,
    minDepth: 1,
  },
  scout: {
    id: 'scout',
    name: 'Corp Scout',
    stats: { maxHp: 26, maxMp: 0, atk: 8, def: 4, mag: 5, spd: 5 },
    xp: 10,
    gold: 12,
    minDepth: 2,
    skill: { name: 'Lowball Offer', kind: 'mag', power: 0.8, chance: 0.3 },
  },
  brute: {
    id: 'brute',
    name: 'Mascot Brute',
    stats: { maxHp: 48, maxMp: 0, atk: 12, def: 6, mag: 0, spd: 3 },
    xp: 22,
    gold: 20,
    minDepth: 3,
    skill: { name: 'Mascot Slam', kind: 'phys', power: 1.5, chance: 0.25 },
  },

  // Bosses. minDepth matches the dungeon's last floor, so they aren't scaled up.
  tarp: {
    id: 'tarp',
    name: 'Tarp Monster',
    stats: { maxHp: 130, maxMp: 0, atk: 11, def: 5, mag: 9, spd: 4 },
    xp: 60,
    gold: 60,
    minDepth: 3,
    skill: { name: 'Rain Delay', kind: 'mag', power: 1, chance: 0.3 },
    boss: true,
    sprite: 'brute',
    tint: 0x8090e0,
  },
  keeper: {
    id: 'keeper',
    name: 'Groundskeeper',
    stats: { maxHp: 240, maxMp: 0, atk: 17, def: 9, mag: 12, spd: 7 },
    xp: 150,
    gold: 140,
    minDepth: 6,
    skill: { name: 'Sprinkler', kind: 'mag', power: 1.2, chance: 0.35 },
    boss: true,
    sprite: 'scout',
    tint: 0x80e090,
  },
  ironMascot: {
    id: 'ironMascot',
    name: 'Iron Mascot',
    stats: { maxHp: 380, maxMp: 0, atk: 25, def: 15, mag: 0, spd: 6 },
    xp: 300,
    gold: 260,
    minDepth: 9,
    skill: { name: 'Mascot Slam', kind: 'phys', power: 1.6, chance: 0.3 },
    boss: true,
    sprite: 'brute',
    tint: 0xb0b0c0,
  },
  enforcer: {
    id: 'enforcer',
    name: 'Corp Enforcer',
    stats: { maxHp: 540, maxMp: 0, atk: 31, def: 19, mag: 24, spd: 10 },
    xp: 500,
    gold: 400,
    minDepth: 12,
    skill: { name: 'Hostile Takeover', kind: 'mag', power: 1.4, chance: 0.35 },
    boss: true,
    sprite: 'scout',
    tint: 0xf07070,
  },
};

export const spriteKey = (e: EnemyDef): string => `enemy-${e.sprite ?? e.id}`;

/** Enemies get ~12% tougher per floor below the one they first appear on. */
export function scaledStats(def: EnemyDef, depth: number): Stats {
  const k = 1 + 0.12 * Math.max(0, depth - def.minDepth);
  const s = def.stats;
  return {
    maxHp: Math.round(s.maxHp * k),
    maxMp: s.maxMp,
    atk: Math.round(s.atk * k),
    def: Math.round(s.def * k),
    mag: Math.round(s.mag * k),
    spd: s.spd,
  };
}

/** Roll an enemy group (list of enemy ids) appropriate for a floor. */
export function rollGroup(rng: Rng, depth: number): string[] {
  const pool = Object.values(ENEMIES).filter((e) => !e.boss && e.minDepth <= depth);
  const size = randInt(rng, 1, Math.min(4, 2 + Math.floor(depth / 2)));
  return Array.from({ length: size }, () => pick(rng, pool).id);
}
