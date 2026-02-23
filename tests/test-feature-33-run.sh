#!/usr/bin/env bash
echo "Run the original test: ../test-feature-33.sh"
exec "$(dirname "$0")/../test-feature-33.sh" "$@"
