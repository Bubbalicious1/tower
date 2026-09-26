import { describe, expect, it } from 'vitest';
import { GEAR } from '../data/equipment';
import { mulberry32 } from '../rng';
import {
  BAG_SIZE,
  canUse,
  effectiveStats,
  equipItem,
  makeItem,
  optimize,
  rankOk,
  rollLoot,
  sellPrice,
  specialsOf,
  unequip,
  type Inventory,
} from './equipment';
import { createMember, promote } from './party';

const inv = (): Inventory => ({ bag: [], nextItemId: 1 });

describe('equipment', () => {
  it('adds equipped stats and swaps the old item back into the bag', () => {
    const i = inv();
    const m = createMember('Rocco', 'slugger');
    const wood = makeItem(i, 'bat1');
    const alu = makeItem(i, 'bat2');
    i.bag.push(wood, alu);
    equipItem(i, m, wood);
    expect(effectiveStats(m).atk).toBe(m.stats.atk + 3);
    equipItem(i, m, alu);
    expect(effectiveStats(m).atk).toBe(m.stats.atk + 7);
    expect(i.bag.map((x) => x.def)).toEqual(['bat1']);
  });

  it('restricts by class and rank', () => {
    const i = inv();
    const pitcher = createMember('Lefty', 'pitcher');
    const catcher = createMember('Moose', 'catcher');
    expect(canUse(pitcher, makeItem(i, 'bat1'))).toBe(false);
    expect(canUse(pitcher, makeItem(i, 'ball1'))).toBe(true);
    expect(canUse(pitcher, makeItem(i, 'mitt1'))).toBe(false);
    expect(canUse(catcher, makeItem(i, 'mitt1'))).toBe(true);
    const maple = makeItem(i, 'bat3');
    expect(rankOk(catcher, maple)).toBe(false);
    promote(catcher);
    expect(rankOk(catcher, maple)).toBe(true);
  });

  it('clamps HP when unequipping max-HP gear, and refuses when the bag is full', () => {
    const i = inv();
    const m = createMember('Moose', 'catcher');
    const mitt = makeItem(i, 'mitt2');
    i.bag.push(mitt);
    equipItem(i, m, mitt);
    m.hp = effectiveStats(m).maxHp;
    expect(unequip(i, m, 'glove')).toBe(true);
    expect(m.hp).toBe(m.stats.maxHp);

    equipItem(i, m, mitt);
    while (i.bag.length < BAG_SIZE) i.bag.push(makeItem(i, 'cap1'));
    expect(unequip(i, m, 'glove')).toBe(false);
    expect(m.equip.glove).toBe(mitt);
  });

  it('optimize picks the best usable, rank-allowed item per slot', () => {
    const i = inv();
    const m = createMember('Lefty', 'pitcher');
    i.bag.push(makeItem(i, 'bat4'), makeItem(i, 'ball1'), makeItem(i, 'ball2'), makeItem(i, 'ball4'), makeItem(i, 'cap2'));
    optimize(i, m);
    expect(m.equip.weapon?.def).toBe('ball2'); // ball4 needs Semi-Pro, bat4 is for hitters
    expect(m.equip.cap?.def).toBe('cap2');
  });

  it('legendaries carry specials; rares roll better stats and sell for more', () => {
    const i = inv();
    const m = createMember('Zip', 'stealer');
    const jackie = makeItem(i, 'jackie');
    i.bag.push(jackie);
    equipItem(i, m, jackie);
    expect(jackie.rarity).toBe('legendary');
    expect(specialsOf(m).has('firstStrike')).toBe(true);

    const rare = makeItem(i, 'bat2', 'rare', mulberry32(5));
    expect(rare.stats.atk!).toBeGreaterThanOrEqual(Math.ceil(7 * 1.3));
    expect(sellPrice(rare)).toBe(GEAR.bat2.price);
    expect(sellPrice(makeItem(i, 'bat2'))).toBe(GEAR.bat2.price / 2);
  });

  it('deeper loot is better on average', () => {
    const rng = mulberry32(9);
    const i = inv();
    const avgTier = (town: number, floor: number) => {
      let t = 0;
      for (let n = 0; n < 400; n++) t += GEAR[rollLoot(rng, i, town, floor).def].tier;
      return t / 400;
    };
    expect(avgTier(0, 3)).toBeGreaterThan(avgTier(0, 1));
    expect(avgTier(2, 2)).toBeGreaterThan(avgTier(0, 2));
    const bossDrops = Array.from({ length: 50 }, () => rollLoot(rng, i, 1, 3, true));
    expect(bossDrops.every((d) => d.rarity !== 'common')).toBe(true);
  });
});
