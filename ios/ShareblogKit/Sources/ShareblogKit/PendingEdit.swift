import Foundation

/// A change to an already-existing post that couldn't reach the server and
/// was saved locally instead, so it can be resent once the server is
/// reachable again. Fields mirror `APIClient.updateObject`'s parameters,
/// since that's the call `PendingUploadSyncer` replays once it succeeds.
public struct PendingEdit: Codable, Identifiable, Sendable {
    public let id: String
    public let createdAt: Date
    public let objectId: String
    public let title: String?
    public let body: String?
    public let status: ObjectStatus?
    public let metadata: [String: AnyCodable]?

    public init(
        id: String = UUID().uuidString,
        createdAt: Date = Date(),
        objectId: String,
        title: String?,
        body: String?,
        status: ObjectStatus?,
        metadata: [String: AnyCodable]?
    ) {
        self.id = id
        self.createdAt = createdAt
        self.objectId = objectId
        self.title = title
        self.body = body
        self.status = status
        self.metadata = metadata
    }
}
