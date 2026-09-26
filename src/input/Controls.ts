/**
 * Device-agnostic input. Keyboard, gamepad and the on-screen touch pad all
 * feed the same abstract actions, so game code never checks a specific device.
 */
export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'menu';
export type Device = 'keyboard' | 'gamepad' | 'touch';
/** 'field' shows the virtual D-pad; 'menu' hides it so menus can be tapped directly. */
export type TouchMode = 'field' | 'menu';

const KEY_MAP: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyZ: 'confirm',
  Enter: 'confirm',
  Space: 'confirm',
  KeyX: 'cancel',
  Escape: 'cancel',
  Backspace: 'cancel',
  KeyC: 'menu',
  Tab: 'menu',
};

const REPEAT_DELAY = 320;
const REPEAT_RATE = 110;
const AXIS_DEADZONE = 0.5;

// Standard Gamepad API button layout (Xbox naming).
const PAD = { A: 0, B: 1, Y: 3, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

export class Controls {
  device: Device;
  touchMode: TouchMode = 'menu';

  private keys = new Set<Action>();
  private touch = new Set<Action>();
  private pad = new Set<Action>();
  private down = new Set<Action>();
  private pressed = new Set<Action>();
  private repeated = new Set<Action>();
  private lastRepeat = new Map<Action, number>();
  private heldSince = new Map<Action, number>();

  constructor() {
    this.device = navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
    window.addEventListener('keydown', (e) => {
      const a = KEY_MAP[e.code];
      if (!a) return;
      e.preventDefault();
      this.keys.add(a);
      this.device = 'keyboard';
    });
    window.addEventListener('keyup', (e) => {
      const a = KEY_MAP[e.code];
      if (a) this.keys.delete(a);
    });
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('touchstart', () => (this.device = 'touch'), { passive: true });
  }

  setTouch(actions: Iterable<Action>): void {
    this.touch = new Set(actions);
  }

  /** Called once per frame before scenes update. */
  update(now = performance.now()): void {
    this.pollGamepads();
    const next = new Set<Action>([...this.keys, ...this.touch, ...this.pad]);
    this.pressed.clear();
    this.repeated.clear();
    for (const a of next) {
      if (!this.down.has(a)) {
        this.pressed.add(a);
        this.repeated.add(a);
        this.heldSince.set(a, now);
        this.lastRepeat.set(a, now);
      } else if (now - (this.heldSince.get(a) ?? now) >= REPEAT_DELAY && now - (this.lastRepeat.get(a) ?? now) >= REPEAT_RATE) {
        this.repeated.add(a);
        this.lastRepeat.set(a, now);
      }
    }
    this.down = next;
  }

  isDown(a: Action): boolean {
    return this.down.has(a);
  }

  justPressed(a: Action): boolean {
    return this.pressed.has(a);
  }

  /** True on press, then repeatedly while held — for menu navigation. */
  repeat(a: Action): boolean {
    return this.repeated.has(a);
  }

  /** Swallow this frame's presses so one press can't trigger two widgets. */
  consume(): void {
    this.pressed.clear();
    this.repeated.clear();
  }

  private pollGamepads(): void {
    this.pad.clear();
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = (i: number) => p.buttons[i]?.pressed ?? false;
      const ax = p.axes[0] ?? 0;
      const ay = p.axes[1] ?? 0;
      if (b(PAD.UP) || ay < -AXIS_DEADZONE) this.pad.add('up');
      if (b(PAD.DOWN) || ay > AXIS_DEADZONE) this.pad.add('down');
      if (b(PAD.LEFT) || ax < -AXIS_DEADZONE) this.pad.add('left');
      if (b(PAD.RIGHT) || ax > AXIS_DEADZONE) this.pad.add('right');
      if (b(PAD.A)) this.pad.add('confirm');
      if (b(PAD.B)) this.pad.add('cancel');
      if (b(PAD.START) || b(PAD.Y)) this.pad.add('menu');
    }
    if (this.pad.size > 0) this.device = 'gamepad';
  }
}

export const controls = new Controls();
