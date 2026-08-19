import SwiftUI
import ShareblogKit

struct TypePickerView: View {
    @ObservedObject var coordinator: ShareCoordinator

    private let types: [(ContentType, String, String)] = [
        (.thought, "Thought", "bubble.left"),
        (.article, "Article", "doc.text"),
        (.photo, "Photo", "photo"),
        (.book, "Book", "book"),
        (.music, "Music", "music.note"),
    ]

    var body: some View {
        List(types, id: \.0) { type, label, icon in
            NavigationLink(value: type) {
                HStack {
                    Image(systemName: icon).frame(width: 28)
                    Text(label)
                    Spacer()
                    if type == coordinator.selectedType {
                        Image(systemName: "checkmark").foregroundStyle(.blue)
                    }
                }
            }
        }
        .navigationTitle("Add to Shareblog")
        .navigationDestination(for: ContentType.self) { type in
            ComposeView(coordinator: coordinator, type: type)
        }
    }
}
