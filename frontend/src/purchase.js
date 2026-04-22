import { Capacitor } from '@capacitor/core';

// This function initializes the store and sets up the listeners
export const initializeStore = () => {
  if (Capacitor.getPlatform() === 'web') return;

  const { store, ProductType, Platform } = window.CdvPurchase;

  // 1. Register your Products
  // Replace these IDs with the exact ones from App Store Connect
  store.register([
    {
      id: 'host.emergent.kitabcloud.tier1',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    },
    {
      id: 'host.emergent.kitabcloud.tier2',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    },
    {
      id: 'host.emergent.kitabcloud.tier3',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    },
    {
      id: 'host.emergent.kitabcloud.tier4',
      type: ProductType.PAID_SUBSCRIPTION,
      platform: Platform.APPLE_APP_STORE,
    }
  ]);

  // 2. Handle Purchase Validation/Approval
  store.when()
    .approved((transaction) => {
      console.log('Purchase Approved:', transaction);
      // This is where you tell your backend to verify the receipt
      transaction.verify();
    })
    .verified((receipt) => {
      console.log('Purchase Verified:', receipt);
      receipt.finish();
    })
    .finished((transaction) => {
      console.log('Transaction Finished:', transaction);
    });

  // 3. Initialize the store
  store.initialize([Platform.APPLE_APP_STORE]);
};

// This is the function called by your PricingPage.jsx
export const buySubscription = async (tierNumber) => {
  if (Capacitor.getPlatform() === 'web') {
    console.warn('In-App Purchases are not available on web.');
    return;
  }

  const { store } = window.CdvPurchase;
  
  // Map your tier numbers to your Apple Product IDs
  const productId = `host.emergent.kitabcloud.tier${tierNumber}`;
  
  const product = store.get(productId);

  if (product && product.canPurchase) {
    product.getOffer().order();
  } else {
    console.error('Product not found or unavailable:', productId);
  }
};

// Function for the "Restore Purchases" button Apple requires
export const restorePurchases = () => {
  if (Capacitor.getPlatform() === 'web') return;
  window.CdvPurchase.store.restore();
};
