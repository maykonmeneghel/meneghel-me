#!/usr/bin/env bash
# Print the /cv/ route to a PDF and drop it in public/, so the site ships a file
# a recruiter can download and an applicant tracking system can parse.
#
# It has to run against a *built* site: the dev server injects the Astro dev
# toolbar, which prints as a floating widget in the corner of page one.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIST="apps/maykon/dist"
OUT="apps/maykon/public/cv-maykon-meneghel.pdf"
PORT=4400

[ -f "$DIST/cv/index.html" ] || { echo "build first: npm run build"; exit 1; }

python3 -m http.server "$PORT" --directory "$DIST" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 2

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$OUT" "http://localhost:$PORT/cv/" >/dev/null 2>&1

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
