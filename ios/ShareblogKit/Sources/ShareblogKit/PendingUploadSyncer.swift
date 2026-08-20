import Foundation

/// Retries everything in the pending-upload queue against the server.
/// There's no push-based connectivity signal wired up between the share
/// extension and the main app, so this is meant to be called
/// opportunistically instead — e.g. whenever the feed loads or refreshes.
public enum PendingUploadSyncer {
    /// Attempts each queued post in order, removing it from the queue on
    /// success. Stops at the first failure that still looks like "the
    /// server just isn't reachable," leaving the rest queued to retry as a
    /// batch next time. A failure that isn't a connectivity problem (e.g.
    /// the server now rejects the payload) is dropped instead, since
    /// retrying it unchanged would just fail the same way forever.
    @discardableResult
    public static func syncAll() async -> Int {
        var succeeded = 0
        for item in PendingUploadStore.shared.load() {
            do {
                try await send(item)
                PendingUploadStore.shared.remove(id: item.id)
                succeeded += 1
            } catch APIError.network {
                break
            } catch {
                PendingUploadStore.shared.remove(id: item.id)
            }
        }
        return succeeded
    }

    private static func send(_ item: PendingUpload) async throws {
        var metadata = item.metadata
        if let imageData = PendingUploadStore.shared.imageData(for: item) {
            let asset = try await APIClient.shared.uploadAsset(data: imageData, filename: "photo.jpg", mimeType: "image/jpeg")
            metadata["assetId"] = .string(asset.id)
        }
        _ = try await APIClient.shared.createObject(
            type: item.type, title: item.title, body: item.body, status: item.status,
            sourceUrl: item.sourceUrl, metadata: metadata
        )
    }
}
