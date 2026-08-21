import SwiftUI
import ShareblogKit

struct EditObjectView: View {
    let object: ContentObject
    /// Called after the object is successfully deleted (whether that's
    /// unpublishing a live post or deleting a draft), so the caller can drop
    /// it from whatever list it's showing.
    let onDeleted: () -> Void

    var body: some View {
        switch object.type {
        case .photo:
            PhotoObjectView(object: object, onDeleted: onDeleted)
        case .quote:
            QuoteObjectView(object: object, onDeleted: onDeleted)
        case .music:
            MusicObjectView(object: object, onDeleted: onDeleted)
        case .book:
            BookObjectView(object: object, onDeleted: onDeleted)
        default:
            GenericObjectView(object: object, onDeleted: onDeleted)
        }
    }
}

/// The draft/published-aware save action shared by every object-editing
/// screen: a draft always offers "Publish" (nothing to gate on, since
/// publishing as-shared is a valid choice); a published post only offers
/// "Update", and only once something has actually changed, so there's no
/// dead tap that round-trips the same content back to the server.
private struct SaveButton: View {
    let status: ObjectStatus
    let isSaving: Bool
    let hasChanges: Bool
    let action: () -> Void

    private var isEnabled: Bool { status == .draft || hasChanges }

    var body: some View {
        Button(action: action) {
            if isSaving {
                ProgressView()
            } else {
                Text(status == .draft ? "Publish" : "Update")
            }
        }
        .disabled(!isEnabled || isSaving)
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
    @State private var offlineSaveAvailable = false
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _caption = State(initialValue: object.metadata.stringValue("caption") ?? "")
    }

