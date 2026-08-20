import SwiftUI

/// A calmer alternative to a red error banner for "can't reach the server"
/// situations specifically — those are usually just flaky wifi or airplane
/// mode, not the user's fault, so this reads as a shrug instead of an
/// alarm. Reserved for connectivity failures; a real error (bad input,
/// auth, a server rejecting the request) should keep normal red styling,
/// since those actually need attention now rather than a shrug-and-retry.
public struct OfflineNotice: View {
    public static let defaultMessage =
        "Can't reach the server right now — probably just shy. It'll try again once it's back."

    private let message: String
    private let actionTitle: String?
    private let action: (() -> Void)?

    public init(message: String = OfflineNotice.defaultMessage, actionTitle: String? = nil, action: (() -> Void)? = nil) {
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "wifi.slash")
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 6) {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let actionTitle, let action {
                    Button(actionTitle, action: action)
                        .font(.subheadline.bold())
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(.secondary.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
    }
}
