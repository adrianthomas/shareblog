# Potential roadmap

Ideas in this document are exploratory. They are not committed features or implementation plans.

## Display a user's public Mastodon posts as cards

Allow a site owner to connect a public Mastodon account and display its public posts in Shareblog using the existing card designs.

### Possible behavior

- Follow the configured Mastodon account through ActivityPub.
- Store local snapshots so rendering a Shareblog page never depends on a live Mastodon request.
- Render text posts as Thought cards and image posts as Photo cards, preserving captions and alt text.
- Mark imported cards with a small “Mastodon” source link to the original post.
- Exclude replies and boosts by default, with explicit settings if those should be included later.
- Do not federate imported posts outward from Shareblog, avoiding loops and duplicate posts.
- Import a limited recent history, such as the latest 20 public posts, when the account is first connected.

### Possible refresh model

- Apply incoming ActivityPub `Create`, `Update`, and `Delete` activities immediately, normally updating cards within seconds.
- Reconcile with Mastodon hourly and when the Shareblog server starts, recovering updates missed during downtime.
- Offer a manual “Sync now” action in the iOS app's site settings.
- Keep existing cards available when Mastodon cannot be reached and retry during the next reconciliation.
- Never infer deletion merely because a post is absent from a recent-post response; remove a card only after an ActivityPub `Delete` or a direct check confirms the post no longer exists.

### Product and implementation considerations

- Coordinate server settings and the iOS settings UI while preserving compatibility with older app versions.
- Decide how content warnings, sensitive media, polls, video, multiple attachments, edited posts, and account moves should appear.
- Keep imported objects distinguishable from Shareblog-authored content for editing, deletion, feeds, search, and federation.
- Validate remote URLs and media downloads using the same SSRF and asset-safety boundaries as other imports.
