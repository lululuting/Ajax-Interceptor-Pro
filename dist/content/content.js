(function() {
  var extensionAvailable = true;
  var syncGeneration = 0;

  function postInterceptorResponse(requestId, response) {
    window.postMessage({
      type: 'AJAX_INTERCEPTOR_RESPONSE',
      requestId: requestId,
      response: response || null
    }, '*');
  }

  function postEnabledToPage(enabled) {
    var nextEnabled = enabled === true;

    try {
      document.documentElement.dispatchEvent(new CustomEvent('AJAX_INTERCEPTOR_SET_ENABLED', {
        detail: { enabled: nextEnabled },
        bubbles: true
      }));
    } catch (error) {
      // ignore
    }

    window.postMessage({
      type: 'AJAX_INTERCEPTOR_SET_ENABLED',
      enabled: nextEnabled
    }, '*');
  }

  function handleExtensionFailure(requestId) {
    extensionAvailable = false;
    syncGeneration += 1;
    postEnabledToPage(false);
    postInterceptorResponse(requestId, null);
  }

  function syncInterceptActive() {
    if (!extensionAvailable) {
      syncGeneration += 1;
      postEnabledToPage(false);
      return;
    }

    var generation = ++syncGeneration;

    try {
      chrome.runtime.sendMessage({
        type: 'GET_INTERCEPT_ACTIVE'
      }, function(response) {
        if (generation !== syncGeneration) {
          return;
        }

        if (chrome.runtime.lastError) {
          extensionAvailable = false;
          postEnabledToPage(false);
          return;
        }

        postEnabledToPage(response && response.active === true);
      });
    } catch (error) {
      if (generation !== syncGeneration) {
        return;
      }

      extensionAvailable = false;
      postEnabledToPage(false);
    }
  }

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'AJAX_INTERCEPTOR_REQUEST') return;

    if (!extensionAvailable) {
      postInterceptorResponse(event.data.requestId, null);
      return;
    }

    try {
      chrome.runtime.sendMessage({
        type: 'GET_RESPONSE',
        url: event.data.url,
        method: event.data.method
      }, function(response) {
        if (chrome.runtime.lastError) {
          handleExtensionFailure(event.data.requestId);
          return;
        }

        postInterceptorResponse(event.data.requestId, response);
      });
    } catch (error) {
      handleExtensionFailure(event.data.requestId);
    }
  });

  chrome.runtime.onMessage.addListener(function(message) {
    if (!message || message.type !== 'AJAX_INTERCEPTOR_ACTIVE_CHANGED') {
      return;
    }

    if (typeof message.active === 'boolean') {
      syncGeneration += 1;
      postEnabledToPage(message.active);
      return;
    }

    syncInterceptActive();
  });

  chrome.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName === 'local') {
      if (changes.globalEnabled) {
        // 弹窗模式下先按最新开关值落页，避免异步确认前仍按旧状态拦截。
        chrome.storage.local.get(['settings'], function(data) {
          var openMode = data && data.settings && data.settings.openMode === 'devtools'
            ? 'devtools'
            : 'popup';

          if (openMode === 'popup') {
            syncGeneration += 1;
            postEnabledToPage(changes.globalEnabled.newValue === true);
          }

          syncInterceptActive();
        });
        return;
      }

      if (changes.settings) {
        syncInterceptActive();
      }
      return;
    }

    if (areaName === 'session') {
      if (
        changes.devtoolsTabEnabled ||
        changes.interceptActiveSignal ||
        changes.devtoolsConnectedAt
      ) {
        syncInterceptActive();
      }
    }
  });

  syncInterceptActive();
})();
