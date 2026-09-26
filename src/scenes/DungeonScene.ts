import Phaser from 'phaser';
import { TileGfx } from '../art';
import { TILE } from '../config';
import { ENEMIES, rollGroup, spriteKey } from '../data/enemies';
import { TOWNS } from '../data/world';
import { generateFloor, Tile, type Floor, type Point } from '../dungeon/generate';
import { restore } from '../game/party';
import { claimBase, depthOf, descend, getState, isLastFloor, leaveDungeon, saveGame } from '../game/state';
import { controls } from '../input/Controls';
import { mulberry32, newSeed, pick, randInt, type Rng } from '../rng';
import { drawWindow, makeText, Menu, YELLOW, type Widget } from '../ui/widgets';
import type { BattleResult, BattleStart } from './BattleScene';

type Dir = 'up' | 'down' | 'left' | 'right';
const DIRS: Record<Dir, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const ALL_DIRS = Object.keys(DIRS) as Dir[];

/** Random encounters only happen in dark corridors, and at most this many per floor. */
const MAX_RANDOM_ENCOUNTERS = 2;
const CHASE_RANGE = 6;
const STUN_MS = 3000;

interface FieldEnemy {
  idx: number;
  x: number;
  y: number;
  facing: Dir;
  moving: boolean;
  stunnedUntil: number;
  group: string[];
  sprite: Phaser.GameObjects.Image;
}

interface Chest {
  idx: number;
  x: number;
  y: number;
  opened: boolean;
  sprite: Phaser.GameObjects.Image;
}

const px = (tx: number) => tx * TILE + TILE / 2;

export class DungeonScene extends Phaser.Scene {
  private floor!: Floor;
  private rng!: Rng;
  private player!: Phaser.GameObjects.Image;
  private tx = 0;
  private ty = 0;
  private facing: Dir = 'down';
  private moving = false;
  /** True while a battle, floor change or other transition owns the screen. */
  private busy = false;
  private enemies: FieldEnemy[] = [];
  private chests: Chest[] = [];
  private encounterSteps = 0;
  private encounterAt = 0;
  private stepsSinceSave = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private hudText: Phaser.GameObjects.Text[] = [];
  /** Stairs on normal floors; the boss stands there on a dungeon's last floor. */
  private hasStairs = true;
  private boss: { x: number; y: number; sprite: Phaser.GameObjects.Image } | null = null;
  private widget: Widget | null = null;

  constructor() {
    super('Dungeon');
  }

  create(): void {
    const s = getState();
    controls.touchMode = 'field';
    this.busy = false;
    this.moving = false;
    this.enemies = [];
    this.chests = [];
    this.hudText = [];
    this.widget = null;
    this.boss = null;
    this.hasStairs = !isLastFloor(s);
    this.stepsSinceSave = 0;
    this.rng = mulberry32(newSeed());
    this.encounterSteps = 0;
    this.encounterAt = randInt(this.rng, 16, 30);
    const depth = depthOf(s);
    this.floor = generateFloor(s.seed, depth);
    this.buildMap();

    const town = TOWNS[s.town];
    const bossWaiting = !this.hasStairs && s.basesFound <= s.town;
    if (bossWaiting) {
      const boss = ENEMIES[town.boss];
      const { x, y } = this.floor.stairs;
      const sprite = this.add.image(px(x), px(y), spriteKey(boss)).setScale(1.5).setDepth(6);
      if (boss.tint !== undefined) sprite.setTint(boss.tint);
      this.tweens.add({ targets: sprite, scale: 1.7, duration: 600, yoyo: true, repeat: -1 });
      this.boss = { x, y, sprite };
    }

    this.floor.chests.forEach((p, idx) => {
      const opened = s.opened.includes(idx);
      const sprite = this.add.image(px(p.x), px(p.y), opened ? 'chest-open' : 'chest').setDepth(4);
      this.chests.push({ idx, x: p.x, y: p.y, opened, sprite });
    });
    this.floor.enemies.forEach((p, idx) => {
      if (s.defeated.includes(idx)) return;
      const group = rollGroup(this.rng, depth);
      const sprite = this.add.image(px(p.x), px(p.y), `enemy-${group[0]}`).setDepth(5);
      this.enemies.push({ idx, x: p.x, y: p.y, facing: pick(this.rng, ALL_DIRS), moving: false, stunnedUntil: 0, group, sprite });
    });

    const pos = s.pos && this.walkable(s.pos.x, s.pos.y) ? s.pos : this.floor.start;
    this.tx = pos.x;
    this.ty = pos.y;
    this.player = this.add.image(px(this.tx), px(this.ty), `hero-${s.party[0].classId}`).setDepth(10);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.floor.width * TILE, this.floor.height * TILE);
    cam.startFollow(this.player, true);
    cam.fadeIn(300);

