(function() {
  if (window.__ajaxInterceptorProInjected) {
    return;
  }

  Object.defineProperty(window, '__ajaxInterceptorProInjected', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  var REQUEST_TIMEOUT_MS = 3000;
  var hooksInstalled = false;
  var interceptEnabled = false;
  var originalXHROpen = null;
  var originalXHRSend = null;
  var originalFetch = null;
  var patchedXHROpen = null;
  var patchedXHRSend = null;
  var patchedFetch = null;

  function normalizeMethod(method) {
    return String(method || 'GET').toUpperCase();
  }

  function normalizeUrl(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch (error) {
      return String(url || '');
    }
  }

  function requestIntercept(url, method) {
    return new Promise(function(resolve) {
      var requestId = 'intercept-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
      var finished = false;
      var timeoutId = null;

      function cleanup() {
        window.removeEventListener('message', onInterceptorMessage);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timeoutId = null;
        }
      }

      function finish(response) {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(response || null);
      }

      function onInterceptorMessage(event) {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== 'AJAX_INTERCEPTOR_RESPONSE') return;
        if (event.data.requestId !== requestId) return;

        finish(event.data.response);
      }

      window.addEventListener('message', onInterceptorMessage);
      timeoutId = window.setTimeout(function() {
        finish(null);
      }, REQUEST_TIMEOUT_MS);

      window.postMessage({
        type: 'AJAX_INTERCEPTOR_REQUEST',
        requestId: requestId,
        url: normalizeUrl(url),
        method: normalizeMethod(method)
      }, '*');
    });
  }

  function toResponseText(data) {
    return typeof data === 'string' ? data : JSON.stringify(data);
  }

  function toFetchResponse(resp) {
    var body = toResponseText(resp.data);
    var headers = new Headers({ 'Content-Type': 'application/json' });
    var contentType = resp.contentType || resp.mimeType;

    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    return new Response(new Blob([body], { type: headers.get('Content-Type') || 'application/json' }), {
      status: resp.status || 200,
      statusText: 'OK',
      headers: headers
    });
  }

  function toXhrResponseBody(xhr, text, rawData) {
    if (xhr.responseType === 'json') {
      if (typeof rawData === 'string') {
        try {
          return JSON.parse(rawData);
        } catch (error) {
          return null;
        }
      }
      return rawData;
    }

    if (xhr.responseType === 'arraybuffer') {
      return new TextEncoder().encode(text).buffer;
    }

    if (xhr.responseType === 'blob') {
      return new Blob([text], { type: 'application/json' });
    }

    return text;
  }

  function mockXhrResponse(xhr, response, url) {
    var readyState = 1;
    var status = response.status || 200;
    var responseText = toResponseText(response.data);
    var responseBody = toXhrResponseBody(xhr, responseText, response.data);

    Object.defineProperty(xhr, 'readyState', {
      get: function() { return readyState; },
      configurable: true
    });
    Object.defineProperty(xhr, 'status', {
      get: function() { return status; },
      configurable: true
    });
    Object.defineProperty(xhr, 'statusText', {
      get: function() { return 'OK'; },
      configurable: true
    });
    Object.defineProperty(xhr, 'responseText', {
      get: function() { return responseText; },
      configurable: true
    });
    Object.defineProperty(xhr, 'response', {
      get: function() { return responseBody; },
      configurable: true
    });
    Object.defineProperty(xhr, 'responseURL', {
      get: function() { return url; },
      configurable: true
    });

    setTimeout(function() {
      readyState = 2;
      xhr.dispatchEvent(new Event('readystatechange'));
      readyState = 3;
      xhr.dispatchEvent(new Event('readystatechange'));
      readyState = 4;
      xhr.dispatchEvent(new Event('readystatechange'));
      xhr.dispatchEvent(new Event('load'));
      xhr.dispatchEvent(new Event('loadend'));
    }, 0);
  }

  function installHooks() {
    // 已经是我们的包装且仍挂在最外层时，无需重装。
    if (
      hooksInstalled &&
      XMLHttpRequest.prototype.open === patchedXHROpen &&
      XMLHttpRequest.prototype.send === patchedXHRSend &&
      window.fetch === patchedFetch
    ) {
      return;
    }

    originalXHROpen = XMLHttpRequest.prototype.open;
    originalXHRSend = XMLHttpRequest.prototype.send;
    originalFetch = window.fetch;

    patchedXHROpen = function(method, url) {
      this._interceptMethod = normalizeMethod(method);
      this._interceptUrl = normalizeUrl(url);
      return originalXHROpen.apply(this, arguments);
    };

    patchedXHRSend = function() {
      var xhr = this;
      var args = arguments;

      if (!interceptEnabled) {
        return originalXHRSend.apply(xhr, args);
      }

      var url = xhr._interceptUrl || '';
      var method = xhr._interceptMethod || 'GET';

      requestIntercept(url, method)
        .then(function(resp) {
          if (!interceptEnabled) {
            originalXHRSend.apply(xhr, args);
            return;
          }

          if (resp && resp.data !== undefined && resp.data !== null) {
            mockXhrResponse(xhr, resp, url);
            return;
          }

          originalXHRSend.apply(xhr, args);
        })
        .catch(function() {
          originalXHRSend.apply(xhr, args);
        });
    };

    patchedFetch = function(input, options) {
      if (!interceptEnabled) {
        return originalFetch(input, options);
      }

      var urlString = typeof input === 'string'
        ? input
        : (input instanceof URL ? input.href : input.url);
      var method = options && options.method
        ? options.method
        : (input && input.method ? input.method : 'GET');

      return requestIntercept(urlString, method)
        .then(function(resp) {
          if (!interceptEnabled) {
            return originalFetch(input, options);
          }

          if (resp && resp.data !== undefined && resp.data !== null) {
            return toFetchResponse(resp);
          }

          return originalFetch(input, options);
        })
        .catch(function() {
          return originalFetch(input, options);
        });
    };

    XMLHttpRequest.prototype.open = patchedXHROpen;
    XMLHttpRequest.prototype.send = patchedXHRSend;
    window.fetch = patchedFetch;
    hooksInstalled = true;
  }

  function setEnabled(enabled) {
    if (enabled) {
      // 开启时强制确保补丁仍在最外层，避免页面又盖回原生 API 后开关无效。
      installHooks();
      interceptEnabled = true;
      return;
    }

    interceptEnabled = false;
  }

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'AJAX_INTERCEPTOR_SET_ENABLED') return;
    setEnabled(event.data.enabled === true);
  });

  installHooks();
})();
