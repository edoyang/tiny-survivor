import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { AWAKENED_STARS } from '../game/kinds.ts';
import { GENERAL_PRESET, ITEMS, PRESETS } from '../game/systems/items.ts';
import { canUpgrade, ownedStars, upgradeCost, upgradeGear } from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { GearIcon, StarRow } from '../render/GearIcon.tsx';
import { UI_ICONS } from '../render/icons.ts';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame, PixelButton } from '../render/PixelUi.tsx';
import { CLASS_COLORS, COLORS, MONO } from '../render/theme.ts';
import { useMeta } from '../render/useMeta.ts';

const FILTERS = ['ALL', ...classes.map((cls) => cls.name.toUpperCase())];

function ownerOf(itemIndex: number): number {
  const item = ITEMS[itemIndex];
  if (item.preset === GENERAL_PRESET) return -1;
  const preset = PRESETS.find((entry) => entry.id === item.preset);
  return preset === undefined ? -1 : preset.classId;
}

export default function Inventory() {
  const meta = useMeta();
  const [filter, setFilter] = useState(0);
  const [selected, setSelected] = useState(0);
  const item = ITEMS[selected];
  const stars = ownedStars(meta, item.id);
  const owner = ownerOf(selected);
  const ownedCount = ITEMS.filter((entry) => ownedStars(meta, entry.id) > 0).length;

  return (
    <MetaScreen title="INVENTORY" subtitle={`${ownedCount}/${ITEMS.length} PIECES FOUND`}>
      <View style={styles.filterRow}>
        {FILTERS.map((label, index) => (
          <Pressable key={label} style={styles.filterItem} accessibilityRole="button" onPress={() => setFilter(index)}>
            <Frame
              outline={filter === index ? COLORS.gold : COLORS.ink}
              fill={filter === index ? COLORS.stoneRaised : COLORS.stone}
              innerStyle={styles.filterBody}
            >
              <Text style={[styles.filterText, filter === index ? styles.filterOn : null]}>{label}</Text>
            </Frame>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {ITEMS.map((entry, itemIndex) => {
          const owner2 = ownerOf(itemIndex);
          if (filter > 0 && owner2 !== filter - 1 && owner2 !== -1) return null;
          return (
            <Pressable key={entry.id} accessibilityRole="button" onPress={() => setSelected(itemIndex)}>
              <GearIcon
                itemIndex={itemIndex}
                size={54}
                level={ownedStars(meta, entry.id)}
                style={selected === itemIndex ? styles.selectedTile : undefined}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <Frame outline={stars > 0 ? item.color : COLORS.ink} fill={COLORS.stone} innerStyle={styles.detail}>
        <View style={styles.detailHead}>
          <GearIcon itemIndex={selected} size={52} level={stars} />
          <View style={styles.detailText}>
            <Text style={[styles.detailName, { color: stars > 0 ? item.color : COLORS.muted }]}>
              {item.name}
            </Text>
            <Text style={styles.detailOwner}>
              {owner < 0 ? 'ANY HERO' : `${classes[owner].name.toUpperCase()} / ${
                PRESETS.find((entry) => entry.id === item.preset)?.name.toUpperCase() ?? ''
              }`}
            </Text>
            <StarRow filled={Math.min(stars, AWAKENED_STARS - 1)} size={11} />
          </View>
        </View>
        <Text style={styles.detailStar}>{item.star}</Text>
        <Text style={styles.detailAwaken}>AWAKEN {item.awaken}</Text>
        {stars === 0 ? (
          <View style={styles.lockedRow}>
            <Image source={UI_ICONS.lock} style={styles.lockIcon} />
            <Text style={styles.lockedText}>SUMMON THIS PIECE TO USE IT</Text>
          </View>
        ) : (
          <PixelButton
            label={
              stars >= AWAKENED_STARS
                ? 'AWAKENED'
                : `UPGRADE  ${upgradeCost(stars)}`
            }
            primary={canUpgrade(meta, item.id)}
            onPress={() => updateMeta((state) => upgradeGear(state, item.id))}
          />
        )}
      </Frame>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 4, paddingBottom: 8 },
  filterItem: { flex: 1 },
  filterBody: { paddingVertical: 6, alignItems: 'center' },
  filterText: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 0.5 },
  filterOn: { color: COLORS.gold, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 8 },
  selectedTile: { opacity: 1, borderWidth: 0, transform: [{ scale: 1.04 }] },
  detail: { padding: 10, gap: 8 },
  detailHead: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  detailText: { flex: 1, gap: 4 },
  detailName: { fontFamily: MONO, fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  detailOwner: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  detailStar: { color: COLORS.parchment, fontSize: 11, lineHeight: 15 },
  detailAwaken: { color: COLORS.gold, fontSize: 11, lineHeight: 15 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  lockIcon: { width: 18, height: 18, opacity: 0.6 },
  lockedText: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 1 },
});
