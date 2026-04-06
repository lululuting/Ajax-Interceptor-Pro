import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../src/utils/data.js';
import { normalizeThemeMode, resolveThemeMode } from '../src/utils/theme.js';

test('DEFAULT_SETTINGS uses auto theme mode', () => {
  assert.equal(DEFAULT_SETTINGS.themeMode, 'auto');
});

test('normalizeThemeMode falls back to auto for unknown values', () => {
  assert.equal(normalizeThemeMode('dark'), 'dark');
  assert.equal(normalizeThemeMode('light'), 'light');
  assert.equal(normalizeThemeMode(undefined), 'auto');
  assert.equal(normalizeThemeMode('system'), 'auto');
});

test('resolveThemeMode follows system preference when set to auto', () => {
  assert.equal(resolveThemeMode('auto', true), 'dark');
  assert.equal(resolveThemeMode('auto', false), 'light');
  assert.equal(resolveThemeMode('dark', false), 'dark');
  assert.equal(resolveThemeMode('light', true), 'light');
});
