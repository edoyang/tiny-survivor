import {
  BlendMode,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  TileMode,
  type SkCanvas,
  type SkHostRect,
  type SkImage,
  type SkPaint,
  type SkRSXform,
  type SkRect,
} from '@shopify/react-native-skia';
import tuning from '../game/data/tuning.json' with { type: 'json' };
import { MONSTER_SPRITES } from '../game/entities/monsterTypes.ts';
import { FX_COUNT, PROJ_AXE, PROJ_BOMB, PROJ_FIREBALL, PROJ_SWORD } from '../game/kinds.ts';
import {
  EFFECT_CAP,
  ENEMY_CAP,
  FIELD_CAP,
  GEM_CAP,
  MINION_CAP,
  PROJECTILE_CAP,
  type World,
} from '../game/state.ts';
import { flippedName, type SpriteAtlas } from './atlas.ts';
import { floorTileAt, generateFloorLayout, TILE_SIZE } from './floor.ts';
import { computeHeroPose, createHeroPose, type HeroPose } from './hero.ts';
import type { JoystickState } from './joystick.ts';
import { EFFECT_FRAME_SIZE, EFFECT_SHEETS } from './sources.ts';

export type HeroImages = {
  body: SkImage;
  weapon: SkImage;
  tinted: boolean;
};

export type RenderContext = {
  atlas: SpriteAtlas;
  floorLayout: Uint8Array;
  floorRects: SkRect[];
  screenWidth: number;
  screenHeight: number;
  scale: number;
  viewWidth: number;
  viewHeight: number;
  maxFloorTiles: number;
  floorSrcs: SkRect[];
  floorXforms: SkRSXform[];
  spritePaint: SkPaint;
  floorTintPaint: SkPaint;
  vignettePaint: SkPaint;
  screenRect: SkRect;
  joystickBasePaint: SkPaint;
  joystickRingPaint: SkPaint;
  joystickKnobPaint: SkPaint;
  joystickKnobEdgePaint: SkPaint;
  bounds: SkHostRect;
  heroBody: SkImage;
  heroWeapon: SkImage;
  weaponPaint: SkPaint;
  src16: SkRect;
  heroBodyDst: SkRect;
  weaponDst: SkRect;
  heroPose: HeroPose;
  monsterRects: SkRect[][][];
  gemRect: SkRect;
  enemySrcs: SkRect[];
  enemyXforms: SkRSXform[];
  gemSrcs: SkRect[];
  gemXforms: SkRSXform[];
  fireballFrames: SkRect[];
  swordRect: SkRect;
  axeRect: SkRect;
  orbRect: SkRect;
  missileRect: SkRect;
  projSrcs: SkRect[];
  projXforms: SkRSXform[];
  effectFrames: SkRect[][];
  effectSrcs: SkRect[];
  effectXforms: SkRSXform[];
};

export const MONSTER_WALK_FRAMES = 3;
export const FIREBALL_FRAMES = 8;
const HALF_PI = Math.PI / 2;
const CULL_MARGIN = 40;
const EFFECT_SLOTS = EFFECT_CAP + FIELD_CAP + 1;
const EFFECT_RADIUS_MULT = tuning.render.effectRadiusMult;
const ORBITER_SLOTS = 8;

const NEAREST = { filter: FilterMode.Nearest };

