import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AWAKENED_STARS, MAX_STARS } from '../game/kinds.ts';
import { ITEMS } from '../game/systems/items.ts';
import { GearIcon, StarRow } from './GearIcon.tsx';
import { Frame } from './PixelUi.tsx';
import { COLORS, MONO } from './theme.ts';

export function LevelUpOverlay({
  level,
  offer,
  stars,
  onPick,
}: {
  level: number;
  offer: number[];
  stars: number[];
  onPick: (slot: number) => void;
}) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.header}>
        <Text style={styles.title}>LEVEL UP</Text>
        <Frame outline={COLORS.ink} fill={COLORS.stone} innerStyle={styles.levelChip}>
          <Text style={styles.levelText}>LV {level}</Text>
        </Frame>
        <Text style={styles.subtitle}>CHOOSE ONE</Text>
      </View>

      <View style={styles.row}>
        {offer.map((itemIndex, slot) => {
          if (itemIndex < 0) return null;
          const item = ITEMS[itemIndex];
          const owned = stars[itemIndex] ?? 0;
          const awakening = owned >= MAX_STARS;
          const accent = awakening ? COLORS.gold : item.color;
          return (
            <Pressable
              key={slot}
              style={({ pressed }) => [styles.cardWrap, pressed ? styles.pressed : null]}
              onPress={() => onPick(slot)}
              accessibilityRole="button"
            >
              <Frame outline={accent} fill={COLORS.stone} style={styles.card} innerStyle={styles.cardBody}>
                <View style={[styles.banner, { backgroundColor: accent }]}>
                  <Text style={styles.bannerText}>
                    {awakening ? 'AWAKEN' : owned === 0 ? 'NEW' : `STAR ${owned + 1}`}
                  </Text>
                </View>
                <View style={styles.cardContent}>
                  <GearIcon
                    itemIndex={itemIndex}
                    size={52}
                    level={owned + 1}
                    style={styles.crestPlate}
                  />
                  <Text style={[styles.name, { color: accent }]} numberOfLines={3}>
                    {item.name}
                  </Text>
                  <View style={styles.stars}>
                    <StarRow filled={awakening ? MAX_STARS : owned + 1} size={11} />
                  </View>
                  <Text style={styles.description} numberOfLines={7}>
                    {awakening ? item.awaken : item.star}
                  </Text>
                  {owned >= AWAKENED_STARS && <Text style={styles.maxed}>MAXED</Text>}
                </View>
              </Frame>
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
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 40,
  },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { color: COLORS.gold, fontFamily: MONO, fontSize: 28, fontWeight: 'bold', letterSpacing: 5 },
  levelChip: { paddingHorizontal: 10, paddingVertical: 2, marginTop: 8 },
  levelText: { color: COLORS.parchment, fontFamily: MONO, fontSize: 12, letterSpacing: 2 },
  subtitle: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 3, marginTop: 8 },
  row: { flexDirection: 'row', alignSelf: 'stretch', gap: 6 },
  cardWrap: { flex: 1 },
  pressed: { transform: [{ translateY: 2 }] },
  card: { flex: 1 },
  cardBody: { flex: 1 },
  banner: { alignSelf: 'stretch', paddingVertical: 3, alignItems: 'center' },
  bannerText: { color: COLORS.ink, fontFamily: MONO, fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  cardContent: { flex: 1, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 10 },
  crestPlate: { marginTop: 12, marginBottom: 8 },
  stars: { marginTop: 8, marginBottom: 8 },
  name: { fontFamily: MONO, fontSize: 12, fontWeight: 'bold', textAlign: 'center', letterSpacing: 0.5 },
  description: { color: COLORS.parchment, fontSize: 11, textAlign: 'center', lineHeight: 15 },
  maxed: { color: COLORS.gold, fontFamily: MONO, fontSize: 9, fontWeight: 'bold', marginTop: 8, letterSpacing: 2 },
});
