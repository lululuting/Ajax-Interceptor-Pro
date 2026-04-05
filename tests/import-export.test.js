import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImportedGroups } from '../src/utils/data.js';

test('parseImportedGroups supports current export format', () => {
  const groups = parseImportedGroups(JSON.stringify({
    version: '2.1.0',
    exportTime: '2026-04-05T00:00:00.000Z',
    groups: [
      {
        id: 'g1',
        name: '用户模块',
        enabled: true,
        rules: [
          { id: 'r1', urlPattern: '/api/user', method: 'GET', response: '{"ok":true}' },
        ],
      },
    ],
  }));

  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, '用户模块');
  assert.equal(groups[0].rules.length, 1);
});

test('parseImportedGroups supports BOM-prefixed json', () => {
  const groups = parseImportedGroups(`\uFEFF${JSON.stringify({
    groups: [
      {
        id: 'default',
        name: '未分组',
        rules: [{ urlPattern: '/api/demo', method: 'POST', response: '{}' }],
      },
    ],
  })}`);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].rules[0].urlPattern, '/api/demo');
});

test('parseImportedGroups supports legacy rule-array format', () => {
  const groups = parseImportedGroups(JSON.stringify([
    { urlPattern: '/api/order/*', method: 'GET', response: '{"list":[]}' },
  ]));

  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 'default');
  assert.equal(groups[0].rules.length, 1);
  assert.equal(groups[0].rules[0].urlPattern, '/api/order/*');
});
