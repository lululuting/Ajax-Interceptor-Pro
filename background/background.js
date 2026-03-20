// Background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_RESPONSE') {
    handleInterceptRequest(request.url, request.method)
      .then(response => sendResponse(response))
      .catch(() => sendResponse(null));
    return true;
  }
});

async function handleInterceptRequest(url, method) {
  const data = await chrome.storage.local.get(['groups', 'globalEnabled', 'hitCounts']);
  
  if (data.globalEnabled === false) return null;

  const groups = data.groups || [];
  let hitCounts = data.hitCounts || {};
  
  for (const group of groups) {
    if (!group.enabled) continue;
    
    for (const rule of group.rules || []) {
      if (!rule.enabled) continue;
      
      if (rule.method && rule.method !== '*' && rule.method !== method) continue;
      
      if (matchUrl(url, rule.urlPattern)) {
        // 记录命中
        hitCounts[rule.id] = (hitCounts[rule.id] || 0) + 1;
        await chrome.storage.local.set({ hitCounts });
        
        return { data: rule.response, status: rule.status || 200 };
      }
    }
  }
  return null;
}

function matchUrl(url, pattern) {
  if (!pattern) return false;
  const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
  try {
    return new RegExp(regexPattern, 'i').test(url);
  } catch { return url.includes(pattern); }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['groups'], result => {
    if (!result.groups) {
      chrome.storage.local.set({
        groups: [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }],
        globalEnabled: true,
        hitCounts: {},
        version: '2.0.0'
      });
    }
  });
});
