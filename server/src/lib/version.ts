import { execFileSync } from "node:child_process";

// Read once at startup rather than per-request — this only changes across a
// deploy, which restarts the process anyway (see deploy.sh). git walks up
// from cwd to find .git on its own, so this works whether the process runs
// from the repo root or from server/ (as it does under supervisord — see
// UBERSPACE.md). Falls back to undefined for any environment without git
// available, rather than failing the page over a version string.
export const currentCommit: string | undefined = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
})();
