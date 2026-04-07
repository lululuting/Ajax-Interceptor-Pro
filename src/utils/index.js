export function genId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getUrlMatchCandidates(url) {
  const value = String(url || '');
  const candidates = [value];

  try {
    const parsed = new URL(value);
    candidates.push(parsed.href);
    candidates.push(parsed.pathname + parsed.search + parsed.hash);
    candidates.push(parsed.pathname + parsed.search);
    candidates.push(parsed.pathname);
    candidates.push(parsed.host + parsed.pathname + parsed.search);
  } catch (error) {}

  return candidates.filter((candidate, index, list) => !!candidate && list.indexOf(candidate) === index);
}

export function matchUrl(url, pattern) {
  if (!pattern) return false;
  const text = String(pattern || '').trim();
  if (!text) return false;

  const regexPattern = '^' + text
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\\\?/g, '.') + '$';
  const matcher = new RegExp(regexPattern, 'i');

  return getUrlMatchCandidates(url).some((candidate) => matcher.test(candidate));
}
