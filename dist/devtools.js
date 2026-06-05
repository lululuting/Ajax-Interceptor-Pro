var devtoolsScopePort = null;
var devtoolsReconnectTimer = null;

try {
  var inspectedTabId = chrome.devtools && chrome.devtools.inspectedWindow
    ? chrome.devtools.inspectedWindow.tabId
    : null;
  var panelUrl = 'devtools_panel.entry.html';

  function registerDevtoolsScope() {
    if (typeof inspectedTabId !== 'number') {
      return;
    }

    try {
      if (!devtoolsScopePort) {
        devtoolsScopePort = chrome.runtime.connect({ name: 'AJAX_INTERCEPTOR_DEVTOOLS' });
        devtoolsScopePort.onDisconnect.addListener(function() {
          devtoolsScopePort = null;
          scheduleDevtoolsReconnect();
        });
      }

      devtoolsScopePort.postMessage({
        type: 'DEVTOOLS_PANEL_OPENED',
        tabId: inspectedTabId
      });
    } catch (error) {
      devtoolsScopePort = null;
      scheduleDevtoolsReconnect();
    }
  }

  function scheduleDevtoolsReconnect() {
    if (devtoolsReconnectTimer || typeof inspectedTabId !== 'number') {
      return;
    }

    devtoolsReconnectTimer = setTimeout(function() {
      devtoolsReconnectTimer = null;
      registerDevtoolsScope();
    }, 1000);
  }

  if (typeof inspectedTabId === 'number') {
    panelUrl += '?tabId=' + inspectedTabId;
    registerDevtoolsScope();
    setInterval(registerDevtoolsScope, 5000);
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
