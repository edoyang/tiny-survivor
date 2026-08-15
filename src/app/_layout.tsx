import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { loadSkia } from '../render/loadSkia';

export default function RootLayout() {
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (!skiaReady) {
      loadSkia().then(() => setSkiaReady(true));
    }
  }, [skiaReady]);

  if (!skiaReady) {
    return <View style={{ flex: 1, backgroundColor: '#16161d' }} />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
