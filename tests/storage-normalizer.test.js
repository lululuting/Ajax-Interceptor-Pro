import test from 'node:test';
import assert from 'node:assert/strict';
import '../libs/storage-normalizer.js';

const { normalizeGroupsWithMeta } = globalThis.StorageNormalizer;

test('normalizeGroupsWithMeta backfills missing rule ids for legacy data', () => {
  const result = normalizeGroupsWithMeta([
    {
      id: 'default',
      name: '未分组',
      rules: [
        { urlPattern: '/api/user/detail', method: 'GET', response: '{"ok":true}' },
      ],
    },
  ]);

  assert.equal(result.changed, true);
  assert.equal(result.groups[0].rules.length, 1);
  assert.ok(result.groups[0].rules[0].id);
});

test('normalizeGroupsWithMeta keeps existing ids stable', () => {
  const source = [
    {
      id: 'default',
      name: '未分组',
      enabled: true,
      order: 999,
      rules: [
        {
          id: 'rule-1',
          name: '用户详情',
          urlPattern: '/api/user/detail',
          method: 'GET',
          response: '{"ok":true}',
          status: 200,
          enabled: true,
          order: 0,
        },
      ],
    },
  ];

  const result = normalizeGroupsWithMeta(source);

  assert.equal(result.changed, false);
  assert.equal(result.groups[0].rules[0].id, 'rule-1');
});
