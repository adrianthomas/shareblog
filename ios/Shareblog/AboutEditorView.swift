import SwiftUI
import ShareblogKit

/// Free-text editor for the site's About page (see SettingsView), which the
/// footer links to on every page once this has any content. What's actually
/// stored is always the server's small safe-formatting syntax
/// (server/src/render/format.ts) — bold, italic, and links — never raw HTML,
/// so there's no need for a sanitizer on either side. Below iOS 26 that
/// syntax is typed by hand into plain text; on iOS 26+, SwiftUI's
/// AttributedString-backed TextEditor lets it be authored with the system's
/// own Bold/Italic/Link controls instead (see RichAboutEditorView), with
/// BasicTextFormatting converting to/from the same stored syntax either way.
struct AboutEditorView: View {
    let site: Site

    var body: some View {
        if #available(iOS 26.0, *) {
            RichAboutEditorView(site: site)
        } else {
            PlainAboutEditorView(site: site)
        }
    }
}

@available(iOS 26.0, *)
private struct RichAboutEditorView: View {
    let site: Site

    @EnvironmentObject private var auth: AuthCoordinator
    @Environment(\.dismiss) private var dismiss

    @State private var text: AttributedString
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(site: Site) {
        self.site = site
        _text = State(initialValue: BasicTextFormatting.attributedString(from: site.about ?? ""))
    }

    private var hasChanges: Bool { BasicTextFormatting.text(from: text) != (site.about ?? "") }

    var body: some View {
        Form {
            Section {
                TextEditor(text: $text)
                    .attributedTextFormattingDefinition(AttributeScopes.FoundationAttributes.self)
                    .frame(minHeight: 220)
            } footer: {
                Text(verbatim: "Shown at /about, linked from your site's footer. Select text to make it Bold, Italic, or a Link.")
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            AboutSaveButton(isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
            }
        }
        .navigationTitle("About Page")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let updated = try await APIClient.shared.updateSite(about: BasicTextFormatting.text(from: text))
            auth.didUpdateSite(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// iOS 17–25 fallback: no system rich-text editor is available (SwiftUI's
/// AttributedString-backed TextEditor requires iOS 26 — see AboutEditorView),
/// so the syntax is typed by hand, same as it's stored.
private struct PlainAboutEditorView: View {
    let site: Site

    @EnvironmentObject private var auth: AuthCoordinator
    @Environment(\.dismiss) private var dismiss

    @State private var text: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(site: Site) {
        self.site = site
        _text = State(initialValue: site.about ?? "")
    }

    private var hasChanges: Bool { text != (site.about ?? "") }

    var body: some View {
        Form {
            Section {
                TextEditor(text: $text)
                    .frame(minHeight: 220)
            } footer: {
                // Text(verbatim:) rather than the default Markdown-interpreting
                // initializer — this is explaining the formatting syntax by
                // showing its literal characters (**bold**, not rendered bold),
                // so it must not be interpreted itself.
                Text(verbatim: "Shown at /about, linked from your site's footer. Use **bold**, *italic*, and [link text](https://example.com) for links.")
            }

            if let errorMessage {
                Text(errorMessage).foregroundStyle(.red)
            }

            AboutSaveButton(isSaving: isSaving, hasChanges: hasChanges) {
                Task { await save() }
            }
        }
        .navigationTitle("About Page")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let updated = try await APIClient.shared.updateSite(about: text)
            auth.didUpdateSite(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct AboutSaveButton: View {
    let isSaving: Bool
    let hasChanges: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            if isSaving {
                ProgressView()
            } else {
                Text("Save")
            }
        }
        .disabled(!hasChanges || isSaving)
    }
}
