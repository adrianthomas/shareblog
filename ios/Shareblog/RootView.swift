import SwiftUI

struct RootView: View {
    @EnvironmentObject private var auth: AuthCoordinator

    var body: some View {
        Group {
            if !auth.serverConfigured {
                ServerSetupView()
            } else if auth.isLoading {
                ProgressView()
            } else if !auth.isSignedIn {
                OnboardingView()
            } else if auth.site == nil {
                SiteSetupView()
            } else {
                FeedView()
            }
        }
    }
}
