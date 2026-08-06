importScripts('../libs/storage-normalizer.js', '../libs/url-match.js', '../libs/intercept-active.js');

// Background service worker

var stateCache = {
  groups: [],
  globalEnabled: false,
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
var devtoolsConnectedAt = {};
var devtoolsConnectedAtPromise = null;
var POPUP_WINDOW_URL = 'popup.entry.html';
var POPUP_WINDOW_WIDTH = 820;
var POPUP_WINDOW_HEIGHT = 680;
var DEVTOOLS_TAB_ENABLED_KEY = 'devtoolsTabEnabled';
var DEVTOOLS_CONNECTED_AT_KEY = 'devtoolsConnectedAt';
var INTERCEPT_ACTIVE_SIGNAL_KEY = 'interceptActiveSignal';
var DEVTOOLS_CONNECTED_TTL_MS = 20000;

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
    if (source[key] === true) {
      normalized[String(key)] = true;
    }
  });

  return normalized;
}

function normalizeTimestampMap(value) {
  var source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  var normalized = {};

  Object.keys(source).forEach(function(key) {
    var touchedAt = Number(source[key]);
    if (Number.isFinite(touchedAt) && touchedAt > 0) {
      normalized[String(key)] = touchedAt;
    }
  });

  return normalized;
}

