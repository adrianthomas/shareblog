import Foundation

public enum APIError: Error, LocalizedError {
    case server(code: String, message: String)
    case network(Error)
    case decoding(Error)
    case unauthorized

    public var errorDescription: String? {
        switch self {
        case .server(_, let message): return message
        case .network(let err): return err.localizedDescription
        case .decoding: return "Unexpected response from server."
        case .unauthorized: return "You're not signed in."
        }
    }
}

private struct ServerErrorEnvelope: Decodable {
    struct Body: Decodable { let code: String; let message: String }
    let error: Body
}

public final class APIClient: @unchecked Sendable {
    public static let shared = APIClient()

    /// Mutable so ServerConfig can repoint it once the user enters their
    /// server's domain (see ServerSetupView) — every self-hosted server has
    /// a different address, unlike a single hosted product with one fixed
    /// API host. Falls back to a placeholder until configured; nothing calls
    /// the API before ServerConfig.isConfigured is true (RootView gates on
    /// it), so the placeholder is never actually dialed.
    public var baseURL: URL

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(baseURL: URL = ServerConfig.apiBaseURL ?? URL(string: "http://localhost:3000/api/v1")!) {
        self.baseURL = baseURL
        self.session = .shared

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = formatter.date(from: string) { return date }
            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: string) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date: \(string)")
        }
        self.decoder = decoder

        // The API uses camelCase field names throughout, matching Swift's
        // default Encodable behavior, so no key conversion is needed here.
        self.encoder = JSONEncoder()
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: (any Encodable)? = nil,
        authenticated: Bool = true,
        empty: Bool = false
    ) async throws -> T {
        var url = baseURL
        url.append(path: path)

        var request = URLRequest(url: url)
        request.httpMethod = method

        if authenticated {
            guard let token = Keychain.loadToken() else { throw APIError.unauthorized }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(AnyEncodableBox(body))
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.network(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.network(URLError(.badServerResponse))
        }

        guard (200..<300).contains(http.statusCode) else {
            if let envelope = try? decoder.decode(ServerErrorEnvelope.self, from: data) {
                throw APIError.server(code: envelope.error.code, message: envelope.error.message)
            }
            throw APIError.server(code: "http_\(http.statusCode)", message: "Request failed (\(http.statusCode)).")
        }

        if empty { return EmptyResponse() as! T }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    // MARK: - Auth

    public func requestCode(email: String, context: String) async throws {
        struct Body: Encodable { let email: String; let context: String }
        let _: EmptyResponse = try await request(
            "/auth/request-code", method: "POST",
            body: Body(email: email, context: context), authenticated: false, empty: true
        )
    }

    public func verifyCode(email: String, code: String, deviceName: String) async throws -> AuthVerifyResponse {
        struct Body: Encodable { let email: String; let code: String; let deviceName: String }
        return try await request(
            "/auth/verify-code", method: "POST",
            body: Body(email: email, code: code, deviceName: deviceName), authenticated: false
        )
    }

    public func me() async throws -> MeResponse {
        try await request("/me")
    }

    /// Revokes every active token for the account (see the server route),
    /// not just this one — sign-out is meant to end the session everywhere.
    public func logout() async throws {
        let _: EmptyResponse = try await request("/auth/logout", method: "POST", empty: true)
    }

    // MARK: - Sites

    public func createSite(subdomain: String, title: String) async throws -> Site {
        struct Body: Encodable { let subdomain: String; let title: String }
        struct Wrapper: Decodable { let site: Site }
        let wrapper: Wrapper = try await request("/sites", method: "POST", body: Body(subdomain: subdomain, title: title))
        return wrapper.site
    }

    /// Both parameters are optional so a caller can PATCH just the one
    /// field it's changing — the theme picker and the About editor are
    /// separate screens (see SettingsView/AboutEditorView) and each only
    /// wants to send its own field. `about: ""` clears an existing About
    /// page; `about: nil` (the default) leaves it untouched, since a nil
    /// Optional is omitted from the request body entirely rather than sent
    /// as an explicit null (see Body's synthesized Encodable conformance).
    public func updateSite(theme: SiteTheme? = nil, about: String? = nil) async throws -> Site {
        struct Body: Encodable { let theme: SiteTheme?; let about: String? }
        struct Wrapper: Decodable { let site: Site }
        let wrapper: Wrapper = try await request("/sites", method: "PATCH", body: Body(theme: theme, about: about))
        return wrapper.site
    }

    // MARK: - Resolvers

    public func resolveBook(query: String) async throws -> [BookCandidate] {
        struct Body: Encodable { let query: String }
        let response: BookResolveResponse = try await request("/resolve/book", method: "POST", body: Body(query: query))
        return response.candidates
    }

    public func resolveMusic(url: String) async throws -> MusicResolveResponse {
        struct Body: Encodable { let url: String }
        return try await request("/resolve/music", method: "POST", body: Body(url: url))
    }

    public func resolveArticle(url: String) async throws -> ArticleResolveResponse {
        struct Body: Encodable { let url: String }
        return try await request("/resolve/article", method: "POST", body: Body(url: url))
    }

    // MARK: - Assets

    public func uploadAsset(data: Data, filename: String, mimeType: String) async throws -> UploadedAsset {
        var url = baseURL
        url.append(path: "/assets")

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        guard let token = Keychain.loadToken() else { throw APIError.unauthorized }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append(
            "Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!
        )
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (responseData, response): (Data, URLResponse)
        do {
            (responseData, response) = try await session.data(for: request)
        } catch {
            throw APIError.network(error)
        }
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            if let envelope = try? decoder.decode(ServerErrorEnvelope.self, from: responseData) {
                throw APIError.server(code: envelope.error.code, message: envelope.error.message)
            }
            throw APIError.server(code: "upload_failed", message: "Upload failed.")
        }

        struct Wrapper: Decodable { let asset: UploadedAsset }
        return try decoder.decode(Wrapper.self, from: responseData).asset
    }

    /// Resolves a previously-uploaded asset's id back into a usable URL —
    /// needed because a Photo object's metadata only stores the assetId,
    /// not the URL, so viewing a published photo later requires this call.
    public func getAsset(id: String) async throws -> UploadedAsset {
        struct Wrapper: Decodable { let asset: UploadedAsset }
        let wrapper: Wrapper = try await request("/assets/\(id)")
        return wrapper.asset
    }

    // MARK: - Objects

    public func createObject(
        type: ContentType,
        title: String?,
        body: String?,
        status: ObjectStatus,
        sourceUrl: String?,
        metadata: [String: AnyCodable]
    ) async throws -> ContentObject {
        struct Body: Encodable {
            let type: ContentType
            let title: String?
            let body: String?
            let status: ObjectStatus
            let sourceUrl: String?
            let metadata: [String: AnyCodable]
        }
        struct Wrapper: Decodable { let object: ContentObject }
        let wrapper: Wrapper = try await request(
            "/objects", method: "POST",
            body: Body(type: type, title: title, body: body, status: status, sourceUrl: sourceUrl, metadata: metadata)
        )
        return wrapper.object
    }

    public func updateObject(
        id: String,
        title: String? = nil,
        body: String? = nil,
        status: ObjectStatus? = nil,
        metadata: [String: AnyCodable]? = nil
    ) async throws -> ContentObject {
        struct Body: Encodable {
            let title: String?
            let body: String?
            let status: ObjectStatus?
            let metadata: [String: AnyCodable]?
        }
        struct Wrapper: Decodable { let object: ContentObject }
        let wrapper: Wrapper = try await request(
            "/objects/\(id)", method: "PATCH",
            body: Body(title: title, body: body, status: status, metadata: metadata)
        )
        return wrapper.object
    }

    /// Deletes the object and, on the server, any uploaded image content it
    /// referenced (a Photo's image, an Article's cover) — not just the post
    /// row. Used both to unpublish a live post and to delete a draft.
    public func deleteObject(id: String) async throws {
        let _: EmptyResponse = try await request("/objects/\(id)", method: "DELETE", empty: true)
    }

    public func listObjects(type: ContentType? = nil, status: ObjectStatus? = nil) async throws -> [ContentObject] {
        var path = "/objects"
        var query: [String] = []
        if let type { query.append("type=\(type.rawValue)") }
        if let status { query.append("status=\(status.rawValue)") }
        if !query.isEmpty { path += "?" + query.joined(separator: "&") }

        let response: ObjectListResponse = try await request(path)
        return response.objects
    }
}

/// URLSession's async data(for:) needs a concrete Encodable body; this wraps
/// whatever Encodable is passed to request(body:) so the private request()
/// helper doesn't need a generic body parameter.
private struct AnyEncodableBox: Encodable {
    private let encodeFn: (Encoder) throws -> Void
    init(_ wrapped: any Encodable) {
        encodeFn = wrapped.encode
    }
    func encode(to encoder: Encoder) throws { try encodeFn(encoder) }
}

private struct EmptyResponse: Decodable {}
