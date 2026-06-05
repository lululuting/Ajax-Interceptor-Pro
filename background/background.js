importScripts('../libs/storage-normalizer.js', '../libs/url-match.js');

// Background service worker

var stateCache = {
  groups: [],
  globalEnabled: true,
  hitCounts: {},
  settings: {
    openMode: 'popup'
  }
};
var stateCachePromise = null;
var hitCountFlushTimer = null;
var hitCountsDirty = false;
var popupWindowId = null;
var devtoolsPortsByTabId = new Map();
var devtoolsTabEnabled = {};
var devtoolsTabEnabledPromise = null;
var POPUP_WINDOW_URL = 'popup.entry.html';
var POPUP_WINDOW_WIDTH = 820;
var POPUP_WINDOW_HEIGHT = 680;
var DEVTOOLS_TAB_ENABLED_KEY = 'devtoolsTabEnabled';

function normalizeStoredHitCounts(hitCounts) {
  var source = hitCounts && typeof hitCounts === 'object' && !Array.isArray(hitCounts) ? hitCounts : {};
  var normalized = {};
  var changed = source !== hitCounts;

  Object.keys(source).forEach(function(tabId) {
    var tabCounts = source[tabId];
    if (!tabCounts || typeof tabCounts !== 'object' || Array.isArray(tabCounts)) {
      changed = true;
      return;
    }

    var nextTabCounts = {};

    Object.keys(tabCounts).forEach(function(ruleId) {
      var count = Math.floor(Number(tabCounts[ruleId]));
      if (!Number.isFinite(count) || count <= 0) {
        changed = true;
        return;
      }

      nextTabCounts[ruleId] = count;

      if (tabCounts[ruleId] !== count) {
        changed = true;
      }
    });

    if (Object.keys(nextTabCounts).length > 0) {
      normalized[String(tabId)] = nextTabCounts;
    } else if (Object.keys(tabCounts).length > 0) {
      changed = true;
    }
  });

  return {
    hitCounts: normalized,
    changed: changed
  };
}

function getSenderTabId(sender) {
  return sender && sender.tab && typeof sender.tab.id === 'number' ? sender.tab.id : null;
}

function normalizeBooleanMap(value) {
  var source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  var normalized = {};

  Object.keys(source).forEach(function(key) {
    if (source[key] === false) {
      normalized[String(key)] = false;
    }
  });

  return normalized;
}

function getActiveMode() {
  var settings = (stateCache && stateCache.settings) || {};
  return settings.openMode === 'devtools' ? 'devtools' : 'popup';
}

function canInterceptSender(sender) {
  if (getActiveMode() !== 'devtools') {
    return true;
  }

  var senderTabId = getSenderTabId(sender);
  if (senderTabId === null) {
    return false;
  }

  return devtoolsPortsByTabId.has(senderTabId);
}

async function readDevtoolsTabEnabledMap(force) {
  if (!chrome.storage || !chrome.storage.session) {
    return devtoolsTabEnabled;
  }

  if (!force && devtoolsTabEnabledPromise) {
    return devtoolsTabEnabledPromise;
  }

  devtoolsTabEnabledPromise = chrome.storage.session
    .get([DEVTOOLS_TAB_ENABLED_KEY])
    .then(function(data) {
      devtoolsTabEnabled = normalizeBooleanMap(data[DEVTOOLS_TAB_ENABLED_KEY]);
      return devtoolsTabEnabled;
    })
    .catch(function(error) {
      console.warn('读取当前页拦截开关失败:', error);
      return devtoolsTabEnabled;
    });

  return devtoolsTabEnabledPromise;
}

async function isDevtoolsTabEnabled(tabId) {
  if (typeof tabId !== 'number') {
    return false;
  }

  var enabledMap = await readDevtoolsTabEnabledMap();
  return enabledMap[String(tabId)] !== false;
}

async function setDevtoolsTabEnabled(tabId, enabled) {
  if (typeof tabId !== 'number') {
    return { enabled: false, connected: false };
  }

  await readDevtoolsTabEnabledMap();
  var tabKey = String(tabId);
  var nextEnabledMap = Object.assign({}, devtoolsTabEnabled);

  if (enabled === false) {
    nextEnabledMap[tabKey] = false;
  } else {
    delete nextEnabledMap[tabKey];
  }

  devtoolsTabEnabled = nextEnabledMap;
  devtoolsTabEnabledPromise = Promise.resolve(devtoolsTabEnabled);

  if (chrome.storage && chrome.storage.session) {
    await chrome.storage.session.set({
      [DEVTOOLS_TAB_ENABLED_KEY]: devtoolsTabEnabled
    });
  }

  return {
    enabled: devtoolsTabEnabled[tabKey] !== false,
    connected: devtoolsPortsByTabId.has(tabId)
  };
}

