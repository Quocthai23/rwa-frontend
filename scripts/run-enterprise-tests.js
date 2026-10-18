#!/usr/bin/env node
/**
 * Frontend enterprise smoke test runner.
 *
 * Usage:
 *   yarn test:enterprise
 */
const { spawnSync } = require('child_process');
const path = require('path');

const result = spawnSync(
  'yarn',
  ['vitest', 'run', 'src/__tests__/enterprise-smoke.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..'),
  },
);

process.exit(result.status || 0);
