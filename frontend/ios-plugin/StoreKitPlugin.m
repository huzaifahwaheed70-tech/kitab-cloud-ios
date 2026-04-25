// StoreKitPlugin.m
// Objective-C bridge file for the StoreKit plugin
// Location: ios/App/App/StoreKitPlugin.m

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(StoreKitPlugin, "StoreKit",
    CAP_PLUGIN_METHOD(loadProducts, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(purchaseProduct, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSubscriptionStatus, CAPPluginReturnPromise);
)
