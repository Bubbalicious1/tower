import type { ClassId } from '../data/classes';
import { STARTER_WEAPON, type Item } from '../data/equipment';
import { CONSUMABLE_IDS, type ConsumableId } from '../data/items';
import { FLOORS_PER_DUNGEON, TOWNS } from '../data/world';
import type { Point } from '../dungeon/generate';
import { newSeed } from '../rng';
import { makeItem, type Inventory } from './equipment';
import { createMember, statsAt, type Member } from './party';

export interface SaveData extends Inventory {
  version: 3;
  party: Member[];
  gold: number;
  /** Consumable counts. */
  items: Record<ConsumableId, number>;
  /** Unequipped gear (capped at BAG_SIZE). */
  bag: Item[];
  nextItemId: number;
  /** Battles won in total; the Old-Timer promotes the team at set win counts. */
  wins: number;
  /** Bases recovered (0-4). Town N is unlocked once N bases have been found. */
  basesFound: number;
  /** Current (or last visited) town index. */
  town: number;
  inDungeon: boolean;
  /** Floor of the current town's dungeon (1-based). */
  floor: number;
  /** Seed of the current floor; regenerating from it rebuilds the same layout. */
  seed: number;
  pos: Point | null;
  /** Indices (into the floor's enemy/chest lists) already cleared this floor. */
  defeated: number[];
  opened: number[];
  /** Random encounters triggered on this floor (they are capped per floor). */
  encounters: number;
}

const SAVE_KEY = 'cosmic-baseball-save-v1';

// Placeholder starting party until the party-creation screen exists.
const DEFAULT_PARTY: [string, ClassId][] = [
  ['Rocco', 'slugger'],
  ['Zip', 'stealer'],
  ['Doc', 'trainer'],
  ['Lefty', 'pitcher'],
];

let current: SaveData | null = null;

export function getState(): SaveData {
  if (!current) current = newGame();
  return current;
}

function emptyItems(): Record<ConsumableId, number> {
  return Object.fromEntries(CONSUMABLE_IDS.map((id) => [id, 0])) as Record<ConsumableId, number>;
}

function giveStarterWeapons(s: SaveData): void {
  for (const m of s.party) if (!m.equip.weapon) m.equip.weapon = makeItem(s, STARTER_WEAPON[m.classId]);
}

export function newGame(): SaveData {
  current = {
    version: 3,
    party: DEFAULT_PARTY.map(([name, cls]) => createMember(name, cls)),
    gold: 0,
    items: { ...emptyItems(), drink: 3, salts: 1 },
    bag: [],
    nextItemId: 1,
    wins: 0,
    basesFound: 0,
    town: 0,
    inDungeon: false,
    floor: 1,
    seed: newSeed(),
    pos: null,
    defeated: [],
    opened: [],
    encounters: 0,
  };
  giveStarterWeapons(current);
  saveGame();
  return current;
}

/** Upgrade older saves in place so players never lose progress to a format change. */
export function migrate(data: { version: number } & Record<string, unknown>): SaveData | null {
  if (data.version === 3) return data as unknown as SaveData;
  if (data.version === 2) {
    const v2 = data as unknown as Omit<SaveData, 'version' | 'items' | 'bag' | 'nextItemId'> & { items: Record<string, number> };
    const s: SaveData = {
      ...v2,
      version: 3,
      items: { ...emptyItems(), ...v2.items },
      bag: [],
      nextItemId: 1,
      party: v2.party.map((m) => ({ ...m, equip: {} })),
    };
    giveStarterWeapons(s);
    return s;
  }
  if (data.version !== 1) return null;
  const v1 = data as unknown as Omit<SaveData, 'version' | 'wins' | 'basesFound' | 'town' | 'inDungeon' | 'floor'>;
  const party = v1.party.map((m) => ({ ...m, rank: 0, stats: statsAt(m.classId, m.level, 0) }));
  return migrate({
    ...v1,
    version: 2,
    party,
    wins: 0,
    basesFound: 0,
    town: 0,
    inDungeon: false,
    floor: 1,
    pos: null,
    defeated: [],
    opened: [],
    encounters: 0,
  });
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = migrate(JSON.parse(raw));
    if (data) current = data;
    return data;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(): void {
  if (!current) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be unavailable (private mode, quota); the game still runs.
  }
}

/** Overall difficulty: each town's dungeon continues where the last one ended. */
export function depthOf(s: SaveData): number {
  return s.town * FLOORS_PER_DUNGEON + s.floor;
}

export function isLastFloor(s: SaveData): boolean {
  return s.floor >= FLOORS_PER_DUNGEON;
}

export function isTownUnlocked(s: SaveData, town: number): boolean {
  return town <= s.basesFound && town < TOWNS.length;
}

function resetFloor(s: SaveData): void {
  s.seed = newSeed();
  s.pos = null;
  s.defeated = [];
  s.opened = [];
  s.encounters = 0;
}

export function enterDungeon(): void {
  const s = getState();
  s.inDungeon = true;
  s.floor = 1;
  resetFloor(s);
  saveGame();
}

export function descend(): void {
  const s = getState();
  s.floor++;
  resetFloor(s);
  saveGame();
}

export function leaveDungeon(): void {
  const s = getState();
  s.inDungeon = false;
  s.pos = null;
  saveGame();
}

/** Records the current town's base; returns true if it was newly found. */
export function claimBase(): boolean {
  const s = getState();
  const isNew = s.basesFound <= s.town;
  if (isNew) s.basesFound = s.town + 1;
  saveGame();
  return isNew;
}
