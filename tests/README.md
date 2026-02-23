# Tests wrappers

This directory contains small wrapper files that re-run the repository's top-level test scripts from a central location for readability.

Usage:

- Run a JS test (CommonJS):
  node tests/test-feature-15.js

- Run an ESM test (.mjs):
  node tests/test-feature-70.mjs

- Run a shell test (.sh):
  bash tests/test-feature-33.sh

Notes:
- These are lightweight wrappers that execute the original tests in place so the original test files remain unchanged.
- If you'd like the files to be physically moved instead of wrapped, tell me and I will perform a proper move (this will delete the originals).
