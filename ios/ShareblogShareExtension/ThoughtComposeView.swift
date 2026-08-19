import SwiftUI
import ShareblogKit

struct ThoughtComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var bodyText = ""
    @State private var status: ObjectStatus = .published

    var body: some View {
        VStack {
            Form {
                if let errorMessage = coordinator.errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
                TextEditor(text: $bodyText)
                    .frame(minHeight: 160)
            }
            PublishBar(status: $status, isPublishing: coordinator.isPublishing, isEnabled: !bodyText.isEmpty) {
                Task { await coordinator.publishThought(body: bodyText, status: status) }
            }
        }
        .navigationTitle("Thought")
        .onAppear {
            if bodyText.isEmpty { bodyText = coordinator.sharedText ?? "" }
        }
    }
}
