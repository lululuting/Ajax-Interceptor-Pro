export function normalizeThemeMode(themeMode) {
  return themeMode === 'light' || themeMode === 'dark' ? themeMode : 'auto';
}

export function resolveThemeMode(themeMode, prefersDark = false) {
  const normalizedMode = normalizeThemeMode(themeMode);
  if (normalizedMode === 'auto') {
    return prefersDark ? 'dark' : 'light';
  }

  return normalizedMode;
}
