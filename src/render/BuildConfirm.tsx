import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import classes from '../game/data/classes.json' with { type: 'json' };
import { ITEMS, PRESETS } from '../game/systems/items.ts';
import { GearIcon, StarRow } from './GearIcon.tsx';
import { MenuSprite } from './MenuSprite.tsx';
import { Frame, PixelButton } from './PixelUi.tsx';
import { HERO_IMAGES, WEAPON_IMAGES } from './sources.ts';
import { CLASS_COLORS, COLORS, MONO } from './theme.ts';

export function BuildConfirm({
  presetId,
  onCancel,
  onStart,
}: {
  presetId: number;
  onCancel: () => void;
  onStart: () => void;
}) {
  const insets = useSafeAreaInsets();
  const preset = PRESETS[presetId];
  const cls = classes[preset.classId];
  const accent = CLASS_COLORS[preset.classId];
  const exclusive: number[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].preset === preset.id) exclusive.push(i);
  }
  return (
    <View
      style={[styles.backdrop, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}
    >
      <Frame outline={accent} fill={COLORS.stone} style={styles.panel} innerStyle={styles.panelBody}>
        <View style={styles.header}>
          <Frame outline={COLORS.ink} fill={COLORS.stoneDeep} sunken innerStyle={styles.portrait}>
            <MenuSprite hero={HERO_IMAGES[cls.id]} weapon={WEAPON_IMAGES[cls.weapon]} size={48} />
          </Frame>
          <View style={styles.headerText}>
            <Text style={[styles.presetName, { color: accent }]} numberOfLines={2}>
              {preset.name.toUpperCase()}
            </Text>
            <Text style={styles.className}>{cls.name.toUpperCase()} BUILD</Text>
          </View>
          <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button">
            <Frame outline={COLORS.ink} fill={COLORS.stoneRaised} innerStyle={styles.close}>
              <View style={styles.closeMark}>
                <View style={styles.closeBarA} />
                <View style={styles.closeBarB} />
              </View>
            </Frame>
          </Pressable>
        </View>

        <Text style={styles.blurb}>{preset.blurb}</Text>

        <Text style={styles.listHeading}>SIGNATURE GEAR / {exclusive.length} ITEMS</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {exclusive.map((itemIndex) => {
            const item = ITEMS[itemIndex];
            return (
              <Frame
                key={item.id}
                outline={COLORS.ink}
                fill={COLORS.stoneDeep}
                sunken
                innerStyle={styles.itemBody}
              >
                <GearIcon itemIndex={itemIndex} size={44} level={0} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemName, { color: item.color }]}>{item.name}</Text>
                  <View style={styles.itemStarRow}>
                    <StarRow filled={0} size={9} />
                    <Text style={styles.itemStar}>{item.star}</Text>
                  </View>
                  <View style={styles.awakenRow}>
                    <View style={styles.awakenTag}>
                      <Text style={styles.awakenTagText}>AWAKEN</Text>
                    </View>
                    <Text style={styles.awakenText}>{item.awaken}</Text>
                  </View>
                </View>
              </Frame>
            );
          })}
        </ScrollView>

        <PixelButton label="TO BATTLE" onPress={onStart} primary labelStyle={styles.battleLabel} />
      </Frame>
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
    paddingHorizontal: 12,
  },
  panel: { flex: 1 },
  panelBody: { flex: 1, minHeight: 0, padding: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  portrait: { width: 48, height: 48 },
  headerText: { flex: 1 },
  presetName: { fontFamily: MONO, fontSize: 19, fontWeight: 'bold', letterSpacing: 2 },
  className: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, letterSpacing: 1, marginTop: 2 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeMark: { width: 14, height: 14 },
  closeBarA: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.parchment,
    transform: [{ rotate: '45deg' }],
  },
  closeBarB: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.parchment,
    transform: [{ rotate: '-45deg' }],
  },
  blurb: { color: COLORS.parchment, fontSize: 13, lineHeight: 18, marginTop: 10 },
  listHeading: {
    color: COLORS.muted,
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 6,
  },
  list: { flex: 1, minHeight: 0, marginBottom: 12 },
  listContent: { gap: 6, paddingBottom: 2 },
  itemBody: { flexDirection: 'row', padding: 8, gap: 8 },
  itemText: { flex: 1 },
  itemName: { fontFamily: MONO, fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  itemStarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  itemStar: { flex: 1, color: COLORS.parchment, fontSize: 11, lineHeight: 15 },
  awakenRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  awakenTag: { backgroundColor: COLORS.goldDeep, paddingHorizontal: 4, paddingVertical: 1 },
  awakenTagText: { color: COLORS.gold, fontFamily: MONO, fontSize: 9, letterSpacing: 1 },
  awakenText: { flex: 1, color: COLORS.gold, fontSize: 11, lineHeight: 14 },
  battleLabel: { fontSize: 16, letterSpacing: 3 },
});
