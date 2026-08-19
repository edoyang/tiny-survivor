import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UI_ICONS } from './icons.ts';
import { Frame } from './PixelUi.tsx';
import { COLORS, MONO } from './theme.ts';
import { useMeta } from './useMeta.ts';

type Tab = { route: string; label: string; icon: number; primary?: boolean };

const TABS: Tab[] = [
  { route: '/', label: 'HOME', icon: UI_ICONS.idle },
  { route: '/hero', label: 'HERO', icon: UI_ICONS.hero },
  { route: '/inventory', label: 'BAG', icon: UI_ICONS.inventory },
  { route: '/battle', label: 'BATTLE', icon: UI_ICONS.battle, primary: true },
  { route: '/gacha', label: 'SUMMON', icon: UI_ICONS.gacha },
  { route: '/shop', label: 'SHOP', icon: UI_ICONS.shop },
];

export function CurrencyBar() {
  const meta = useMeta();
  return (
    <View style={styles.currencyRow}>
      <Frame outline={COLORS.ink} fill={COLORS.stone} innerStyle={styles.currencyChip}>
        <Image source={UI_ICONS.coin} style={styles.currencyIcon} />
        <Text style={styles.currencyText}>{meta.coins}</Text>
      </Frame>
      <Frame outline={COLORS.ink} fill={COLORS.stone} innerStyle={styles.currencyChip}>
        <Image source={UI_ICONS.gem} style={styles.currencyIcon} />
        <Text style={styles.currencyText}>{meta.gems}</Text>
      </Frame>
    </View>
  );
}

export function MetaNav() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  return (
    <View style={[styles.nav, { paddingBottom: insets.bottom + 6 }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.route;
        const fill = active ? COLORS.stoneRaised : COLORS.stone;
        return (
          <Pressable
            key={tab.route}
            style={styles.navItem}
            onPress={() => router.replace(tab.route)}
            accessibilityRole="button"
          >
            <Frame
              outline={tab.primary ? COLORS.gold : active ? COLORS.parchment : COLORS.ink}
              fill={fill}
              innerStyle={styles.navBody}
            >
              <Image source={tab.icon} style={styles.navIcon} />
              <Text style={[styles.navLabel, tab.primary ? styles.navLabelPrimary : null]}>
                {tab.label}
              </Text>
            </Frame>
          </Pressable>
        );
      })}
    </View>
  );
}

export function MetaScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <CurrencyBar />
      </View>
      <View style={styles.body}>{children}</View>
      <MetaNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  headerText: { flex: 1 },
  title: { color: COLORS.gold, fontFamily: MONO, fontSize: 18, fontWeight: 'bold', letterSpacing: 3 },
  subtitle: { color: COLORS.muted, fontFamily: MONO, fontSize: 9, letterSpacing: 1, marginTop: 2 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: 10 },
  currencyRow: { gap: 4 },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 86,
  },
  currencyIcon: { width: 14, height: 14 },
  currencyText: {
    flex: 1,
    color: COLORS.parchment,
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  nav: { flexDirection: 'row', gap: 3, paddingHorizontal: 6, paddingTop: 6 },
  navItem: { flex: 1 },
  navBody: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
  navIcon: { width: 22, height: 22 },
  navLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 8, letterSpacing: 0.5 },
  navLabelPrimary: { color: COLORS.gold, fontWeight: 'bold' },
});
