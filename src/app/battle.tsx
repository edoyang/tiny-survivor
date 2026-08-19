import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mapUnlocked, MAPS } from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { UI_ICONS } from '../render/icons.ts';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame } from '../render/PixelUi.tsx';
import { COLORS, MONO } from '../render/theme.ts';
import { useMeta } from '../render/useMeta.ts';

export default function Battle() {
  const meta = useMeta();
  return (
    <MetaScreen title="CHOOSE A MAP" subtitle={`${meta.clears} MAPS CLEARED`}>
      <ScrollView contentContainerStyle={styles.list}>
        {MAPS.map((map, mapId) => {
          const unlocked = mapUnlocked(meta, mapId);
          const selected = meta.mapId === mapId;
          return (
            <Pressable
              key={map.id}
              accessibilityRole="button"
              onPress={() => {
                if (!unlocked) return;
                updateMeta((state) => {
                  state.mapId = mapId;
                });
                router.push({ pathname: '/select', params: { mapId: String(mapId) } });
              }}
            >
              <Frame
                outline={unlocked ? (selected ? COLORS.gold : COLORS.ink) : COLORS.bevelDark}
                fill={COLORS.stone}
                innerStyle={styles.card}
              >
                <Image
                  source={unlocked ? UI_ICONS.map : UI_ICONS.lock}
                  style={[styles.icon, unlocked ? null : styles.dim]}
                />
                <View style={styles.text}>
                  <Text style={[styles.name, unlocked ? null : styles.dimText]}>
                    {map.name.toUpperCase()}
                  </Text>
                  <Text style={styles.blurb} numberOfLines={2}>
                    {unlocked
                      ? map.blurb
                      : `Clear ${map.clearsToUnlock} ${
                          map.clearsToUnlock === 1 ? 'map' : 'maps'
                        } to open this one.`}
                  </Text>
                  <View style={styles.statRow}>
                    <Text style={styles.stat}>ENEMY HP x{map.hpMult}</Text>
                    <Text style={styles.stat}>SPEED x{map.speedMult}</Text>
                    <Text style={[styles.stat, styles.reward]}>COINS x{map.rewardMult}</Text>
                  </View>
                </View>
              </Frame>
            </Pressable>
          );
        })}
      </ScrollView>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  icon: { width: 40, height: 40 },
  dim: { opacity: 0.35 },
  text: { flex: 1 },
  name: { color: COLORS.parchment, fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2 },
  dimText: { color: COLORS.muted },
  blurb: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  stat: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 0.5 },
  reward: { color: COLORS.gold },
});
