import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { BEVEL, COLORS, MONO } from './theme.ts';

export function Frame({
  children,
  style,
  innerStyle,
  outline = COLORS.ink,
  fill = COLORS.stone,
  sunken = false,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  outline?: string;
  fill?: string;
  sunken?: boolean;
}) {
  return (
    <View style={[styles.outline, { backgroundColor: outline }, style]}>
      <View style={[sunken ? styles.bevelSunken : styles.bevelRaised, { backgroundColor: fill }, innerStyle]}>
        {children}
      </View>
    </View>
  );
}

export function PixelButton({
  label,
  onPress,
  primary = false,
  style,
  labelStyle,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [style, pressed ? styles.pressed : null]}
      accessibilityRole="button"
    >
      <Frame
        outline={primary ? COLORS.goldDeep : COLORS.ink}
        fill={primary ? COLORS.gold : COLORS.stoneRaised}
        innerStyle={styles.buttonBody}
      >
        <Text
          style={[styles.buttonLabel, primary ? styles.buttonLabelPrimary : null, labelStyle]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Frame>
    </Pressable>
  );
}

export function SegmentBar({
  ratio,
  color,
  track,
  height,
  segments,
  children,
}: {
  ratio: number;
  color: string;
  track: string;
  height: number;
  segments: number;
  children?: ReactNode;
}) {
  const width = Math.max(0, Math.min(1, ratio)) * 100;
  const cells = [];
  for (let i = 0; i < segments; i++) cells.push(<View key={i} style={styles.notch} />);
  return (
    <Frame outline={COLORS.ink} fill={track} sunken innerStyle={{ height }}>
      <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color }]}>
        <View style={styles.gloss} />
      </View>
      <View style={styles.notchRow} pointerEvents="none">
        {cells}
      </View>
      <View style={styles.barLabel} pointerEvents="none">
        {children}
      </View>
    </Frame>
  );
}

export function PixelCheck({ on }: { on: boolean }) {
  return (
    <Frame outline={COLORS.ink} fill={on ? COLORS.gold : COLORS.stoneDeep} sunken innerStyle={styles.checkBody}>
      {on && (
        <View style={styles.checkMark}>
          <View style={styles.checkShort} />
          <View style={styles.checkLong} />
        </View>
      )}
    </Frame>
  );
}

const styles = StyleSheet.create({
  outline: { padding: BEVEL },
  bevelRaised: {
    borderTopWidth: BEVEL,
    borderLeftWidth: BEVEL,
    borderRightWidth: BEVEL,
    borderBottomWidth: BEVEL,
    borderTopColor: COLORS.bevelLight,
    borderLeftColor: COLORS.bevelLight,
    borderRightColor: COLORS.bevelDark,
    borderBottomColor: COLORS.bevelDark,
  },
  bevelSunken: {
    borderTopWidth: BEVEL,
    borderLeftWidth: BEVEL,
    borderRightWidth: BEVEL,
    borderBottomWidth: BEVEL,
    borderTopColor: COLORS.bevelDark,
    borderLeftColor: COLORS.bevelDark,
    borderRightColor: COLORS.bevelLight,
    borderBottomColor: COLORS.bevelLight,
    overflow: 'hidden',
  },
  pressed: { transform: [{ translateY: BEVEL }] },
  buttonBody: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  buttonLabel: {
    color: COLORS.parchment,
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  buttonLabelPrimary: { color: COLORS.ink },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  gloss: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  notchRow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  notch: { flex: 1, borderRightWidth: 1, borderRightColor: COLORS.ink },
  barLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBody: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  checkMark: { width: 14, height: 14 },
  checkShort: {
    position: 'absolute',
    left: 1,
    top: 6,
    width: 6,
    height: 3,
    backgroundColor: COLORS.ink,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 11,
    height: 3,
    backgroundColor: COLORS.ink,
    transform: [{ rotate: '-45deg' }],
  },
});
