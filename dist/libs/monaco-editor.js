/**
 * Monaco Editor 封装 - monaco-editor-container
 * 支持：高亮、行号、代码折叠、外部 setValue 同步
 */
(function (global) {
  'use strict';

  var loaderPromise = null;
  var monacoPromise = null;

  function normalizeTheme(theme) {
    return theme === 'dark' ? 'dark' : 'light';
  }

  function getMonacoTheme(theme) {
    return normalizeTheme(theme) === 'dark' ? 'vs-dark' : 'vs';
  }

  function getVsPath() {
    if (global.chrome && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL('libs/vs');
    }
    var tag = document.getElementById('_monaco_loader');
    return tag ? (tag.getAttribute('data-vs') || '../libs/vs') : '../libs/vs';
  }

  function getLoaderSrc() {
    if (global.chrome && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL('libs/vs/loader.js');
    }
    return getVsPath() + '/loader.js';
  }

  function getWorkerBootstrapUrl() {
    if (global.chrome && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL('libs/monaco-worker-bootstrap.js');
    }
    return '../libs/monaco-worker-bootstrap.js';
  }

  function ensureLoader() {
    if (global.require && typeof global.require.config === 'function') {
      return Promise.resolve();
    }
    if (loaderPromise) return loaderPromise;

    loaderPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = getLoaderSrc();
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return loaderPromise;
  }

  function ensureMonaco() {
    if (global.monaco && global.monaco.editor) {
      return Promise.resolve(global.monaco);
    }
    if (monacoPromise) return monacoPromise;

    monacoPromise = ensureLoader().then(function () {
      return new Promise(function (resolve, reject) {
        global.MonacoEnvironment = {
          getWorkerUrl: function () {
            return getWorkerBootstrapUrl();
          }
        };

        global.require.config({
          paths: { vs: getVsPath() }
        });

        global.require(['vs/editor/editor.main'], function () {
          try {
            if (global.monaco && global.monaco.languages && global.monaco.languages.json) {
              global.monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                allowComments: true,
                trailingCommas: 'ignore',
                enableSchemaRequest: false,
                schemaValidation: 'warning'
              });
            }
          } catch (e) {
            console.warn('Monaco JSON diagnostics init failed', e);
          }
          resolve(global.monaco);
        }, reject);
      });
    });

    return monacoPromise;
  }

  function injectCss() {
    if (document.getElementById('_monaco_editor_css')) return;

    var link = document.createElement('link');
    link.id = '_monaco_editor_css';
    link.rel = 'stylesheet';
    link.href = getVsPath() + '/editor/editor.main.css';
    document.head.appendChild(link);

    var style = document.createElement('style');
    style.id = '_monaco_container_style';
    style.textContent = [
      '.monaco-editor-container{position:relative;width:100%;height:220px;border-radius:10px;overflow:hidden}',
      '.monaco-editor-container[data-monaco-theme="light"]{border:1px solid #d0d7e2;background:#ffffff}',
      '.monaco-editor-container[data-monaco-theme="dark"]{border:1px solid #334155;background:#1e293b}',
      '.monaco-editor-inner{width:100%;height:100%}',
      '.monaco-editor-container .monaco-editor, .monaco-editor-container .overflow-guard{border-radius:10px}',
      '.monaco-editor-container[data-monaco-theme="light"] .monaco-editor .margin{background:#f8fafc!important}',
      '.monaco-editor-container[data-monaco-theme="dark"] .monaco-editor .margin{background:#0f172a!important}',
      '.monaco-editor-container[data-monaco-theme="light"] .monaco-editor .monaco-editor-background{background:#ffffff!important}',
      '.monaco-editor-container[data-monaco-theme="dark"] .monaco-editor .monaco-editor-background{background:#1e293b!important}',
      '.monaco-editor-container .monaco-editor .inputarea.ime-input{background:transparent!important}',
      '.monaco-editor-container[data-monaco-theme="light"] .monaco-editor .cursor{background:#0f172a!important;border-color:#0f172a!important}',
      '.monaco-editor-container[data-monaco-theme="dark"] .monaco-editor .cursor{background:#fff!important;border-color:#fff!important}',
      '.monaco-editor-container[data-monaco-theme="light"] .monaco-scrollable-element > .scrollbar > .slider{background:rgba(148,163,184,.7)!important}',
      '.monaco-editor-container[data-monaco-theme="dark"] .monaco-scrollable-element > .scrollbar > .slider{background:rgba(100,116,139,.7)!important}',
      '.monaco-editor-container[data-monaco-theme="light"] .suggest-widget{border:1px solid #d0d7e2!important;border-radius:8px!important;box-shadow:0 10px 30px rgba(15,23,42,.12)!important}',
      '.monaco-editor-container[data-monaco-theme="dark"] .suggest-widget{border:1px solid #334155!important;border-radius:8px!important;box-shadow:0 10px 30px rgba(0,0,0,.35)!important}',
      '.monaco-editor-container .monaco-hover{border-radius:6px!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function MonacoEditor(container, options) {
    options = options || {};
    this.container = container;
    this.editor = null;
    this.inner = null;
    this._value = typeof options.value === 'string' ? options.value : '';
    this._onChange = typeof options.onChange === 'function' ? options.onChange : function () {};
    this._suspend = false;
    this._theme = normalizeTheme(options.theme);

    injectCss();
    this.container.setAttribute('data-monaco-theme', this._theme);
    this.container.innerHTML = '<div class="monaco-editor-inner"></div>';
    this.inner = this.container.querySelector('.monaco-editor-inner');

    var self = this;
    ensureMonaco().then(function () {
      self._create();
    }).catch(function (err) {
      console.error('Monaco 加载失败', err);
      self._fallback();
    });
  }

  MonacoEditor.prototype._create = function () {
    if (this.editor) return;
    var self = this;

    this.editor = global.monaco.editor.create(this.inner, {
      value: this._value,
      language: 'json',
      theme: getMonacoTheme(this._theme),
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'SF Mono','Monaco','Consolas',monospace",
      lineHeight: 20,
      lineNumbers: 'on',
      lineNumbersMinChars: 3,
      lineDecorationsWidth: 10,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      renderLineHighlight: 'line',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      formatOnPaste: true,
      formatOnType: true,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        useShadows: false,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      padding: { top: 10, bottom: 10 }
    });

    global.monaco.editor.setTheme(getMonacoTheme(this._theme));

    this.editor.onDidChangeModelContent(function () {
      self._value = self.editor.getValue();
      if (!self._suspend) {
        self._onChange(self._value);
      }
    });
  };

  MonacoEditor.prototype._fallback = function () {
    var textarea = document.createElement('textarea');
    textarea.style.cssText = 'width:100%;height:100%;padding:10px;border:none;outline:none;resize:none;font:13px/20px SF Mono,Monaco,Consolas,monospace;';
    this._applyFallbackTheme(textarea);
    textarea.value = this._value;
    var self = this;
    textarea.addEventListener('input', function () {
      self._value = textarea.value;
      self._onChange(self._value);
    });
    this.inner.innerHTML = '';
    this.inner.appendChild(textarea);
  };

  MonacoEditor.prototype.getValue = function () {
    if (this.editor) return this.editor.getValue();
    return this._value;
  };

  MonacoEditor.prototype.setValue = function (value, silent) {
    this._value = value || '';
    if (this.editor) {
      if (this.editor.getValue() === this._value) return;
      this._suspend = !!silent;
      this.editor.setValue(this._value);
      this._suspend = false;
      return;
    }
    var textarea = this.inner && this.inner.querySelector('textarea');
    if (textarea) textarea.value = this._value;
  };

  MonacoEditor.prototype.layout = function () {
    if (this.editor) this.editor.layout();
  };

  MonacoEditor.prototype.focus = function () {
    if (this.editor) this.editor.focus();
  };

  MonacoEditor.prototype._applyFallbackTheme = function (textarea) {
    if (!textarea) return;
    if (this._theme === 'dark') {
      textarea.style.background = '#1e293b';
      textarea.style.color = '#e2e8f0';
      return;
    }

    textarea.style.background = '#ffffff';
    textarea.style.color = '#0f172a';
  };

  MonacoEditor.prototype.setTheme = function (theme) {
    this._theme = normalizeTheme(theme);
    if (this.container) {
      this.container.setAttribute('data-monaco-theme', this._theme);
    }

    if (this.editor && global.monaco && global.monaco.editor) {
      global.monaco.editor.setTheme(getMonacoTheme(this._theme));
    }

    this._applyFallbackTheme(this.inner && this.inner.querySelector('textarea'));
  };

  MonacoEditor.prototype.format = function () {
    if (this.editor) {
      this.editor.getAction('editor.action.formatDocument').run();
    }
  };

  MonacoEditor.prototype.dispose = function () {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  };

  global.MonacoEditor = MonacoEditor;
})(typeof window !== 'undefined' ? window : this);
