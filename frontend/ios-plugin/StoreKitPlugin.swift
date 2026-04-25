// StoreKitPlugin.swift
// This file should be added to your Xcode project after `npx cap sync ios`
// Location: ios/App/App/StoreKitPlugin.swift

import Foundation
import Capacitor
import StoreKit

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
    
    // Product IDs - must match App Store Connect
    private let productIds = [
        "com.darussalam.kitabcloud.basic.monthly",
        "com.darussalam.kitabcloud.standard.monthly", 
        "com.darussalam.kitabcloud.advanced.monthly",
        "com.darussalam.kitabcloud.premium.monthly"
    ]
    
    private var products: [Product] = []
    
    @objc func loadProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let storeProducts = try await Product.products(for: productIds)
                self.products = storeProducts
                
                let productData = storeProducts.map { product -> [String: Any] in
                    return [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "price": product.price.description,
                        "displayPrice": product.displayPrice
                    ]
                }
                
                call.resolve(["products": productData])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func purchaseProduct(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Product ID is required")
            return
        }
        
        Task {
            do {
                guard let product = products.first(where: { $0.id == productId }) else {
                    // Try to fetch the product if not loaded
                    let storeProducts = try await Product.products(for: [productId])
                    guard let product = storeProducts.first else {
                        call.reject("Product not found")
                        return
                    }
                    await purchase(product: product, call: call)
                    return
                }
                
                await purchase(product: product, call: call)
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }
    
    private func purchase(product: Product, call: CAPPluginCall) async {
        do {
            let result = try await product.purchase()
            
            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    // Transaction is verified by Apple
                    await transaction.finish()
                    
                    call.resolve([
                        "success": true,
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate)
                    ])
                    
                case .unverified(_, let error):
                    call.reject("Transaction verification failed: \(error.localizedDescription)")
                }
                
            case .userCancelled:
                call.reject("User cancelled", "USER_CANCELLED")
                
            case .pending:
                call.reject("Transaction pending approval", "PENDING")
                
            @unknown default:
                call.reject("Unknown purchase result")
            }
        } catch {
            call.reject("Purchase error: \(error.localizedDescription)")
        }
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            var restoredTransactions: [[String: Any]] = []
            
            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    restoredTransactions.append([
                        "transactionId": String(transaction.id),
                        "originalTransactionId": String(transaction.originalID),
                        "productId": transaction.productID,
                        "purchaseDate": ISO8601DateFormatter().string(from: transaction.purchaseDate),
                        "expirationDate": transaction.expirationDate != nil ? 
                            ISO8601DateFormatter().string(from: transaction.expirationDate!) : NSNull()
                    ])
                case .unverified(_, _):
                    continue
                }
            }
            
            call.resolve(["transactions": restoredTransactions])
        }
    }
    
    @objc func getSubscriptionStatus(_ call: CAPPluginCall) {
        Task {
            var activeSubscriptions: [[String: Any]] = []
            
            for await result in Transaction.currentEntitlements {
                switch result {
                case .verified(let transaction):
                    if transaction.productType == .autoRenewable {
                        let isActive = transaction.expirationDate == nil || 
                                       transaction.expirationDate! > Date()
                        
                        if isActive {
                            activeSubscriptions.append([
                                "productId": transaction.productID,
                                "transactionId": String(transaction.id),
                                "originalTransactionId": String(transaction.originalID),
                                "expirationDate": transaction.expirationDate != nil ?
                                    ISO8601DateFormatter().string(from: transaction.expirationDate!) : NSNull(),
                                "isActive": true
                            ])
                        }
                    }
                case .unverified(_, _):
                    continue
                }
            }
            
            call.resolve([
                "hasActiveSubscription": !activeSubscriptions.isEmpty,
                "subscriptions": activeSubscriptions
            ])
        }
    }
}
