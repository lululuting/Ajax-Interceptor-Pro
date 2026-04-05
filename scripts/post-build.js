import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function copy(src, dest) {
  if (existsSync(src)) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
}

// Copy static extension files
copy(resolve(root, 'icons'), resolve(dist, 'icons'));
copy(resolve(root, 'libs'), resolve(dist, 'libs'));
copy(resolve(root, 'background/background.js'), resolve(dist, 'background/background.js'));
copy(resolve(root, 'content/content.js'), resolve(dist, 'content/content.js'));
copy(resolve(root, 'content/inject.js'), resolve(dist, 'content/inject.js'));
copy(resolve(root, 'devtools.html'), resolve(dist, 'devtools.html'));
copy(resolve(root, 'devtools.js'), resolve(dist, 'devtools.js'));
copy(resolve(root, 'popup'), resolve(dist, 'popup'));

// Write manifest pointing to dist paths
const manifest = {
  manifest_version: 3,
  name: 'Ajax Interceptor Pro',
  version: '2.1.0',
  description: 'Modify AJAX requests/responses with grouping and import/export support.',
  permissions: ['storage', 'activeTab', 'scripting'],
  host_permissions: ['<all_urls>'],
  devtools_page: 'devtools.html',
  background: { service_worker: 'background/background.js' },
  content_scripts: [{
    matches: ['<all_urls>'],
    js: ['content/content.js'],
    run_at: 'document_start',
    all_frames: true,
  }],
  action: {
    default_popup: 'popup.entry.html',
    default_icon: { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
  },
  icons: { 16: 'icons/icon16.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
  web_accessible_resources: [
    { resources: ['content/inject.js'], matches: ['<all_urls>'] },
    { resources: ['libs/vs/**', 'libs/monaco-editor.js'], matches: ['chrome-extension://*/*'] },
  ],
};

writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Update devtools.html to point to panel at src/devtools_panel.html
const devtoolsHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<script src="devtools.js"><\/script>
</body>
</html>`;
writeFileSync(resolve(dist, 'devtools.html'), devtoolsHtml);

// Update devtools.js to create panel pointing to src/devtools_panel.html
const devtoolsJs = `try {
  chrome.devtools.panels.create(
    'Ajax拦截',
    'icons/icon16.png',
    'devtools_panel.entry.html',
    function(panel) {}
  );
} catch(e) {
  console.error('创建 DevTools 面板失败:', e);
}
`;
writeFileSync(resolve(dist, 'devtools.js'), devtoolsJs);

console.log('Post-build copy done.');
