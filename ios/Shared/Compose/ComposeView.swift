import SwiftUI
import ShareblogKit

/// Dispatches to the per-type enrichment + publish screen. Enrichment and
/// publishing are combined into one screen per type rather than two separate
/// pushes — fewer taps, and the resolved preview is exactly what "publish"
/// acts on, so there's nothing a second screen would add for MVP.
struct ComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    let type: ContentType

    var body: some View {
        Group {
            switch type {
            case .thought:
                ThoughtComposeView(coordinator: coordinator)
            case .photo:
                PhotoComposeView(coordinator: coordinator)
            case .book:
                BookComposeView(coordinator: coordinator)
            case .music:
                MusicComposeView(coordinator: coordinator)
            case .article:
                ArticleComposeView(coordinator: coordinator)
            case .quote:
                QuoteComposeView(coordinator: coordinator)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct PublishBar: View {
    @Binding var status: ObjectStatus
    let isPublishing: Bool
    let isEnabled: Bool
    let action: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Picker("Status", selection: $status) {
                Text("Draft").tag(ObjectStatus.draft)
                Text("Publish now").tag(ObjectStatus.published)
            }
            .pickerStyle(.segmented)

            Button(action: action) {
                if isPublishing {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    Text(status == .published ? "Publish" : "Save draft")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(!isEnabled || isPublishing)
        }
        .padding()
    }
}