    private var hasChanges: Bool {
        caption != (object.metadata.stringValue("caption") ?? "")
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

            if offlineSaveAvailable {
                OfflineNotice(actionTitle: "Finish this later") { saveForLater() }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            SaveButton(status: object.status, isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
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

    private var updatedStatus: ObjectStatus? { object.status == .draft ? .published : nil }
    private var updatedMetadata: [String: AnyCodable] {
        var metadata = object.metadata
        metadata["caption"] = .string(caption)
        return metadata
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        offlineSaveAvailable = false
        defer { isSaving = false }
        do {
            _ = try await APIClient.shared.updateObject(
                id: object.id, status: updatedStatus, metadata: updatedMetadata
            )
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            if case .network = error { offlineSaveAvailable = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveForLater() {
        PendingUploadStore.shared.enqueueEdit(
            objectId: object.id, title: nil, body: nil, status: updatedStatus, metadata: updatedMetadata
        )
        dismiss()
    }
}

/// A Music object's artist/release title live in metadata (not title/body,
/// which the generic form edits, and which is why that form rendered a
/// blank box for these) — needs the same kind of dedicated screen Quote
/// gets. `links`/`artworkUrl` in metadata aren't shown here, so edits start
/// from the original metadata dict and patch just the fields below, rather
/// than reconstructing it and losing them.
private struct MusicObjectView: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var artist: String
    @State private var releaseTitle: String
    @State private var note: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var offlineSaveAvailable = false
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _artist = State(initialValue: object.metadata.stringValue("artist") ?? "")
        _releaseTitle = State(initialValue: object.metadata.stringValue("releaseTitle") ?? "")
        _note = State(initialValue: object.body ?? "")
    }

    private var hasChanges: Bool {
        artist != (object.metadata.stringValue("artist") ?? "")
            || releaseTitle != (object.metadata.stringValue("releaseTitle") ?? "")
            || note != (object.body ?? "")
    }

    var body: some View {
        Form {
            Section("Music") {
                TextField("Title", text: $releaseTitle)
                TextField("Artist", text: $artist)
                if let sourceUrl = object.sourceUrl, let url = URL(string: sourceUrl) {
                    Link(sourceUrl, destination: url)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }
            Section("Your take (optional)") {
                TextEditor(text: $note)
                    .frame(minHeight: 80)
            }

            if offlineSaveAvailable {
                OfflineNotice(actionTitle: "Finish this later") { saveForLater() }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            SaveButton(status: object.status, isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
            }

            DeleteObjectButton(object: object) {
                onDeleted()
                dismiss()
            }
        }
        .navigationTitle(object.status == .draft ? "Draft" : "Published")
    }

    private var updatedBody: String? { note.isEmpty ? nil : note }
    private var updatedStatus: ObjectStatus? { object.status == .draft ? .published : nil }
    private var updatedMetadata: [String: AnyCodable] {
        var metadata = object.metadata
        metadata["artist"] = .string(artist)
        metadata["releaseTitle"] = .string(releaseTitle)
        return metadata
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        offlineSaveAvailable = false
        defer { isSaving = false }
        do {
            _ = try await APIClient.shared.updateObject(
                id: object.id, body: updatedBody, status: updatedStatus, metadata: updatedMetadata
            )
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            if case .network = error { offlineSaveAvailable = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveForLater() {
        PendingUploadStore.shared.enqueueEdit(
            objectId: object.id, title: nil, body: updatedBody, status: updatedStatus, metadata: updatedMetadata
        )
        dismiss()
    }
}

/// A Book object's author and rating live only in metadata — the generic
/// form's Title field would show (title is a top-level field, not
/// metadata), but author and rating never would, and a book without a note
/// would look just as blank as Music did. `isbn13`/`isbn10`/`coverUrl`/
/// `links`/`source` in metadata aren't shown here, so edits start from the
/// original metadata dict and patch just author/rating, leaving those alone.
private struct BookObjectView: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var title: String
    @State private var author: String
    @State private var rating: Int
    @State private var note: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var offlineSaveAvailable = false
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _title = State(initialValue: object.title ?? "")
        _author = State(initialValue: object.metadata.stringValue("author") ?? "")
        _rating = State(initialValue: Int(object.metadata.numberValue("rating") ?? 0))
        _note = State(initialValue: object.body ?? "")
    }

    private var hasChanges: Bool {
        title != (object.title ?? "")
            || author != (object.metadata.stringValue("author") ?? "")
            || rating != Int(object.metadata.numberValue("rating") ?? 0)
            || note != (object.body ?? "")
    }

    var body: some View {
        Form {
            Section("Book") {
                TextField("Title", text: $title)
                TextField("Author", text: $author)
                Picker("Rating", selection: $rating) {
                    Text("No rating").tag(0)
                    ForEach(1...5, id: \.self) { n in
                        Text(String(repeating: "★", count: n)).tag(n)
                    }
                }
            }
            Section("Your take (optional)") {
                TextEditor(text: $note)
                    .frame(minHeight: 80)
            }

            if offlineSaveAvailable {
                OfflineNotice(actionTitle: "Finish this later") { saveForLater() }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            SaveButton(status: object.status, isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
            }

            DeleteObjectButton(object: object) {
                onDeleted()
                dismiss()
            }
        }
        .navigationTitle(object.status == .draft ? "Draft" : "Published")
    }

    private var updatedTitle: String? { title.isEmpty ? nil : title }
    private var updatedBody: String? { note.isEmpty ? nil : note }
    private var updatedStatus: ObjectStatus? { object.status == .draft ? .published : nil }
    private var updatedMetadata: [String: AnyCodable] {
        var metadata = object.metadata
        metadata["author"] = .string(author)
        if rating == 0 {
            metadata.removeValue(forKey: "rating")
        } else {
            metadata["rating"] = .number(Double(rating))
        }
        return metadata
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        offlineSaveAvailable = false
        defer { isSaving = false }
        do {
            _ = try await APIClient.shared.updateObject(
                id: object.id, title: updatedTitle, body: updatedBody, status: updatedStatus, metadata: updatedMetadata
            )
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            if case .network = error { offlineSaveAvailable = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveForLater() {
        PendingUploadStore.shared.enqueueEdit(
            objectId: object.id, title: updatedTitle, body: updatedBody, status: updatedStatus, metadata: updatedMetadata
        )
        dismiss()
    }
}

private struct GenericObjectView: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var title: String
    @State private var bodyText: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var offlineSaveAvailable = false
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _title = State(initialValue: object.title ?? "")
        _bodyText = State(initialValue: object.body ?? "")
    }

    private var hasChanges: Bool {
        title != (object.title ?? "") || bodyText != (object.body ?? "")
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

            if offlineSaveAvailable {
                OfflineNotice(actionTitle: "Finish this later") { saveForLater() }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            SaveButton(status: object.status, isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
            }

            DeleteObjectButton(object: object) {
                onDeleted()
                dismiss()
            }
        }
        .navigationTitle(object.status == .draft ? "Draft" : "Published")
    }

    private var updatedTitle: String? { title.isEmpty ? nil : title }
    private var updatedBody: String? { bodyText.isEmpty ? nil : bodyText }
    private var updatedStatus: ObjectStatus? { object.status == .draft ? .published : nil }

    private func save() async {
        isSaving = true
        errorMessage = nil
        offlineSaveAvailable = false
        defer { isSaving = false }
        do {
            _ = try await APIClient.shared.updateObject(
                id: object.id, title: updatedTitle, body: updatedBody, status: updatedStatus
            )
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            if case .network = error { offlineSaveAvailable = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveForLater() {
        PendingUploadStore.shared.enqueueEdit(
            objectId: object.id, title: updatedTitle, body: updatedBody, status: updatedStatus, metadata: nil
        )
        dismiss()
    }
}

/// A Quote's editable content spans two fields the generic title/body form
/// doesn't cover — author and comment both live in metadata, not body — so
/// it needs the same kind of dedicated screen Photo gets.
private struct QuoteObjectView: View {
    let object: ContentObject
    let onDeleted: () -> Void

    @State private var bodyText: String
    @State private var author: String
    @State private var comment: String
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var offlineSaveAvailable = false
    @Environment(\.dismiss) private var dismiss

    init(object: ContentObject, onDeleted: @escaping () -> Void) {
        self.object = object
        self.onDeleted = onDeleted
        _bodyText = State(initialValue: object.body ?? "")
        _author = State(initialValue: object.metadata.stringValue("author") ?? "")
        _comment = State(initialValue: object.metadata.stringValue("comment") ?? "")
    }

    private var hasChanges: Bool {
        bodyText != (object.body ?? "")
            || author != (object.metadata.stringValue("author") ?? "")
            || comment != (object.metadata.stringValue("comment") ?? "")
    }

    var body: some View {
        Form {
            Section("Quote") {
                TextEditor(text: $bodyText)
                    .frame(minHeight: 120)
                TextField("Author", text: $author)
            }
            Section("Comment (optional)") {
                TextEditor(text: $comment)
                    .frame(minHeight: 80)
            }

            if offlineSaveAvailable {
                OfflineNotice(actionTitle: "Finish this later") { saveForLater() }
            } else if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            SaveButton(status: object.status, isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
            }

            DeleteObjectButton(object: object) {
                onDeleted()
                dismiss()
            }
        }
        .navigationTitle(object.status == .draft ? "Draft" : "Published")
    }

    private var updatedBody: String? { bodyText.isEmpty ? nil : bodyText }
    private var updatedStatus: ObjectStatus? { object.status == .draft ? .published : nil }
    private var updatedMetadata: [String: AnyCodable] {
        var metadata: [String: AnyCodable] = ["author": .string(author)]
        if !comment.isEmpty { metadata["comment"] = .string(comment) }
        return metadata
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        offlineSaveAvailable = false
        defer { isSaving = false }
        do {
            _ = try await APIClient.shared.updateObject(
                id: object.id, body: updatedBody, status: updatedStatus, metadata: updatedMetadata
            )
            dismiss()
        } catch let error as APIError {
            errorMessage = error.errorDescription
            if case .network = error { offlineSaveAvailable = true }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func saveForLater() {
        PendingUploadStore.shared.enqueueEdit(
            objectId: object.id, title: nil, body: updatedBody, status: updatedStatus, metadata: updatedMetadata
        )
        dismiss()
    }
}
