#!/usr/bin/env node
'use strict';

// better-sqlite3 ships one prebuilt native binary per platform. On a host
// with an older glibc than that binary was built against — e.g. Uberspace's
// RHEL7 base (glibc 2.17) vs the ~2.29 the current prebuild needs — loading
// it fails with ERR_DLOPEN_FAILED, but only once a Database is actually
// opened, not on a bare `require`. This script detects that specific
// failure and, only then, rebuilds better-sqlite3 from source: its
// binding.gyp hardcodes `-std=c++20`, which this host's compiler (GCC 9,
// the newest devtoolset Uberspace offers) doesn't recognize by that name —
// only its predecessor spelling, `-std=c++2a`, for the same standard — so
// that gets patched first. The prebuilt binary is then moved aside, since
// better-sqlite3's loader (lib/binding.js) always prefers a prebuild over a
// local build if one is present.
//
// On any host where the prebuilt binary already works (every dev machine,
// most CI, most other Linux hosts), this is a fast no-op.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const pkgDir = path.dirname(require.resolve('better-sqlite3/package.json'));

function worksAsIs() {
  try {
    execFileSync(process.execPath, ['-e', "new (require('better-sqlite3'))(':memory:')"], {
      cwd: pkgDir,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

if (worksAsIs()) {
  process.exit(0);
}

console.log('[fix-better-sqlite3] Prebuilt binary failed to load — rebuilding from source for this host.');

const bindingGyp = path.join(pkgDir, 'binding.gyp');
const gyp = fs.readFileSync(bindingGyp, 'utf8');
if (gyp.includes("'-std=c++20'")) {
  fs.writeFileSync(bindingGyp, gyp.replace(/'-std=c\+\+20'/g, "'-std=c++2a'"));
  console.log('[fix-better-sqlite3] Patched binding.gyp: -std=c++20 -> -std=c++2a');
}

execFileSync('npm', ['run', 'build-release'], { cwd: pkgDir, stdio: 'inherit' });

const prebuildDir = path.join(pkgDir, 'prebuilds');
const target = `${process.platform}-${process.arch}.node`;
const prebuildPath = path.join(prebuildDir, target);
if (fs.existsSync(prebuildPath)) {
  fs.renameSync(prebuildPath, `${prebuildPath}.broken`);
  console.log(`[fix-better-sqlite3] Moved broken prebuild aside: ${target}`);
}

if (!worksAsIs()) {
  console.error('[fix-better-sqlite3] Rebuild did not fix it — better-sqlite3 still fails to load.');
  process.exit(1);
}

console.log('[fix-better-sqlite3] better-sqlite3 now working from a source build.');
