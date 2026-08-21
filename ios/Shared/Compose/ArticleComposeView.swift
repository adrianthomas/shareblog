import SwiftUI
import ShareblogKit

struct ArticleComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var resolved: ArticleResolveResponse?
    @State private var title = ""
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
                    ProgressView("Reading page…")
                } else if resolved != nil {
                    Section {
                        TextField("Title", text: $title)
                        if let excerpt = resolved?.excerpt {
                            Text(excerpt).font(.footnote).foregroundStyle(.secondary).lineLimit(3)
                        }
                        TextField("Your note (optional)", text: $note, axis: .vertical)
                    }
                } else if let resolveError {
                    Text(resolveError).foregroundStyle(.red)
                } else if coordinator.sharedURL == nil {
                    // No link came in from a share — let the user paste one
                    // in directly so the type still works standalone.
                    Section {
                        TextField("Link", text: $urlText)
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
                Task { await coordinator.publishArticle(resolved: resolved, title: title, note: note, status: status) }
            }
        }
        .navigationTitle("Link")
        // Keyed to sharedURL, not just run-once: the item provider loads the
        // shared link asynchronously, so it may still be nil the moment this
        // view first appears. Re-running when it changes avoids a race where
        // the view gives up before the URL has actually arrived.
        .task(id: coordinator.sharedURL) {
            guard resolved == nil, let url = coordinator.sharedURL else { return }
            isResolving = true
            defer { isResolving = false }
            do {
                let result = try await APIClient.shared.resolveArticle(url: url.absoluteString)
                resolved = result
                title = result.title ?? ""
            } catch {
                resolveError = error.localizedDescription
            }
        }
    }

    private func loadURL() {
        let trimmed = urlText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        let candidates = Self.candidateURLs(for: trimmed)
        guard !candidates.isEmpty else {
            resolveError = "That doesn't look like a valid link."
            return
        }
        resolveError = nil
        Task {
            isResolving = true
            defer { isResolving = false }
            var lastError: Error?
            for url in candidates {
                do {
                    let result = try await APIClient.shared.resolveArticle(url: url.absoluteString)
                    resolved = result
                    title = result.title ?? ""
                    return
                } catch {
                    lastError = error
                }
            }
            resolveError = lastError?.localizedDescription
        }
    }

    /// URLs pasted or typed in by hand often omit the scheme (e.g.
    /// "example.com/post") — assume https first, since that's what almost
    /// every site serves today, then fall back to http for the handful that
    /// don't. A URL that already has a scheme is tried as-is.
    private static func candidateURLs(for trimmed: String) -> [URL] {
        if let url = URL(string: trimmed), url.scheme != nil {
            return [url]
        }
        return ["https://\(trimmed)", "http://\(trimmed)"].compactMap(URL.init(string:))
    }
}
