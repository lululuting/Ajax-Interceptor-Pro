// Background service worker

var stateCache = {
  groups: [],
  globalEnabled: true,
  hitCounts: {}
};
var stateCachePromise = null;
var hitCountFlushTimer = null;
var hitCountsDirty = false;

async function hydrateStateCache(force) {
  if (!force && stateCachePromise) {
    return stateCachePromise;
  }

  stateCachePromise = chrome.storage.local
    .get(['groups', 'globalEnabled', 'hitCounts'])
    .then(function(data) {
      stateCache = {
        groups: data.groups || [],
        globalEnabled: data.globalEnabled !== false,
        hitCounts: data.hitCounts || {}
      };
      return stateCache;
    })
    .catch(function(error) {
      console.error('读取拦截缓存失败:', error);
      return stateCache;
    });

  return stateCachePromise;
}

function scheduleHitCountsFlush() {
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
  var popupPath = effectiveMode === 'devtools' ? 'popup/mode-hint.html' : 'popup.entry.html';
  await chrome.action.setPopup({ popup: popupPath });
}

async function syncActionPopupFromSettings() {
  try {
    var data = await chrome.storage.local.get(['settings']);
    var settings = data.settings || {};
    await applyModeToAction(settings.openMode);
  } catch (error) {
    console.error('同步 action popup 失败:', error);
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'GET_RESPONSE') {
    handleInterceptRequest(request.url, request.method)
      .then(function(response) { sendResponse(response); })
      .catch(function() { sendResponse(null); });
    return true;
  }
});

async function handleInterceptRequest(url, method) {
  var data = await hydrateStateCache();

  if (data.globalEnabled === false) return null;

  var groups = data.groups || [];

  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    if (!group.enabled) continue;

    var rules = group.rules || [];
    for (var j = 0; j < rules.length; j++) {
      var rule = rules[j];
      if (!rule.enabled) continue;

      if (rule.method && rule.method !== '*' && rule.method !== method) continue;

      if (matchUrl(url, rule.urlPattern)) {
        stateCache.hitCounts[rule.id] = (stateCache.hitCounts[rule.id] || 0) + 1;
        scheduleHitCountsFlush();

        // 确保响应数据有效
        if (rule.response !== undefined && rule.response !== null) {
          return { data: rule.response, status: rule.status || 200 };
        }
      }
    }
  }
  return null;
}

function matchUrl(url, pattern) {
  if (!pattern) return false;
  var regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    return new RegExp(regexPattern, 'i').test(url);
  } catch (e) {
    return url.indexOf(pattern) !== -1;
  }
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['settings'], function(result) {
    var payload = {};

    if (!result.settings) {
      payload.settings = { showHitCount: true, openMode: 'popup' };
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

chrome.runtime.onStartup.addListener(function() {
  syncActionPopupFromSettings();
});

chrome.storage.onChanged.addListener(function(changes, areaName) {
  if (areaName !== 'local') return;

  if (changes.groups) {
    stateCache.groups = changes.groups.newValue || [];
  }

  if (changes.globalEnabled) {
    stateCache.globalEnabled = changes.globalEnabled.newValue !== false;
  }

  if (changes.hitCounts) {
    stateCache.hitCounts = changes.hitCounts.newValue || {};
  }

  if (changes.settings) {
    var next = changes.settings.newValue || {};
    applyModeToAction(next.openMode);
  }
});

hydrateStateCache();
syncActionPopupFromSettings();
