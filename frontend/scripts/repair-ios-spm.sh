#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SWIFTPM_DIR="$ROOT_DIR/ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm"

if [ -d "$SWIFTPM_DIR" ]; then
  rm -f "$SWIFTPM_DIR/Package.resolved"
fi

cd "$ROOT_DIR"
npx cap sync ios
