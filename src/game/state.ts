import classes from './data/classes.json' with { type: 'json' };
import { createPool, poolClear, type Pool } from './pool.ts';
import { createRng, type Rng } from './rng.ts';
import { createSpatialHash, type SpatialHash } from './spatial.ts';

export type Vec2 = { x: number; y: number };

export type ClassDef = (typeof classes)[number];

export const CLASS_WIZARD = 0;
export const CLASS_KNIGHT = 1;
export const CLASS_DWARF = 2;
export const CLASS_PRIEST = 3;

export type Player = {
  classId: number;
  pos: Vec2;
  prevX: number;
  prevY: number;
  moveInput: Vec2;
  facing: number;
  moveSpeed: number;
  radius: number;
  hp: number;
  maxHp: number;
  iFrameTicks: number;
  walking: boolean;
  bobPhase: number;
  attackCooldownTicks: number;
  attackTimerTicks: number;
  attackAnimT: number;
  volleyCount: number;
  volleyShotsLeft: number;
  nextVolleyShotTick: number;
  weaponVisible: boolean;
};

export type Camera = {
  pos: Vec2;
  prevX: number;
  prevY: number;
};

export type SpawnState = {
  accumulator: number;
  bracketIndex: number;
  nextBurstTick: number;
  nextEliteTick: number;
  nextBossTick: number;
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
  attackIntervalTicks: number;
  attackTimerTicks: number;
  animPhase: number;
  facing: number;
  xp: number;
  scale: number;
};

export type Gem = {
  pos: Vec2;
  prevX: number;
  prevY: number;
  value: number;
};

export const PROJ_FIREBALL = 0;
export const PROJ_SWORD = 1;
export const PROJ_AXE = 2;
export const PROJ_MISSILE = 3;

export const AXE_PHASE_OUT = 0;
export const AXE_PHASE_DWELL = 1;
export const AXE_PHASE_RETURN = 2;

export const MAX_PIERCE_TRACKED = 16;
export const REHIT_SLOTS = 32;

export type Projectile = {
  id: number;
  kind: number;
  pos: Vec2;
  prevX: number;
  prevY: number;
  dirX: number;
  dirY: number;
  speed: number;
  angle: number;
  damage: number;
  radius: number;
  targetId: number;
  pierceLeft: number;
  hitIds: Int32Array;
  hitCount: number;
  axePhase: number;
  traveled: number;
  dwellTicksLeft: number;
  ttlTicks: number;
  rehitIds: Int32Array;
  rehitNextTick: Int32Array;
  rehitCount: number;
};

export type Orb = {
  active: boolean;
  angle: number;
  pos: Vec2;
  prevX: number;
  prevY: number;
  rehitIds: Int32Array;
  rehitNextTick: Int32Array;
  rehitCount: number;
};

export const FIXED_DT = 1 / 60;
export const ENEMY_CAP = 256;
export const GEM_CAP = 512;
export const PROJECTILE_CAP = 128;
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
  camera: Camera;
  viewWidth: number;
  viewHeight: number;
  enemies: Pool<Enemy>;
  gems: Pool<Gem>;
  projectiles: Pool<Projectile>;
  orb: Orb;
  liveAxes: number;
  enemyHash: SpatialHash;
  spawn: SpawnState;
  xp: number;
  kills: number;
};

export const DEFAULT_VIEW_WIDTH = 360;
export const DEFAULT_VIEW_HEIGHT = 780;

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
    attackIntervalTicks: 60,
    attackTimerTicks: 0,
    animPhase: 0,
    facing: 1,
    xp: 0,
    scale: 1,
  };
}

function createGem(): Gem {
  return { pos: { x: 0, y: 0 }, prevX: 0, prevY: 0, value: 0 };
}

function createSpawnState(): SpawnState {
  return {
    accumulator: 0,
    bracketIndex: 0,
    nextBurstTick: 0,
    nextEliteTick: 0,
    nextBossTick: 0,
  };
}

