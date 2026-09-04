import UIKit
import UniformTypeIdentifiers

private struct PendingItem: Codable {
    let id: String
    let name: String
    let mimeType: String
    let fileName: String
}

private struct PendingManifest: Codable {
    let receivedAt: String
    let files: [PendingItem]
}

final class ShareViewController: UIViewController {
    private let groupIdentifier = "group.com.diarydock.shared"
    private let maximumFiles = 12
    private let maximumBytes = 4 * 1024 * 1024
    private var imported: [PendingItem] = []
    private var importedBytes = 0
    private var started = false

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !started else { return }
        started = true
        importSharedItems()
    }

    private func importSharedItems() {
        guard let directory = prepareDirectory() else { return finish(openApp: false) }
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? [])
            .flatMap { $0.attachments ?? [] }
        guard providers.count <= maximumFiles else { return finish(openApp: false) }
        process(providers, at: 0, directory: directory)
    }

    private func process(_ providers: [NSItemProvider], at index: Int, directory: URL) {
        guard index < providers.count else {
            writeManifest(directory)
            return
        }
        let provider = providers[index]
        guard let type = supportedType(provider) else {
            return process(providers, at: index + 1, directory: directory)
        }
        provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { [weak self] url, _ in
            guard let self else { return }
            defer { self.process(providers, at: index + 1, directory: directory) }
            guard let source = url, self.importedBytes < self.maximumBytes else { return }
            let identifier = UUID().uuidString.lowercased()
            let name = self.safeName(provider.suggestedName, type: type)
            let fileName = "\(identifier)-\(name)"
            let destination = directory.appendingPathComponent(fileName, isDirectory: false)
            guard let count = self.copyBounded(source, to: destination),
                  count > 0, self.importedBytes + count <= self.maximumBytes else {
                try? FileManager.default.removeItem(at: destination)
                return
            }
            self.importedBytes += count
            self.imported.append(PendingItem(
                id: identifier,
                name: name,
                mimeType: type.preferredMIMEType ?? "application/octet-stream",
                fileName: fileName
            ))
        }
    }

    private func supportedType(_ provider: NSItemProvider) -> UTType? {
        let types: [UTType] = [.pdf, .jpeg, .png, .webP, .heic]
        return types.first { provider.hasItemConformingToTypeIdentifier($0.identifier) }
    }

    private func prepareDirectory() -> URL? {
        guard let root = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: groupIdentifier
        ) else { return nil }
        let directory = root.appendingPathComponent("ShareImports/Pending", isDirectory: true)
        try? FileManager.default.removeItem(at: directory)
        do {
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true,
                attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
            )
            return directory
        } catch {
            return nil
        }
    }

    private func copyBounded(_ source: URL, to destination: URL) -> Int? {
        guard let input = InputStream(url: source), let output = OutputStream(url: destination, append: false) else {
            return nil
        }
        input.open(); output.open()
        defer { input.close(); output.close() }
        var total = 0
        var buffer = [UInt8](repeating: 0, count: 32 * 1024)
        while true {
            let read = input.read(&buffer, maxLength: buffer.count)
            if read < 0 { return nil }
            if read == 0 { break }
            total += read
            if total > maximumBytes || importedBytes + total > maximumBytes { return nil }
            var offset = 0
            while offset < read {
                let written = buffer.withUnsafeBufferPointer { pointer in
                    guard let base = pointer.baseAddress else { return -1 }
                    return output.write(base.advanced(by: offset), maxLength: read - offset)
                }
                if written <= 0 { return nil }
                offset += written
            }
        }
        return total
    }

    private func safeName(_ suggested: String?, type: UTType) -> String {
        let original = suggested?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let stem = URL(fileURLWithPath: original).deletingPathExtension().lastPathComponent
        let clean = stem.lowercased().replacingOccurrences(
            of: "[^a-z0-9]+", with: "-", options: .regularExpression
        ).trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        let short = String((clean.isEmpty ? "shared-document" : clean).prefix(96))
        return "\(short).\(type.preferredFilenameExtension ?? "bin")"
    }

    private func writeManifest(_ directory: URL) {
        guard !imported.isEmpty else { return finish(openApp: false) }
        let manifest = PendingManifest(
            receivedAt: String(Int(Date().timeIntervalSince1970 * 1000)),
            files: imported
        )
        do {
            let data = try JSONEncoder().encode(manifest)
            try data.write(
                to: directory.appendingPathComponent("manifest.json"),
                options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]
            )
            finish(openApp: true)
        } catch {
            try? FileManager.default.removeItem(at: directory)
            finish(openApp: false)
        }
    }

    private func finish(openApp: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard openApp, let url = URL(string: "diarydock://import/share") else {
                self.extensionContext?.completeRequest(returningItems: nil)
                return
            }
            self.extensionContext?.open(url) { [weak self] _ in
                self?.extensionContext?.completeRequest(returningItems: nil)
            }
        }
    }
}
