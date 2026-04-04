import Phaser from 'phaser';
import { CONSTANTS } from '../utils/Constants';
import { Enemy } from '../entities/Enemy';

export class WaveManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private currentWave: number = 0;
  private enemiesInWave: number = 0;
  private enemiesSpawned: number = 0;
  private enemiesActive: number = 0;
  private path: Phaser.Math.Vector2[];
  private worldLayer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, path: Phaser.Math.Vector2[], worldLayer?: Phaser.GameObjects.Container) {
    super();
    this.scene = scene;
    this.path = path;
    this.worldLayer = worldLayer;
  }

  startNextWave() {
    if (this.currentWave >= 10) {
      return;
    }
    this.currentWave++;
    this.enemiesInWave = this.currentWave * 5;
    this.enemiesSpawned = 0;
    // Removed reset of enemiesActive to keep track of enemies from previous waves
    this.emit('waveStart', this.currentWave);

    this.scene.time.addEvent({
      delay: 2000,
      callback: this.spawnEnemy,
      callbackScope: this,
      repeat: this.enemiesInWave - 1,
    });
  }

  spawnEnemy() {
    const enemyConfig = CONSTANTS.ENEMIES[Phaser.Math.Between(0, CONSTANTS.ENEMIES.length - 1)];
    const startPoint = this.path[0];
    if (!startPoint) return;
    
    const enemy = new Enemy(this.scene, startPoint.x, startPoint.y, enemyConfig.key, enemyConfig, this.path, this.worldLayer);
    this.enemiesActive++;
    
    enemy.on('reachedEnd', () => {
      this.enemiesActive--;
      this.emit('enemyReachedEnd');
      this.checkWaveProgress();
    });
    enemy.on('killed', (reward: number) => {
      this.enemiesActive--;
      this.emit('enemyKilled', reward);
      this.checkWaveProgress();
    });
    
    this.enemiesSpawned++;
    this.emit('enemySpawned', enemy);
    this.checkWaveProgress();
  }

  private checkWaveProgress() {
    this.emit('waveProgress', this.enemiesSpawned, this.enemiesInWave);
    
    // Check for win condition: last wave and all enemies are gone
    if (this.currentWave === 10 && this.enemiesSpawned === this.enemiesInWave && this.enemiesActive <= 0) {
      console.log('WaveManager: Victory condition met! Emitting allWavesComplete');
      this.emit('allWavesComplete');
    }
  }

  isWaveComplete() {
    return this.enemiesSpawned >= this.enemiesInWave;
  }

  getCurrentWave() {
    return this.currentWave;
  }
}
