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

    var body: some View {
        VStack {
            Form {
                if let errorMessage = coordinator.errorMessage {
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
                    ContentUnavailableView("No link", systemImage: "doc.text")
                }
            }
            PublishBar(status: $status, isPublishing: coordinator.isPublishing, isEnabled: resolved != nil) {
                guard let resolved else { return }
                Task { await coordinator.publishArticle(resolved: resolved, title: title, note: note, status: status) }
            }
        }
        .navigationTitle("Article")
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
}
