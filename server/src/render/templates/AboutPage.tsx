import React from "react";
import type { Site } from "./types.js";
import { formatBasicText } from "../format.js";
import { SiteProfile } from "./SiteProfile.js";

export function AboutPage({ site }: { site: Site }) {
  const html = formatBasicText(site.about ?? "");
  return (
    <>
      <SiteProfile site={site} about />
      {html ? <div className="about-content" dangerouslySetInnerHTML={{ __html: html }} /> : null}
    </>
  );
}
