import { useState, useEffect, useCallback } from 'react';

const DEFAULT_GROUPS = [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }];
const DEFAULT_SETTINGS = { showHitCount: true, enableAnimations: true, openMode: 'popup' };

export function useStorage() {
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [hitCounts, setHitCounts] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const data = await chrome.storage.local.get(['groups', 'globalEnabled', 'hitCounts', 'settings']);
    setGroups(data.groups || DEFAULT_GROUPS);
    setGlobalEnabled(data.globalEnabled !== false);
    setHitCounts(data.hitCounts || {});
    setSettings(Object.assign({}, DEFAULT_SETTINGS, data.settings || {}));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const listener = (changes, area) => {
      if (area !== 'local') return;
      if (changes.groups) setGroups(changes.groups.newValue || DEFAULT_GROUPS);
      if (changes.globalEnabled !== undefined) setGlobalEnabled(changes.globalEnabled.newValue !== false);
      if (changes.hitCounts) setHitCounts(changes.hitCounts.newValue || {});
      if (changes.settings) setSettings(Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue || {}));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [loadData]);

  const save = useCallback(async (patch) => {
    await chrome.storage.local.set(patch);
  }, []);

  const saveGroups = useCallback(async (newGroups) => {
    setGroups(newGroups);
    await chrome.storage.local.set({ groups: newGroups });
  }, []);

  const saveGlobalEnabled = useCallback(async (val) => {
    setGlobalEnabled(val);
    await chrome.storage.local.set({ globalEnabled: val });
  }, []);

  const saveSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await chrome.storage.local.set({ settings: newSettings });
  }, []);

  const saveHitCounts = useCallback(async (newHitCounts) => {
    setHitCounts(newHitCounts);
    await chrome.storage.local.set({ hitCounts: newHitCounts });
  }, []);

  return {
    groups, globalEnabled, hitCounts, settings, loading,
    saveGroups, saveGlobalEnabled, saveSettings, saveHitCounts, save,
    reload: loadData,
  };
}
