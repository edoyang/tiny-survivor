import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { BOSS_NONE, STATUS_DEAD, STATUS_LEVELUP, STATUS_WON } from '../game/kinds.ts';
import { createWorld, type World } from '../game/state.ts';
import { ITEMS, PRESETS } from '../game/systems/items.ts';
import { applyItemPick } from '../game/systems/leveling.ts';
import { GameCanvas } from '../render/GameCanvas.tsx';
import { Hud, type HudSnapshot } from '../render/Hud.tsx';
import { LevelUpOverlay } from '../render/LevelUpOverlay.tsx';
import { Frame, PixelButton } from '../render/PixelUi.tsx';
import { ResultsOverlay } from '../render/ResultsOverlay.tsx';
import { COLORS, MONO } from '../render/theme.ts';

function takeSnapshot(world: World): HudSnapshot {
  let bossHp = 0;
  let bossMaxHp = 0;
  let bossKind = BOSS_NONE;
  for (let i = 0; i < world.enemies.count; i++) {
    const enemy = world.enemies.items[i];
    if (enemy.boss !== BOSS_NONE && enemy.maxHp > bossMaxHp) {
      bossHp = Math.ceil(enemy.hp);
      bossMaxHp = enemy.maxHp;
      bossKind = enemy.boss;
    }
  }
  return {
    status: world.status,
    hp: Math.ceil(world.player.hp),
    maxHp: world.player.maxHp,
    shield: Math.ceil(world.player.shield),
    xp: world.xp,
    xpToNext: world.xpToNext,
    level: world.level,
    kills: world.kills,
    seconds: Math.floor(world.time),
    offer: `${world.itemOffer[0]},${world.itemOffer[1]},${world.itemOffer[2]}`,
    stars: world.itemStars.join(','),
    bossHp,
    bossMaxHp,
    bossKind,
  };
}

function sameSnapshot(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.status === b.status &&
    a.hp === b.hp &&
    a.maxHp === b.maxHp &&
    a.shield === b.shield &&
    a.xp === b.xp &&
    a.xpToNext === b.xpToNext &&
    a.level === b.level &&
    a.kills === b.kills &&
    a.seconds === b.seconds &&
    a.offer === b.offer &&
    a.stars === b.stars &&
    a.bossHp === b.bossHp &&
    a.bossMaxHp === b.bossMaxHp
  );
}

function parseIndex(value: string | undefined, limit: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < limit ? parsed : fallback;
}

export default function Game() {
  const params = useLocalSearchParams<{ classId?: string; presetId?: string }>();
  const classId = parseIndex(params.classId, classes.length, 1);
  const presetId = parseIndex(params.presetId, PRESETS.length, 0);
  const [world] = useState(() => createWorld(Date.now() >>> 0, classId, presetId));
  const [paused] = useState(() => ({ current: false }));
  const [pausedUi, setPausedUi] = useState(false);
  const [snap, setSnap] = useState(() => takeSnapshot(world));

  useEffect(() => {
    const interval = setInterval(() => {
      setSnap((prev) => {
        const next = takeSnapshot(world);
        return sameSnapshot(prev, next) ? prev : next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [world]);

  const togglePause = () => {
    paused.current = !paused.current;
    setPausedUi(paused.current);
  };

  const offer = snap.offer.split(',').map(Number);
  const stars = snap.stars.split(',').map(Number);
  const ownedItems: number[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    if (stars[i] > 0) ownedItems.push(i);
  }
  const runOver = snap.status === STATUS_DEAD || snap.status === STATUS_WON;

  return (
    <View style={styles.root}>
      <GameCanvas world={world} paused={paused} />
      <Hud
        snap={snap}
        paused={pausedUi}
        onTogglePause={togglePause}
        ownedItems={ownedItems}
        stars={stars}
      />
      {pausedUi && !runOver && (
        <View style={styles.pauseBackdrop}>
          <Frame outline={COLORS.gold} fill={COLORS.stone} innerStyle={styles.pausePanel}>
            <Text style={styles.pausedTitle}>PAUSED</Text>
            <View style={styles.pauseRule} />
            <Text style={styles.pausedStat}>LEVEL {snap.level}</Text>
            <Text style={styles.pausedStat}>{snap.kills} KILLS</Text>
            <View style={styles.pauseActions}>
              <PixelButton label="RESUME" onPress={togglePause} primary />
              <PixelButton label="QUIT TO MENU" onPress={() => router.dismissTo('/')} />
            </View>
          </Frame>
        </View>
      )}
      {snap.status === STATUS_LEVELUP && (
        <LevelUpOverlay
          level={snap.level}
          offer={offer}
          stars={stars}
          onPick={(slot) => {
            applyItemPick(world, slot);
            setSnap(takeSnapshot(world));
          }}
        />
      )}
      {runOver && (
        <ResultsOverlay
          snap={snap}
          won={snap.status === STATUS_WON}
          onRetry={() => router.dismissTo('/')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.ink },
  pauseBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  pausePanel: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'stretch', minWidth: 220 },
  pausedTitle: {
    color: COLORS.gold,
    fontFamily: MONO,
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 5,
    textAlign: 'center',
  },
  pauseRule: { height: 2, backgroundColor: COLORS.goldDeep, marginVertical: 12 },
  pausedStat: {
    color: COLORS.muted,
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },
  pauseActions: { gap: 8, marginTop: 18 },
});
