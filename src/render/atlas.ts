import { Skia, type SkImage, type SkRect } from '@shopify/react-native-skia';

export type AtlasEntry = {
  name: string;
  image: SkImage;
  withFlipped?: boolean;
  srcX?: number;
  srcY?: number;
  srcWidth?: number;
  srcHeight?: number;
};

export type SpriteAtlas = {
  image: SkImage;
  rects: Record<string, SkRect>;
};

const PADDING = 2;
const MAX_WIDTH = 2048;

type Placement = {
  entry: AtlasEntry;
  x: number;
  y: number;
  width: number;
  height: number;
  flipped: boolean;
};

export function flippedName(name: string): string {
  return name + '#f';
}

function entryWidth(entry: AtlasEntry): number {
  return entry.srcWidth ?? entry.image.width();
}

function entryHeight(entry: AtlasEntry): number {
  return entry.srcHeight ?? entry.image.height();
}

export function buildAtlas(entries: AtlasEntry[]): SpriteAtlas {
  const placements: Placement[] = [];
  let shelfX = PADDING;
  let shelfY = PADDING;
  let shelfHeight = 0;
  let usedWidth = PADDING;
  for (const entry of entries) {
    const w = entryWidth(entry);
    const h = entryHeight(entry);
    const copies = entry.withFlipped === true ? 2 : 1;
    for (let copy = 0; copy < copies; copy++) {
      if (shelfX + w + PADDING > MAX_WIDTH) {
        shelfY += shelfHeight + PADDING;
        shelfX = PADDING;
        shelfHeight = 0;
      }
      placements.push({ entry, x: shelfX, y: shelfY, width: w, height: h, flipped: copy === 1 });
      shelfX += w + PADDING;
      if (shelfX > usedWidth) usedWidth = shelfX;
      if (h > shelfHeight) shelfHeight = h;
    }
  }
  const width = usedWidth;
  const height = shelfY + shelfHeight + PADDING;
  const surface = Skia.Surface.Make(width, height);
  if (surface === null) {
    throw new Error(`atlas offscreen surface ${width}x${height} failed`);
  }
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  const rects: Record<string, SkRect> = {};
  for (const placement of placements) {
    const entry = placement.entry;
    const src = Skia.XYWHRect(
      entry.srcX ?? 0,
      entry.srcY ?? 0,
      placement.width,
      placement.height,
    );
    canvas.save();
    if (placement.flipped) {
      canvas.translate(placement.x + placement.width, placement.y);
      canvas.scale(-1, 1);
    } else {
      canvas.translate(placement.x, placement.y);
    }
    canvas.drawImageRect(
      entry.image,
      src,
      Skia.XYWHRect(0, 0, placement.width, placement.height),
      paint,
    );
    canvas.restore();
    const name = placement.flipped ? flippedName(entry.name) : entry.name;
    rects[name] = Skia.XYWHRect(placement.x, placement.y, placement.width, placement.height);
  }
  surface.flush();
  return { image: surface.makeImageSnapshot(), rects };
}

export function makeMissileImage(color: string): SkImage {
  const size = 6;
  const surface = Skia.Surface.Make(size, size);
  if (surface === null) {
    throw new Error('missile surface failed');
  }
  const canvas = surface.getCanvas();
  const glow = Skia.Paint();
  glow.setColor(Skia.Color(color));
  canvas.drawCircle(size / 2, size / 2, size / 2, glow);
  const core = Skia.Paint();
  core.setColor(Skia.Color('#ffffff'));
  canvas.drawCircle(size / 2, size / 2, size / 4, core);
  surface.flush();
  return surface.makeImageSnapshot();
}

export function makeGemImage(color: string): SkImage {
  const size = 6;
  const surface = Skia.Surface.Make(size, size);
  if (surface === null) {
    throw new Error('gem surface failed');
  }
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setColor(Skia.Color(color));
  const path = Skia.Path.Make();
  path.moveTo(size / 2, 0);
  path.lineTo(size, size / 2);
  path.lineTo(size / 2, size);
  path.lineTo(0, size / 2);
  path.close();
  canvas.drawPath(path, paint);
  const highlight = Skia.Paint();
  highlight.setColor(Skia.Color('#ffffffaa'));
  canvas.drawRect(Skia.XYWHRect(2, 1, 1, 1), highlight);
  surface.flush();
  return surface.makeImageSnapshot();
}
