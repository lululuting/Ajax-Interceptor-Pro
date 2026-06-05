import '../../libs/url-match.js';

export function genId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function matchUrl(url, pattern) {
  return globalThis.UrlMatcher.matchUrl(url, pattern);
}
