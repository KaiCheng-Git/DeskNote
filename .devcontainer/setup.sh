#!/bin/bash
set -e

echo "=== Installing system dependencies for Tauri ==="
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

echo "=== Installing frontend dependencies ==="
npm install

echo "=== Generating app icons ==="
npm run tauri icon src-tauri/icons/app-icon.svg

echo "=== Setup complete! ==="
echo "Run 'npm run tauri dev' to start development"
echo "Run 'npm run tauri build' to build the app"
