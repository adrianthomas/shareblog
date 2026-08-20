import SwiftUI
import ShareblogKit

struct FeedView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var objects: [ContentObject] = []
    @State private var pendingUploads: [PendingUpload] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isOffline = false
    @State private var showSettings = false

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
                    EditObjectView(object: object)
                }
            }
            .navigationTitle(auth.site?.title ?? "Feed")
            .toolbar {
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
                } else if !isLoading && objects.isEmpty && pendingUploads.isEmpty {
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
            Text(item.title ?? item.body ?? item.type.displayName)
                .lineLimit(2)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

private struct FeedRow: View {
    let object: ContentObject

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: object.type.symbolName)
                    .font(.caption)
                    .foregroundStyle(.tint)
                Text(object.type.displayName)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                if object.status == .draft {
                    StatusBadge(text: "Draft", color: .yellow)
                }
            }
            Text(object.title ?? object.body ?? object.type.displayName)
                .lineLimit(2)
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
