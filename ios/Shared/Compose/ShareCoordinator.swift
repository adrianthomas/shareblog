import Foundation
import UniformTypeIdentifiers
import UIKit
import ShareblogKit

@MainActor
final class ShareCoordinator: ObservableObject {
    @Published var sharedURL: URL?
    @Published var sharedText: String?
    @Published var sharedImage: UIImage?

    @Published var selectedType: ContentType = .thought
    @Published var isPublishing = false
    @Published var errorMessage: String?
    /// True right after a publish attempt failed specifically because the
    /// server couldn't be reached — as opposed to a validation or auth
    /// error, which needs the user's attention now rather than a "save for
    /// later" offer. Drives both the gentler error styling and whether
    /// `saveForLater()` has anything to save.
    @Published var offlineSaveAvailable = false
    private var pendingSnapshot: PendingSnapshot?

    private struct PendingSnapshot {
        let type: ContentType
        let title: String?
        let body: String?
        let status: ObjectStatus
        let sourceUrl: String?
        let metadata: [String: AnyCodable]
        let imageData: Data?
    }

    let isSignedIn: Bool
    let onFinished: () -> Void

    init(extensionItems: [NSExtensionItem], onFinished: @escaping () -> Void) {
        self.isSignedIn = Keychain.loadToken() != nil
        self.onFinished = onFinished
        loadAttachments(from: extensionItems)
    }

