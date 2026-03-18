import Phaser from 'phaser';
import { CONSTANTS } from '../utils/Constants';
import { Enemy } from '../entities/Enemy';

export class WaveManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private currentWave: number = 0;
  private enemiesInWave: number = 0;
  private enemiesSpawned: number = 0;
  private path: Phaser.Math.Vector2[];

  constructor(scene: Phaser.Scene, path: Phaser.Math.Vector2[]) {
    super();
    this.scene = scene;
    this.path = path;
  }

  startNextWave() {
    if (this.currentWave >= 10) {
      this.emit('allWavesComplete');
      return;
    }
    this.currentWave++;
    this.enemiesInWave = this.currentWave * 5;
    this.enemiesSpawned = 0;
    this.emit('waveStart', this.currentWave);

    this.scene.time.addEvent({
      delay: 2000, // Increased from 1000 to 2000 for slower spawn
      callback: this.spawnEnemy,
      callbackScope: this,
      repeat: this.enemiesInWave - 1,
    });
  }

  spawnEnemy() {
    const enemyConfig = CONSTANTS.ENEMIES[Phaser.Math.Between(0, CONSTANTS.ENEMIES.length - 1)];
    const startPoint = this.path[0];
    if (!startPoint) return;
    
    const enemy = new Enemy(this.scene, startPoint.x, startPoint.y, enemyConfig.key, enemyConfig, this.path);
    
    enemy.on('reachedEnd', () => this.emit('enemyReachedEnd'));
    enemy.on('killed', (reward: number) => this.emit('enemyKilled', reward));
    
    this.enemiesSpawned++;
    this.emit('enemySpawned', enemy);
  }

  isWaveComplete() {
    return this.enemiesSpawned >= this.enemiesInWave;
  }

  getCurrentWave() {
    return this.currentWave;
  }
}
