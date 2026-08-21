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
  if [ -n "\$(git status --porcelain)" ]; then
    echo "Remote working tree has local changes — inspect and clean up on the server before deploying:" >&2
    git status --porcelain >&2
    exit 1
  fi
  git pull --ff-only
else
  echo "==> No repo at ${REMOTE_PATH} yet, cloning ${REPO_URL}"
  git clone "${REPO_URL}" "${REMOTE_PATH}"
  cd "${REMOTE_PATH}"
fi
cd server
# npm ci (not install) — it installs exactly what's in package-lock.json and
# never rewrites it, so a different npm version on this box can't leave
# lockfile drift behind that blocks the next deploy's git pull.
npm ci
npm run build
npm run db:migrate
supervisorctl restart shareblog
supervisorctl status shareblog
REMOTE

echo "==> Done"
