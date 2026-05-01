import Phaser from 'phaser';
import { config } from './config';

new Phaser.Game(config);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        // Просим браузер проверить новую версию SW сразу после загрузки.
        registration.update().catch(() => undefined);
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}
