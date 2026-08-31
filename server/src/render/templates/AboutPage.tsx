import React from "react";
import type { Site } from "./types.js";
import { formatBasicText } from "../format.js";

export function AboutPage({ site }: { site: Site }) {
  const html = formatBasicText(site.about ?? "");
  const profileLinks = site.profileLinks ?? [];
  const hasProfile = Boolean(
    site.profileImageUrl || site.introduction || site.location || profileLinks.length || site.contactUrl,
  );
  return (
    <>
      {hasProfile ? (
        <section className="site-profile" aria-label={site.title}>
          {site.profileImageUrl ? <img src={site.profileImageUrl} alt="" /> : null}
          <div>
            {site.introduction ? <p>{site.introduction}</p> : null}
            {site.location ? <p className="meta">{site.location}</p> : null}
            {profileLinks.length || site.contactUrl ? (
              <p className="site-profile-links">
                {profileLinks.map((link) => (
                  <a key={link.url} href={link.url} rel={link.relMe ? "me" : undefined}>
                    {link.label}
                  </a>
                ))}
                {site.contactUrl ? (
                  <a className="site-contact" href={site.contactUrl}>
                    {site.contactLabel || "Contact"}
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
      {html ? <div className="about-content" dangerouslySetInnerHTML={{ __html: html }} /> : null}
    </>
  );
}
