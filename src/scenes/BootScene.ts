import Phaser from 'phaser';
import { generateArt } from '../art';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateArt(this);
    // The touch overlay runs for the whole session, drawn above every other scene.
    this.scene.launch('Touch');
    this.scene.start('Title');
  }
}
