export interface ReleaseEntry {
  /** ISO date (YYYY-MM-DD) — grouped by day rather than a version number, since this project doesn't cut numbered releases. */
  date: string;
  changes: string[];
}

// Curated by hand from the commit history, newest first — not a raw commit
// dump. Two things are deliberately left out regardless of how the page is
// edited going forward: security fixes/hardening (this page is public, so
// it shouldn't hand a reader a list of what used to be exploitable) and
// internal refactors/infrastructure that don't change anything a reader or
// site owner would notice. Keep both of those out of any future entry too.
export const RELEASE_HISTORY: ReleaseEntry[] = [
  {
    date: "2026-08-25",
    changes: [
      "Added \"Prism,\" a bright, playful site theme with crisp cards, rounded typography, and blue-pink accents.",
      "Prism now uses the same animated card-opening interaction as the Cards theme.",
      "Refined \"Washi\" into a richer paper-card layout with a more composed header, navigation, media, and quote treatment.",
    ],
  },
  {
    date: "2026-08-24",
    changes: [
      "Added \"Washi,\" a calmer, paper-and-ink site theme with warm tones and serif headings.",
      "Simplified the Fediverse link in the site header to a single word that copies your handle, instead of showing the full address.",
      "Redesigned the photo composer to letterbox photos instead of cropping them to fit.",
      "\"Change server\" in Settings now has a cancel option instead of being all-or-nothing.",
      "Fixed a deleted or unpublished post's link sending readers to the wrong page.",
      "Further polish to the photo viewer and card-opening animations.",
    ],
  },
  {
    date: "2026-08-23",
    changes: [
      "Sites can now be followed from Mastodon and other Fediverse apps.",
      "Photos now get a real permalink based on their caption, instead of a generic numbered one.",
      "Added StoryGraph as a book retailer link, alongside Bookshop, Kobo, and Apple Books.",
      "Added an image-insert button to the article editor.",
    ],
  },
  {
    date: "2026-08-22",
    changes: [
      "Added copy-link and copy-quote buttons to post detail pages.",
      "RSS feeds now carry fuller titles, full photo captions and camera details, and book/music links.",
      "Added an editable About page for your site, and an RSS follow link in the header.",
      "Articles can now be written directly in the app, with headings and inline images.",
      "General polish to the photo, article, and book opening animations.",
    ],
  },
  {
    date: "2026-08-21",
    changes: [
      "Posts can now be edited after publishing, including dedicated editors for Music and Book posts.",
      "The app now saves a post locally and retries automatically if the server can't be reached.",
      "Feed rows now show status, date, and a fuller preview of each post.",
      "Redesigned photo posts with a full-screen viewer and camera/EXIF details.",
      "Quotes now get their own distinct, letter-like design.",
    ],
  },
  {
    date: "2026-08-20",
    changes: [
      "Added a \"quote\" post type.",
      "Posts can now be updated or unpublished after being published.",
      "Added a \"+\" button to create a post directly in the app, without sharing from elsewhere.",
      "Added RSS feeds, retailer links for books, a choice of site themes, and support for more languages.",
    ],
  },
  {
    date: "2026-08-19",
    changes: ["First release: the Shareblog server, iOS app, and share extension, with self-hosting support."],
  },
];