function getActiveMode() {
  var settings = (stateCache && stateCache.settings) || {};
  return settings.openMode === 'devtools' ? 'devtools' : 'popup';
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

async function readDevtoolsConnectedAtMap(force) {
  if (!chrome.storage || !chrome.storage.session) {
    return devtoolsConnectedAt;
  }

  if (!force && devtoolsConnectedAtPromise) {
    return devtoolsConnectedAtPromise;
  }

  devtoolsConnectedAtPromise = chrome.storage.session
    .get([DEVTOOLS_CONNECTED_AT_KEY])
    .then(function(data) {
      devtoolsConnectedAt = normalizeTimestampMap(data[DEVTOOLS_CONNECTED_AT_KEY]);
      return devtoolsConnectedAt;
    })
    .catch(function(error) {
      console.warn('读取 DevTools 连接状态失败:', error);
      return devtoolsConnectedAt;
    });

  return devtoolsConnectedAtPromise;
}

async function touchDevtoolsConnected(tabId) {
  if (typeof tabId !== 'number') {
    return;
  }

  await readDevtoolsConnectedAtMap();
  var nextMap = Object.assign({}, devtoolsConnectedAt);
  nextMap[String(tabId)] = Date.now();
  devtoolsConnectedAt = nextMap;
  devtoolsConnectedAtPromise = Promise.resolve(devtoolsConnectedAt);

  if (chrome.storage && chrome.storage.session) {
    await chrome.storage.session.set({
      [DEVTOOLS_CONNECTED_AT_KEY]: devtoolsConnectedAt
    });
  }
}

async function clearDevtoolsConnected(tabId) {
  if (typeof tabId !== 'number') {
    return;
  }

  await readDevtoolsConnectedAtMap();
  if (!Object.prototype.hasOwnProperty.call(devtoolsConnectedAt, String(tabId))) {
    return;
  }

  var nextMap = Object.assign({}, devtoolsConnectedAt);
  delete nextMap[String(tabId)];
  devtoolsConnectedAt = nextMap;
  devtoolsConnectedAtPromise = Promise.resolve(devtoolsConnectedAt);

  if (chrome.storage && chrome.storage.session) {
    await chrome.storage.session.set({
      [DEVTOOLS_CONNECTED_AT_KEY]: devtoolsConnectedAt
    });
  }
}

async function isDevtoolsTabConnected(tabId) {
  if (typeof tabId !== 'number') {
    return false;
  }

  if (devtoolsPortsByTabId.has(tabId)) {
    return true;
  }

  var connectedAtMap = await readDevtoolsConnectedAtMap();
  var touchedAt = connectedAtMap[String(tabId)];
  return typeof touchedAt === 'number' && (Date.now() - touchedAt) < DEVTOOLS_CONNECTED_TTL_MS;
}

async function isDevtoolsTabEnabled(tabId) {
  if (typeof tabId !== 'number') {
    return false;
  }

  var enabledMap = await readDevtoolsTabEnabledMap();
  return enabledMap[String(tabId)] === true;
}

async function setDevtoolsTabEnabled(tabId, enabled) {
  if (typeof tabId !== 'number') {
    return { enabled: false, connected: false };
  }

  await readDevtoolsTabEnabledMap();
  var tabKey = String(tabId);
  var nextEnabledMap = Object.assign({}, devtoolsTabEnabled);

  if (enabled === true) {
    nextEnabledMap[tabKey] = true;
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

  var result = {
    enabled: devtoolsTabEnabled[tabKey] === true,
    connected: await isDevtoolsTabConnected(tabId)
  };

  await bumpInterceptActiveSignal();
  await notifyTabInterceptActive(tabId);

  return result;
}

async function getDevtoolsTabState(tabId) {
  return {
    enabled: await isDevtoolsTabEnabled(tabId),
    connected: await isDevtoolsTabConnected(tabId)
  };
}

async function refreshInterceptDecisionInputs() {
  // storage.onChanged 与 content 的 GET 查询可能并发；先读最新值，避免把过期开关状态推回页面。
  var latest = await chrome.storage.local.get(['globalEnabled', 'settings']);
  stateCache.globalEnabled = latest.globalEnabled === true;
  if (latest.settings) {
    stateCache.settings = latest.settings;
  }
}

async function getInterceptActiveForTab(tabId, options) {
  await hydrateStateCache();

  if (options && options.fresh === true) {
    await refreshInterceptDecisionInputs();
  }

  var connected = await isDevtoolsTabConnected(tabId);
  var tabEnabled = typeof tabId === 'number' ? await isDevtoolsTabEnabled(tabId) : false;

  return InterceptActive.isActive({
    openMode: getActiveMode(),
    globalEnabled: stateCache.globalEnabled === true,
    devtoolsConnected: connected,
    devtoolsTabEnabled: tabEnabled
  });
}

async function getInterceptActiveForSender(sender) {
  return getInterceptActiveForTab(getSenderTabId(sender));
}

async function bumpInterceptActiveSignal() {
  if (!chrome.storage || !chrome.storage.session) {
    return;
  }

  try {
    await chrome.storage.session.set({
      [INTERCEPT_ACTIVE_SIGNAL_KEY]: Date.now()
    });
  } catch (error) {
    console.warn('广播拦截挂载状态失败:', error);
  }
}

async function notifyTabInterceptActive(tabId) {
  if (typeof tabId !== 'number') {
    return;
  }

  var active = await getInterceptActiveForTab(tabId, { fresh: true });

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'AJAX_INTERCEPTOR_ACTIVE_CHANGED',
      active: active
    });
  } catch (error) {
    // 页面尚未注入 content script 时可忽略。
  }

  // MAIN 世界直写，覆盖所有 frame，避免仅依赖 postMessage / 顶层 sendMessage。
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      world: 'MAIN',
      func: function(enabled) {
        var nextEnabled = enabled === true;
        try {
          if (typeof window.__AJAX_INTERCEPTOR_PRO_SET_ENABLED__ === 'function') {
            window.__AJAX_INTERCEPTOR_PRO_SET_ENABLED__(nextEnabled);
            return;
          }
        } catch (error) {
          // fall through
        }
        try {
          document.documentElement.dispatchEvent(new CustomEvent('AJAX_INTERCEPTOR_SET_ENABLED', {
            detail: { enabled: nextEnabled },
            bubbles: true
          }));
        } catch (error) {
          // fall through
        }
        window.postMessage({
          type: 'AJAX_INTERCEPTOR_SET_ENABLED',
          enabled: nextEnabled
        }, '*');
      },
      args: [active === true]
    });
  } catch (error) {
    // chrome:// 等受限页面可忽略。
  }
}

