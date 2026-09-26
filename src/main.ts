import '@fontsource/press-start-2p';
import Phaser from 'phaser';
import { computeWidth, GAME_H } from './config';
import { controls } from './input/Controls';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { DungeonScene } from './scenes/DungeonScene';
import { TitleScene } from './scenes/TitleScene';
import { TouchScene } from './scenes/TouchScene';
import { TownScene } from './scenes/TownScene';
import { WorldMapScene } from './scenes/WorldMapScene';

async function start(): Promise<void> {
  // Text is rasterized once, so the pixel font must be loaded before the first scene.
  try {
    await document.fonts.load('8px "Press Start 2P"');
  } catch {
    // Fall back to monospace.
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: computeWidth(),
    height: GAME_H,
    backgroundColor: '#000000',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    // Touch must stay last so its overlay draws above every other scene.
    scene: [BootScene, TitleScene, TownScene, WorldMapScene, DungeonScene, BattleScene, TouchScene],
  });

  game.events.on(Phaser.Core.Events.PRE_STEP, () => controls.update());
  window.addEventListener('resize', () => {
    const w = computeWidth();
    if (w !== game.scale.width) game.scale.setGameSize(w, GAME_H);
  });

  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
}

void start();
