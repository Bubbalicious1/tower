import Phaser from 'phaser';
import { PALETTE, SPRITES } from './art-data';
import { CLASSES } from './data/classes';
import { ENEMIES } from './data/enemies';
import { mulberry32 } from './rng';
import { TILE } from './config';

/** Tileset indices used by the dungeon tilemap. */
export const TileGfx = { Void: 0, WallFace: 1, Floor: 2, Corridor: 3, Stairs: 4 } as const;

type Ctx = CanvasRenderingContext2D;

function paintMap(ctx: Ctx, map: string[], palette: Record<string, string>, ox = 0, oy = 0): void {
  map.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`Could not create texture ${key}`);
  draw(tex.getContext());
  tex.refresh();
}

function spriteTexture(scene: Phaser.Scene, key: string, map: string[], palette = PALETTE): void {
  const w = Math.max(...map.map((r) => r.length));
  canvasTexture(scene, key, w, map.length, (ctx) => paintMap(ctx, map, palette));
}

function drawTiles(ctx: Ctx): void {
  const rnd = mulberry32(1234);
  const px = (i: number, x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * TILE + x, y, 1, 1);
  };
  const fill = (i: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * TILE, 0, TILE, TILE);
  };
  const speckle = (i: number, colors: string[], count: number) => {
    for (let n = 0; n < count; n++) {
      px(i, Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), colors[n % colors.length]);
    }
  };

  fill(TileGfx.Void, '#0d0b16');
  speckle(TileGfx.Void, ['#16121f'], 10);

  // Brick wall face with a lit top edge and shadowed base.
  fill(TileGfx.WallFace, '#5b4b6e');
  for (let row = 0; row < 4; row++) {
    const y = row * 4 + 3;
    for (let x = 0; x < TILE; x++) px(TileGfx.WallFace, x, y, '#3b2e4c');
    const offset = row % 2 ? 4 : 0;
    for (let x = offset; x < TILE; x += 8) for (let yy = row * 4; yy < y; yy++) px(TileGfx.WallFace, x, yy, '#3b2e4c');
  }
  for (let x = 0; x < TILE; x++) {
    px(TileGfx.WallFace, x, 0, '#8a7aa0');
    px(TileGfx.WallFace, x, 15, '#241c30');
  }

  fill(TileGfx.Floor, '#8b6d4c');
  speckle(TileGfx.Floor, ['#9c7d5a', '#735a3e', '#a88a64'], 22);

  fill(TileGfx.Corridor, '#4d3c30');
  speckle(TileGfx.Corridor, ['#5a4838', '#3e3026'], 18);

  fill(TileGfx.Stairs, '#8b6d4c');
  for (let step = 0; step < 4; step++) {
    const y = 2 + step * 3;
    const inset = step;
    ctx.fillStyle = '#b09070';
    ctx.fillRect(TileGfx.Stairs * TILE + 2 + inset, y, 12 - inset * 2, 1);
    ctx.fillStyle = step === 3 ? '#0d0b16' : '#2a2018';
    ctx.fillRect(TileGfx.Stairs * TILE + 2 + inset, y + 1, 12 - inset * 2, 2);
  }
}

/** Builds every placeholder texture at boot, so the game ships with no image files. */
export function generateArt(scene: Phaser.Scene): void {
  for (const cls of Object.values(CLASSES)) {
    spriteTexture(scene, `hero-${cls.id}`, SPRITES.hero, { ...PALETTE, c: cls.color });
  }
  for (const e of Object.values(ENEMIES)) if (!e.sprite) spriteTexture(scene, `enemy-${e.id}`, SPRITES[e.id]);
  spriteTexture(scene, 'chest', SPRITES.chest);
  spriteTexture(scene, 'chest-open', SPRITES.chestOpen);
  spriteTexture(scene, 'cursor', SPRITES.cursor);
  canvasTexture(scene, 'tiles', TILE * 5, TILE, drawTiles);
}
