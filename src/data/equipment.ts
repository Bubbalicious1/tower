import type { ClassId, Stats } from './classes';

export type Slot = 'weapon' | 'glove' | 'cleats' | 'cap';
export const SLOTS: Slot[] = ['weapon', 'glove', 'cleats', 'cap'];
export const SLOT_LABEL: Record<Slot, string> = { weapon: 'Bat/Ball', glove: 'Glove', cleats: 'Cleats', cap: 'Cap' };

export type Rarity = 'common' | 'rare' | 'legendary';
export const RARITY_COLOR: Record<Rarity, string> = { common: '#f8f8f8', rare: '#78b8ff', legendary: '#f8d848' };

export type Special = 'critUp' | 'mpRegen' | 'hpRegen' | 'firstStrike' | 'magicGuard' | 'goldBonus' | 'healUp';
export const SPECIAL_TEXT: Record<Special, string> = {
  critUp: 'Critical hits far more often',
  mpRegen: 'Regain 3 MP every round',
  hpRegen: 'Regain 5% HP every round',
  firstStrike: 'Always acts first',
  magicGuard: 'Halves magic damage taken',
  goldBonus: '+25% gold from battles',
  healUp: 'Heals 50% more',
};

export type Icon = 'bat' | 'ball' | 'kit' | 'glove' | 'mitt' | 'cleats' | 'cap';

export interface GearDef {
  id: string;
  name: string;
  slot: Slot;
  icon: Icon;
  /** 1-4 matches the town that sells it; 5 is legendary. */
  tier: number;
  classes: ClassId[] | 'all';
  stats: Partial<Stats>;
  price: number;
  /** Old-Timer rank required to equip (index into RANKS). */
  minRank?: number;
  special?: Special;
  /** Legendary items only: named after legends of the game. */
  legendary?: boolean;
}

const HITTERS: ClassId[] = ['slugger', 'stealer', 'catcher', 'utility'];
const THROWERS: ClassId[] = ['pitcher', 'utility'];

