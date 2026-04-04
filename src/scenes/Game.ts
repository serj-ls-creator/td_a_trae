import Phaser from 'phaser';
import { CONSTANTS, TowerConfig, PathPoint } from '../utils/Constants';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { WaveManager } from '../managers/WaveManager';
import { UIManager } from '../managers/UIManager';
import { generateRandomPath } from '../utils/PathGenerator';

import { THEME } from '../utils/ThemeConfig';

interface GridCell {
  isPath: boolean;
  isOccupied: boolean;
  x: number;
  y: number;
}

export class Game extends Phaser.Scene {
  private path: Phaser.Math.Vector2[] = [];
  private pathPoints: PathPoint[] = [];
  private enemies!: Phaser.GameObjects.Group;
  private towers!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private waveManager!: WaveManager;
  private uiManager!: UIManager;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;
  private ghostTower: Phaser.GameObjects.Image | null = null;
  private ghostRange: Phaser.GameObjects.Graphics | null = null;
  private money: number = 100;
  private lives: number = 20;
  private kuromiContainer: Phaser.GameObjects.Container | null = null;
  private grid: { [key: string]: GridCell } = {};
  private tileGroup!: Phaser.GameObjects.Group;
  private worldLayer!: Phaser.GameObjects.Container;
  private decorationLayer!: Phaser.GameObjects.Container;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private isGameOver: boolean = false;

  // Pinch-to-zoom and Pan state
  private lastPinchDistance: number = 0;
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;

  constructor() {
    super('Game');
  }

  create() {
    this.isGameOver = false;
    const isDesktop = this.sys.game.device.os.desktop;
    this.cameras.main.setBackgroundColor(THEME.BACKGROUND as any);
    this.cameras.main.setZoom(isDesktop ? 0.9 : 1.4); // Увеличенный зум для мобильных устройств

    // Инициализируем группы ДО создания карты
    this.worldLayer = this.add.container(0, 0);
    this.decorationLayer = this.add.container(0, 0);
    this.decorationLayer.setDepth(20000); // Super high depth, above enemies
    
    this.enemies = this.add.group({ classType: Enemy });
    this.towers = this.add.group({ classType: Tower });
    this.projectiles = this.add.group();
    this.tileGroup = this.add.group();

    this.createIsometricMap();
    
    const { width: screenW, height: screenH } = this.scale;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    this.cameras.main.centerOn(centerX, centerY);

    this.waveManager = new WaveManager(this, this.path, this.worldLayer);
    this.uiManager = new UIManager(this);

    // Create a separate camera for UI with zoom 1
    this.uiCamera = this.cameras.add(0, 0, screenW, screenH, false, 'UI');
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);
    
    // UI camera should ignore the world containers and groups
    this.uiCamera.ignore(this.worldLayer);
    this.uiCamera.ignore(this.decorationLayer);
    this.uiCamera.ignore(this.enemies);
    this.uiCamera.ignore(this.towers);
    this.uiCamera.ignore(this.projectiles);
    
    // Main camera should ignore the UI container
    this.cameras.main.ignore(this.uiManager.getUILayer());

