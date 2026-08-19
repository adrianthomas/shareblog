import Foundation
import Security

/// Wraps the shared-App-Group keychain item that holds the API token, so
/// both the main app and the Share Extension can read/write it. The item is
/// also marked iCloud-Keychain-synchronizable, so signing in once carries
/// the session to the user's other devices — deliberate, since tokens don't
/// expire server-side either (see server/src/routes/auth.ts): the intent is
/// to stay signed in indefinitely until an explicit, global sign-out.
public enum Keychain {
    private static let service = "com.adrianthomas.shareblog.apitoken"
    private static let account = "current"

    public static func saveToken(_ token: String) {
        let data = Data(token.utf8)
        var query = baseQuery()
        SecItemDelete(query as CFDictionary)
        query[kSecValueData as String] = data
        // Only relevant for a *new* item; SecItemAdd ignores kSecAttrAccessible
        // changes on update, but there's nothing to update here since the old
        // item was just deleted above.
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(query as CFDictionary, nil)
    }

    public static func loadToken() -> String? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    public static func deleteToken() {
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private static func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: AppGroup.keychainAccessGroup,
            // Syncs the item via iCloud Keychain to the user's other devices.
            // Falls back to local-only storage transparently if the user has
            // iCloud Keychain turned off — SecItem calls don't fail either way.
            kSecAttrSynchronizable as String: true,
        ]
    }
}
