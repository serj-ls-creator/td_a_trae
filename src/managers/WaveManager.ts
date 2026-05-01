import Phaser from 'phaser';
import { CONSTANTS } from '../utils/Constants';
import { Enemy } from '../entities/Enemy';

export class WaveManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private currentWave: number = 0;
  private enemiesInWave: number = 0;
  private enemiesSpawned: number = 0;
  private enemiesActive: number = 0;
  private waveCompleteEmitted: boolean = false;
  private throwersTargetInWave: number = 0;
  private throwersAssignedInWave: number = 0;
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
    // Базовые + "смешные": с каждой новой волной +1 такой монстр.
    this.enemiesInWave = this.getBaseEnemiesInWave() + this.getFunnyEnemiesInWave();
    this.enemiesSpawned = 0;
    this.waveCompleteEmitted = false;
    this.throwersAssignedInWave = 0;
    this.throwersTargetInWave = Math.round(this.enemiesInWave * this.getThrowerRatioForWave());
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
    const baseEnemyConfig = this.getEnemyConfigForCurrentSpawn();
    const waveMultiplier = this.getWaveStrengthMultiplier();
    let enemyConfig: any = {
      ...baseEnemyConfig,
      hp: Math.max(1, Math.round(baseEnemyConfig.hp * waveMultiplier))
    };

    if (this.shouldMakeCurrentEnemyThrower()) {
      enemyConfig = {
        ...enemyConfig,
        name: `${enemyConfig.name} Thrower`,
        isThrower: true
      };
      this.throwersAssignedInWave++;
    }
    const startPoint = this.path[0];
    if (!startPoint) return;
    
    const enemy = new Enemy(this.scene, startPoint.x, startPoint.y, enemyConfig.key, enemyConfig, this.path, this.worldLayer);
    this.registerEnemy(enemy);
    
    this.enemiesSpawned++;
    this.emit('enemySpawned', enemy);

    if (this.enemiesSpawned === this.enemiesInWave) {
      this.spawnBoss();
    }

    this.checkWaveProgress();
  }

  private spawnBoss() {
    const startPoint = this.path[0];
    if (!startPoint) return;

    const skeletonConfig = CONSTANTS.ENEMIES.find((enemy) => enemy.key === 'skeleton') ?? CONSTANTS.ENEMIES[0];
    if (!skeletonConfig) return;

    const waveMultiplier = this.getWaveStrengthMultiplier();
    const bossBaseConfig = CONSTANTS.ENEMIES[Phaser.Math.Between(0, CONSTANTS.ENEMIES.length - 1)];
    const bossConfig = {
      ...bossBaseConfig,
      name: 'Happy Boss',
      hp: Math.max(1, Math.round(bossBaseConfig.hp * waveMultiplier)) * 5,
      speed: skeletonConfig.speed / 2,
      reward: bossBaseConfig.reward * 5,
      isBoss: true
    };

    const boss = new Enemy(
      this.scene,
      startPoint.x,
      startPoint.y,
      bossBaseConfig.key,
      bossConfig,
      this.path,
      this.worldLayer
    );

    this.registerEnemy(boss);
    this.emit('enemySpawned', boss);
  }

  private registerEnemy(enemy: Enemy) {
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
  }

  private checkWaveProgress() {
    this.emit('waveProgress', this.enemiesSpawned, this.enemiesInWave);

    if (!this.waveCompleteEmitted && this.enemiesSpawned === this.enemiesInWave && this.enemiesActive <= 0) {
      this.waveCompleteEmitted = true;
      this.emit('waveComplete', this.currentWave);
    }
    
    // Check for win condition: last wave and all enemies are gone
    if (this.currentWave === 10 && this.enemiesSpawned === this.enemiesInWave && this.enemiesActive <= 0) {
      this.emit('allWavesComplete');
    }
  }

  isWaveComplete() {
    return this.enemiesSpawned >= this.enemiesInWave;
  }

  getCurrentWave() {
    return this.currentWave;
  }

  private getWaveStrengthMultiplier() {
    return 1 + Math.max(0, this.currentWave - 1) * 0.05;
  }

  private getBaseEnemiesInWave() {
    return this.currentWave * 5;
  }

  private getFunnyEnemiesInWave() {
    return this.currentWave;
  }

  private isFunnySpawn(spawnIndex: number) {
    return spawnIndex >= this.getBaseEnemiesInWave();
  }

  private getEnemyConfigForCurrentSpawn() {
    const spawnIndex = this.enemiesSpawned;
    if (!this.isFunnySpawn(spawnIndex)) {
      return CONSTANTS.ENEMIES[Phaser.Math.Between(0, CONSTANTS.ENEMIES.length - 1)];
    }

    const funnyIndex = spawnIndex - this.getBaseEnemiesInWave();
    const funnyConfig = CONSTANTS.FUNNY_ENEMIES[funnyIndex % CONSTANTS.FUNNY_ENEMIES.length];
    return funnyConfig ?? CONSTANTS.ENEMIES[0];
  }

  private getThrowerRatioForWave() {
    if (this.currentWave <= 5) return 0;
    // С 6 по 10 волну: 6%, 12%, 18%, 24%, 30%.
    return Math.min(0.3, (this.currentWave - 5) * 0.06);
  }

  private shouldMakeCurrentEnemyThrower() {
    if (this.throwersAssignedInWave >= this.throwersTargetInWave) return false;

    const remainingSpawns = this.enemiesInWave - this.enemiesSpawned;
    const remainingThrowers = this.throwersTargetInWave - this.throwersAssignedInWave;
    if (remainingSpawns <= 0 || remainingThrowers <= 0) return false;

    // Гарантированное распределение: к концу волны точно получаем целевой процент.
    const chance = remainingThrowers / remainingSpawns;
    return Math.random() < chance;
  }
}
