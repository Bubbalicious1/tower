import Phaser from 'phaser';
import { controls, type Action } from '../input/Controls';
import { makeText } from '../ui/widgets';

/**
 * On-screen D-pad and A/B buttons. Only shown while the player is using touch
 * in the field; menus and battles are tapped directly instead.
 */
export class TouchScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private aLabel!: Phaser.GameObjects.Text;
  private bLabel!: Phaser.GameObjects.Text;
  private menuLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('Touch');
  }

  create(): void {
    this.g = this.add.graphics();
    this.aLabel = makeText(this, 0, 0, 'A').setOrigin(0.5);
    this.bLabel = makeText(this, 0, 0, 'B').setOrigin(0.5);
    this.menuLabel = makeText(this, 0, 0, 'MENU').setOrigin(0.5);
    this.input.addPointer(2);
  }

  update(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const show = controls.device === 'touch' && controls.touchMode === 'field';
    this.g.clear();
    this.aLabel.setVisible(show);
    this.bLabel.setVisible(show);
    this.menuLabel.setVisible(show);
    if (!show) {
      controls.setTouch([]);
      return;
    }

    const pad = { x: 52, y: H - 52, r: 34 };
    const a = { x: W - 34, y: H - 60, r: 16 };
    const b = { x: W - 74, y: H - 32, r: 16 };
    const menu = { x: W / 2 - 24, y: H - 20, w: 48, h: 14 };

    const active = new Set<Action>();
    for (const p of this.input.manager.pointers) {
      if (!p.isDown) continue;
      const dx = p.x - pad.x;
      const dy = p.y - pad.y;
      const d = Math.hypot(dx, dy);
      // The D-pad's hit area is larger than its art so thumbs can slide off it.
      if (d < pad.r * 1.7 && d > 6) {
        active.add(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      } else if (Math.hypot(p.x - a.x, p.y - a.y) < a.r * 1.6) {
        active.add('confirm');
      } else if (Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.6) {
        active.add('cancel');
      } else if (p.x >= menu.x - 6 && p.x <= menu.x + menu.w + 6 && p.y >= menu.y - 8 && p.y <= menu.y + menu.h + 8) {
        active.add('menu');
      }
    }
    controls.setTouch(active);

    const g = this.g;
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(pad.x, pad.y, pad.r);
    const arm = 12;
    const len = 26;
    const arms: [Action, number, number, number, number][] = [
      ['up', pad.x - arm / 2, pad.y - len, arm, len - arm / 2],
      ['down', pad.x - arm / 2, pad.y + arm / 2, arm, len - arm / 2],
      ['left', pad.x - len, pad.y - arm / 2, len - arm / 2, arm],
      ['right', pad.x + arm / 2, pad.y - arm / 2, len - arm / 2, arm],
    ];
    for (const [action, x, y, w, h] of arms) {
      g.fillStyle(0xf0f0f8, active.has(action) ? 0.9 : 0.45);
      g.fillRect(x, y, w, h);
    }
    g.fillStyle(0xf0f0f8, 0.45);
    g.fillRect(pad.x - arm / 2, pad.y - arm / 2, arm, arm);

    for (const [btn, action, color] of [
      [a, 'confirm', 0xd03030],
      [b, 'cancel', 0xd0b020],
    ] as const) {
      g.fillStyle(color, active.has(action) ? 0.9 : 0.5);
      g.fillCircle(btn.x, btn.y, btn.r);
    }
    g.fillStyle(0x000000, active.has('menu') ? 0.7 : 0.4);
    g.fillRect(menu.x, menu.y, menu.w, menu.h);
    this.menuLabel.setPosition(menu.x + menu.w / 2 + 1, menu.y + menu.h / 2 + 1);
    this.aLabel.setPosition(a.x + 1, a.y + 1);
    this.bLabel.setPosition(b.x + 1, b.y + 1);
  }
}
