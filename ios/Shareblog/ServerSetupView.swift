import SwiftUI
import ShareblogKit

struct ServerSetupView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var input = ServerConfig.lastInput ?? ""
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                BrandMark()
                Text("Connect to your server")
                    .font(.largeTitle.bold())
                Text("Enter the domain of your self-hosted Shareblog server.")
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

                NavigationLink("How do I set up my blog?") {
                    HowToSetUpView()
                }
                .font(.footnote)
            }
            .padding()
        }
    }

    private func connect() {
        guard let (domain, apiBaseURL) = ServerConfig.parse(input) else {
            errorMessage = "Enter a valid domain, like yourdomain.com."
            return
        }
        ServerConfig.save(rawInput: input, domain: domain, apiBaseURL: apiBaseURL)
        auth.didConfigureServer()
    }
}