export function createRenderContext(
  atlas: SpriteAtlas,
  screenWidth: number,
  screenHeight: number,
  hero: HeroImages,
  floorTint: string = tuning.floor.tint,
): RenderContext {
  const scale = tuning.render.worldScale;
  const viewWidth = screenWidth / scale;
  const viewHeight = screenHeight / scale;
  const tilesX = Math.ceil(viewWidth / TILE_SIZE) + 2;
  const tilesY = Math.ceil(viewHeight / TILE_SIZE) + 2;
  const maxFloorTiles = tilesX * tilesY;
  const floorRects = tuning.floor.tiles.map((name) => atlas.rects[name]);
  const floorSrcs: SkRect[] = new Array(maxFloorTiles);
  const floorXforms: SkRSXform[] = new Array(maxFloorTiles);
  for (let i = 0; i < maxFloorTiles; i++) {
    floorSrcs[i] = floorRects[0];
    floorXforms[i] = Skia.RSXform(0, 0, 0, 0);
  }
  const spritePaint = Skia.Paint();
  const weaponPaint = Skia.Paint();
  if (hero.tinted) {
    weaponPaint.setColorFilter(
      Skia.ColorFilter.MakeBlend(Skia.Color(tuning.heroRig.priestWandTint), BlendMode.Modulate),
    );
  }
  const rig = tuning.heroRig;
  const monsterRects: SkRect[][][] = MONSTER_SPRITES.map((sprites) => {
    const frames: SkRect[][] = [];
    for (let f = 0; f < MONSTER_WALK_FRAMES; f++) {
      const name = `${sprites}_${f}`;
      frames.push([atlas.rects[flippedName(name)], atlas.rects[name]]);
    }
    return frames;
  });
  const gemRect = atlas.rects.gem;
  const fireballStrip = atlas.rects.fireball;
  const fireballFrames: SkRect[] = [];
  for (let f = 0; f < FIREBALL_FRAMES; f++) {
    fireballFrames.push(Skia.XYWHRect(fireballStrip.x + f * 32, fireballStrip.y, 32, 32));
  }
  const effectFrames: SkRect[][] = [];
  for (let k = 0; k < FX_COUNT; k++) {
    const sheet = EFFECT_SHEETS[k];
    const frames: SkRect[] = [];
    for (let f = 0; f < sheet.frames; f++) frames.push(atlas.rects[`${sheet.name}_${f}`]);
    effectFrames.push(frames);
  }
  const projCount = PROJECTILE_CAP + ORBITER_SLOTS + MINION_CAP;
  const projSrcs: SkRect[] = new Array(projCount);
  const projXforms: SkRSXform[] = new Array(projCount);
  for (let i = 0; i < projCount; i++) {
    projSrcs[i] = gemRect;
    projXforms[i] = Skia.RSXform(0, 0, 0, 0);
  }
  const enemySrcs: SkRect[] = new Array(ENEMY_CAP);
  const enemyXforms: SkRSXform[] = new Array(ENEMY_CAP);
  for (let i = 0; i < ENEMY_CAP; i++) {
    enemySrcs[i] = gemRect;
    enemyXforms[i] = Skia.RSXform(0, 0, 0, 0);
  }
  const gemSrcs: SkRect[] = new Array(GEM_CAP);
  const gemXforms: SkRSXform[] = new Array(GEM_CAP);
  for (let i = 0; i < GEM_CAP; i++) {
    gemSrcs[i] = gemRect;
    gemXforms[i] = Skia.RSXform(0, 0, 0, 0);
  }
  const effectSrcs: SkRect[] = new Array(EFFECT_SLOTS);
  const effectXforms: SkRSXform[] = new Array(EFFECT_SLOTS);
  for (let i = 0; i < EFFECT_SLOTS; i++) {
    effectSrcs[i] = effectFrames[0][0];
    effectXforms[i] = Skia.RSXform(0, 0, 0, 0);
  }
  const floorTintPaint = Skia.Paint();
  floorTintPaint.setColor(Skia.Color(floorTint));
  const vignettePaint = Skia.Paint();
  vignettePaint.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: screenWidth / 2, y: screenHeight / 2 },
      Math.max(screenWidth, screenHeight) * tuning.floor.vignetteRadius,
      [Skia.Color('#00000000'), Skia.Color(tuning.floor.vignette)],
      [0.45, 1],
      TileMode.Clamp,
    ),
  );
  const joystickBasePaint = Skia.Paint();
  joystickBasePaint.setColor(Skia.Color('#07060c66'));
  const joystickRingPaint = Skia.Paint();
  joystickRingPaint.setColor(Skia.Color('#f3e9d255'));
  joystickRingPaint.setStyle(PaintStyle.Stroke);
  joystickRingPaint.setStrokeWidth(2);
  const joystickKnobPaint = Skia.Paint();
  joystickKnobPaint.setColor(Skia.Color('#f3e9d2bb'));
  const joystickKnobEdgePaint = Skia.Paint();
  joystickKnobEdgePaint.setColor(Skia.Color('#07060cdd'));
  joystickKnobEdgePaint.setStyle(PaintStyle.Stroke);
  joystickKnobEdgePaint.setStrokeWidth(2);
  return {
    atlas,
    floorLayout: generateFloorLayout(tuning.floor.weights),
    floorRects,
    screenWidth,
    screenHeight,
    scale,
    viewWidth,
    viewHeight,
    maxFloorTiles,
    floorSrcs,
    floorXforms,
    spritePaint,
    floorTintPaint,
    vignettePaint,
    screenRect: Skia.XYWHRect(0, 0, screenWidth, screenHeight),
    joystickBasePaint,
    joystickRingPaint,
    joystickKnobPaint,
    joystickKnobEdgePaint,
    bounds: Skia.XYWHRect(0, 0, screenWidth, screenHeight),
    heroBody: hero.body,
    heroWeapon: hero.weapon,
    weaponPaint,
    src16: Skia.XYWHRect(0, 0, 16, 16),
    heroBodyDst: Skia.XYWHRect(-8, -8, 16, 16),
    weaponDst: Skia.XYWHRect(-rig.weaponPivotX, -rig.weaponPivotY, 16, 16),
    heroPose: createHeroPose(),
    monsterRects,
    gemRect,
    enemySrcs,
    enemyXforms,
    gemSrcs,
    gemXforms,
    fireballFrames,
    swordRect: atlas.rects.sword,
    axeRect: atlas.rects.axe,
    orbRect: atlas.rects.orb,
    missileRect: atlas.rects.missile,
    projSrcs,
    projXforms,
    effectFrames,
    effectSrcs,
    effectXforms,
  };
}

