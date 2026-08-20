import SwiftUI
import ShareblogKit

struct MusicComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var resolved: MusicResolveResponse?
    @State private var artist = ""
    @State private var releaseTitle = ""
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
                } else if resolved != nil {
                    // Lookup is best-effort: when it can't identify the
                    // track (blocked, unsupported link, etc.) these come
                    // back as placeholders, so keep them editable rather
                    // than locking the user out of publishing.
                    Section {
                        TextField("Title", text: $releaseTitle)
                        TextField("Artist", text: $artist)
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
                Task {
                    await coordinator.publishMusic(
                        resolved: resolved, artist: artist, releaseTitle: releaseTitle, note: note, status: status
                    )
                }
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
                let result = try await APIClient.shared.resolveMusic(url: url.absoluteString)
                resolved = result
                artist = result.artist
                releaseTitle = result.releaseTitle
            } catch {
                resolveError = error.localizedDescription
            }
        }
    }
}
