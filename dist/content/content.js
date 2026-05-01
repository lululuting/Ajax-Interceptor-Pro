(function() {
  var extensionAvailable = true;

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
})();
