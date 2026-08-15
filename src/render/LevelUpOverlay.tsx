import { Pressable, StyleSheet, Text, View } from 'react-native';
import upgrades from '../game/data/upgrades.json' with { type: 'json' };

export function LevelUpOverlay({
  offer,
  onPick,
}: {
  offer: number[];
  onPick: (slot: number) => void;
}) {
  return (
    <View style={styles.backdrop}>
      <Text style={styles.title}>LEVEL UP</Text>
      <Text style={styles.subtitle}>Choose an upgrade</Text>
      {offer.map((upgradeIndex, slot) =>
        upgradeIndex < 0 ? null : (
          <Pressable key={slot} style={styles.card} onPress={() => onPick(slot)}>
            <Text style={styles.cardName}>{upgrades[upgradeIndex].name}</Text>
            <Text style={styles.cardDescription}>{upgrades[upgradeIndex].description}</Text>
          </Pressable>
        ),
      )}
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
  title: { color: '#5ee9a0', fontSize: 28, fontWeight: 'bold', letterSpacing: 2 },
  subtitle: { color: '#e8e4d8', fontSize: 14, marginBottom: 24 },
  card: {
    width: '100%',
    backgroundColor: '#24242e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a48',
    padding: 16,
    marginBottom: 12,
  },
  cardName: { color: '#e8e4d8', fontSize: 18, fontWeight: 'bold' },
  cardDescription: { color: '#9a9aa8', fontSize: 13, marginTop: 4 },
});
