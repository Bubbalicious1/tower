import { CLASSES, type ClassId, type Stats } from '../data/classes';
import type { SkillId } from '../data/skills';
import { RANKS } from '../data/world';

export interface Member {
  name: string;
  classId: ClassId;
  level: number;
  /** XP earned toward the next level. */
  xp: number;
  /** Index into RANKS; the whole team is promoted together. */
  rank: number;
  hp: number;
  mp: number;
  stats: Stats;
}

export function statsAt(classId: ClassId, level: number, rank = 0): Stats {
  const { base, growth } = CLASSES[classId];
  const n = level - 1;
  const k = 1 + RANKS[rank].bonus;
  const stat = (key: keyof Stats) => Math.round((base[key] + growth[key] * n) * k);
  return {
    maxHp: stat('maxHp'),
    maxMp: stat('maxMp'),
    atk: stat('atk'),
    def: stat('def'),
    mag: stat('mag'),
    spd: stat('spd'),
  };
}

export function createMember(name: string, classId: ClassId): Member {
  const stats = statsAt(classId, 1);
  return { name, classId, level: 1, xp: 0, rank: 0, hp: stats.maxHp, mp: stats.maxMp, stats };
}

export function xpToNext(level: number): number {
  return Math.floor(12 * level ** 1.5);
}

/** Recompute stats, granting any HP/MP the new maximums add. */
function applyStats(m: Member, next: Stats): void {
  m.hp += next.maxHp - m.stats.maxHp;
  m.mp += next.maxMp - m.stats.maxMp;
  m.stats = next;
}

/** Adds XP, levelling up as many times as it covers. Returns levels gained. */
export function gainXp(m: Member, amount: number): number {
  m.xp += amount;
  let gained = 0;
  while (m.xp >= xpToNext(m.level)) {
    m.xp -= xpToNext(m.level);
    m.level++;
    gained++;
    applyStats(m, statsAt(m.classId, m.level, m.rank));
  }
  return gained;
}

/** Old-Timer promotion to the next rank. Returns the skill it unlocks. */
export function promote(m: Member): SkillId {
  m.rank++;
  applyStats(m, statsAt(m.classId, m.level, m.rank));
  return CLASSES[m.classId].rankSkills[m.rank - 1];
}

export function skillsFor(m: Member): SkillId[] {
  const cls = CLASSES[m.classId];
  return [...new Set([...cls.skills, ...cls.rankSkills.slice(0, m.rank)])];
}

/** Wins still needed for the next promotion, or null at the top rank. */
export function winsToNextRank(rank: number, wins: number): number | null {
  const next = RANKS[rank + 1];
  return next ? Math.max(0, next.wins - wins) : null;
}

export function restore(m: Member): void {
  m.hp = m.stats.maxHp;
  m.mp = m.stats.maxMp;
}