async function getDevtoolsTabState(tabId) {
  return {
    enabled: await isDevtoolsTabEnabled(tabId),
    connected: typeof tabId === 'number' && devtoolsPortsByTabId.has(tabId)
  };
}

function incrementRuleHitCount(tabId, ruleId) {
  if (typeof tabId !== 'number' || !ruleId) {
    return;
  }

  var tabKey = String(tabId);
  var tabCounts = stateCache.hitCounts[tabKey];

  if (!tabCounts) {
    tabCounts = {};
    stateCache.hitCounts[tabKey] = tabCounts;
  }

  tabCounts[ruleId] = (tabCounts[ruleId] || 0) + 1;
  scheduleHitCountsFlush();
}

function clearHitCountsForTab(tabId) {
  if (typeof tabId !== 'number') {
    return;
  }

  var tabKey = String(tabId);
  if (!Object.prototype.hasOwnProperty.call(stateCache.hitCounts, tabKey)) {
    return;
  }

  delete stateCache.hitCounts[tabKey];
  scheduleHitCountsFlush();
}

async function resetHitCounts() {
  stateCache.hitCounts = {};
  hitCountsDirty = false;
  await chrome.storage.local.set({ hitCounts: {} });
}

async function hydrateStateCache(force) {
  if (!force && stateCachePromise) {
    return stateCachePromise;
  }

  stateCachePromise = chrome.storage.local
    .get(['groups', 'globalEnabled', 'hitCounts', 'settings'])
    .then(async function(data) {
      var normalizedGroups = StorageNormalizer.normalizeGroupsWithMeta(data.groups || []);
      var normalizedHitCounts = normalizeStoredHitCounts(data.hitCounts);
      var nextSettings = data.settings || { openMode: 'popup' };

      stateCache = {
        groups: normalizedGroups.groups,
        globalEnabled: data.globalEnabled !== false,
        hitCounts: normalizedHitCounts.hitCounts,
        settings: nextSettings
      };

      if (normalizedGroups.changed || normalizedHitCounts.changed) {
        var patch = {};

        if (normalizedGroups.changed) {
          patch.groups = normalizedGroups.groups;
        }

        if (normalizedHitCounts.changed) {
          patch.hitCounts = normalizedHitCounts.hitCounts;
        }

        await chrome.storage.local.set(patch);
      }

      return stateCache;
    })
    .catch(function(error) {
      console.error('读取拦截缓存失败:', error);
      return stateCache;
    });

  return stateCachePromise;
}

function scheduleHitCountsFlush() {
  // 命中计数在页面级别维护，集中写回可以减少 storage 抖动。
  hitCountsDirty = true;

  if (hitCountFlushTimer) {
    return;
  }

  hitCountFlushTimer = setTimeout(async function() {
    hitCountFlushTimer = null;

    if (!hitCountsDirty) {
      return;
    }

    hitCountsDirty = false;

    try {
      await chrome.storage.local.set({ hitCounts: stateCache.hitCounts });
    } catch (error) {
      hitCountsDirty = true;
      console.error('写入命中计数失败:', error);
    }
  }, 240);
}

async function applyModeToAction(mode) {
  var effectiveMode = mode === 'devtools' ? 'devtools' : 'popup';
  var popupPath = effectiveMode === 'devtools' ? 'popup/mode-hint.html' : '';
  await chrome.action.setPopup({ popup: popupPath });
}

async function persistPopupWindowId(windowId) {
  popupWindowId = typeof windowId === 'number' ? windowId : null;

  if (!chrome.storage || !chrome.storage.session) {
    return;
  }

  if (popupWindowId === null) {
    await chrome.storage.session.remove('popupWindowId');
    return;
  }

  await chrome.storage.session.set({ popupWindowId: popupWindowId });
}

async function readPopupWindowId() {
  if (typeof popupWindowId === 'number') {
    return popupWindowId;
  }

  if (!chrome.storage || !chrome.storage.session) {
    return null;
  }

  try {
    var sessionData = await chrome.storage.session.get(['popupWindowId']);
    popupWindowId = typeof sessionData.popupWindowId === 'number' ? sessionData.popupWindowId : null;
  } catch (error) {
    popupWindowId = null;
  }

  return popupWindowId;
}

