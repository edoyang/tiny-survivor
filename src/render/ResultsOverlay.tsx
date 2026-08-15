import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime, type HudSnapshot } from './Hud.tsx';

export function ResultsOverlay({ snap, onRetry }: { snap: HudSnapshot; onRetry: () => void }) {
  return (
    <View style={styles.backdrop}>
      <Text style={styles.title}>YOU FELL</Text>
      <View style={styles.statsBox}>
        <Text style={styles.stat}>Survived {formatTime(snap.seconds)}</Text>
        <Text style={styles.stat}>{snap.kills} kills</Text>
        <Text style={styles.stat}>Level {snap.level}</Text>
      </View>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>GO AGAIN</Text>
      </Pressable>
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
    backgroundColor: '#16161dee',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#e05252', fontSize: 32, fontWeight: 'bold', letterSpacing: 3 },
  statsBox: { marginVertical: 28, alignItems: 'center', gap: 8 },
  stat: { color: '#e8e4d8', fontSize: 18 },
  retryButton: {
    backgroundColor: '#5ee9a0',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryText: { color: '#16161d', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});
