import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import classes from '../game/data/classes.json' with { type: 'json' };
import { MenuSprite } from '../render/MenuSprite.tsx';
import { HERO_IMAGES, WEAPON_IMAGES } from '../render/sources.ts';

export default function ClassSelect() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <Text style={styles.title}>TINY SURVIVORS</Text>
      <Text style={styles.subtitle}>Pick your hero</Text>
      <View style={styles.cards}>
        {classes.map((cls, classId) => (
          <Pressable
            key={cls.id}
            style={styles.card}
            onPress={() =>
              router.push({ pathname: '/game', params: { classId: String(classId) } })
            }
          >
            <View style={styles.sprites}>
              <MenuSprite source={HERO_IMAGES[cls.id]} size={64} />
              <MenuSprite source={WEAPON_IMAGES[cls.weapon]} size={32} />
            </View>
            <Text style={styles.cardName}>{cls.name}</Text>
            <Text style={styles.cardBlurb}>{cls.blurb}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#16161d', alignItems: 'center', paddingHorizontal: 16 },
  title: { color: '#e8e4d8', fontSize: 28, fontWeight: 'bold', letterSpacing: 3 },
  subtitle: { color: '#9a9aa8', fontSize: 14, marginTop: 4, marginBottom: 20 },
  cards: { flex: 1, width: '100%', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#24242e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a3a48',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sprites: { flexDirection: 'row', alignItems: 'flex-end' },
  cardName: { color: '#e8e4d8', fontSize: 20, fontWeight: 'bold', width: 84 },
  cardBlurb: { color: '#9a9aa8', fontSize: 12, flex: 1 },
});
