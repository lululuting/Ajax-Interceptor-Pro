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

  var originalXHROpen = XMLHttpRequest.prototype.open;
  var originalXHRSend = XMLHttpRequest.prototype.send;
  var originalFetch = window.fetch;
  var REQUEST_TIMEOUT_MS = 1200;

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
    return requestInterceptDirect(normalizeUrl(url), normalizeMethod(method));
  }

  function requestInterceptDirect(url, method) {
    return new Promise(function(resolve, reject) {
      var runtime = typeof chrome !== 'undefined' ? chrome.runtime : null;
      if (
        !runtime ||
        typeof runtime.sendMessage !== 'function'
      ) {
        reject(new Error('runtime-unavailable'));
        return;
      }

      var finished = false;
      var timeoutId = window.setTimeout(function() {
        if (finished) return;
        finished = true;
        reject(new Error('runtime-timeout'));
      }, REQUEST_TIMEOUT_MS);

      try {
        runtime.sendMessage({
          type: 'GET_RESPONSE',
          url: url,
          method: method
        }, function(response) {
          if (finished) return;
          finished = true;
          window.clearTimeout(timeoutId);

          if (runtime.lastError) {
            reject(new Error(runtime.lastError.message || 'runtime-error'));
            return;
          }

          resolve(response || null);
        });
      } catch (error) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeoutId);
        reject(error);
      }
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

  XMLHttpRequest.prototype.open = function(method, url) {
    this._interceptMethod = normalizeMethod(method);
    this._interceptUrl = normalizeUrl(url);
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    var xhr = this;
    var url = xhr._interceptUrl || '';
    var method = xhr._interceptMethod || 'GET';
    var args = arguments;

    requestIntercept(url, method)
      .then(function(resp) {
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

  window.fetch = function(input, options) {
    var urlString = typeof input === 'string'
      ? input
      : (input instanceof URL ? input.href : input.url);
    var method = options && options.method
      ? options.method
      : (input && input.method ? input.method : 'GET');

    return requestIntercept(urlString, method)
      .then(function(resp) {
        if (resp && resp.data !== undefined && resp.data !== null) {
          return toFetchResponse(resp);
        }

        return originalFetch(input, options);
      })
      .catch(function() {
        return originalFetch(input, options);
      });
  };
})();
