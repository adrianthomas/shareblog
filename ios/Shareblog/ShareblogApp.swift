import SwiftUI

@main
struct ShareblogApp: App {
    @StateObject private var auth = AuthCoordinator()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
        }
    }
}
