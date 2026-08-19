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
  style,
}: {
  itemIndex: number;
  size: number;
  level: number;
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const item = ITEMS[itemIndex];
  const awakened = level >= AWAKENED_STARS;
  const outline = level > 0 ? (awakened ? COLORS.gold : item.color) : COLORS.bevelLight;
  return (
    <Frame
      outline={outline}
      fill={COLORS.stoneDeep}
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
});
