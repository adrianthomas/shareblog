import React from "react";

interface Faq {
  question: string;
  answer: React.ReactNode;
}

const FAQS: Faq[] = [
  {
    question: "Do I need to run my own server?",
    answer:
      "Yes — Shareblog is self-hosted software, not a hosted service you sign up for. You run it on your own infrastructure, and it serves your site at your own domain.",
  },
  {
    question: "Is my content actually mine?",
    answer:
      "Yes. Everything lives in a database you control, on a server you control. There's no platform account to lose access to and no proprietary export format to fight with — it's a small database and a folder of images.",
  },
  {
    question: "What can I publish from?",
    answer: "Today, the iOS app and its share extension — anything you can share to from an iPhone.",
  },
  {
    question: "How is this different from WordPress, Micro.blog, omg.lol, or Tumblr?",
    answer: (
      <ul>
        <li>
          <strong>WordPress</strong> is a general-purpose CMS — enormously flexible, but that flexibility comes from
          plugins and configuration. Shareblog has no plugins: a handful of content types are built in, each with
          real structure, and there's very little to configure in the first place.
        </li>
        <li>
          <strong>Micro.blog</strong> is the closest comparison — own-domain, mobile-first microblogging with some
          structured content, like books. Shareblog leans further into that idea: books, music, and photos are
          first-class types with their own metadata and layout, not blog-post variants.
        </li>
        <li>
          <strong>omg.lol</strong> is a lightweight personal-web toolkit — a domain plus a grab-bag of small,
          independent tools. Shareblog is narrower and deeper: one publishing flow for structured content, not a
          collection of separate tools.
        </li>
        <li>
          <strong>Tumblr</strong> is a hosted social network built around a public feed and reblogs. Shareblog has
          no feed to scroll and no algorithm — it's your own site, self-hosted, with nothing running on it but what
          you published.
        </li>
      </ul>
    ),
  },
];

// Plain, theme-agnostic content like AboutPage/ReleaseHistoryPage — this is
// product info, not something that needs the cards theme's card/hero
// treatment. Body copy is deliberately not threaded through i18n: it's this
// project's own marketing copy, authored once in English, the same way a
// self-hosted product's own site is usually only in its maintainer's
// language regardless of what languages it renders *user* content in.
export function AboutProductPage() {
  return (
    <div className="about-product">
      <p>
        Shareblog turns anything you'd share from your phone into a proper page on your own website — a photo, a
        quote, a book you're reading, a song you can't stop playing, a quick thought, a full article. There's no CMS
        to log into and no post editor to open: you share, it gets structured automatically, and it's published at
        your own domain.
      </p>

      <h2>How it works</h2>
      <ol>
        <li>Share something from any app — a photo from your camera roll, a link to a book or album, or just type a quick thought.</li>
        <li>
          Shareblog looks at what you shared and enriches it automatically — a book gets its cover, author, and
          retailer links; a photo keeps its camera details; a song gets links to Spotify, Apple Music, and YouTube
          Music.
        </li>
        <li>Publish it, as a draft or straight away, and it appears on your site immediately.</li>
        <li>Your site serves clean HTML with its own RSS feed, and you can edit or unpublish anything afterward.</li>
      </ol>

      <h2>Features</h2>
      <ul>
        <li>Seven structured content types — Thought, Article, Link, Photo, Book, Music, Quote — each with its own fields, not a blog post with tags bolted on.</li>
        <li>Share-sheet-first authoring on iOS: publish from wherever the content already is.</li>
        <li>Automatic metadata: book covers/ratings/retailer links, music artwork/streaming links, photo EXIF, and link/article excerpts.</li>
        <li>Drafts, editing after publishing, and unpublishing — nothing is set in stone the moment you tap Publish.</li>
        <li>Works offline: if the server can't be reached, a post is saved on your device and sent automatically once it can.</li>
        <li>RSS feeds, site-wide and per content type.</li>
        <li>A couple of built-in visual themes for your site.</li>
        <li>Self-hosted, on your own domain — no ads, no algorithmic feed, no third-party trackers.</li>
      </ul>

      <h2>FAQ</h2>
      {FAQS.map((faq) => (
        <div className="faq-entry" key={faq.question}>
          <h3>{faq.question}</h3>
          {typeof faq.answer === "string" ? <p>{faq.answer}</p> : faq.answer}
        </div>
      ))}
    </div>
  );
}
