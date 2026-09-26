import { describe, expect, it } from 'vitest';
import { SPRITES } from './art-data';

describe('pixel maps', () => {
  it.each(Object.entries(SPRITES))('%s has rows of equal width', (_key, rows) => {
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
  });
});
