// Content script - injects the interceptor into the page
(function() {
  var extensionAvailable = true;
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  function postInterceptorResponse(requestId, response) {
    window.postMessage({
      type: 'AJAX_INTERCEPTOR_RESPONSE',
      requestId: requestId,
      response: response || null
    }, '*');
  }

  function handleExtensionFailure(requestId) {
    extensionAvailable = false;
    postInterceptorResponse(requestId, null);
  }

  // Listen for messages from the injected script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data.type && event.data.type === 'AJAX_INTERCEPTOR_REQUEST') {
      if (!extensionAvailable) {
        postInterceptorResponse(event.data.requestId, null);
        return;
      }

      // Forward to background script
      try {
        chrome.runtime.sendMessage({
          type: 'GET_RESPONSE',
          url: event.data.url,
          method: event.data.method
        }, response => {
          if (chrome.runtime.lastError) {
            handleExtensionFailure(event.data.requestId);
            return;
          }

          postInterceptorResponse(event.data.requestId, response);
        });
      } catch (error) {
        handleExtensionFailure(event.data.requestId);
      }
    }
  });
})();
