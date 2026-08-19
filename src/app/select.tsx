import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import classes from '../game/data/classes.json' with { type: 'json' };
import { PRESETS, presetsForClass } from '../game/systems/items.ts';
import { BuildConfirm } from '../render/BuildConfirm.tsx';
import { MenuSprite } from '../render/MenuSprite.tsx';
import { Frame, PixelButton, PixelCheck } from '../render/PixelUi.tsx';
import { updateMeta } from '../meta/store.ts';
import { getSkipBuildConfirm, setSkipBuildConfirm } from '../render/skipConfirm.ts';
import { HERO_IMAGES, WEAPON_IMAGES } from '../render/sources.ts';
import { MAPS } from '../meta/state.ts';
import { CLASS_COLORS, COLORS, MONO } from '../render/theme.ts';

type Choice = { classId: number; presetId: number };

const PIP_COUNT = 5;

function pipsFor(values: number[], value: number): number {
  let min = values[0];
  let max = values[0];
  for (const candidate of values) {
    if (candidate < min) min = candidate;
    if (candidate > max) max = candidate;
  }
  if (max === min) return PIP_COUNT - 2;
  return 1 + Math.round((PIP_COUNT - 1) * ((value - min) / (max - min)));
}

const HP_VALUES = classes.map((cls) => cls.maxHp);
const SPEED_VALUES = classes.map((cls) => cls.moveSpeed);
const RATE_VALUES = classes.map((cls) => 1 / cls.cooldown);

function Pips({ filled, color }: { filled: number; color: string }) {
  const pips = [];
  for (let i = 0; i < PIP_COUNT; i++) {
    pips.push(
      <View
        key={i}
        style={[styles.pip, { backgroundColor: i < filled ? color : COLORS.stoneRaised }]}
      />,
    );
  }
  return <View style={styles.pipRow}>{pips}</View>;
}

function StatLine({ label, filled, color }: { label: string; filled: number; color: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Pips filled={filled} color={color} />
    </View>
  );
}

export default function HeroSelect() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mapId?: string }>();
  const mapId = params.mapId ?? '0';
  const [pending, setPending] = useState<Choice | null>(null);
  const [skip, setSkip] = useState(getSkipBuildConfirm);

  const startRun = (choice: Choice) => {
    updateMeta((state) => {
      state.classId = choice.classId;
      state.presetId = choice.presetId;
    });
    router.push({
      pathname: '/game',
      params: {
        classId: String(choice.classId),
        presetId: String(choice.presetId),
        mapId,
      },
    });
  };

  const choosePreset = (choice: Choice) => {
    if (skip) startRun(choice);
    else setPending(choice);
  };

  const toggleSkip = () => {
    const next = !skip;
    setSkip(next);
    setSkipBuildConfirm(next);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{MAPS[Number(mapId)].name.toUpperCase()}</Text>
        <View style={styles.rule} />
        <Text style={styles.subtitle}>PICK A HERO, THEN A BUILD</Text>
      </View>

      <View style={styles.roster}>
        {classes.map((cls, classId) => {
          const accent = CLASS_COLORS[classId];
          return (
            <Frame key={cls.id} outline={accent} fill={COLORS.stone} style={styles.card} innerStyle={styles.cardBody}>
              <View style={styles.identity}>
                <Frame outline={COLORS.ink} fill={COLORS.stoneDeep} sunken innerStyle={styles.portrait}>
                  <MenuSprite hero={HERO_IMAGES[cls.id]} weapon={WEAPON_IMAGES[cls.weapon]} size={62} />
                </Frame>
                <View style={styles.identityText}>
                  <Text style={[styles.className, { color: accent }]}>{cls.name.toUpperCase()}</Text>
                  <Text style={styles.classBlurb} numberOfLines={2}>
                    {cls.blurb}
                  </Text>
                  <View style={styles.stats}>
                    <StatLine label="HP " filled={pipsFor(HP_VALUES, cls.maxHp)} color={accent} />
                    <StatLine label="SPD" filled={pipsFor(SPEED_VALUES, cls.moveSpeed)} color={accent} />
                    <StatLine label="RTE" filled={pipsFor(RATE_VALUES, 1 / cls.cooldown)} color={accent} />
                  </View>
                </View>
              </View>
              <View style={styles.presetRow}>
                {presetsForClass(classId).map((presetId) => (
                  <PixelButton
                    key={PRESETS[presetId].id}
                    label={PRESETS[presetId].name.toUpperCase()}
                    onPress={() => choosePreset({ classId, presetId })}
                    style={styles.presetButton}
                    labelStyle={styles.presetLabel}
                  />
                ))}
              </View>
            </Frame>
          );
        })}
      </View>

      <Text style={styles.hint}>DRAG ANYWHERE TO MOVE. ATTACKS FIRE THEMSELVES.</Text>
      <Pressable style={styles.skipRow} onPress={toggleSkip} hitSlop={8}>
        <PixelCheck on={skip} />
        <Text style={styles.skipLabel}>SKIP BUILD PREVIEW</Text>
      </Pressable>

      {pending !== null && (
        <BuildConfirm
          presetId={pending.presetId}
          onCancel={() => setPending(null)}
          onStart={() => {
            const choice = pending;
            setPending(null);
            startRun(choice);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.ink, paddingHorizontal: 10 },
  header: { alignItems: 'center', paddingBottom: 8 },
  title: {
    color: COLORS.gold,
    fontFamily: MONO,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  rule: { height: 2, alignSelf: 'stretch', backgroundColor: COLORS.goldDeep, marginVertical: 5 },
  subtitle: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 2 },
  roster: { flex: 1, gap: 8 },
  card: { flex: 1 },
  cardBody: { flex: 1, padding: 8, justifyContent: 'space-between' },
  identity: { flexDirection: 'row', gap: 10 },
  portrait: { width: 62, height: 62 },
  identityText: { flex: 1 },
  className: { fontFamily: MONO, fontSize: 17, fontWeight: 'bold', letterSpacing: 2 },
  classBlurb: { color: COLORS.muted, fontSize: 11, lineHeight: 14, marginTop: 1 },
  stats: { marginTop: 4, gap: 2 },
  statLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  pipRow: { flexDirection: 'row', gap: 2 },
  pip: { width: 12, height: 6 },
  presetRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  presetButton: { flex: 1 },
  presetLabel: { fontSize: 10, letterSpacing: 0.5 },
  hint: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  skipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 8 },
  skipLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 11, letterSpacing: 1 },
});
