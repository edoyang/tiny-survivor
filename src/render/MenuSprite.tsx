import {
  Canvas,
  FilterMode,
  Image as SkiaImage,
  MipmapMode,
  useImage,
} from '@shopify/react-native-skia';
import { View } from 'react-native';

export function MenuSprite({ source, size }: { source: number; size: number }) {
  const image = useImage(source);
  if (image === null) return <View style={{ width: size, height: size }} />;
  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={image}
        x={0}
        y={0}
        width={size}
        height={size}
        fit="contain"
        sampling={{ filter: FilterMode.Nearest, mipmap: MipmapMode.None }}
      />
    </Canvas>
  );
}
