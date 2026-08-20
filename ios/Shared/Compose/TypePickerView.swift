import SwiftUI
import ShareblogKit

struct TypePickerView: View {
    @ObservedObject var coordinator: ShareCoordinator

    private let types: [ContentType] = [.thought, .quote, .article, .photo, .book, .music]

    var body: some View {
        List(types, id: \.self) { type in
            NavigationLink(value: type) {
                HStack {
                    Image(systemName: type.symbolName)
                        .foregroundStyle(.tint)
                        .frame(width: 28)
                    Text(type.displayName)
                    Spacer()
                    if type == coordinator.selectedType {
                        Image(systemName: "checkmark").foregroundStyle(.tint)
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
