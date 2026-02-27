#!/bin/sh
# yt-dlp updater script
# Run this to update yt-dlp to latest version

echo "Downloading latest yt-dlp..."
cd /tmp
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o yt-dlp-new
chmod +x yt-dlp-new

echo "Current version: $(/usr/local/bin/yt-dlp --version 2>/dev/null || echo 'unknown')"
echo "New version: $(/tmp/yt-dlp-new --version)"

echo ""
echo "To use the new version, run:"
echo "  sudo cp /tmp/yt-dlp-new /usr/local/bin/yt-dlp"
echo ""
echo "Or test first with:"
echo "  /tmp/yt-dlp-new --version"
