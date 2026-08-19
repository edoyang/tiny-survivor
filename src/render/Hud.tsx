import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AWAKENED_STARS, BOSS_FINAL } from '../game/kinds.ts';
import { ITEMS } from '../game/systems/items.ts';
import { Frame, SegmentBar } from './PixelUi.tsx';
import { COLORS, MONO } from './theme.ts';

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
  bossHp: number;
  bossMaxHp: number;
  bossKind: number;
};

const LOW_HP_RATIO = 0.34;

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
  const hpRatio = snap.hp / snap.maxHp;
  return (
    <>
      {hpRatio <= LOW_HP_RATIO && (
        <View pointerEvents="none" style={styles.vignetteOuter}>
          <View style={styles.vignetteInner} />
        </View>
      )}
      <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top }]}>
        <SegmentBar
          ratio={snap.xp / snap.xpToNext}
          color={COLORS.xp}
          track={COLORS.xpDeep}
          height={10}
          segments={10}
        />

        <View style={styles.body} pointerEvents="box-none">
          <View style={styles.topRow} pointerEvents="box-none">
            <Frame outline={COLORS.ink} fill={COLORS.stone} innerStyle={styles.levelChip}>
              <Text style={styles.levelLabel}>LV</Text>
              <Text style={styles.levelValue}>{snap.level}</Text>
            </Frame>

            <View style={styles.hpColumn} pointerEvents="none">
              <SegmentBar
                ratio={hpRatio}
                color={COLORS.blood}
                track={COLORS.bloodDeep}
                height={20}
                segments={10}
              >
                <Text style={styles.barText}>
                  {snap.hp}/{snap.maxHp}
                  {snap.shield > 0 ? ` +${snap.shield}` : ''}
                </Text>
              </SegmentBar>
            </View>

            <Pressable onPress={onTogglePause} hitSlop={8} accessibilityRole="button">
              <Frame outline={COLORS.ink} fill={COLORS.stoneRaised} innerStyle={styles.pauseButton}>
                {paused ? (
                  <View style={styles.playGlyph} />
                ) : (
                  <View style={styles.pauseGlyph}>
                    <View style={styles.pauseBar} />
                    <View style={styles.pauseBar} />
                  </View>
                )}
              </Frame>
            </Pressable>
          </View>

          <View style={styles.clockRow} pointerEvents="none">
            <Frame outline={COLORS.ink} fill={COLORS.stoneDeep} sunken innerStyle={styles.clockPlate}>
              <Text style={styles.clockText}>{formatTime(snap.seconds)}</Text>
            </Frame>
            <Frame outline={COLORS.ink} fill={COLORS.stoneDeep} sunken innerStyle={styles.killPlate}>
              <Text style={styles.killText}>{snap.kills} KILLS</Text>
            </Frame>
          </View>

          {snap.bossMaxHp > 0 && (
            <View style={styles.bossBlock} pointerEvents="none">
              <Text style={styles.bossLabel}>
                {snap.bossKind === BOSS_FINAL ? 'BOSS' : 'MINI BOSS'}
              </Text>
              <SegmentBar
                ratio={snap.bossHp / snap.bossMaxHp}
                color={COLORS.blood}
                track={COLORS.bloodDeep}
                height={14}
                segments={20}
              />
            </View>
          )}

          <View style={styles.gearRow} pointerEvents="none">
            {ownedItems.map((itemIndex) => {
              const item = ITEMS[itemIndex];
              const owned = stars[itemIndex];
              return (
                <Frame
                  key={item.id}
                  outline={item.color}
                  fill={COLORS.stoneDeep}
                  innerStyle={styles.gearChip}
                >
                  <Text style={[styles.gearStars, { color: item.color }]}>
                    {owned >= AWAKENED_STARS ? 'A' : owned}
                  </Text>
                </Frame>
              );
            })}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0 },
  body: { paddingHorizontal: 8, paddingTop: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelChip: { width: 34, alignItems: 'center', paddingVertical: 2 },
  levelLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 8, letterSpacing: 1 },
  levelValue: { color: COLORS.parchment, fontFamily: MONO, fontSize: 14, fontWeight: 'bold' },
  hpColumn: { flex: 1 },
  barText: {
    color: COLORS.parchment,
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pauseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pauseGlyph: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 4, height: 14, backgroundColor: COLORS.parchment },
  playGlyph: {
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.parchment,
    marginLeft: 3,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
  clockPlate: { paddingHorizontal: 10, paddingVertical: 1 },
  clockText: {
    color: COLORS.parchment,
    fontFamily: MONO,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  killPlate: { paddingHorizontal: 8, paddingVertical: 4 },
  killText: { color: COLORS.muted, fontFamily: MONO, fontSize: 11, letterSpacing: 1 },
  bossBlock: { marginTop: 8 },
  bossLabel: {
    color: COLORS.blood,
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 2,
  },
  gearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  gearChip: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  gearStars: { fontFamily: MONO, fontSize: 10, fontWeight: 'bold' },
  vignetteOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 10,
    borderColor: COLORS.vignette,
  },
  vignetteInner: { flex: 1, borderWidth: 12, borderColor: 'rgba(207,61,78,0.16)' },
});