async function getPopupWindowBounds() {
  var bounds = {
    width: POPUP_WINDOW_WIDTH,
    height: POPUP_WINDOW_HEIGHT
  };

  try {
    var currentWindow = await chrome.windows.getLastFocused();
    if (
      typeof currentWindow.left !== 'number' ||
      typeof currentWindow.top !== 'number' ||
      typeof currentWindow.width !== 'number' ||
      typeof currentWindow.height !== 'number'
    ) {
      return bounds;
    }

    bounds.left = Math.max(currentWindow.left, currentWindow.left + Math.round((currentWindow.width - bounds.width) / 2));
    bounds.top = Math.max(currentWindow.top, currentWindow.top + Math.round((currentWindow.height - bounds.height) / 2));
  } catch (error) {
    console.warn('获取小窗位置失败:', error);
  }

  return bounds;
}

async function openPopupWindow() {
  // 小窗模式优先复用已有窗口，避免每点一次图标就新开一个实例。
  var currentPopupWindowId = await readPopupWindowId();

  if (typeof currentPopupWindowId === 'number') {
    try {
      await chrome.windows.update(currentPopupWindowId, {
        focused: true,
        state: 'normal'
      });
      return;
    } catch (error) {
      await persistPopupWindowId(null);
    }
  }

  var bounds = await getPopupWindowBounds();
  var popupWindow = await chrome.windows.create({
    url: chrome.runtime.getURL(POPUP_WINDOW_URL),
    type: 'popup',
    focused: true,
    width: bounds.width,
    height: bounds.height,
    left: bounds.left,
    top: bounds.top
  });

  if (popupWindow && typeof popupWindow.id === 'number') {
    await persistPopupWindowId(popupWindow.id);
  }
}

async function syncActionPopupFromSettings() {
  try {
    var data = await chrome.storage.local.get(['settings']);
    var settings = data.settings || { openMode: 'popup' };
    stateCache.settings = settings;
    await applyModeToAction(settings.openMode);
  } catch (error) {
    console.error('同步 action popup 失败:', error);
  }
}

chrome.action.onClicked.addListener(function() {
  chrome.storage.local.get(['settings'], function(result) {
    var settings = result.settings || {};
    if (settings.openMode === 'devtools') {
      return;
    }

    openPopupWindow().catch(function(error) {
      console.error('打开小窗失败:', error);
    });
  });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'GET_RESPONSE') {
    handleInterceptRequest(request.url, request.method, sender)
      .then(function(response) { sendResponse(response); })
      .catch(function() { sendResponse(null); });
    return true;
  }

  if (request.type === 'GET_DEVTOOLS_TAB_STATE') {
    getDevtoolsTabState(request.tabId)
      .then(function(response) { sendResponse(response); })
      .catch(function() { sendResponse({ enabled: true, connected: false }); });
    return true;
  }

  if (request.type === 'SET_DEVTOOLS_TAB_ENABLED') {
    setDevtoolsTabEnabled(request.tabId, request.enabled)
      .then(function(response) { sendResponse(response); })
      .catch(function() { sendResponse({ enabled: true, connected: false }); });
    return true;
  }
});

async function handleInterceptRequest(url, method, sender) {
  var data = await hydrateStateCache();
  var requestMethod = normalizeMethod(method);
  var senderTabId = getSenderTabId(sender);

  if (getActiveMode() === 'devtools') {
    if (!canInterceptSender(sender)) return null;
    if (!await isDevtoolsTabEnabled(senderTabId)) return null;
  } else if (data.globalEnabled === false) {
    return null;
  }

  var groups = data.groups || [];

  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    if (!group.enabled) continue;

    var rules = group.rules || [];
    for (var j = 0; j < rules.length; j++) {
      var rule = rules[j];
      var ruleMethod = normalizeMethod(rule.method);
      if (!rule.enabled) continue;

      if (rule.method && ruleMethod !== '*' && ruleMethod !== requestMethod) continue;

      if (matchUrl(url, rule.urlPattern)) {
        // popup 展示全部 tab 汇总；devtools 只展示当前 tab，所以这里统一按 tab 记账。
        incrementRuleHitCount(senderTabId, rule.id);

        if (rule.response !== undefined && rule.response !== null) {
          return { data: rule.response, status: rule.status || 200 };
        }
      }
    }
  }
  return null;
}

