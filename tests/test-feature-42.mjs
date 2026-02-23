#!/usr/bin/env node
import('../test-feature-42.mjs').catch(err => { console.error(err); process.exit(1) });
