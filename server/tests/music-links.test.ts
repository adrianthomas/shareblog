import assert from "node:assert/strict";
import test from "node:test";
import { isAppleMusicUrl, musicLinksFor } from "../src/lib/music-links.js";

test("publishes only a validated Apple Music destination", () => {
  const appleMusic = "https://music.apple.com/de/album/example/123?i=456";
  assert.deepEqual(musicLinksFor({
    releaseTitle: "Song",
    artist: "Artist",
    sourceUrl: "https://open.spotify.com/track/legacy",
    links: {
      appleMusic,
      spotify: "https://open.spotify.com/track/legacy",
      youtubeMusic: "https://music.youtube.com/watch?v=legacy",
      bandcamp: "https://artist.bandcamp.com/track/legacy",
    },
  }), { appleMusic });
});

test("recovers an Apple Music source URL when legacy links are missing", () => {
  const sourceUrl = "https://music.apple.com/gb/album/example/123";
  assert.deepEqual(musicLinksFor({ releaseTitle: "Album", artist: "Artist", sourceUrl }), {
    appleMusic: sourceUrl,
  });
});

test("rejects lookalike, insecure, and non-Apple destinations", () => {
  assert.equal(isAppleMusicUrl("https://music.apple.com.example/album/1"), false);
  assert.equal(isAppleMusicUrl("http://music.apple.com/album/1"), false);
  assert.deepEqual(musicLinksFor({ releaseTitle: "Song", artist: "Artist", links: {
    appleMusic: "https://example.com/song",
    spotify: "https://open.spotify.com/track/1",
  } }), {});
});
