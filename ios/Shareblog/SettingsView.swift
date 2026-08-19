import SwiftUI
import ShareblogKit

struct SettingsView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                if let user = auth.user {
                    Section("Account") {
                        Text(user.email)
                    }
                }
                if let site = auth.site {
                    Section("Site") {
                        Text(site.title)
                        if let domain = ServerConfig.domain {
                            Text("\(site.subdomain).\(domain)").foregroundStyle(.secondary)
                        }
                    }
                }
                Section("Server") {
                    Text(ServerConfig.domain ?? "—")
                    Button("Change server") {
                        auth.changeServer()
                        dismiss()
                    }
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        auth.signOut()
                        dismiss()
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
