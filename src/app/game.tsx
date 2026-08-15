import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { applyUpgrade } from '../game/systems/leveling.ts';
import {
  createWorld,
  STATUS_DEAD,
  STATUS_LEVELUP,
  type World,
} from '../game/state.ts';
import { GameCanvas } from '../render/GameCanvas.tsx';
import { Hud, type HudSnapshot } from '../render/Hud.tsx';
import { LevelUpOverlay } from '../render/LevelUpOverlay.tsx';
import { ResultsOverlay } from '../render/ResultsOverlay.tsx';

function takeSnapshot(world: World): HudSnapshot {
  return {
    status: world.status,
    hp: world.player.hp,
    maxHp: world.player.maxHp,
    xp: world.xp,
    xpToNext: world.xpToNext,
    level: world.level,
    kills: world.kills,
    seconds: Math.floor(world.time),
    offer: `${world.upgradeOffer[0]},${world.upgradeOffer[1]},${world.upgradeOffer[2]}`,
  };
}

function sameSnapshot(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.status === b.status &&
    a.hp === b.hp &&
    a.maxHp === b.maxHp &&
    a.xp === b.xp &&
    a.xpToNext === b.xpToNext &&
    a.level === b.level &&
    a.kills === b.kills &&
    a.seconds === b.seconds &&
    a.offer === b.offer
  );
}

export default function Game() {
  const params = useLocalSearchParams<{ classId?: string }>();
  const parsed = Number(params.classId);
  const classId = Number.isInteger(parsed) && parsed >= 0 && parsed < classes.length ? parsed : 1;
  const [world] = useState(() => createWorld(Date.now() >>> 0, classId));
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

  return (
    <View style={{ flex: 1, backgroundColor: '#16161d' }}>
      <GameCanvas world={world} paused={paused} />
      <Hud snap={snap} paused={pausedUi} onTogglePause={togglePause} />
      {pausedUi && snap.status !== STATUS_DEAD && (
        <Pressable style={styles.pauseBackdrop} onPress={togglePause}>
          <Text style={styles.pausedTitle}>PAUSED</Text>
          <Text style={styles.pausedHint}>Tap anywhere to resume</Text>
        </Pressable>
      )}
      {snap.status === STATUS_LEVELUP && (
        <LevelUpOverlay
          offer={offer}
          onPick={(slot) => {
            applyUpgrade(world, slot);
            setSnap(takeSnapshot(world));
          }}
        />
      )}
      {snap.status === STATUS_DEAD && (
        <ResultsOverlay snap={snap} onRetry={() => router.dismissTo('/')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pauseBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#16161dcc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedTitle: { color: '#e8e4d8', fontSize: 28, fontWeight: 'bold', letterSpacing: 3 },
  pausedHint: { color: '#9a9aa8', fontSize: 13, marginTop: 8 },
});