    private func loadAttachments(from items: [NSExtensionItem]) {
        for item in items {
            for provider in item.attachments ?? [] {
                // A local file (e.g. shared from the Files app) also conforms
                // to "public.url" since public.file-url is a subtype of it —
                // without this check first, a shared file's on-disk path
                // gets treated as a web link and sent straight to the
                // article resolver, which can't fetch a file:// URL. Handle
                // it as shared text instead when it's a readable text file.
                if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier) { [weak self] value, _ in
                        guard let fileURL = value as? URL,
                              let data = try? Data(contentsOf: fileURL),
                              let text = String(data: data, encoding: .utf8)
                        else { return }
                        Task { @MainActor in self?.applyText(text) }
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] value, _ in
                        guard let url = value as? URL else { return }
                        Task { @MainActor in self?.applyURL(url) }
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] value, _ in
                        let image: UIImage?
                        if let url = value as? URL, let data = try? Data(contentsOf: url) {
                            image = UIImage(data: data)
                        } else if let data = value as? Data {
                            image = UIImage(data: data)
                        } else {
                            image = value as? UIImage
                        }
                        guard let image else { return }
                        Task { @MainActor in self?.applyImage(image) }
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] value, _ in
                        guard let text = value as? String else { return }
                        Task { @MainActor in self?.applyText(text) }
                    }
                }
            }
        }
    }

    private func applyURL(_ url: URL) {
        sharedURL = url
        selectedType = Self.suggestedType(for: url)
    }

    private func applyImage(_ image: UIImage) {
        sharedImage = image
        if sharedURL == nil { selectedType = .photo }
    }

    private func applyText(_ text: String) {
        // A shared web page often arrives as both a URL item and a text item
        // (the page title); don't let the text item override a URL-based type.
        if sharedURL == nil {
            sharedText = text
            selectedType = .thought
        }
    }

    private static func suggestedType(for url: URL) -> ContentType {
        let host = url.host?.lowercased() ?? ""
        let musicHosts = ["music.apple.com", "open.spotify.com", "music.youtube.com", "bandcamp.com"]
        if musicHosts.contains(where: { host.contains($0) }) { return .music }
        let bookHosts = ["books.apple.com", "goodreads.com", "openlibrary.org"]
        if bookHosts.contains(where: { host.contains($0) }) { return .book }
        return .article
    }

    func cancel() {
        onFinished()
    }

    // MARK: - Publishing

    func publishThought(body: String, status: ObjectStatus) async {
        let snapshot = PendingSnapshot(
            type: .thought, title: nil, body: body, status: status, sourceUrl: nil, metadata: [:], imageData: nil
        )
        await publish(snapshot) {
            try await APIClient.shared.createObject(
                type: .thought, title: nil, body: body, status: status, sourceUrl: nil, metadata: [:]
            )
        }
    }

    func publishQuote(body: String, author: String, comment: String, status: ObjectStatus) async {
        var metadata: [String: AnyCodable] = ["author": .string(author)]
        if !comment.isEmpty { metadata["comment"] = .string(comment) }
        let snapshot = PendingSnapshot(
            type: .quote, title: nil, body: body, status: status, sourceUrl: nil, metadata: metadata, imageData: nil
        )
        await publish(snapshot) {
            try await APIClient.shared.createObject(
                type: .quote, title: nil, body: body, status: status, sourceUrl: nil, metadata: metadata
            )
        }
    }

    func publishPhoto(image: UIImage, caption: String, status: ObjectStatus) async {
        guard let data = image.jpegData(compressionQuality: 0.9) else {
            errorMessage = APIError.decoding(NSError(domain: "Shareblog", code: 0)).errorDescription
            return
        }
        var metadata: [String: AnyCodable] = [:]
        if !caption.isEmpty { metadata["caption"] = .string(caption) }
        let snapshot = PendingSnapshot(
            type: .photo, title: nil, body: nil, status: status, sourceUrl: nil, metadata: metadata, imageData: data
        )
        await publish(snapshot) {
            let asset = try await APIClient.shared.uploadAsset(data: data, filename: "photo.jpg", mimeType: "image/jpeg")
            var uploadedMetadata = metadata
            uploadedMetadata["assetId"] = .string(asset.id)
            return try await APIClient.shared.createObject(
                type: .photo, title: nil, body: nil, status: status, sourceUrl: nil, metadata: uploadedMetadata
            )
        }
    }

    func publishBook(candidate: BookCandidate, note: String, rating: Int?, status: ObjectStatus) async {
        var amazonLinks: [String: AnyCodable] = [:]
        for (region, url) in candidate.links.amazon { amazonLinks[region] = .string(url) }
        var links: [String: AnyCodable] = ["amazon": .object(amazonLinks)]
        if let bookshop = candidate.links.bookshop { links["bookshop"] = .string(bookshop) }
        if let kobo = candidate.links.kobo { links["kobo"] = .string(kobo) }
        if let appleBooks = candidate.links.appleBooks { links["appleBooks"] = .string(appleBooks) }
        var metadata: [String: AnyCodable] = [
            "author": .string(candidate.author),
            "source": .string(candidate.source),
            "links": .object(links),
        ]
        if let isbn13 = candidate.isbn13 { metadata["isbn13"] = .string(isbn13) }
        if let isbn10 = candidate.isbn10 { metadata["isbn10"] = .string(isbn10) }
        if let coverUrl = candidate.coverUrl { metadata["coverUrl"] = .string(coverUrl) }
        if let rating { metadata["rating"] = .number(Double(rating)) }
        let title = candidate.title
        let body = note.isEmpty ? nil : note
        let snapshot = PendingSnapshot(
            type: .book, title: title, body: body, status: status, sourceUrl: nil, metadata: metadata, imageData: nil
        )
        await publish(snapshot) {
            try await APIClient.shared.createObject(
                type: .book, title: title, body: body, status: status, sourceUrl: nil, metadata: metadata
            )
        }
    }

    func publishMusic(resolved: MusicResolveResponse, artist: String, releaseTitle: String, note: String, status: ObjectStatus) async {
        var links: [String: AnyCodable] = [:]
        for (platform, url) in resolved.links { links[platform] = .string(url) }
        var metadata: [String: AnyCodable] = [
            "artist": .string(artist),
            "releaseTitle": .string(releaseTitle),
            "links": .object(links),
        ]
        if let artworkUrl = resolved.artworkUrl { metadata["artworkUrl"] = .string(artworkUrl) }
        let body = note.isEmpty ? nil : note
        let sourceUrl = resolved.sourceUrl ?? sharedURL?.absoluteString
        let snapshot = PendingSnapshot(
            type: .music, title: nil, body: body, status: status, sourceUrl: sourceUrl, metadata: metadata, imageData: nil
        )
        await publish(snapshot) {
            try await APIClient.shared.createObject(
                type: .music, title: nil, body: body, status: status, sourceUrl: sourceUrl, metadata: metadata
            )
        }
    }

    func publishArticle(resolved: ArticleResolveResponse, title: String, note: String, status: ObjectStatus) async {
        var metadata: [String: AnyCodable] = [:]
        if let excerpt = resolved.excerpt { metadata["excerpt"] = .string(excerpt) }
        let body = [resolved.excerpt, note.isEmpty ? nil : note].compactMap { $0 }.joined(separator: "\n\n")
        let resolvedTitle = title.isEmpty ? resolved.title : title
        let resolvedBody = body.isEmpty ? nil : body
        let snapshot = PendingSnapshot(
            type: .article, title: resolvedTitle, body: resolvedBody, status: status,
            sourceUrl: resolved.canonicalUrl, metadata: metadata, imageData: nil
        )
        await publish(snapshot) {
            try await APIClient.shared.createObject(
                type: .article, title: resolvedTitle, body: resolvedBody,
                status: status, sourceUrl: resolved.canonicalUrl, metadata: metadata
            )
        }
    }

    /// Saves the last failed publish attempt to the local pending-upload
    /// queue and closes the share sheet as if it had succeeded — the main
    /// app will retry it once the server is reachable again. Only has
    /// something to save right after a `.network` failure (see
    /// `offlineSaveAvailable`).
    func saveForLater() {
        guard let pendingSnapshot else { return }
        PendingUploadStore.shared.enqueue(
            type: pendingSnapshot.type, title: pendingSnapshot.title, body: pendingSnapshot.body,
            status: pendingSnapshot.status, sourceUrl: pendingSnapshot.sourceUrl,
            metadata: pendingSnapshot.metadata, imageData: pendingSnapshot.imageData
        )
        onFinished()
    }

    private func publish(_ snapshot: PendingSnapshot, _ operation: @escaping () async throws -> ContentObject) async {
        isPublishing = true
        errorMessage = nil
        offlineSaveAvailable = false
        pendingSnapshot = nil
        defer { isPublishing = false }
        do {
            _ = try await operation()
            onFinished()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            if case .network = error {
                offlineSaveAvailable = true
                pendingSnapshot = snapshot
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
