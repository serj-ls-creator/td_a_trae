import Phaser from 'phaser';
import { CONSTANTS } from '../utils/Constants';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public speed: number;
  public reward: number;
  public isBoss: boolean;
  public pathIndex: number = 0;
  public path: Phaser.Math.Vector2[] = [];
  public healthBar: Phaser.GameObjects.Graphics;
  private hasTakenDamage: boolean = false;
  private bossVisual?: Phaser.GameObjects.Graphics;
  private nextBossAttackAt: number = 0;
  private readonly bossAttackCooldownMs: number = 2200;
  private readonly bossAttackRange: number = CONSTANTS.TOWERS.find((tower) => tower.key === 'flower')?.range ?? 100;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, config: any, path: Phaser.Math.Vector2[], worldLayer?: Phaser.GameObjects.Container) {
    super(scene, x, y, key);
    if (worldLayer) {
      worldLayer.add(this);
    } else {
      scene.add.existing(this);
    }
    scene.physics.add.existing(this);

    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.reward = config.reward;
    this.isBoss = Boolean(config.isBoss);
    this.path = path;
    this.healthBar = scene.add.graphics();
    if (worldLayer) worldLayer.add(this.healthBar);
    this.healthBar.setVisible(false);
    this.setOrigin(0.5, 0.8);
    this.setScale(this.isBoss ? 1.45 : 0.78);
    if (this.isBoss) {
      this.setVisible(false);
      this.createBossVisual(worldLayer);
    }
  }

  update(towers?: Phaser.GameObjects.GameObject[]) {
    if (this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

      if (distance < 2) {
        this.pathIndex++;
      } else {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
        // Reduced speed by 3 times (previous multiplier was 60, now 20)
        this.setVelocity(Math.cos(angle) * this.speed * 20, Math.sin(angle) * this.speed * 20);
      }
    } else {
      // Reached the end
      this.emit('reachedEnd');
      this.destroy();
    }

    if (this.isBoss && this.active) {
      this.updateBossVisual();
      this.tryBossAttack(towers);
    }

    this.setDepth(this.y);
    this.drawHealthBar();
  }

  drawHealthBar() {
    if (!this.hasTakenDamage) {
      this.healthBar.clear();
      return;
    }

    const barWidth = this.isBoss ? 110 : 56;
    const barOffsetX = this.isBoss ? 55 : 28;
    const barY = this.isBoss ? this.y - 96 : this.y - 66;

    this.healthBar.clear();
    this.healthBar.setDepth(this.depth + 1);
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(this.x - barOffsetX, barY, barWidth, 10);
    this.healthBar.fillStyle(this.isBoss ? 0xff66cc : 0xff0000, 1);
    this.healthBar.fillRect(this.x - barOffsetX, barY, (this.hp / this.maxHp) * barWidth, 10);
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    if (amount > 0) {
      this.hasTakenDamage = true;
      this.healthBar.setVisible(true);
    }
    if (this.isBoss && amount > 0) {
      this.emit('bossHit', 1);
    }
    
    // Show damage text
    this.showDamage(amount);

    // Flash effect
    this.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private showDamage(amount: number) {
    const text = this.scene.add.text(this.x, this.y - 40, `-${amount}`, {
      fontSize: '20px',
      color: '#ff0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    } as any).setOrigin(0.5);
    text.setDepth(3000);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  private die() {
    this.emit('killed', this.reward);
    this.healthBar.setVisible(false);
    this.disableBody(true, false);
    
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      angle: 360,
      duration: 500,
      onComplete: () => {
        this.destroy();
      }
    });
  }

  destroy() {
    this.bossVisual?.destroy();
    this.healthBar.destroy();
    super.destroy();
  }

  private createBossVisual(worldLayer?: Phaser.GameObjects.Container) {
    this.bossVisual = this.scene.add.graphics();
    if (worldLayer) {
      worldLayer.add(this.bossVisual);
    }
    this.drawBossShape();
  }

  private drawBossShape() {
    if (!this.bossVisual) return;

    this.bossVisual.clear();

    // Тело босса
    this.bossVisual.fillStyle(0xff66cc, 1);
    this.bossVisual.fillEllipse(0, -32, 90, 75);

    // Глазки
    this.bossVisual.fillStyle(0x1a1a1a, 1);
    this.bossVisual.fillCircle(-16, -38, 5);
    this.bossVisual.fillCircle(16, -38, 5);

    // Веселая улыбка
    this.bossVisual.lineStyle(4, 0x1a1a1a, 1);
    this.bossVisual.beginPath();
    this.bossVisual.arc(0, -23, 15, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    this.bossVisual.strokePath();

    // Рога/ушки
    this.bossVisual.fillStyle(0xff99dd, 1);
    this.bossVisual.fillTriangle(-36, -58, -22, -66, -28, -45);
    this.bossVisual.fillTriangle(36, -58, 22, -66, 28, -45);

    this.updateBossVisual();
  }

  private updateBossVisual() {
    if (!this.bossVisual) return;
    this.bossVisual.setPosition(this.x, this.y);
    this.bossVisual.setDepth(this.y + 1);
  }

  private tryBossAttack(towers?: Phaser.GameObjects.GameObject[]) {
    if (!towers || towers.length === 0) return;
    if (this.scene.time.now < this.nextBossAttackAt) return;

    const target = this.findClosestTower(towers);
    if (!target) return;

    this.nextBossAttackAt = this.scene.time.now + this.bossAttackCooldownMs;
    this.shootPoop(target);
  }

  private findClosestTower(towers: Phaser.GameObjects.GameObject[]) {
    let closest: any = null;
    let minDistance = this.bossAttackRange;

    towers.forEach((tower: any) => {
      if (!tower?.active) return;
      if (typeof tower.takeDamagePercent !== 'function') return;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, tower.x, tower.y);
      if (dist <= minDistance) {
        minDistance = dist;
        closest = tower;
      }
    });

    return closest;
  }

  private shootPoop(target: any) {
    const poop = this.scene.add.graphics();
    poop.setDepth(this.depth + 3);

    // Небольшой "снаряд-какашка"
    poop.fillStyle(0x6b3f20, 1);
    poop.fillCircle(0, -8, 8);
    poop.fillCircle(-6, -2, 6);
    poop.fillCircle(6, -2, 6);
    poop.fillCircle(0, 4, 5);
    poop.setPosition(this.x, this.y - 70);

    this.scene.tweens.add({
      targets: poop,
      x: target.x,
      y: target.y - 45,
      duration: 520,
      ease: 'Quad.easeIn',
      onComplete: () => {
        poop.destroy();
        if (target.active) {
          target.takeDamagePercent(0.2);
        }
      }
    });
  }
}
