import SwiftUI
import ShareblogKit

struct OnboardingView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var email = ""
    @State private var isRequesting = false
    @State private var errorMessage: String?
    @State private var codeRequested = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Shareblog")
                    .font(.largeTitle.bold())
                Text("Sign in with your email to publish to your site.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                TextField("you@example.com", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red).font(.footnote)
                }

                Button {
                    Task { await requestCode() }
                } label: {
                    if isRequesting {
                        ProgressView()
                    } else {
                        Text("Send code")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(email.isEmpty || isRequesting)

                Button("Not \(ServerConfig.domain ?? "the right server")? Change it.") {
                    auth.changeServer()
                }
                .font(.footnote)
            }
            .padding()
            .navigationDestination(isPresented: $codeRequested) {
                VerifyCodeView(email: email)
            }
        }
    }

    private func requestCode() async {
        isRequesting = true
        errorMessage = nil
        defer { isRequesting = false }
        do {
            try await APIClient.shared.requestCode(email: email, context: "mobile")
            codeRequested = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