    this.hud = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.refreshHud();
    this.toast(bossWaiting ? 'Something big is waiting...' : `${town.dungeon} ${s.floor}F`);

    this.time.addEvent({ delay: 400, loop: true, callback: () => this.enemyTick() });

    const onHide = () => document.visibilityState === 'hidden' && this.persist();
    document.addEventListener('visibilitychange', onHide);
    this.events.on('wake', this.onWake, this);
    this.scale.on('resize', this.refreshHud, this);
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', onHide);
      this.events.off('wake', this.onWake, this);
      this.scale.off('resize', this.refreshHud, this);
    });
    this.persist();
  }

  update(): void {
    if (this.widget) {
      this.widget.update(controls);
      return;
    }
    if (this.busy || this.moving) return;
    if (controls.justPressed('menu')) {
      this.openMenu();
      return;
    }
    const dir = ALL_DIRS.find((d) => controls.isDown(d));
    if (dir) this.tryMove(dir);
  }

  private buildMap(): void {
    const { width: w, height: h, tiles, stairs } = this.floor;
    const data: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const t = tiles[y * w + x];
        if (t === Tile.Floor) row.push(TileGfx.Floor);
        else if (t === Tile.Corridor) row.push(TileGfx.Corridor);
        else {
          // Walls with open ground below show their brick face; the rest is darkness.
          const below = y + 1 < h ? tiles[(y + 1) * w + x] : Tile.Wall;
          row.push(below === Tile.Wall ? TileGfx.Void : TileGfx.WallFace);
        }
      }
      data.push(row);
    }
    if (this.hasStairs) data[stairs.y][stairs.x] = TileGfx.Stairs;
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    if (!tileset) throw new Error('Tileset failed to load');
    map.createLayer(0, tileset, 0, 0);
  }

  private tileAt(x: number, y: number): number {
    const { width: w, height: h, tiles } = this.floor;
    if (x < 0 || y < 0 || x >= w || y >= h) return Tile.Wall;
    return tiles[y * w + x];
  }

  private walkable(x: number, y: number): boolean {
    return this.tileAt(x, y) !== Tile.Wall;
  }

  private enemyAt(x: number, y: number): FieldEnemy | undefined {
    return this.enemies.find((e) => e.x === x && e.y === y);
  }

  private chestAt(x: number, y: number): Chest | undefined {
    return this.chests.find((c) => c.x === x && c.y === y);
  }

  private tryMove(dir: Dir): void {
    this.facing = dir;
    if (dir === 'left' || dir === 'right') this.player.setFlipX(dir === 'left');
    const nx = this.tx + DIRS[dir].x;
    const ny = this.ty + DIRS[dir].y;

    if (this.boss && this.boss.x === nx && this.boss.y === ny) {
      this.startBattle(null, 'normal', true);
      return;
    }
    const enemy = this.enemyAt(nx, ny);
    if (enemy) {
      // Walking into an enemy's back earns the party a free round.
      this.startBattle(enemy, enemy.facing === dir ? 'party' : 'normal');
      return;
    }
    const chest = this.chestAt(nx, ny);
    if (chest) {
      if (!chest.opened) this.openChest(chest);
      return;
    }
    if (!this.walkable(nx, ny)) return;

    this.tx = nx;
    this.ty = ny;
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: px(nx),
      y: px(ny),
      duration: 130,
      onComplete: () => {
        this.moving = false;
        this.onStep();
      },
    });
  }

  private onStep(): void {
    const s = getState();
    const { stairs } = this.floor;
    if (this.hasStairs && this.tx === stairs.x && this.ty === stairs.y) {
      this.goDownstairs();
      return;
    }
    if (this.tileAt(this.tx, this.ty) === Tile.Corridor && s.encounters < MAX_RANDOM_ENCOUNTERS) {
      if (++this.encounterSteps >= this.encounterAt) {
        s.encounters++;
        this.encounterSteps = 0;
        this.encounterAt = randInt(this.rng, 16, 30);
        this.startBattle(null, 'normal');
        return;
      }
    }
    if (++this.stepsSinceSave >= 20) this.persist();
  }

  private enemyTick(): void {
    if (this.busy) return;
    const now = this.time.now;
    const { stairs } = this.floor;
    for (const e of this.enemies) {
      const stunned = now < e.stunnedUntil;
      e.sprite.setAlpha(stunned ? 0.5 : 1);
      if (e.moving || stunned) continue;

      const dx = this.tx - e.x;
      const dy = this.ty - e.y;
      let options: Dir[];
      if (Math.abs(dx) + Math.abs(dy) <= CHASE_RANGE && this.rng() < 0.8) {
        const h: Dir = dx > 0 ? 'right' : 'left';
        const v: Dir = dy > 0 ? 'down' : 'up';
        options = (Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h]).filter((d) =>
          d === h ? dx !== 0 : dy !== 0,
        );
      } else if (this.rng() < 0.5) {
        options = [pick(this.rng, ALL_DIRS)];
      } else continue;

      for (const d of options) {
        const nx = e.x + DIRS[d].x;
        const ny = e.y + DIRS[d].y;
        if (nx === this.tx && ny === this.ty) {
          e.facing = d;
          // Caught from behind: the enemy gets a free round.
          this.startBattle(e, d === this.facing ? 'enemy' : 'normal');
          return;
        }
        const blocked =
          !this.walkable(nx, ny) || this.enemyAt(nx, ny) || this.chestAt(nx, ny) || (nx === stairs.x && ny === stairs.y);
        if (blocked) continue;
        e.x = nx;
        e.y = ny;
        e.facing = d;
        e.moving = true;
        this.tweens.add({ targets: e.sprite, x: px(nx), y: px(ny), duration: 220, onComplete: () => (e.moving = false) });
        break;
      }
    }
  }

  private startBattle(enemy: FieldEnemy | null, first: BattleStart['first'], boss = false): void {
    if (this.busy) return;
    this.busy = true;
    const s = getState();
    const depth = depthOf(s);
    const data: BattleStart = {
      group: boss ? [TOWNS[s.town].boss] : (enemy?.group ?? rollGroup(this.rng, depth)),
      depth,
      first,
      fieldEnemy: enemy?.idx ?? -1,
      boss,
    };
    this.cameras.main.shake(200, 0.01);
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(350, () => {
      this.persist();
      this.scene.launch('Battle', data);
      this.scene.sleep();
    });
  }

  private onWake(_sys: Phaser.Scenes.Systems, result: BattleResult): void {
    controls.touchMode = 'field';
    const s = getState();
    const now = this.time.now;
    const enemy = this.enemies.find((e) => e.idx === result.fieldEnemy);
    if (result.outcome === 'victory' && result.boss) {
      this.recoverBase();
      return;
    }
    if (result.outcome === 'victory' && enemy) {
      enemy.sprite.destroy();
      this.enemies = this.enemies.filter((e) => e !== enemy);
      s.defeated.push(enemy.idx);
    } else if (result.outcome === 'fled' && enemy) {
      enemy.stunnedUntil = now + STUN_MS;
    } else if (result.outcome === 'defeat') {
      // Progress persists: keep levels, lose half the gold, restart the floor.
      s.party.forEach(restore);
      s.gold = Math.floor(s.gold / 2);
      this.tweens.killTweensOf(this.player);
      this.moving = false;
      this.tx = this.floor.start.x;
      this.ty = this.floor.start.y;
      this.player.setPosition(px(this.tx), px(this.ty));
      this.enemies.forEach((e) => (e.stunnedUntil = now + STUN_MS));
      this.toast('The team regroups...');
    }
    this.persist();
    this.refreshHud();
    this.cameras.main.fadeIn(200);
    this.busy = false;
  }

  private openChest(chest: Chest): void {
    const s = getState();
    chest.opened = true;
    chest.sprite.setTexture('chest-open');
    s.opened.push(chest.idx);
    if (this.rng() < 0.6) {
      const gold = randInt(this.rng, 10, 25) * depthOf(s);
      s.gold += gold;
      this.toast(`Found ${gold} G!`);
    } else {
      s.items.drink++;
      this.toast('Found a Sports Drink!');
    }
    this.refreshHud();
    this.persist();
  }

  private goDownstairs(): void {
    this.busy = true;
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      descend();
      this.scene.restart();
    });
  }

  private recoverBase(): void {
    const s = getState();
    claimBase();
    const found = s.basesFound;
    const message =
      found >= TOWNS.length
        ? 'All four bases recovered! The Cosmic Baseball is whole again. The corporate All-Stars await... (To be continued!)'
        : `You recovered base ${found} of ${TOWNS.length}! The road to ${TOWNS[found].name} is now open.`;
    leaveDungeon();
    this.scene.start('Town', { message });
  }

  private openMenu(): void {
    this.busy = true;
    controls.touchMode = 'menu';
    const W = this.scale.width;
    const g = this.add.graphics().setScrollFactor(0).setDepth(120);
    drawWindow(g, W / 2 - 76, 96, 152, 40);
    const close = () => {
      menu.destroy();
      g.destroy();
      this.widget = null;
      controls.touchMode = 'field';
      this.busy = false;
    };
    const menu = new Menu(this, W / 2 - 66, 104, [{ label: 'Leave dungeon' }, { label: 'Close' }], {
      width: 136,
      onSelect: (i) => {
        close();
        if (i === 0) this.exitToTown();
      },
      onCancel: close,
      fixedDepth: 121,
    });
    this.widget = menu;
  }

  private exitToTown(): void {
    this.busy = true;
    leaveDungeon();
    this.cameras.main.fadeOut(300);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Town'));
  }

  /** Auto-save: called on floor entry, after battles, every few steps and when the app is backgrounded. */
  private persist(): void {
    const s = getState();
    s.pos = { x: this.tx, y: this.ty };
    this.stepsSinceSave = 0;
    saveGame();
  }

  private refreshHud(): void {
    const s = getState();
    const W = this.scale.width;
    this.hud.clear();
    this.hudText.forEach((t) => t.destroy());
    this.hudText = [];
    const text = (x: number, y: number, str: string, color?: string) =>
      this.hudText.push(makeText(this, x, y, str, color).setScrollFactor(0).setDepth(101));

    const label = `${TOWNS[s.town].dungeon} ${s.floor}F`;
    drawWindow(this.hud, 4, 4, label.length * 8 + 14, 30);
    text(10, 10, label);
    text(10, 21, `${s.gold} G`, YELLOW);

    const pw = 112;
    const x0 = W - pw - 4;
    drawWindow(this.hud, x0, 4, pw, 8 + s.party.length * 11);
    s.party.forEach((m, i) => {
      const y = 9 + i * 11;
      text(x0 + 6, y, m.name.slice(0, 6));
      const ratio = m.hp / m.stats.maxHp;
      this.hud.fillStyle(0x101020);
      this.hud.fillRect(x0 + 60, y + 2, 46, 4);
      this.hud.fillStyle(ratio > 0.5 ? 0x70f070 : ratio > 0.25 ? 0xf8d848 : 0xf86060);
      this.hud.fillRect(x0 + 60, y + 2, Math.max(1, Math.round(46 * ratio)), 4);
    });
  }

  private toast(message: string): void {
    const W = this.scale.width;
    const w = message.length * 8 + 20;
    const g = this.add.graphics().setScrollFactor(0).setDepth(110);
    drawWindow(g, Math.round(W / 2 - w / 2), 44, w, 20);
    const t = makeText(this, Math.round(W / 2), 50, message).setOrigin(0.5, 0).setScrollFactor(0).setDepth(111);
    this.time.delayedCall(1500, () => {
      g.destroy();
      t.destroy();
    });
  }
}
