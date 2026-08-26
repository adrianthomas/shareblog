import React from "react";
import type { ContentObject, PhotoMetadata } from "./types.js";
import type { Theme, AssetExif } from "../../db/schema.js";
import { formatDate } from "./ThoughtPost.js";
import { t } from "../i18n.js";
import { CardsFeedItem, CardsDetailHeader, type CardsExifRow } from "../themes/cards.js";
import { CopyLinkButton } from "./CopyButton.js";

// Fractional shutter speeds are the camera-standard notation for anything
// faster than 1s ("1/250s", not "0.004s") — everything at or above 1s reads
// more naturally as a plain decimal ("2.5s").
function formatShutterSpeed(seconds: number): string {
  if (seconds >= 1) return `${seconds}s`;
  return `1/${Math.round(1 / seconds)}s`;
}

// A camera's own model tag is sometimes already brand-prefixed ("Canon EOS
// R5") and sometimes not ("iPhone 15 Pro", with "Apple" only in Make) —
// naively joining Make + Model would double up the former. Only prepend
// Make when Model doesn't already start with it.
function formatCamera(exif: AssetExif): string | undefined {
  if (!exif.model) return exif.make;
  if (exif.make && !exif.model.toLowerCase().startsWith(exif.make.toLowerCase())) {
    return `${exif.make} ${exif.model}`;
  }
  return exif.model;
}

// Builds the ordered, already-translated/formatted rows the cards theme's
// EXIF strip renders verbatim (see CardsExifRow) — kept here rather than in
// the theme file so the theme stays free of i18n lookups and camera-
// notation formatting, matching how `eyebrow` etc. are already pre-built by
// callers throughout this file.
export function formatExif(exif: AssetExif | undefined, locale: string): CardsExifRow[] | undefined {
  if (!exif) return undefined;
  const camera = formatCamera(exif);
  const rows: Array<[string, string | undefined]> = [
    [t(locale, "exifCamera"), camera],
    [t(locale, "exifLens"), exif.lensModel],
    [t(locale, "exifFocalLength"), exif.focalLength ? `${Math.round(exif.focalLength)}mm` : undefined],
    [t(locale, "exifAperture"), exif.fNumber ? `ƒ/${exif.fNumber}` : undefined],
    [t(locale, "exifShutterSpeed"), exif.exposureTime ? formatShutterSpeed(exif.exposureTime) : undefined],
    [t(locale, "exifIso"), exif.iso ? `ISO ${exif.iso}` : undefined],
  ];
  const present = rows.filter((row): row is [string, string] => row[1] !== undefined);
  return present.length > 0 ? present.map(([label, value]) => ({ label, value })) : undefined;
}

export function PhotoPost({
  object,
  imageUrl,
  exif,
  linked = true,
  locale = "en",
  theme = "classic",
  backHref,
  backLabel,
}: {
  object: ContentObject;
  imageUrl: string;
  exif?: AssetExif;
  linked?: boolean;
  locale?: string;
  theme?: Theme;
  backHref?: string;
  backLabel?: string;
}) {
  const metadata = object.metadata as PhotoMetadata;
  const imageAlt = metadata.altText ?? "";

  if (theme === "cards" || theme === "prism" || theme === "ledger") {
    const title = metadata.caption || formatDate(object.publishedAt, locale);
    const hero = { imageUrl, imageAlt, gradientSeed: object.slug };
    if (linked) {
      return (
        <CardsFeedItem
          href={`/photos/${object.slug}`}
          eyebrow={t(locale, "photos")}
          title={title}
          type={object.type}
          hero={hero}
          variant="photo"
        />
      );
    }
    return (
      <CardsDetailHeader
        href={`/photos/${object.slug}`}
        eyebrow={t(locale, "photos")}
        title={title}
        dateLabel={
          <>
            {formatDate(object.publishedAt, locale)}
            <CopyLinkButton locale={locale} />
          </>
        }
        type={object.type}
        hero={hero}
        variant="photo"
        exif={formatExif(exif, locale)}
        backHref={backHref!}
        backLabel={backLabel!}
      />
    );
  }

  const image = <img src={imageUrl} alt={imageAlt} />;
  const exifRows = formatExif(exif, locale);

  return (
    <article className="card">
      {linked ? <a href={`/photos/${object.slug}`}>{image}</a> : image}
      {metadata.caption ? <p>{metadata.caption}</p> : null}
      <div className="meta">
        {formatDate(object.publishedAt, locale)}
        {!linked ? <CopyLinkButton locale={locale} /> : null}
      </div>
      {!linked && exifRows ? (
        <dl className="exif">
          {exifRows.map((row) => (
            <div className="exif-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
