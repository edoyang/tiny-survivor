import tuning from '../data/tuning.json' with { type: 'json' };
import { spawnEffect, spawnField } from '../entities/effects.ts';
import { spawnBomb, spawnIcicle } from '../entities/projectiles.ts';
import {
  AB_BEAM,
  AB_BOMB,
  AB_HEAL,
  AB_ICICLE,
  AB_METEOR,
  AB_NOVA,
  AB_PULL,
  AB_SNOWSTORM,
  AB_THUNDER,
  AB_TRAIL,
  AB_VOLLEY,
  FX_RING,
} from '../kinds.ts';
import { nextFloat } from '../rng.ts';
import type { Ability, World } from '../state.ts';
import { fireVolleyShot } from './attacks.ts';
import { damageInRadius } from './damage.ts';
import { findNearestEnemy, findNearestEnemyExcluding } from './targeting.ts';

const TARGET_SCRATCH = new Int32Array(16);
const FIELD_TICK = Math.round(tuning.abilities.fieldDamageIntervalSeconds * 60);
const NOVA_TICK = Math.round(tuning.abilities.novaDamageIntervalSeconds * 60);
const NOVA_LIFE = Math.round(tuning.abilities.novaGrowSeconds * 60);
const BEAM_STEPS = 8;

function castMeteor(world: World, ability: Ability): void {
  const p = world.player;
  let picked = 0;
  for (let n = 0; n < ability.count && picked < TARGET_SCRATCH.length; n++) {
    const idx = findNearestEnemyExcluding(
      world,
      p.pos.x,
      p.pos.y,
      tuning.abilities.searchRange,
      TARGET_SCRATCH,
      picked,
    );
    if (idx < 0) break;
    const target = world.enemies.items[idx];
    TARGET_SCRATCH[picked] = target.id;
    picked++;
    const x = target.pos.x;
    const y = target.pos.y;
    spawnEffect(world, ability.visual, x, y, ability.radius);
    damageInRadius(world, x, y, ability.radius, ability.damage * p.damageMult);
  }
}

function castIcicle(world: World, ability: Ability): void {
  const p = world.player;
  let picked = 0;
  for (let n = 0; n < ability.count && picked < TARGET_SCRATCH.length; n++) {
    const idx = findNearestEnemyExcluding(
      world,
      p.pos.x,
      p.pos.y,
      tuning.abilities.searchRange,
      TARGET_SCRATCH,
      picked,
    );
    if (idx < 0) break;
    const target = world.enemies.items[idx];
    TARGET_SCRATCH[picked] = target.id;
    picked++;
    const shot = spawnIcicle(
      world,
      p.pos.x,
      p.pos.y,
      target.pos.x - p.pos.x,
      target.pos.y - p.pos.y,
      target.id,
      ability.visual,
    );
    if (shot !== null) shot.damage = ability.damage * p.damageMult;
  }
}

function castBomb(world: World, ability: Ability): void {
  const p = world.player;
  let picked = 0;
  for (let n = 0; n < ability.count && picked < TARGET_SCRATCH.length; n++) {
    const idx = findNearestEnemyExcluding(
      world,
      p.pos.x,
      p.pos.y,
      tuning.abilities.searchRange,
      TARGET_SCRATCH,
      picked,
    );
    if (idx < 0) break;
    const target = world.enemies.items[idx];
    TARGET_SCRATCH[picked] = target.id;
    picked++;
    const shot = spawnBomb(
      world,
      p.pos.x,
      p.pos.y,
      target.pos.x - p.pos.x,
      target.pos.y - p.pos.y,
      ability.visual,
    );
    if (shot === null) continue;
    shot.damage = ability.damage * p.damageMult;
    shot.aoeRadius = ability.radius;
    shot.clusterLeft = p.bombCluster ? 1 : 0;
  }
}

function castThunder(world: World, ability: Ability): void {
  const p = world.player;
  let picked = 0;
  let fromX = p.pos.x;
  let fromY = p.pos.y;
  for (let n = 0; n < ability.count && picked < TARGET_SCRATCH.length; n++) {
    const range = n === 0 ? tuning.abilities.searchRange : tuning.abilities.thunderChainRange;
    const idx = findNearestEnemyExcluding(world, fromX, fromY, range, TARGET_SCRATCH, picked);
    if (idx < 0) break;
    const target = world.enemies.items[idx];
    TARGET_SCRATCH[picked] = target.id;
    picked++;
    fromX = target.pos.x;
    fromY = target.pos.y;
    spawnEffect(world, ability.visual, fromX, fromY, ability.radius);
    damageInRadius(world, fromX, fromY, ability.radius, ability.damage * p.damageMult);
  }
}

function castNova(world: World, ability: Ability): void {
  const p = world.player;
  damageInRadius(world, p.pos.x, p.pos.y, ability.radius, ability.damage * p.damageMult);
  spawnField(
    world,
    ability.visual,
    p.pos.x,
    p.pos.y,
    ability.radius * 0.25,
    0,
    NOVA_TICK,
    1,
    NOVA_LIFE,
    false,
    (ability.radius * 0.75) / tuning.abilities.novaGrowSeconds,
  );
}

