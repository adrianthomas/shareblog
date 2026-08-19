import UIKit
import SwiftUI

final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let coordinator = ShareCoordinator(extensionItems: items) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }

        let root = ShareRootView(coordinator: coordinator)
        let hosting = UIHostingController(rootView: root)

        addChild(hosting)
        hosting.view.frame = view.bounds
        hosting.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(hosting.view)
        hosting.didMove(toParent: self)
    }
}
