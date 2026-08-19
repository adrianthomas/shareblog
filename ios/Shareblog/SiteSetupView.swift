import SwiftUI
import ShareblogKit

struct SiteSetupView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @State private var subdomain = ""
    @State private var title = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Your site") {
                    TextField("Title", text: $title)
                    TextField("subdomain", text: $subdomain)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    if !subdomain.isEmpty, let domain = ServerConfig.domain {
                        Text("\(normalizedSubdomain).\(domain)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }

                Button {
                    Task { await createSite() }
                } label: {
                    if isCreating {
                        ProgressView()
                    } else {
                        Text("Create site")
                    }
                }
                .disabled(subdomain.isEmpty || title.isEmpty || isCreating)
            }
            .navigationTitle("Set up your site")
        }
    }

    private var normalizedSubdomain: String {
        subdomain.lowercased().filter { $0.isLetter || $0.isNumber || $0 == "-" }
    }

    private func createSite() async {
        isCreating = true
        errorMessage = nil
        defer { isCreating = false }
        do {
            let site = try await APIClient.shared.createSite(subdomain: normalizedSubdomain, title: title)
            auth.didCreateSite(site)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
