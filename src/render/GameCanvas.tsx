import {
  Canvas,
  Picture,
  Skia,
  useImage,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import classes from '../game/data/classes.json' with { type: 'json' };
import tuning from '../game/data/tuning.json' with { type: 'json' };
import { CLASS_KNIGHT, createWorld } from '../game/state.ts';
import { accumulate, interpolationAlpha } from '../game/step.ts';
import { buildAtlas } from './atlas.ts';
import { createRenderContext, drawWorld } from './drawWorld.ts';
import { createJoystick, joystickInput } from './joystick.ts';

const HERO_IMAGES: Record<string, number> = {
  wizard: require('@/assets/sprites/HERO/wizard.png'),
  knight: require('@/assets/sprites/HERO/knight.png'),
  dwarf: require('@/assets/sprites/HERO/dwarf.png'),
  priest: require('@/assets/sprites/HERO/priest.png'),
};

const WEAPON_IMAGES: Record<string, number> = {
  wand: require('@/assets/sprites/Equipment/wand.png'),
  sword: require('@/assets/sprites/Equipment/sword.png'),
  axe: require('@/assets/sprites/Equipment/axe.png'),
};

const CLASS_ID = CLASS_KNIGHT;

function emptyPicture(): SkPicture {
  const recorder = Skia.PictureRecorder();
  recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return recorder.finishRecordingAsPicture();
}

export function GameCanvas() {
  const { width, height } = useWindowDimensions();
  const picture = useSharedValue<SkPicture>(emptyPicture());
  const [joystick] = useState(createJoystick);
  const tile42 = useImage(require('@/assets/sprites/T_Dungeon/tile_0042.png'));
  const tile48 = useImage(require('@/assets/sprites/T_Dungeon/tile_0048.png'));
  const tile49 = useImage(require('@/assets/sprites/T_Dungeon/tile_0049.png'));
  const cls = classes[CLASS_ID];
  const heroBody = useImage(HERO_IMAGES[cls.id]);
  const heroWeapon = useImage(WEAPON_IMAGES[cls.weapon]);

  useEffect(() => {
    if (
      tile42 === null ||
      tile48 === null ||
      tile49 === null ||
      heroBody === null ||
      heroWeapon === null
    ) {
      return;
    }
    const atlas = buildAtlas([
      { name: 'tile_0042', image: tile42 },
      { name: 'tile_0048', image: tile48 },
      { name: 'tile_0049', image: tile49 },
    ]);
    const ctx = createRenderContext(atlas, width, height, {
      body: heroBody,
      weapon: heroWeapon,
      tinted: cls.weaponTinted,
    });
    const world = createWorld(Date.now() >>> 0, CLASS_ID);
    world.viewWidth = ctx.viewWidth;
    world.viewHeight = ctx.viewHeight;
    let raf = 0;
    let last = -1;
    const frame = (now: number) => {
      if (last >= 0) {
        joystickInput(joystick, tuning.joystick.radius, tuning.joystick.deadZone, world.player.moveInput);
        accumulate(world, (now - last) / 1000);
        const recorder = Skia.PictureRecorder();
        const recordingCanvas = recorder.beginRecording(ctx.bounds);
        drawWorld(recordingCanvas, ctx, world, interpolationAlpha(world), joystick);
        picture.value = recorder.finishRecordingAsPicture();
      }
      last = now;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [tile42, tile48, tile49, heroBody, heroWeapon, cls, width, height, joystick, picture]);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      joystick.active = true;
      joystick.originX = e.x;
      joystick.originY = e.y;
      joystick.x = e.x;
      joystick.y = e.y;
    })
    .onUpdate((e) => {
      joystick.x = e.x;
      joystick.y = e.y;
    })
    .onFinalize(() => {
      joystick.active = false;
    });

  return (
    <GestureDetector gesture={pan}>
      <View style={{ flex: 1, backgroundColor: '#16161d' }}>
        <Canvas style={{ flex: 1 }}>
          <Picture picture={picture} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
