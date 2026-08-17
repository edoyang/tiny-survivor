import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
    require('expo-router/entry');
  });
} else {
  require('expo-router/entry');
}
