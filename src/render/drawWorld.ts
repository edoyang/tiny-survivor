import {
  FilterMode,
  Skia,
  type SkCanvas,
  type SkHostRect,
  type SkPaint,
  type SkRSXform,
  type SkRect,
} from '@shopify/react-native-skia';
import tuning from '../game/data/tuning.json' with { type: 'json' };
import type { World } from '../game/state.ts';
import type { SpriteAtlas } from './atlas.ts';
import { floorTileAt, generateFloorLayout, TILE_SIZE } from './floor.ts';
import type { JoystickState } from './joystick.ts';

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
  playerPaint: SkPaint;
  joystickBasePaint: SkPaint;
  joystickKnobPaint: SkPaint;
  scratchRect: SkHostRect;
  bounds: SkHostRect;
};

const NEAREST = { filter: FilterMode.Nearest };

export function createRenderContext(
  atlas: SpriteAtlas,
  screenWidth: number,
  screenHeight: number,
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
  const playerPaint = Skia.Paint();
  playerPaint.setColor(Skia.Color('#e8e4d8'));
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
    playerPaint,
    joystickBasePaint,
    joystickKnobPaint,
    scratchRect: Skia.XYWHRect(0, 0, 1, 1),
    bounds: Skia.XYWHRect(0, 0, screenWidth, screenHeight),
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
  ctx.scratchRect.setXYWH(px - 8, py - 8, 16, 16);
  canvas.drawRect(ctx.scratchRect, ctx.playerPaint);

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
