import Phaser from 'phaser';
import { TOWNS } from '../data/world';
import { getState, isTownUnlocked, saveGame } from '../game/state';
import { controls } from '../input/Controls';
import { mulberry32 } from '../rng';
import { askMenu, GRAY, makeText, YELLOW, type Widget, type WidgetHost } from '../ui/widgets';

const MAP_LEFT = 132;

/**
 * The state map. Unlocked towns can be fast-travelled to at any time; the rest
 * stay locked until the previous town's base is recovered.
 */
export class WorldMapScene extends Phaser.Scene implements WidgetHost {
  widget: Widget | null = null;

  constructor() {
    super('WorldMap');
  }

  create(): void {
    controls.touchMode = 'menu';
    this.widget = null;
    const s = getState();
    this.drawMap();
    this.cameras.main.fadeIn(250);

    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    makeText(this, 10, 8, 'WORLD MAP', YELLOW);
    makeText(this, 10, 20, `Bases ${s.basesFound}/${TOWNS.length}`, GRAY);
    this.run().catch((err) => console.error(err));
  }

  update(): void {
    this.widget?.update(controls);
  }

  private townPos(i: number): { x: number; y: number } {
    const W = this.scale.width;
    const H = this.scale.height;
    const t = TOWNS[i];
    return { x: Math.round(MAP_LEFT + 16 + t.mapX * (W - MAP_LEFT - 40)), y: Math.round(24 + t.mapY * (H - 64)) };
  }

  private async run(): Promise<void> {
    const s = getState();
    const items = TOWNS.map((t, i) => ({
      label: isTownUnlocked(s, i) ? t.name : '???',
      enabled: isTownUnlocked(s, i),
    }));
    const choice = await askMenu(this, this, { x: 4, y: 36, w: 124, h: 16 + items.length * 13 }, items, true);
    this.travel(choice < 0 ? s.town : choice);
  }

  private travel(town: number): void {
    const s = getState();
    s.town = town;
    saveGame();
    this.widget = null;
    this.cameras.main.fadeOut(250);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Town'));
  }

  private drawMap(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = getState();
    const g = this.add.graphics();
    g.fillStyle(0x203878);
    g.fillRect(0, 0, W, H);
    g.fillStyle(0x3c7a3c);
    g.fillRect(MAP_LEFT, 8, W - MAP_LEFT - 8, H - 16);
    const rnd = mulberry32(3);
    for (let i = 0; i < 60; i++) {
      g.fillStyle(rnd() < 0.5 ? 0x356e35 : 0x478a47);
      g.fillRect(MAP_LEFT + Math.floor(rnd() * (W - MAP_LEFT - 16)), 12 + Math.floor(rnd() * (H - 28)), 6, 4);
    }

    // Roads between consecutive towns.
    for (let i = 1; i < TOWNS.length; i++) {
      const a = this.townPos(i - 1);
      const b = this.townPos(i);
      g.lineStyle(3, isTownUnlocked(s, i) ? 0xd8c090 : 0x6a6a5a);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }

    TOWNS.forEach((t, i) => {
      const { x, y } = this.townPos(i);
      const open = isTownUnlocked(s, i);
      g.fillStyle(open ? 0xe8e0d0 : 0x707070);
      g.fillRect(x - 7, y - 4, 14, 10);
      g.fillStyle(open ? 0xc86048 : 0x505050);
      g.fillTriangle(x - 9, y - 3, x, y - 11, x + 9, y - 3);
      makeText(this, x, y + 10, open ? t.name : '???', open ? '#ffffff' : GRAY).setOrigin(0.5, 0);
      if (open) {
        const zone = this.add.zone(x - 14, y - 14, 28, 34).setOrigin(0).setInteractive();
        zone.on('pointerdown', () => this.travel(i));
      }
    });

    const here = this.townPos(s.town);
    const hero = this.add.image(here.x, here.y - 20, `hero-${s.party[0].classId}`);
    this.tweens.add({ targets: hero, y: here.y - 24, duration: 400, yoyo: true, repeat: -1 });
  }
}
