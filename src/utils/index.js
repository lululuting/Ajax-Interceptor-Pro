export function genId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function matchUrl(url, pattern) {
  if (!pattern) return false;
  const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    return new RegExp(regexPattern, 'i').test(url);
  } catch (e) {
    return url.indexOf(pattern) !== -1;
  }
}
