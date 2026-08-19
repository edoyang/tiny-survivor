import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { AWAKENED_STARS } from '../game/kinds.ts';
import { GENERAL_PRESET, ITEMS, PRESETS } from '../game/systems/items.ts';
import { canUpgrade, equippedFor, ownedStars, upgradeCost, upgradeGear } from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import type { MetaState } from '../meta/state.ts';
import { GearIcon, StarRow } from '../render/GearIcon.tsx';
import { useGrid } from '../render/grid.ts';
import { UI_ICONS } from '../render/icons.ts';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame, PixelButton } from '../render/PixelUi.tsx';
import { COLORS, MONO } from '../render/theme.ts';
import { useMeta } from '../render/useMeta.ts';

const COLUMNS = 5;
const FILTERS = ['ALL', ...classes.map((cls) => cls.name.toUpperCase())];

function ownerOf(itemIndex: number): number {
  const item = ITEMS[itemIndex];
  if (item.preset === GENERAL_PRESET) return -1;
  const preset = PRESETS.find((entry) => entry.id === item.preset);
  return preset === undefined ? -1 : preset.classId;
}

function buildSections(meta: MetaState, filter: number) {
  const equipped = equippedFor(meta, meta.presetId);
  const inLoadout: number[] = [];
  const owned: number[] = [];
  const locked: number[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    const owner = ownerOf(i);
    if (filter > 0 && owner !== filter - 1 && owner !== -1) continue;
    const stars = ownedStars(meta, ITEMS[i].id);
    if (equipped.includes(ITEMS[i].id)) inLoadout.push(i);
    else if (stars > 0) owned.push(i);
    else locked.push(i);
  }
  const byLevel = (a: number, b: number) =>
    ownedStars(meta, ITEMS[b].id) - ownedStars(meta, ITEMS[a].id);
  owned.sort(byLevel);
  return [
    { key: 'loadout', label: 'IN LOADOUT', items: inLoadout },
    { key: 'owned', label: 'OWNED', items: owned },
    { key: 'locked', label: 'NOT FOUND', items: locked },
  ];
}

export default function Inventory() {
  const meta = useMeta();
  const grid = useGrid(COLUMNS);
  const [filter, setFilter] = useState(0);
  const [selected, setSelected] = useState(0);
  const item = ITEMS[selected];
  const stars = ownedStars(meta, item.id);
  const owner = ownerOf(selected);
  const ownedCount = ITEMS.filter((entry) => ownedStars(meta, entry.id) > 0).length;
  const sections = buildSections(meta, filter);
  const ownerLabel =
    owner < 0
      ? 'FITS ANY HERO'
      : `${classes[owner].name.toUpperCase()} / ${
          PRESETS.find((entry) => entry.id === item.preset)?.name.toUpperCase() ?? ''
        }`;

  return (
    <MetaScreen title="BAG" subtitle={`${ownedCount} OF ${ITEMS.length} FOUND`}>
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          {FILTERS.map((label, index) => (
            <Pressable
              key={label}
              style={styles.filterItem}
              accessibilityRole="button"
              onPress={() => setFilter(index)}
            >
              <Frame
                outline={filter === index ? COLORS.gold : COLORS.ink}
                fill={filter === index ? COLORS.stoneRaised : COLORS.stone}
                innerStyle={styles.filterBody}
              >
                <Text style={[styles.filterText, filter === index ? styles.filterOn : null]}>
                  {label}
                </Text>
              </Frame>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {sections.map((section) =>
          section.items.length === 0 ? null : (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <View style={styles.sectionRule} />
                <Text style={styles.sectionCount}>{section.items.length}</Text>
              </View>
              <View style={[styles.grid, { gap: grid.gutter }]}>
                {section.items.map((itemIndex) => (
                  <Pressable
                    key={ITEMS[itemIndex].id}
                    accessibilityRole="button"
                    onPress={() => setSelected(itemIndex)}
                  >
                    <GearIcon
                      itemIndex={itemIndex}
                      size={grid.tile}
                      level={ownedStars(meta, ITEMS[itemIndex].id)}
                      selected={selected === itemIndex}
                      equipped={section.key === 'loadout'}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ),
        )}
      </ScrollView>

      <Frame
        outline={stars > 0 ? item.color : COLORS.ink}
        fill={COLORS.stone}
        style={styles.detailFrame}
        innerStyle={styles.detail}
      >
        <View style={styles.detailHead}>
          <GearIcon itemIndex={selected} size={46} level={stars} />
          <View style={styles.detailText}>
            <Text
              style={[styles.detailName, { color: stars > 0 ? item.color : COLORS.muted }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={styles.detailOwner} numberOfLines={1}>
              {ownerLabel}
            </Text>
            <StarRow filled={Math.min(stars, AWAKENED_STARS - 1)} size={11} />
          </View>
          <View style={styles.detailAction}>
            {stars === 0 ? (
              <View style={styles.lockedBox}>
                <Image source={UI_ICONS.lock} style={styles.lockIcon} />
                <Text style={styles.lockedText}>NOT FOUND</Text>
              </View>
            ) : (
              <PixelButton
                label={stars >= AWAKENED_STARS ? 'MAX' : `UPGRADE\n${upgradeCost(stars)}`}
                primary={canUpgrade(meta, item.id)}
                onPress={() => updateMeta((state) => upgradeGear(state, item.id))}
                labelStyle={styles.upgradeLabel}
              />
            )}
          </View>
        </View>
        <Text style={styles.detailStar} numberOfLines={2}>
          {item.star}
        </Text>
        <Pressable onPress={() => router.replace('/hero')} accessibilityRole="button">
          <Frame outline={COLORS.ink} fill={COLORS.stoneRaised} innerStyle={styles.loadoutButton}>
            <Text style={styles.loadoutLink}>OPEN LOADOUT</Text>
          </Frame>
        </Pressable>
      </Frame>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 4 },
  filterItem: { flex: 1 },
  filterBody: { paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  filterText: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 0.5 },
  filterOn: { color: COLORS.gold, fontWeight: 'bold' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingBottom: 12, gap: 16 },
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 2 },
  sectionRule: { flex: 1, height: 2, backgroundColor: COLORS.stoneRaised },
  sectionCount: { color: COLORS.muted, fontFamily: MONO, fontSize: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailFrame: { marginTop: 4, marginBottom: 4 },
  detail: { padding: 10, gap: 8, height: 150, justifyContent: 'space-between' },
  detailHead: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  detailText: { flex: 1, gap: 4 },
  detailName: { fontSize: 14, fontWeight: '600' },
  detailOwner: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  detailAction: { width: 104 },
  upgradeLabel: { fontSize: 10, letterSpacing: 0.5 },
  lockedBox: { alignItems: 'center', gap: 4 },
  lockIcon: { width: 20, height: 20, opacity: 0.6 },
  lockedText: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  detailStar: { color: COLORS.parchment, fontSize: 12, lineHeight: 16 },
  loadoutButton: { paddingVertical: 7, alignItems: 'center' },
  loadoutLink: {
    color: COLORS.gold,
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
  },
});
