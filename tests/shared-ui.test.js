import test from 'node:test';
import assert from 'node:assert/strict';
import '../libs/shared-ui.js';

const { buildRuleItemViewModel, renderRuleItemHtml } = globalThis.SharedUI;

test('renderRuleItemHtml renders name on the left and route on the right', () => {
  const vm = buildRuleItemViewModel({
    rule: { id: 'r1', name: '用户详情', method: 'GET', urlPattern: '/api/user/detail', response: '{"ok":true}', enabled: true },
    group: { id: 'g1', name: '默认组', enabled: true },
    hitCount: 3,
    showHitCount: true,
    allowHoverActions: true
  });

  const html = renderRuleItemHtml(vm);
  assert.match(html, /rule-name-main/);
  assert.match(html, /rule-route-side/);
  assert.match(html, /\/api\/user\/detail/);
  assert.match(html, /rule-side-controls/);
});

test('renderRuleItemHtml includes hover actions container and plain text name style hook', () => {
  const vm = buildRuleItemViewModel({
    rule: { id: 'r2', name: '订单列表', method: 'POST', urlPattern: '/api/order/list', response: '{}', enabled: true },
    group: { id: 'g1', name: '默认组', enabled: true },
    hitCount: 0,
    showHitCount: true,
    allowHoverActions: true
  });

  const html = renderRuleItemHtml(vm);
  assert.match(html, /rule-actions/);
  assert.match(html, /action-btn-edit/);
  assert.match(html, /action-btn-delete/);
  assert.match(html, /rule-side-title/);
  assert.doesNotMatch(html, /badge-name/);
});

test('buildRuleItemViewModel shows group label in all-rules view', () => {
  const vm = buildRuleItemViewModel({
    rule: { id: 'r3', name: '商品详情', method: 'GET', urlPattern: '/api/product/detail', response: '{}', enabled: true, groupName: '商品组' },
    group: { id: 'g2', name: '商品组', enabled: true },
    hitCount: 1,
    showHitCount: true,
    allowHoverActions: true,
    showGroupName: true
  });

  const html = renderRuleItemHtml(vm);
  assert.match(html, /商品组/);
});

test('shared renderer can be reused without popup-specific dependencies', () => {
  const vm = buildRuleItemViewModel({
    rule: { id: 'r4', name: '地址查询', method: 'GET', urlPattern: '/api/address', response: '{}', enabled: true },
    group: { id: 'g3', name: '地址组', enabled: true },
    hitCount: 5,
    showHitCount: true,
    allowHoverActions: true,
    showGroupName: false
  });

  const html = renderRuleItemHtml(vm);
  assert.match(html, /rule-item/);
  assert.match(html, /rule-side-controls/);
});
