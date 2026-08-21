#!/usr/bin/env bash
# Deploys the current branch to Uberspace: SSHes in and runs the same
# steps documented in UBERSPACE.md's "Updating" section. Assumes you've
# already pushed to origin yourself (the push step below is commented out).
#
# Setup: copy deploy.env.example to deploy.env and fill in your values.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f deploy.env ]; then
  echo "deploy.env not found — copy deploy.env.example to deploy.env and fill it in." >&2
  exit 1
fi
# shellcheck disable=SC1091
source deploy.env

: "${UBERSPACE_USER:?set in deploy.env}"
: "${UBERSPACE_HOST:?set in deploy.env}"
: "${REMOTE_PATH:?set in deploy.env}"
: "${REPO_URL:?set in deploy.env}"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes — commit or stash before deploying." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

# echo "==> Pushing ${branch} to origin"
# git push origin "${branch}"

echo "==> Deploying on ${UBERSPACE_USER}@${UBERSPACE_HOST}"
ssh "${UBERSPACE_USER}@${UBERSPACE_HOST}" bash -s <<REMOTE
set -euo pipefail
if [ -d "${REMOTE_PATH}/.git" ]; then
  cd "${REMOTE_PATH}"
  dirty="\$(git status --porcelain)"
  # The one expected/harmless case: npm install (below) is allowed to
  # rewrite package-lock.json to match whatever npm version runs it, which
  # differs from the npm on whatever machine committed the lockfile. That's
  # not a real change — reset it automatically so it can't block the pull.
  # Anything else modified or untracked stops the deploy for a human to
  # look at, same as the local working-tree check above.
  if [ "\$dirty" = " M server/package-lock.json" ]; then
    git checkout -- server/package-lock.json
  elif [ -n "\$dirty" ]; then
    echo "Remote working tree has local changes — inspect and clean up on the server before deploying:" >&2
    echo "\$dirty" >&2
    exit 1
  fi
  git pull --ff-only
else
  echo "==> No repo at ${REMOTE_PATH} yet, cloning ${REPO_URL}"
  git clone "${REPO_URL}" "${REMOTE_PATH}"
  cd "${REMOTE_PATH}"
fi
cd server
# npm install, not ci: ci deletes node_modules and reinstalls everything
# from scratch, which OOM-kills on this host's memory limits. install
# reuses what's on disk and only touches what package-lock.json changed.
npm install
npm run build
npm run db:migrate
supervisorctl restart shareblog
supervisorctl status shareblog
REMOTE

echo "==> Done"
