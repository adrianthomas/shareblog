import SwiftUI

/// The small glyph shown at the top of the "cold start" screens (connect to
/// server, sign in) — there's no app icon artwork yet, so this stands in as
/// the app's visual identity wherever a screen needs one.
struct BrandMark: View {
    var body: some View {
        RoundedRectangle(cornerRadius: 20, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [Color.accentColor, Color.accentColor.opacity(0.7)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: 72, height: 72)
            .overlay {
                Image(systemName: "network")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(.white)
            }
            .accessibilityHidden(true)
    }
}

#Preview {
    BrandMark()
}
