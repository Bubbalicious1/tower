import Phaser from 'phaser';
import { FONT } from '../config';
import { controls, type Controls } from '../input/Controls';

export const WHITE = '#f8f8f8';
export const GRAY = '#8088a0';
export const YELLOW = '#f8d848';
export const RED = '#f86060';
export const GREEN = '#70f070';

export function makeText(scene: Phaser.Scene, x: number, y: number, str: string, color = WHITE): Phaser.GameObjects.Text {
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: '8px', color });
}

/** Classic SNES Final Fantasy blue gradient window with a light border. */
export function drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  const top = { r: 0x30, g: 0x50, b: 0xb8 };
  const bottom = { r: 0x10, g: 0x18, b: 0x58 };
  for (let i = 0; i < h; i++) {
    const t = i / Math.max(1, h - 1);
    const r = Math.round(top.r + (bottom.r - top.r) * t);
    const gg = Math.round(top.g + (bottom.g - top.g) * t);
    const b = Math.round(top.b + (bottom.b - top.b) * t);
    g.fillStyle((r << 16) | (gg << 8) | b);
    g.fillRect(x, y + i, w, 1);
  }
  g.fillStyle(0xf0f0f8);
  g.fillRect(x, y, w, 1);
  g.fillRect(x, y + h - 1, w, 1);
  g.fillRect(x, y, 1, h);
  g.fillRect(x + w - 1, y, 1, h);
  g.fillStyle(0x7880a0);
  g.fillRect(x + 1, y + 1, w - 2, 1);
  g.fillRect(x + 1, y + h - 2, w - 2, 1);
  g.fillRect(x + 1, y + 1, 1, h - 2);
  g.fillRect(x + w - 2, y + 1, 1, h - 2);
}

/** Anything that reads input each frame while it has focus. */
export interface Widget {
  update(c: Controls): void;
}

export interface MenuItem {
  label: string;
  enabled?: boolean;
  /** Right-aligned detail, e.g. an MP cost or item count. */
  right?: string;
}

export interface MenuOptions {
  width: number;
  rowH?: number;
  onSelect: (index: number) => void;
  onCancel?: () => void;
}

/** A vertical menu driven by any input device, with rows that can also be tapped. */
export class Menu implements Widget {
  index = 0;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private cursor: Phaser.GameObjects.Image;
  private rowH: number;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private items: MenuItem[],
    private opts: MenuOptions,
  ) {
    this.rowH = opts.rowH ?? 14;
    items.forEach((it, i) => {
      const rowY = y + i * this.rowH;
      const color = it.enabled === false ? GRAY : WHITE;
      this.objects.push(makeText(scene, x + 12, rowY, it.label, color));
      if (it.right) this.objects.push(makeText(scene, x + opts.width - 4, rowY, it.right, color).setOrigin(1, 0));
      const zone = scene.add.zone(x, rowY - 3, opts.width, this.rowH).setOrigin(0).setInteractive();
      zone.on('pointerdown', () => {
        this.index = i;
        this.placeCursor();
        this.select();
      });
      this.objects.push(zone);
    });
    this.cursor = scene.add.image(x + 1, 0, 'cursor').setOrigin(0, 0);
    this.objects.push(this.cursor);
    this.placeCursor();
  }

  update(c: Controls): void {
    if (c.repeat('up')) this.move(-1);
    else if (c.repeat('down')) this.move(1);
    if (c.justPressed('confirm')) this.select();
    else if (c.justPressed('cancel') && this.opts.onCancel) {
      c.consume();
      this.opts.onCancel();
    }
  }

  setIndex(i: number): void {
    this.index = i;
    this.placeCursor();
  }

  destroy(): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  private move(delta: number): void {
    const n = this.items.length;
    this.index = (this.index + delta + n) % n;
    this.placeCursor();
  }

  private placeCursor(): void {
    this.cursor.setPosition(this.x + 1, this.y + this.index * this.rowH);
  }

  private select(): void {
    if (this.items[this.index].enabled === false) return;
    controls.consume();
    this.opts.onSelect(this.index);
  }
}
