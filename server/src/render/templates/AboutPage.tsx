import React from "react";
import type { Site } from "./types.js";
import { formatBasicText } from "../format.js";
import { t } from "../i18n.js";

export function AboutPage({ site }: { site: Site }) {
  const html = formatBasicText(site.about ?? "");
  return (
    <article className="about-page">
      <h1>{t(site.locale, "about")}</h1>
      {html ? <div className="about-content" dangerouslySetInnerHTML={{ __html: html }} /> : null}
    </article>
  );
}
