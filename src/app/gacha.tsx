import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ITEMS } from '../game/systems/items.ts';
import { gachaCost, ownedStars, rollGacha } from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { GearIcon } from '../render/GearIcon.tsx';
import { TILE_CHROME, useGrid } from '../render/grid.ts';
import { UI_ICONS } from '../render/icons.ts';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame, PixelButton } from '../render/PixelUi.tsx';
import { COLORS, MONO } from '../render/theme.ts';
import { useMeta } from '../render/useMeta.ts';

const COLUMNS = 5;

export default function Gacha() {
  const meta = useMeta();
  const grid = useGrid(COLUMNS);
  const [results, setResults] = useState<string[]>([]);
  const [notice, setNotice] = useState('PRICES ARE IN GEMS');
  const roll = (count: number) => {
    const rolled = updateMeta((state) => rollGacha(state, count));
    if (rolled.length > 0) {
      setResults(rolled);
      setNotice(`SUMMONED ${rolled.length}`);
      return;
    }
    setNotice('NOT ENOUGH GEMS');
  };
  return (
    <MetaScreen title="SUMMON" subtitle={`${meta.rolls} SUMMONS SO FAR`}>
      <Frame outline={COLORS.gold} fill={COLORS.stone} innerStyle={styles.banner}>
        <Image source={UI_ICONS.gacha} style={styles.bannerIcon} />
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>RELIC CHEST</Text>
          <Text style={styles.bannerNote}>
            Any piece can drop. Duplicates add a star.
          </Text>
        </View>
      </Frame>

      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={[
          styles.results,
          { gap: grid.gutter },
          results.length === 0 ? styles.resultsEmpty : null,
        ]}
      >
        {results.length === 0 ? (
          <Text style={styles.empty}>NOTHING SUMMONED YET</Text>
        ) : (
          results.map((itemId, index) => {
            const itemIndex = ITEMS.findIndex((entry) => entry.id === itemId);
            return (
              <View
                key={`${itemId}-${index}`}
                style={[styles.resultCell, { width: grid.tile + TILE_CHROME }]}
              >
                <GearIcon
                  itemIndex={itemIndex}
                  size={grid.tile}
                  level={ownedStars(meta, itemId)}
                />
                <Text style={styles.resultName} numberOfLines={2}>
                  {ITEMS[itemIndex].name}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.actions}>
        <PixelButton
          label={`SUMMON 1   ${gachaCost(1)}`}
          primary={meta.gems >= gachaCost(1)}
          onPress={() => roll(1)}
          style={styles.action}
        />
        <PixelButton
          label={`SUMMON 10   ${gachaCost(10)}`}
          primary={meta.gems >= gachaCost(10)}
          onPress={() => roll(10)}
          style={styles.action}
        />
      </View>
      <Text style={styles.costNote}>{notice}</Text>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  bannerIcon: { width: 38, height: 38 },
  bannerText: { flex: 1 },
  bannerTitle: { color: COLORS.gold, fontFamily: MONO, fontSize: 14, fontWeight: 'bold', letterSpacing: 3 },
  bannerNote: { color: COLORS.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  resultsScroll: { flex: 1, minHeight: 0 },
  results: {
    flexGrow: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 16,
    alignContent: 'flex-start',
  },
  resultsEmpty: { alignContent: 'center', justifyContent: 'center' },
  empty: { width: '100%', color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 2, textAlign: 'center' },
  resultCell: { alignItems: 'center', gap: 4 },
  resultName: { color: COLORS.muted, fontSize: 9, lineHeight: 12, textAlign: 'center', height: 24 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  costNote: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 2, textAlign: 'center', paddingTop: 6 },
});