    // --- Input handling (Zoom and Pan) ---
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        // Pinch start
        this.lastPinchDistance = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          this.input.pointer2.x, this.input.pointer2.y
        );
      } else if (!this.ghostTower) {
        // Pan start (только если не выбрана башня)
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        // Handle Pinch Zoom
        const currentDistance = Phaser.Math.Distance.Between(
          this.input.pointer1.x, this.input.pointer1.y,
          this.input.pointer2.x, this.input.pointer2.y
        );

        if (this.lastPinchDistance > 0) {
          const zoomDelta = (currentDistance / this.lastPinchDistance);
          const newZoom = this.cameras.main.zoom * zoomDelta;
          const isDesktop = this.sys.game.device.os.desktop;
          this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.4, isDesktop ? 1.5 : 2.5));
        }
        this.lastPinchDistance = currentDistance;
      } else if (this.isPanning && pointer.isDown && !this.ghostTower) {
        // Handle Pan
        const dx = (pointer.x - this.panStartX) / this.cameras.main.zoom;
        const dy = (pointer.y - this.panStartY) / this.cameras.main.zoom;
        
        this.cameras.main.scrollX -= dx;
        this.cameras.main.scrollY -= dy;
        
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Пытаемся поставить башню только если она была видима (уже перетаскивалась)
      // и мы не находились в режиме масштабирования
      if (this.ghostTower && this.ghostTower.visible && this.lastPinchDistance === 0) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const { row, col } = this.getGridPosition(worldPoint.x, worldPoint.y);
        this.placeTower(row, col);
      }
      this.isPanning = false;
      this.lastPinchDistance = 0;
    });

    this.setupEvents();
  }

  private createIsometricMap() {
    const { width, height } = this.scale;
    const mapSize = CONSTANTS.MAP_SIZE;
    const tileW = CONSTANTS.TILE_WIDTH;
    const tileH = CONSTANTS.TILE_HEIGHT;
    this.grid = {};

    this.offsetX = width / 2;
    // Calculate offsetY to center the whole map vertically
    this.offsetY = height / 2 - (mapSize - 1) * (tileH / 2);

    // Generate dynamic path
    this.pathPoints = generateRandomPath(mapSize, 32);

    // Convert row/col points to world coordinates for waypoints
    this.path = this.pathPoints.map(p => {
      const isoX = this.offsetX + (p.col - p.row) * (tileW / 2);
      const isoY = this.offsetY + (p.col + p.row) * (tileH / 2);
      return new Phaser.Math.Vector2(isoX, isoY);
    });

    // Helper to check if a cell is part of the path
    const isPartOfPath = (row: number, col: number) => {
      return this.pathPoints.some(p => p.row === row && p.col === col);
    };

    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        const onPath = isPartOfPath(row, col);
        const isoX = this.offsetX + (col - row) * (tileW / 2);
        const isoY = this.offsetY + (col + row) * (tileH / 2);

        this.grid[`${row},${col}`] = { isPath: onPath, isOccupied: false, x: isoX, y: isoY };

        const tile = this.add.image(isoX, isoY, 'tile').setOrigin(0.5, 0.5);
        this.tileGroup.add(tile);
        this.worldLayer.add(tile);
        tile.setDepth(-1000); // Floor is always below
        tile.setInteractive();

        if (onPath) {
          tile.setTint(THEME.PATH_BASE); // Road color (#111111)
          // Removed glow for better mobile performance
          tile.on('pointerover', () => {
            tile.setTint(0xffffff); // Highlight road
          });
          tile.on('pointerout', () => {
            tile.setTint(THEME.PATH_BASE); // Restore road color
          });
        } else {
      tile.setAlpha(1);
      tile.setTint(0x60605a); // Сделал в 2 раза светлее исходного 0x30302a
      
      // Removed immediate placement on pointerdown for better mobile UX
      tile.on('pointerover', () => {
        const cell = this.grid[`${row},${col}`];
        if (cell && (cell.isOccupied || cell.isPath)) {
          tile.setTint(0xff0000).setAlpha(0.8); // Red if occupied
        } else {
          tile.setTint(THEME.TILE_NEON).setAlpha(0.8); // Purple neon if free
        }
      });
      tile.on('pointerout', () => {
        tile.setTint(0x60605a).setAlpha(1); // Restore light tint
      });
    }
      }
    }

    // Visual Debug for Path (Neon Pink) - Сначала рисуем путь
    const graphics = this.add.graphics();
    this.worldLayer.add(graphics);
    graphics.lineStyle(2, THEME.PATH_GLOW, 0.4);
    graphics.setDepth(-1001); // Ниже всех плиток (-1000)
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      if (p1 && p2) {
        graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // Spawn Procedural Decor - Затем объекты
    this.spawnObstacles();

    // Add Portal and Chest at start and end of path
    if (this.path.length > 0) {
      const startPoint = this.path[0];
      const endPoint = this.path[this.path.length - 1];
      
      if (startPoint && endPoint) {
        const portal = this.add.image(startPoint.x, startPoint.y, 'portal').setScale(1.6).setOrigin(0.5, 0.8);
        this.worldLayer.add(portal);
        portal.setDepth(portal.y);
        
        const chest = this.add.image(endPoint.x, endPoint.y, 'chest').setScale(1.6).setOrigin(0.5, 0.8);
        this.worldLayer.add(chest);
        chest.setDepth(chest.y);

        this.createKuromi(endPoint.x + 80, endPoint.y);
      }
    }
  }

  private spawnObstacles() {
    const mapSize = CONSTANTS.MAP_SIZE;
    const lastPoint = this.pathPoints[this.pathPoints.length - 1];
    if (!lastPoint) return;

    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        const cell = this.grid[`${row},${col}`];
        if (!cell || cell.isPath) continue;

        // Protection for Kuromi (last point) and surrounding area
        const distToKuromi = Math.sqrt(Math.pow(row - lastPoint.row, 2) + Math.pow(col - lastPoint.col, 2));
        if (distToKuromi < 2) continue; // Skip tiles near Kuromi

        // Total spawn chance reduced further for mobile performance
        if (Math.random() < 0.3) { 
          // 35% chance for house, rest for tree (but overall count is halved)
          if (Math.random() < 0.35) {
            this.createHouse(cell.x, cell.y);
          } else {
            this.createTree(cell.x, cell.y);
          }
          cell.isOccupied = true;
        }
      }
    }
  }

  private createHouse(x: number, y: number) {
    const container = this.add.container(x, y);
    this.decorationLayer.add(container);
    const g = this.add.graphics();
    const color = Phaser.Utils.Array.GetRandom(THEME.BUILDING_COLORS) as number;

    // Isometric Cube Base
    const w = 80;
    const h = 80;
    
    // Front face
    g.fillStyle(color, 1);
    g.fillPoints([
      { x: -w/2, y: 0 },
      { x: 0, y: h/4 },
      { x: 0, y: -h/2 },
      { x: -w/2, y: -h*0.75 }
    ], true);

    // Right face (slightly darker)
    g.fillStyle(color, 1);
    g.fillPoints([
      { x: 0, y: h/4 },
      { x: w/2, y: 0 },
      { x: w/2, y: -h*0.75 },
      { x: 0, y: -h/2 }
    ], true);
    g.fillStyle(0x000000, 0.3); // Darken overlay
    g.fillPoints([
      { x: 0, y: h/4 },
      { x: w/2, y: 0 },
      { x: w/2, y: -h*0.75 },
      { x: 0, y: -h/2 }
    ], true);

    // Top face (lighter)
    g.fillStyle(color, 1);
    g.fillPoints([
      { x: -w/2, y: -h*0.75 },
      { x: 0, y: -h },
      { x: w/2, y: -h*0.75 },
      { x: 0, y: -h/2 }
    ], true);
    g.fillStyle(0xffffff, 0.2); // Lighten overlay
    g.fillPoints([
      { x: -w/2, y: -h*0.75 },
      { x: 0, y: -h },
      { x: w/2, y: -h*0.75 },
      { x: 0, y: -h/2 }
    ], true);

    // Windows (yellow squares)
    g.fillStyle(THEME.WINDOW_YELLOW);
    g.fillRect(-24, -40, 8, 8);
    g.fillRect(-24, -20, 8, 8);
    g.fillRect(16, -40, 8, 8);
    g.fillRect(16, -20, 8, 8);

    container.add(g);
    // Depth is handled by decorationLayer
  }

  private createTree(x: number, y: number) {
    const container = this.add.container(x, y);
    this.decorationLayer.add(container);
    const g = this.add.graphics();

    // Trunk
    g.fillStyle(THEME.TREE_TRUNK);
    g.fillRect(-6, -30, 12, 30);

    // Leaves (round)
    g.fillStyle(THEME.TREE_LEAVES);
    const ly = -50;
    g.fillCircle(0, ly, 25);

    container.add(g);
    // Depth is handled by decorationLayer
  }

  private createDeathEffect(x: number, y: number) {
    const particles = this.add.particles(x, y, 'flower', {
      speed: { min: -100, max: 100 },
      scale: { start: 0.2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: [0xff00ff, 0x00ffff, 0xffffff],
      lifespan: 600,
      quantity: 10,
      emitting: false
    });
    particles.setDepth(3000);
    particles.explode();
    
    this.time.delayedCall(1000, () => particles.destroy());
  }

  private createKuromi(x: number, y: number) {
    this.kuromiContainer = this.add.container(x, y);
    this.worldLayer.add(this.kuromiContainer);
    const g = this.add.graphics();
    
    // Simple Kuromi style character
    // Hat/Head
    g.fillStyle(THEME.KUROMI_BLACK);
    g.fillEllipse(0, -20, 60, 50);
    // Ears
    g.fillTriangle(-30, -40, -10, -30, -40, -70);
    g.fillTriangle(30, -40, 10, -30, 40, -70);
    
    // Face (white area)
    g.fillStyle(0xffffff);
    g.fillEllipse(0, -10, 40, 30);
    
    // Eyes
    g.fillStyle(THEME.KUROMI_BLACK);
    g.fillCircle(-12, -12, 4);
    g.fillCircle(12, -12, 4);
    
    // Body/Dress
    g.fillStyle(THEME.KUROMI_PURPLE);
    g.fillTriangle(-20, 0, 20, 0, 0, 40);
    
    // Skull on hat
    g.fillStyle(THEME.KUROMI_PINK);
    g.fillCircle(0, -36, 8);
    
    this.kuromiContainer.add(g);
    this.kuromiContainer.setDepth(y);
    if (g.postFX) g.postFX.addGlow(THEME.UI_ACCENT, 1, 0);
  }

  private setupEvents() {
    this.waveManager.on('waveStart', (wave: number) => {
      this.uiManager.updateWave(wave);
      this.uiManager.updateWaveProgress(0, wave * 5);
    });

    this.waveManager.on('waveProgress', (spawned: number, total: number) => {
      this.uiManager.updateWaveProgress(spawned, total);
    });

    this.waveManager.on('enemySpawned', (enemy: Enemy) => {
      this.enemies.add(enemy);
      enemy.on('killed', () => {
        this.createDeathEffect(enemy.x, enemy.y);
      });
    });

    this.waveManager.on('enemyKilled', (reward: number) => {
      this.money += reward;
      this.uiManager.updateMoney(this.money);
    });

    this.waveManager.on('enemyReachedEnd', () => {
      // Each enemy reduces lives (bow HP) by 20%
      this.lives -= 4; // 20% of 20 lives
      this.uiManager.updateLives(this.lives);
      
      // Feedback effect for Kuromi
      if (this.kuromiContainer) {
        this.tweens.add({
          targets: this.kuromiContainer,
          scale: 1.3,
          duration: 100,
          yoyo: true,
          ease: 'Power2'
        });
        this.cameras.main.shake(100, 0.005);
      }

      if (this.lives <= 0) {
        this.lives = 0;
        this.uiManager.updateLives(0);
        this.gameOver();
      }
    });

    this.waveManager.on('allWavesComplete', () => {
      this.gameWin();
    });

    this.uiManager.on('towerSelected', (tower: any) => {
      this.updateGhostTower(tower);
    });

    this.uiManager.on('startWave', () => {
      // START / ЗАНОВО button: restarts the game if already started
      if (this.isGameOver || this.waveManager.getCurrentWave() > 0) {
        this.uiManager.showConfirmation('Начать заново?', () => {
          this.scene.start('Game');
        });
        return;
      }
      this.waveManager.startNextWave();
      this.uiManager.setStartButtonToRestart();
    });

    this.uiManager.on('nextWave', () => {
      // WAVE button: always starts the next wave
      if (this.waveManager.getCurrentWave() < 10) {
        this.waveManager.startNextWave();
        this.uiManager.setStartButtonToRestart();
        if (this.waveManager.getCurrentWave() === 10) {
          this.uiManager.disableWaveButton();
        }
      }
    });
  }

  private updateGhostTower(tower: any) {
    if (this.ghostTower) {
      this.ghostTower.destroy();
    }
    if (this.ghostRange) {
      this.ghostRange.destroy();
    }
    
    this.ghostTower = this.add.image(0, 0, tower.key).setAlpha(0.5).setOrigin(0.5, 0.8).setScale(1.6);
    this.worldLayer.add(this.ghostTower);
    this.ghostTower.setVisible(false);
    this.ghostTower.setDepth(2001);
    
    this.ghostRange = this.add.graphics();
    this.worldLayer.add(this.ghostRange);
    this.ghostRange.lineStyle(2, THEME.TILE_NEON, 0.4);
    this.ghostRange.strokeCircle(0, 0, tower.range);
    this.ghostRange.setVisible(false);
    this.ghostRange.setDepth(2000);
  }

  private placeTower(row: number, col: number) {
    const towerConfig: TowerConfig | null = this.uiManager.selectedTower;
    if (!towerConfig) return;

    const cell = this.grid[`${row},${col}`];
    if (!cell || cell.isOccupied || cell.isPath) {
      // Visual feedback for failed placement (could add a sound here)
      return;
    }

    if (this.money >= towerConfig.cost) {
      this.money -= towerConfig.cost;
      this.uiManager.updateMoney(this.money);

      const tower = new Tower(this, cell.x, cell.y, towerConfig.key, towerConfig, this.worldLayer);
      this.towers.add(tower);
      cell.isOccupied = true;
      
      // Clear ghost tower
      this.ghostTower?.destroy();
      this.ghostRange?.destroy();
      this.ghostTower = null;
      this.ghostRange = null;
      this.uiManager.deselectTower();
    }
  }

  private getGridPosition(worldX: number, worldY: number) {
    const tileW = CONSTANTS.TILE_WIDTH;
    const tileH = CONSTANTS.TILE_HEIGHT;

    const dx = worldX - this.offsetX;
    const dy = worldY - this.offsetY;

    const col = Math.round((dy / (tileH / 2) + dx / (tileW / 2)) / 2);
    const row = Math.round((dy / (tileH / 2) - dx / (tileW / 2)) / 2);

    return { row, col };
  }

  update(time: number) {
    if (this.ghostTower && this.ghostRange) {
      const pointer = this.input.activePointer;
      
      // Skip ghost tower if we are panning or pinching
      if (this.isPanning || (this.input.pointer1.isDown && this.input.pointer2.isDown)) {
        this.ghostTower.setVisible(false);
        this.ghostRange.setVisible(false);
      } else {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.ghostTower.setPosition(worldPoint.x, worldPoint.y);
        this.ghostTower.setVisible(true);
        
        this.ghostRange.setPosition(worldPoint.x, worldPoint.y);
        this.ghostRange.setVisible(true);
      }
    }

    this.enemies.getChildren().forEach((enemy: any) => enemy.update());
    this.towers.getChildren().forEach((tower: any) => {
      tower.update(time, this.enemies.getChildren() as Enemy[], this.projectiles);
    });
    this.projectiles.getChildren().forEach((projectile: any) => projectile.update());

    // Safety check for win condition (if event was missed)
    if (!this.isGameOver && this.waveManager.getCurrentWave() === 10 && 
        this.waveManager.isWaveComplete() && this.enemies.getLength() === 0) {
      this.gameWin();
    }
  }

  private gameWin() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    const { width, height } = this.scale;
    
    // Create overlay first
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(200000);
    const winText = this.add.text(width / 2, height / 2, 'YOU WIN!', { 
      fontSize: '64px', 
      color: '#0f0',
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(200001);

    const restartBtn = this.add.text(width / 2, height / 2 + 80, 'Заново', { 
      fontSize: '32px', 
      color: '#fff',
      backgroundColor: THEME.UI_BG,
      padding: { x: 20, y: 10 },
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(200001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('Game');
      });

    // Pause physics and events, but NOT the scene so the button remains interactive
    this.physics.pause();
    this.time.removeAllEvents();
    
    // Fix UI in game over/win
    overlay.setScrollFactor(0);
    winText.setScrollFactor(0);
    restartBtn.setScrollFactor(0);
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    const { width, height } = this.scale;
    
    // Create overlay first
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(200000);
    const loseText = this.add.text(width / 2, height / 2, 'GAME OVER', { 
      fontSize: '64px', 
      color: '#f00',
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(200001);

    const restartBtn = this.add.text(width / 2, height / 2 + 80, 'Заново', { 
      fontSize: '32px', 
      color: '#fff',
      backgroundColor: THEME.UI_BG,
      padding: { x: 20, y: 10 },
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(200001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('Game');
      });

    // Pause physics and events
    this.physics.pause();
    this.time.removeAllEvents();

    overlay.setScrollFactor(0);
    loseText.setScrollFactor(0);
    restartBtn.setScrollFactor(0);
  }
}
