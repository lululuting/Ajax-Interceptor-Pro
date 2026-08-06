import test from 'node:test';
import assert from 'node:assert/strict';
import '../libs/intercept-active.js';

const { isActive } = globalThis.InterceptActive;

test('popup 模式：全局开时挂载', () => {
  assert.equal(isActive({
    openMode: 'popup',
    globalEnabled: true
  }), true);
});

test('popup 模式：全局关时不挂载', () => {
  assert.equal(isActive({
    openMode: 'popup',
    globalEnabled: false
  }), false);
});

test('popup 模式：globalEnabled 缺省视为关闭', () => {
  assert.equal(isActive({
    openMode: 'popup'
  }), false);
});

test('devtools 模式：未连接面板时不挂载', () => {
  assert.equal(isActive({
    openMode: 'devtools',
    globalEnabled: true,
    devtoolsConnected: false,
    devtoolsTabEnabled: true
  }), false);
});

test('devtools 模式：已连接且当前页开启时挂载', () => {
  assert.equal(isActive({
    openMode: 'devtools',
    globalEnabled: false,
    devtoolsConnected: true,
    devtoolsTabEnabled: true
  }), true);
});

test('devtools 模式：已连接但当前页关闭时不挂载', () => {
  assert.equal(isActive({
    openMode: 'devtools',
    devtoolsConnected: true,
    devtoolsTabEnabled: false
  }), false);
});

test('devtools 模式：devtoolsTabEnabled 缺省视为关闭', () => {
  assert.equal(isActive({
    openMode: 'devtools',
    devtoolsConnected: true
  }), false);
});
