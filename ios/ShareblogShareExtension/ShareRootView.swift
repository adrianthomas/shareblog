import SwiftUI
import ShareblogKit

struct ShareRootView: View {
    @ObservedObject var coordinator: ShareCoordinator

    var body: some View {
        NavigationStack {
            Group {
                if coordinator.isSignedIn {
                    TypePickerView(coordinator: coordinator)
                } else {
                    SignedOutView(onDismiss: coordinator.cancel)
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: coordinator.cancel)
                }
            }
        }
    }
}

private struct SignedOutView: View {
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.crop.circle.badge.exclamationmark")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("Open Shareblog and sign in first.")
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}
