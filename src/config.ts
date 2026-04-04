import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preload } from './scenes/Preload';
import { Game } from './scenes/Game';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a1a',
  pixelArt: false,
  antialias: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 1280 * (window.innerHeight / window.innerWidth) > 1280 ? 1280 * (window.innerHeight / window.innerWidth) : 1280,
  },
  input: {
    activePointers: 2, // Enable multi-touch (up to 2 pointers for pinch-to-zoom)
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Boot, Preload, Game],
};
