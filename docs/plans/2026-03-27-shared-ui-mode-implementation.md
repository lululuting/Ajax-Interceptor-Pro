# Shared UI & Mode Exclusivity Implementation Plan

> **For implementer:** Use TDD throughout. Write failing test first. Watch it fail. Then implement.

**Goal:** 让 Ajax Interceptor Pro 的 popup 与 devtools 共用同一套规则列表展示，并让 popup/devtools 模式真正互斥生效。

**Architecture:** 抽出共享渲染层与模式配置辅助模块。`popup/popup.js` 与 `devtools-panel.js` 继续负责页面状态与事件，但不再各自维护不同的规则项模板。后台统一根据 `settings.openMode` 应用 toolbar popup 路径，popup/devtools 分别根据模式显示完整界面或提示页。

**Tech Stack:** Chrome Extension Manifest V3, plain JavaScript, Node built-in test runner (`node --test`)

---

### Task 1: Add Node test entry for shared helpers

**Files:**
- Modify: `package.json`
- Create: `tests/shared-ui.test.js`
- Create: `tests/mode-config.test.js`

**Step 1: Write the failing test**
Create `tests/shared-ui.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRuleItemViewModel, renderRuleItemHtml } = require('../libs/shared-ui.js');

test('renderRuleItemHtml renders name above hit/toggle row and includes route', () => {
  const vm = buildRuleItemViewModel({
    rule: { id: 'r1', name: '用户详情', method: 'GET', urlPattern: '/api/user/detail', response: '{"ok":true}', enabled: true },
    group: { id: 'g1', name: '默认组', enabled: true },
    hitCount: 3,
    showHitCount: true,
    allowHoverActions: true
  });

  const html = renderRuleItemHtml(vm);
  assert.match(html, /rule-name/);
  assert.match(html, /\/api\/user\/detail/);
  assert.match(html, /rule-side-title/);
  assert.match(html, /rule-side-controls/);
});
```

Create `tests/mode-config.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { getModePresentation } = require('../libs/mode-config.js');

test('popup mode enables popup and disables devtools full UI', () => {
  const result = getModePresentation('popup');
  assert.equal(result.toolbarPopup, 'popup/popup.html');
  assert.equal(result.devtoolsFullUi, false);
  assert.match(result.devtoolsMessage, /弹窗模式/);
});

test('devtools mode enables hint popup and devtools full UI', () => {
  const result = getModePresentation('devtools');
  assert.equal(result.toolbarPopup, 'popup/mode-hint.html');
  assert.equal(result.devtoolsFullUi, true);
  assert.match(result.toolbarMessage, /DevTools 模式/);
});
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/shared-ui.test.js tests/mode-config.test.js
```
Expected: FAIL — helper modules do not exist yet.

**Step 3: Write minimal implementation**
- Update `package.json`:
```json
{
  "scripts": {
    "test": "node --test tests/*.test.js"
  }
}
```
- Add initial `libs/shared-ui.js` CommonJS + browser-compatible exports for:
  - `buildRuleItemViewModel`
  - `renderRuleItemHtml`
- Add initial `libs/mode-config.js` exports for:
  - `getModePresentation`

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/shared-ui.test.js tests/mode-config.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add package.json libs/shared-ui.js libs/mode-config.js tests/shared-ui.test.js tests/mode-config.test.js && git commit -m "test: add shared ui and mode config helpers"
```

---

### Task 2: Implement shared rule card rendering

**Files:**
- Create: `libs/shared-ui.js`
- Modify: `popup/popup.css`
- Test: `tests/shared-ui.test.js`

**Step 1: Write the failing test**
Append to `tests/shared-ui.test.js`:
```js
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
  assert.match(html, /rule-side-title/);
  assert.doesNotMatch(html, /badge-name/);
});
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/shared-ui.test.js
```
Expected: FAIL — output does not match new layout requirements.

**Step 3: Write minimal implementation**
In `libs/shared-ui.js` implement:
- `escapeHtml`
- `getRulePreview`
- `buildRuleItemViewModel`
- `renderRuleItemHtml`

Output structure:
- left drag handle
- main block with method + route + preview
- right side title area `rule-side-title`
- controls row `rule-side-controls`
- hover-only `rule-actions`
- optional group label in all-rules view

In `popup/popup.css` add or update:
- `.rule-main`
- `.rule-route-row`
- `.rule-side`
- `.rule-side-title`
- `.rule-side-controls`
- `.rule-name` plain black text with no background
- consistent hover action behavior

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/shared-ui.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add libs/shared-ui.js popup/popup.css tests/shared-ui.test.js && git commit -m "feat: add shared rule card renderer"
```

