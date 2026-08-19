import waves from '../data/waves.json' with { type: 'json' };
import { initEnemy, spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import { MONSTER_IDS, MONSTER_STATS } from '../entities/monsterTypes.ts';
import { BOSS_FINAL, BOSS_MINI, BOSS_NONE } from '../kinds.ts';
import { nextFloat, nextInt } from '../rng.ts';
import { ENEMY_CAP, FIXED_DT, type Enemy, type World } from '../state.ts';

type Pack = {
  untilTick: number;
  intervalTicks: number;
  packSize: number;
  arcRad: number;
  typeIndices: number[];
  cumulativeWeights: number[];
  totalWeight: number;
  hpScale: number;
  speedScale: number;
};

function monsterIndex(id: string): number {
  const index = (MONSTER_IDS as readonly string[]).indexOf(id);
  if (index < 0) throw new Error(`waves.json references unknown monster ${id}`);
  return index;
}

const PACKS: Pack[] = waves.packs.map((p) => {
  const cumulative: number[] = [];
  let total = 0;
  for (const w of p.weights) {
    total += w;
    cumulative.push(total);
  }
  return {
    untilTick: Math.round(p.untilSeconds / FIXED_DT),
    intervalTicks: Math.max(1, Math.round(p.intervalSeconds / FIXED_DT)),
    packSize: p.packSize,
    arcRad: (p.arcDegrees * Math.PI) / 180,
    typeIndices: p.types.map(monsterIndex),
    cumulativeWeights: cumulative,
    totalWeight: total,
    hpScale: p.hpScale,
    speedScale: p.speedScale,
  };
});

const HORDE_TICKS = waves.hordes.map((h) => Math.round(h.atSeconds / FIXED_DT));
const ELITE_FIRST_TICK = Math.round(waves.elite.firstSeconds / FIXED_DT);
const ELITE_INTERVAL_TICKS = Math.round(waves.elite.intervalSeconds / FIXED_DT);
const MINI_BOSS_TICK = Math.round(waves.miniBoss.atSeconds / FIXED_DT);
const BOSS_TICK = Math.round(waves.boss.atSeconds / FIXED_DT);
const MINI_BOSS_TYPE = monsterIndex(waves.miniBoss.type);
const BOSS_TYPE = monsterIndex(waves.boss.type);
export const RUN_TICKS = Math.round(waves.runSeconds / FIXED_DT);
export const CONCURRENT_CAP = Math.min(waves.concurrentCap, ENEMY_CAP);

export function spawnRingRadius(world: World): number {
  const halfW = world.viewWidth / 2;
  const halfH = world.viewHeight / 2;
  return Math.sqrt(halfW * halfW + halfH * halfH) + waves.spawnRingMargin;
}

function currentPack(world: World): Pack {
  const spawn = world.spawn;
  while (spawn.packIndex < PACKS.length - 1 && world.tick >= PACKS[spawn.packIndex].untilTick) {
    spawn.packIndex++;
  }
  return PACKS[spawn.packIndex];
}

function pickPackType(world: World, pack: Pack): number {
  const roll = nextFloat(world.rng) * pack.totalWeight;
  for (let i = 0; i < pack.cumulativeWeights.length; i++) {
    if (roll < pack.cumulativeWeights[i]) return pack.typeIndices[i];
  }
  return pack.typeIndices[pack.typeIndices.length - 1];
}

function farthestEnemyIndex(world: World): number {
  const p = world.player;
  let farthest = 0;
  let bestD2 = -1;
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
    if (e.boss !== BOSS_NONE) continue;
    const dx = e.pos.x - p.pos.x;
    const dy = e.pos.y - p.pos.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > bestD2) {
      bestD2 = d2;
      farthest = i;
    }
  }
  return farthest;
}

function spawnAt(
  world: World,
  stats: EnemyStats,
  angle: number,
  ringRadius: number,
  hpScale: number,
  speedScale: number,
  hpMult: number,
  damageMult: number,
  xpMult: number,
  speedMult: number,
  scale: number,
  boss: number,
): Enemy | null {
  const x = world.camera.pos.x + Math.cos(angle) * ringRadius;
  const y = world.camera.pos.y + Math.sin(angle) * ringRadius;
  const phase = nextFloat(world.rng);
  let enemy: Enemy | null;
  if (world.enemies.count >= CONCURRENT_CAP) {
    enemy = world.enemies.items[farthestEnemyIndex(world)];
    initEnemy(world, enemy, stats, x, y, phase);
  } else {
    enemy = spawnEnemy(world, stats, x, y, phase);
    if (enemy === null) return null;
  }
  enemy.hp = Math.round(stats.hp * hpScale * hpMult * world.mapHpMult);
  enemy.maxHp = enemy.hp;
  enemy.speed = stats.speed * speedScale * speedMult * world.mapSpeedMult;
  enemy.contactDamage = stats.damage * damageMult;
  enemy.xp = stats.xp * xpMult;
  enemy.scale = scale;
  enemy.radius = stats.radius * scale;
  enemy.boss = boss;
  return enemy;
}

