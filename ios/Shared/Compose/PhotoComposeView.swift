import SwiftUI
import ShareblogKit

struct PhotoComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var caption = ""
    @State private var status: ObjectStatus = .published

    var body: some View {
        VStack {
            Form {
                if coordinator.offlineSaveAvailable {
                    OfflineNotice(actionTitle: "Finish this later") { coordinator.saveForLater() }
                } else if let errorMessage = coordinator.errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
                if let image = coordinator.sharedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 220)
                        .listRowInsets(EdgeInsets())
                } else {
                    ContentUnavailableView("No image", systemImage: "photo")
                }
                TextField("Caption (optional)", text: $caption)
            }
            PublishBar(
                status: $status, isPublishing: coordinator.isPublishing,
                isEnabled: coordinator.sharedImage != nil
            ) {
                guard let image = coordinator.sharedImage else { return }
                Task { await coordinator.publishPhoto(image: image, caption: caption, status: status) }
            }
        }
        .navigationTitle("Photo")
    }
}
