import Phaser from 'phaser';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public speed: number;
  public reward: number;
  public pathIndex: number = 0;
  public path: Phaser.Math.Vector2[] = [];
  public healthBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, key: string, config: any, path: Phaser.Math.Vector2[]) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.reward = config.reward;
    this.path = path;
    this.healthBar = scene.add.graphics();
    this.setOrigin(0.5, 0.8);
    this.setScale(0.5);
  }

  update() {
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
    this.setDepth(this.y);
    this.drawHealthBar();
  }

  drawHealthBar() {
    this.healthBar.clear();
    this.healthBar.setDepth(this.depth + 1);
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(this.x - 20, this.y - 40, 40, 5);
    this.healthBar.fillStyle(0xff0000, 1);
    this.healthBar.fillRect(this.x - 20, this.y - 40, (this.hp / this.maxHp) * 40, 5);
  }

  takeDamage(amount: number) {
    this.hp -= amount;
    
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
    this.healthBar.destroy();
    super.destroy();
  }
}
