#!/bin/bash
# Post-export script: patches the Expo web build for PWA + import.meta compatibility
DIST="$(dirname "$0")/../dist"
JSFILE=$(ls "$DIST"/_expo/static/js/web/entry-*.js 2>/dev/null)

# Patch import.meta.env (zustand devtools, not needed in production)
if [ -n "$JSFILE" ]; then
  sed -i 's/import\.meta\.env/undefined/g' "$JSFILE"
  echo "[post-export] Patched import.meta.env in $(basename "$JSFILE")"
fi

# Inject PWA meta tags into index.html
sed -i 's|<link rel="icon" href="/favicon.ico" /></head>|<link rel="icon" href="/favicon.ico" />\n    <meta name="theme-color" content="#9B8EC4" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n    <meta name="apple-mobile-web-app-title" content="Tsewa" />\n    <link rel="manifest" href="/manifest.json" />\n    <link rel="apple-touch-icon" href="/icons/icon-192.png" /></head>|' "$DIST/index.html"

# Add service worker registration
sed -i 's|</body>|<script>if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js")}</script></body>|' "$DIST/index.html"

echo "[post-export] PWA meta tags injected"

# Copy PWA assets if they exist
for f in manifest.json sw.js offline.html; do
  if [ -f "$(dirname "$0")/../pwa/$f" ]; then
    cp "$(dirname "$0")/../pwa/$f" "$DIST/$f"
  fi
done
if [ -d "$(dirname "$0")/../pwa/icons" ]; then
  cp -r "$(dirname "$0")/../pwa/icons" "$DIST/icons"
fi
echo "[post-export] PWA assets copied"
