import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import classes from '../game/data/classes.json' with { type: 'json' };
import { MAX_STARS } from '../game/kinds.ts';
import { ITEMS, PRESETS } from '../game/systems/items.ts';

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
  const exclusive: number[] = [];
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].preset === preset.id) exclusive.push(i);
  }
  return (
    <View
      style={[styles.backdrop, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
    >
      <View style={styles.panel}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.presetName}>{preset.name}</Text>
            <Text style={styles.className}>{classes[preset.classId].name}</Text>
          </View>
          <Pressable style={styles.close} onPress={onCancel} hitSlop={10}>
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>
        <Text style={styles.blurb}>{preset.blurb}</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {exclusive.map((itemIndex) => {
            const item = ITEMS[itemIndex];
            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={[styles.itemDot, { backgroundColor: item.color }]} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemName, { color: item.color }]}>{item.name}</Text>
                  <Text style={styles.itemStar}>
                    {'*'.repeat(MAX_STARS)} {item.star}
                  </Text>
                  <Text style={styles.itemAwaken}>AWAKEN {item.awaken}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
        <Pressable style={styles.battleButton} onPress={onStart}>
          <Text style={styles.battleText}>LET&apos;S GO TO BATTLE</Text>
        </Pressable>
      </View>
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
    backgroundColor: '#0d0d12ee',
    paddingHorizontal: 16,
  },
  panel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#24242e',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3a3a48',
    padding: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  presetName: { color: '#e8e4d8', fontSize: 24, fontWeight: 'bold', letterSpacing: 1 },
  className: { color: '#9a9aa8', fontSize: 13, marginTop: 2 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2e2e3a',
    borderWidth: 1,
    borderColor: '#454556',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#e8e4d8', fontSize: 14, fontWeight: 'bold' },
  blurb: { color: '#c9c5b8', fontSize: 13, marginTop: 8 },
  list: { flex: 1, minHeight: 0, marginTop: 14, marginBottom: 14 },
  listContent: { paddingBottom: 4, gap: 12 },
  itemRow: { flexDirection: 'row', gap: 10 },
  itemDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  itemText: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: 'bold' },
  itemStar: { color: '#c9c5b8', fontSize: 12, marginTop: 1 },
  itemAwaken: { color: '#5ee9a0', fontSize: 12, marginTop: 1 },
  battleButton: {
    backgroundColor: '#5ee9a0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  battleText: { color: '#16161d', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
