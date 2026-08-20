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
    @State private var urlText = ""

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
                    // No link came in from a share — let the user paste one
                    // in directly so the type still works standalone.
                    Section {
                        TextField("Link (Apple Music, Spotify, YouTube Music)", text: $urlText)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onSubmit(loadURL)
                        Button("Load", action: loadURL)
                            .disabled(urlText.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
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

    private func loadURL() {
        let trimmed = urlText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        guard let url = URL(string: trimmed), url.scheme != nil else {
            resolveError = "That doesn't look like a valid link."
            return
        }
        coordinator.sharedURL = url
    }
}
