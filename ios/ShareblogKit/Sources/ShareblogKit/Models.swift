import Foundation

public enum ContentType: String, Codable, CaseIterable, Sendable {
    case thought, photo, book, article, music
}

public enum ObjectStatus: String, Codable, Sendable {
    case draft, published
}

public struct User: Codable, Sendable {
    public let id: String
    public let email: String
}

/// Mirrors the server's `themeValues` enum (`server/src/db/schema.ts`) —
/// keep the two in sync if a theme is added.
public enum SiteTheme: String, Codable, CaseIterable, Sendable {
    case classic, cards

    public var displayName: String {
        switch self {
        case .classic: return "Classic"
        case .cards: return "Cards"
        }
    }
}

public struct Site: Codable, Sendable {
    public let id: String
    public let subdomain: String
    public let title: String
    public let tagline: String?
    public let theme: SiteTheme
}

public struct AuthVerifyResponse: Codable, Sendable {
    public let token: String
    public let user: User
    public let site: Site?
}

public struct MeResponse: Codable, Sendable {
    public let user: User
    public let site: Site?
}

public struct ContentObject: Codable, Identifiable, Sendable {
    public let id: String
    public let siteId: String
    public let type: ContentType
    public let slug: String
    public let title: String?
    public let body: String?
    public let status: ObjectStatus
    public let sourceUrl: String?
    public let metadata: [String: AnyCodable]
    public let publishedAt: Date?
    public let createdAt: Date
    public let updatedAt: Date
}

public struct ObjectListResponse: Codable, Sendable {
    public let objects: [ContentObject]
    public let nextCursor: String?
}

public struct UploadedAsset: Codable, Sendable {
    public let id: String
    public let url: String
    public let thumbUrl: String
    public let width: Int?
    public let height: Int?
}

public struct BookCandidate: Codable, Sendable, Identifiable {
    public var id: String { isbn13 ?? isbn10 ?? title }
    public let title: String
    public let author: String
    public let isbn13: String?
    public let isbn10: String?
    public let coverUrl: String?
    public let source: String
}

public struct BookResolveResponse: Codable, Sendable {
    public let candidates: [BookCandidate]
}

public struct MusicResolveResponse: Codable, Sendable {
    public let artist: String
    public let releaseTitle: String
    public let artworkUrl: String?
    public let sourceUrl: String?
    public let links: [String: String]
}

public struct ArticleResolveResponse: Codable, Sendable {
    public let title: String?
    public let excerpt: String?
    public let imageUrl: String?
    public let siteName: String?
    public let canonicalUrl: String
}

extension Dictionary where Key == String, Value == AnyCodable {
    /// Reads a string field out of a decoded `metadata` payload, e.g. a
    /// Photo object's `assetId` or `caption`.
    public func stringValue(_ key: String) -> String? {
        if case let .string(value)? = self[key] { return value }
        return nil
    }
}

/// Type-erased JSON value for the freeform `metadata` field, since its shape
/// varies by ContentType and this app only needs to round-trip it as JSON,
/// not model every type-specific field strongly on this side.
public indirect enum AnyCodable: Codable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: AnyCodable])
    case array([AnyCodable])
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let v = try? container.decode(Bool.self) {
            self = .bool(v)
        } else if let v = try? container.decode(Double.self) {
            self = .number(v)
        } else if let v = try? container.decode(String.self) {
            self = .string(v)
        } else if let v = try? container.decode([String: AnyCodable].self) {
            self = .object(v)
        } else if let v = try? container.decode([AnyCodable].self) {
            self = .array(v)
        } else {
            self = .null
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .number(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        case .object(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .null: try container.encodeNil()
        }
    }
}
