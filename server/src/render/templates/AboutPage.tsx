import React from "react";
import type { Site } from "./types.js";
import { formatBasicText } from "../format.js";
import { t } from "../i18n.js";

export function AboutPage({ site }: { site: Site }) {
  const html = formatBasicText(site.about ?? "");
  return (
    <>
      <div className="about-content" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="meta">
        <a href="/about-shareblog">{t(site.locale, "aboutShareblog")}</a>
        {" · "}
        <a href="/changelog">{t(site.locale, "releaseHistory")}</a>
      </p>
    </>
  );
}
