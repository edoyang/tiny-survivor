import { poolObtain } from '../pool.ts';
import { FIXED_DT, type Enemy, type World } from '../state.ts';

export type EnemyStats = {
  type: number;
  hp: number;
  speed: number;
  damage: number;
  attackInterval: number;
  xp: number;
  radius: number;
};

export function spawnEnemy(
  world: World,
  stats: EnemyStats,
  x: number,
  y: number,
  animPhase: number,
): Enemy | null {
  const enemy = poolObtain(world.enemies);
  if (enemy === null) return null;
  enemy.id = world.nextEntityId;
  world.nextEntityId++;
  enemy.type = stats.type;
  enemy.pos.x = x;
  enemy.pos.y = y;
  enemy.prevX = x;
  enemy.prevY = y;
  enemy.hp = stats.hp;
  enemy.maxHp = stats.hp;
  enemy.speed = stats.speed;
  enemy.radius = stats.radius;
  enemy.contactDamage = stats.damage;
  enemy.attackIntervalTicks = Math.round(stats.attackInterval / FIXED_DT);
  enemy.attackTimerTicks = 0;
  enemy.animPhase = animPhase;
  enemy.facing = 1;
  enemy.xp = stats.xp;
  return enemy;
}
