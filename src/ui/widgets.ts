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
  color?: string;
  rightColor?: string;
  /** Texture key of an 8x8 icon drawn before the label. */
  icon?: string;
}

export interface MenuOptions {
  width: number;
  rowH?: number;
  /** Rows visible at once; longer lists scroll. */
  maxRows?: number;
  startIndex?: number;
  onSelect: (index: number) => void;
  onCancel?: () => void;
  /** Called whenever the highlighted row changes (and once at start). */
  onMove?: (index: number) => void;
  /** Pin to the screen (for menus over a scrolling map) and draw at this depth. */
  fixedDepth?: number;
}

interface MenuRow {
  label: Phaser.GameObjects.Text;
  right: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Image;
  zone: Phaser.GameObjects.Zone;
}

/** A vertical, optionally scrolling menu driven by any input device; rows can also be tapped. */
export class Menu implements Widget {
  index = 0;
  private top = 0;
  private rows: MenuRow[] = [];
  private objects: (Phaser.GameObjects.Text | Phaser.GameObjects.Zone | Phaser.GameObjects.Image)[] = [];
  private cursor: Phaser.GameObjects.Image;
  private upArrow: Phaser.GameObjects.Text;
  private downArrow: Phaser.GameObjects.Text;
  private rowH: number;
  private visible: number;
  private hasIcons: boolean;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private items: MenuItem[],
    private opts: MenuOptions,
  ) {
    this.rowH = opts.rowH ?? 14;
    this.visible = Math.min(items.length, opts.maxRows ?? items.length);
    this.hasIcons = items.some((it) => it.icon);
    const labelX = x + 12 + (this.hasIcons ? 11 : 0);
    for (let r = 0; r < this.visible; r++) {
      const rowY = y + r * this.rowH;
      const row: MenuRow = {
        label: makeText(scene, labelX, rowY, ''),
        right: makeText(scene, x + opts.width - 4, rowY, '').setOrigin(1, 0),
        icon: scene.add.image(x + 12, rowY, 'cursor').setOrigin(0, 0),
        zone: scene.add.zone(x, rowY - 3, opts.width, this.rowH).setOrigin(0).setInteractive(),
      };
      row.zone.on('pointerdown', () => {
        this.index = this.top + r;
        this.refresh();
        this.select();
      });
      this.rows.push(row);
      this.objects.push(row.label, row.right, row.icon, row.zone);
    }
    this.cursor = scene.add.image(x + 1, 0, 'cursor').setOrigin(0, 0);
    this.upArrow = makeText(scene, x + opts.width - 4, y - 9, '^', YELLOW).setOrigin(1, 0);
    this.downArrow = makeText(scene, x + opts.width - 4, y + this.visible * this.rowH - 4, 'v', YELLOW).setOrigin(1, 0);
    this.objects.push(this.cursor, this.upArrow, this.downArrow);
    if (opts.fixedDepth !== undefined) {
      for (const o of this.objects) o.setScrollFactor(0).setDepth(opts.fixedDepth);
    }
    this.index = Math.min(opts.startIndex ?? 0, items.length - 1);
    this.refresh();
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
    this.refresh();
  }

  destroy(): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  private move(delta: number): void {
    const n = this.items.length;
    this.index = (this.index + delta + n) % n;
    this.refresh();
  }

  private refresh(): void {
    if (this.index < this.top) this.top = this.index;
    if (this.index >= this.top + this.visible) this.top = this.index - this.visible + 1;
    this.rows.forEach((row, r) => {
      const it = this.items[this.top + r];
      const color = it.enabled === false ? GRAY : (it.color ?? WHITE);
      row.label.setText(it.label).setColor(color);
      row.right.setText(it.right ?? '').setColor(it.enabled === false ? GRAY : (it.rightColor ?? color));
      row.icon.setVisible(!!it.icon);
      if (it.icon) row.icon.setTexture(it.icon);
    });
    this.cursor.setPosition(this.x + 1, this.y + (this.index - this.top) * this.rowH);
    this.upArrow.setVisible(this.top > 0);
    this.downArrow.setVisible(this.top + this.visible < this.items.length);
    this.opts.onMove?.(this.index);
  }

  private select(): void {
    if (this.items[this.index].enabled === false) return;
    controls.consume();
    this.opts.onSelect(this.index);
  }
}

/** A scene that routes input to one focused widget at a time. */
export interface WidgetHost {
  widget: Widget | null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Shows a menu inside a window and resolves with the chosen index (-1 if cancelled). */
export function askMenu(
  scene: Phaser.Scene,
  host: WidgetHost,
  frame: Rect,
  items: MenuItem[],
  cancellable = false,
  extra: Pick<MenuOptions, 'maxRows' | 'onMove' | 'startIndex'> = {},
): Promise<number> {
  return new Promise((resolve) => {
    const win = scene.add.graphics();
    drawWindow(win, frame.x, frame.y, frame.w, frame.h);
    const done = (i: number) => {
      menu.destroy();
      win.destroy();
      host.widget = null;
      resolve(i);
    };
    const menu = new Menu(scene, frame.x + 6, frame.y + 8, items, {
      width: frame.w - 12,
      rowH: 13,
      onSelect: done,
      onCancel: cancellable ? () => done(-1) : undefined,
      ...extra,
    });
    host.widget = menu;
  });
}

/** Shows text in a window until the player confirms or taps. */
export function showDialog(scene: Phaser.Scene, host: WidgetHost, frame: Rect, text: string): Promise<void> {
  return new Promise((resolve) => {
    const win = scene.add.graphics();
    drawWindow(win, frame.x, frame.y, frame.w, frame.h);
    const body = makeText(scene, frame.x + 8, frame.y + 8, text).setWordWrapWidth(frame.w - 24).setLineSpacing(5);
    const more = makeText(scene, frame.x + frame.w - 8, frame.y + frame.h - 12, 'v', YELLOW).setOrigin(1, 0);
    scene.tweens.add({ targets: more, alpha: 0, duration: 400, yoyo: true, repeat: -1 });
    let ready = false;
    scene.time.delayedCall(200, () => (ready = true));
    const done = () => {
      if (!ready) return;
      scene.input.off('pointerdown', done);
      win.destroy();
      body.destroy();
      more.destroy();
      host.widget = null;
      controls.consume();
      resolve();
    };
    host.widget = { update: (c) => c.justPressed('confirm') && done() };
    scene.input.on('pointerdown', done);
  });
}
