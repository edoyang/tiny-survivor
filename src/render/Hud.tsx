import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type HudSnapshot = {
  status: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  kills: number;
  seconds: number;
  offer: string;
};

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function Hud({
  snap,
  paused,
  onTogglePause,
}: {
  snap: HudSnapshot;
  paused: boolean;
  onTogglePause: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.bars} pointerEvents="none">
        <View style={styles.barTrack}>
          <View
            style={[styles.barFill, styles.hpFill, { width: `${(100 * snap.hp) / snap.maxHp}%` }]}
          />
          <Text style={styles.barText}>
            {snap.hp}/{snap.maxHp}
          </Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              styles.xpFill,
              { width: `${Math.min(100, (100 * snap.xp) / snap.xpToNext)}%` },
            ]}
          />
          <Text style={styles.barText}>Lv {snap.level}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>{formatTime(snap.seconds)}</Text>
          <Text style={styles.stat}>{snap.kills} kills</Text>
        </View>
      </View>
      <Pressable style={styles.pauseButton} onPress={onTogglePause}>
        <Text style={styles.pauseText}>{paused ? '▶' : '| |'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  bars: { flex: 1, gap: 4 },
  barTrack: {
    height: 16,
    backgroundColor: '#00000088',
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  hpFill: { backgroundColor: '#e05252' },
  xpFill: { backgroundColor: '#5e9fe9' },
  barText: { color: '#e8e4d8', fontSize: 10, textAlign: 'center', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  stat: { color: '#e8e4d8', fontSize: 12, fontWeight: 'bold' },
  pauseButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: { color: '#e8e4d8', fontSize: 14, fontWeight: 'bold' },
});
