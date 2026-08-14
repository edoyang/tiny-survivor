import { Skia, type SkImage, type SkRect } from '@shopify/react-native-skia';

export type AtlasEntry = { name: string; image: SkImage };

export type SpriteAtlas = {
  image: SkImage;
  rects: Record<string, SkRect>;
};

const PADDING = 2;

export function buildAtlas(entries: AtlasEntry[]): SpriteAtlas {
  let width = PADDING;
  let height = 0;
  for (const e of entries) {
    width += e.image.width() + PADDING;
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
  }
  surface.flush();
  const image = surface.makeImageSnapshot();
  return { image, rects };
}
