import { spawnEnemy } from '../src/game/entities/enemies.ts';
import { MONSTER_STATS } from '../src/game/entities/monsterTypes.ts';
import { CLASS_KNIGHT } from '../src/game/kinds.ts';
import { createWorld } from '../src/game/state.ts';
import { advance } from '../src/game/step.ts';
import { grantItem, itemIndexById } from '../src/game/systems/items.ts';

const world = createWorld(1234, CLASS_KNIGHT, 3);
for (let star = 0; star < 6; star++) {
  grantItem(world, itemIndexById('vowblade'));
  grantItem(world, itemIndexById('rally_banner'));
  grantItem(world, itemIndexById('charger_greaves'));
}

for (let i = 0; i < 190; i++) {
  const angle = (i / 190) * Math.PI * 2;
  const type = i % 4;
  spawnEnemy(
    world,
    MONSTER_STATS[type],
    Math.cos(angle) * (60 + (i % 5) * 40),
    Math.sin(angle) * (60 + (i % 5) * 40),
    (i % 10) / 10,
  );
}

const WARMUP_TICKS = 1200;
const MEASURE_TICKS = 6000;

for (let t = 0; t < WARMUP_TICKS; t++) {
  world.player.moveInput.x = Math.sin(t * 0.01);
  world.player.moveInput.y = Math.cos(t * 0.013);
  advance(world);
  if (world.status !== 0) {
    world.status = 0;
    world.player.hp = world.player.maxHp;
  }
}

if (globalThis.gc) globalThis.gc();
const heapBefore = process.memoryUsage().heapUsed;
const timeBefore = process.hrtime.bigint();

for (let t = 0; t < MEASURE_TICKS; t++) {
  world.player.moveInput.x = Math.sin(t * 0.01);
  world.player.moveInput.y = Math.cos(t * 0.013);
  advance(world);
  if (world.status !== 0) {
    world.status = 0;
    world.player.hp = world.player.maxHp;
  }
}

const timeAfter = process.hrtime.bigint();
const heapAfter = process.memoryUsage().heapUsed;

const totalMs = Number(timeAfter - timeBefore) / 1e6;
process.stdout.write(
  [
    `ticks: ${MEASURE_TICKS}`,
    `enemies at end: ${world.enemies.count}`,
    `projectiles at end: ${world.projectiles.count}`,
    `kills: ${world.kills}`,
    `total: ${totalMs.toFixed(1)} ms`,
    `per tick: ${((totalMs / MEASURE_TICKS) * 1000).toFixed(2)} us`,
    `heap delta: ${((heapAfter - heapBefore) / 1024).toFixed(1)} KiB`,
    '',
  ].join('\n'),
);