function createPlayer(classId: number): Player {
  const cls = classes[classId];
  return {
    classId,
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    moveInput: { x: 0, y: 0 },
    facing: 1,
    moveSpeed: cls.moveSpeed,
    radius: PLAYER_RADIUS,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
    iFrameTicks: 0,
    walking: false,
    bobPhase: 0,
    attackCooldownTicks: Math.round(cls.cooldown / FIXED_DT),
    attackTimerTicks: Math.round(cls.cooldown / FIXED_DT),
    attackAnimT: 1000,
    volleyCount: 1,
    volleyShotsLeft: 0,
    nextVolleyShotTick: 0,
    weaponVisible: true,
  };
}

function createProjectile(): Projectile {
  return {
    id: 0,
    kind: 0,
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    dirX: 1,
    dirY: 0,
    speed: 0,
    angle: 0,
    damage: 0,
    radius: 0,
    targetId: 0,
    pierceLeft: 0,
    hitIds: new Int32Array(MAX_PIERCE_TRACKED),
    hitCount: 0,
    axePhase: 0,
    traveled: 0,
    dwellTicksLeft: 0,
    ttlTicks: 0,
    rehitIds: new Int32Array(REHIT_SLOTS),
    rehitNextTick: new Int32Array(REHIT_SLOTS),
    rehitCount: 0,
  };
}

function createOrb(active: boolean): Orb {
  return {
    active,
    angle: 0,
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    rehitIds: new Int32Array(REHIT_SLOTS),
    rehitNextTick: new Int32Array(REHIT_SLOTS),
    rehitCount: 0,
  };
}

export function createWorld(seed: number, classId: number = CLASS_KNIGHT): World {
  return {
    seed,
    rng: createRng(seed),
    tick: 0,
    time: 0,
    accumulator: 0,
    nextEntityId: 1,
    player: createPlayer(classId),
    camera: { pos: { x: 0, y: 0 }, prevX: 0, prevY: 0 },
    viewWidth: DEFAULT_VIEW_WIDTH,
    viewHeight: DEFAULT_VIEW_HEIGHT,
    enemies: createPool(ENEMY_CAP, createEnemy),
    gems: createPool(GEM_CAP, createGem),
    projectiles: createPool(PROJECTILE_CAP, createProjectile),
    orb: createOrb(classId === CLASS_PRIEST),
    liveAxes: 0,
    enemyHash: createSpatialHash(SPATIAL_CELL_SIZE, 256, ENEMY_CAP),
    spawn: createSpawnState(),
    xp: 0,
    kills: 0,
  };
}

export function resetWorld(world: World, seed: number, classId: number = CLASS_KNIGHT): void {
  world.seed = seed;
  world.rng = createRng(seed);
  world.tick = 0;
  world.time = 0;
  world.accumulator = 0;
  world.nextEntityId = 1;
  const cls = classes[classId];
  const p = world.player;
  p.classId = classId;
  p.pos.x = 0;
  p.pos.y = 0;
  p.prevX = 0;
  p.prevY = 0;
  p.moveInput.x = 0;
  p.moveInput.y = 0;
  p.facing = 1;
  p.moveSpeed = cls.moveSpeed;
  p.radius = PLAYER_RADIUS;
  p.hp = cls.maxHp;
  p.maxHp = cls.maxHp;
  p.iFrameTicks = 0;
  p.walking = false;
  p.bobPhase = 0;
  p.attackCooldownTicks = Math.round(cls.cooldown / FIXED_DT);
  p.attackTimerTicks = Math.round(cls.cooldown / FIXED_DT);
  p.attackAnimT = 1000;
  p.volleyCount = 1;
  p.volleyShotsLeft = 0;
  p.nextVolleyShotTick = 0;
  p.weaponVisible = true;
  world.camera.pos.x = 0;
  world.camera.pos.y = 0;
  world.camera.prevX = 0;
  world.camera.prevY = 0;
  poolClear(world.enemies);
  poolClear(world.gems);
  poolClear(world.projectiles);
  world.orb.active = classId === CLASS_PRIEST;
  world.orb.angle = 0;
  world.orb.pos.x = 0;
  world.orb.pos.y = 0;
  world.orb.prevX = 0;
  world.orb.prevY = 0;
  world.orb.rehitCount = 0;
  world.liveAxes = 0;
  world.spawn.accumulator = 0;
  world.spawn.bracketIndex = 0;
  world.spawn.nextBurstTick = 0;
  world.spawn.nextEliteTick = 0;
  world.spawn.nextBossTick = 0;
  world.xp = 0;
  world.kills = 0;
}
