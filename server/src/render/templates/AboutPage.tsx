import React from "react";
import type { Site } from "./types.js";
import { formatBasicText } from "../format.js";

export function AboutPage({ site }: { site: Site }) {
  const html = formatBasicText(site.about ?? "");
  return (
    <>
      <div className="about-content" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