async function broadcastInterceptActive() {
  await bumpInterceptActiveSignal();

  try {
    var tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(function(tab) {
      return notifyTabInterceptActive(tab.id);
    }));
  } catch (error) {
    console.warn('向标签页广播拦截状态失败:', error);
  }
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
        globalEnabled: data.globalEnabled === true,
        hitCounts: normalizedHitCounts.hitCounts,
        settings: nextSettings
      };

      // hydrate 与 storage.onChanged 可能并发；收尾再读一次开关，避免旧快照盖掉最新值。
      await refreshInterceptDecisionInputs();

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

  if (request.type === 'GET_INTERCEPT_ACTIVE') {
    getInterceptActiveForTab(getSenderTabId(sender), { fresh: true })
      .then(function(active) { sendResponse({ active: active === true }); })
      .catch(function() { sendResponse({ active: false }); });
    return true;
  }

  if (request.type === 'GET_DEVTOOLS_TAB_STATE') {
    getDevtoolsTabState(request.tabId)
      .then(function(response) { sendResponse(response); })
      .catch(function() { sendResponse({ enabled: false, connected: false }); });
    return true;
  }

  if (request.type === 'SET_DEVTOOLS_TAB_ENABLED') {
    setDevtoolsTabEnabled(request.tabId, request.enabled)
      .then(function(response) { sendResponse(response); })
      .catch(function() { sendResponse({ enabled: false, connected: false }); });
    return true;
  }
});

async function handleInterceptRequest(url, method, sender) {
  var data = await hydrateStateCache();
  var requestMethod = normalizeMethod(method);
  var senderTabId = getSenderTabId(sender);

  if (!await getInterceptActiveForSender(sender)) {
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
  chrome.storage.local.get(['settings', 'globalEnabled'], function(result) {
    var payload = {};

    if (!result.settings) {
      payload.settings = { showHitCount: true, openMode: 'popup', themeMode: 'auto' };
    } else if (!result.settings.openMode) {
      payload.settings = Object.assign({}, result.settings, { openMode: 'popup' });
    }

    if (result.globalEnabled === undefined) {
      payload.globalEnabled = false;
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
    touchDevtoolsConnected(currentTabId)
      .then(function() {
        return bumpInterceptActiveSignal();
      })
      .then(function() {
        return notifyTabInterceptActive(currentTabId);
      })
      .catch(function(error) {
        console.warn('同步 DevTools 连接状态失败:', error);
      });
  });

  port.onDisconnect.addListener(function() {
    var disconnectedTabId = currentTabId;
    cleanup();
    clearDevtoolsConnected(disconnectedTabId)
      .then(function() {
        return bumpInterceptActiveSignal();
      })
      .then(function() {
        return notifyTabInterceptActive(disconnectedTabId);
      })
      .catch(function(error) {
        console.warn('清理 DevTools 连接状态失败:', error);
      });
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
    if (changes[DEVTOOLS_CONNECTED_AT_KEY]) {
      devtoolsConnectedAt = normalizeTimestampMap(changes[DEVTOOLS_CONNECTED_AT_KEY].newValue);
      devtoolsConnectedAtPromise = Promise.resolve(devtoolsConnectedAt);
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
    stateCache.globalEnabled = changes.globalEnabled.newValue === true;
    broadcastInterceptActive();
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
    var previousMode = getActiveMode();
    stateCache.settings = nextSettings;
    applyModeToAction(nextSettings.openMode);

    if (previousMode !== getActiveMode()) {
      broadcastInterceptActive();
    }
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

  setDevtoolsTabEnabled(tabId, false).catch(function(error) {
    console.warn('清理当前页拦截开关失败:', error);
  });
});

hydrateStateCache();
readDevtoolsTabEnabledMap();
readDevtoolsConnectedAtMap();
syncActionPopupFromSettings();
