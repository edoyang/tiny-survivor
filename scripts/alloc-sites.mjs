import { Session } from 'node:inspector/promises';
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
  const a = (i / 190) * Math.PI * 2;
  spawnEnemy(world, MONSTER_STATS[i % 4], Math.cos(a) * (60 + (i % 5) * 40), Math.sin(a) * (60 + (i % 5) * 40), (i % 10) / 10);
}
const step = (t) => {
  world.player.moveInput.x = Math.sin(t * 0.01);
  world.player.moveInput.y = Math.cos(t * 0.013);
  advance(world);
  if (world.status !== 0) { world.status = 0; world.player.hp = world.player.maxHp; }
};
for (let t = 0; t < 1200; t++) step(t);

const session = new Session();
session.connect();
await session.post('HeapProfiler.startSampling', { samplingInterval: 512 });
for (let t = 0; t < 6000; t++) step(t);
const { profile } = await session.post('HeapProfiler.stopSampling');
session.disconnect();

const totals = new Map();
const walk = (node) => {
  const size = node.selfSize ?? 0;
  if (size > 0) {
    const f = node.callFrame;
    const key = `${f.functionName || '(anon)'} @ ${String(f.url).split('/').slice(-2).join('/')}:${f.lineNumber + 1}`;
    totals.set(key, (totals.get(key) ?? 0) + size);
  }
  for (const child of node.children ?? []) walk(child);
};
walk(profile.head);
const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
const lines = sorted.map(([site, bytes]) => `${(bytes / 1024).toFixed(1).padStart(9)} KiB  ${site}`);
lines.push('');
process.stdout.write(lines.join('\n'));
