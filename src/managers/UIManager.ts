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
  private pauseButtonText!: Phaser.GameObjects.Text;
  private uiLayer: Phaser.GameObjects.Container;
  private currentMoney: number = 100;
  private towerCosts: Record<string, number> = {};
  private towerPriceLadders: Record<string, number[]> = {};
  private towerPriceLevelIndex: Record<string, number> = {};

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
    CONSTANTS.TOWERS.forEach((tower) => {
      this.towerCosts[tower.key] = tower.cost;
      this.towerPriceLadders[tower.key] = [tower.cost];
      this.towerPriceLevelIndex[tower.key] = 0;
    });
    this.uiLayer = this.scene.add.container(0, 0);
    this.uiLayer.setScrollFactor(0);
    this.uiLayer.setDepth(10000);
    this.createUI();
  }

  public getUILayer() {
    return this.uiLayer;
  }

  private createButton(x: number, y: number, text: string, eventName: string, isStart: boolean, isPause: boolean = false) {
    const isDesktop = this.scene.sys.game.device.os.desktop;
    const btnW = isDesktop ? 100 : 130;
    const btnH = isDesktop ? 40 : 65;
    const fontSize = isDesktop ? '16px' : '22px';
    const borderRadius = isDesktop ? 10 : 16;

    const container = this.scene.add.container(x, y);
    this.uiLayer.add(container);
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.UI_BG_HEX, 0.6);
    bg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 1);
    bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
    bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);

    const txt = this.scene.add.text(0, 0, text, {
      fontSize: fontSize,
      color: THEME.UI_TEXT,
      fontFamily: THEME.FONT,
    } as any).setOrigin(0.5);

    if (isStart) {
      this.startButtonText = txt;
    }
    if (isPause) {
      this.pauseButtonText = txt;
    }

    container.add([bg, txt]);
    container.setInteractive(new Phaser.Geom.Rectangle(-btnW/2, -btnH/2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

    container.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      pointer.event.preventDefault();
      this.emit(eventName);
      bg.clear();
      bg.fillStyle(THEME.UI_ACCENT_HEX, 0.4);
      bg.lineStyle(isDesktop ? 3 : 4, THEME.UI_ACCENT_HEX, 1);
      bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
      bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
      this.scene.time.delayedCall(100, () => {
        bg.clear();
        bg.fillStyle(THEME.UI_BG_HEX, 0.6);
        bg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 1);
        bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
        bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
      });
    });

    container.on('pointerover', () => {
      bg.lineStyle(isDesktop ? 4 : 5, THEME.UI_ACCENT_HEX, 1);
      bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(THEME.UI_BG_HEX, 0.6);
      bg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 1);
      bg.fillRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
      bg.strokeRoundedRect(-btnW/2, -btnH/2, btnW, btnH, borderRadius);
    });

    return container;
  }

  private createUI() {
    const { width, height } = this.scene.scale;
    const isDesktop = this.scene.sys.game.device.os.desktop;
    const textStyle: any = { 
      fontSize: '48px', // Увеличено в 2 раза (было 24px)
      color: THEME.UI_TEXT,
      fontFamily: THEME.FONT
    };

    // Top Left UI
    this.moneyText = this.scene.add.text(20, 20, 'Money: $100', textStyle).setOrigin(0);
    
    // Top Right UI
    this.lifeText = this.scene.add.text(width - 20, 20, 'Bow HP: 100%', textStyle).setOrigin(1, 0);
    this.waveText = this.scene.add.text(width - 20, 80, 'Wave: 1', textStyle).setOrigin(1, 0); // Сдвинул ниже из-за размера
    this.enemiesText = this.scene.add.text(width - 20, 140, 'Enemies: 0/0', { ...textStyle, fontSize: '36px' }).setOrigin(1, 0); // Сдвинул ниже

    this.uiLayer.add([this.moneyText, this.lifeText, this.waveText, this.enemiesText]);

    // Bottom Left UI - Tower Shop
    const shopY = isDesktop ? height - 80 : height - 500;
    const shopXStart = isDesktop ? 60 : 80;
    const itemSpacing = isDesktop ? 90 : 130;
    const bgSize = isDesktop ? 80 : 110;
    const iconScale = isDesktop ? 0.7 : 1.0;
    const fontSizeShop = isDesktop ? '11px' : '14px';

    const shopBg = this.scene.add.graphics();
    this.uiLayer.add(shopBg);
    shopBg.fillStyle(THEME.UI_BG_HEX, 0.6);
    shopBg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 1);
    shopBg.fillRoundedRect(shopXStart - (bgSize/2 + 10), shopY - (bgSize/2 + 10), (CONSTANTS.TOWERS.length * itemSpacing) + 20, bgSize + 20, 15);
    shopBg.strokeRoundedRect(shopXStart - (bgSize/2 + 10), shopY - (bgSize/2 + 10), (CONSTANTS.TOWERS.length * itemSpacing) + 20, bgSize + 20, 15);

    CONSTANTS.TOWERS.forEach((tower, index) => {
      const container = this.scene.add.container(shopXStart + index * itemSpacing, shopY);
      this.uiLayer.add(container);
      
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
      bg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 0.5);
      bg.strokeRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
      
      const icon = this.scene.add.image(0, isDesktop ? -8 : -10, tower.key).setScale(iconScale);
      const nameText = this.scene.add.text(0, isDesktop ? 18 : 22, tower.name, { 
        fontSize: fontSizeShop, 
        color: THEME.UI_TEXT,
        fontFamily: THEME.FONT 
      } as any).setOrigin(0.5);
      const costText = this.scene.add.text(0, isDesktop ? 30 : 40, `$${this.getTowerCost(tower.key)}`, { 
        fontSize: fontSizeShop, 
        color: THEME.UI_ACCENT,
        fontFamily: THEME.FONT 
      } as any).setOrigin(0.5);

      container.add([bg, icon, nameText, costText]);
      container.setInteractive(new Phaser.Geom.Rectangle(-bgSize/2, -bgSize/2, bgSize, bgSize), Phaser.Geom.Rectangle.Contains);

      container.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        pointer.event.preventDefault();
        this.selectTower({ ...tower, cost: this.getTowerCost(tower.key) }, container);
      });

      this.towerButtons.push(container);
    });

    // Start and Wave Buttons (Bottom Right)
    const btnStartX = isDesktop ? width - 290 : width - 430;
    const btnPauseX = isDesktop ? width - 180 : width - 280;
    const btnWaveX = isDesktop ? width - 70 : width - 130;
    const btnY = isDesktop ? height - 80 : height - 500;

    this.createButton(btnStartX, btnY, 'START', 'startWave', true);
    this.createButton(btnPauseX, btnY, 'PAUSE', 'togglePause', false, true);
    this.createButton(btnWaveX, btnY, 'WAVE', 'nextWave', false);

    this.updateShopAvailability();
  }

  private selectTower(tower: any, container: Phaser.GameObjects.Container) {
    const currentCost = this.getTowerCost(tower.key);
    if (this.currentMoney < currentCost) {
      // Don't allow selecting expensive towers
      return;
    }
    const isDesktop = this.scene.sys.game.device.os.desktop;
    const bgSize = isDesktop ? 80 : 110;

    this.selectedTower = { ...tower, cost: currentCost };
    this.towerButtons.forEach(btn => {
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
      bg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 0.5);
      bg.strokeRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
    });

    const selectedBg = container.list[0] as Phaser.GameObjects.Graphics;
    selectedBg.lineStyle(isDesktop ? 4 : 5, THEME.UI_ACCENT_HEX, 1);
    selectedBg.strokeRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
    
    this.emit('towerSelected', tower);
  }

  public deselectTower() {
    this.selectedTower = null;
    const isDesktop = this.scene.sys.game.device.os.desktop;
    const bgSize = isDesktop ? 80 : 110;

    this.towerButtons.forEach(btn => {
      const bg = btn.list[0] as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x000000, 0.4);
      bg.fillRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
      bg.lineStyle(isDesktop ? 2 : 3, THEME.UI_BORDER_HEX, 0.5);
      bg.strokeRoundedRect(-bgSize/2, -bgSize/2, bgSize, bgSize, 10);
    });
  }

  public showConfirmation(message: string, onConfirm: () => void) {
    const { width, height } = this.scene.scale;
    
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    this.uiLayer.add(overlay);

    const dialogW = 400;
    const dialogH = 250;
    const dialogX = width / 2;
    const dialogY = height / 2;

    const dialogContainer = this.scene.add.container(dialogX, dialogY);
    this.uiLayer.add(dialogContainer);

    const bg = this.scene.add.graphics();
    bg.fillStyle(THEME.UI_BG_HEX, 0.95);
    bg.lineStyle(4, THEME.UI_BORDER_HEX, 1);
    bg.fillRoundedRect(-dialogW/2, -dialogH/2, dialogW, dialogH, 20);
    bg.strokeRoundedRect(-dialogW/2, -dialogH/2, dialogW, dialogH, 20);

    const title = this.scene.add.text(0, -60, message, {
      fontSize: '28px',
      color: THEME.UI_TEXT,
      fontFamily: THEME.FONT,
      align: 'center',
      wordWrap: { width: dialogW - 40 }
    } as any).setOrigin(0.5);

    const createConfirmBtn = (x: number, y: number, label: string, color: number, callback: () => void) => {
      const btn = this.scene.add.container(x, y);
      const bBg = this.scene.add.graphics();
      bBg.fillStyle(color, 0.8);
      bBg.fillRoundedRect(-80, -30, 160, 60, 10);
      
      const bTxt = this.scene.add.text(0, 0, label, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: THEME.FONT
      } as any).setOrigin(0.5);
      
      btn.add([bBg, bTxt]);
      btn.setInteractive(new Phaser.Geom.Rectangle(-80, -30, 160, 60), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerup', () => {
        overlay.destroy();
        dialogContainer.destroy();
        callback();
      });
      return btn;
    };

    const yesBtn = createConfirmBtn(-100, 50, 'ДА', 0x2ecc71, onConfirm);
    const noBtn = createConfirmBtn(100, 50, 'НЕТ', 0xe74c3c, () => {});

    dialogContainer.add([bg, title, yesBtn, noBtn]);
  }

  updateMoney(money: number) {
    this.currentMoney = money;
    this.moneyText.setText(`Money: $${money}`);
    this.updateShopAvailability();
  }

  private updateShopAvailability() {
    this.towerButtons.forEach((btn, index) => {
      const tower = CONSTANTS.TOWERS[index];
      const icon = btn.list[1] as Phaser.GameObjects.Image;
      const nameText = btn.list[2] as Phaser.GameObjects.Text;
      const costText = btn.list[3] as Phaser.GameObjects.Text;
      const currentCost = this.getTowerCost(tower.key);
      costText.setText(`$${currentCost}`);
      
      if (this.currentMoney < currentCost) {
        icon.setAlpha(0.3).setTint(0x555555);
        nameText.setAlpha(0.3);
        costText.setAlpha(0.3).setColor('#ff0000');
      } else {
        icon.setAlpha(1).clearTint();
        nameText.setAlpha(1);
        costText.setAlpha(1).setColor(THEME.UI_ACCENT);
      }
    });
  }

  public setTowerCost(towerKey: string, cost: number) {
    this.towerCosts[towerKey] = Math.max(1, Math.round(cost));
    const ladder = this.towerPriceLadders[towerKey];
    if (ladder && ladder.length > 0) {
      let closestIndex = 0;
      let closestDiff = Math.abs(ladder[0] - this.towerCosts[towerKey]);
      for (let i = 1; i < ladder.length; i++) {
        const diff = Math.abs(ladder[i] - this.towerCosts[towerKey]);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }
      this.towerPriceLevelIndex[towerKey] = closestIndex;
      this.towerCosts[towerKey] = ladder[closestIndex];
    }
    if (this.selectedTower?.key === towerKey) {
      this.selectedTower.cost = this.getTowerCost(towerKey);
    }
    this.updateShopAvailability();
  }

  public getTowerCost(towerKey: string) {
    return this.towerCosts[towerKey] ?? (CONSTANTS.TOWERS.find((tower) => tower.key === towerKey)?.cost ?? 0);
  }

  public setTowerPriceLadders(ladders: Record<string, number[]>) {
    Object.entries(ladders).forEach(([towerKey, ladder]) => {
      if (!ladder || ladder.length === 0) return;
      const normalized = ladder.map((value) => Math.max(1, Math.round(value)));
      this.towerPriceLadders[towerKey] = normalized;
      this.towerPriceLevelIndex[towerKey] = 0;
      this.towerCosts[towerKey] = normalized[0];
    });
    if (this.selectedTower) {
      this.selectedTower.cost = this.getTowerCost(this.selectedTower.key);
    }
    this.updateShopAvailability();
  }

  public increaseTowerPrice(towerKey: string) {
    const ladder = this.towerPriceLadders[towerKey];
    if (!ladder || ladder.length === 0) return;
    const currentIndex = this.towerPriceLevelIndex[towerKey] ?? 0;
    const nextIndex = Math.min(ladder.length - 1, currentIndex + 1);
    this.towerPriceLevelIndex[towerKey] = nextIndex;
    this.towerCosts[towerKey] = ladder[nextIndex];
    if (this.selectedTower?.key === towerKey) {
      this.selectedTower.cost = this.towerCosts[towerKey];
    }
    this.updateShopAvailability();
  }

  public decreaseTowerPrice(towerKey: string) {
    const ladder = this.towerPriceLadders[towerKey];
    if (!ladder || ladder.length === 0) return;
    const currentIndex = this.towerPriceLevelIndex[towerKey] ?? 0;
    const prevIndex = Math.max(0, currentIndex - 1);
    this.towerPriceLevelIndex[towerKey] = prevIndex;
    this.towerCosts[towerKey] = ladder[prevIndex];
    if (this.selectedTower?.key === towerKey) {
      this.selectedTower.cost = this.towerCosts[towerKey];
    }
    this.updateShopAvailability();
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

  public setPauseButtonState(paused: boolean) {
    if (this.pauseButtonText) {
      this.pauseButtonText.setText(paused ? 'RESUME' : 'PAUSE');
    }
  }

  public disableWaveButton() {
    // We can't easily find the WAVE button by variable, so we find it by text in the uiLayer
    this.uiLayer.iterate((child: any) => {
      if (child instanceof Phaser.GameObjects.Container) {
        child.iterate((subChild: any) => {
          if (subChild instanceof Phaser.GameObjects.Text && subChild.text === 'WAVE') {
            child.disableInteractive();
            child.setAlpha(0.5);
          }
        });
      }
    });
  }
}
