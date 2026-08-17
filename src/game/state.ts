import classes from './data/classes.json' with { type: 'json' };
import items from './data/items.json' with { type: 'json' };
import tuning from './data/tuning.json' with { type: 'json' };
import {
  BOSS_NONE,
  CLASS_KNIGHT,
  FX_EXPLOSION,
  FX_RING,
  ITEM_OFFER_SLOTS,
  MAX_ABILITIES,
  MAX_ORBITERS,
  MAX_PIERCE_TRACKED,
  REHIT_SLOTS,
  STATUS_RUNNING,
} from './kinds.ts';
import { createPool, poolClear, type Pool } from './pool.ts';
import { createRng, type Rng } from './rng.ts';
import { createSpatialHash, type SpatialHash } from './spatial.ts';
import { recomputePlayer } from './systems/items.ts';

export type Vec2 = { x: number; y: number };

export type ClassDef = (typeof classes)[number];

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
  invulnTicks: number;
  invulnPulseTicks: number;
  invulnPulseTimer: number;
  walking: boolean;
  bobPhase: number;
  attackCooldownTicks: number;
  attackTimerTicks: number;
  attackAnimT: number;
  volleyCount: number;
  volleyShotsLeft: number;
  nextVolleyShotTick: number;
  weaponVisible: boolean;
  damageMult: number;
  cooldownMult: number;
  aoeMult: number;
  bonusPierce: number;
  pickupMult: number;
  moveSpeedMult: number;
  damageReduction: number;
  thorns: number;
  moveHaste: number;
  orbiterDamage: number;
  orbiterRadius: number;
  auraDps: number;
  auraRadius: number;
  auraSlow: number;
  pierceAll: boolean;
  shatter: boolean;
  pierceBurst: boolean;
  riposte: boolean;
  axeFirePool: boolean;
  bombCluster: boolean;
  unlimitedPickup: boolean;
  thornsDouble: boolean;
  lifesteal: boolean;
  revivesLeft: number;
  recastAbility: number;
  critChance: number;
  critMult: number;
  executeFrac: number;
  shield: number;
  shieldMax: number;
  shieldRegenTicks: number;
  shieldTimerTicks: number;
  knockback: number;
  onHitBurnDps: number;
  onHitBurnTicks: number;
  xpMult: number;
  lifeOnKill: number;
  cooldownOnKillTicks: number;
  minionCount: number;
  minionDamage: number;
  stillDamage: number;
  moveDamage: number;
  stillTicks: number;
  moveTicks: number;
  blink: boolean;
  gemBlast: boolean;
  freezeShatter: boolean;
  shieldReflect: boolean;
  burnSpread: boolean;
  sprintInvuln: boolean;
};

export type Camera = {
  pos: Vec2;
  prevX: number;
  prevY: number;
};

export type SpawnState = {
  packIndex: number;
  nextPackTick: number;
  hordeIndex: number;
  nextEliteTick: number;
  miniBossDone: boolean;
  bossDone: boolean;
  bossKilled: boolean;
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
  slowMult: number;
  slowTicks: number;
  burnDps: number;
  burnTicks: number;
  burnTimerTicks: number;
  boss: number;
};

export type Minion = {
  pos: Vec2;
  prevX: number;
  prevY: number;
  angle: number;
  damage: number;
  timerTicks: number;
};

export type Gem = {
  pos: Vec2;
  prevX: number;
  prevY: number;
  value: number;
};

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
  aoeRadius: number;
  visual: number;
  targetId: number;
  pierceLeft: number;
  hitIds: Int32Array;
  hitCount: number;
  axePhase: number;
  traveled: number;
  dwellTicksLeft: number;
  ttlTicks: number;
  shatterLeft: number;
  clusterLeft: number;
  rehitIds: Int32Array;
  rehitNextTick: Int32Array;
  rehitCount: number;
};

export type Orbiter = {
  angle: number;
  radius: number;
  damage: number;
  pos: Vec2;
  prevX: number;
  prevY: number;
  rehitIds: Int32Array;
  rehitNextTick: Int32Array;
  rehitCount: number;
};

export type Field = {
  pos: Vec2;
  radius: number;
  growPerSec: number;
  damage: number;
  damageIntervalTicks: number;
  damageTimerTicks: number;
  slowMult: number;
  pull: number;
  ttlTicks: number;
  lifeTicks: number;
  follow: boolean;
  visual: number;
};

export type Effect = {
  pos: Vec2;
  kind: number;
  ageTicks: number;
  lifeTicks: number;
  radius: number;
};

export type Ability = {
  kind: number;
  visual: number;
  intervalTicks: number;
  timerTicks: number;
  damage: number;
  radius: number;
  count: number;
  durationTicks: number;
  slowMult: number;
};

