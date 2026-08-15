import { test } from 'node:test';
import assert from 'node:assert/strict';
import weapons from '../data/weapons.json' with { type: 'json' };
import { spawnEnemy, type EnemyStats } from '../entities/enemies.ts';
import {
  CLASS_DWARF,
  CLASS_KNIGHT,
  CLASS_PRIEST,
  CLASS_WIZARD,
  createWorld,
  FIXED_DT,
  PROJ_AXE,
  AXE_PHASE_DWELL,
  AXE_PHASE_RETURN,
  type World,
} from '../state.ts';
import { advance } from '../step.ts';

const DUMMY: EnemyStats = {
  type: 0,
  hp: 1000000,
  speed: 0,
  damage: 0,
  attackInterval: 1000,
  xp: 1,
  radius: 8,
};

function totalDamageTaken(world: World, index: number): number {
  const e = world.enemies.items[index];
  return e.maxHp - e.hp;
}

function stopSpawner(world: World): void {
  world.spawn.nextBurstTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextEliteTick = Number.MAX_SAFE_INTEGER;
  world.spawn.nextBossTick = Number.MAX_SAFE_INTEGER;
  world.spawn.accumulator = -1e9;
}

test('fireball explodes on first contact and damages each enemy in the blast once', () => {
  const world = createWorld(3, CLASS_WIZARD);
  stopSpawner(world);
  spawnEnemy(world, DUMMY, 80, 0, 0);
  spawnEnemy(world, DUMMY, 95, 12, 0);
  spawnEnemy(world, DUMMY, 70, -14, 0);
  spawnEnemy(world, DUMMY, 220, 0, 0);
  let exploded = false;
  for (let t = 0; t < 200 && !exploded; t++) {
    advance(world);
    if (totalDamageTaken(world, 0) > 0) exploded = true;
  }
  assert.ok(exploded, 'fireball never hit');
  assert.equal(totalDamageTaken(world, 0), weapons.fireball.damage);
  assert.equal(totalDamageTaken(world, 1), weapons.fireball.damage);
  assert.equal(totalDamageTaken(world, 2), weapons.fireball.damage);
  assert.equal(totalDamageTaken(world, 3), 0);
  assert.equal(world.projectiles.count, 0);
});

test('priest missile hits exactly one enemy and despawns without AoE', () => {
  const world = createWorld(3, CLASS_PRIEST);
  stopSpawner(world);
  spawnEnemy(world, DUMMY, 90, 0, 0);
  spawnEnemy(world, DUMMY, 90, 18, 0);
  let hit = false;
  for (let t = 0; t < 300 && !hit; t++) {
    advance(world);
    if (totalDamageTaken(world, 0) > 0 || totalDamageTaken(world, 1) > 0) hit = true;
  }
  assert.ok(hit, 'missile never hit');
  const damaged = [totalDamageTaken(world, 0), totalDamageTaken(world, 1)];
  const hits = damaged.filter((d) => d > 0);
  assert.equal(hits.length, 1);
  assert.equal(hits[0], weapons.missile.damage);
  assert.equal(world.projectiles.count, 0);
});

test('sword pierces through enemies, damaging each once, up to its pierce count', () => {
  const world = createWorld(3, CLASS_KNIGHT);
  stopSpawner(world);
  const positions = [40, 60, 80, 100, 120];
  for (const x of positions) spawnEnemy(world, DUMMY, x, 0, 0);
  let swordSeen = false;
  for (let t = 0; t < 400; t++) {
    advance(world);
    if (world.projectiles.count > 0 && !swordSeen) {
      swordSeen = true;
      world.player.attackTimerTicks = Number.MAX_SAFE_INTEGER;
    }
    if (swordSeen && world.projectiles.count === 0) break;
  }
  assert.ok(swordSeen);
  let totalHits = 0;
  for (let i = 0; i < positions.length; i++) {
    const dmg = totalDamageTaken(world, i);
    assert.ok(dmg === 0 || dmg === weapons.sword.damage, `enemy ${i} took ${dmg}`);
    if (dmg > 0) totalHits++;
  }
  assert.equal(totalHits, weapons.sword.pierce);
});

test('a sword cannot miss a fast-moving target', () => {
  const world = createWorld(3, CLASS_KNIGHT);
  stopSpawner(world);
  const runner = spawnEnemy(world, { ...DUMMY, speed: 60 }, 240, 120, 0);
  assert.ok(runner);
  world.player.moveInput.x = -1;
  world.player.moveInput.y = 0;
  const lifetimeTicks = Math.round(weapons.sword.lifetimeSeconds / FIXED_DT);
  let hit = false;
  for (let t = 0; t < lifetimeTicks + 120 && !hit; t++) {
    advance(world);
    if (totalDamageTaken(world, 0) > 0) hit = true;
  }
  assert.ok(hit, 'sword missed a moving target');
});

