#!/usr/bin/env bash
# Deploys the current branch to Uberspace: pushes to origin, then SSHes in
# and runs the same steps documented in UBERSPACE.md's "Updating" section.
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

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes — commit or stash before deploying." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

echo "==> Pushing ${branch} to origin"
git push origin "${branch}"

echo "==> Deploying on ${UBERSPACE_USER}@${UBERSPACE_HOST}"
ssh "${UBERSPACE_USER}@${UBERSPACE_HOST}" bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_PATH}/server"
git pull
npm install
npm run build
npm run db:migrate
supervisorctl restart shareblog
supervisorctl status shareblog
REMOTE

echo "==> Done"
