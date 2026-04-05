export function normalizeMode(mode) {
  return mode === 'devtools' ? 'devtools' : 'popup';
}

export function getModePresentation(mode) {
  const normalized = normalizeMode(mode);

  if (normalized === 'devtools') {
    return {
      mode: 'devtools',
      toolbarPopup: 'popup/mode-hint.html',
      toolbarMessage: '当前为 DevTools 模式，请按 F12 → Ajax拦截 使用',
      devtoolsFullUi: true,
      devtoolsMessage: '',
    };
  }

  return {
    mode: 'popup',
    toolbarPopup: 'popup.entry.html',
    toolbarMessage: '',
    devtoolsFullUi: false,
    devtoolsMessage: '当前为弹窗模式，请点击扩展图标使用',
  };
}

export function getRuntimeModeHint(runtimeMode, selectedMode) {
  const runtime = normalizeMode(runtimeMode);
  const selected = normalizeMode(selectedMode);

  if (runtime === 'popup' && selected === 'devtools') {
    return {
      title: '当前为 DevTools 模式',
      message: '请按 F12 打开开发者工具，在“Ajax拦截”标签页查看',
    };
  }

  if (runtime === 'devtools' && selected === 'popup') {
    return {
      title: '当前为弹窗模式',
      message: '请点击扩展图标，在弹窗中查看和编辑规则',
    };
  }

  return null;
}
