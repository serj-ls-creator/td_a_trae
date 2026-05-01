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
  public hp: number = 100;
  public maxHp: number = 100;
  public target: Enemy | null = null;
  public rangeGraphic: Phaser.GameObjects.Graphics;
  public healthBar: Phaser.GameObjects.Graphics;
  private hasTakenDamage: boolean = false;
  private worldLayer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, config: any, worldLayer?: Phaser.GameObjects.Container) {
    super(scene, x, y, key);
    this.worldLayer = worldLayer;
    if (worldLayer) {
      worldLayer.add(this);
    } else {
      scene.add.existing(this);
    }
    this.config = config;
    this.range = config.range;
    this.fireRate = config.fireRate;
    this.damage = config.damage;
    this.setOrigin(0.5, 0.8);
    this.setScale(1.6);
    
    // Removed glow for mobile performance

    this.rangeGraphic = scene.add.graphics();
    if (worldLayer) worldLayer.add(this.rangeGraphic);
    this.rangeGraphic.lineStyle(2, THEME.TILE_NEON, 0.5);
    this.rangeGraphic.strokeCircle(this.x, this.y, this.range);
    this.rangeGraphic.setVisible(false);
    this.rangeGraphic.setDepth(2000); // Higher depth to be visible above everything
    this.healthBar = scene.add.graphics();
    if (worldLayer) worldLayer.add(this.healthBar);
    this.healthBar.setVisible(false);
    this.drawHealthBar();

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
    if (!this.active) return;

    if (time > this.nextFire) {
      this.findTarget(enemies);
      if (this.target && this.target.active) {
        this.fire(projectiles);
        this.nextFire = time + this.fireRate;
      }
    }
    this.rangeGraphic.setDepth(this.depth + 1);
    this.healthBar.setDepth(this.depth + 2);
    this.drawHealthBar();
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
      const projectile = new Projectile(this.scene, this.x, this.y - 40, projectileKey, this.damage, this.target, this.worldLayer);
      projectiles.add(projectile);

      // Visual feedback: Recoil
      this.scene.tweens.add({
        targets: this,
        y: this.y + 10,
        duration: 50,
        yoyo: true,
        ease: 'Cubic.easeOut'
      });
    }
  }

  takeDamagePercent(percent: number) {
    const damage = this.maxHp * percent;
    this.hp = Math.max(0, this.hp - damage);
    this.hasTakenDamage = true;
    this.healthBar.setVisible(true);
    this.drawHealthBar();

    this.setTint(0xff9999);
    this.scene.time.delayedCall(120, () => {
      if (this.active) this.clearTint();
    });

    if (this.hp <= 0) {
      this.emit('destroyedByEnemy', this.config.key);
      this.destroy();
    }
  }

  private drawHealthBar() {
    if (!this.active) return;
    if (!this.hasTakenDamage) {
      this.healthBar.clear();
      return;
    }

    this.healthBar.clear();
    this.healthBar.fillStyle(0x000000, 0.55);
    this.healthBar.fillRect(this.x - 26, this.y - 72, 52, 8);
    this.healthBar.fillStyle(0x33ff99, 1);
    this.healthBar.fillRect(this.x - 26, this.y - 72, (this.hp / this.maxHp) * 52, 8);
  }

  destroy() {
    this.healthBar.destroy();
    this.rangeGraphic.destroy();
    super.destroy();
  }
}
