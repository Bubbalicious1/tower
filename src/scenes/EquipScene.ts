import Phaser from 'phaser';
import { CLASSES, type Stats } from '../data/classes';
import { RARITY_COLOR, SLOT_LABEL, SLOTS, SPECIAL_TEXT, type Item, type Slot } from '../data/equipment';
import { RANKS } from '../data/world';
import {
  BAG_SIZE,
  canUse,
  effectiveStats,
  equipItem,
  gearOf,
  itemName,
  optimize,
  previewStats,
  rankOk,
  score,
  unequip,
} from '../game/equipment';
import type { Member } from '../game/party';
import { getState, saveGame } from '../game/state';
import { controls, type TouchMode } from '../input/Controls';
import { askMenu, drawWindow, GRAY, GREEN, makeText, RED, showDialog, YELLOW, type Widget, type WidgetHost } from '../ui/widgets';

const STAT_ROWS: [keyof Stats, string][] = [
  ['atk', 'ATK'],
  ['def', 'DEF'],
  ['mag', 'MAG'],
  ['spd', 'SPD'],
  ['maxHp', 'HP'],
  ['maxMp', 'MP'],
];

/** The main stat an item is judged by in lists ("ATK+4"). */
function mainStat(item: Item): keyof Stats {
  let best: keyof Stats = 'def';
  let bestVal = -1;
  for (const [k] of STAT_ROWS) {
    const v = item.stats[k] ?? 0;
    if (v > bestVal) {
      best = k;
      bestVal = v;
    }
  }
  return best;
}

export interface EquipSceneData {
  /** The scene that opened this one; it is paused and resumed around it. */
  from: string;
}

/**
 * Equipment screen, opened over a town or the dungeon. Pick a player, then a
 * slot, then an item — with live stat comparisons — or let Optimize choose.
 */
