#!/usr/bin/env bash
# Shoot the share card from its own route. Run it whenever the hero changes —
# the card is the first thing anyone sees when the link is pasted anywhere, and
# it is the easiest thing on the site to leave saying something no longer true.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DIST="apps/maykon/dist"
OUT="apps/maykon/public/og.png"
PORT=4401

[ -f "$DIST/og/index.html" ] || { echo "build first: npm run build"; exit 1; }

python3 -m http.server "$PORT" --directory "$DIST" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT
sleep 2

"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --window-size=1200,630 --screenshot="$OUT" \
  "http://localhost:$PORT/og/" >/dev/null 2>&1

echo "wrote $OUT ($(du -h "$OUT" | cut -f1))"
