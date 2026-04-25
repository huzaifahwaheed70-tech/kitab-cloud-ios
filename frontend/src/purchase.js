import { Capacitor } from '@capacitor/core';

export const initStore = () => {
  if (Capacitor.getPlatform() === 'web') return;
  if (!window.CdvPurchase) return;

  const { store, ProductType, Platform } = window.CdvPurchase;

  store.register([
    {
      id: 'kitabcloud.basic',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    },
    {
      id: 'kitabcloud.standard',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    },
    {
      id: 'kitabcloud.advanced',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    },
    {
      id: 'kitabcloud.premium',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    }
  ]);

  store.when()
    .approved((transaction) => {
      transaction.verify();
    })
    .verified((receipt) => {
      receipt.finish();
    })
    .finished((transaction) => {
      console.log('Transaction Finished:', transaction);
    });

  store.initialize([Platform.APPLE_APP_STORE]);
};

export const buySubscription = async (tierNumber) => {
  if (Capacitor.getPlatform() !== 'ios') return;
  if (!window.CdvPurchase) return;

  const { store } = window.CdvPurchase;

  const TIER_PRODUCTS = {
    1: 'kitabcloud.basic',
    2: 'kitabcloud.standard',
    3: 'kitabcloud.advanced',
    4: 'kitabcloud.premium'
  };

  const productId = TIER_PRODUCTS[tierNumber];
  const product = store.get(productId);

  if (product && product.canPurchase) {
    product.getOffer().order();
  } else {
    console.error('Product not found or unavailable:', productId);
  }
};

export const restorePurchases = () => {
  if (Capacitor.getPlatform() !== 'ios') return;
  if (!window.CdvPurchase) return;
  window.CdvPurchase.store.restore();
};
