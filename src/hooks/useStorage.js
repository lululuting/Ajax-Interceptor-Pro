import { useState, useEffect, useCallback } from 'react';
import { createDefaultGroup, DEFAULT_SETTINGS, normalizeGroups } from '../utils/data';

const DEFAULT_GROUPS = [createDefaultGroup()];

export function useStorage() {
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [hitCounts, setHitCounts] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await chrome.storage.local.get(['groups', 'globalEnabled', 'hitCounts', 'settings']);
      setGroups(normalizeGroups(data.groups || DEFAULT_GROUPS));
      setGlobalEnabled(data.globalEnabled !== false);
      setHitCounts(data.hitCounts || {});
      setSettings(Object.assign({}, DEFAULT_SETTINGS, data.settings || {}));
    } finally {
      setLoading(false);
    }
  }, []);

  const applyPatch = useCallback((patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'groups')) {
      setGroups(normalizeGroups(patch.groups || DEFAULT_GROUPS));
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'globalEnabled')) {
      setGlobalEnabled(patch.globalEnabled !== false);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'hitCounts')) {
      setHitCounts(patch.hitCounts || {});
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'settings')) {
      setSettings(Object.assign({}, DEFAULT_SETTINGS, patch.settings || {}));
    }
  }, []);

  useEffect(() => {
    loadData();
    const listener = (changes, area) => {
      if (area !== 'local') return;
      if (changes.groups) setGroups(normalizeGroups(changes.groups.newValue || DEFAULT_GROUPS));
      if (changes.globalEnabled !== undefined) setGlobalEnabled(changes.globalEnabled.newValue !== false);
      if (changes.hitCounts) setHitCounts(changes.hitCounts.newValue || {});
      if (changes.settings) setSettings(Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue || {}));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [loadData]);

  const save = useCallback(async (patch) => {
    applyPatch(patch);
    await chrome.storage.local.set(patch);
  }, [applyPatch]);

  const saveGroups = useCallback(async (newGroups) => {
    await save({ groups: normalizeGroups(newGroups) });
  }, [save]);

  const saveGlobalEnabled = useCallback(async (val) => {
    await save({ globalEnabled: val });
  }, [save]);

  const saveSettings = useCallback(async (newSettings) => {
    await save({ settings: Object.assign({}, DEFAULT_SETTINGS, settings, newSettings) });
  }, [save, settings]);

  const saveHitCounts = useCallback(async (newHitCounts) => {
    await save({ hitCounts: newHitCounts });
  }, [save]);

  return {
    groups, globalEnabled, hitCounts, settings, loading,
    saveGroups, saveGlobalEnabled, saveSettings, saveHitCounts, save,
    reload: loadData,
  };
}
