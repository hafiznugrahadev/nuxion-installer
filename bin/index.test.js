// Run with: node --test bin/ (or `npm test`). The CLI itself is verified
// manually against a real clone; these cover the pure argument handling,
// which is where a typo would break every scaffold.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, validateFrontendVariant } from './index.js';

describe('validateFrontendVariant', () => {
  it('accepts the two kit variants', () => {
    assert.equal(validateFrontendVariant('nuxt'), 'nuxt');
    assert.equal(validateFrontendVariant('next'), 'next');
  });

  it('rejects anything else', () => {
    assert.throws(() => validateFrontendVariant('remix'));
    assert.throws(() => validateFrontendVariant(''));
  });
});

describe('parseArgs', () => {
  it('defaults to a safe run with no frontend chosen', () => {
    assert.deepEqual(parseArgs([]), {
      dest: undefined,
      repo: 'https://github.com/hafiznugrahadev/nuxion.git',
      branch: 'main',
      display: undefined,
      frontend: undefined,
      install: true,
      help: false,
    });
  });

  it('reads --frontend in both forms and validates the value', () => {
    assert.equal(parseArgs(['--frontend', 'next']).frontend, 'next');
    assert.equal(parseArgs(['--frontend=nuxt']).frontend, 'nuxt');
    assert.throws(() => parseArgs(['--frontend', 'remix']), /nuxt atau next/);
    assert.throws(() => parseArgs(['--frontend']), /nuxt atau next/);
  });

  it('reads the other flags in both forms', () => {
    const opts = parseArgs(['my-app', '--branch', 'next', '--repo=git@x:y.git', '--display', 'My App']);
    assert.equal(opts.dest, 'my-app');
    assert.equal(opts.branch, 'next'); // a branch named "next" is a ref, not a variant
    assert.equal(opts.repo, 'git@x:y.git');
    assert.equal(opts.display, 'My App');
  });

  it('rejects unknown flags and a second positional', () => {
    assert.throws(() => parseArgs(['--nope']), /Opsi tidak dikenal/);
    assert.throws(() => parseArgs(['a', 'b']), /Argumen tidak dikenal/);
  });

  it('reads --no-install and help', () => {
    assert.equal(parseArgs(['--no-install']).install, false);
    assert.equal(parseArgs(['-h']).help, true);
  });
});
