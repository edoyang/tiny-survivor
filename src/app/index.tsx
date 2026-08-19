import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { ITEMS, PRESETS } from '../game/systems/items.ts';
import {
  claimIdle,
  EQUIP_SLOTS,
  equippedFor,
  idleFraction,
  idlePending,
  MAPS,
  ownedStars,
} from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { GearIcon } from '../render/GearIcon.tsx';
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
  const equipped = equippedFor(meta, meta.presetId);
  const pending = now === 0 ? 0 : idlePending(meta, now);
  const fraction = now === 0 ? 0 : idleFraction(meta, now);

  return (
    <MetaScreen title="TINY SURVIVORS" subtitle="CAMP">
      <Pressable
        style={styles.stage}
        accessibilityRole="button"
        onPress={() => router.replace('/hero')}
      >
        <Frame
          outline={accent}
          fill={COLORS.stoneDeep}
          style={styles.stageFrame}
          innerStyle={styles.stageBody}
        >
          <View style={styles.stagePortrait}>
            <MenuSprite hero={HERO_IMAGES[cls.id]} weapon={WEAPON_IMAGES[cls.weapon]} size={148} />
            <View style={styles.stageShadow} />
          </View>
          <View style={styles.shelf}>
            <Text style={[styles.heroName, { color: accent }]}>{cls.name.toUpperCase()}</Text>
            <Text style={styles.heroBuild}>{preset.name.toUpperCase()}</Text>
            <View style={styles.loadoutRow}>
              {equipped.map((itemId) => {
                const itemIndex = ITEMS.findIndex((entry) => entry.id === itemId);
                return (
                  <GearIcon
                    key={itemId}
                    itemIndex={itemIndex}
                    size={40}
                    level={ownedStars(meta, itemId)}
                  />
                );
              })}
              {Array.from({ length: EQUIP_SLOTS - equipped.length }, (_, index) => (
                <Frame
                  key={`empty-${index}`}
                  outline={COLORS.ink}
                  fill={COLORS.stoneDeep}
                  sunken
                  innerStyle={styles.emptySlot}
                />
              ))}
            </View>
            <View style={styles.gearHint}>
              <Image source={UI_ICONS.inventory} style={styles.gearHintIcon} />
              <Text style={styles.gearHintText}>
                {ownedCount}/{ITEMS.length} GEAR  ·  TAP TO CHANGE LOADOUT
              </Text>
            </View>
          </View>
        </Frame>
      </Pressable>

      <Frame outline={COLORS.gold} fill={COLORS.stone} innerStyle={styles.idleCard}>
        <View style={styles.idleRow}>
          <Image source={UI_ICONS.idle} style={styles.idleIcon} />
          <View style={styles.idleText}>
            <Text style={styles.idleTitle}>IDLE REWARDS</Text>
            <View style={styles.idleAmountRow}>
              <Image source={UI_ICONS.coin} style={styles.coinIcon} />
              <Text style={styles.idleAmount}>{pending}</Text>
              <Text style={styles.idleCap}>
                {fraction >= 1 ? 'STORE FULL' : `${Math.round(fraction * 100)}% OF STORE`}
              </Text>
            </View>
          </View>
          <PixelButton
            label={pending > 0 ? 'CLAIM' : 'EMPTY'}
            primary={pending > 0}
            style={styles.claimButton}
            onPress={() => {
              if (pending > 0) updateMeta((state) => claimIdle(state, Date.now()));
            }}
          />
        </View>
        <SegmentBar
          ratio={fraction}
          color={COLORS.gold}
          track={COLORS.stoneDeep}
          height={10}
          segments={8}
        />
      </Frame>

      <View style={styles.launch}>
        <View style={styles.launchHead}>
          <Text style={styles.nextLabel}>NEXT RUN</Text>
          <Text style={styles.nextMap}>{map.name.toUpperCase()}</Text>
        </View>
        <PixelButton
          label="TO BATTLE"
          primary
          onPress={() => router.replace('/battle')}
          labelStyle={styles.launchLabel}
        />
      </View>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, minHeight: 0 },
  stageFrame: { flex: 1 },
  stageBody: { flex: 1, overflow: 'hidden' },
  stagePortrait: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 12 },
  stageShadow: { width: 96, height: 6, backgroundColor: COLORS.ink, marginTop: -6, opacity: 0.7 },
  shelf: {
    backgroundColor: COLORS.stone,
    borderTopWidth: 2,
    borderTopColor: COLORS.bevelLight,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  heroName: { fontFamily: MONO, fontSize: 22, fontWeight: 'bold', letterSpacing: 3 },
  heroBuild: { color: COLORS.parchment, fontFamily: MONO, fontSize: 12, letterSpacing: 2 },
  loadoutRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  emptySlot: { width: 40, height: 40 },
  gearHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  gearHintIcon: { width: 16, height: 16, opacity: 0.7 },
  gearHintText: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  idleCard: { marginTop: 12, padding: 10, gap: 8 },
  idleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  idleIcon: { width: 28, height: 28 },
  idleText: { flex: 1 },
  idleTitle: { color: COLORS.gold, fontFamily: MONO, fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  idleAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  coinIcon: { width: 16, height: 16 },
  idleAmount: { color: COLORS.parchment, fontFamily: MONO, fontSize: 16, fontWeight: 'bold' },
  idleCap: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1, marginLeft: 4 },
  claimButton: { width: 104 },
  launch: { marginTop: 12, gap: 8 },
  launchHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  nextLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 2 },
  nextMap: { color: COLORS.parchment, fontFamily: MONO, fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
  launchLabel: { fontSize: 17, letterSpacing: 4 },
});