export const FIXED_DT = 1 / 60;
export const ENEMY_CAP = 256;
export const GEM_CAP = 512;
export const PROJECTILE_CAP = 192;
export const FIELD_CAP = 32;
export const EFFECT_CAP = 64;
export const MINION_CAP = 8;
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
  fields: Pool<Field>;
  effects: Pool<Effect>;
  minions: Pool<Minion>;
  orbiters: Orbiter[];
  orbiterCount: number;
  orbiterAngle: number;
  abilities: Ability[];
  abilityCount: number;
  auraField: Field;
  liveAxes: number;
  enemyHash: SpatialHash;
  spawn: SpawnState;
  xp: number;
  kills: number;
  level: number;
  xpToNext: number;
  status: number;
  presetId: number;
  itemStars: Int32Array;
  itemOffer: Int32Array;
  reviveUsed: boolean;
  recastQueued: number;
};

export const REFERENCE_SCREEN_WIDTH = 360;
export const REFERENCE_SCREEN_HEIGHT = 780;
export const DEFAULT_VIEW_WIDTH = REFERENCE_SCREEN_WIDTH / tuning.render.worldScale;
export const DEFAULT_VIEW_HEIGHT = REFERENCE_SCREEN_HEIGHT / tuning.render.worldScale;

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
    slowMult: 1,
    slowTicks: 0,
    burnDps: 0,
    burnTicks: 0,
    burnTimerTicks: 0,
    boss: BOSS_NONE,
  };
}

function createGem(): Gem {
  return { pos: { x: 0, y: 0 }, prevX: 0, prevY: 0, value: 0 };
}

function createSpawnState(): SpawnState {
  return {
    packIndex: 0,
    nextPackTick: 0,
    hordeIndex: 0,
    nextEliteTick: 0,
    miniBossDone: false,
    bossDone: false,
    bossKilled: false,
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
    invulnTicks: 0,
    invulnPulseTicks: 0,
    invulnPulseTimer: 0,
    walking: false,
    bobPhase: 0,
    attackCooldownTicks: Math.round(cls.cooldown / FIXED_DT),
    attackTimerTicks: Math.round(cls.cooldown / FIXED_DT),
    attackAnimT: 1000,
    volleyCount: 1,
    volleyShotsLeft: 0,
    nextVolleyShotTick: 0,
    weaponVisible: true,
    damageMult: 1,
    cooldownMult: 1,
    aoeMult: 1,
    bonusPierce: 0,
    pickupMult: 1,
    moveSpeedMult: 1,
    damageReduction: 0,
    thorns: 0,
    moveHaste: 0,
    orbiterDamage: 0,
    orbiterRadius: tuning.items.orbiterBaseRadius,
    auraDps: 0,
    auraRadius: 0,
    auraSlow: 1,
    pierceAll: false,
    shatter: false,
    pierceBurst: false,
    riposte: false,
    axeFirePool: false,
    bombCluster: false,
    unlimitedPickup: false,
    thornsDouble: false,
    lifesteal: false,
    revivesLeft: 0,
    recastAbility: -1,
    critChance: 0,
    critMult: 2,
    executeFrac: 0,
    shield: 0,
    shieldMax: 0,
    shieldRegenTicks: 0,
    shieldTimerTicks: 0,
    knockback: 0,
    onHitBurnDps: 0,
    onHitBurnTicks: 0,
    xpMult: 1,
    lifeOnKill: 0,
    cooldownOnKillTicks: 0,
    minionCount: 0,
    minionDamage: 0,
    stillDamage: 0,
    moveDamage: 0,
    stillTicks: 0,
    moveTicks: 0,
    blink: false,
    gemBlast: false,
    freezeShatter: false,
    shieldReflect: false,
    burnSpread: false,
    sprintInvuln: false,
  };
}

function createMinion(): Minion {
  return {
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    angle: 0,
    damage: 0,
    timerTicks: 0,
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
    aoeRadius: 0,
    visual: FX_EXPLOSION,
    targetId: 0,
    pierceLeft: 0,
    hitIds: new Int32Array(MAX_PIERCE_TRACKED),
    hitCount: 0,
    axePhase: 0,
    traveled: 0,
    dwellTicksLeft: 0,
    ttlTicks: 0,
    shatterLeft: 0,
    clusterLeft: 0,
    rehitIds: new Int32Array(REHIT_SLOTS),
    rehitNextTick: new Int32Array(REHIT_SLOTS),
    rehitCount: 0,
  };
}

function createField(): Field {
  return {
    pos: { x: 0, y: 0 },
    radius: 0,
    growPerSec: 0,
    damage: 0,
    damageIntervalTicks: 30,
    damageTimerTicks: 0,
    slowMult: 1,
    pull: 0,
    ttlTicks: 0,
    lifeTicks: 1,
    follow: false,
    visual: FX_RING,
  };
}