const defs: GearDef[] = [
  // Bats
  { id: 'bat1', name: 'Wood Bat', slot: 'weapon', icon: 'bat', tier: 1, classes: HITTERS, stats: { atk: 3 }, price: 40 },
  { id: 'bat2', name: 'Aluminum Bat', slot: 'weapon', icon: 'bat', tier: 2, classes: HITTERS, stats: { atk: 7 }, price: 130 },
  { id: 'bat3', name: 'Maple Bat', slot: 'weapon', icon: 'bat', tier: 3, classes: HITTERS, stats: { atk: 12 }, price: 320, minRank: 1 },
  { id: 'bat4', name: 'Titanium Bat', slot: 'weapon', icon: 'bat', tier: 4, classes: HITTERS, stats: { atk: 18 }, price: 750, minRank: 2 },
  // Balls
  { id: 'ball1', name: 'Scuffed Ball', slot: 'weapon', icon: 'ball', tier: 1, classes: THROWERS, stats: { mag: 3 }, price: 40 },
  { id: 'ball2', name: 'Leather Ball', slot: 'weapon', icon: 'ball', tier: 2, classes: THROWERS, stats: { mag: 7 }, price: 130 },
  { id: 'ball3', name: 'Seamed Ball', slot: 'weapon', icon: 'ball', tier: 3, classes: THROWERS, stats: { mag: 12 }, price: 320, minRank: 1 },
  { id: 'ball4', name: 'Meteor Ball', slot: 'weapon', icon: 'ball', tier: 4, classes: THROWERS, stats: { mag: 18 }, price: 750, minRank: 2 },
  // Trainer kits
  { id: 'kit1', name: 'First-Aid Kit', slot: 'weapon', icon: 'kit', tier: 1, classes: ['trainer'], stats: { mag: 3, maxMp: 2 }, price: 40 },
  { id: 'kit2', name: 'Med Bag', slot: 'weapon', icon: 'kit', tier: 2, classes: ['trainer'], stats: { mag: 6, maxMp: 5 }, price: 130 },
  { id: 'kit3', name: 'Pro Kit', slot: 'weapon', icon: 'kit', tier: 3, classes: ['trainer'], stats: { mag: 10, maxMp: 8 }, price: 320, minRank: 1 },
  { id: 'kit4', name: 'Miracle Kit', slot: 'weapon', icon: 'kit', tier: 4, classes: ['trainer'], stats: { mag: 15, maxMp: 12 }, price: 750, minRank: 2 },
  // Gloves
  { id: 'glove1', name: 'Cloth Glove', slot: 'glove', icon: 'glove', tier: 1, classes: 'all', stats: { def: 2 }, price: 30 },
  { id: 'glove2', name: 'Leather Glove', slot: 'glove', icon: 'glove', tier: 2, classes: 'all', stats: { def: 5 }, price: 110 },
  { id: 'glove3', name: 'Pro Glove', slot: 'glove', icon: 'glove', tier: 3, classes: 'all', stats: { def: 9 }, price: 280, minRank: 1 },
  { id: 'glove4', name: 'Diamond Glove', slot: 'glove', icon: 'glove', tier: 4, classes: 'all', stats: { def: 14 }, price: 700, minRank: 2 },
  // Catcher's mitts
  { id: 'mitt1', name: "Catcher's Mitt", slot: 'glove', icon: 'mitt', tier: 1, classes: ['catcher'], stats: { def: 4, maxHp: 10 }, price: 50 },
  { id: 'mitt2', name: 'Padded Mitt', slot: 'glove', icon: 'mitt', tier: 2, classes: ['catcher'], stats: { def: 8, maxHp: 20 }, price: 150 },
  { id: 'mitt3', name: 'Steel Mitt', slot: 'glove', icon: 'mitt', tier: 3, classes: ['catcher'], stats: { def: 13, maxHp: 35 }, price: 360, minRank: 1 },
  { id: 'mitt4', name: 'Fortress Mitt', slot: 'glove', icon: 'mitt', tier: 4, classes: ['catcher'], stats: { def: 19, maxHp: 55 }, price: 820, minRank: 2 },
  // Cleats
  { id: 'cleats1', name: 'Sneakers', slot: 'cleats', icon: 'cleats', tier: 1, classes: 'all', stats: { spd: 1 }, price: 30 },
  { id: 'cleats2', name: 'Rubber Cleats', slot: 'cleats', icon: 'cleats', tier: 2, classes: 'all', stats: { spd: 2, def: 1 }, price: 100 },
  { id: 'cleats3', name: 'Metal Spikes', slot: 'cleats', icon: 'cleats', tier: 3, classes: 'all', stats: { spd: 4, def: 1 }, price: 260, minRank: 1 },
  { id: 'cleats4', name: 'Rocket Cleats', slot: 'cleats', icon: 'cleats', tier: 4, classes: 'all', stats: { spd: 6, def: 2 }, price: 650, minRank: 2 },
  // Caps
  { id: 'cap1', name: 'Ball Cap', slot: 'cap', icon: 'cap', tier: 1, classes: 'all', stats: { def: 1, maxMp: 3 }, price: 30 },
  { id: 'cap2', name: 'Visor', slot: 'cap', icon: 'cap', tier: 2, classes: 'all', stats: { mag: 2, maxMp: 5 }, price: 100 },
  { id: 'cap3', name: 'Batting Helmet', slot: 'cap', icon: 'cap', tier: 3, classes: HITTERS, stats: { def: 4, maxHp: 15 }, price: 260, minRank: 1 },
  { id: 'cap3m', name: 'Rally Cap', slot: 'cap', icon: 'cap', tier: 3, classes: ['trainer', 'pitcher', 'utility'], stats: { mag: 4, maxMp: 8 }, price: 260, minRank: 1 },
  { id: 'cap4', name: 'Cosmic Cap', slot: 'cap', icon: 'cap', tier: 4, classes: 'all', stats: { def: 3, mag: 6, maxMp: 12 }, price: 650, minRank: 2 },

  // Legendaries, named after legends of the game. NOTE: real people's names —
  // fine for a hobby project, but they need licensing (or renaming) before selling.
  { id: 'babe', name: "Babe's Bat", slot: 'weapon', icon: 'bat', tier: 5, classes: ['slugger', 'utility'], stats: { atk: 26 }, price: 3000, minRank: 2, special: 'critUp', legendary: true },
  { id: 'satchel', name: "Satchel's Ball", slot: 'weapon', icon: 'ball', tier: 5, classes: THROWERS, stats: { mag: 26 }, price: 3000, minRank: 2, special: 'mpRegen', legendary: true },
  { id: 'clemente', name: "Clemente's Kit", slot: 'weapon', icon: 'kit', tier: 5, classes: ['trainer'], stats: { mag: 22, maxMp: 15 }, price: 3000, minRank: 2, special: 'healUp', legendary: true },
  { id: 'ironHorse', name: 'Iron Horse Glove', slot: 'glove', icon: 'glove', tier: 5, classes: 'all', stats: { def: 20, maxHp: 40 }, price: 3000, minRank: 2, special: 'hpRegen', legendary: true },
  { id: 'yogi', name: "Yogi's Mitt", slot: 'glove', icon: 'mitt', tier: 5, classes: ['catcher'], stats: { def: 24, maxHp: 70 }, price: 3000, minRank: 2, special: 'magicGuard', legendary: true },
  { id: 'jackie', name: "Jackie's Cleats", slot: 'cleats', icon: 'cleats', tier: 5, classes: 'all', stats: { spd: 9, atk: 3 }, price: 3000, minRank: 2, special: 'firstStrike', legendary: true },
  { id: 'sayHey', name: 'Say Hey Cap', slot: 'cap', icon: 'cap', tier: 5, classes: 'all', stats: { def: 4, mag: 7, maxMp: 14 }, price: 3000, minRank: 1, special: 'goldBonus', legendary: true },
];

export const GEAR: Record<string, GearDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

/** An owned piece of gear. Stats are rolled when it drops, so two of the same item can differ. */
export interface Item {
  uid: number;
  def: string;
  rarity: Rarity;
  stats: Partial<Stats>;
}

export const STARTER_WEAPON: Record<ClassId, string> = {
  slugger: 'bat1',
  stealer: 'bat1',
  catcher: 'bat1',
  trainer: 'kit1',
  pitcher: 'ball1',
  utility: 'bat1',
};
