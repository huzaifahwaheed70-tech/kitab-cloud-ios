// StoreKitPlugin.swift
// Native StoreKit 2 plugin for Capacitor
// Add this file to ios/App/App/ in Xcode

import Foundation
import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "loadProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSubscriptionStatus", returnType: CAPPluginReturnPromise)
    ]
    
    // Product IDs - these should match your App Store Connect products
    private let subscriptionIds = [
        "com.darussalam.kitabcloud.basic.monthly",
        "com.darussalam.kitabcloud.standard.monthly",
        "com.darussalam.kitabcloud.advanced.monthly",
        "com.darussalam.kitabcloud.premium.monthly"
    ]
    
    private var products: [Product] = []
    private var purchasedProductIDs: Set<String> = []
    
    public override func load() {
        // Start listening for transactions
        Task {
            await listenForTransactions()
        }
    }
    
    // Listen for transaction updates
    private func listenForTransactions() async {
        for await result in Transaction.updates {
            if case .verified(let transaction) = result {
                await transaction.finish()
                await updatePurchasedProducts()
            }
        }
    }
    
    // Update list of purchased products
    private func updatePurchasedProducts() async {
        var purchased: Set<String> = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result {
                purchased.insert(transaction.productID)
            }
        }
        purchasedProductIDs = purchased
    }
    
    @objc func loadProducts(_ call: CAPPluginCall) {
        Task {
            do {
                // Get all product IDs (subscriptions + any book products)
                var allProductIds = Set(subscriptionIds)
                
                // Load products from App Store
                let storeProducts = try await Product.products(for: allProductIds)
                self.products = storeProducts
                
                let productData = storeProducts.map { product -> [String: Any] in
                    return [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "displayPrice": product.displayPrice,
                        "type": product.type.rawValue
                    ]
                }
                
                call.resolve(["products": productData, "count": productData.count])
            } catch {
                print("StoreKit loadProducts error: \(error)")
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Product ID is required")
            return
        }
        
        print("StoreKit: Starting purchase for \(productId)")
        
        Task {
            do {
                // Find product in cache or fetch it
                var product = products.first(where: { $0.id == productId })
                
                if product == nil {
                    print("StoreKit: Product not in cache, fetching...")
                    let storeProducts = try await Product.products(for: [productId])
                    product = storeProducts.first
                }
                
                guard let productToPurchase = product else {
                    print("StoreKit: Product not found: \(productId)")
                    call.reject("Product not found in App Store: \(productId)")
                    return
                }
                
                print("StoreKit: Initiating purchase...")
                let result = try await productToPurchase.purchase()
                
                switch result {
                case .success(let verification):
                    print("StoreKit: Purchase successful, verifying...")
                    switch verification {
                    case .verified(let transaction):
                        print("StoreKit: Transaction verified")
                        await transaction.finish()
                        
                        call.resolve([
                            "success": true,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "productId": transaction.productID,
                            "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                        ])
                        
                    case .unverified(let transaction, let error):
                        print("StoreKit: Transaction unverified: \(error)")
                        // Still return the transaction but note it's unverified
                        call.resolve([
                            "success": true,
                            "transactionId": String(transaction.id),
                            "originalTransactionId": String(transaction.originalID),
                            "productId": transaction.productID,
                            "unverified": true,
                            "error": error.localizedDescription
                        ])
                    }
                    
                case .userCancelled:
                    print("StoreKit: User cancelled")
                    call.reject("User cancelled", "USER_CANCELLED")
                    
                case .pending:
                    print("StoreKit: Purchase pending")
                    call.reject("Purchase pending approval", "PENDING")
                    
                @unknown default:
                    print("StoreKit: Unknown result")
                    call.reject("Unknown purchase result")
                }
            } catch StoreKitError.userCancelled {
                print("StoreKit: User cancelled (error)")
                call.reject("User cancelled", "USER_CANCELLED")
            } catch {
                print("StoreKit: Purchase error: \(error)")
                call.reject("Purchase error: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        print("StoreKit: Restoring purchases...")
        
        Task {
            var restoredTransactions: [[String: Any]] = []
            
            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    print("StoreKit: Found entitlement: \(transaction.productID)")
                    var transactionData: [String: Any] = [
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                    ]
                    
                    if let expirationDate = transaction.expirationDate {
                        transactionData["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
                    }
                    
                    restoredTransactions.append(transactionData)
                    
                case .unverified(_, _):
                    continue
                }
            }
            
            print("StoreKit: Restored \(restoredTransactions.count) transactions")
            call.resolve(["transactions": restoredTransactions, "count": restoredTransactions.count])
        }
    }
    
    @objc func getSubscriptionStatus(_ call: CAPPluginCall) {
        print("StoreKit: Getting subscription status...")
        
        Task {
            var activeSubscriptions: [[String: Any]] = []
            
            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    if transaction.productType == .autoRenewable {
                        let isActive = transaction.expirationDate == nil || 
                                       transaction.expirationDate! > Date()
                        
                        if isActive {
                            var subData: [String: Any] = [
                                "productId": transaction.productID,
                                "transactionId": String(transaction.id),
                                "originalTransactionId": String(transaction.originalID),
                                "isActive": true
                            ]
                            
                            if let expirationDate = transaction.expirationDate {
                                subData["expirationDate"] = ISO8601DateFormatter().string(from: expirationDate)
                            }
                            
                            activeSubscriptions.append(subData)
                        }
                    }
                case .unverified(_, _):
                    continue
                }
            }
            
            print("StoreKit: Found \(activeSubscriptions.count) active subscriptions")
            call.resolve([
                "hasActiveSubscription": !activeSubscriptions.isEmpty,
                "subscriptions": activeSubscriptions
            ])
        }
    }
}

// Fallback for iOS < 15
@available(iOS, deprecated: 15.0, message: "Use StoreKitPlugin instead")
@objc(StoreKitPluginLegacy)
public class StoreKitPluginLegacy: CAPPlugin {
    @objc func loadProducts(_ call: CAPPluginCall) {
        call.reject("StoreKit 2 requires iOS 15 or later")
    }
    
    @objc func purchaseProduct(_ call: CAPPluginCall) {
        call.reject("StoreKit 2 requires iOS 15 or later")
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        call.reject("StoreKit 2 requires iOS 15 or later")
    }
    
    @objc func getSubscriptionStatus(_ call: CAPPluginCall) {
        call.reject("StoreKit 2 requires iOS 15 or later")
    }
}
