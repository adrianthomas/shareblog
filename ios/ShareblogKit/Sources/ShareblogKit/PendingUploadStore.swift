import Foundation

/// Persists the pending-upload queue (and any image data it references) to
/// the App Group container, since the share extension enqueues these and
/// the main app is the one that later retries and removes them — two
/// separate processes that only share state through this container.
public final class PendingUploadStore: @unchecked Sendable {
    public static let shared = PendingUploadStore()

    private let queueURL: URL
    private let assetsDirectory: URL
    private let syncQueue = DispatchQueue(label: "com.adrianthomas.shareblog.pendinguploads")

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    private static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    private init() {
        let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: AppGroup.identifier)
            ?? FileManager.default.temporaryDirectory
        let root = container.appendingPathComponent("PendingUploads", isDirectory: true)
        queueURL = root.appendingPathComponent("queue.json")
        assetsDirectory = root.appendingPathComponent("Assets", isDirectory: true)
        try? FileManager.default.createDirectory(at: assetsDirectory, withIntermediateDirectories: true)
    }

    public func load() -> [PendingUpload] {
        syncQueue.sync {
            guard let data = try? Data(contentsOf: queueURL) else { return [] }
            return (try? Self.decoder.decode([PendingUpload].self, from: data)) ?? []
        }
    }

    private func save(_ items: [PendingUpload]) {
        syncQueue.sync {
            guard let data = try? Self.encoder.encode(items) else { return }
            try? data.write(to: queueURL, options: .atomic)
        }
    }

    /// Queues a post for later upload. `imageData`, if given, is written
    /// alongside the queue file so a Photo post's asset can be re-uploaded
    /// once the server is reachable — the createObject call it's paired
    /// with couldn't have gotten an assetId yet.
    @discardableResult
    public func enqueue(
        type: ContentType,
        title: String?,
        body: String?,
        status: ObjectStatus,
        sourceUrl: String?,
        metadata: [String: AnyCodable],
        imageData: Data?
    ) -> PendingUpload {
        var imageFilename: String?
        if let imageData {
            let filename = UUID().uuidString + ".jpg"
            try? imageData.write(to: assetsDirectory.appendingPathComponent(filename))
            imageFilename = filename
        }
        let item = PendingUpload(
            type: type, title: title, body: body, status: status,
            sourceUrl: sourceUrl, metadata: metadata, imageFilename: imageFilename
        )
        var items = load()
        items.append(item)
        save(items)
        return item
    }

    public func imageData(for item: PendingUpload) -> Data? {
        guard let imageFilename = item.imageFilename else { return nil }
        return try? Data(contentsOf: assetsDirectory.appendingPathComponent(imageFilename))
    }

    public func remove(id: String) {
        var items = load()
        guard let item = items.first(where: { $0.id == id }) else { return }
        items.removeAll { $0.id == id }
        save(items)
        if let imageFilename = item.imageFilename {
            try? FileManager.default.removeItem(at: assetsDirectory.appendingPathComponent(imageFilename))
        }
    }
}
