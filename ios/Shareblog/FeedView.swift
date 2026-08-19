import SwiftUI
import ShareblogKit

struct FeedView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var objects: [ContentObject] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            List {
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
                ForEach(objects) { object in
                    NavigationLink(value: object.id) {
                        FeedRow(object: object)
                    }
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
                    Button("Settings") { showSettings = true }
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .overlay {
                if isLoading && objects.isEmpty {
                    ProgressView()
                } else if !isLoading && objects.isEmpty {
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
        defer { isLoading = false }
        do {
            objects = try await APIClient.shared.listObjects()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct FeedRow: View {
    let object: ContentObject

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(object.type.rawValue.capitalized)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                if object.status == .draft {
                    Text("Draft")
                        .font(.caption2.bold())
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(.yellow.opacity(0.3), in: Capsule())
                }
            }
            Text(object.title ?? object.body ?? object.type.rawValue)
                .lineLimit(2)
        }
        .padding(.vertical, 2)
    }
}
