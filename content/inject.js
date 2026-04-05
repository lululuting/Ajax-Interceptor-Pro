(function() {
  var originalXHROpen = XMLHttpRequest.prototype.open;
  var originalXHRSend = XMLHttpRequest.prototype.send;
  var originalFetch = window.fetch;

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
      var requestId = 'intercept-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
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
      }, 1200);

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

  XMLHttpRequest.prototype.open = function(method, url) {
    this._interceptMethod = normalizeMethod(method);
    this._interceptUrl = normalizeUrl(url);
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
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

  console.log('[Ajax Interceptor Pro] Injected successfully');
})();