function spawnPack(world: World, pack: Pack): void {
  const ring = spawnRingRadius(world);
  const baseAngle = nextFloat(world.rng) * Math.PI * 2;
  const type = pickPackType(world, pack);
  for (let i = 0; i < pack.packSize; i++) {
    const angle = baseAngle + (nextFloat(world.rng) - 0.5) * pack.arcRad;
    const radius = ring + nextFloat(world.rng) * 24;
    spawnAt(
      world,
      MONSTER_STATS[type],
      angle,
      radius,
      pack.hpScale,
      pack.speedScale,
      1,
      1,
      1,
      1,
      1,
      BOSS_NONE,
    );
  }
}

function spawnHorde(world: World, hordeIndex: number, pack: Pack): void {
  const horde = waves.hordes[hordeIndex];
  const ring = spawnRingRadius(world) + horde.ringMargin;
  for (let i = 0; i < horde.count; i++) {
    const angle = (i / horde.count) * Math.PI * 2 + nextFloat(world.rng) * 0.05;
    const type = pickPackType(world, pack);
    spawnAt(
      world,
      MONSTER_STATS[type],
      angle,
      ring,
      horde.hpScale,
      horde.speedScale,
      1,
      1,
      1,
      1,
      1,
      BOSS_NONE,
    );
  }
}

function spawnElite(world: World, pack: Pack): void {
  const type = pack.typeIndices[nextInt(world.rng, 0, pack.typeIndices.length)];
  const angle = nextFloat(world.rng) * Math.PI * 2;
  const e = waves.elite;
  spawnAt(
    world,
    MONSTER_STATS[type],
    angle,
    spawnRingRadius(world),
    pack.hpScale,
    pack.speedScale,
    e.hpMult,
    e.damageMult,
    e.xpMult,
    e.speedMult,
    e.scale,
    BOSS_NONE,
  );
}

function spawnBoss(
  world: World,
  type: number,
  config: { hpMult: number; damageMult: number; xpMult: number; speedMult: number; scale: number },
  pack: Pack,
  tag: number,
): void {
  const angle = nextFloat(world.rng) * Math.PI * 2;
  spawnAt(
    world,
    MONSTER_STATS[type],
    angle,
    spawnRingRadius(world),
    pack.hpScale,
    pack.speedScale,
    config.hpMult,
    config.damageMult,
    config.xpMult,
    config.speedMult,
    config.scale,
    tag,
  );
}

export function updateSpawning(world: World): void {
  const spawn = world.spawn;
  const pack = currentPack(world);
  if (spawn.nextPackTick === 0) spawn.nextPackTick = pack.intervalTicks;
  if (spawn.nextEliteTick === 0) spawn.nextEliteTick = ELITE_FIRST_TICK;

  if (!spawn.bossDone) {
    if (world.tick >= spawn.nextPackTick) {
      spawn.nextPackTick = world.tick + pack.intervalTicks;
      spawnPack(world, pack);
    }
    if (world.tick >= spawn.nextEliteTick) {
      spawn.nextEliteTick = world.tick + ELITE_INTERVAL_TICKS;
      spawnElite(world, pack);
    }
    while (
      spawn.hordeIndex < HORDE_TICKS.length &&
      world.tick >= HORDE_TICKS[spawn.hordeIndex]
    ) {
      spawnHorde(world, spawn.hordeIndex, pack);
      spawn.hordeIndex++;
    }
  }

  if (!spawn.miniBossDone && world.tick >= MINI_BOSS_TICK) {
    spawn.miniBossDone = true;
    spawnBoss(world, MINI_BOSS_TYPE, waves.miniBoss, pack, BOSS_MINI);
  }
  if (!spawn.bossDone && world.tick >= BOSS_TICK) {
    spawn.bossDone = true;
    spawnBoss(world, BOSS_TYPE, waves.boss, pack, BOSS_FINAL);
  }
}
