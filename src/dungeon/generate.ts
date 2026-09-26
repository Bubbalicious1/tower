import { mulberry32, randInt, type Rng } from '../rng';

export const Tile = { Wall: 0, Floor: 1, Corridor: 2 } as const;
export type TileType = (typeof Tile)[keyof typeof Tile];

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Floor {
  width: number;
  height: number;
  /** Row-major grid of Tile values. */
  tiles: TileType[];
  rooms: Room[];
  start: Point;
  stairs: Point;
  enemies: Point[];
  chests: Point[];
}

const WIDTH = 44;
const HEIGHT = 30;
const MAX_ROOMS = 9;

export function isWalkableTile(t: TileType): boolean {
  return t !== Tile.Wall;
}

const center = (r: Room): Point => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });

function overlaps(a: Room, b: Room, margin: number): boolean {
  return (
    a.x - margin < b.x + b.w && a.x + a.w + margin > b.x && a.y - margin < b.y + b.h && a.y + a.h + margin > b.y
  );
}

/**
 * Generates a dungeon floor: non-overlapping rooms joined by L-shaped
 * corridors, plus one extra connection for a loop. The same seed and depth
 * always produce the same floor, so saves only need to store the seed.
 */
export function generateFloor(seed: number, depth: number): Floor {
  const rng = mulberry32((seed ^ Math.imul(depth, 0x9e3779b1)) >>> 0);
  const w = WIDTH;
  const h = HEIGHT;
  const tiles: TileType[] = new Array(w * h).fill(Tile.Wall);
  const set = (x: number, y: number, t: TileType) => (tiles[y * w + x] = t);
  const get = (x: number, y: number) => tiles[y * w + x];

  const rooms: Room[] = [];
  for (let attempt = 0; attempt < 300 && rooms.length < MAX_ROOMS; attempt++) {
    const rw = randInt(rng, 4, 9);
    const rh = randInt(rng, 3, 6);
    // Keep two rows of wall above each room so walls can render a face.
    const room = { x: randInt(rng, 1, w - rw - 2), y: randInt(rng, 2, h - rh - 2), w: rw, h: rh };
    if (rooms.some((r) => overlaps(r, room, 2))) continue;
    rooms.push(room);
  }
  rooms.sort((a, b) => center(a).x - center(b).x);

  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) set(x, y, Tile.Floor);
  }

  const carve = (x: number, y: number) => {
    if (get(x, y) === Tile.Wall) set(x, y, Tile.Corridor);
  };
  const connect = (a: Room, b: Room) => {
    const p = center(a);
    const q = center(b);
    const horizontalFirst = rng() < 0.5;
    const cx = horizontalFirst ? q.x : p.x;
    const cy = horizontalFirst ? p.y : q.y;
    for (let x = Math.min(p.x, q.x); x <= Math.max(p.x, q.x); x++) carve(x, cy);
    for (let y = Math.min(p.y, q.y); y <= Math.max(p.y, q.y); y++) carve(cx, y);
  };
  for (let i = 1; i < rooms.length; i++) connect(rooms[i - 1], rooms[i]);
  if (rooms.length > 3) {
    const i = randInt(rng, 0, rooms.length - 3);
    connect(rooms[i], rooms[i + 2]);
  }

  const startRoom = randInt(rng, 0, rooms.length - 1);
  const start = center(rooms[startRoom]);

  // Stairs go in the room farthest (by walking distance) from the start.
  const dist = bfs(tiles, w, h, start);
  let stairsRoom = startRoom === 0 ? 1 : 0;
  rooms.forEach((r, i) => {
    if (i === startRoom) return;
    const c = center(r);
    const s = center(rooms[stairsRoom]);
    if (dist[c.y * w + c.x] > dist[s.y * w + s.x]) stairsRoom = i;
  });
  const stairs = center(rooms[stairsRoom]);

  const taken = new Set<number>([start.y * w + start.x, stairs.y * w + stairs.x]);
  const placeInRoom = (rng: Rng, room: Room): Point | null => {
    for (let i = 0; i < 20; i++) {
      const p = { x: randInt(rng, room.x, room.x + room.w - 1), y: randInt(rng, room.y, room.y + room.h - 1) };
      const k = p.y * w + p.x;
      if (!taken.has(k)) {
        taken.add(k);
        return p;
      }
    }
    return null;
  };
  const otherRooms = rooms.filter((_, i) => i !== startRoom);

  const enemies: Point[] = [];
  const enemyCount = Math.min(otherRooms.length * 2, 3 + Math.floor(depth / 2));
  for (let i = 0; i < enemyCount; i++) {
    const p = placeInRoom(rng, otherRooms[randInt(rng, 0, otherRooms.length - 1)]);
    if (p) enemies.push(p);
  }

  const chests: Point[] = [];
  const chestCount = randInt(rng, 1, 2);
  for (let i = 0; i < chestCount; i++) {
    const p = placeInRoom(rng, otherRooms[randInt(rng, 0, otherRooms.length - 1)]);
    if (p) chests.push(p);
  }

  return { width: w, height: h, tiles, rooms, start, stairs, enemies, chests };
}

/** Walking distance from `from` to every tile (Infinity if unreachable). */
export function bfs(tiles: readonly TileType[], w: number, h: number, from: Point): number[] {
  const dist = new Array(w * h).fill(Infinity);
  const queue: Point[] = [from];
  dist[from.y * w + from.x] = 0;
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    const d = dist[y * w + x];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const k = ny * w + nx;
      if (dist[k] !== Infinity || !isWalkableTile(tiles[k])) continue;
      dist[k] = d + 1;
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}