function setRotatedXform(
  xform: SkRSXform,
  scale: number,
  angleRad: number,
  centerX: number,
  centerY: number,
  anchorX: number,
  anchorY: number,
): void {
  const scos = Math.cos(angleRad) * scale;
  const ssin = Math.sin(angleRad) * scale;
  xform.set(
    scos,
    ssin,
    centerX - (scos * anchorX - ssin * anchorY),
    centerY - (ssin * anchorX + scos * anchorY),
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function drawWorld(
  canvas: SkCanvas,
  ctx: RenderContext,
  world: World,
  alpha: number,
  joystick: JoystickState,
): void {
  const camX = lerp(world.camera.prevX, world.camera.pos.x, alpha);
  const camY = lerp(world.camera.prevY, world.camera.pos.y, alpha);
  canvas.save();
  canvas.scale(ctx.scale, ctx.scale);
  canvas.translate(ctx.viewWidth / 2 - camX, ctx.viewHeight / 2 - camY);

  const minTileX = Math.floor((camX - ctx.viewWidth / 2) / TILE_SIZE);
  const maxTileX = Math.floor((camX + ctx.viewWidth / 2) / TILE_SIZE);
  const minTileY = Math.floor((camY - ctx.viewHeight / 2) / TILE_SIZE);
  const maxTileY = Math.floor((camY + ctx.viewHeight / 2) / TILE_SIZE);
  let count = 0;
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (count >= ctx.maxFloorTiles) break;
      const tile = floorTileAt(ctx.floorLayout, tx, ty);
      ctx.floorSrcs[count] = ctx.floorRects[tile];
      ctx.floorXforms[count].set(1, 0, tx * TILE_SIZE, ty * TILE_SIZE);
      count++;
    }
  }
  for (let i = count; i < ctx.maxFloorTiles; i++) {
    ctx.floorXforms[i].set(0, 0, 0, 0);
  }
  canvas.drawAtlas(
    ctx.atlas.image,
    ctx.floorSrcs,
    ctx.floorXforms,
    ctx.spritePaint,
    undefined,
    undefined,
    NEAREST,
  );
  canvas.restore();
  canvas.drawRect(ctx.screenRect, ctx.floorTintPaint);
  canvas.save();
  canvas.scale(ctx.scale, ctx.scale);
  canvas.translate(ctx.viewWidth / 2 - camX, ctx.viewHeight / 2 - camY);

  const cullMinX = camX - ctx.viewWidth / 2 - CULL_MARGIN;
  const cullMaxX = camX + ctx.viewWidth / 2 + CULL_MARGIN;
  const cullMinY = camY - ctx.viewHeight / 2 - CULL_MARGIN;
  const cullMaxY = camY + ctx.viewHeight / 2 + CULL_MARGIN;

  const gems = world.gems;
  let gemDrawCount = 0;
  for (let i = 0; i < gems.count; i++) {
    const gem = gems.items[i];
    const gx = lerp(gem.prevX, gem.pos.x, alpha);
    const gy = lerp(gem.prevY, gem.pos.y, alpha);
    if (gx < cullMinX || gx > cullMaxX || gy < cullMinY || gy > cullMaxY) continue;
    ctx.gemSrcs[gemDrawCount] = ctx.gemRect;
    ctx.gemXforms[gemDrawCount].set(1, 0, gx - 3, gy - 3);
    gemDrawCount++;
  }
  for (let i = gemDrawCount; i < GEM_CAP; i++) {
    ctx.gemXforms[i].set(0, 0, 0, 0);
  }
  canvas.drawAtlas(
    ctx.atlas.image,
    ctx.gemSrcs,
    ctx.gemXforms,
    ctx.spritePaint,
    undefined,
    undefined,
    NEAREST,
  );

  let fxCount = 0;
  const fieldFps = tuning.render.fieldFps;
  const fields = world.fields;
  for (let i = 0; i < fields.count && fxCount < EFFECT_SLOTS; i++) {
    const field = fields.items[i];
    if (field.radius <= 0) continue;
    if (
      field.pos.x < cullMinX ||
      field.pos.x > cullMaxX ||
      field.pos.y < cullMinY ||
      field.pos.y > cullMaxY
    ) {
      continue;
    }
    const frames = ctx.effectFrames[field.visual];
    const age = field.lifeTicks - field.ttlTicks;
    ctx.effectSrcs[fxCount] = frames[Math.floor(age * fieldFps * (1 / 60)) % frames.length];
    setRotatedXform(
      ctx.effectXforms[fxCount],
      (field.radius * 2 * EFFECT_RADIUS_MULT) / EFFECT_FRAME_SIZE,
      0,
      field.pos.x,
      field.pos.y,
      EFFECT_FRAME_SIZE / 2,
      EFFECT_FRAME_SIZE / 2,
    );
    fxCount++;
  }
  if (world.player.auraRadius > 0 && fxCount < EFFECT_SLOTS) {
    const frames = ctx.effectFrames[world.auraField.visual];
    ctx.effectSrcs[fxCount] = frames[Math.floor(world.tick * fieldFps * (1 / 60)) % frames.length];
    setRotatedXform(
      ctx.effectXforms[fxCount],
      (world.player.auraRadius * 2 * EFFECT_RADIUS_MULT) / EFFECT_FRAME_SIZE,
      0,
      world.auraField.pos.x,
      world.auraField.pos.y,
      EFFECT_FRAME_SIZE / 2,
      EFFECT_FRAME_SIZE / 2,
    );
    fxCount++;
  }
  const effects = world.effects;
  for (let i = 0; i < effects.count && fxCount < EFFECT_SLOTS; i++) {
    const fx = effects.items[i];
    if (fx.pos.x < cullMinX || fx.pos.x > cullMaxX || fx.pos.y < cullMinY || fx.pos.y > cullMaxY) {
      continue;
    }
    const frames = ctx.effectFrames[fx.kind];
    const frame = Math.min(frames.length - 1, Math.floor((fx.ageTicks / fx.lifeTicks) * frames.length));
    ctx.effectSrcs[fxCount] = frames[frame];
    setRotatedXform(
      ctx.effectXforms[fxCount],
      (fx.radius * 2 * EFFECT_RADIUS_MULT) / EFFECT_FRAME_SIZE,
      0,
      fx.pos.x,
      fx.pos.y,
      EFFECT_FRAME_SIZE / 2,
      EFFECT_FRAME_SIZE / 2,
    );
    fxCount++;
  }
  for (let i = fxCount; i < EFFECT_SLOTS; i++) {
    ctx.effectXforms[i].set(0, 0, 0, 0);
  }
  canvas.drawAtlas(
    ctx.atlas.image,
    ctx.effectSrcs,
    ctx.effectXforms,
    ctx.spritePaint,
    undefined,
    undefined,
    NEAREST,
  );

  const enemies = world.enemies;
  const animFps = tuning.enemies.animFps;
  let enemyDrawCount = 0;
  for (let i = 0; i < enemies.count; i++) {
    const e = enemies.items[i];
    const ex = lerp(e.prevX, e.pos.x, alpha);
    const ey = lerp(e.prevY, e.pos.y, alpha);
    if (ex < cullMinX || ex > cullMaxX || ey < cullMinY || ey > cullMaxY) continue;
    const frame =
      Math.floor(world.time * animFps + e.animPhase * MONSTER_WALK_FRAMES) % MONSTER_WALK_FRAMES;
    ctx.enemySrcs[enemyDrawCount] = ctx.monsterRects[e.type][frame][e.facing === 1 ? 1 : 0];
    ctx.enemyXforms[enemyDrawCount].set(e.scale, 0, ex - 12 * e.scale, ey - 12 * e.scale);
    enemyDrawCount++;
  }
  for (let i = enemyDrawCount; i < ENEMY_CAP; i++) {
    ctx.enemyXforms[i].set(0, 0, 0, 0);
  }
  canvas.drawAtlas(
    ctx.atlas.image,
    ctx.enemySrcs,
    ctx.enemyXforms,
    ctx.spritePaint,
    undefined,
    undefined,
    NEAREST,
  );

  const projectiles = world.projectiles;
  const projTuning = tuning.projectiles;
  const axeSpinRad = (projTuning.axeSpinDegPerSec * Math.PI) / 180;
  let projDrawCount = 0;
  for (let i = 0; i < projectiles.count; i++) {
    const p = projectiles.items[i];
    const cx = lerp(p.prevX, p.pos.x, alpha);
    const cy = lerp(p.prevY, p.pos.y, alpha);
    if (cx < cullMinX || cx > cullMaxX || cy < cullMinY || cy > cullMaxY) continue;
    const xform = ctx.projXforms[projDrawCount];
    if (p.kind === PROJ_FIREBALL || p.kind === PROJ_BOMB) {
      const frame =
        Math.floor(world.time * projTuning.fireballFps + (p.id % FIREBALL_FRAMES)) %
        FIREBALL_FRAMES;
      ctx.projSrcs[projDrawCount] = ctx.fireballFrames[frame];
      setRotatedXform(xform, projTuning.fireballScale, p.angle, cx, cy, 16, 16);
    } else if (p.kind === PROJ_SWORD) {
      ctx.projSrcs[projDrawCount] = ctx.swordRect;
      setRotatedXform(xform, 1, p.angle + HALF_PI, cx, cy, 8, 8);
    } else if (p.kind === PROJ_AXE) {
      ctx.projSrcs[projDrawCount] = ctx.axeRect;
      setRotatedXform(xform, 1, world.time * axeSpinRad + p.id, cx, cy, 8, 8);
    } else {
      ctx.projSrcs[projDrawCount] = ctx.missileRect;
      setRotatedXform(xform, 1, 0, cx, cy, 3, 3);
    }
    projDrawCount++;
  }
  for (let i = 0; i < world.orbiterCount; i++) {
    const orbiter = world.orbiters[i];
    const ox = lerp(orbiter.prevX, orbiter.pos.x, alpha);
    const oy = lerp(orbiter.prevY, orbiter.pos.y, alpha);
    ctx.projSrcs[projDrawCount] = ctx.orbRect;
    setRotatedXform(ctx.projXforms[projDrawCount], projTuning.orbScale, orbiter.angle, ox, oy, 50, 50);
    projDrawCount++;
  }
  for (let i = 0; i < world.minions.count; i++) {
    const minion = world.minions.items[i];
    const mx = lerp(minion.prevX, minion.pos.x, alpha);
    const my = lerp(minion.prevY, minion.pos.y, alpha);
    ctx.projSrcs[projDrawCount] = ctx.orbRect;
    setRotatedXform(
      ctx.projXforms[projDrawCount],
      projTuning.minionScale,
      minion.angle,
      mx,
      my,
      50,
      50,
    );
    projDrawCount++;
  }
  for (let i = projDrawCount; i < ctx.projXforms.length; i++) {
    ctx.projXforms[i].set(0, 0, 0, 0);
  }
  canvas.drawAtlas(
    ctx.atlas.image,
    ctx.projSrcs,
    ctx.projXforms,
    ctx.spritePaint,
    undefined,
    undefined,
    NEAREST,
  );

  const px = lerp(world.player.prevX, world.player.pos.x, alpha);
  const py = lerp(world.player.prevY, world.player.pos.y, alpha);
  computeHeroPose(world, ctx.heroPose);
  const rig = tuning.heroRig;
  canvas.save();
  canvas.translate(px, py + ctx.heroPose.bobOffset);
  canvas.scale(world.player.facing * ctx.heroPose.scaleX, ctx.heroPose.scaleY);
  canvas.drawImageRectOptions(
    ctx.heroBody,
    ctx.src16,
    ctx.heroBodyDst,
    FilterMode.Nearest,
    MipmapMode.None,
    ctx.spritePaint,
  );
  if (world.player.weaponVisible) {
    canvas.translate(rig.weaponGripOffsetX, rig.weaponGripOffsetY);
    canvas.rotate(ctx.heroPose.weaponAngleDeg, 0, 0);
    canvas.drawImageRectOptions(
      ctx.heroWeapon,
      ctx.src16,
      ctx.weaponDst,
      FilterMode.Nearest,
      MipmapMode.None,
      ctx.weaponPaint,
    );
  }
  canvas.restore();

  canvas.restore();

  canvas.drawRect(ctx.screenRect, ctx.vignettePaint);

  if (joystick.active) {
    canvas.drawCircle(
      joystick.originX,
      joystick.originY,
      tuning.joystick.radius,
      ctx.joystickBasePaint,
    );
    canvas.drawCircle(
      joystick.originX,
      joystick.originY,
      tuning.joystick.radius,
      ctx.joystickRingPaint,
    );
    let dx = joystick.x - joystick.originX;
    let dy = joystick.y - joystick.originY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > tuning.joystick.radius) {
      dx = (dx / len) * tuning.joystick.radius;
      dy = (dy / len) * tuning.joystick.radius;
    }
    canvas.drawCircle(
      joystick.originX + dx,
      joystick.originY + dy,
      tuning.joystick.knobRadius,
      ctx.joystickKnobPaint,
    );
    canvas.drawCircle(
      joystick.originX + dx,
      joystick.originY + dy,
      tuning.joystick.knobRadius,
      ctx.joystickKnobEdgePaint,
    );
  }
}
