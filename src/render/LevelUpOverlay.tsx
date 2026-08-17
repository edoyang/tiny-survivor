import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AWAKENED_STARS, MAX_STARS } from '../game/kinds.ts';
import { ITEMS } from '../game/systems/items.ts';

function StarBar({ owned, color }: { owned: number; color: string }) {
  const pips = [];
  for (let i = 0; i < MAX_STARS; i++) {
    const filled = i < Math.min(owned + 1, MAX_STARS);
    pips.push(
      <View
        key={i}
        style={[styles.pip, filled ? { backgroundColor: color } : styles.pipEmpty]}
      />,
    );
  }
  return <View style={styles.pipRow}>{pips}</View>;
}

export function LevelUpOverlay({
  offer,
  stars,
  onPick,
}: {
  offer: number[];
  stars: number[];
  onPick: (slot: number) => void;
}) {
  return (
    <View style={styles.backdrop}>
      <Text style={styles.title}>LEVEL UP</Text>
      <Text style={styles.subtitle}>Take one</Text>
      <View style={styles.row}>
        {offer.map((itemIndex, slot) => {
          if (itemIndex < 0) return null;
          const item = ITEMS[itemIndex];
          const owned = stars[itemIndex] ?? 0;
          const awakening = owned >= MAX_STARS;
          return (
            <Pressable
              key={slot}
              style={[styles.card, { borderColor: item.color }]}
              onPress={() => onPick(slot)}
            >
              <View style={[styles.banner, { backgroundColor: item.color }]}>
                <Text style={styles.bannerText}>
                  {awakening ? 'AWAKEN' : owned === 0 ? 'NEW' : `STAR ${owned + 1}`}
                </Text>
              </View>
              <View style={[styles.crest, { backgroundColor: item.color }]} />
              <Text style={[styles.name, { color: item.color }]} numberOfLines={3}>
                {item.name}
              </Text>
              <StarBar owned={awakening ? MAX_STARS : owned} color={item.color} />
              <Text style={styles.description} numberOfLines={6}>
                {awakening ? item.awaken : item.star}
              </Text>
              {owned >= AWAKENED_STARS && <Text style={styles.maxed}>MAXED</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0d0d12f2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  title: { color: '#5ee9a0', fontSize: 30, fontWeight: 'bold', letterSpacing: 3 },
  subtitle: { color: '#9a9aa8', fontSize: 13, marginTop: 2, marginBottom: 18 },
  row: { flexDirection: 'row', alignSelf: 'stretch', gap: 8 },
  card: {
    flex: 1,
    minHeight: 260,
    backgroundColor: '#24242e',
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingBottom: 12,
    alignItems: 'center',
    overflow: 'hidden',
  },
  banner: {
    alignSelf: 'stretch',
    marginHorizontal: -8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  bannerText: { color: '#16161d', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  crest: { width: 34, height: 34, borderRadius: 17, marginTop: 14, marginBottom: 10 },
  name: { fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  pipRow: { flexDirection: 'row', gap: 3, marginTop: 8, marginBottom: 10 },
  pip: { width: 8, height: 8, borderRadius: 2 },
  pipEmpty: { backgroundColor: '#3a3a48' },
  description: { color: '#9a9aa8', fontSize: 11, textAlign: 'center', lineHeight: 15 },
  maxed: { color: '#5ee9a0', fontSize: 10, fontWeight: 'bold', marginTop: 8, letterSpacing: 1 },
});