function castSnowstorm(world: World, ability: Ability): void {
  const p = world.player;
  spawnField(
    world,
    ability.visual,
    p.pos.x,
    p.pos.y,
    ability.radius,
    ability.damage * p.damageMult,
    FIELD_TICK,
    ability.slowMult,
    ability.durationTicks,
    true,
    0,
  );
}

function castTrail(world: World, ability: Ability): void {
  const p = world.player;
  if (!p.walking) return;
  spawnField(
    world,
    ability.visual,
    p.pos.x,
    p.pos.y,
    ability.radius,
    ability.damage * p.damageMult,
    FIELD_TICK,
    1,
    ability.durationTicks,
    false,
    0,
  );
}

function castPull(world: World, ability: Ability): void {
  const idx = findNearestEnemy(world, world.player.pos.x, world.player.pos.y, tuning.abilities.searchRange);
  const x = idx >= 0 ? world.enemies.items[idx].pos.x : world.player.pos.x;
  const y = idx >= 0 ? world.enemies.items[idx].pos.y : world.player.pos.y;
  const field = spawnField(
    world,
    ability.visual,
    x,
    y,
    ability.radius,
    ability.damage * world.player.damageMult,
    FIELD_TICK,
    ability.slowMult,
    ability.durationTicks,
    false,
    0,
  );
  if (field !== null) field.pull = tuning.abilities.pullStrength;
}

function castBeam(world: World, ability: Ability): void {
  const p = world.player;
  const idx = findNearestEnemy(world, p.pos.x, p.pos.y, tuning.abilities.searchRange);
  if (idx < 0) return;
  const target = world.enemies.items[idx];
  const dx = target.pos.x - p.pos.x;
  const dy = target.pos.y - p.pos.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return;
  const stepX = (dx / len) * (tuning.abilities.beamLength / BEAM_STEPS);
  const stepY = (dy / len) * (tuning.abilities.beamLength / BEAM_STEPS);
  for (let s = 1; s <= BEAM_STEPS; s++) {
    const x = p.pos.x + stepX * s;
    const y = p.pos.y + stepY * s;
    spawnEffect(world, ability.visual, x, y, ability.radius);
    damageInRadius(world, x, y, ability.radius, ability.damage * p.damageMult);
  }
}

function castVolley(world: World, ability: Ability): void {
  const p = world.player;
  const jitter = (tuning.abilities.volleySpreadJitterDeg * Math.PI) / 180;
  for (let n = 0; n < ability.count; n++) {
    const angle =
      (n / ability.count) * Math.PI * 2 + (nextFloat(world.rng) - 0.5) * jitter;
    fireVolleyShot(world, Math.cos(angle), Math.sin(angle));
  }
  spawnEffect(world, ability.visual, p.pos.x, p.pos.y, tuning.render.castEffectRadius);
}

function castHeal(world: World, ability: Ability): void {
  const p = world.player;
  if (p.hp <= 0) return;
  p.hp = Math.min(p.maxHp, p.hp + ability.damage);
  spawnEffect(world, ability.visual, p.pos.x, p.pos.y, tuning.render.castEffectRadius);
}

export function castAbility(world: World, ability: Ability): void {
  if (ability.kind === AB_METEOR) castMeteor(world, ability);
  else if (ability.kind === AB_ICICLE) castIcicle(world, ability);
  else if (ability.kind === AB_SNOWSTORM) castSnowstorm(world, ability);
  else if (ability.kind === AB_THUNDER) castThunder(world, ability);
  else if (ability.kind === AB_NOVA) castNova(world, ability);
  else if (ability.kind === AB_VOLLEY) castVolley(world, ability);
  else if (ability.kind === AB_HEAL) castHeal(world, ability);
  else if (ability.kind === AB_TRAIL) castTrail(world, ability);
  else if (ability.kind === AB_BOMB) castBomb(world, ability);
  else if (ability.kind === AB_PULL) castPull(world, ability);
  else if (ability.kind === AB_BEAM) castBeam(world, ability);
}

export function updateAbilities(world: World): void {
  for (let i = 0; i < world.abilityCount; i++) {
    const ability = world.abilities[i];
    if (ability.timerTicks > 0) {
      ability.timerTicks--;
      continue;
    }
    ability.timerTicks = ability.intervalTicks;
    castAbility(world, ability);
  }
  const recast = world.player.recastAbility;
  while (world.recastQueued > 0) {
    world.recastQueued--;
    if (recast >= 0 && recast < world.abilityCount) castAbility(world, world.abilities[recast]);
  }
}

export function updateAura(world: World): void {
  const p = world.player;
  const aura = world.auraField;
  aura.pos.x = p.pos.x;
  aura.pos.y = p.pos.y;
  aura.radius = p.auraRadius;
  aura.slowMult = p.auraSlow;
  aura.visual = FX_RING;
  if (aura.radius <= 0) return;
  if (aura.damageTimerTicks > 0) {
    aura.damageTimerTicks--;
    return;
  }
  aura.damageTimerTicks = FIELD_TICK;
  if (p.auraDps <= 0) return;
  damageInRadius(
    world,
    aura.pos.x,
    aura.pos.y,
    aura.radius,
    p.auraDps * tuning.abilities.fieldDamageIntervalSeconds * p.damageMult,
  );
}
