import type { SkillId } from './skills';

export interface Stats {
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
}

export type ClassId = 'slugger' | 'stealer' | 'catcher' | 'trainer' | 'pitcher' | 'utility';

export interface ClassDef {
  id: ClassId;
  name: string;
  /** The FF1 class this one is modeled on. */
  archetype: string;
  /** Jersey color used by the placeholder sprite. */
  color: string;
  base: Stats;
  growth: Stats;
  skills: SkillId[];
}

export const CLASSES: Record<ClassId, ClassDef> = {
  slugger: {
    id: 'slugger',
    name: 'Slugger',
    archetype: 'Warrior',
    color: '#c83030',
    base: { maxHp: 38, maxMp: 4, atk: 9, def: 6, mag: 1, spd: 4 },
    growth: { maxHp: 7, maxMp: 1, atk: 3, def: 2, mag: 0, spd: 1 },
    skills: ['powerSwing'],
  },
  stealer: {
    id: 'stealer',
    name: 'Base Stealer',
    archetype: 'Thief',
    color: '#30a050',
    base: { maxHp: 28, maxMp: 6, atk: 7, def: 4, mag: 2, spd: 10 },
    growth: { maxHp: 5, maxMp: 1, atk: 2, def: 1, mag: 0, spd: 2 },
    skills: ['pickoff'],
  },
  catcher: {
    id: 'catcher',
    name: 'Catcher',
    archetype: 'Monk',
    color: '#d08020',
    base: { maxHp: 42, maxMp: 4, atk: 7, def: 8, mag: 1, spd: 3 },
    growth: { maxHp: 8, maxMp: 1, atk: 2, def: 3, mag: 0, spd: 1 },
    skills: ['mittSmash'],
  },
  trainer: {
    id: 'trainer',
    name: 'Trainer',
    archetype: 'White Mage',
    color: '#e8e8f0',
    base: { maxHp: 26, maxMp: 14, atk: 3, def: 3, mag: 8, spd: 5 },
    growth: { maxHp: 4, maxMp: 3, atk: 1, def: 1, mag: 2, spd: 1 },
    skills: ['icePack'],
  },
  pitcher: {
    id: 'pitcher',
    name: 'Pitcher',
    archetype: 'Black Mage',
    color: '#3050c0',
    base: { maxHp: 24, maxMp: 16, atk: 3, def: 3, mag: 10, spd: 6 },
    growth: { maxHp: 4, maxMp: 3, atk: 1, def: 1, mag: 3, spd: 1 },
    skills: ['fastball'],
  },
  utility: {
    id: 'utility',
    name: 'Utility',
    archetype: 'Red Mage',
    color: '#a040a0',
    base: { maxHp: 32, maxMp: 10, atk: 6, def: 5, mag: 6, spd: 6 },
    growth: { maxHp: 6, maxMp: 2, atk: 2, def: 1, mag: 1, spd: 1 },
    skills: ['changeup', 'icePack'],
  },
};
