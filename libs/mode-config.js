(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ModeConfig = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function normalizeMode(mode) {
    return mode === 'devtools' ? 'devtools' : 'popup';
  }

  function getModePresentation(mode) {
    var normalized = normalizeMode(mode);
    if (normalized === 'devtools') {
      return {
        mode: 'devtools',
        toolbarPopup: 'popup/mode-hint.html',
        toolbarMessage: '当前为 DevTools 模式，请按 F12 → Ajax拦截 使用',
        devtoolsFullUi: true,
        devtoolsMessage: ''
      };
    }

    return {
      mode: 'popup',
      toolbarPopup: '',
      toolbarMessage: '当前为小窗模式，请点击扩展图标打开',
      devtoolsFullUi: false,
      devtoolsMessage: '当前为小窗模式，请点击扩展图标打开'
    };
  }

  return {
    normalizeMode: normalizeMode,
    getModePresentation: getModePresentation
  };
});
