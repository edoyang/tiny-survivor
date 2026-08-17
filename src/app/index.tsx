import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import classes from '../game/data/classes.json' with { type: 'json' };
import { PRESETS, presetsForClass } from '../game/systems/items.ts';
import { BuildConfirm } from '../render/BuildConfirm.tsx';
import { MenuSprite } from '../render/MenuSprite.tsx';
import { getSkipBuildConfirm, setSkipBuildConfirm } from '../render/skipConfirm.ts';
import { HERO_IMAGES, WEAPON_IMAGES } from '../render/sources.ts';

type Choice = { classId: number; presetId: number };

export default function ClassSelect() {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<Choice | null>(null);
  const [skip, setSkip] = useState(getSkipBuildConfirm);

  const startRun = (choice: Choice) => {
    router.push({
      pathname: '/game',
      params: { classId: String(choice.classId), presetId: String(choice.presetId) },
    });
  };

  const choosePreset = (choice: Choice) => {
    if (skip) startRun(choice);
    else setPending(choice);
  };

  const toggleSkip = () => {
    const next = !skip;
    setSkip(next);
    setSkipBuildConfirm(next);
  };

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}
    >
      <Text style={styles.title}>TINY SURVIVORS</Text>
      <Text style={styles.subtitle}>Pick a hero, then a build</Text>
      <View style={styles.cards}>
        {classes.map((cls, classId) => (
          <View key={cls.id} style={styles.card}>
            <View style={styles.identity}>
              <View style={styles.sprites}>
                <MenuSprite source={HERO_IMAGES[cls.id]} size={80} />
                <MenuSprite source={WEAPON_IMAGES[cls.weapon]} size={40} />
              </View>
              <View style={styles.identityText}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.classDetail}>{cls.blurb}</Text>
              </View>
            </View>
            <View style={styles.presetRow}>
              {presetsForClass(classId).map((presetId) => (
                <Pressable
                  key={PRESETS[presetId].id}
                  style={styles.presetButton}
                  onPress={() => choosePreset({ classId, presetId })}
                >
                  <Text style={styles.presetName}>{PRESETS[presetId].name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </View>
      <Pressable style={styles.skipRow} onPress={toggleSkip}>
        <View style={[styles.checkbox, skip && styles.checkboxOn]}>
          {skip && <Text style={styles.checkmark}>X</Text>}
        </View>
        <Text style={styles.skipLabel}>Skip confirmation</Text>
      </Pressable>
      {pending !== null && (
        <BuildConfirm
          presetId={pending.presetId}
          onCancel={() => setPending(null)}
          onStart={() => {
            const choice = pending;
            setPending(null);
            startRun(choice);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#16161d', paddingHorizontal: 12 },
  title: {
    color: '#e8e4d8',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 3,
    textAlign: 'center',
  },
  subtitle: {
    color: '#9a9aa8',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
    textAlign: 'center',
  },
  cards: { flex: 1, gap: 10 },
  card: {
    flex: 1,
    backgroundColor: '#24242e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a3a48',
    padding: 12,
    justifyContent: 'space-between',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sprites: { flexDirection: 'row', alignItems: 'flex-end' },
  identityText: { flex: 1, gap: 2 },
  className: { color: '#e8e4d8', fontSize: 22, fontWeight: 'bold' },
  classDetail: { color: '#9a9aa8', fontSize: 12 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetButton: {
    flex: 1,
    backgroundColor: '#2e2e3a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#454556',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: { color: '#e8e4d8', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  skipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#5a5a6e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#5ee9a0', borderColor: '#5ee9a0' },
  checkmark: { color: '#16161d', fontSize: 12, fontWeight: 'bold' },
  skipLabel: { color: '#9a9aa8', fontSize: 13 },
});
