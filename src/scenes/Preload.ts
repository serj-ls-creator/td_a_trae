import Phaser from 'phaser';

export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // Show loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // Load assets
    // Use Emoji as textures for the Neon Pixel style
    this.createEmojiTexture('flower', '🌸');
    this.createEmojiTexture('monkey', '🐒');
    this.createEmojiTexture('ghost', '👻');
    this.createEmojiTexture('fan', '🎐');
    this.createEmojiTexture('projectile_flower', '✨');
    this.createEmojiTexture('projectile_monkey', '🍌');
    this.createEmojiTexture('projectile_ghost', '🔮');
    this.createEmojiTexture('projectile_fan', '💨');
    this.createEmojiTexture('chest', '🎀');
    this.createEmojiTexture('portal', '🌀');
    this.createEmojiTexture('slime', '😈');
    this.createEmojiTexture('skeleton', '💀');
    this.createEmojiTexture('bat', '🧛');
    
    // Create neon tile
    this.createNeonTile();
  }

  private createEmojiTexture(key: string, emoji: string) {
    const text = this.make.text({
      x: 32,
      y: 32,
      text: emoji,
      style: {
        fontSize: '48px',
        fontFamily: 'Arial',
        color: '#ffffff',
      } as any
    }).setOrigin(0.5);
    
    const rt = this.add.renderTexture(0, 0, 64, 64);
    rt.draw(text, 32, 32);
    rt.saveTexture(key);
    rt.destroy();
  }

  private createNeonTile() {
    // Draw isometric diamond
    const w = 128;
    const h = 64;
    
    const graphics = this.make.graphics({ x: 0, y: 0, add: false } as any);
    graphics.lineStyle(2, 0xa333ff, 1);
    graphics.fillStyle(0x30302a, 1); 
    
    const points = [
      { x: w / 2, y: 0 },
      { x: w, y: h / 2 },
      { x: w / 2, y: h },
      { x: 0, y: h / 2 }
    ];
    
    graphics.fillPoints(points, true);
    graphics.strokePoints(points, true);
    
    const rt = this.add.renderTexture(0, 0, w, h);
    rt.draw(graphics, 0, 0);
    rt.saveTexture('tile');
    rt.destroy();
  }

  create() {
    this.scene.start('Game');
  }
}
