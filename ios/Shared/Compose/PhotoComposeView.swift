import SwiftUI
import PhotosUI
import ShareblogKit

struct PhotoComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var caption = ""
    @State private var status: ObjectStatus = .published
    @State private var pickerItem: PhotosPickerItem?

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
                    // No image came in from a share — let the user pick one
                    // from their library so the type still works standalone.
                    PhotosPicker("Choose Photo", selection: $pickerItem, matching: .images)
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
        .onChange(of: pickerItem) { _, item in
            Task {
                guard let data = try? await item?.loadTransferable(type: Data.self),
                      let image = UIImage(data: data)
                else { return }
                coordinator.sharedImage = image
                coordinator.sharedImageData = data
            }
        }
    }
}
