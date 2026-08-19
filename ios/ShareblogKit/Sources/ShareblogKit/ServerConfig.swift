import Foundation

/// The self-hosted server this device talks to. Stored in the shared App
/// Group so both the main app and the Share Extension see the same value —
/// only the main app presents server setup UI; the extension just reads
/// whatever's already there (or shows "sign in first" if nothing is).
public enum ServerConfig {
    private static let domainKey = "serverDomain"
    private static let apiBaseURLKey = "serverAPIBaseURL"
    private static let lastInputKey = "serverLastInput"

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: AppGroup.identifier) ?? .standard
    }

    /// The domain shown to the user (e.g. in the "yoursite.example.com" site
    /// preview) — not necessarily the API host, since by convention the API
    /// lives at api.<domain> (see SELF_HOSTING.md).
    public static var domain: String? {
        defaults.string(forKey: domainKey)
    }

    public static var apiBaseURL: URL? {
        defaults.string(forKey: apiBaseURLKey).flatMap(URL.init(string:))
    }

    public static var isConfigured: Bool { apiBaseURL != nil }

    /// The exact text last entered on the server setup screen — kept even
    /// after `clear()` so re-opening setup after a wrong address prefills
    /// what was typed (to fix a typo) instead of starting from blank.
    public static var lastInput: String? {
        defaults.string(forKey: lastInputKey)
    }

    /// Parses what a user types into the server setup field. A full
    /// `http(s)://` URL (a LAN IP for local dev, or a non-default setup) is
    /// used verbatim as the API root; a bare domain assumes the convention
    /// documented in SELF_HOSTING.md — API served at `api.<domain>`.
    public static func parse(_ input: String) -> (domain: String, apiBaseURL: URL)? {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if trimmed.hasPrefix("http://") || trimmed.hasPrefix("https://") {
            guard var url = URL(string: trimmed), let host = url.host else { return nil }
            if url.path.isEmpty {
                url.append(path: "/api/v1")
            }
            return (domain: host, apiBaseURL: url)
        }

        guard trimmed.contains("."), let apiURL = URL(string: "https://api.\(trimmed)/api/v1") else { return nil }
        return (domain: trimmed, apiBaseURL: apiURL)
    }

    public static func save(rawInput: String, domain: String, apiBaseURL: URL) {
        defaults.set(rawInput, forKey: lastInputKey)
        defaults.set(domain, forKey: domainKey)
        defaults.set(apiBaseURL.absoluteString, forKey: apiBaseURLKey)
        APIClient.shared.baseURL = apiBaseURL
    }

    /// Disconnects from the configured server without forgetting what was
    /// typed — see `lastInput`.
    public static func clear() {
        defaults.removeObject(forKey: domainKey)
        defaults.removeObject(forKey: apiBaseURLKey)
    }
}
