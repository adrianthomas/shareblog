import Foundation

/// Converts between the server's small safe-formatting syntax for Site.about
/// (`**bold**`, `*italic*`/`_italic_`, `[text](url)` — see
/// server/src/render/format.ts) and a native `AttributedString`, so the iOS
/// 26+ rich-text About editor (see AboutEditorView) can show real bold/
/// italic/link runs while still round-tripping through the same plain-text
/// storage format the server parses. Mirror any syntax change made to
/// format.ts here too, or the two will drift.
public enum BasicTextFormatting {
    private static let pattern = #"\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_"#
    private static let safeLinkSchemes: Set<String> = ["http", "https", "mailto"]

    public static func attributedString(from text: String) -> AttributedString {
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return AttributedString(text)
        }
        let nsText = text as NSString
        let fullRange = NSRange(location: 0, length: nsText.length)
        var result = AttributedString()
        var lastEnd = 0

        for match in regex.matches(in: text, range: fullRange) {
            if match.range.location > lastEnd {
                let gap = NSRange(location: lastEnd, length: match.range.location - lastEnd)
                result += AttributedString(nsText.substring(with: gap))
            }
            result += styledRun(for: match, in: nsText)
            lastEnd = match.range.location + match.range.length
        }
        if lastEnd < nsText.length {
            result += AttributedString(nsText.substring(from: lastEnd))
        }
        return result
    }

    private static func styledRun(for match: NSTextCheckingResult, in nsText: NSString) -> AttributedString {
        func group(_ index: Int) -> String? {
            let range = match.range(at: index)
            guard range.location != NSNotFound else { return nil }
            return nsText.substring(with: range)
        }

        if let label = group(1), let urlString = group(2) {
            var run = AttributedString(label)
            if let url = URL(string: urlString), let scheme = url.scheme?.lowercased(), safeLinkSchemes.contains(scheme) {
                run.link = url
            }
            return run
        }
        if let bold = group(3) {
            var run = AttributedString(bold)
            run.inlinePresentationIntent = .stronglyEmphasized
            return run
        }
        if let italic = group(4) ?? group(5) {
            var run = AttributedString(italic)
            run.inlinePresentationIntent = .emphasized
            return run
        }
        // Unreachable: every alternative in `pattern` is handled above.
        return AttributedString(nsText.substring(with: match.range))
    }

    public static func text(from attributed: AttributedString) -> String {
        var result = ""
        for run in attributed.runs {
            var piece = String(attributed[run.range].characters)
            let intent = run.inlinePresentationIntent ?? []
            let bold = intent.contains(.stronglyEmphasized)
            let italic = intent.contains(.emphasized)
            if bold && italic {
                piece = "***\(piece)***"
            } else if bold {
                piece = "**\(piece)**"
            } else if italic {
                piece = "*\(piece)*"
            }
            if let url = run.link {
                piece = "[\(piece)](\(url.absoluteString))"
            }
            result += piece
        }
        return result
    }
}
