import Foundation

public enum AppGroup {
    /// Shared between the main app and the Share Extension so both can read
    /// the auth token from Keychain and a couple of small cached values.
    /// Change this (and the matching entitlement in project.yml) if you
    /// change the bundle identifier prefix.
    public static let identifier = "group.com.adrianthomas.shareblog"

    public static let keychainAccessGroup = identifier
}
