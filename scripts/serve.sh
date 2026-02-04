#!/usr/bin/env bash
set -euo pipefail

port="${1:-8000}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Serving ./web/ at http://localhost:${port}/web/"
python3 -m http.server "${port}"
