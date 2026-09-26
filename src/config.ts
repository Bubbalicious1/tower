/** Internal resolution height. Width stretches to fit the screen's aspect ratio. */
export const GAME_H = 270;
const MIN_W = 400;
const MAX_W = 640;

export const TILE = 16;
export const FONT = '"Press Start 2P", monospace';

/** Wider phones see more of the map instead of getting black bars. */
export function computeWidth(): number {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const w = Math.round((GAME_H * aspect) / 2) * 2;
  return Math.max(MIN_W, Math.min(MAX_W, w));
}
