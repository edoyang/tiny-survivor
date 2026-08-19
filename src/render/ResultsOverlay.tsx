import { StyleSheet, Text, View } from 'react-native';
import { formatTime, type HudSnapshot } from './Hud.tsx';
import { Frame, PixelButton } from './PixelUi.tsx';
import { COLORS, MONO } from './theme.ts';

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statLeader} />
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function ResultsOverlay({
  snap,
  won,
  onRetry,
}: {
  snap: HudSnapshot;
  won: boolean;
  onRetry: () => void;
}) {
  const accent = won ? COLORS.gold : COLORS.blood;
  return (
    <View style={styles.backdrop}>
      <Frame outline={accent} fill={COLORS.stone} style={styles.panel} innerStyle={styles.panelBody}>
        <View style={[styles.titlePlate, { backgroundColor: accent }]}>
          <Text style={styles.title}>{won ? 'BOSS DOWN' : 'YOU FELL'}</Text>
        </View>
        <View style={styles.stats}>
          <StatRow label="SURVIVED" value={formatTime(snap.seconds)} />
          <StatRow label="KILLS" value={String(snap.kills)} />
          <StatRow label="LEVEL" value={String(snap.level)} />
        </View>
        <PixelButton label="GO AGAIN" onPress={onRetry} primary labelStyle={styles.retryLabel} />
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: { alignSelf: 'stretch' },
  panelBody: { padding: 18 },
  titlePlate: { paddingVertical: 8, alignItems: 'center' },
  title: { color: COLORS.ink, fontFamily: MONO, fontSize: 24, fontWeight: 'bold', letterSpacing: 4 },
  stats: { marginVertical: 22, gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  statLabel: { color: COLORS.muted, fontFamily: MONO, fontSize: 12, letterSpacing: 2 },
  statLeader: { flex: 1, height: 2, backgroundColor: COLORS.stoneRaised, marginBottom: 4 },
  statValue: { color: COLORS.parchment, fontFamily: MONO, fontSize: 18, fontWeight: 'bold' },
  retryLabel: { fontSize: 16, letterSpacing: 3 },
});
