import SwiftUI
import ShareblogKit

struct BookComposeView: View {
    @ObservedObject var coordinator: ShareCoordinator
    @State private var query = ""
    @State private var candidates: [BookCandidate] = []
    @State private var selected: BookCandidate?
    @State private var note = ""
    @State private var rating = 0
    @State private var status: ObjectStatus = .published
    @State private var isSearching = false
    @State private var searchError: String?

    var body: some View {
        VStack {
            Form {
                if coordinator.offlineSaveAvailable {
                    OfflineNotice(actionTitle: "Finish this later") { coordinator.saveForLater() }
                } else if let errorMessage = coordinator.errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }

                Section {
                    HStack {
                        TextField("Book title", text: $query)
                            .onSubmit { Task { await search() } }
                        Button("Search") { Task { await search() } }
                            .disabled(query.isEmpty || isSearching)
                    }
                    if isSearching { ProgressView() }
                    if let searchError { Text(searchError).foregroundStyle(.red) }
                }

                if !candidates.isEmpty && selected == nil {
                    Section("Results") {
                        ForEach(candidates) { candidate in
                            Button {
                                selected = candidate
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(candidate.title).foregroundStyle(.primary)
                                    Text(candidate.author).font(.caption).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                if let selected {
                    Section("Selected") {
                        Text(selected.title).bold()
                        Text(selected.author).foregroundStyle(.secondary)
                        Picker("Rating", selection: $rating) {
                            Text("No rating").tag(0)
                            ForEach(1...5, id: \.self) { n in
                                Text(String(repeating: "★", count: n)).tag(n)
                            }
                        }
                        TextField("Your take (optional)", text: $note, axis: .vertical)
                    }
                }
            }
            PublishBar(status: $status, isPublishing: coordinator.isPublishing, isEnabled: selected != nil) {
                guard let selected else { return }
                Task {
                    await coordinator.publishBook(
                        candidate: selected, note: note, rating: rating == 0 ? nil : rating, status: status
                    )
                }
            }
        }
        .navigationTitle("Book")
        .onAppear { prefillFromCoordinatorIfNeeded() }
        // sharedText/sharedURL load asynchronously and may still be empty on
        // first appear (see ArticleComposeView's .task(id:) comment) — react
        // to them arriving too, not just the initial appearance.
        .onChange(of: coordinator.sharedText) { _, _ in prefillFromCoordinatorIfNeeded() }
        .onChange(of: coordinator.sharedURL) { _, _ in prefillFromCoordinatorIfNeeded() }
    }

    private func prefillFromCoordinatorIfNeeded() {
        guard query.isEmpty else { return }
        query = coordinator.sharedText ?? coordinator.sharedURL?.lastPathComponent ?? ""
        if !query.isEmpty { Task { await search() } }
    }

    private func search() async {
        isSearching = true
        searchError = nil
        defer { isSearching = false }
        do {
            candidates = try await APIClient.shared.resolveBook(query: query)
        } catch {
            searchError = error.localizedDescription
        }
    }
}