function normalizeMethod(method) {
  return String(method || 'GET').toUpperCase();
}

function getUrlMatchCandidates(url) {
  return UrlMatcher.getUrlMatchCandidates(url);
}

function matchUrl(url, pattern) {
  return UrlMatcher.matchUrl(url, pattern);
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['settings'], function(result) {
    var payload = {};

    if (!result.settings) {
      payload.settings = { showHitCount: true, openMode: 'popup', themeMode: 'auto' };
    } else if (!result.settings.openMode) {
      payload.settings = Object.assign({}, result.settings, { openMode: 'popup' });
    }

    if (Object.keys(payload).length) {
      chrome.storage.local.set(payload, function() {
        syncActionPopupFromSettings();
      });
    } else {
      syncActionPopupFromSettings();
    }
  });
});

chrome.runtime.onConnect.addListener(function(port) {
  if (!port || port.name !== 'AJAX_INTERCEPTOR_DEVTOOLS') {
    return;
  }

  var currentTabId = null;

  function cleanup() {
    if (currentTabId === null) {
      return;
    }

    var currentPort = devtoolsPortsByTabId.get(currentTabId);
    if (currentPort === port) {
      devtoolsPortsByTabId.delete(currentTabId);
    }

    currentTabId = null;
  }

  port.onMessage.addListener(function(message) {
    if (!message || message.type !== 'DEVTOOLS_PANEL_OPENED' || typeof message.tabId !== 'number') {
      return;
    }

    cleanup();
    currentTabId = message.tabId;
    devtoolsPortsByTabId.set(currentTabId, port);
  });

  port.onDisconnect.addListener(function() {
    cleanup();
  });
});

chrome.runtime.onStartup.addListener(function() {
  resetHitCounts()
    .catch(function(error) {
      console.error('重置命中计数失败:', error);
    })
    .finally(function() {
      syncActionPopupFromSettings();
    });
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName === 'session') {
    if (changes[DEVTOOLS_TAB_ENABLED_KEY]) {
      devtoolsTabEnabled = normalizeBooleanMap(changes[DEVTOOLS_TAB_ENABLED_KEY].newValue);
      devtoolsTabEnabledPromise = Promise.resolve(devtoolsTabEnabled);
    }
    return;
  }

  if (areaName !== 'local') return;

  if (changes.groups) {
    var normalizedGroups = StorageNormalizer.normalizeGroupsWithMeta(changes.groups.newValue || []);
    stateCache.groups = normalizedGroups.groups;

    if (normalizedGroups.changed) {
      chrome.storage.local.set({ groups: normalizedGroups.groups }).catch(function(error) {
        console.error('修正规则数据失败:', error);
      });
    }
  }

  if (changes.globalEnabled) {
    stateCache.globalEnabled = changes.globalEnabled.newValue !== false;
  }

  if (changes.hitCounts) {
    var normalizedHitCounts = normalizeStoredHitCounts(changes.hitCounts.newValue);
    stateCache.hitCounts = normalizedHitCounts.hitCounts;
    hitCountsDirty = false;

    if (normalizedHitCounts.changed) {
      chrome.storage.local.set({ hitCounts: normalizedHitCounts.hitCounts }).catch(function(error) {
        console.error('修正命中计数失败:', error);
      });
    }
  }

  if (changes.settings) {
    var nextSettings = changes.settings.newValue || { openMode: 'popup' };
    stateCache.settings = nextSettings;
    applyModeToAction(nextSettings.openMode);
  }
});

chrome.windows.onRemoved.addListener(function(windowId) {
  if (windowId === popupWindowId) {
    persistPopupWindowId(null)
      .then(function() {
        // popup 模式下关闭小窗即结束这轮全局观察，顺手清空全部汇总计数。
        return resetHitCounts();
      })
      .catch(function(error) {
        console.error('关闭小窗后重置命中计数失败:', error);
      });
  }
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  // 只有 tab 真正关闭时才清这个页面的计数，刷新不会触发这里。
  clearHitCountsForTab(tabId);

  setDevtoolsTabEnabled(tabId, true).catch(function(error) {
    console.warn('清理当前页拦截开关失败:', error);
  });
});

hydrateStateCache();
readDevtoolsTabEnabledMap();
syncActionPopupFromSettings();
