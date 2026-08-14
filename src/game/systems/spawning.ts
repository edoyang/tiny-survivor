import waves from '../data/waves.json' with { type: 'json' };
import { initEnemy, spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import { MONSTER_IDS, MONSTER_STATS } from '../entities/monsterTypes.ts';
import { nextFloat, nextInt } from '../rng.ts';
import { ENEMY_CAP, FIXED_DT, type Enemy, type World } from '../state.ts';

type Bracket = {
  untilTick: number;
  typeIndices: number[];
  cumulativeWeights: number[];
  totalWeight: number;
  spawnsPerSecond: number;
  hpScale: number;
  speedScale: number;
};

function monsterIndex(id: string): number {
  const index = (MONSTER_IDS as readonly string[]).indexOf(id);
  if (index < 0) throw new Error(`waves.json references unknown monster ${id}`);
  return index;
}

const BRACKETS: Bracket[] = waves.brackets.map((b) => {
  const cumulative: number[] = [];
  let total = 0;
  for (const w of b.weights) {
    total += w;
    cumulative.push(total);
  }
  return {
    untilTick: Math.round(b.untilSeconds / FIXED_DT),
    typeIndices: b.types.map(monsterIndex),
    cumulativeWeights: cumulative,
    totalWeight: total,
    spawnsPerSecond: b.spawnsPerSecond,
    hpScale: b.hpScale,
    speedScale: b.speedScale,
  };
});

const BURST_INTERVAL_TICKS = Math.round(waves.burst.intervalSeconds / FIXED_DT);
const ELITE_INTERVAL_TICKS = Math.round(waves.elite.intervalSeconds / FIXED_DT);
const BOSS_INTERVAL_TICKS = Math.round(waves.boss.intervalSeconds / FIXED_DT);
export const CONCURRENT_CAP = Math.min(waves.concurrentCap, ENEMY_CAP);
const BOSS_TYPE = monsterIndex('monster');

export function spawnRingRadius(world: World): number {
  const halfW = world.viewWidth / 2;
  const halfH = world.viewHeight / 2;
  return Math.sqrt(halfW * halfW + halfH * halfH) + waves.spawnRingMargin;
}

function currentBracket(world: World): Bracket {
  const spawn = world.spawn;
  while (
    spawn.bracketIndex < BRACKETS.length - 1 &&
    world.tick >= BRACKETS[spawn.bracketIndex].untilTick
  ) {
    spawn.bracketIndex++;
  }
  return BRACKETS[spawn.bracketIndex];
}

function pickBracketType(world: World, bracket: Bracket): number {
  const roll = nextFloat(world.rng) * bracket.totalWeight;
  for (let i = 0; i < bracket.cumulativeWeights.length; i++) {
    if (roll < bracket.cumulativeWeights[i]) return bracket.typeIndices[i];
  }
  return bracket.typeIndices[bracket.typeIndices.length - 1];
}

function farthestEnemyIndex(world: World): number {
  const p = world.player;
  let farthest = 0;
  let bestD2 = -1;
  for (let i = 0; i < world.enemies.count; i++) {
    const e = world.enemies.items[i];
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

function spawnScaled(
  world: World,
  stats: EnemyStats,
  bracket: Bracket,
  angle: number,
  hpMult: number,
  damageMult: number,
  xpMult: number,
  speedMult: number,
  scale: number,
): Enemy | null {
  const radius = spawnRingRadius(world);
  const x = world.camera.pos.x + Math.cos(angle) * radius;
  const y = world.camera.pos.y + Math.sin(angle) * radius;
  const phase = nextFloat(world.rng);
  let enemy: Enemy | null;
  if (world.enemies.count >= CONCURRENT_CAP) {
    enemy = world.enemies.items[farthestEnemyIndex(world)];
    initEnemy(world, enemy, stats, x, y, phase);
  } else {
    enemy = spawnEnemy(world, stats, x, y, phase);
    if (enemy === null) return null;
  }
  enemy.hp = Math.round(stats.hp * bracket.hpScale * hpMult);
  enemy.maxHp = enemy.hp;
  enemy.speed = stats.speed * bracket.speedScale * speedMult;
  enemy.contactDamage = stats.damage * damageMult;
  enemy.xp = stats.xp * xpMult;
  enemy.scale = scale;
  enemy.radius = stats.radius * scale;
  return enemy;
}

function spawnRegular(world: World, bracket: Bracket): void {
  const type = pickBracketType(world, bracket);
  const angle = nextFloat(world.rng) * Math.PI * 2;
  spawnScaled(world, MONSTER_STATS[type], bracket, angle, 1, 1, 1, 1, 1);
}

function spawnBurst(world: World, bracket: Bracket): void {
  const type = pickBracketType(world, bracket);
  const baseAngle = nextFloat(world.rng) * Math.PI * 2;
  const arc = (waves.burst.arcDegrees * Math.PI) / 180;
  for (let i = 0; i < waves.burst.count; i++) {
    const angle = baseAngle + (nextFloat(world.rng) - 0.5) * arc;
    spawnScaled(world, MONSTER_STATS[type], bracket, angle, 1, 1, 1, 1, 1);
  }
}

function spawnElite(world: World, bracket: Bracket): void {
  const type = bracket.typeIndices[nextInt(world.rng, 0, bracket.typeIndices.length)];
  const angle = nextFloat(world.rng) * Math.PI * 2;
  const e = waves.elite;
  spawnScaled(world, MONSTER_STATS[type], bracket, angle, e.hpMult, e.damageMult, e.xpMult, e.speedMult, e.scale);
}

function spawnBoss(world: World, bracket: Bracket): void {
  const angle = nextFloat(world.rng) * Math.PI * 2;
  const b = waves.boss;
  spawnScaled(world, MONSTER_STATS[BOSS_TYPE], bracket, angle, b.hpMult, b.damageMult, b.xpMult, b.speedMult, b.scale);
}

export function updateSpawning(world: World, dt: number): void {
  const spawn = world.spawn;
  if (spawn.nextBurstTick === 0) spawn.nextBurstTick = BURST_INTERVAL_TICKS;
  if (spawn.nextEliteTick === 0) spawn.nextEliteTick = ELITE_INTERVAL_TICKS;
  if (spawn.nextBossTick === 0) spawn.nextBossTick = BOSS_INTERVAL_TICKS;
  const bracket = currentBracket(world);
  spawn.accumulator += bracket.spawnsPerSecond * dt;
  while (spawn.accumulator >= 1) {
    spawn.accumulator -= 1;
    spawnRegular(world, bracket);
  }
  if (world.tick >= spawn.nextBurstTick) {
    spawn.nextBurstTick += BURST_INTERVAL_TICKS;
    spawnBurst(world, bracket);
  }
  if (world.tick >= spawn.nextEliteTick) {
    spawn.nextEliteTick += ELITE_INTERVAL_TICKS;
    spawnElite(world, bracket);
  }
  if (world.tick >= spawn.nextBossTick) {
    spawn.nextBossTick += BOSS_INTERVAL_TICKS;
    spawnBoss(world, bracket);
  }
}
