import Foundation
import Capacitor
import UIKit

@objc(ExternalBrowserPlugin)
public class ExternalBrowserPlugin: CAPPlugin {
    
    @objc func openUrl(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Invalid URL")
            return
        }
        
        DispatchQueue.main.async {
            // This opens the URL in the default browser (Safari, Brave, Chrome, etc.)
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve(["opened": true])
                } else {
                    call.reject("Failed to open URL")
                }
            }
        }
    }
}