---

### Task 3: Use shared renderer in popup controller

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.js`
- Test: `tests/shared-ui.test.js`

**Step 1: Write the failing test**
Append to `tests/shared-ui.test.js`:
```js
test('buildRuleItemViewModel shows group label in all-rules view', () => {
  const vm = buildRuleItemViewModel({
    rule: { id: 'r3', name: '商品详情', method: 'GET', urlPattern: '/api/product/detail', response: '{}', enabled: true },
    group: { id: 'g2', name: '商品组', enabled: true },
    hitCount: 1,
    showHitCount: true,
    allowHoverActions: true,
    showGroupName: true
  });

  const html = renderRuleItemHtml(vm);
  assert.match(html, /商品组/);
});
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/shared-ui.test.js
```
Expected: FAIL — group label not rendered yet.

**Step 3: Write minimal implementation**
- In `popup/popup.html`, load `../libs/shared-ui.js` and `../libs/mode-config.js` before `popup.js`
- In `popup/popup.js`:
  - replace inline `renderRuleItem()` string template with calls to shared renderer
  - preserve existing behavior for edit/delete/toggle/drag/drop
  - when current view is `all`, pass `showGroupName: true`
  - reuse same DOM structure required by shared CSS classes

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/shared-ui.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add popup/popup.html popup/popup.js libs/shared-ui.js tests/shared-ui.test.js && git commit -m "feat: use shared rule renderer in popup"
```

---

### Task 4: Use shared renderer in devtools controller

**Files:**
- Modify: `devtools-panel.html`
- Modify: `devtools-panel.js`
- Test: `tests/shared-ui.test.js`

**Step 1: Write the failing test**
Append to `tests/shared-ui.test.js`:
```js
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
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/shared-ui.test.js
```
Expected: FAIL — shared renderer not fully reusable or stable yet.

**Step 3: Write minimal implementation**
- In `devtools-panel.html`, load `libs/shared-ui.js` and `libs/mode-config.js`
- In `devtools-panel.js`, replace local `renderRuleItem()` template with shared renderer usage
- Keep popup and devtools using identical rule-card DOM structure for full UI mode

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/shared-ui.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add devtools-panel.html devtools-panel.js libs/shared-ui.js tests/shared-ui.test.js && git commit -m "feat: use shared rule renderer in devtools"
```

---

### Task 5: Add mode helper and toolbar popup switching

**Files:**
- Create: `libs/mode-config.js`
- Modify: `background/background.js`
- Modify: `popup/popup.js`
- Test: `tests/mode-config.test.js`

**Step 1: Write the failing test**
Append to `tests/mode-config.test.js`:
```js
test('unknown mode falls back to popup-safe defaults', () => {
  const result = getModePresentation('unknown');
  assert.equal(result.toolbarPopup, 'popup/popup.html');
  assert.equal(result.devtoolsFullUi, false);
});
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/mode-config.test.js
```
Expected: FAIL — fallback behavior not implemented yet.

**Step 3: Write minimal implementation**
- In `libs/mode-config.js`, implement normalized mode config helper
- In `background/background.js`:
  - on startup / install read `settings.openMode`
  - call `chrome.action.setPopup({ popup: ... })`
  - listen to storage changes and re-apply popup target immediately
- In `popup/popup.js`, persist `settings.openMode` unchanged, but rely on helper for effective mode state

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/mode-config.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add libs/mode-config.js background/background.js popup/popup.js tests/mode-config.test.js && git commit -m "feat: apply exclusive popup and devtools modes"
```

