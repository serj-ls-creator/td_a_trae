import Phaser from 'phaser';
import { CONSTANTS, TowerConfig } from '../utils/Constants';
import { Enemy } from '../entities/Enemy';
import { Tower } from '../entities/Tower';
import { WaveManager } from '../managers/WaveManager';
import { UIManager } from '../managers/UIManager';

import { THEME } from '../utils/ThemeConfig';

interface GridCell {
  isPath: boolean;
  isOccupied: boolean;
  x: number;
  y: number;
}

export class Game extends Phaser.Scene {
  private path: Phaser.Math.Vector2[] = [];
  private enemies!: Phaser.GameObjects.Group;
  private towers!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private waveManager!: WaveManager;
  private uiManager!: UIManager;
  private ghostTower: Phaser.GameObjects.Image | null = null;
  private ghostRange: Phaser.GameObjects.Graphics | null = null;
  private money: number = 100;
  private lives: number = 20;
  private kuromiContainer: Phaser.GameObjects.Container | null = null;
  private grid: { [key: string]: GridCell } = {};

  private isGameOver: boolean = false;

  constructor() {
    super('Game');
  }

  create() {
    this.isGameOver = false;
    this.cameras.main.setBackgroundColor(THEME.BACKGROUND as any);
    this.createIsometricMap();
    this.enemies = this.add.group({ classType: Enemy });
    this.towers = this.add.group({ classType: Tower });
    this.projectiles = this.add.group();

    this.waveManager = new WaveManager(this, this.path);
    this.uiManager = new UIManager(this);

    this.setupEvents();
  }

