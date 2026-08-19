import {
  Canvas,
  FilterMode,
  Image as SkiaImage,
  MipmapMode,
  useImage,
} from '@shopify/react-native-skia';
import { View } from 'react-native';

const SAMPLING = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };

export function MenuSprite({
  hero,
  weapon,
  size,
}: {
  hero: number;
  weapon: number;
  size: number;
}) {
  const heroImage = useImage(hero);
  const weaponImage = useImage(weapon);
  if (heroImage === null || weaponImage === null) {
    return <View style={{ width: size, height: size }} />;
  }
  const heroSize = Math.round(size * 0.86);
  const weaponSize = Math.round(size * 0.46);
  return (
    <Canvas style={{ width: size, height: size }}>
      <SkiaImage
        image={heroImage}
        x={0}
        y={0}
        width={heroSize}
        height={heroSize}
        fit="contain"
        sampling={SAMPLING}
      />
      <SkiaImage
        image={weaponImage}
        x={size - weaponSize}
        y={size - weaponSize}
        width={weaponSize}
        height={weaponSize}
        fit="contain"
        sampling={SAMPLING}
      />
    </Canvas>
  );
}
