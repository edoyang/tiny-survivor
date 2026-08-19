import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { buyProduct, SHOP } from '../meta/state.ts';
import { updateMeta } from '../meta/store.ts';
import { UI_ICONS } from '../render/icons.ts';
import { MetaScreen } from '../render/MetaChrome.tsx';
import { Frame, PixelButton } from '../render/PixelUi.tsx';
import { COLORS, MONO } from '../render/theme.ts';
import { useMeta } from '../render/useMeta.ts';

export default function Shop() {
  const meta = useMeta();
  const [notice, setNotice] = useState('');
  return (
    <MetaScreen title="SHOP" subtitle="GEMS BUY SUMMONS, COINS BUY UPGRADES">
      <View style={styles.list}>
        {SHOP.map((product) => {
          const isIap = product.currency === 'iap';
          const price = isIap ? `$${product.priceUsd}` : `${product.priceGems} GEMS`;
          const affordable = isIap || meta.gems >= (product.priceGems ?? 0);
          return (
            <Frame
              key={product.id}
              outline={isIap ? COLORS.gold : COLORS.ink}
              fill={COLORS.stone}
              innerStyle={styles.card}
            >
              <Image source={product.gems > 0 ? UI_ICONS.gem : UI_ICONS.coin} style={styles.icon} />
              <View style={styles.text}>
                <Text style={styles.name}>{product.name.toUpperCase()}</Text>
                <Text style={styles.amount}>
                  {product.gems > 0 ? `${product.gems} GEMS` : `${product.coins} COINS`}
                </Text>
                {isIap && <Text style={styles.iapTag}>REAL MONEY</Text>}
              </View>
              <PixelButton
                label={price}
                primary={affordable && !isIap}
                style={styles.buy}
                onPress={() => {
                  if (isIap) {
                    setNotice('Store payments are not connected in this build.');
                    return;
                  }
                  const bought = updateMeta((state) => buyProduct(state, product.id));
                  setNotice(bought ? `Bought ${product.name}.` : 'Not enough gems.');
                }}
              />
            </Frame>
          );
        })}
      </View>
      <Text style={styles.notice}>{notice}</Text>
    </MetaScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  icon: { width: 34, height: 34 },
  text: { flex: 1 },
  name: { color: COLORS.parchment, fontFamily: MONO, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  amount: { color: COLORS.muted, fontFamily: MONO, fontSize: 10, marginTop: 2 },
  iapTag: { color: COLORS.gold, fontFamily: MONO, fontSize: 8, letterSpacing: 2, marginTop: 4 },
  buy: { width: 118 },
  notice: { color: COLORS.gold, fontSize: 11, textAlign: 'center', paddingTop: 12, minHeight: 30 },
});
