import test from 'node:test';
import assert from 'node:assert/strict';
import '../libs/mode-config.js';

const { getModePresentation } = globalThis.ModeConfig;

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

test('unknown mode falls back to popup-safe defaults', () => {
  const result = getModePresentation('unknown');
  assert.equal(result.toolbarPopup, 'popup/popup.html');
  assert.equal(result.devtoolsFullUi, false);
});

test('devtools mode points toolbar popup to mode hint page', () => {
  const result = getModePresentation('devtools');
  assert.equal(result.toolbarPopup, 'popup/mode-hint.html');
});

test('popup mode disables full devtools ui and provides message', () => {
  const result = getModePresentation('popup');
  assert.equal(result.devtoolsFullUi, false);
  assert.match(result.devtoolsMessage, /点击扩展图标使用/);
});
