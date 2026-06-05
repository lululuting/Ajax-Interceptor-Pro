import { useState, useEffect, useCallback } from 'react';
import { createDefaultGroup, DEFAULT_SETTINGS, normalizeGroups } from '../utils/data';
import { normalizeHitCounts } from '../utils/hitCounts';

const DEFAULT_GROUPS = [createDefaultGroup()];

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }

      resolve(response);
    });
  });
}

export function useStorage(options = {}) {
  const mode = options.mode === 'devtools' ? 'devtools' : 'popup';
  const contextTabId = typeof options.contextTabId === 'number' ? options.contextTabId : null;
  const hasDevtoolsTabContext = mode === 'devtools' && contextTabId !== null;
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [devtoolsTabState, setDevtoolsTabState] = useState({
    enabled: true,
    connected: false,
  });
  const [hitCounts, setHitCounts] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await chrome.storage.local.get(['groups', 'globalEnabled', 'hitCounts', 'settings']);
      setGroups(normalizeGroups(data.groups || DEFAULT_GROUPS));
      setGlobalEnabled(data.globalEnabled !== false);
      setHitCounts(normalizeHitCounts(data.hitCounts));
      setSettings(Object.assign({}, DEFAULT_SETTINGS, data.settings || {}));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDevtoolsTabState = useCallback(async () => {
    if (!hasDevtoolsTabContext) {
      setDevtoolsTabState({ enabled: true, connected: false });
      return;
    }

    try {
      const response = await sendRuntimeMessage({
        type: 'GET_DEVTOOLS_TAB_STATE',
        tabId: contextTabId,
      });

      setDevtoolsTabState({
        enabled: response?.enabled !== false,
        connected: response?.connected === true,
      });
    } catch (error) {
      setDevtoolsTabState({ enabled: true, connected: false });
    }
  }, [contextTabId, hasDevtoolsTabContext]);

  const applyPatch = useCallback((patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'groups')) {
      setGroups(normalizeGroups(patch.groups || DEFAULT_GROUPS));
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'globalEnabled')) {
      setGlobalEnabled(patch.globalEnabled !== false);
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'hitCounts')) {
      setHitCounts(normalizeHitCounts(patch.hitCounts));
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'settings')) {
      setSettings(Object.assign({}, DEFAULT_SETTINGS, patch.settings || {}));
    }
  }, []);

  useEffect(() => {
    loadData();
    const listener = (changes, area) => {
      if (area === 'session') {
        loadDevtoolsTabState();
        return;
      }

      if (area !== 'local') return;
      if (changes.groups) setGroups(normalizeGroups(changes.groups.newValue || DEFAULT_GROUPS));
      if (changes.globalEnabled !== undefined) setGlobalEnabled(changes.globalEnabled.newValue !== false);
      if (changes.hitCounts) setHitCounts(normalizeHitCounts(changes.hitCounts.newValue));
      if (changes.settings) setSettings(Object.assign({}, DEFAULT_SETTINGS, changes.settings.newValue || {}));
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [loadData, loadDevtoolsTabState]);

  useEffect(() => {
    loadDevtoolsTabState();
  }, [loadDevtoolsTabState]);

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

  const saveDevtoolsTabEnabled = useCallback(async (val) => {
    if (!hasDevtoolsTabContext) {
      return;
    }

    setDevtoolsTabState((current) => ({ ...current, enabled: val }));

    const response = await sendRuntimeMessage({
      type: 'SET_DEVTOOLS_TAB_ENABLED',
      tabId: contextTabId,
      enabled: val,
    });

    setDevtoolsTabState({
      enabled: response?.enabled !== false,
      connected: response?.connected === true,
    });
  }, [contextTabId, hasDevtoolsTabContext]);

  const saveSettings = useCallback(async (newSettings) => {
    // 设置项会持续扩展，这里始终按默认值 + 当前值 + 新补丁合并，避免互相覆盖。
    await save({ settings: Object.assign({}, DEFAULT_SETTINGS, settings, newSettings) });
  }, [save, settings]);

  const saveHitCounts = useCallback(async (newHitCounts) => {
    await save({ hitCounts: normalizeHitCounts(newHitCounts) });
  }, [save]);

  return {
    groups,
    globalEnabled,
    devtoolsTabEnabled: devtoolsTabState.enabled,
    devtoolsTabConnected: devtoolsTabState.connected,
    interceptEnabled: hasDevtoolsTabContext ? devtoolsTabState.enabled : globalEnabled,
    hitCounts,
    settings,
    loading,
    saveGroups,
    saveGlobalEnabled,
    saveDevtoolsTabEnabled,
    saveInterceptEnabled: hasDevtoolsTabContext ? saveDevtoolsTabEnabled : saveGlobalEnabled,
    saveSettings,
    saveHitCounts,
    save,
    reload: loadData,
  };
}
