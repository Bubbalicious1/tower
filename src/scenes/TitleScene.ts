import Phaser from 'phaser';
import { getState, hasSave, loadGame, newGame } from '../game/state';
import { controls } from '../input/Controls';
import { mulberry32 } from '../rng';
import { drawWindow, GRAY, makeText, Menu, YELLOW, type Widget } from '../ui/widgets';

const STORY = [
  'Centuries ago, the ancient civilization of Cooperstown created the Cosmic Baseball -- an artifact that bends probability itself to guarantee victory.',
  'To prevent its misuse, it was split into four bases and sealed away.',
  'Now an evil corporate team owner is hunting down the bases to build an unstoppable team that will conquer all rivals.',
  "In a small town, a band of outcast semi-pros finds one of the bases hidden in their field's equipment closet... left there by their old manager, the Riddler.",
  'Race across the state. Rebuild the Cosmic Baseball. Take down the corporate All-Stars.\n\nPlay ball!',
];

export class TitleScene extends Phaser.Scene {
  private widget: Widget | null = null;

  constructor() {
    super('Title');
  }

  create(): void {
    controls.touchMode = 'menu';
    this.widget = null;
    const W = this.scale.width;
    const H = this.scale.height;
    const g = this.add.graphics();

    const rnd = mulberry32(7);
    for (let i = 0; i < 90; i++) {
      g.fillStyle(0xffffff, 0.2 + rnd() * 0.8);
      g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
    }

    // The Cosmic Baseball.
    const bx = W / 2;
    const by = 72;
    g.fillStyle(0x6070f0, 0.15);
    g.fillCircle(bx, by, 46);
    g.fillStyle(0x6070f0, 0.2);
    g.fillCircle(bx, by, 40);
    g.fillStyle(0xf8f8f8);
    g.fillCircle(bx, by, 32);
    g.fillStyle(0xd03030);
    for (let t = -0.85; t <= 0.86; t += 0.17) {
      const y = Math.round(by + t * 28);
      const bulge = Math.round(9 * (1 - t * t));
      g.fillRect(Math.round(bx - 22 + bulge), y, 3, 1);
      g.fillRect(Math.round(bx + 19 - bulge), y, 3, 1);
    }

    makeText(this, W / 2, 124, 'COSMIC BASEBALL', YELLOW).setOrigin(0.5, 0).setScale(2);
    makeText(this, W / 2, 146, '(working title)', GRAY).setOrigin(0.5, 0);

    const win = this.add.graphics();
    drawWindow(win, W / 2 - 64, 168, 128, 40);
    const menu = new Menu(this, W / 2 - 52, 176, [{ label: 'New Game' }, { label: 'Continue', enabled: hasSave() }], {
      width: 112,
      onSelect: (i) => {
        menu.destroy();
        win.destroy();
        this.widget = null;
        if (i === 0) void this.startNewGame();
        else {
          loadGame();
          this.scene.start(getState().inDungeon ? 'Dungeon' : 'Town');
        }
      },
    });
    if (hasSave()) menu.setIndex(1);
    this.widget = menu;

    const hint = controls.device === 'touch' ? 'Tap to choose' : 'Arrows/WASD + Z  or  gamepad';
    makeText(this, W / 2, H - 20, hint, GRAY).setOrigin(0.5, 0);

    const onResize = () => this.scene.restart();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  update(): void {
    this.widget?.update(controls);
  }

  private async startNewGame(): Promise<void> {
    newGame();
    const W = this.scale.width;
    const win = this.add.graphics();
    drawWindow(win, 16, 60, W - 32, 120);
    const text = makeText(this, 28, 72, '').setWordWrapWidth(W - 56).setLineSpacing(8);
    const more = makeText(this, W - 32, 166, 'v', YELLOW).setOrigin(1, 0);
    this.tweens.add({ targets: more, alpha: 0, duration: 400, yoyo: true, repeat: -1 });
    for (const page of STORY) {
      text.setText(page);
      await this.waitAdvance();
    }
    this.scene.start('Town', {
      message:
        "Old-Timer: So the Riddler left you something in the equipment closet, eh? He always said that closet went deeper than it looked...",
    });
  }

  /** Resolves on confirm or a tap, ignoring input for a moment so one press can't skip two pages. */
  private waitAdvance(): Promise<void> {
    return new Promise((resolve) => {
      let ready = false;
      this.time.delayedCall(200, () => (ready = true));
      const done = () => {
        if (!ready) return;
        this.widget = null;
        this.input.off('pointerdown', done);
        controls.consume();
        resolve();
      };
      this.widget = { update: (c) => c.justPressed('confirm') && done() };
      this.input.on('pointerdown', done);
    });
  }
}
