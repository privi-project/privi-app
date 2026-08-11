#!/bin/bash
# Point to shared portable Node installation in website/tools/node
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODEDIR="$SCRIPT_DIR/../website/tools/node"
export PATH="$NODEDIR:$PATH"

cd "$SCRIPT_DIR"
npm run start
