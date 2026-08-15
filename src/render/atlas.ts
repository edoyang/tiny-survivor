import { Skia, type SkImage, type SkRect } from '@shopify/react-native-skia';

export type AtlasEntry = { name: string; image: SkImage; withFlipped?: boolean };

export type SpriteAtlas = {
  image: SkImage;
  rects: Record<string, SkRect>;
};

const PADDING = 2;

export function flippedName(name: string): string {
  return name + '#f';
}

export function buildAtlas(entries: AtlasEntry[]): SpriteAtlas {
  let width = PADDING;
  let height = 0;
  for (const e of entries) {
    const copies = e.withFlipped === true ? 2 : 1;
    width += (e.image.width() + PADDING) * copies;
    if (e.image.height() > height) height = e.image.height();
  }
  height += PADDING * 2;
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (surface === null) {
    throw new Error(`atlas offscreen surface ${width}x${height} failed`);
  }
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  const rects: Record<string, SkRect> = {};
  let x = PADDING;
  for (const e of entries) {
    const w = e.image.width();
    const h = e.image.height();
    canvas.drawImage(e.image, x, PADDING, paint);
    rects[e.name] = Skia.XYWHRect(x, PADDING, w, h);
    x += w + PADDING;
    if (e.withFlipped === true) {
      canvas.save();
      canvas.translate(x + w, PADDING);
      canvas.scale(-1, 1);
      canvas.drawImage(e.image, 0, 0, paint);
      canvas.restore();
      rects[flippedName(e.name)] = Skia.XYWHRect(x, PADDING, w, h);
      x += w + PADDING;
    }
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  return { image, rects };
}

export function makeMissileImage(color: string): SkImage {
  const size = 6;
  const surface = Skia.Surface.MakeOffscreen(size, size);
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
  const surface = Skia.Surface.MakeOffscreen(size, size);
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
