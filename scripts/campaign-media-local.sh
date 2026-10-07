#!/bin/sh
# A local dev copy of the campaign's media (gitignored) from the app repo's stand-in cache. Usage: npm run media:local
set -e
V="${CAMPAIGN_MEDIA_CACHE:-/Users/isakgustafsson/Documents/wehale-app/server/scripts/design-capture/.media-cache/media/partners/salte/look/v1}"
cp "$V/ink_long.mp4" public/recharge/ink-long.mp4
node -e 'require("sharp")(process.argv[1]).webp({quality:78}).toFile("public/recharge/ink-poster.webp")' "$V/ink_long_poster.jpg"
echo "local copy written to public/recharge/ (not in git)"
