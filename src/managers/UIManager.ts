import Phaser from 'phaser';
import { THEME } from '../utils/ThemeConfig';
import { CONSTANTS } from '../utils/Constants';

export class UIManager extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private moneyText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;
  private lifeText!: Phaser.GameObjects.Text;
  private towerButtons: Phaser.GameObjects.Container[] = [];
  public selectedTower: any = null;
  private startButtonText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    this.createUI();
  }

  private createButton(x: number, y: number, text: string, eventName: string, isStart: boolean) {
    const btnW = 100;
    const btnH = 50;

    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(10000); // UI always on top
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.UI_BG_HEX, 0.6);
    bg.lineStyle(2, THEME.UI_BORDER_HEX, 1);
    bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
    bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);

    const txt = this.scene.add.text(0, 0, text, {
      fontSize: '18px',
      color: THEME.UI_TEXT,
      fontFamily: THEME.FONT,
    } as any).setOrigin(0.5);

    if (isStart) {
      this.startButtonText = txt;
    }

    container.add([bg, txt]);
    container.setInteractive(new Phaser.Geom.Rectangle(-btnW/2, -btnH/2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      this.emit(eventName);
      bg.clear();
      bg.fillStyle(THEME.UI_ACCENT_HEX, 0.4);
      bg.lineStyle(3, THEME.UI_ACCENT_HEX, 1);
      bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
      bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
      this.scene.time.delayedCall(100, () => {
        bg.clear();
        bg.fillStyle(THEME.UI_BG_HEX, 0.6);
        bg.lineStyle(2, THEME.UI_BORDER_HEX, 1);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
      });
    });

    container.on('pointerover', () => {
      bg.lineStyle(4, THEME.UI_ACCENT_HEX, 1);
      bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(THEME.UI_BG_HEX, 0.6);
      bg.lineStyle(2, THEME.UI_BORDER_HEX, 1);
      bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
      bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, 12);
    });

    return container;
  }

  private createUI() {
    const { width, height } = this.scene.scale;
    const textStyle: any = { 
      fontSize: '24px', 
      color: THEME.UI_TEXT,
      fontFamily: THEME.FONT
    };

    // Top Left UI
    this.moneyText = this.scene.add.text(20, 20, 'Money: $100', textStyle).setScrollFactor(0).setDepth(10000);
    
    // Top Right UI
    this.lifeText = this.scene.add.text(width - 20, 20, 'Bow HP: 100%', textStyle).setScrollFactor(0).setDepth(10000).setOrigin(1, 0);
    this.waveText = this.scene.add.text(width - 20, 60, 'Wave: 1', textStyle).setScrollFactor(0).setDepth(10000).setOrigin(1, 0);
    this.enemiesText = this.scene.add.text(width - 20, 100, 'Enemies: 0/0', { ...textStyle, fontSize: '18px' }).setScrollFactor(0).setDepth(10000).setOrigin(1, 0);

    // Bottom Left UI - Tower Shop
    const shopY = height - 100;
    const shopXStart = 60; // Moved from 80 to 60 to be more to the left

    const shopBg = this.scene.add.graphics();
    shopBg.setScrollFactor(0);
    shopBg.setDepth(9999);
    shopBg.fillStyle(THEME.UI_BG_HEX, 0.6);
    shopBg.lineStyle(2, THEME.UI_BORDER_HEX, 1);
    shopBg.fillRoundedRect(shopXStart - 60, shopY - 55, (CONSTANTS.TOWERS.length * 100) + 20, 110, 15);
    shopBg.strokeRoundedRect(shopXStart - 60, shopY - 55, (CONSTANTS.TOWERS.length * 100) + 20, 110, 15);

    CONSTANTS.TOWERS.forEach((tower, index) => {
      const container = this.scene.add.container(shopXStart + index * 100, shopY);
      container.setScrollFactor(0);
      container.setDepth(10000);
      
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-45, -45, 90, 90, 10);
      bg.lineStyle(2, THEME.UI_BORDER_HEX, 0.5);
      bg.strokeRoundedRect(-45, -45, 90, 90, 10);
      
      const icon = this.scene.add.image(0, -10, tower.key).setScale(0.8);
      const nameText = this.scene.add.text(0, 20, tower.name, { 
        fontSize: '12px', 
        color: THEME.UI_TEXT,
        fontFamily: THEME.FONT 
      } as any).setOrigin(0.5);
      const costText = this.scene.add.text(0, 35, `$${tower.cost}`, { 
        fontSize: '12px', 
        color: THEME.UI_ACCENT,
        fontFamily: THEME.FONT 
      } as any).setOrigin(0.5);

      container.add([bg, icon, nameText, costText]);
      container.setInteractive(new Phaser.Geom.Rectangle(-45, -45, 90, 90), Phaser.Geom.Rectangle.Contains);

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.preventDefault();
        this.selectTower(tower, container);
      });

      this.towerButtons.push(container);
    });

    // Start and Wave Buttons (Bottom Right)
    const btnStartX = width - 200;
    const btnWaveX = width - 80;
    const btnY = height - 100;

    this.createButton(btnStartX, btnY, 'START', 'startWave', true);
    this.createButton(btnWaveX, btnY, 'WAVE', 'nextWave', false);
  }

  private selectTower(tower: any, container: Phaser.GameObjects.Container) {
    this.selectedTower = tower;
    this.towerButtons.forEach(btn => {
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-45, -45, 90, 90, 10);
      bg.lineStyle(2, THEME.UI_BORDER_HEX, 0.5);
      bg.strokeRoundedRect(-45, -45, 90, 90, 10);
    });

    const selectedBg = container.list[0] as Phaser.GameObjects.Graphics;
    selectedBg.lineStyle(4, THEME.UI_ACCENT_HEX, 1);
    selectedBg.strokeRoundedRect(-45, -45, 90, 90, 10);
    
    this.emit('towerSelected', tower);
  }

  public deselectTower() {
    this.selectedTower = null;
    this.towerButtons.forEach(btn => {
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-45, -45, 90, 90, 10);
      bg.lineStyle(2, THEME.UI_BORDER_HEX, 0.5);
      bg.strokeRoundedRect(-45, -45, 90, 90, 10);
    });
  }

  updateMoney(money: number) {
    this.moneyText.setText(`Money: $${money}`);
  }

  updateWave(wave: number) {
    this.waveText.setText(`Wave: ${wave}`);
  }

  updateWaveProgress(spawned: number, total: number) {
    this.enemiesText.setText(`Enemies: ${spawned}/${total}`);
  }

  updateLives(lives: number) {
    const percentage = Math.max(0, (lives / 20) * 100);
    this.lifeText.setText(`Bow HP: ${percentage}%`);
  }

  public setStartButtonToRestart() {
    if (this.startButtonText) {
      this.startButtonText.setText('ЗАНОВО');
    }
  }
}
