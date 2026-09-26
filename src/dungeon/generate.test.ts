import { describe, expect, it } from 'vitest';
import { bfs, generateFloor, isWalkableTile } from './generate';

const SEEDS = Array.from({ length: 200 }, (_, i) => (i * 2654435761) >>> 0);

describe('generateFloor', () => {
  it('is deterministic for a seed and depth', () => {
    expect(generateFloor(42, 3)).toEqual(generateFloor(42, 3));
    expect(generateFloor(42, 3)).not.toEqual(generateFloor(42, 4));
  });

  it.each(SEEDS)('seed %i: every walkable tile, the stairs and all entities are reachable', (seed) => {
    const f = generateFloor(seed, 1 + (seed % 10));
    expect(f.rooms.length).toBeGreaterThanOrEqual(4);
    const dist = bfs(f.tiles, f.width, f.height, f.start);
    f.tiles.forEach((t, i) => {
      if (isWalkableTile(t)) expect(dist[i]).not.toBe(Infinity);
    });
    const points = [f.start, f.stairs, ...f.enemies, ...f.chests];
    const keys = points.map((p) => p.y * f.width + p.x);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      expect(isWalkableTile(f.tiles[k])).toBe(true);
      expect(dist[k]).not.toBe(Infinity);
    }
    expect(f.stairs).not.toEqual(f.start);
  });

  it('keeps the map border solid', () => {
    const f = generateFloor(7, 1);
    for (let x = 0; x < f.width; x++) {
      expect(isWalkableTile(f.tiles[x])).toBe(false);
      expect(isWalkableTile(f.tiles[(f.height - 1) * f.width + x])).toBe(false);
    }
  });
});
