import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Load minimal assets needed for loading screen
  }

  create() {
    this.scene.start('Preload');
  }
}
