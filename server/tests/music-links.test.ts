import assert from "node:assert/strict";
import test from "node:test";
import { isSpotifySearchUrl, musicLinksFor, spotifySearchUrl } from "../src/lib/music-links.js";

test("generates a Spotify search link from structured metadata", () => {
  const url = spotifySearchUrl({ releaseTitle: "Rolling In", artist: "Sam Evian" });
  assert.equal(url, "https://open.spotify.com/search/Rolling%20In%20Sam%20Evian");
  assert.equal(isSpotifySearchUrl(url!), true);
});

test("adds Spotify first while retaining links stored by older posts", () => {
  const links = musicLinksFor({
    releaseTitle: "Rolling In",
    artist: "Sam Evian",
    links: { appleMusic: "https://music.apple.com/example" },
  });

  assert.deepEqual(Object.keys(links), ["spotify", "appleMusic"]);
  assert.equal(links.spotify, "https://open.spotify.com/search/Rolling%20In%20Sam%20Evian");
});

test("preserves an exact stored Spotify destination", () => {
  const spotify = "https://open.spotify.com/album/123";
  assert.equal(musicLinksFor({ releaseTitle: "Album", artist: "Artist", links: { spotify } }).spotify, spotify);
});

test("recovers an exact Spotify source URL when legacy links are missing", () => {
  const sourceUrl = "https://open.spotify.com/track/456";
  assert.equal(musicLinksFor({ releaseTitle: "Track", artist: "Artist", sourceUrl }).spotify, sourceUrl);
});
