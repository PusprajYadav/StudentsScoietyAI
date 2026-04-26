import Foundation
import Capacitor

@objc(NativeDownloadsPlugin)
public class NativeDownloadsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeDownloadsPlugin"
    public let jsName = "NativeDownloads"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveFile", returnType: CAPPluginReturnPromise)
    ]

    private let defaultSubdirectory = "Student Society"

    @objc func saveFile(_ call: CAPPluginCall) {
        let fileName = sanitizeFileName(call.getString("fileName") ?? "")
        let base64Data = call.getString("base64Data") ?? ""
        let mimeType = sanitizeMimeType(call.getString("mimeType") ?? "application/octet-stream")
        let subdirectory = sanitizeRelativePath(call.getString("subdirectory") ?? defaultSubdirectory)

        guard !fileName.isEmpty, !base64Data.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("fileName and base64Data are required.")
            return
        }

        guard let data = Data(base64Encoded: base64Data, options: [.ignoreUnknownCharacters]) else {
            call.reject("Could not decode the exported file.")
            return
        }

        do {
            let documentsDirectory = try resolveDocumentsDirectory()
            let targetDirectory = subdirectory.isEmpty ? documentsDirectory : documentsDirectory.appendingPathComponent(subdirectory, isDirectory: true)
            try FileManager.default.createDirectory(at: targetDirectory, withIntermediateDirectories: true, attributes: nil)

            let targetFile = createUniqueFile(in: targetDirectory, fileName: fileName)
            try data.write(to: targetFile, options: [.atomic])

            call.resolve([
                "uri": targetFile.absoluteString,
                "relativePath": (subdirectory.isEmpty ? "" : "\(subdirectory)/") + targetFile.lastPathComponent,
                "absolutePath": targetFile.path,
                "fileName": targetFile.lastPathComponent,
                "byteLength": data.count,
                "mimeType": mimeType
            ])
        } catch {
            call.reject("Could not save the exported file to Files.", nil, error)
        }
    }

    private func resolveDocumentsDirectory() throws -> URL {
        guard let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            throw NSError(domain: "NativeDownloadsPlugin", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "Could not locate the iOS documents directory."
            ])
        }

        return directory
    }

    private func createUniqueFile(in directory: URL, fileName: String) -> URL {
        var candidate = directory.appendingPathComponent(fileName)
        if !FileManager.default.fileExists(atPath: candidate.path) {
            return candidate
        }

        let fileExtension = (fileName as NSString).pathExtension
        let baseName = (fileName as NSString).deletingPathExtension
        var counter = 2

        while FileManager.default.fileExists(atPath: candidate.path) {
            let suffixedName = fileExtension.isEmpty ? "\(baseName) (\(counter))" : "\(baseName) (\(counter)).\(fileExtension)"
            candidate = directory.appendingPathComponent(suffixedName)
            counter += 1
        }

        return candidate
    }

    private func sanitizeFileName(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return "download"
        }

        let invalidCharacters = CharacterSet(charactersIn: "/:\\?%*|\"<>").union(.controlCharacters)
        let cleanedScalars = trimmed.unicodeScalars.map { invalidCharacters.contains($0) ? "-" : Character($0) }
        let cleaned = String(cleanedScalars)
        return String(cleaned.prefix(180))
    }

    private func sanitizeRelativePath(_ input: String) -> String {
        var cleaned = input.replacingOccurrences(of: "\\", with: "/")
        cleaned = cleaned.replacingOccurrences(of: "..", with: "")
        cleaned = cleaned.trimmingCharacters(in: CharacterSet(charactersIn: "/").union(.whitespacesAndNewlines))
        return cleaned
    }

    private func sanitizeMimeType(_ input: String) -> String {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? "application/octet-stream" : trimmed
    }
}
