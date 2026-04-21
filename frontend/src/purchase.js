import { Capacitor } from '@capacitor/core';

let store;

export function initStore() {
  if (!window.store) return;

  store = window.store;

  store.register({
    id: 'kitabcloud.premium',
    type: store.PAID_SUBSCRIPTION
  });

  store.when('kitabcloud.premium').approved((order) => {
    console.log('Purchase approved');

    order.verify();
  });

  store.when('kitabcloud.premium').verified((receipt) => {
    console.log('Purchase verified');

    receipt.finish();

    // Unlock books
    localStorage.setItem('premium', 'true');
  });

  store.refresh();
}

export function buySubscription() {
  if (!store) return;

  store.order('kitabcloud.premium');
}