  private createIsometricMap() {
    const { width, height } = this.scale;
    const mapSize = CONSTANTS.MAP_SIZE;
    const tileW = CONSTANTS.TILE_WIDTH;
    const tileH = CONSTANTS.TILE_HEIGHT;
    this.grid = {};

    const offsetX = width / 2;
    const offsetY = height / 4;

    // Convert row/col points to world coordinates for waypoints
    this.path = CONSTANTS.PATH_POINTS.map(p => {
      const isoX = offsetX + (p.col - p.row) * (tileW / 2);
      const isoY = offsetY + (p.col + p.row) * (tileH / 2);
      return new Phaser.Math.Vector2(isoX, isoY);
    });

    // Helper to check if a cell is part of the path segments
    const isPartOfPath = (row: number, col: number) => {
      for (let i = 0; i < CONSTANTS.PATH_POINTS.length - 1; i++) {
        const p1 = CONSTANTS.PATH_POINTS[i];
        const p2 = CONSTANTS.PATH_POINTS[i + 1];
        if (p1.row === p2.row) { // horizontal segment
          if (row === p1.row && col >= Math.min(p1.col, p2.col) && col <= Math.max(p1.col, p2.col)) return true;
        } else if (p1.col === p2.col) { // vertical segment
          if (col === p1.col && row >= Math.min(p1.row, p2.row) && row <= Math.max(p1.row, p2.row)) return true;
        }
      }
      return false;
    };

    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        const onPath = isPartOfPath(row, col);
        const isoX = offsetX + (col - row) * (tileW / 2);
        const isoY = offsetY + (col + row) * (tileH / 2);

        this.grid[`${row},${col}`] = { isPath: onPath, isOccupied: false, x: isoX, y: isoY };

        const tile = this.add.image(isoX, isoY, 'tile').setOrigin(0.5, 0.5);
        tile.setDepth(-1000); // Floor is always below
        tile.setInteractive();

        if (onPath) {
          tile.setTint(THEME.PATH_BASE); // Road color
          if (tile.postFX) {
            tile.postFX.addGlow(THEME.PATH_GLOW, 1, 0);
          }
          tile.on('pointerover', () => {
            tile.setTint(0xffffff); // Highlight road
          });
          tile.on('pointerout', () => {
            tile.setTint(THEME.PATH_BASE); // Restore road color
          });
        } else {
      tile.clearTint(); // Clear any previous tint to show original #30302a texture
      tile.setAlpha(1); // Ensure full visibility
      tile.on('pointerdown', () => this.placeTower(row, col));
      tile.on('pointerover', () => {
        const cell = this.grid[`${row},${col}`];
        if (cell && (cell.isOccupied || cell.isPath)) {
          tile.setTint(0xff0000).setAlpha(0.8); // Red if occupied
        } else {
          tile.setTint(THEME.TILE_NEON).setAlpha(0.8); // Purple neon if free
        }
      });
      tile.on('pointerout', () => {
        tile.clearTint().setAlpha(1); // Restore original #30302a ground
      });
    }
      }
    }

    // Spawn Procedural Decor
    this.spawnObstacles();

    // Visual Debug for Path (Neon Pink)
    const graphics = this.add.graphics();
    graphics.lineStyle(2, THEME.PATH_GLOW, 0.4);
    graphics.setDepth(-500);
    for (let i = 0; i < this.path.length - 1; i++) {
      const p1 = this.path[i];
      const p2 = this.path[i + 1];
      if (p1 && p2) {
        graphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // Add Portal and Chest at start and end of path
    if (this.path.length > 0) {
      const startPoint = this.path[0];
      const endPoint = this.path[this.path.length - 1];
      
      if (startPoint && endPoint) {
        const portal = this.add.image(startPoint.x, startPoint.y, 'portal').setScale(0.8).setOrigin(0.5, 0.8);
        portal.setDepth(portal.y);
        if (portal.postFX) portal.postFX.addGlow(THEME.UI_ACCENT, 2, 0);
        
        const chest = this.add.image(endPoint.x, endPoint.y, 'chest').setScale(0.8).setOrigin(0.5, 0.8);
        chest.setDepth(chest.y);
        if (chest.postFX) chest.postFX.addGlow(THEME.UI_ACCENT, 2, 0);

        this.createKuromi(endPoint.x + 40, endPoint.y);
      }
    }
  }

  private spawnObstacles() {
    const mapSize = CONSTANTS.MAP_SIZE;
    const lastPoint = CONSTANTS.PATH_POINTS[CONSTANTS.PATH_POINTS.length - 1];
    if (!lastPoint) return;

    for (let row = 0; row < mapSize; row++) {
      for (let col = 0; col < mapSize; col++) {
        const cell = this.grid[`${row},${col}`];
        if (!cell || cell.isPath) continue;

        // Protection for Kuromi (last point) and surrounding area
        const distToKuromi = Math.sqrt(Math.pow(row - lastPoint.row, 2) + Math.pow(col - lastPoint.col, 2));
        if (distToKuromi < 2) continue; // Skip tiles near Kuromi

        // Total spawn chance reduced by half (from 0.95 to 0.47) to reduce plant count
        if (Math.random() < 0.47) { 
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
    const g = this.add.graphics();
    const color = Phaser.Utils.Array.GetRandom(THEME.BUILDING_COLORS) as number;

    // Isometric Cube Base
    const w = 40;
    const h = 40;
    
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
    g.fillRect(-12, -20, 4, 4);
    g.fillRect(-12, -10, 4, 4);
    g.fillRect(8, -20, 4, 4);
    g.fillRect(8, -10, 4, 4);

    container.add(g);
    container.setDepth(y);
  }

  private createTree(x: number, y: number) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();

    // Trunk
    g.fillStyle(THEME.TREE_TRUNK);
    g.fillRect(-3, -15, 6, 15);

    // Leaves (isometric diamond)
    g.fillStyle(THEME.TREE_LEAVES);
    const w = 30;
    const h = 20;
    const ly = -25;
    g.fillPoints([
      { x: 0, y: ly - h/2 },
      { x: w/2, y: ly },
      { x: 0, y: ly + h/2 },
      { x: -w/2, y: ly }
    ], true);

    container.add(g);
    container.setDepth(y);
  }

  private createKuromi(x: number, y: number) {
    this.kuromiContainer = this.add.container(x, y);
    const g = this.add.graphics();
    
    // Simple Kuromi style character
    // Hat/Head
    g.fillStyle(THEME.KUROMI_BLACK);
    g.fillEllipse(0, -10, 30, 25);
    // Ears
    g.fillTriangle(-15, -20, -5, -15, -20, -35);
    g.fillTriangle(15, -20, 5, -15, 20, -35);
    
    // Face (white area)
    g.fillStyle(0xffffff);
    g.fillEllipse(0, -5, 20, 15);
    
    // Eyes
    g.fillStyle(THEME.KUROMI_BLACK);
    g.fillCircle(-6, -6, 2);
    g.fillCircle(6, -6, 2);
    
    // Body/Dress
    g.fillStyle(THEME.KUROMI_PURPLE);
    g.fillTriangle(-10, 0, 10, 0, 0, 20);
    
    // Skull on hat
    g.fillStyle(THEME.KUROMI_PINK);
    g.fillCircle(0, -18, 4);
    
    this.kuromiContainer.add(g);
    this.kuromiContainer.setDepth(y);
    if (g.postFX) g.postFX.addGlow(THEME.UI_ACCENT, 1, 0);
  }

  private setupEvents() {
    this.waveManager.on('waveStart', (wave: number) => {
      this.uiManager.updateWave(wave);
    });

    this.waveManager.on('enemySpawned', (enemy: Enemy) => {
      this.enemies.add(enemy);
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
        this.scene.start('Game');
        return;
      }
      this.waveManager.startNextWave();
      this.uiManager.setStartButtonToRestart();
    });

    this.uiManager.on('nextWave', () => {
      // WAVE button: always starts the next wave
      this.waveManager.startNextWave();
      this.uiManager.setStartButtonToRestart();
    });
  }

  private updateGhostTower(tower: any) {
    if (this.ghostTower) {
      this.ghostTower.destroy();
    }
    if (this.ghostRange) {
      this.ghostRange.destroy();
    }
    
    this.ghostTower = this.add.image(0, 0, tower.key).setAlpha(0.5).setOrigin(0.5, 0.8).setScale(0.8);
    this.ghostTower.setVisible(false);
    this.ghostTower.setDepth(2001);
    
    this.ghostRange = this.add.graphics();
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

      const tower = new Tower(this, cell.x, cell.y, towerConfig.key, towerConfig);
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

  update(time: number) {
    if (this.ghostTower && this.ghostRange) {
      const pointer = this.input.activePointer;
      this.ghostTower.setPosition(pointer.worldX, pointer.worldY);
      this.ghostTower.setVisible(true);
      
      this.ghostRange.setPosition(pointer.worldX, pointer.worldY);
      this.ghostRange.setVisible(true);
    }

    this.enemies.getChildren().forEach((enemy: any) => enemy.update());
    this.towers.getChildren().forEach((tower: any) => {
      tower.update(time, this.enemies.getChildren() as Enemy[], this.projectiles);
    });
    this.projectiles.getChildren().forEach((projectile: any) => projectile.update());
  }

  private gameWin() {
    this.isGameOver = true;
    const { width, height } = this.scale;
    
    // Create overlay first
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(2000);
    this.add.text(width / 2, height / 2, 'YOU WIN!', { 
      fontSize: '64px', 
      color: '#0f0',
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(2001);

    this.add.text(width / 2, height / 2 + 80, 'Заново', { 
      fontSize: '32px', 
      color: '#fff',
      backgroundColor: THEME.UI_BG,
      padding: { x: 20, y: 10 },
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(2001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('Game');
      });

    // Pause physics and events, but NOT the scene so the button remains interactive
    this.physics.pause();
    this.time.removeAllEvents();
  }

  private gameOver() {
    this.isGameOver = true;
    const { width, height } = this.scale;
    
    // Create overlay first
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(2000);
    this.add.text(width / 2, height / 2, 'GAME OVER', { 
      fontSize: '64px', 
      color: '#f00',
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(2001);

    this.add.text(width / 2, height / 2 + 80, 'Заново', { 
      fontSize: '32px', 
      color: '#fff',
      backgroundColor: THEME.UI_BG,
      padding: { x: 20, y: 10 },
      fontFamily: THEME.FONT
    } as any).setOrigin(0.5).setDepth(2001)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('Game');
      });

    // Pause physics and events
    this.physics.pause();
    this.time.removeAllEvents();
  }
}
