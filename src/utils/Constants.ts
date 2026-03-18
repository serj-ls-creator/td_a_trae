export interface TowerConfig {
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  key: string;
}

export interface EnemyConfig {
  name: string;
  hp: number;
  speed: number;
  reward: number;
  key: string;
}

export interface PathPoint {
  row: number;
  col: number;
}

export const CONSTANTS = {
  TILE_WIDTH: 64,
  TILE_HEIGHT: 32,
  MAP_SIZE: 10,
  PATH_POINTS: [
    { row: 1, col: 1 },
    { row: 1, col: 8 },
    { row: 4, col: 8 },
    { row: 4, col: 1 },
    { row: 7, col: 1 },
    { row: 7, col: 8 },
    { row: 9, col: 8 }
  ] as PathPoint[],
  TOWERS: [
    { name: 'Flower', cost: 25, damage: 10, range: 50, fireRate: 1000, key: 'flower' },
    { name: 'Monkey', cost: 50, damage: 20, range: 66, fireRate: 1500, key: 'monkey' },
    { name: 'Ghost', cost: 75, damage: 30, range: 83, fireRate: 2000, key: 'ghost' },
    { name: 'Fan', cost: 100, damage: 40, range: 100, fireRate: 2500, key: 'fan' }
  ] as TowerConfig[],
  ENEMIES: [
    { name: 'Slime', hp: 60, speed: 1.5, reward: 10, key: 'slime' },
    { name: 'Skeleton', hp: 120, speed: 1.2, reward: 20, key: 'skeleton' },
    { name: 'Bat', hp: 40, speed: 2.5, reward: 15, key: 'bat' },
  ] as EnemyConfig[],
};
