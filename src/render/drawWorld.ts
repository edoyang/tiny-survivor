import {
  BlendMode,
  FilterMode,
  MipmapMode,
  Skia,
  type SkCanvas,
  type SkHostRect,
  type SkImage,
  type SkPaint,
  type SkRSXform,
  type SkRect,
} from '@shopify/react-native-skia';
import tuning from '../game/data/tuning.json' with { type: 'json' };
import type { World } from '../game/state.ts';
import type { SpriteAtlas } from './atlas.ts';
import { floorTileAt, generateFloorLayout, TILE_SIZE } from './floor.ts';
import { computeHeroPose, createHeroPose, type HeroPose } from './hero.ts';
import type { JoystickState } from './joystick.ts';

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
  joystickBasePaint: SkPaint;
  joystickKnobPaint: SkPaint;
  scratchRect: SkHostRect;
  bounds: SkHostRect;
  heroBody: SkImage;
  heroWeapon: SkImage;
  weaponPaint: SkPaint;
  src16: SkRect;
  heroBodyDst: SkRect;
  weaponDst: SkRect;
  heroPose: HeroPose;
};

const NEAREST = { filter: FilterMode.Nearest };

export function createRenderContext(
  atlas: SpriteAtlas,
  screenWidth: number,
  screenHeight: number,
  hero: HeroImages,
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
  const joystickBasePaint = Skia.Paint();
  joystickBasePaint.setColor(Skia.Color('#ffffff22'));
  const joystickKnobPaint = Skia.Paint();
  joystickKnobPaint.setColor(Skia.Color('#ffffff55'));
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
    joystickBasePaint,
    joystickKnobPaint,
    scratchRect: Skia.XYWHRect(0, 0, 1, 1),
    bounds: Skia.XYWHRect(0, 0, screenWidth, screenHeight),
    heroBody: hero.body,
    heroWeapon: hero.weapon,
    weaponPaint,
    src16: Skia.XYWHRect(0, 0, 16, 16),
    heroBodyDst: Skia.XYWHRect(-8, -8, 16, 16),
    weaponDst: Skia.XYWHRect(-rig.weaponPivotX, -rig.weaponPivotY, 16, 16),
    heroPose: createHeroPose(),
  };
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
  canvas.restore();

  canvas.restore();

  if (joystick.active) {
    canvas.drawCircle(joystick.originX, joystick.originY, tuning.joystick.radius, ctx.joystickBasePaint);
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
  }
}
