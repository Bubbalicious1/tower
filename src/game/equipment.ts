import { CLASSES, type Stats } from '../data/classes';
import { GEAR, SLOTS, type GearDef, type Item, type Rarity, type Slot, type Special } from '../data/equipment';
import { pick, randInt, type Rng } from '../rng';
import type { Member } from './party';

export const BAG_SIZE = 30;
const STAT_KEYS: (keyof Stats)[] = ['maxHp', 'maxMp', 'atk', 'def', 'mag', 'spd'];

export interface Inventory {
  bag: Item[];
  nextItemId: number;
}

export const gearOf = (item: Item): GearDef => GEAR[item.def];

export function itemName(item: Item): string {
  const name = gearOf(item).name;
  return item.rarity === 'rare' ? `Fine ${name}` : name;
}

export function classCanUse(m: Member, def: GearDef): boolean {
  return def.classes === 'all' || def.classes.includes(m.classId);
}

export const canUse = (m: Member, item: Item): boolean => classCanUse(m, gearOf(item));

export function rankOk(m: Member, item: Item): boolean {
  return m.rank >= (gearOf(item).minRank ?? 0);
}

/** Level/rank stats plus everything equipped. */
export function effectiveStats(m: Member): Stats {
  const total = { ...m.stats };
  for (const item of Object.values(m.equip)) {
    if (!item) continue;
    for (const k of STAT_KEYS) total[k] += item.stats[k] ?? 0;
  }
  return total;
}

export function specialsOf(m: Member): Set<Special> {
  const set = new Set<Special>();
  for (const item of Object.values(m.equip)) {
    const sp = item && gearOf(item).special;
    if (sp) set.add(sp);
  }
  return set;
}

/** Keep current HP/MP within the (possibly lowered) maximums. */
export function clampVitals(m: Member): void {
  const eff = effectiveStats(m);
  m.hp = Math.min(m.hp, eff.maxHp);
  m.mp = Math.min(m.mp, eff.maxMp);
}

/** Equip an item from the bag, putting whatever was in that slot back in the bag. */
export function equipItem(inv: Inventory, m: Member, item: Item): void {
  const slot = gearOf(item).slot;
  inv.bag = inv.bag.filter((i) => i.uid !== item.uid);
  const old = m.equip[slot];
  if (old) inv.bag.push(old);
  m.equip[slot] = item;
  clampVitals(m);
}

/** Returns false (and changes nothing) if the bag is full. */
export function unequip(inv: Inventory, m: Member, slot: Slot): boolean {
  const old = m.equip[slot];
  if (!old) return true;
  if (inv.bag.length >= BAG_SIZE) return false;
  inv.bag.push(old);
  delete m.equip[slot];
  clampVitals(m);
  return true;
}

/** How much a member values an item, weighted toward the stats their class relies on. */
export function score(m: Member, item: Item): number {
  const base = CLASSES[m.classId].base;
  const hitter = base.atk >= base.mag;
  const balanced = Math.abs(base.atk - base.mag) <= 1;
  const w: Stats = {
    atk: hitter || balanced ? 3 : 0.3,
    mag: !hitter || balanced ? 3 : 0.3,
    def: 2,
    spd: 1.5,
    maxHp: 0.3,
    maxMp: hitter && !balanced ? 0.05 : 0.4,
  };
  let s = STAT_KEYS.reduce((t, k) => t + (item.stats[k] ?? 0) * w[k], 0);
  if (gearOf(item).special) s += 6;
  return s;
}

/** Equip the best usable item in every slot, from what's equipped plus the bag. */
export function optimize(inv: Inventory, m: Member): void {
  for (const slot of SLOTS) {
    const candidates = inv.bag.filter((i) => gearOf(i).slot === slot && canUse(m, i) && rankOk(m, i));
    const current = m.equip[slot];
    let best = current;
    for (const c of candidates) if (!best || score(m, c) > score(m, best)) best = c;
    if (best && best !== current) equipItem(inv, m, best);
  }
}

export function sellPrice(item: Item): number {
  const mult = item.rarity === 'rare' ? 2 : 1;
  return Math.floor((gearOf(item).price * mult) / 2);
}

export function makeItem(inv: Inventory, defId: string, rarity: Rarity = 'common', rng?: Rng): Item {
  const def = GEAR[defId];
  const stats: Partial<Stats> = { ...def.stats };
  if (rarity === 'rare' && rng) {
    // Rare rolls: every stat +30%, plus a random bonus stat.
    for (const k of STAT_KEYS) if (stats[k]) stats[k] = Math.ceil(stats[k]! * 1.3);
    const bonus = pick(rng, ['atk', 'def', 'mag', 'spd'] as const);
    stats[bonus] = (stats[bonus] ?? 0) + randInt(rng, 1, def.tier * 2);
  }
  return { uid: inv.nextItemId++, def: defId, rarity: def.legendary ? 'legendary' : rarity, stats };
}

/**
 * Loot from a chest (or boss). Deeper floors and later towns roll higher tiers
 * and better rarity; legendaries only turn up deep in a dungeon or from bosses.
 */
export function rollLoot(rng: Rng, inv: Inventory, town: number, floor: number, boss = false): Item {
  const legendaryChance = boss ? 0.3 : floor >= 3 ? 0.02 + town * 0.02 : 0;
  if (rng() < legendaryChance) {
    return makeItem(inv, pick(rng, Object.values(GEAR).filter((g) => g.legendary)).id);
  }
  let tier = Math.min(4, town + 1 + (floor >= 3 && rng() < 0.3 ? 1 : 0));
  if (floor === 1 && tier > 1 && rng() < 0.3) tier--;
  const rareChance = boss ? 1 : 0.08 + floor * 0.08 + town * 0.03;
  const def = pick(rng, Object.values(GEAR).filter((g) => g.tier === tier));
  return makeItem(inv, def.id, rng() < rareChance ? 'rare' : 'common', rng);
}

/** Stat changes from swapping `item` into its slot (null = removing what's there). */
export function previewStats(m: Member, slot: Slot, item: Item | null): Stats {
  const equip = { ...m.equip };
  if (item) equip[slot] = item;
  else delete equip[slot];
  return effectiveStats({ ...m, equip });
}
