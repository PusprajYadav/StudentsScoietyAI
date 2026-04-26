import Foundation
import Capacitor
import UIKit

@objc(NativeNotificationSettingsPlugin)
public class NativeNotificationSettingsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeNotificationSettingsPlugin"
    public let jsName = "NativeNotificationSettings"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openAppNotificationSettings", returnType: CAPPluginReturnPromise)
    ]

    @objc func openAppNotificationSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString),
                  UIApplication.shared.canOpenURL(url) else {
                call.reject("Could not open iOS app settings.")
                return
            }

            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve()
                } else {
                    call.reject("Could not open iOS app settings.")
                }
            }
        }
    }
}
