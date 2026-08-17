import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AWAKENED_STARS } from '../game/kinds.ts';
import { ITEMS } from '../game/systems/items.ts';

export type HudSnapshot = {
  status: number;
  hp: number;
  maxHp: number;
  shield: number;
  xp: number;
  xpToNext: number;
  level: number;
  kills: number;
  seconds: number;
  offer: string;
  stars: string;
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
  ownedItems,
  stars,
}: {
  snap: HudSnapshot;
  paused: boolean;
  onTogglePause: () => void;
  ownedItems: number[];
  stars: number[];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.bars} pointerEvents="none">
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, styles.hpFill, { width: `${(100 * snap.hp) / snap.maxHp}%` }]}
            />
            <Text style={styles.barText}>
              {snap.hp}/{snap.maxHp}
              {snap.shield > 0 ? ` +${snap.shield}` : ''}
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
          <Text style={styles.pauseText}>{paused ? '>' : '||'}</Text>
        </Pressable>
      </View>
      <View style={styles.itemRow} pointerEvents="none">
        {ownedItems.map((itemIndex) => {
          const item = ITEMS[itemIndex];
          const owned = stars[itemIndex];
          return (
            <View key={item.id} style={[styles.itemChip, { borderColor: item.color }]}>
              <View style={[styles.itemDot, { backgroundColor: item.color }]} />
              <Text style={styles.itemStars}>
                {owned >= AWAKENED_STARS ? 'A' : owned}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  topRow: { flexDirection: 'row' },
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
  itemRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: '#00000088',
  },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemStars: { color: '#e8e4d8', fontSize: 10, fontWeight: 'bold' },
});
