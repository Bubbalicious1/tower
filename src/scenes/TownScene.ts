import Phaser from 'phaser';
import { GEAR, RARITY_COLOR, SLOTS, type GearDef } from '../data/equipment';
import { CONSUMABLE_IDS, CONSUMABLES } from '../data/items';
import { SKILLS } from '../data/skills';
import { RANKS, TOWNS } from '../data/world';
import { BAG_SIZE, classCanUse, effectiveStats, gearOf, itemName, makeItem, sellPrice } from '../game/equipment';
import { promote, restore, winsToNextRank } from '../game/party';
import { enterDungeon, getState, saveGame } from '../game/state';
import { controls } from '../input/Controls';
import { askMenu, drawWindow, GRAY, makeText, showDialog, YELLOW, type Widget, type WidgetHost } from '../ui/widgets';

/**
 * A town hub, menu-driven so it plays well on a phone: the dungeon entrance,
 * inn, shop, the Old-Timer (rank promotions) and the world map.
 */
export class TownScene extends Phaser.Scene implements WidgetHost {
  widget: Widget | null = null;
  private message?: string;
  private panel!: Phaser.GameObjects.Graphics;
  private panelText: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('Town');
  }

  init(data: { message?: string }): void {
    this.message = data?.message;
  }

  create(): void {
    controls.touchMode = 'menu';
    this.widget = null;
    this.panelText = [];
    const s = getState();
    s.inDungeon = false;
    s.pos = null;
    saveGame();

    this.drawBackground();
    this.panel = this.add.graphics();
    this.refreshPanels();
    this.cameras.main.fadeIn(250);

    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.run().catch((err) => console.error(err));
  }

  update(): void {
    this.widget?.update(controls);
  }

  private get dialogFrame() {
    return { x: 4, y: 206, w: this.scale.width - 8, h: 60 };
  }

  private say(text: string): Promise<void> {
    return showDialog(this, this, this.dialogFrame, text);
  }

  private async run(): Promise<void> {
    if (this.message) await this.say(this.message);
    let last = 0;
    for (;;) {
      const s = getState();
      const town = TOWNS[s.town];
      const cleared = s.basesFound > s.town;
      const choice = await askMenu(this, this, { x: 4, y: 116, w: 204, h: 88 }, [
        { label: town.dungeon, right: cleared ? 'CLEAR' : '' },
        { label: 'Inn', right: `${town.innCost}G` },
        { label: 'Shop' },
        { label: 'Equipment' },
        { label: 'Old-Timer' },
        { label: 'World Map' },
      ], false, { startIndex: last });
      last = choice;
      if (choice === 0) {
        enterDungeon();
        this.leave('Dungeon');
        return;
      }
      if (choice === 1) await this.inn();
      else if (choice === 2) await this.shop();
      else if (choice === 3) await this.openEquipment();
      else if (choice === 4) await this.oldTimer();
      else {
        this.leave('WorldMap');
        return;
      }
    }
  }

  private leave(scene: string): void {
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(scene));
  }

  private async inn(): Promise<void> {
    const s = getState();
    const cost = TOWNS[s.town].innCost;
    if (s.gold < cost) {
      await this.say(`Innkeeper: A room is ${cost} G. Come back when you can afford it.`);
      return;
    }
    s.gold -= cost;
    s.party.forEach(restore);
    saveGame();
    this.refreshPanels();
    this.cameras.main.fadeOut(300);
    await new Promise((r) => this.time.delayedCall(500, r));
    this.cameras.main.fadeIn(300);
    await this.say('The team rests up. HP and MP fully restored!');
  }

  private async openEquipment(): Promise<void> {
    this.scene.launch('Equip', { from: 'Town' });
    this.scene.pause();
    await new Promise((r) => this.events.once('resume', r));
    this.refreshPanels();
  }

  private async shop(): Promise<void> {
    for (;;) {
      this.refreshPanels();
      const choice = await askMenu(
        this,
        this,
        { x: 4, y: 116, w: 204, h: 16 + 4 * 13 },
        [{ label: 'Buy gear' }, { label: 'Buy items' }, { label: 'Sell gear' }, { label: 'Leave' }],
        true,
      );
      if (choice === 0) await this.buyGear();
      else if (choice === 1) await this.buyItems();
      else if (choice === 2) await this.sellGear();
      else return;
    }
  }

  /** Who in the party could use a piece of gear, and how it compares to what they wear. */
  private gearInfo(def: GearDef): string {
    const s = getState();
    const parts = s.party
      .filter((m) => classCanUse(m, def))
      .map((m) => {
        const cur = m.equip[def.slot];
        const k = (Object.keys(def.stats) as (keyof typeof def.stats)[])[0];
        const delta = (def.stats[k] ?? 0) - (cur?.stats[k] ?? 0);
        return `${m.name} ${delta >= 0 ? '+' : ''}${delta}`;
      });
    const rank = def.minRank ? `  Needs ${RANKS[def.minRank].name}` : '';
    return `${parts.join('  ') || 'Nobody can use this.'}${rank}`;
  }

  private async buyGear(): Promise<void> {
    const s = getState();
    const tier = s.town + 1;
    const stock = Object.values(GEAR)
      .filter((g) => !g.legendary && (g.tier === tier || g.tier === tier - 1))
      .filter((g) => s.party.some((m) => classCanUse(m, g)))
      .sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot) || b.tier - a.tier);
    const info = makeText(this, 12, 214, '').setWordWrapWidth(this.scale.width - 24).setLineSpacing(4);
    const infoWin = this.add.graphics();
    drawWindow(infoWin, 4, 206, this.scale.width - 8, 60);
    info.setDepth(1);
    let index = 0;
    for (;;) {
      const choice = await askMenu(
        this,
        this,
        { x: 4, y: 116, w: this.scale.width - 8, h: 16 + 6 * 13 },
        stock.map((g) => ({
          label: g.name,
          icon: `icon-${g.icon}`,
          right: `${g.price}G`,
          enabled: s.gold >= g.price && s.bag.length < BAG_SIZE,
        })),
        true,
        { maxRows: 6, startIndex: index, onMove: (i) => info.setText(this.gearInfo(stock[i])) },
      );
      if (choice < 0) break;
      index = choice;
      const def = stock[choice];
      s.gold -= def.price;
      s.bag.push(makeItem(s, def.id));
      saveGame();
      this.refreshPanels();
    }
    info.destroy();
    infoWin.destroy();
  }

  private async buyItems(): Promise<void> {
    const s = getState();
    const stock = CONSUMABLE_IDS.filter((id) => CONSUMABLES[id].minTown <= s.town);
    let index = 0;
    for (;;) {
      const choice = await askMenu(
        this,
        this,
        { x: 4, y: 116, w: this.scale.width - 8, h: 16 + stock.length * 13 },
        stock.map((id) => ({
          label: `${CONSUMABLES[id].name} x${s.items[id]}`,
          right: `${CONSUMABLES[id].price}G`,
          enabled: s.gold >= CONSUMABLES[id].price,
        })),
        true,
        { startIndex: index },
      );
      if (choice < 0) return;
      index = choice;
      s.gold -= CONSUMABLES[stock[choice]].price;
      s.items[stock[choice]]++;
      saveGame();
      this.refreshPanels();
    }
  }

  private async sellGear(): Promise<void> {
    const s = getState();
    let index = 0;
    for (;;) {
      if (s.bag.length === 0) {
        await this.say('Shopkeeper: Your bag is empty. Equipped gear has to come off before I can buy it.');
        return;
      }
      const choice = await askMenu(
        this,
        this,
        { x: 4, y: 116, w: this.scale.width - 8, h: 16 + 6 * 13 },
        s.bag.map((it) => ({
          label: itemName(it),
          icon: `icon-${gearOf(it).icon}`,
          color: RARITY_COLOR[it.rarity],
          right: `${sellPrice(it)}G`,
        })),
        true,
        { maxRows: 6, startIndex: Math.min(index, s.bag.length - 1) },
      );
      if (choice < 0) return;
      index = choice;
      const item = s.bag[choice];
      if (item.rarity === 'legendary') {
        await this.say(`Sell ${itemName(item)}? It's one of a kind...`);
        const sure = await askMenu(this, this, { x: 4, y: 116, w: 204, h: 36 }, [{ label: 'Keep it' }, { label: 'Sell' }], true);
        if (sure !== 1) continue;
      }
      s.bag.splice(choice, 1);
      s.gold += sellPrice(item);
      saveGame();
      this.refreshPanels();
    }
  }

  /** The Old-Timer promotes the team once it has won enough games. */
  private async oldTimer(): Promise<void> {
    const s = getState();
    const rank = s.party[0].rank;
    const needed = winsToNextRank(rank, s.wins);
    if (needed === null) {
      await this.say("Old-Timer: Professionals now, huh? Nothing left for me to teach you. Go get those bases, and keep practicing!");
      return;
    }
    const next = RANKS[rank + 1];
    if (needed > 0) {
      await this.say(
        `Old-Timer: You're ${RANKS[rank].name} ball players. Keep practicing! Win ${needed} more game${needed === 1 ? '' : 's'} and come see me.`,
      );
      return;
    }
    await this.say(`Old-Timer: ${s.wins} wins! You've put in the work. Ready to move up to ${next.name}?`);
    const yes = await askMenu(this, this, { x: 4, y: 120, w: 204, h: 36 }, [{ label: 'Move up!' }, { label: 'Not yet' }], true);
    if (yes !== 0) {
      await this.say('Old-Timer: Suit yourself. Keep practicing!');
      return;
    }
    const learned = s.party.map((m) => `${m.name}: ${SKILLS[promote(m)].name}`);
    saveGame();
    this.refreshPanels();
    await this.say(`The team is now ${next.name}! All stats up. New skills: ${learned.join(', ')}.`);
    await this.say("Old-Timer: Don't let it go to your head. Keep practicing!");
  }

  private drawBackground(): void {
    const W = this.scale.width;
    const g = this.add.graphics();
    for (let y = 0; y < 116; y += 2) {
      const t = y / 116;
      g.fillStyle((Math.round(0x50 + 0x60 * t) << 16) | (Math.round(0x90 + 0x40 * t) << 8) | Math.round(0xe0 + 0x10 * t));
      g.fillRect(0, y, W, 2);
    }
    g.fillStyle(0x4a8a3a);
    g.fillRect(0, 96, W, 20);
    // A row of houses with a ballfield backstop at the end of the street.
    const colors = [0xc86048, 0xd8b050, 0x7090c0, 0xa070a0, 0x60a070];
    for (let i = 0, x = 16; x < W - 60; i++, x += 56) {
      const c = colors[i % colors.length];
      g.fillStyle(0xe8e0d0);
      g.fillRect(x, 74, 36, 24);
      g.fillStyle(c);
      g.fillTriangle(x - 4, 76, x + 18, 58, x + 40, 76);
      g.fillStyle(0x503828);
      g.fillRect(x + 14, 84, 8, 14);
      g.fillStyle(0x90c0e8);
      g.fillRect(x + 4, 80, 6, 6);
      g.fillRect(x + 26, 80, 6, 6);
    }
    g.fillStyle(0x606870);
    for (let i = 0; i < 5; i++) g.fillRect(W - 50 + i * 10, 62, 1, 36);
    for (let j = 0; j < 4; j++) g.fillRect(W - 50, 62 + j * 12, 41, 1);
  }

  private refreshPanels(): void {
    const s = getState();
    const W = this.scale.width;
    const g = this.panel;
    g.clear();
    this.panelText.forEach((t) => t.destroy());
    this.panelText = [];
    const text = (x: number, y: number, str: string, color?: string) => this.panelText.push(makeText(this, x, y, str, color));

    const name = TOWNS[s.town].name;
    drawWindow(g, 4, 4, name.length * 8 + 16, 20);
    text(12, 10, name, YELLOW);

    drawWindow(g, W - 124, 4, 120, 42);
    text(W - 116, 10, `${s.gold} G`, YELLOW);
    text(W - 116, 21, `Wins ${s.wins}`);
    text(W - 116, 32, RANKS[s.party[0].rank].name, GRAY);

    const x0 = 212;
    drawWindow(g, x0, 116, W - x0 - 4, 88);
    s.party.forEach((m, i) => {
      const y = 126 + i * 18;
      text(x0 + 8, y, m.name);
      text(x0 + 60, y, `Lv${m.level}`, GRAY);
      text(x0 + 100, y, `${m.hp}/${effectiveStats(m).maxHp}`);
    });
  }
}
