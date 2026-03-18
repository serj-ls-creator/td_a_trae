import Phaser from 'phaser';
import { Enemy } from './Enemy';

import { THEME } from '../utils/ThemeConfig';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public damage: number;
  public target: Enemy;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, damage: number, target: Enemy) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
    this.target = target;
    this.setScale(0.6);
    
    if (this.postFX) {
      this.postFX.addGlow(THEME.TOWER_GLOW, 1, 0);
    }
  }

  update() {
    if (!this.target || !this.target.active) {
      this.destroy();
      return;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    // Reduced speed by 2 times (previous was 300, now 150)
    this.setVelocity(Math.cos(angle) * 150, Math.sin(angle) * 150);

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (distance < 10) {
      this.target.takeDamage(this.damage);
      this.destroy();
    }
  }
}
