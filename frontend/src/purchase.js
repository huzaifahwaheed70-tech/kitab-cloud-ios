import { Capacitor } from '@capacitor/core';

export const initStore = () => {
  if (Capacitor.getPlatform() !== 'ios') return;

  const waitForCdvPurchase = (attempts = 0) => {
    if (attempts > 20) {
      console.error('CdvPurchase never loaded after 10 seconds');
      return;
    }

    if (!window.CdvPurchase) {
      setTimeout(() => waitForCdvPurchase(attempts + 1), 500);
      return;
    }

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
    console.log('StoreKit initialized successfully');
  };

  waitForCdvPurchase();
};

const TIER_PRODUCTS = {
  1: 'kitabcloud.basic',
  2: 'kitabcloud.standard',
  3: 'kitabcloud.advanced',
  4: 'kitabcloud.premium'
};

export const buySubscription = async (tierNumber) => {
  if (Capacitor.getPlatform() !== 'ios') return;

  return new Promise((resolve, reject) => {
    const attemptPurchase = (attempts = 0) => {
      if (attempts > 20) {
        reject(new Error('In-App Purchases not available. Please reinstall the app.'));
        return;
      }

      if (!window.CdvPurchase) {
        setTimeout(() => attemptPurchase(attempts + 1), 500);
        return;
      }

      const { store } = window.CdvPurchase;
      const productId = TIER_PRODUCTS[tierNumber];
      const product = store.get(productId);

      if (!product) {
        reject(new Error('Product not found. Please try again later.'));
        return;
      }

      if (!product.canPurchase) {
        reject(new Error('Product not available for purchase right now.'));
        return;
      }

      product.getOffer().order()
        .then(resolve)
        .catch(reject);
    };

    attemptPurchase();
  });
};

export const restorePurchases = () => {
  if (Capacitor.getPlatform() !== 'ios') return;
  if (!window.CdvPurchase) return;
  window.CdvPurchase.store.restore();
};
