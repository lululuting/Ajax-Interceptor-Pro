// Content script - injects the interceptor into the page
(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/inject.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from the injected script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (event.data.type && event.data.type === 'AJAX_INTERCEPTOR_REQUEST') {
      // Forward to background script
      chrome.runtime.sendMessage({
        type: 'GET_RESPONSE',
        url: event.data.url,
        method: event.data.method
      }, response => {
        window.postMessage({
          type: 'AJAX_INTERCEPTOR_RESPONSE',
          requestId: event.data.requestId,
          response: response
        }, '*');
      });
    }
  });
})();
