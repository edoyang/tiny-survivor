import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import classes from '../game/data/classes.json' with { type: 'json' };
import { createWorld } from '../game/state.ts';
import { ITEMS, presetsForClass, PRESETS } from '../game/systems/items.ts';
import {
  EQUIP_SLOTS,
  equippedFor,
  itemsForPreset,
  ownedStars,
  startingStars,
  toggleEquip,
} from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { GearIcon } from '../render/GearIcon.tsx';
import { TILE_CHROME, useGrid } from '../render/grid.ts';
import { MenuSprite } from '../render/MenuSprite.tsx';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame } from '../render/PixelUi.tsx';
import { HERO_IMAGES, WEAPON_IMAGES } from '../render/sources.ts';
import { CLASS_COLORS, COLORS, MONO } from '../render/theme.ts';
import { useMeta } from '../render/useMeta.ts';

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const LOADOUT_COLUMNS = 4;

export default function Hero() {
  const meta = useMeta();
  const grid = useGrid(LOADOUT_COLUMNS);
  const cls = classes[meta.classId];
  const accent = CLASS_COLORS[meta.classId];
  const equipped = equippedFor(meta, meta.presetId);
  const preview = createWorld(1, meta.classId, meta.presetId, {
    stars: startingStars(meta, meta.presetId),
  });
  const player = preview.player;

  return (
    <MetaScreen title="LOADOUT" subtitle="TAP A PIECE TO ADD OR REMOVE IT" back="/">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.classRow}>
          {classes.map((entry, classId) => {
            const active = classId === meta.classId;
            return (
              <Pressable
                key={entry.id}
                style={styles.classItem}
                accessibilityRole="button"
                onPress={() =>
                  updateMeta((state) => {
                    state.classId = classId;
                    state.presetId = presetsForClass(classId)[0];
                  })
                }
              >
                <Frame
                  outline={active ? CLASS_COLORS[classId] : COLORS.ink}
                  fill={active ? COLORS.stoneRaised : COLORS.stoneDeep}
                  innerStyle={styles.classBody}
                >
                  <MenuSprite
                    hero={HERO_IMAGES[entry.id]}
                    weapon={WEAPON_IMAGES[entry.weapon]}
                    size={44}
                  />
                  <Text style={[styles.className, active ? { color: CLASS_COLORS[classId] } : null]}>
                    {entry.name.toUpperCase()}
                  </Text>
                </Frame>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buildRow}>
          {presetsForClass(meta.classId).map((presetId) => {
            const active = presetId === meta.presetId;
            return (
              <Pressable
                key={PRESETS[presetId].id}
                style={styles.buildItem}
                accessibilityRole="button"
                onPress={() =>
                  updateMeta((state) => {
                    state.presetId = presetId;
                  })
                }
              >
                <Frame
                  outline={active ? COLORS.gold : COLORS.ink}
                  fill={active ? COLORS.stoneRaised : COLORS.stone}
                  innerStyle={styles.buildBody}
                >
                  <Text style={[styles.buildName, active ? styles.buildNameActive : null]}>
                    {PRESETS[presetId].name.toUpperCase()}
                  </Text>
                </Frame>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>EQUIPPED</Text>
          <View style={styles.sectionRule} />
          <Text style={styles.sectionCount}>
            {equipped.length}/{EQUIP_SLOTS}
          </Text>
        </View>
        <View style={[styles.gearGrid, { gap: grid.gutter }]}>
          {itemsForPreset(meta.presetId).map((itemIndex) => {
            const item = ITEMS[itemIndex];
            const stars = ownedStars(meta, item.id);
            const isEquipped = equipped.includes(item.id);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => updateMeta((state) => toggleEquip(state, state.presetId, item.id))}
                style={[styles.gearCell, { width: grid.tile + TILE_CHROME }]}
              >
                <GearIcon
                  itemIndex={itemIndex}
                  size={grid.tile}
                  level={stars}
                  equipped={isEquipped}
                />
                <Text
                  style={[styles.gearName, isEquipped ? { color: item.color } : null]}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>WITH THIS LOADOUT</Text>
          <View style={styles.sectionRule} />
        </View>
        <Frame outline={accent} fill={COLORS.stone} innerStyle={styles.statBox}>
          <StatRow label="MAX HP" value={String(player.maxHp)} />
          <StatRow label="DAMAGE" value={`x${player.damageMult.toFixed(2)}`} />
          <StatRow label="COOLDOWN" value={`x${player.cooldownMult.toFixed(2)}`} />
          <StatRow label="MOVE SPEED" value={player.moveSpeed.toFixed(0)} />
          <StatRow label="CRIT" value={`${Math.round(player.critChance * 100)}%`} />
          <StatRow label="ARMOUR" value={`${Math.round(player.damageReduction * 100)}%`} />
        </Frame>
        <Text style={styles.footNote}>{cls.blurb}</Text>
      </ScrollView>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 20, gap: 12 },
  classRow: { flexDirection: 'row', gap: 6 },
  classItem: { flex: 1 },
  classBody: { alignItems: 'center', paddingVertical: 6, gap: 2 },
  className: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  buildRow: { flexDirection: 'row', gap: 6 },
  buildItem: { flex: 1 },
  buildBody: { paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  buildName: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 0.5, textAlign: 'center' },
  buildNameActive: { color: COLORS.gold, fontWeight: 'bold' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 2 },
  sectionRule: { flex: 1, height: 2, backgroundColor: COLORS.stoneRaised },
  sectionCount: { color: COLORS.muted, fontFamily: MONO, fontSize: 10 },
  gearGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  gearCell: { alignItems: 'center', gap: 4 },
  gearName: { color: COLORS.muted, fontSize: 9, lineHeight: 12, textAlign: 'center', height: 24 },
  statBox: { padding: 10, gap: 6 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 1 },
  statValue: { color: COLORS.parchment, fontFamily: MONO, fontSize: 13, fontWeight: 'bold' },
  footNote: { color: COLORS.muted, fontSize: 11, lineHeight: 15 },
});
