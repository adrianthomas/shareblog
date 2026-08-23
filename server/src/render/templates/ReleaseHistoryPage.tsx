import React from "react";
import { RELEASE_HISTORY } from "../releaseHistory.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";

// Plain, theme-agnostic content like AboutPage — this is product info, not
// something that needs the cards theme's card/hero treatment.
export function ReleaseHistoryPage({ locale = "en", commit }: { locale?: string; commit?: string }) {
  return (
    <div className="release-history">
      {commit ? <p className="meta">{t(locale, "currentlyRunning", { commit })}</p> : null}
      {RELEASE_HISTORY.map((entry) => (
        <section className="release-entry" key={entry.date}>
          <h2 className="release-date">{formatDate(new Date(`${entry.date}T00:00:00Z`), locale)}</h2>
          <ul>
            {entry.changes.map((change, i) => (
              <li key={i}>{change}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
