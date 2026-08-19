import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { AWAKENED_STARS, MAX_STARS } from '../game/kinds.ts';
import { ITEMS } from '../game/systems/items.ts';
import { ITEM_ICONS, UI_ICONS } from './icons.ts';
import { Frame } from './PixelUi.tsx';
import { COLORS, MONO } from './theme.ts';

export function StarRow({ filled, size = 10 }: { filled: number; size?: number }) {
  const stars = [];
  for (let i = 0; i < MAX_STARS; i++) {
    stars.push(
      <Image
        key={i}
        source={i < filled ? UI_ICONS.star_full : UI_ICONS.star_empty}
        style={{ width: size, height: size }}
      />,
    );
  }
  return <View style={styles.starRow}>{stars}</View>;
}

export function GearIcon({
  itemIndex,
  size,
  level,
  dim = false,
  selected = false,
  equipped = false,
  style,
}: {
  itemIndex: number;
  size: number;
  level: number;
  dim?: boolean;
  selected?: boolean;
  equipped?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const item = ITEMS[itemIndex];
  const awakened = level >= AWAKENED_STARS;
  const outline = selected
    ? COLORS.parchment
    : level > 0
      ? awakened
        ? COLORS.gold
        : item.color
      : COLORS.bevelLight;
  return (
    <Frame
      outline={outline}
      fill={selected ? COLORS.stoneRaised : COLORS.stoneDeep}
      sunken
      style={style}
      innerStyle={[styles.tile, { width: size, height: size }]}
    >
      <Image
        source={ITEM_ICONS[item.id]}
        style={[
          { width: size * 0.68, height: size * 0.68 },
          dim || level === 0 ? styles.locked : null,
        ]}
      />
      {level > 0 && (
        <View style={[styles.badge, { backgroundColor: awakened ? COLORS.gold : item.color }]}>
          <Text style={styles.badgeText}>{awakened ? 'A' : level}</Text>
        </View>
      )}
      {equipped && (
        <View style={styles.equippedTag}>
          <View style={styles.checkShort} />
          <View style={styles.checkLong} />
        </View>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  starRow: { flexDirection: 'row', gap: 2 },
  tile: { alignItems: 'center', justifyContent: 'center' },
  locked: { opacity: 0.24 },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    minWidth: 14,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: COLORS.ink, fontFamily: MONO, fontSize: 10, fontWeight: 'bold' },
  equippedTag: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 16,
    height: 16,
    backgroundColor: COLORS.gold,
  },
  checkShort: {
    position: 'absolute',
    left: 2,
    top: 7,
    width: 5,
    height: 3,
    backgroundColor: COLORS.ink,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    left: 4,
    top: 5,
    width: 10,
    height: 3,
    backgroundColor: COLORS.ink,
    transform: [{ rotate: '-45deg' }],
  },
});
