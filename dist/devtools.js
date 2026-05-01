var devtoolsScopePort = null;

try {
  var inspectedTabId = chrome.devtools && chrome.devtools.inspectedWindow
    ? chrome.devtools.inspectedWindow.tabId
    : null;
  var panelUrl = 'devtools_panel.entry.html';

  if (typeof inspectedTabId === 'number') {
    panelUrl += '?tabId=' + inspectedTabId;
    devtoolsScopePort = chrome.runtime.connect({ name: 'AJAX_INTERCEPTOR_DEVTOOLS' });
    devtoolsScopePort.postMessage({
      type: 'DEVTOOLS_PANEL_OPENED',
      tabId: inspectedTabId
    });
  }

  chrome.devtools.panels.create(
    'Ajax拦截',
    'icons/icon16.png',
    panelUrl,
    function(panel) {}
  );
} catch(e) {
  console.error('创建 DevTools 面板失败:', e);
}
