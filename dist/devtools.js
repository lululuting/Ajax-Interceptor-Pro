try {
  chrome.devtools.panels.create(
    'Ajax拦截',
    'icons/icon16.png',
    'devtools_panel.entry.html',
    function(panel) {}
  );
} catch(e) {
  console.error('创建 DevTools 面板失败:', e);
}
