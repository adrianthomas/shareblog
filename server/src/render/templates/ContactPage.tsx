import React from "react";
import type { ProfileLink, Site } from "./types.js";

export function ContactPage({ site }: { site: Site }) {
  const profileLinks = (site.profileLinks ?? []) as ProfileLink[];
  return (
    <article className="contact-page">
      <p className="work-eyebrow">Contact</p>
      <h2>Have an interesting knot to untangle?</h2>
      <p className="contact-lede">
        A new product, a stubborn problem, or simply a half-formed idea—I’m always happy to hear what you’re thinking about.
      </p>
      <a className="contact-primary" href={site.contactUrl || "mailto:hello@adrianthomas.com"}>
        {site.contactLabel || "Start a conversation"} <span aria-hidden="true">↗</span>
      </a>
      {profileLinks.length ? (
        <div className="contact-links" aria-label="Elsewhere">
          <span>Or find me elsewhere</span>
          {profileLinks.map((link) => (
            <a key={link.url} href={link.url} rel={link.relMe ? "me" : undefined}>{link.label} ↗</a>
          ))}
        </div>
      ) : null}
      <a className="contact-back" href="/my-work">← Back to my work</a>
    </article>
  );
}
