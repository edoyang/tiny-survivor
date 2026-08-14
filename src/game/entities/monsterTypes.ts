import monsters from '../data/monsters.json' with { type: 'json' };
import type { EnemyStats } from './enemies.ts';

export const MONSTER_IDS = ['slime', 'fly', 'bunny', 'monster'] as const;

export const MONSTER_SPRITES: string[] = MONSTER_IDS.map((id) => monsters[id].sprites);

export const MONSTER_STATS: EnemyStats[] = MONSTER_IDS.map((id, index) => ({
  type: index,
  hp: monsters[id].hp,
  speed: monsters[id].speed,
  damage: monsters[id].damage,
  attackInterval: monsters[id].attackInterval,
  xp: monsters[id].xp,
  radius: monsters[id].radius,
}));
