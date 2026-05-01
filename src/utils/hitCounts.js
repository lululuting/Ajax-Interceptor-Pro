function isObjectRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeHitCounts(hitCounts) {
  if (!isObjectRecord(hitCounts)) {
    return {};
  }

  const normalized = {};

  Object.entries(hitCounts).forEach(([tabId, tabCounts]) => {
    if (!isObjectRecord(tabCounts)) {
      return;
    }

    const nextTabCounts = {};

    Object.entries(tabCounts).forEach(([ruleId, count]) => {
      const nextCount = Math.floor(Number(count));
      if (!Number.isFinite(nextCount) || nextCount <= 0) {
        return;
      }

      nextTabCounts[ruleId] = nextCount;
    });

    if (Object.keys(nextTabCounts).length > 0) {
      normalized[String(tabId)] = nextTabCounts;
    }
  });

  return normalized;
}

export function buildDisplayHitCounts(hitCounts, mode, contextTabId) {
  const normalized = normalizeHitCounts(hitCounts);

  if (mode === 'devtools') {
    if (typeof contextTabId !== 'number') {
      return {};
    }

    return normalized[String(contextTabId)] || {};
  }

  const merged = {};

  Object.values(normalized).forEach((tabCounts) => {
    Object.entries(tabCounts).forEach(([ruleId, count]) => {
      merged[ruleId] = (merged[ruleId] || 0) + count;
    });
  });

  return merged;
}

export function removeRuleHitCounts(hitCounts, ruleId) {
  const normalized = normalizeHitCounts(hitCounts);
  const nextHitCounts = {};

  Object.entries(normalized).forEach(([tabId, tabCounts]) => {
    const nextTabCounts = { ...tabCounts };
    delete nextTabCounts[ruleId];

    if (Object.keys(nextTabCounts).length > 0) {
      nextHitCounts[tabId] = nextTabCounts;
    }
  });

  return nextHitCounts;
}
