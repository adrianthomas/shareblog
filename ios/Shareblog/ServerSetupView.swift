import SwiftUI
import ShareblogKit

struct ServerSetupView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var input = ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Connect to your server")
                    .font(.largeTitle.bold())
                Text("Enter the domain of your self-hosted Shareblog server. See server/README.md if you haven't set one up yet.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                TextField("yourdomain.com", text: $input)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.URL)
                    .textContentType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.footnote)
                }

                Button("Continue") {
                    connect()
                }
                .buttonStyle(.borderedProminent)
                .disabled(input.isEmpty)
            }
            .padding()
        }
    }

    private func connect() {
        guard let (domain, apiBaseURL) = ServerConfig.parse(input) else {
            errorMessage = "Enter a valid domain, like yourdomain.com."
            return
        }
        ServerConfig.save(domain: domain, apiBaseURL: apiBaseURL)
        auth.didConfigureServer()
    }
}
