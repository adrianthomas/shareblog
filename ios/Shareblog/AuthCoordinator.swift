import Foundation
import ShareblogKit

@MainActor
final class AuthCoordinator: ObservableObject {
    @Published var user: User?
    @Published var site: Site?
    @Published var isLoading = true

    init() {
        Task { await refresh() }
    }

    var isSignedIn: Bool { user != nil }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        guard Keychain.loadToken() != nil else {
            user = nil
            site = nil
            return
        }

        do {
            let me = try await APIClient.shared.me()
            user = me.user
            site = me.site
        } catch {
            // Token invalid/revoked — drop it and fall back to onboarding.
            Keychain.deleteToken()
            user = nil
            site = nil
        }
    }

    func didSignIn(response: AuthVerifyResponse) {
        Keychain.saveToken(response.token)
        user = response.user
        site = response.site
    }

    func didCreateSite(_ site: Site) {
        self.site = site
    }

    /// Revokes every token for the account server-side — not just this
    /// device's — since the token is iCloud-Keychain-synced and tokens don't
    /// expire on their own; explicit sign-out is the only way this session
    /// ever ends. The UI leaves the signed-in state immediately, but the
    /// Keychain deletion is deliberately kept inside the same Task, after
    /// the network call: deleting it first would wipe the token the logout
    /// request needs to authenticate with, and revocation would silently
    /// never happen — the network call fails safe (try?) either way, so a
    /// person isn't stuck signed in on this device just because they're
    /// offline.
    func signOut() {
        user = nil
        site = nil
        Task {
            try? await APIClient.shared.logout()
            Keychain.deleteToken()
        }
    }
}