---

### Task 6: Add toolbar hint page for devtools mode

**Files:**
- Create: `popup/mode-hint.html`
- Create: `popup/mode-hint.css`
- Modify: `popup/popup.css`
- Test: `tests/mode-config.test.js`

**Step 1: Write the failing test**
Append to `tests/mode-config.test.js`:
```js
test('devtools mode points toolbar popup to mode hint page', () => {
  const result = getModePresentation('devtools');
  assert.equal(result.toolbarPopup, 'popup/mode-hint.html');
});
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/mode-config.test.js
```
Expected: FAIL — hint page path not finalized or exposed.

**Step 3: Write minimal implementation**
Create `popup/mode-hint.html` with minimal content:
```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ajax Interceptor Pro</title>
  <link rel="stylesheet" href="mode-hint.css">
</head>
<body>
  <main class="mode-hint">
    <h1>当前为 DevTools 模式</h1>
    <p>请按 F12 → Ajax拦截 使用</p>
  </main>
</body>
</html>
```

Create `popup/mode-hint.css` with minimal centered layout.

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/mode-config.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add popup/mode-hint.html popup/mode-hint.css tests/mode-config.test.js && git commit -m "feat: add devtools mode toolbar hint page"
```

---

### Task 7: Make devtools show hint-only content in popup mode

**Files:**
- Modify: `devtools-panel.html`
- Modify: `devtools-panel.js`
- Modify: `popup/popup.css`
- Test: `tests/mode-config.test.js`

**Step 1: Write the failing test**
Append to `tests/mode-config.test.js`:
```js
test('popup mode disables full devtools ui and provides message', () => {
  const result = getModePresentation('popup');
  assert.equal(result.devtoolsFullUi, false);
  assert.match(result.devtoolsMessage, /点击扩展图标使用/);
});
```

**Step 2: Run test — confirm it fails**
Command:
```bash
node --test tests/mode-config.test.js
```
Expected: FAIL — devtools message contract not complete yet.

**Step 3: Write minimal implementation**
- In `devtools-panel.js`, read `settings.openMode`
- If effective mode is `popup`, render only a centered hint block:
  - `当前为弹窗模式，请点击扩展图标使用`
- If effective mode is `devtools`, render the full shared UI
- Re-render on storage changes so switching mode updates without reopening DevTools

**Step 4: Run test — confirm it passes**
Command:
```bash
node --test tests/mode-config.test.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add devtools-panel.html devtools-panel.js popup/popup.css tests/mode-config.test.js && git commit -m "feat: show devtools hint when popup mode is active"
```

---

### Task 8: Verify end-to-end behavior and prevent regressions

**Files:**
- Modify: `README.md` (optional mode notes)
- Modify: `docs/plans/2026-03-27-shared-ui-mode-design.md` (optional implementation note)
- Test: `tests/shared-ui.test.js`
- Test: `tests/mode-config.test.js`

**Step 1: Write the failing test**
No new code test required; use full suite as regression gate.

**Step 2: Run test — confirm current status**
Command:
```bash
npm test
```
Expected: PASS — all tests green.

**Step 3: Write minimal implementation**
- Update docs / README if needed
- Manually verify:
  - popup mode → full popup, devtools hint only
  - devtools mode → toolbar hint only, full devtools UI
  - popup and devtools full UI render same rule cards in devtools mode
  - edit / delete / toggle / group switch / search still work

**Step 4: Run test — confirm it passes**
Command:
```bash
npm test
node --check background/background.js
node --check popup/popup.js
node --check devtools-panel.js
```
Expected: PASS

**Step 5: Commit**
```bash
git add README.md docs/plans/2026-03-27-shared-ui-mode-design.md package.json tests/*.test.js background/background.js popup/popup.js popup/popup.css popup/popup.html popup/mode-hint.html popup/mode-hint.css devtools-panel.html devtools-panel.js libs/shared-ui.js libs/mode-config.js && git commit -m "feat: unify popup and devtools ui with exclusive modes"
```
