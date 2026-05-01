import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayHitCounts, normalizeHitCounts, removeRuleHitCounts } from '../src/utils/hitCounts.js';

test('popup mode aggregates hit counts across all open tabs', () => {
  const result = buildDisplayHitCounts({
    12: { r1: 2, r2: 1 },
    18: { r1: 3 },
  }, 'popup');

  assert.deepEqual(result, { r1: 5, r2: 1 });
});

test('devtools mode only exposes the inspected tab hit counts', () => {
  const result = buildDisplayHitCounts({
    12: { r1: 2, r2: 1 },
    18: { r1: 3 },
  }, 'devtools', 18);

  assert.deepEqual(result, { r1: 3 });
});

test('removeRuleHitCounts deletes a rule from every tab bucket', () => {
  const result = removeRuleHitCounts({
    12: { r1: 2, r2: 1 },
    18: { r1: 3 },
  }, 'r1');

  assert.deepEqual(result, { 12: { r2: 1 } });
});

test('normalizeHitCounts ignores legacy flat counters', () => {
  const result = normalizeHitCounts({ r1: 2, r2: 3 });

  assert.deepEqual(result, {});
});
