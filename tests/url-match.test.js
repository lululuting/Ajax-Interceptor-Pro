import test from 'node:test';
import assert from 'node:assert/strict';
import { matchUrl } from '../src/utils/index.js';

test('matchUrl matches wildcard path against absolute url', () => {
  assert.equal(matchUrl('https://example.com/api/user/42', '/api/user/*'), true);
});

test('matchUrl matches query string patterns literally except wildcards', () => {
  assert.equal(matchUrl('https://example.com/api/user/list?page=1', '/api/user/list?page=*'), true);
});

test('matchUrl matches exact strings with regex characters safely', () => {
  assert.equal(matchUrl('https://example.com/api/v1/user+meta', '/api/v1/user+meta'), true);
});

test('matchUrl supports host plus path patterns', () => {
  assert.equal(matchUrl('https://example.com/api/order/42', 'example.com/api/order/*'), true);
});

test('matchUrl does not match unrelated paths', () => {
  assert.equal(matchUrl('https://example.com/api/order/42', '/api/user/*'), false);
});
