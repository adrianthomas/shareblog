import SwiftUI
import ShareblogKit

/// The main app's "+" entry point for creating a post from scratch, as
/// opposed to sharing one in from another app. Reuses the same type picker
/// and per-type compose screens as the share extension — they already
/// support filling everything in by hand when there's no shared content to
/// prefill from.
struct CreatePostView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            TypePickerView(coordinator: coordinator)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel", action: dismiss.callAsFunction)
                    }
                }
        }
    }
}
