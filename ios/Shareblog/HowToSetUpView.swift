import SwiftUI

struct HowToSetUpView: View {
    private let setupURL = URL(string: "https://shareblog.navigationstack.com")!

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Your blog needs a home")
                    .font(.title.bold())

                Text("Shareblog isn't a hosted service you sign up for — there's no shareblog.com account to make. Your posts live on a server that you (or someone you trust) control, under a domain name you own.")

                Text("That's a deliberate trade: it takes a bit of setup, but your site can never be shut down, paywalled, or changed out from under you. It's yours the way a website or an email address is yours, not the way a social media account is.")

                Text("Getting one running means installing the free Shareblog server software somewhere — a small cloud server works well — and pointing your domain at it. If you're comfortable with a terminal, it's usually a 15–20 minute job.")

                Text("Download links and full step-by-step instructions live at:")

                Link(destination: setupURL) {
                    HStack {
                        Text(setupURL.host ?? setupURL.absoluteString)
                        Image(systemName: "arrow.up.right")
                    }
                    .font(.headline)
                }

                Text("Once it's up and running, come back here and enter your domain to connect.")
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
        .navigationTitle("Setting up your blog")
        .navigationBarTitleDisplayMode(.inline)
    }
}
