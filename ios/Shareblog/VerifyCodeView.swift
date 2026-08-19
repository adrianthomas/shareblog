import SwiftUI
import UIKit
import ShareblogKit

struct VerifyCodeView: View {
    let email: String

    @EnvironmentObject private var auth: AuthCoordinator
    @State private var code = ""
    @State private var isVerifying = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 20) {
            Text("Check your email")
                .font(.title2.bold())
            Text("Enter the 6-digit code we sent to \(email).")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            TextField("123456", text: $code)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.title.monospacedDigit())

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red).font(.footnote)
            }

            Button {
                Task { await verify() }
            } label: {
                if isVerifying {
                    ProgressView()
                } else {
                    Text("Continue")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(code.count != 6 || isVerifying)
        }
        .padding()
    }

    private func verify() async {
        isVerifying = true
        errorMessage = nil
        defer { isVerifying = false }
        do {
            let response = try await APIClient.shared.verifyCode(
                email: email, code: code, deviceName: UIDevice.current.name
            )
            auth.didSignIn(response: response)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
