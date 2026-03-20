// Injected script - runs in the page context to intercept AJAX
(function() {
  'use strict';

  let requestIdCounter = 0;
  const pendingRequests = new Map();

  // Store original methods
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalFetch = window.fetch;

  // Intercept XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._interceptMethod = method;
    this._interceptUrl = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const requestId = ++requestIdCounter;

    // Listen for the message response
    const listener = function(event) {
      if (event.source !== window) return;
      if (event.data.type === 'AJAX_INTERCEPTOR_RESPONSE' && 
          event.data.requestId === requestId) {
        window.removeEventListener('message', listener);
        
        if (event.data.response) {
          // Override the response
          Object.defineProperty(xhr, 'responseText', {
            get: function() { return event.data.response.data; },
            configurable: true
          });
          Object.defineProperty(xhr, 'response', {
            get: function() { return event.data.response.data; },
            configurable: true
          });
          Object.defineProperty(xhr, 'status', {
            get: function() { return event.data.response.status || 200; },
            configurable: true
          });
        }
      }
    };
    window.addEventListener('message', listener);

    // Request interception data from content script
    window.postMessage({
      type: 'AJAX_INTERCEPTOR_REQUEST',
      requestId: requestId,
      url: this._interceptUrl,
      method: this._interceptMethod
    }, '*');

    return originalXHRSend.apply(this, arguments);
  };

  // Intercept Fetch API
  window.fetch = function(url, options = {}) {
    const requestId = ++requestIdCounter;
    const method = options.method || 'GET';
    const urlString = typeof url === 'string' ? url : url.url;

    return new Promise((resolve, reject) => {
      const listener = function(event) {
        if (event.source !== window) return;
        if (event.data.type === 'AJAX_INTERCEPTOR_RESPONSE' && 
            event.data.requestId === requestId) {
          window.removeEventListener('message', listener);
          
          if (event.data.response) {
            // Create a new Response with the intercepted data
            const blob = new Blob([event.data.response.data], { 
              type: 'application/json' 
            });
            const response = new Response(blob, {
              status: event.data.response.status || 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            });
            resolve(response);
          } else {
            // No interception, use original fetch
            originalFetch(url, options).then(resolve).catch(reject);
          }
        }
      };
      window.addEventListener('message', listener);

      // Request interception data
      window.postMessage({
        type: 'AJAX_INTERCEPTOR_REQUEST',
        requestId: requestId,
        url: urlString,
        method: method
      }, '*');

      // Timeout fallback to original fetch
      setTimeout(() => {
        window.removeEventListener('message', listener);
        originalFetch(url, options).then(resolve).catch(reject);
      }, 100);
    });
  };

  console.log('[Ajax Interceptor Pro] Injected successfully');
})();
