import React from "react";
import type { ContactLink, ProfileLink, Site } from "./types.js";

export function siteContactLinks(site: Site): ContactLink[] {
  const links = (site.contactLinks ?? []) as ContactLink[];
  if (links.length) return links;
  return site.contactUrl ? [{ label: site.contactLabel || "Contact", url: site.contactUrl }] : [];
}

export function SiteProfile({ site, about = false }: { site: Site; about?: boolean }) {
  const profileLinks = (site.profileLinks ?? []) as ProfileLink[];
  const contactLinks = siteContactLinks(site);
  const name = site.profileName?.trim() || site.title;

  return (
    <section className={about ? "site-profile site-profile--about" : "site-footer-profile"} aria-label={name}>
      {about && site.profileImageUrl ? <img src={site.profileImageUrl} alt="" /> : null}
      <div className="site-profile-details">
        <p className="site-profile-name">{name}</p>
        {site.location ? <p className="site-profile-location">{site.location}</p> : null}
        {about && site.introduction ? <p className="site-profile-introduction">{site.introduction}</p> : null}
        {profileLinks.length || contactLinks.length ? (
          <div className="site-profile-link-groups">
            {profileLinks.length ? (
              <p className="site-profile-links">
                <span>Elsewhere</span>
                {profileLinks.map((link) => (
                  <a key={link.url} href={link.url} rel={link.relMe ? "me" : undefined}>{link.label}</a>
                ))}
              </p>
            ) : null}
            {contactLinks.length ? (
              <p className="site-profile-links site-contact-links">
                <span>Contact</span>
                {contactLinks.map((link) => <a key={link.url} href={link.url}>{link.label}</a>)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
