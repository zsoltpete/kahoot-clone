#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (GitHub Pages legacy source).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp -r dist/* "$TMP/"
cd "$TMP"
git init -q
git checkout -b gh-pages
git add -A
git -c user.name="zsoltpete" -c user.email="zsoltpete@users.noreply.github.com" commit -q -m "Deploy site to GitHub Pages"
git remote add origin https://github.com/zsoltpete/kahoot-clone.git
git push -f origin gh-pages
echo "Published to https://zsoltpete.github.io/kahoot-clone/"
