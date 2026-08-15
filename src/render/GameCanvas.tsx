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
import { MONSTER_SPRITES } from '../game/entities/monsterTypes.ts';
import type { World } from '../game/state.ts';
import { accumulate, interpolationAlpha } from '../game/step.ts';
import { buildAtlas, makeGemImage, makeMissileImage, type AtlasEntry } from './atlas.ts';
import { createRenderContext, drawWorld } from './drawWorld.ts';
import { createJoystick, joystickInput } from './joystick.ts';
import {
  FIREBALL_IMAGE,
  HERO_IMAGES,
  MONSTER_IMAGES,
  ORB_IMAGE,
  TILE_IMAGES,
  WEAPON_IMAGES,
} from './sources.ts';

function emptyPicture(): SkPicture {
  const recorder = Skia.PictureRecorder();
  recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
  return recorder.finishRecordingAsPicture();
}

export function GameCanvas({ world, paused }: { world: World; paused: { current: boolean } }) {
  const { width, height } = useWindowDimensions();
  const picture = useSharedValue<SkPicture>(emptyPicture());
  const [joystick] = useState(createJoystick);
  const cls = classes[world.player.classId];
  const tile42 = useImage(TILE_IMAGES.tile_0042);
  const tile48 = useImage(TILE_IMAGES.tile_0048);
  const tile49 = useImage(TILE_IMAGES.tile_0049);
  const heroBody = useImage(HERO_IMAGES[cls.id]);
  const heroWeapon = useImage(WEAPON_IMAGES[cls.weapon]);
  const swordImg = useImage(WEAPON_IMAGES.sword);
  const axeImg = useImage(WEAPON_IMAGES.axe);
  const fireballImg = useImage(FIREBALL_IMAGE);
  const orbImg = useImage(ORB_IMAGE);
  const slime0 = useImage(MONSTER_IMAGES[0][0]);
  const slime1 = useImage(MONSTER_IMAGES[0][1]);
  const slime2 = useImage(MONSTER_IMAGES[0][2]);
  const slime3 = useImage(MONSTER_IMAGES[0][3]);
  const fly0 = useImage(MONSTER_IMAGES[1][0]);
  const fly1 = useImage(MONSTER_IMAGES[1][1]);
  const fly2 = useImage(MONSTER_IMAGES[1][2]);
  const fly3 = useImage(MONSTER_IMAGES[1][3]);
  const bunny0 = useImage(MONSTER_IMAGES[2][0]);
  const bunny1 = useImage(MONSTER_IMAGES[2][1]);
  const bunny2 = useImage(MONSTER_IMAGES[2][2]);
  const bunny3 = useImage(MONSTER_IMAGES[2][3]);
  const monster0 = useImage(MONSTER_IMAGES[3][0]);
  const monster1 = useImage(MONSTER_IMAGES[3][1]);
  const monster2 = useImage(MONSTER_IMAGES[3][2]);
  const monster3 = useImage(MONSTER_IMAGES[3][3]);

  useEffect(() => {
    const monsterFrames = [
      [slime0, slime1, slime2, slime3],
      [fly0, fly1, fly2, fly3],
      [bunny0, bunny1, bunny2, bunny3],
      [monster0, monster1, monster2, monster3],
    ];
    if (
      tile42 === null ||
      tile48 === null ||
      tile49 === null ||
      heroBody === null ||
      heroWeapon === null ||
      swordImg === null ||
      axeImg === null ||
      fireballImg === null ||
      orbImg === null ||
      monsterFrames.some((frames) => frames.some((img) => img === null))
    ) {
      return;
    }
    const entries: AtlasEntry[] = [
      { name: 'tile_0042', image: tile42 },
      { name: 'tile_0048', image: tile48 },
      { name: 'tile_0049', image: tile49 },
      { name: 'gem', image: makeGemImage(tuning.pickup.gemColor) },
      { name: 'missile', image: makeMissileImage(tuning.projectiles.missileColor) },
      { name: 'sword', image: swordImg },
      { name: 'axe', image: axeImg },
      { name: 'fireball', image: fireballImg },
      { name: 'orb', image: orbImg },
    ];
    for (let type = 0; type < monsterFrames.length; type++) {
      for (let frame = 0; frame < 4; frame++) {
        const image = monsterFrames[type][frame];
        if (image === null) return;
        entries.push({ name: `${MONSTER_SPRITES[type]}_${frame}`, image, withFlipped: true });
      }
    }
    const atlas = buildAtlas(entries);
    const ctx = createRenderContext(atlas, width, height, {
      body: heroBody,
      weapon: heroWeapon,
      tinted: cls.weaponTinted,
    });
    world.viewWidth = ctx.viewWidth;
    world.viewHeight = ctx.viewHeight;
    let raf = 0;
    let last = -1;
    const frame = (now: number) => {
      if (last >= 0) {
        joystickInput(
          joystick,
          tuning.joystick.radius,
          tuning.joystick.deadZone,
          world.player.moveInput,
        );
        if (!paused.current) accumulate(world, (now - last) / 1000);
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
  }, [
    tile42,
    tile48,
    tile49,
    heroBody,
    heroWeapon,
    swordImg,
    axeImg,
    fireballImg,
    orbImg,
    slime0,
    slime1,
    slime2,
    slime3,
    fly0,
    fly1,
    fly2,
    fly3,
    bunny0,
    bunny1,
    bunny2,
    bunny3,
    monster0,
    monster1,
    monster2,
    monster3,
    cls,
    width,
    height,
    joystick,
    picture,
    world,
    paused,
  ]);

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
