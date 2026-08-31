# Importing a WordPress site

Shareblog imports a reviewable Markdown-and-images archive rather than
depending on a live WordPress API during the migration.

## 1. Export WordPress

In WordPress, choose **Tools → Export → All content → Download Export File**.
Keep the resulting WXR XML file as the permanent source archive. It contains
posts, pages, dates, slugs, taxonomy, and attachment references; the media
files themselves are downloaded during conversion.

## 2. Convert to Markdown

Run `wordpress-export-to-markdown` locally with one folder per post and all
attached/scraped images saved:

```bash
npx wordpress-export-to-markdown \
  --input=adrianthomas-export.xml \
  --output=adrianthomas-markdown \
  --post-folders=true \
  --save-images=all \
  --include-time=true \
  --timezone=Europe/Berlin \
  --frontmatter-fields=id,slug,title,date,type,categories,tags,coverImage,draft,excerpt
```

Do not delete the XML after conversion. Review the generated folder and keep
both artifacts until the public migration has been verified.

## 3. Dry-run the Shareblog import

Run this from `server/` with the target instance's normal `.env` loaded:

```bash
npm run import:markdown -- \
  --input /path/to/adrianthomas-markdown \
  --source wordpress:adrianthomas.com \
  --source-base-url https://adrianthomas.com \
  --wordpress-export /path/to/adrianthomas-export.xml
```

The report lists discovered/importable files, pages deliberately skipped,
unique local images, remaining remote images, duplicates, and per-file errors.
Nothing is written without `--commit`.

## 4. Commit only after review

```bash
npm run import:markdown -- \
  --input /path/to/adrianthomas-markdown \
  --source wordpress:adrianthomas.com \
  --source-base-url https://adrianthomas.com \
  --wordpress-export /path/to/adrianthomas-export.xml \
  --commit
```

The importer:

- maps WordPress posts to Shareblog Articles;
- preserves title, slug, publication date, excerpt, categories, and tags;
- uploads and rewrites every local inline/cover image;
- uses the optional WXR/XML manifest to restore gallery attachment IDs, exact
  old permalinks, and any gallery images the converter did not download;
- converts legacy captions and figure markup to Markdown and replaces old
  YouTube/Vimeo iframes with safe outbound links;
- keeps inline asset ids for cleanup and future richer editing;
- records stable source ids so reruns do not duplicate content;
- preserves `/<old-slug>` through a permanent redirect to
  `/articles/<slug>`;
- writes published history directly without sending ActivityPub activities;
- reports WordPress pages rather than incorrectly turning them into articles.

## Current scope

Imported multi-image articles render normally, but the current iOS editor only
offers rich controls for the first inline image. Text-only edits preserve the
other imported Markdown images. WordPress pages need individual mapping:
About/profile data belongs in site settings, project pages should become
structured Projects, and legal or one-off pages remain adjacent static pages.

The renderer supports headings, unordered and ordered lists, block quotes,
fenced code blocks, horizontal rules, links, emphasis, and multiple images.
The dry-run should still be used to identify uncommon WordPress shortcodes,
audio players, or residual HTML that needs a deliberate conversion.
