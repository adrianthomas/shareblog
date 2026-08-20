import SwiftUI

struct HelpView: View {
    private let setupURL = URL(string: "https://shareblog.navigationstack.com")!

    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    BrandMark()
                    Text("Shareblog")
                        .font(.title2.bold())
                    Text("Publish to your own site, straight from the share sheet.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .listRowBackground(Color.clear)
            }

            Section("How it works") {
                Label(
                    "Share from any app — a link, a photo, a thought — and pick what kind of post it becomes.",
                    systemImage: "square.and.arrow.up"
                )
                Label(
                    "Drafts wait for you to review; anything set to \"Publish now\" goes live right away.",
                    systemImage: "checkmark.circle"
                )
                Label(
                    "Everything is stored on your own server, under your own domain — there's no shareblog.com account.",
                    systemImage: "server.rack"
                )
            }

            Section {
                Link(destination: setupURL) {
                    Label("Setting up a new server", systemImage: "arrow.up.right.square")
                }
            } footer: {
                Text("Install instructions and downloads for the free, self-hosted server software.")
            }

            Section("About") {
                LabeledContent("Version", value: appVersion)
                Text("Shareblog is open source, made by Adrian Thomas, in the EU.")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Help")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var appVersion: String {
        let short = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        return build.isEmpty ? short : "\(short) (\(build))"
    }
}

#Preview {
    NavigationStack { HelpView() }
}
