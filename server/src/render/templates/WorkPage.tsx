import React from "react";
import type { Site } from "./types.js";

const chapters = [
  {
    number: "01",
    label: "2011—2014 · SaaS",
    title: "From boxes to subscriptions.",
    copy: "Early product years spent repositioning business software for smaller teams—and helping move a licensed product into the subscription era.",
    note: "Product direction · SaaS transition · finding the right market",
    visual: "signals",
  },
  {
    number: "02",
    label: "2014—2016 · Consumer apps",
    title: "TV apps, before every TV was smart.",
    copy: "Working across a family of streaming and television products, using the small signals in a funnel to make subscriptions work better.",
    note: "Consumer products · monetisation · analytics",
    visual: "phone",
  },
  {
    number: "03",
    label: "2016—2023 · Enterprise security",
    title: "Secure, but make it usable.",
    copy: "Shaping enterprise VPN products across Mac, iPhone, and the web—expanding what they could connect to and making cloud deployment dramatically quicker.",
    note: "Enterprise VPN · Apple ecosystems · cloud deployment",
    visual: "system",
  },
  {
    number: "04",
    label: "2023—now · Platform products",
    title: "A platform with a very large blast radius.",
    copy: "Leading product work across identity, integrations, governance, and AI-enablement for a global enterprise platform—where scale, trust, and good trade-offs matter.",
    note: "TeamViewer · platform strategy · integrations · responsible AI",
    visual: "launch",
  },
  {
    number: "05",
    label: "Meanwhile · Independent work",
    title: "Keep a side door open.",
    copy: "Small products, prototypes, talks, and tools built from curiosity. Some become useful; all of them make the day job better.",
    note: "Ideas · code · speaking · making things for the internet",
    visual: "indie",
  },
] as const;

function ProductVisual({ type }: { type: (typeof chapters)[number]["visual"] }) {
  if (type === "phone") {
    return (
      <div className="work-phone" aria-hidden="true">
        <span className="work-phone-island" />
        <span className="work-phone-kicker">TODAY</span>
        <strong>Everything in its place.</strong>
        <span className="work-phone-card work-phone-card--pink" />
        <span className="work-phone-card work-phone-card--yellow" />
        <span className="work-phone-pill">Done, nicely.</span>
      </div>
    );
  }
  if (type === "signals") {
    return (
      <div className="work-board" aria-hidden="true">
        <span className="work-note work-note--one">what people say</span>
        <span className="work-note work-note--two">what they do</span>
        <span className="work-note work-note--three">the useful bit →</span>
        <span className="work-thread" />
      </div>
    );
  }
  if (type === "system") {
    return (
      <div className="work-system" aria-hidden="true">
        <span className="work-system-title">A small kit of good decisions</span>
        <span className="work-swatch work-swatch--a" />
        <span className="work-swatch work-swatch--b" />
        <span className="work-swatch work-swatch--c" />
        <span className="work-system-button">Button</span>
        <span className="work-system-input">Useful words go here</span>
      </div>
    );
  }
  if (type === "launch") {
    return (
      <div className="work-launch" aria-hidden="true">
        <span className="work-orbit work-orbit--one" />
        <span className="work-orbit work-orbit--two" />
        <span className="work-launch-mark">↗</span>
        <span className="work-launch-copy">out in the world</span>
      </div>
    );
  }
  return (
    <div className="work-indie" aria-hidden="true">
      <span className="work-indie-window work-indie-window--back"><i /><i /><i /></span>
      <span className="work-indie-window work-indie-window--front"><i /><i /><i /><b>hello, idea.</b></span>
      <span className="work-indie-spark">✦</span>
    </div>
  );
}

export function WorkPage({ site }: { site: Site }) {
  return (
    <article className="work-page">
      <section className="work-hero">
        <div>
          <p className="work-eyebrow">Adrian Thomas · A loosely edited work history</p>
          <h2>I make complicated products feel less complicated.</h2>
          <p className="work-lede">
            Fourteen-plus years shaping SaaS, mobile, platform, and AI-enabled products—from the first fuzzy question to something useful in people’s hands.
          </p>
        </div>
        <aside className="work-sticker" aria-label="Strategy, design, and build">
          <span>STRATEGY</span><span>DESIGN</span><span>BUILD</span><i>↘</i>
        </aside>
      </section>

      <section className="work-timeline" aria-label="Selected work highlights">
        {chapters.map((chapter) => (
          <article className="work-chapter" key={chapter.number}>
            <div className="work-rail" aria-hidden="true">
              <span>{chapter.number}</span>
            </div>
            <div className="work-chapter-copy">
              <p className="work-label">{chapter.label}</p>
              <h3>{chapter.title}</h3>
              <p>{chapter.copy}</p>
              <p className="work-note-line">{chapter.note}</p>
            </div>
            <div className={`work-visual work-visual--${chapter.visual}`}>
              <ProductVisual type={chapter.visual} />
            </div>
          </article>
        ))}
      </section>

      <section className="work-outro">
        <p>Good work usually starts with a good conversation.</p>
        <h2>Have a knot worth untangling?</h2>
        <a className="work-contact-link" href="/contact">Get in touch <span aria-hidden="true">↗</span></a>
        <span className="work-signoff">— {site.title}</span>
      </section>
    </article>
  );
}
