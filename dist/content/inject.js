(function() {
  var originalXHROpen = XMLHttpRequest.prototype.open;
  var originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._interceptMethod = method;
    this._interceptUrl = url;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    var xhr = this;
    var url = xhr._interceptUrl || '';
    var method = xhr._interceptMethod || 'GET';
    var requestId = 'xhr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Save original callbacks
    var _onreadystatechange = xhr.onreadystatechange;
    var _onload = xhr.onload;
    var _onerror = xhr.onerror;

    // Block real response propagation until we decide
    var intercepted = false;

    // Temporarily suppress real callbacks
    xhr.onreadystatechange = null;
    xhr.onload = null;
    xhr.onerror = null;

    // Listen for interceptor response
    function onInterceptorMessage(event) {
      if (event.source !== window) return;
      if (event.data.type !== 'AJAX_INTERCEPTOR_RESPONSE') return;
      if (event.data.requestId !== requestId) return;

      window.removeEventListener('message', onInterceptorMessage);

      var resp = event.data.response;
      if (resp && resp.data !== undefined && resp.data !== null) {
        intercepted = true;
        // Abort the real request silently
        try { xhr.abort(); } catch(e) {}

        // Restore original callbacks so they fire with mock data
        xhr.onreadystatechange = _onreadystatechange;
        xhr.onload = _onload;
        xhr.onerror = _onerror;

        // Create a mock response via a completed fake XHR state
        // Override response properties
        Object.defineProperty(xhr, 'readyState', { get: function() { return 4; }, configurable: true });
        Object.defineProperty(xhr, 'status', { get: function() { return resp.status || 200; }, configurable: true });
        Object.defineProperty(xhr, 'statusText', { get: function() { return 'OK'; }, configurable: true });
        var responseText = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
        Object.defineProperty(xhr, 'responseText', { get: function() { return responseText; }, configurable: true });
        Object.defineProperty(xhr, 'response', { get: function() { return responseText; }, configurable: true });

        if (_onreadystatechange) {
          try { _onreadystatechange.call(xhr); } catch(e) {}
        }
        if (_onload) {
          try { _onload.call(xhr); } catch(e) {}
        }
      } else {
        // No interception: restore callbacks and let real request proceed
        xhr.onreadystatechange = _onreadystatechange;
        xhr.onload = _onload;
        xhr.onerror = _onerror;
      }
    }

    window.addEventListener('message', onInterceptorMessage);

    // Send the real request
    originalXHRSend.apply(xhr, arguments);

    // Ask interceptor
    window.postMessage({
      type: 'AJAX_INTERCEPTOR_REQUEST',
      requestId: requestId,
      url: url,
      method: method
    }, '*');

    // Timeout: if no interceptor response within 100ms, restore callbacks
    setTimeout(function() {
      if (!intercepted) {
        window.removeEventListener('message', onInterceptorMessage);
        xhr.onreadystatechange = _onreadystatechange;
        xhr.onload = _onload;
        xhr.onerror = _onerror;
      }
    }, 100);
  };

  // --- Fetch interception ---
  var originalFetch = window.fetch;
  window.fetch = function(input, options) {
    return new Promise(function(resolve, reject) {
      var urlString = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
      var method = (options && options.method) ? options.method.toUpperCase() : 'GET';
      var requestId = 'fetch-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      var done = false;

      var listener = function(event) {
        if (event.source !== window) return;
        if (event.data.type !== 'AJAX_INTERCEPTOR_RESPONSE') return;
        if (event.data.requestId !== requestId) return;

        window.removeEventListener('message', listener);
        done = true;

        var resp = event.data.response;
        if (resp && resp.data !== undefined && resp.data !== null) {
          var body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
          var blob = new Blob([body], { type: 'application/json' });
          var response = new Response(blob, {
            status: resp.status || 200,
            statusText: 'OK',
            headers: new Headers({ 'Content-Type': 'application/json' })
          });
          resolve(response);
        } else {
          originalFetch(input, options).then(resolve).catch(reject);
        }
      };

      window.addEventListener('message', listener);

      window.postMessage({
        type: 'AJAX_INTERCEPTOR_REQUEST',
        requestId: requestId,
        url: urlString,
        method: method
      }, '*');

      setTimeout(function() {
        if (!done) {
          window.removeEventListener('message', listener);
          originalFetch(input, options).then(resolve).catch(reject);
        }
      }, 100);
    });
  };

  console.log('[Ajax Interceptor Pro] Injected successfully');
})();
