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
  TILE_WIDTH: 128,
  TILE_HEIGHT: 64,
  MAP_SIZE: 12,
  TOWERS: [
    { name: 'Flower', cost: 20, damage: 10, range: 100, fireRate: 1000, key: 'flower' },
    { name: 'Monkey', cost: 40, damage: 20, range: 132, fireRate: 1500, key: 'monkey' },
    { name: 'Ghost', cost: 70, damage: 30, range: 166, fireRate: 2000, key: 'ghost' },
    { name: 'Fan', cost: 100, damage: 40, range: 200, fireRate: 2500, key: 'fan' }
  ] as TowerConfig[],
  ENEMIES: [
    { name: 'Slime', hp: 60, speed: 1.5, reward: 10, key: 'slime' },
    { name: 'Skeleton', hp: 120, speed: 1.2, reward: 20, key: 'skeleton' },
    { name: 'Bat', hp: 40, speed: 2.5, reward: 15, key: 'bat' },
  ] as EnemyConfig[],
  FUNNY_ENEMIES: [
    { name: 'Clown', hp: 85, speed: 1.4, reward: 18, key: 'clown' },
    { name: 'Frog', hp: 70, speed: 1.9, reward: 16, key: 'frog' },
    { name: 'Chicken', hp: 65, speed: 2.1, reward: 17, key: 'chicken' }
  ] as EnemyConfig[],
};
