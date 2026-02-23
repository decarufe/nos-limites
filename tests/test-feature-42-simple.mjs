#!/usr/bin/env node
import('../test-feature-42-simple.mjs').catch(err => { console.error(err); process.exit(1) });
