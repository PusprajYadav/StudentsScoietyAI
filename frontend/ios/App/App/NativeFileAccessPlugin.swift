import Foundation
import Capacitor
import UniformTypeIdentifiers

@objc(NativeFileAccessPlugin)
public class NativeFileAccessPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeFileAccessPlugin"
    public let jsName = "NativeFileAccess"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "readImportedFile", returnType: CAPPluginReturnPromise)
    ]

    @objc func readImportedFile(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let fileURL = URL(string: urlString) else {
            call.reject("A valid file URL is required.")
            return
        }

        let didStartAccessing = fileURL.startAccessingSecurityScopedResource()
        defer {
            if didStartAccessing {
                fileURL.stopAccessingSecurityScopedResource()
            }
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let mimeType = resolveMimeType(for: fileURL)
            call.resolve([
                "base64Data": data.base64EncodedString(),
                "fileName": fileURL.lastPathComponent,
                "mimeType": mimeType
            ])
        } catch {
            call.reject("Could not read the imported file.", nil, error)
        }
    }

    private func resolveMimeType(for fileURL: URL) -> String {
        if #available(iOS 14.0, *) {
            if let resourceValues = try? fileURL.resourceValues(forKeys: [.contentTypeKey]),
               let contentType = resourceValues.contentType {
                return contentType.preferredMIMEType ?? "application/octet-stream"
            }

            if let contentType = UTType(filenameExtension: fileURL.pathExtension) {
                return contentType.preferredMIMEType ?? "application/octet-stream"
            }
        }

        return fileURL.pathExtension.lowercased() == "pdf" ? "application/pdf" : "application/octet-stream"
    }
}