export class EquipScene extends Phaser.Scene implements WidgetHost {
  widget: Widget | null = null;
  private from = 'Town';
  private prevTouchMode: TouchMode = 'menu';
  private statsGfx!: Phaser.GameObjects.Graphics;
  private statsText: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Equip');
  }

  init(data: EquipSceneData): void {
    this.from = data.from;
  }

  create(): void {
    this.prevTouchMode = controls.touchMode;
    controls.touchMode = 'menu';
    this.widget = null;
    this.statsText = [];
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(0, 0, W, H, 0x000010, 0.88).setOrigin(0);
    this.statsGfx = this.add.graphics();
    this.run().catch((err) => console.error(err));
  }

  update(): void {
    this.widget?.update(controls);
  }

  private get W(): number {
    return this.scale.width;
  }

  private async run(): Promise<void> {
    const s = getState();
    let pick = 0;
    for (;;) {
      this.drawStats(s.party[pick]);
      const items = [
        ...s.party.map((m) => ({ label: m.name, right: CLASSES[m.classId].name.slice(0, 7) })),
        { label: 'Optimize all' },
        { label: 'Done' },
      ];
      const choice = await askMenu(this, this, { x: 4, y: 4, w: 140, h: 16 + items.length * 13 }, items, true, {
        startIndex: pick,
        onMove: (i) => i < s.party.length && this.drawStats(s.party[i]),
      });
      if (choice < 0 || choice === s.party.length + 1) break;
      if (choice === s.party.length) {
        s.party.forEach((m) => optimize(s, m));
        saveGame();
        await this.say('Everyone is wearing their best gear.');
        continue;
      }
      pick = choice;
      await this.memberScreen(s.party[choice]);
    }
    this.close();
  }

  private async memberScreen(m: Member): Promise<void> {
    const s = getState();
    let slotIndex = 0;
    for (;;) {
      this.drawStats(m);
      const rows = SLOTS.map((slot) => {
        const item = m.equip[slot];
        return {
          label: SLOT_LABEL[slot],
          right: item ? itemName(item) : '-',
          rightColor: item ? RARITY_COLOR[item.rarity] : GRAY,
        };
      });
      const choice = await askMenu(
        this,
        this,
        { x: 4, y: 110, w: this.W - 8, h: 16 + 5 * 13 },
        [...rows, { label: 'Optimize' }],
        true,
        { startIndex: slotIndex },
      );
      if (choice < 0) return;
      if (choice === SLOTS.length) {
        optimize(s, m);
        saveGame();
        continue;
      }
      slotIndex = choice;
      await this.pickItem(m, SLOTS[choice]);
    }
  }

  private async pickItem(m: Member, slot: Slot): Promise<void> {
    const s = getState();
    const candidates = s.bag
      .filter((i) => gearOf(i).slot === slot && canUse(m, i))
      .sort((a, b) => score(m, b) - score(m, a));
    const current = m.equip[slot];
    const items = [
      { label: '(Remove)', enabled: !!current },
      ...candidates.map((it) => {
        const ok = rankOk(m, it);
        const k = mainStat(it);
        const delta = (it.stats[k] ?? 0) - (current?.stats[k] ?? 0);
        const label = STAT_ROWS.find(([key]) => key === k)![1];
        return {
          label: itemName(it),
          icon: `icon-${gearOf(it).icon}`,
          color: RARITY_COLOR[it.rarity],
          enabled: ok,
          right: ok ? `${label}${delta >= 0 ? '+' : ''}${delta}` : RANKS[gearOf(it).minRank ?? 0].name,
          rightColor: delta > 0 ? GREEN : delta < 0 ? RED : undefined,
        };
      }),
    ];
    if (candidates.length === 0 && !current) {
      await this.say(`No ${SLOT_LABEL[slot].toLowerCase()} gear in the bag that ${m.name} can use.`);
      return;
    }
    const choice = await askMenu(this, this, { x: 4, y: 110, w: this.W - 8, h: 16 + 6 * 13 + 4 }, items, true, {
      maxRows: 6,
      startIndex: Math.max(0, items.findIndex((it, i) => i > 0 && it.enabled !== false)),
      onMove: (i) => this.drawStats(m, slot, i === 0 ? null : candidates[i - 1]),
    });
    if (choice < 0) return;
    if (choice === 0) {
      if (!unequip(s, m, slot)) await this.say(`The bag is full (${BAG_SIZE}). Sell something first.`);
    } else {
      equipItem(s, m, candidates[choice - 1]);
    }
    saveGame();
  }

  /** Stats panel; with a slot given, previews swapping `item` into it. */
  private drawStats(m: Member, slot?: Slot, item?: Item | null): void {
    const g = this.statsGfx;
    g.clear();
    this.statsText.forEach((t) => t.destroy());
    this.statsText = [];
    const text = (x: number, y: number, str: string, color?: string) => this.statsText.push(makeText(this, x, y, str, color));
    const x0 = 148;
    drawWindow(g, x0, 4, this.W - x0 - 4, 102);
    text(x0 + 8, 10, `${m.name}  ${CLASSES[m.classId].name}`, YELLOW);
    text(x0 + 8, 21, `${RANKS[m.rank].name}  Lv${m.level}`, GRAY);

    const now = effectiveStats(m);
    const next = slot !== undefined && item !== undefined ? previewStats(m, slot, item) : null;
    STAT_ROWS.forEach(([k, label], i) => {
      const x = x0 + 8 + (i % 2) * 112;
      const y = 36 + Math.floor(i / 2) * 12;
      text(x, y, `${label.padEnd(3)} ${String(now[k]).padStart(3)}`);
      if (next && next[k] !== now[k]) text(x + 64, y, `>${next[k]}`, next[k] > now[k] ? GREEN : RED);
    });
    const special = item ? gearOf(item).special : undefined;
    if (special) text(x0 + 8, 76, SPECIAL_TEXT[special], YELLOW);
    text(x0 + 8, 90, `Bag ${getState().bag.length}/${BAG_SIZE}`, GRAY);
  }

  private say(message: string): Promise<void> {
    return showDialog(this, this, { x: 4, y: 206, w: this.W - 8, h: 60 }, message);
  }

  private close(): void {
    controls.touchMode = this.prevTouchMode;
    this.scene.resume(this.from);
    this.scene.stop();
  }
}
