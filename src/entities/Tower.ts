import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';

import { THEME } from '../utils/ThemeConfig';

export class Tower extends Phaser.GameObjects.Sprite {
  public config: any;
  public range: number;
  public fireRate: number;
  public nextFire: number = 0;
  public damage: number;
  public target: Enemy | null = null;
  public rangeGraphic: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, config: any) {
    super(scene, x, y, key);
    scene.add.existing(this);
    this.config = config;
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.damage = config.damage;
    this.setOrigin(0.5, 0.8);
    this.setScale(0.8);
    
    // Add Neon Glow
    if (this.postFX) {
      this.postFX.addGlow(THEME.TOWER_GLOW, 2, 0);
    }

    this.rangeGraphic = scene.add.graphics();
    this.rangeGraphic.lineStyle(2, THEME.TILE_NEON, 0.5);
    this.rangeGraphic.strokeCircle(this.x, this.y, this.range);
    this.rangeGraphic.setVisible(false);
    this.rangeGraphic.setDepth(2000); // Higher depth to be visible above everything

    this.setInteractive();
    this.on('pointerover', () => {
      this.rangeGraphic.setVisible(true);
      this.setTint(0xff88ff);
    });
    this.on('pointerout', () => {
      this.rangeGraphic.setVisible(false);
      this.clearTint();
    });
    this.setDepth(this.y);
  }

  update(time: number, enemies: Enemy[], projectiles: Phaser.GameObjects.Group) {
    if (time > this.nextFire) {
      this.findTarget(enemies);
      if (this.target && this.target.active) {
        this.fire(projectiles);
        this.nextFire = time + this.fireRate;
      }
    }
    this.rangeGraphic.setDepth(this.depth + 1);
  }

  findTarget(enemies: Enemy[]) {
    let closestEnemy: Enemy | null = null;
    let minDistance = this.range;

    enemies.forEach((enemy) => {
      if (enemy.active) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestEnemy = enemy;
        }
      }
    });

    this.target = closestEnemy;
  }

  fire(projectiles: Phaser.GameObjects.Group) {
    if (this.target) {
      const projectileKey = `projectile_${this.config.key}`;
      const projectile = new Projectile(this.scene, this.x, this.y - 40, projectileKey, this.damage, this.target);
      projectiles.add(projectile);
    }
  }

  destroy() {
    this.rangeGraphic.destroy();
    super.destroy();
  }
}