function createEffect(): Effect {
  return { pos: { x: 0, y: 0 }, kind: FX_EXPLOSION, ageTicks: 0, lifeTicks: 1, radius: 1 };
}

function createOrbiter(): Orbiter {
  return {
    angle: 0,
    radius: tuning.items.orbiterBaseRadius,
    damage: 0,
    pos: { x: 0, y: 0 },
    prevX: 0,
    prevY: 0,
    rehitIds: new Int32Array(REHIT_SLOTS),
    rehitNextTick: new Int32Array(REHIT_SLOTS),
    rehitCount: 0,
  };
}

function createAbility(): Ability {
  return {
    kind: 0,
    visual: FX_EXPLOSION,
    intervalTicks: 60,
    timerTicks: 60,
    damage: 0,
    radius: 0,
    count: 1,
    durationTicks: 0,
    slowMult: 1,
  };
}

function createOrbiters(): Orbiter[] {
  const list: Orbiter[] = new Array(MAX_ORBITERS);
  for (let i = 0; i < MAX_ORBITERS; i++) list[i] = createOrbiter();
  return list;
}

function createAbilities(): Ability[] {
  const list: Ability[] = new Array(MAX_ABILITIES);
  for (let i = 0; i < MAX_ABILITIES; i++) list[i] = createAbility();
  return list;
}

export function createWorld(
  seed: number,
  classId: number = CLASS_KNIGHT,
  presetId: number = 0,
): World {
  const world: World = {
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
    fields: createPool(FIELD_CAP, createField),
    effects: createPool(EFFECT_CAP, createEffect),
    minions: createPool(MINION_CAP, createMinion),
    orbiters: createOrbiters(),
    orbiterCount: 0,
    orbiterAngle: 0,
    abilities: createAbilities(),
    abilityCount: 0,
    auraField: createField(),
    liveAxes: 0,
    enemyHash: createSpatialHash(SPATIAL_CELL_SIZE, 256, ENEMY_CAP),
    spawn: createSpawnState(),
    xp: 0,
    kills: 0,
    level: 1,
    xpToNext: tuning.leveling.baseXpToLevel,
    status: STATUS_RUNNING,
    presetId,
    itemStars: new Int32Array(items.length),
    itemOffer: new Int32Array(ITEM_OFFER_SLOTS).fill(-1),
    reviveUsed: false,
    recastQueued: 0,
  };
  recomputePlayer(world);
  world.player.hp = world.player.maxHp;
  return world;
}

export function resetWorld(
  world: World,
  seed: number,
  classId: number = CLASS_KNIGHT,
  presetId: number = 0,
): void {
  world.seed = seed;
  world.presetId = presetId;
  world.rng = createRng(seed);
  world.tick = 0;
  world.time = 0;
  world.accumulator = 0;
  world.nextEntityId = 1;
  const p = world.player;
  p.classId = classId;
  p.pos.x = 0;
  p.pos.y = 0;
  p.prevX = 0;
  p.prevY = 0;
  p.moveInput.x = 0;
  p.moveInput.y = 0;
  p.facing = 1;
  p.radius = PLAYER_RADIUS;
  p.iFrameTicks = 0;
  p.invulnTicks = 0;
  p.invulnPulseTimer = 0;
  p.walking = false;
  p.bobPhase = 0;
  p.attackAnimT = 1000;
  p.volleyShotsLeft = 0;
  p.nextVolleyShotTick = 0;
  p.weaponVisible = true;
  p.hp = 1;
  world.camera.pos.x = 0;
  world.camera.pos.y = 0;
  world.camera.prevX = 0;
  world.camera.prevY = 0;
  poolClear(world.enemies);
  poolClear(world.gems);
  poolClear(world.projectiles);
  poolClear(world.fields);
  poolClear(world.effects);
  poolClear(world.minions);
  world.orbiterAngle = 0;
  for (let i = 0; i < MAX_ORBITERS; i++) world.orbiters[i].rehitCount = 0;
  world.auraField.radius = 0;
  world.auraField.damage = 0;
  world.auraField.slowMult = 1;
  world.liveAxes = 0;
  world.spawn.packIndex = 0;
  world.spawn.nextPackTick = 0;
  world.spawn.hordeIndex = 0;
  world.spawn.nextEliteTick = 0;
  world.spawn.miniBossDone = false;
  world.spawn.bossDone = false;
  world.spawn.bossKilled = false;
  world.xp = 0;
  world.kills = 0;
  world.level = 1;
  world.xpToNext = tuning.leveling.baseXpToLevel;
  world.status = STATUS_RUNNING;
  world.itemStars.fill(0);
  world.itemOffer.fill(-1);
  world.reviveUsed = false;
  world.recastQueued = 0;
  recomputePlayer(world);
  p.hp = p.maxHp;
  p.attackTimerTicks = p.attackCooldownTicks;
}
