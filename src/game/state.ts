import { createPool, poolClear, type Pool } from './pool.ts';
import { createRng, type Rng } from './rng.ts';
import { createSpatialHash, type SpatialHash } from './spatial.ts';

export type Vec2 = { x: number; y: number };

export type Player = {
  pos: Vec2;
  prevX: number;
  prevY: number;
  moveInput: Vec2;
  facing: number;
  moveSpeed: number;
  radius: number;
  hp: number;
  maxHp: number;
  iFrames: number;
};

export type Enemy = {
  id: number;
  type: number;
  pos: Vec2;
  prevX: number;
  prevY: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  attackInterval: number;
  attackTimer: number;
  animPhase: number;
  facing: number;
};

export const ENEMY_CAP = 256;
export const PLAYER_BASE_SPEED = 70;
export const PLAYER_BASE_HP = 100;
export const PLAYER_RADIUS = 6;
export const SPATIAL_CELL_SIZE = 32;

export type World = {
  seed: number;
  rng: Rng;
  tick: number;
  time: number;
  accumulator: number;
  nextEntityId: number;
  player: Player;
  enemies: Pool<Enemy>;
  enemyHash: SpatialHash;
};

function createEnemy(): Enemy {
  return {
    id: 0,
    type: 0,
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    hp: 0,
    maxHp: 0,
    speed: 0,
    radius: 0,
    contactDamage: 0,
    attackInterval: 1,
    attackTimer: 0,
    animPhase: 0,
    facing: 1,
  };
}

function createPlayer(): Player {
  return {
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    moveInput: { x: 0, y: 0 },
    facing: 1,
    moveSpeed: PLAYER_BASE_SPEED,
    radius: PLAYER_RADIUS,
    hp: PLAYER_BASE_HP,
    maxHp: PLAYER_BASE_HP,
    iFrames: 0,
  };
}

export function createWorld(seed: number): World {
  return {
    seed,
    rng: createRng(seed),
    tick: 0,
    time: 0,
    accumulator: 0,
    nextEntityId: 1,
    player: createPlayer(),
    enemies: createPool(ENEMY_CAP, createEnemy),
    enemyHash: createSpatialHash(SPATIAL_CELL_SIZE, 256, ENEMY_CAP),
  };
}

export function resetWorld(world: World, seed: number): void {
  world.seed = seed;
  world.rng = createRng(seed);
  world.tick = 0;
  world.time = 0;
  world.accumulator = 0;
  world.nextEntityId = 1;
  const p = world.player;
  p.pos.x = 0;
  p.pos.y = 0;
  p.prevX = 0;
  p.prevY = 0;
  p.moveInput.x = 0;
  p.moveInput.y = 0;
  p.facing = 1;
  p.moveSpeed = PLAYER_BASE_SPEED;
  p.radius = PLAYER_RADIUS;
  p.hp = PLAYER_BASE_HP;
  p.maxHp = PLAYER_BASE_HP;
  p.iFrames = 0;
  poolClear(world.enemies);
}
