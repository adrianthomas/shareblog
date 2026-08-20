import SwiftUI
import ShareblogKit

struct QuoteComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var bodyText = ""
    @State private var author = ""
    @State private var comment = ""
    @State private var status: ObjectStatus = .published

    var body: some View {
        VStack {
            Form {
                if coordinator.offlineSaveAvailable {
                    OfflineNotice(actionTitle: "Finish this later") { coordinator.saveForLater() }
                } else if let errorMessage = coordinator.errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
                Section("Quote") {
                    TextEditor(text: $bodyText)
                        .frame(minHeight: 120)
                    TextField("Author", text: $author)
                }
                Section("Comment (optional)") {
                    TextEditor(text: $comment)
                        .frame(minHeight: 80)
                }
            }
            PublishBar(
                status: $status,
                isPublishing: coordinator.isPublishing,
                isEnabled: !bodyText.isEmpty && !author.isEmpty
            ) {
                Task { await coordinator.publishQuote(body: bodyText, author: author, comment: comment, status: status) }
            }
        }
        .navigationTitle("Quote")
        .onAppear {
            if bodyText.isEmpty { bodyText = coordinator.sharedText ?? "" }
        }
    }
}
