import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { ITEMS, PRESETS } from '../game/systems/items.ts';
import { claimIdle, idleFraction, idlePending, MAPS, ownedStars } from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { UI_ICONS } from '../render/icons.ts';
import { MenuSprite } from '../render/MenuSprite.tsx';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame, PixelButton, SegmentBar } from '../render/PixelUi.tsx';
import { HERO_IMAGES, WEAPON_IMAGES } from '../render/sources.ts';
import { CLASS_COLORS, COLORS, MONO } from '../render/theme.ts';
import { useMeta, useNow } from '../render/useMeta.ts';

export default function Home() {
  const meta = useMeta();
  const now = useNow(15000);
  const cls = classes[meta.classId];
  const preset = PRESETS[meta.presetId];
  const accent = CLASS_COLORS[meta.classId];
  const map = MAPS[meta.mapId];
  const ownedCount = ITEMS.filter((item) => ownedStars(meta, item.id) > 0).length;
  const pending = now === 0 ? 0 : idlePending(meta, now);
  const fraction = now === 0 ? 0 : idleFraction(meta, now);

  return (
    <MetaScreen title="TINY SURVIVORS" subtitle="CAMP">
      <Pressable onPress={() => router.replace('/hero')} accessibilityRole="button">
        <Frame outline={accent} fill={COLORS.stone} innerStyle={styles.heroCard}>
          <Frame outline={COLORS.ink} fill={COLORS.stoneDeep} sunken innerStyle={styles.portrait}>
            <MenuSprite hero={HERO_IMAGES[cls.id]} weapon={WEAPON_IMAGES[cls.weapon]} size={72} />
          </Frame>
          <View style={styles.heroText}>
            <Text style={[styles.heroName, { color: accent }]}>{cls.name.toUpperCase()}</Text>
            <Text style={styles.heroBuild}>{preset.name.toUpperCase()}</Text>
            <Text style={styles.heroHint}>TAP TO GEAR UP</Text>
          </View>
        </Frame>
      </Pressable>

      <Frame outline={COLORS.gold} fill={COLORS.stone} innerStyle={styles.idleCard}>
        <View style={styles.idleHead}>
          <Image source={UI_ICONS.idle} style={styles.idleIcon} />
          <View style={styles.idleHeadText}>
            <Text style={styles.idleTitle}>IDLE REWARDS</Text>
            <Text style={styles.idleNote}>The camp earns coins while you are away.</Text>
          </View>
        </View>
        <View style={styles.idleAmountRow}>
          <Image source={UI_ICONS.coin} style={styles.coinIcon} />
          <Text style={styles.idleAmount}>{pending}</Text>
        </View>
        <SegmentBar
          ratio={fraction}
          color={COLORS.gold}
          track={COLORS.stoneDeep}
          height={12}
          segments={8}
        />
        <Text style={styles.idleCap}>
          {fraction >= 1 ? 'STORE IS FULL' : `${Math.round(fraction * 100)}% OF STORE`}
        </Text>
        <PixelButton
          label={pending > 0 ? 'CLAIM' : 'NOTHING YET'}
          primary={pending > 0}
          onPress={() => {
            if (pending > 0) updateMeta((state) => claimIdle(state, Date.now()));
          }}
        />
      </Frame>

      <Frame outline={COLORS.ink} fill={COLORS.stone} style={styles.collectionFrame} innerStyle={styles.collectionCard}>
        <View style={styles.collectionHead}>
          <Image source={UI_ICONS.inventory} style={styles.collectionIcon} />
          <View style={styles.collectionText}>
            <Text style={styles.collectionTitle}>COLLECTION</Text>
            <Text style={styles.collectionNote}>
              {ownedCount} of {ITEMS.length} pieces of gear found
            </Text>
          </View>
        </View>
        <SegmentBar
          ratio={ownedCount / ITEMS.length}
          color={COLORS.xp}
          track={COLORS.stoneDeep}
          height={12}
          segments={10}
        />
        <PixelButton label="SUMMON GEAR" onPress={() => router.replace('/gacha')} />
      </Frame>

      <Frame outline={COLORS.ink} fill={COLORS.stone} innerStyle={styles.nextCard}>
        <View style={styles.nextText}>
          <Text style={styles.nextLabel}>NEXT RUN</Text>
          <Text style={styles.nextMap}>{map.name.toUpperCase()}</Text>
        </View>
        <PixelButton
          label="TO BATTLE"
          primary
          onPress={() => router.replace('/battle')}
          style={styles.nextButton}
        />
      </Frame>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  portrait: { width: 72, height: 72 },
  heroText: { flex: 1 },
  heroName: { fontFamily: MONO, fontSize: 20, fontWeight: 'bold', letterSpacing: 2 },
  heroBuild: { color: COLORS.parchment, fontFamily: MONO, fontSize: 12, letterSpacing: 1, marginTop: 2 },
  heroHint: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1, marginTop: 6 },
  idleCard: { marginTop: 10, padding: 12, gap: 10 },
  idleHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  idleIcon: { width: 30, height: 30 },
  idleHeadText: { flex: 1 },
  idleTitle: { color: COLORS.gold, fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 2 },
  idleNote: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  idleAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  coinIcon: { width: 22, height: 22 },
  idleAmount: { color: COLORS.parchment, fontFamily: MONO, fontSize: 30, fontWeight: 'bold' },
  idleCap: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1, textAlign: 'center' },
  collectionFrame: { flex: 1, marginTop: 10 },
  collectionCard: { flex: 1, padding: 12, gap: 10, justifyContent: 'center' },
  collectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  collectionIcon: { width: 28, height: 28 },
  collectionText: { flex: 1 },
  collectionTitle: { color: COLORS.parchment, fontFamily: MONO, fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
  collectionNote: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, marginTop: 10 },
  nextText: { flex: 1 },
  nextLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 2 },
  nextMap: { color: COLORS.parchment, fontFamily: MONO, fontSize: 15, fontWeight: 'bold', marginTop: 2 },
  nextButton: { width: 150 },
});
