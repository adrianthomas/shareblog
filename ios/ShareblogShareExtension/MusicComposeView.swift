import SwiftUI
import ShareblogKit

struct MusicComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var resolved: MusicResolveResponse?
    @State private var note = ""
    @State private var status: ObjectStatus = .published
    @State private var isResolving = false
    @State private var resolveError: String?

    var body: some View {
        VStack {
            Form {
                if coordinator.offlineSaveAvailable {
                    OfflineNotice(actionTitle: "Finish this later") { coordinator.saveForLater() }
                } else if let errorMessage = coordinator.errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }

                if isResolving {
                    ProgressView("Looking up…")
                } else if let resolved {
                    Section {
                        Text(resolved.releaseTitle).bold()
                        Text(resolved.artist).foregroundStyle(.secondary)
                        TextField("Your take (optional)", text: $note, axis: .vertical)
                    }
                } else if let resolveError {
                    Text(resolveError).foregroundStyle(.red)
                } else if coordinator.sharedURL == nil {
                    ContentUnavailableView("No music link", systemImage: "music.note")
                }
            }
            PublishBar(status: $status, isPublishing: coordinator.isPublishing, isEnabled: resolved != nil) {
                guard let resolved else { return }
                Task { await coordinator.publishMusic(resolved: resolved, note: note, status: status) }
            }
        }
        .navigationTitle("Music")
        // See ArticleComposeView's .task(id:) comment — sharedURL arrives
        // asynchronously, so this must re-run when it changes, not just once.
        .task(id: coordinator.sharedURL) {
            guard resolved == nil, let url = coordinator.sharedURL else { return }
            isResolving = true
            defer { isResolving = false }
            do {
                resolved = try await APIClient.shared.resolveMusic(url: url.absoluteString)
            } catch {
                resolveError = error.localizedDescription
            }
        }
    }
}
