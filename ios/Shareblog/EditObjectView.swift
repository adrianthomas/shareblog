import SwiftUI
import ShareblogKit

struct EditObjectView: View {
    let object: ContentObject
    /// Called after the object is successfully deleted (whether that's
    /// unpublishing a live post or deleting a draft), so the caller can drop
    /// it from whatever list it's showing.
    let onDeleted: () -> Void

    var body: some View {
        if object.type == .photo {
            PhotoObjectView(object: object, onDeleted: onDeleted)
        } else {
            GenericObjectView(object: object, onDeleted: onDeleted)
        }
    }
}

/// Destructive delete action shared by every object-editing screen. Labeled
/// "Unpublish" for a live post (deleting it takes the post down) versus
/// "Delete draft" for one that was never public — same underlying request,
/// different framing for what the user is actually giving up.
private struct DeleteObjectButton: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var isDeleting = false
    @State private var showConfirmation = false
    @State private var errorMessage: String?

    private var isPublished: Bool { object.status == .published }
    private var actionTitle: String { isPublished ? "Unpublish" : "Delete Draft" }

    var body: some View {
        Section {
            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }
            Button(role: .destructive) {
                showConfirmation = true
            } label: {
                if isDeleting {
                    ProgressView()
                } else {
                    Text(actionTitle)
                }
            }
            .disabled(isDeleting)
        }
        .confirmationDialog(
            isPublished ? "Unpublish this post?" : "Delete this draft?",
            isPresented: $showConfirmation,
            titleVisibility: .visible
        ) {
            Button(actionTitle, role: .destructive) {
                Task { await delete() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text(
                isPublished
                    ? "This removes the post and its content from your site. This can't be undone."
                    : "This can't be undone."
            )
        }
    }

    private func delete() async {
        isDeleting = true
        errorMessage = nil
        defer { isDeleting = false }
        do {
            try await APIClient.shared.deleteObject(id: object.id)
            onDeleted()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// Photo objects only store an `assetId` in metadata, not a URL, so the
/// image has to be resolved via a lookup before it can be displayed.
private struct PhotoObjectView: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var caption: String
    @State private var imageURL: URL?
    @State private var isLoadingImage = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _caption = State(initialValue: object.metadata.stringValue("caption") ?? "")
    }

    var body: some View {
        Form {
            Section("Photo") {
                Group {
                    if let imageURL {
                        AsyncImage(url: imageURL) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fit)
                            case .failure:
                                Label("Couldn't load image", systemImage: "exclamationmark.triangle")
                                    .foregroundStyle(.secondary)
                            default:
                                ProgressView()
                            }
                        }
                    } else if isLoadingImage {
                        ProgressView()
                    } else {
                        Label("Image not found", systemImage: "photo.badge.exclamationmark")
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 200)

                TextField("Caption", text: $caption)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            if object.status == .draft {
                Button {
                    Task { await publish() }
                } label: {
                    if isSaving { ProgressView() } else { Text("Publish") }
                }
            }

            DeleteObjectButton(object: object) {
                onDeleted()
                dismiss()
            }
        }
        .navigationTitle(object.status == .draft ? "Draft" : "Published")
        .task { await loadImage() }
    }

    private func loadImage() async {
        guard let assetId = object.metadata.stringValue("assetId") else {
            isLoadingImage = false
            return
        }
        defer { isLoadingImage = false }
        do {
            let asset = try await APIClient.shared.getAsset(id: assetId)
            imageURL = URL(string: asset.url)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func publish() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            var metadata = object.metadata
            metadata["caption"] = .string(caption)
            _ = try await APIClient.shared.updateObject(id: object.id, status: .published, metadata: metadata)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct GenericObjectView: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var title: String
    @State private var bodyText: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _title = State(initialValue: object.title ?? "")
        _bodyText = State(initialValue: object.body ?? "")
    }

    var body: some View {
        Form {
            Section(object.type.rawValue.capitalized) {
                if object.title != nil {
                    TextField("Title", text: $title)
                }
                TextEditor(text: $bodyText)
                    .frame(minHeight: 120)
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            if object.status == .draft {
                Button {
                    Task { await publish() }
                } label: {
                    if isSaving {
                        ProgressView()
                    } else {
                        Text("Publish")
                    }
                }
            }

            DeleteObjectButton(object: object) {
                onDeleted()
                dismiss()
            }
        }
        .navigationTitle(object.status == .draft ? "Draft" : "Published")
    }

    private func publish() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            _ = try await APIClient.shared.updateObject(
                id: object.id,
                title: title.isEmpty ? nil : title,
                body: bodyText.isEmpty ? nil : bodyText,
                status: .published
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
