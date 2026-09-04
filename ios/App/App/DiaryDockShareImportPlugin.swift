import Capacitor
import Foundation

private struct SharedImportItem: Codable {
    let id: String
    let name: String
    let mimeType: String
    let fileName: String
}

private struct SharedImportManifest: Codable {
    let receivedAt: String
    let files: [SharedImportItem]
}

@objc(DiaryDockShareImportPlugin)
final class DiaryDockShareImportPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "DiaryDockShareImportPlugin"
    let jsName = "DiaryDockShareImport"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingImport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasPendingImport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPendingImport", returnType: CAPPluginReturnPromise)
    ]

    private let groupIdentifier = "group.com.diarydock.shared"
    private let maximumFiles = 12
    private let maximumBytes = 4 * 1024 * 1024

    @objc func getPendingImport(_ call: CAPPluginCall) {
        do {
            guard let directory = pendingDirectory(),
                  let manifest = try readManifest(directory) else {
                call.resolve(["files": [], "source": "ios-share-sheet"])
                return
            }
            guard !manifest.files.isEmpty, manifest.files.count <= maximumFiles else {
                throw ShareImportError.invalidManifest
            }
            var totalBytes = 0
            var files: [[String: Any]] = []
            for item in manifest.files {
                guard safeIdentifier(item.id), safeFileName(item.fileName) else {
                    throw ShareImportError.invalidManifest
                }
                let url = directory.appendingPathComponent(item.fileName, isDirectory: false)
                let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
                guard let size = attributes[.size] as? NSNumber,
                      size.intValue > 0, size.intValue <= maximumBytes else {
                    throw ShareImportError.invalidFile
                }
                totalBytes += size.intValue
                guard totalBytes <= maximumBytes else { throw ShareImportError.invalidFile }
                let data = try Data(contentsOf: url, options: [.mappedIfSafe])
                guard data.count == size.intValue else { throw ShareImportError.invalidFile }
                files.append([
                    "id": item.id,
                    "name": item.name,
                    "mimeType": item.mimeType,
                    "size": data.count,
                    "base64": data.base64EncodedString()
                ])
            }
            call.resolve([
                "files": files,
                "source": "ios-share-sheet",
                "receivedAt": manifest.receivedAt
            ])
        } catch {
            clearPendingFiles()
            call.reject("Unable to read the shared files.")
        }
    }

    @objc func clearPendingImport(_ call: CAPPluginCall) {
        clearPendingFiles()
        call.resolve()
    }

    @objc func hasPendingImport(_ call: CAPPluginCall) {
        do {
            guard let directory = pendingDirectory(),
                  let manifest = try readManifest(directory),
                  !manifest.files.isEmpty, manifest.files.count <= maximumFiles else {
                call.resolve(["count": 0])
                return
            }
            call.resolve(["count": manifest.files.count])
        } catch {
            clearPendingFiles()
            call.resolve(["count": 0])
        }
    }

    private func pendingDirectory() -> URL? {
        FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: groupIdentifier
        )?.appendingPathComponent("ShareImports/Pending", isDirectory: true)
    }

    private func readManifest(_ directory: URL) throws -> SharedImportManifest? {
        let url = directory.appendingPathComponent("manifest.json", isDirectory: false)
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        let data = try Data(contentsOf: url)
        guard data.count <= 64 * 1024 else { throw ShareImportError.invalidManifest }
        return try JSONDecoder().decode(SharedImportManifest.self, from: data)
    }

    private func clearPendingFiles() {
        guard let directory = pendingDirectory() else { return }
        try? FileManager.default.removeItem(at: directory)
    }

    private func safeIdentifier(_ value: String) -> Bool {
        value.range(of: "^[A-Za-z0-9-]{1,64}$", options: .regularExpression) != nil
    }

    private func safeFileName(_ value: String) -> Bool {
        !value.isEmpty && value.count <= 180 && value == URL(fileURLWithPath: value).lastPathComponent
    }
}

private enum ShareImportError: Error {
    case invalidFile
    case invalidManifest
}
