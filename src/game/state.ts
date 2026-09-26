import type { ClassId } from '../data/classes';
import type { Point } from '../dungeon/generate';
import { newSeed } from '../rng';
import { createMember, type Member } from './party';

export interface SaveData {
  version: 1;
  party: Member[];
  gold: number;
  items: { drink: number };
  /** Current dungeon floor (1-based). Progress persists between sessions. */
  depth: number;
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

export function newGame(): SaveData {
  current = {
    version: 1,
    party: DEFAULT_PARTY.map(([name, cls]) => createMember(name, cls)),
    gold: 0,
    items: { drink: 3 },
    depth: 1,
    seed: newSeed(),
    pos: null,
    defeated: [],
    opened: [],
    encounters: 0,
  };
  saveGame();
  return current;
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    current = data;
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

export function descend(): void {
  const s = getState();
  s.depth++;
  s.seed = newSeed();
  s.pos = null;
  s.defeated = [];
  s.opened = [];
  s.encounters = 0;
  saveGame();
}
