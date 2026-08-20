import SwiftUI
import ShareblogKit

struct SettingsView: View {
    @EnvironmentObject private var auth: AuthCoordinator
    @Environment(\.dismiss) private var dismiss
    @State private var isSavingTheme = false
    @State private var themeErrorMessage: String?
    /// Shown immediately on selection, before the save round-trip resolves —
    /// without it the picker would flicker back to the old value for a beat
    /// on every change, since `auth.site` doesn't update until the request
    /// completes.
    @State private var pendingTheme: SiteTheme?

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
                    Section {
                        Picker("Theme", selection: themeBinding(for: site)) {
                            ForEach(SiteTheme.allCases, id: \.self) { theme in
                                Text(theme.displayName).tag(theme)
                            }
                        }
                        .disabled(isSavingTheme)
                        if let themeErrorMessage {
                            Text(themeErrorMessage).foregroundStyle(.red).font(.footnote)
                        }
                    } header: {
                        Text("Appearance")
                    } footer: {
                        Text("Changes how your site looks to visitors. \(SiteTheme.cards.displayName) shows posts as full-bleed cards that expand into the post when tapped.")
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
                    NavigationLink {
                        HelpView()
                    } label: {
                        Label("Help", systemImage: "questionmark.circle")
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

    private func themeBinding(for site: Site) -> Binding<SiteTheme> {
        Binding(
            get: { pendingTheme ?? auth.site?.theme ?? site.theme },
            set: { newValue in
                pendingTheme = newValue
                Task { await setTheme(newValue) }
            }
        )
    }

    private func setTheme(_ theme: SiteTheme) async {
        defer { pendingTheme = nil }
        guard theme != auth.site?.theme else { return }
        isSavingTheme = true
        themeErrorMessage = nil
        defer { isSavingTheme = false }
        do {
            let updated = try await APIClient.shared.updateSite(theme: theme)
            auth.didUpdateSite(updated)
        } catch {
            themeErrorMessage = error.localizedDescription
        }
    }
}
