import Phaser from 'phaser';
import { Enemy } from './Enemy';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  public damage: number;
  public target: Enemy;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, damage: number, target: Enemy, worldLayer?: Phaser.GameObjects.Container) {
    super(scene, x, y, key);
    if (worldLayer) {
      worldLayer.add(this);
    } else {
      scene.add.existing(this);
    }
    scene.physics.add.existing(this);
    this.damage = damage;
    this.target = target;
    this.setScale(1.2);
    
    // Removed glow for mobile performance
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
