import SwiftUI
import ShareblogKit

struct FeedView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var objects: [ContentObject] = []
    @State private var pendingUploads: [PendingUpload] = []
    @State private var pendingEdits: [PendingEdit] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isOffline = false
    @State private var showSettings = false
    @State private var createCoordinator: ShareCoordinator?

    var body: some View {
        NavigationStack {
            List {
                if !pendingUploads.isEmpty {
                    Section("Waiting to upload") {
                        ForEach(pendingUploads) { item in
                            PendingRow(item: item)
                        }
                    }
                }
                if !pendingEdits.isEmpty {
                    Section("Waiting to update") {
                        ForEach(pendingEdits) { item in
                            PendingEditRow(item: item, object: objects.first { $0.id == item.objectId })
                        }
                    }
                }
                ForEach(objects) { object in
                    NavigationLink(value: object.id) {
                        FeedRow(object: object)
                    }
                }
                if isOffline {
                    OfflineNotice()
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                } else if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationDestination(for: String.self) { id in
                if let object = objects.first(where: { $0.id == id }) {
                    EditObjectView(object: object) {
                        objects.removeAll { $0.id == id }
                    }
                }
            }
            .navigationTitle(auth.site?.title ?? "Feed")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        createCoordinator = ShareCoordinator(extensionItems: []) {
                            createCoordinator = nil
                        }
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("New post")
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .overlay {
                if isLoading && objects.isEmpty {
                    ProgressView()
                } else if !isLoading && objects.isEmpty && pendingUploads.isEmpty && pendingEdits.isEmpty {
                    ContentUnavailableView(
                        "No posts yet",
                        systemImage: "square.and.pencil",
                        description: Text("Share something from another app to get started.")
                    )
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
            .sheet(isPresented: Binding(
                get: { createCoordinator != nil },
                set: { isPresented in if !isPresented { createCoordinator = nil } }
            ), onDismiss: { Task { await load() } }) {
                if let createCoordinator {
                    CreatePostView(coordinator: createCoordinator)
                }
            }
        }
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        isOffline = false
        defer { isLoading = false }

        // Flush anything queued from an earlier offline save before
        // refreshing the list, so a just-reconnected post shows up as
        // published rather than lingering under "Waiting to upload".
        _ = await PendingUploadSyncer.syncAll()
        pendingUploads = PendingUploadStore.shared.load()
        pendingEdits = PendingUploadStore.shared.loadEdits()

        do {
            objects = try await APIClient.shared.listObjects()
        } catch let error as APIError {
            if case .network = error {
                isOffline = true
            } else {
                errorMessage = error.errorDescription
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// A one-line summary of a post's content for row previews. Falls back to
/// the type name only as an absolute last resort — most types keep their
/// content in metadata rather than title/body (a Photo's caption, a Music
/// post's artist and release), so falling back straight to title/body would
/// otherwise leave every Photo and Music row reading as just "Photo"/"Music".
private func previewText(type: ContentType, title: String?, body: String?, metadata: [String: AnyCodable]) -> String {
    if let title, !title.isEmpty { return title }
    if let body, !body.isEmpty { return body }
    switch type {
    case .photo:
        return metadata.stringValue("caption") ?? type.displayName
    case .music:
        let artist = metadata.stringValue("artist")
        let releaseTitle = metadata.stringValue("releaseTitle")
        switch (artist, releaseTitle) {
        case let (artist?, releaseTitle?): return "\(artist) — \(releaseTitle)"
        case let (artist?, nil): return artist
        case let (nil, releaseTitle?): return releaseTitle
        case (nil, nil): return type.displayName
        }
    default:
        return type.displayName
    }
}

private let relativeDateFormatter: RelativeDateTimeFormatter = {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .abbreviated
    return formatter
}()

private struct PendingRow: View {
    let item: PendingUpload

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: item.type.symbolName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(item.type.displayName)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                StatusBadge(text: "Queued", color: .orange)
            }
            Text(previewText(type: item.type, title: item.title, body: item.body, metadata: item.metadata))
                .lineLimit(2)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

private struct PendingEditRow: View {
    let item: PendingEdit
    /// The object being edited, if it's already loaded in the feed — used
    /// just to show its type icon and a title/body preview, since the queued
    /// edit itself only carries the fields that actually changed.
    let object: ContentObject?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                if let type = object?.type {
                    Image(systemName: type.symbolName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(type.displayName)
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                }
                StatusBadge(text: "Queued", color: .orange)
            }
            Text(
                previewText(
                    type: object?.type ?? .thought,
                    title: item.title ?? object?.title,
                    body: item.body ?? object?.body,
                    metadata: item.metadata ?? object?.metadata ?? [:]
                )
            )
            .lineLimit(2)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

private struct FeedRow: View {
    let object: ContentObject

    private var statusText: String { object.status == .draft ? "Draft" : "Published" }
    private var statusColor: Color { object.status == .draft ? .yellow : .green }

    /// "Saved 2h ago" for a draft (its most recent edit), "Published 3d ago"
    /// for a live post (when it first went out, not its last edit) — the
    /// distinction that actually matters to the person deciding what to do
    /// with it next.
    private var timestampText: String {
        let verb: String
        let date: Date
        if object.status == .draft {
            verb = "Saved"
            date = object.updatedAt
        } else {
            verb = "Published"
            date = object.publishedAt ?? object.createdAt
        }
        return "\(verb) \(relativeDateFormatter.localizedString(for: date, relativeTo: Date()))"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: object.type.symbolName)
                    .font(.caption)
                    .foregroundStyle(.tint)
                Text(object.type.displayName)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                StatusBadge(text: statusText, color: statusColor)
            }
            Text(previewText(type: object.type, title: object.title, body: object.body, metadata: object.metadata))
                .lineLimit(2)
            Text(timestampText)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

private struct StatusBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2.bold())
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.2), in: Capsule())
            .foregroundStyle(color)
    }
}