test('axe passes out, dwells in place, returns to a moving dwarf, and reappears the weapon', () => {
  const world = createWorld(3, CLASS_DWARF);
  stopSpawner(world);
  spawnEnemy(world, { ...DUMMY, hp: weapons.axe.damage }, 85, 0, 0);
  let threw = false;
  let sawDwell = false;
  let sawReturn = false;
  let dwellX = 0;
  let dwellMoved = false;
  for (let t = 0; t < 1200; t++) {
    advance(world);
    if (world.projectiles.count > 0) {
      const axe = world.projectiles.items[0];
      assert.equal(axe.kind, PROJ_AXE);
      threw = true;
      if (axe.axePhase === AXE_PHASE_DWELL) {
        if (!sawDwell) {
          sawDwell = true;
          dwellX = axe.pos.x;
        } else if (Math.abs(axe.pos.x - dwellX) > 0.001) {
          dwellMoved = true;
        }
      }
      if (axe.axePhase === AXE_PHASE_RETURN) {
        sawReturn = true;
        world.player.moveInput.y = 1;
      }
    } else if (threw && sawReturn) {
      break;
    }
  }
  assert.ok(threw, 'axe never thrown');
  assert.ok(sawDwell, 'axe never dwelled');
  assert.ok(!dwellMoved, 'axe drifted during dwell');
  assert.ok(sawReturn, 'axe never returned');
  assert.equal(world.liveAxes, 0);
  assert.equal(world.enemies.count, 0);
  advance(world);
  assert.ok(world.player.weaponVisible, 'dwarf weapon should reappear after the axe returns');
});

test('axe damages a camper repeatedly but never faster than its re-hit cooldown', () => {
  const world = createWorld(3, CLASS_DWARF);
  stopSpawner(world);
  spawnEnemy(world, DUMMY, 85, 0, 0);
  const rehitTicks = Math.round(weapons.axe.rehitSeconds / FIXED_DT);
  const hitTicks: number[] = [];
  let lastDamage = 0;
  let threw = false;
  for (let t = 0; t < 600; t++) {
    advance(world);
    if (world.liveAxes > 0) threw = true;
    if (threw && world.liveAxes === 0) break;
    const dmg = totalDamageTaken(world, 0);
    if (dmg > lastDamage) {
      assert.equal(dmg - lastDamage, weapons.axe.damage, 'more than one application in a tick');
      hitTicks.push(world.tick);
      lastDamage = dmg;
    }
  }
  assert.ok(hitTicks.length >= 2, `only ${hitTicks.length} hits`);
  for (let i = 1; i < hitTicks.length; i++) {
    assert.ok(hitTicks[i] - hitTicks[i - 1] >= rehitTicks, `rehit after ${hitTicks[i] - hitTicks[i - 1]} ticks`);
  }
});

test('the orb damages a lingering enemy on its re-hit cooldown, not every frame', () => {
  const world = createWorld(3, CLASS_PRIEST);
  stopSpawner(world);
  world.player.attackTimerTicks = Number.MAX_SAFE_INTEGER;
  world.player.attackCooldownTicks = Number.MAX_SAFE_INTEGER;
  const camper = spawnEnemy(world, DUMMY, 34, 0, 0);
  assert.ok(camper);
  camper.radius = 30;
  const rehitTicks = Math.round(weapons.orb.rehitSeconds / FIXED_DT);
  const hitTicks: number[] = [];
  let lastDamage = 0;
  for (let t = 0; t < 240; t++) {
    advance(world);
    const dmg = totalDamageTaken(world, 0);
    if (dmg > lastDamage) {
      assert.equal(dmg - lastDamage, weapons.orb.damage);
      hitTicks.push(world.tick);
      lastDamage = dmg;
    }
  }
  assert.ok(hitTicks.length >= 2, `only ${hitTicks.length} orb hits`);
  for (let i = 1; i < hitTicks.length; i++) {
    assert.ok(hitTicks[i] - hitTicks[i - 1] >= rehitTicks);
  }
});

test('a volley staggers its shots and hides the knight weapon while dispatching', () => {
  const world = createWorld(3, CLASS_KNIGHT);
  stopSpawner(world);
  world.player.volleyCount = 3;
  for (let i = 0; i < 6; i++) spawnEnemy(world, DUMMY, 120 + i * 20, 40, 0);
  const spawnTicks: number[] = [];
  let lastCount = 0;
  for (let t = 0; t < 300 && spawnTicks.length < 3; t++) {
    advance(world);
    if (world.projectiles.count > lastCount) {
      spawnTicks.push(world.tick);
      assert.ok(!world.player.weaponVisible, 'weapon should hide during the volley');
    }
    lastCount = world.projectiles.count;
  }
  assert.equal(spawnTicks.length, 3);
  const stagger = Math.max(1, Math.round(weapons.volley.staggerSeconds / FIXED_DT));
  assert.equal(spawnTicks[1] - spawnTicks[0], stagger);
  assert.equal(spawnTicks[2] - spawnTicks[1], stagger);
});

test('the knight weapon reappears once the field is clear and cooldown has run', () => {
  const world = createWorld(3, CLASS_KNIGHT);
  stopSpawner(world);
  spawnEnemy(world, { ...DUMMY, hp: 1 }, 60, 0, 0);
  for (let t = 0; t < 400; t++) advance(world);
  assert.equal(world.enemies.count, 0);
  assert.equal(world.projectiles.count, 0);
  assert.ok(world.player.weaponVisible);
});
