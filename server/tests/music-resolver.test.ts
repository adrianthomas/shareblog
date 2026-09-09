import assert from "node:assert/strict";
import test from "node:test";
import { appleMatchScore, sourceMetadata } from "../src/resolvers/music.js";

test("extracts artist and title from common inbound service titles", () => {
  assert.deepEqual(sourceMetadata("Rolling In - song and lyrics by Sam Evian | Spotify"), {
    releaseTitle: "Rolling In", artist: "Sam Evian",
  });
  assert.deepEqual(sourceMetadata("Song Title, by Artist Name"), {
    releaseTitle: "Song Title", artist: "Artist Name",
  });
  assert.deepEqual(sourceMetadata("Artist Name - Song Title - YouTube"), {
    releaseTitle: "Song Title", artist: "Artist Name",
  });
});

test("scores matching Apple catalog results above unrelated music", () => {
  const source = { releaseTitle: "Rolling In", artist: "Sam Evian" };
  assert.ok(appleMatchScore(source, { trackName: "Rolling In", artistName: "Sam Evian" }) > 0.99);
  assert.ok(appleMatchScore(source, { trackName: "Rolling Stone", artistName: "The Weeknd" }) < 0.5);
});
