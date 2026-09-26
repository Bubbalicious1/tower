import { CLASSES, type ClassId, type Stats } from '../data/classes';

export interface Member {
  name: string;
  classId: ClassId;
  level: number;
  /** XP earned toward the next level. */
  xp: number;
  hp: number;
  mp: number;
  stats: Stats;
}

export function statsAt(classId: ClassId, level: number): Stats {
  const { base, growth } = CLASSES[classId];
  const n = level - 1;
  return {
    maxHp: base.maxHp + growth.maxHp * n,
    maxMp: base.maxMp + growth.maxMp * n,
    atk: base.atk + growth.atk * n,
    def: base.def + growth.def * n,
    mag: base.mag + growth.mag * n,
    spd: base.spd + growth.spd * n,
  };
}

export function createMember(name: string, classId: ClassId): Member {
  const stats = statsAt(classId, 1);
  return { name, classId, level: 1, xp: 0, hp: stats.maxHp, mp: stats.maxMp, stats };
}

export function xpToNext(level: number): number {
  return Math.floor(12 * level ** 1.5);
}

/** Adds XP, levelling up as many times as it covers. Returns levels gained. */
export function gainXp(m: Member, amount: number): number {
  m.xp += amount;
  let gained = 0;
  while (m.xp >= xpToNext(m.level)) {
    m.xp -= xpToNext(m.level);
    m.level++;
    gained++;
    const next = statsAt(m.classId, m.level);
    // Level-ups also grant the HP/MP they add, like most JRPGs.
    m.hp += next.maxHp - m.stats.maxHp;
    m.mp += next.maxMp - m.stats.maxMp;
    m.stats = next;
  }
  return gained;
}

export function restore(m: Member): void {
  m.hp = m.stats.maxHp;
  m.mp = m.stats.maxMp;
}
