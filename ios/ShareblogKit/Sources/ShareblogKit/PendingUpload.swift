import Foundation

/// A post that couldn't reach the server (e.g. no connectivity) and was
/// saved locally instead, so it can be resent once the server is reachable
/// again. Its fields mirror `APIClient.createObject`'s parameters exactly,
/// since that's the call `PendingUploadSyncer` replays once it succeeds.
public struct PendingUpload: Codable, Identifiable, Sendable {
    public let id: String
    public let createdAt: Date
    public let type: ContentType
    public let title: String?
    public let body: String?
    public let status: ObjectStatus
    public let sourceUrl: String?
    public let metadata: [String: AnyCodable]
    /// Filename of a locally-cached image within
    /// `PendingUploadStore`'s assets directory, for photo posts whose asset
    /// also couldn't be uploaded yet. Nil for every other type.
    public let imageFilename: String?

    public init(
        id: String = UUID().uuidString,
        createdAt: Date = Date(),
        type: ContentType,
        title: String?,
        body: String?,
        status: ObjectStatus,
        sourceUrl: String?,
        metadata: [String: AnyCodable],
        imageFilename: String? = nil
    ) {
        self.id = id
        self.createdAt = createdAt
        self.type = type
        self.title = title
        self.body = body
        self.status = status
        self.sourceUrl = sourceUrl
        self.metadata = metadata
        self.imageFilename = imageFilename
    }
}
