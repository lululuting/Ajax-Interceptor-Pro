(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UrlMatcher = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function escapeRegExp(value) {
    return String(value).replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }

  function hasWildcard(value) {
    return /[*?]/.test(value);
  }

  function normalizePathPattern(value) {
    return value.charAt(0) === '/' ? value : '/' + value;
  }

  function getUrlMatchCandidates(url) {
    var value = String(url || '');
    var candidates = [value];

    try {
      var parsed = new URL(value);
      candidates.push(parsed.href);
      candidates.push(parsed.pathname + parsed.search + parsed.hash);
      candidates.push(parsed.pathname + parsed.search);
      candidates.push(parsed.pathname);
      candidates.push(parsed.host + parsed.pathname + parsed.search);
      candidates.push(parsed.host + parsed.pathname);
    } catch (error) {}

    return candidates.filter(function(candidate, index, list) {
      return !!candidate && list.indexOf(candidate) === index;
    });
  }

  function wildcardToRegExp(pattern, options) {
    var flags = options && options.caseSensitive ? '' : 'i';
    var regexPattern = '^' + escapeRegExp(pattern)
      .replace(/\*/g, '.*')
      .replace(/\\\?/g, '.') + '$';
    return new RegExp(regexPattern, flags);
  }

  function regexLiteralToRegExp(pattern) {
    var lastSlash = pattern.lastIndexOf('/');
    if (pattern.charAt(0) !== '/' || lastSlash <= 0) {
      return null;
    }

    var body = pattern.slice(1, lastSlash);
    var flags = pattern.slice(lastSlash + 1) || 'i';
    if (!/^[dgimsuvy]*$/.test(flags)) {
      return null;
    }

    try {
      return new RegExp(body, flags);
    } catch (error) {
      return null;
    }
  }

  function isLikelyPathPattern(pattern) {
    return pattern.charAt(0) === '/' || /^[A-Za-z0-9._~-]+(?:\/|$)/.test(pattern);
  }

  function matchUrl(url, pattern) {
    if (!pattern) return false;
    var text = String(pattern || '').trim();
    if (!text) return false;

    var candidates = getUrlMatchCandidates(url);
    var regexLiteral = regexLiteralToRegExp(text);
    if (regexLiteral) {
      return candidates.some(function(candidate) {
        return regexLiteral.test(candidate);
      });
    }

    if (hasWildcard(text)) {
      var matcher = wildcardToRegExp(text);
      return candidates.some(function(candidate) {
        return matcher.test(candidate);
      });
    }

    var lowerText = text.toLowerCase();

    if (/^https?:\/\//i.test(text)) {
      return candidates.some(function(candidate) {
        return candidate.toLowerCase() === lowerText;
      });
    }

    if (isLikelyPathPattern(text)) {
      var normalizedPath = normalizePathPattern(text).toLowerCase();
      return candidates.some(function(candidate) {
        var lowerCandidate = candidate.toLowerCase();
        return lowerCandidate === normalizedPath ||
          lowerCandidate.indexOf(normalizedPath + '/') === 0 ||
          lowerCandidate.indexOf(normalizedPath + '?') === 0 ||
          lowerCandidate.indexOf(normalizedPath + '#') === 0 ||
          lowerCandidate.indexOf(normalizedPath) >= 0;
      });
    }

    return candidates.some(function(candidate) {
      return candidate.toLowerCase().indexOf(lowerText) >= 0;
    });
  }

  return {
    getUrlMatchCandidates: getUrlMatchCandidates,
    matchUrl: matchUrl
  };
});
