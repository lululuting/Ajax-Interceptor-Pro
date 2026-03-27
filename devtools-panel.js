// Ajax Interceptor Pro - Popup Script v2.1.0
(function() {
  // 全局变量
  var groups = [];
  var currentGroupId = 'all';
  var globalEnabled = true;
  var editingGroupId = null;
  var editingRuleId = null;
  var importData = null;
  var confirmCallback = null;
  var hitCounts = {};
  var settings = { showHitCount: true, enableAnimations: true, openMode: 'popup' };

  // 初始化
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DevTools Panel 初始化...');
    init();
  });

  async function init() {
    await loadData();

    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace !== 'local') return;

      if (changes.settings) {
        location.reload();
        return;
      }

      if (!isDevtoolsFullUi()) return;

      if (changes.groups || changes.globalEnabled) {
        console.log('检测到数据变化，重新加载...');
        loadData().then(function() {
          renderSidebar();
          renderRules();
        });
      }

      if (changes.ruleEditorDraft && document.getElementById('ruleModal') && document.getElementById('ruleModal').style.display === 'flex') {
        var draft = changes.ruleEditorDraft.newValue;
        if (draft && draft.source !== 'devtools' && draft.key === getCurrentDraftKey()) {
          setJsonValue(draft.value || '', true);
        }
      }
    });

    if (!isDevtoolsFullUi()) {
      renderDevtoolsModeHint();
      return;
    }

    renderSidebar();
    renderRules();
    bindEvents();
    console.log('初始化完成');

    setInterval(refreshHitCounts, 3000);
  }

  function isDevtoolsFullUi() {
    return (settings.openMode || 'popup') === 'devtools';
  }

  function renderDevtoolsModeHint() {
    var app = document.querySelector('.app');
    if (!app) return;
    app.innerHTML = '<main class="mode-placeholder"><div class="mode-placeholder-card"><h2>当前为弹窗模式</h2><p>请点击扩展图标使用</p></div></main>';
  }

  async function loadData() {
    try {
      var data = await chrome.storage.local.get(['groups', 'globalEnabled', 'hitCounts', 'settings']);
      groups = data.groups || [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }];
      globalEnabled = data.globalEnabled !== false;
      hitCounts = data.hitCounts || {};
      settings = Object.assign({ showHitCount: true, enableAnimations: true, openMode: 'popup' }, data.settings || {});
    } catch(e) {
      console.error('加载数据失败:', e);
      groups = [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }];
    }

    var gt = document.getElementById('globalToggle');
    if (gt) gt.checked = globalEnabled;
  }

  async function refreshHitCounts() {
    try {
      var data = await chrome.storage.local.get(['hitCounts']);
      hitCounts = data.hitCounts || {};
      renderRules();
    } catch(e) {}
  }

  async function saveData() {
    await chrome.storage.local.set({
      groups: groups,
      globalEnabled: globalEnabled,
      hitCounts: hitCounts,
      settings: settings
    });
  }

  function genId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function esc(t) {
    if (!t) return '';
    var div = document.createElement('div');
    div.textContent = t;
    return div.innerHTML;
  }

  // 图标
  var IC = { folder: '<svg class="ui-icon ui-icon-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path></svg>', folderOpen: '<svg class="ui-icon ui-icon-folder" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V8z"></path><path d="M3 11h18l-2 7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l-2-7z"></path></svg>', add: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>', edit: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>', del: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>', download: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>', code: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9-4 3 4 3"></path><path d="m16 9 4 3-4 3"></path><path d="m14 4-4 16"></path></svg>', finger: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V5a1 1 0 0 1 2 0v6"></path><path d="M12 11V4a1 1 0 0 1 2 0v7"></path><path d="M15 11V6a1 1 0 0 1 2 0v7"></path><path d="M18 11V8a1 1 0 0 1 2 0v5c0 5-3 8-8 8-4 0-7-3-7-7v-3a1 1 0 0 1 2 0v2"></path></svg>', drag: '⋮⋮' };

  // ========== 渲染侧边栏 ==========
  function renderSidebar() {
    var el = document.getElementById('groupList');
    if (!el) return;
    el.innerHTML = '';

    // 全部
    var total = groups.reduce(function(s, g) { return s + (g.rules ? g.rules.length : 0); }, 0);
    el.appendChild(createGroupItem('all', IC.folder, '全部', total, true, false));

    // 分组列表
    var sorted = groups.slice().sort(function(a, b) { return (a.order || 0) - (b.order || 0); });
    sorted.forEach(function(g) {
      if (g.id === 'default') return;
      el.appendChild(createGroupItem(g.id, IC.folder, g.name, g.rules ? g.rules.length : 0, g.enabled, true));
    });

    // 未分组
    var def = groups.find(function(g) { return g.id === 'default'; });
    if (def) {
      el.appendChild(createGroupItem('default', IC.folderOpen, '未分组', def.rules ? def.rules.length : 0, def.enabled, true));
    }

    // 绑定分组拖放
    bindGroupDropZones();
  }

  function createGroupItem(id, icon, name, count, enabled, showToggle) {
    var div = document.createElement('div');
    div.className = 'group-item' + (currentGroupId === id ? ' active' : '');
    div.dataset.groupId = id;
    div.dataset.dropTarget = id;

    var html = '<span class="group-icon">' + icon + '</span>';
    html += '<span class="group-name">' + esc(name) + '</span>';
    html += '<span class="group-count">' + count + '</span>';

    if (showToggle) {
      html += '<div class="group-actions">';
      html += '<label class="group-toggle" data-gid="' + id + '">';
      html += '<input type="checkbox"' + (enabled ? ' checked' : '') + '>';
      html += '<span class="toggle-slider"></span></label>';
      html += '</div>';
    }

    div.innerHTML = html;

    // 点击切换分组
    div.addEventListener('click', function(e) {
      if (e.target.closest('.group-toggle')) return;
      currentGroupId = id;
      renderSidebar();
      renderRules();
    });

    // 分组开关
    var toggle = div.querySelector('.group-toggle input');
    if (toggle) {
      toggle.addEventListener('change', async function(e) {
        e.stopPropagation();
        var g = groups.find(function(x) { return x.id === id; });
        if (g) {
          g.enabled = e.target.checked;
          await saveData();
          renderRules();
        }
      });
    }

    // 右键菜单
    if (id !== 'all') {
      div.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showContextMenu(e, id);
      });
    }

    return div;
  }

  // ========== 渲染规则 ==========
  function renderRules() {
    var el = document.getElementById('ruleList');
    if (!el) return;

    var searchInput = document.getElementById('searchInput');
    var search = searchInput ? searchInput.value.toLowerCase() : '';
    var rules = [];
    var gname = currentGroupId === 'all' ? '全部规则' : '规则列表';

    if (currentGroupId === 'all') {
      groups.forEach(function(g) {
        (g.rules || []).forEach(function(r) {
          rules.push(Object.assign({}, r, {
            groupId: g.id,
            groupName: g.name
          }));
        });
      });
    } else {
      var currentGroup = groups.find(function(x) { return x.id === currentGroupId; });
      if (currentGroup) {
        gname = currentGroup.name;
        rules = (currentGroup.rules || []).map(function(r) {
          return Object.assign({}, r, {
            groupId: currentGroup.id,
            groupName: currentGroup.name
          });
        });
      }
    }

    rules.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    if (search) {
      rules = rules.filter(function(r) {
        return (r.name && r.name.toLowerCase().includes(search)) ||
               (r.urlPattern && r.urlPattern.toLowerCase().includes(search)) ||
               (r.response && r.response.toLowerCase().includes(search));
      });
    }

    var titleEl = document.getElementById('currentGroupName');
    var countEl = document.getElementById('ruleCount');
    var countTextEl = countEl ? countEl.querySelector('span') : null;
    var renameGroupBtn = document.getElementById('renameCurrentGroupBtn');
    if (titleEl) titleEl.textContent = gname;
    if (countTextEl) countTextEl.textContent = rules.length + ' 条规则';
    else if (countEl) countEl.textContent = rules.length + ' 条规则';

    if (renameGroupBtn) {
      if (currentGroupId !== 'all') {
        renameGroupBtn.style.display = 'inline-flex';
        renameGroupBtn.onclick = function() {
          var g = groups.find(function(x) { return x.id === currentGroupId; });
          if (!g) return;
          editingGroupId = g.id;
          document.getElementById('groupModalTitle').textContent = '重命名分组';
          document.getElementById('groupNameInput').value = g.name;
          openModal('groupModal');
        };
      } else {
        renameGroupBtn.style.display = 'none';
        renameGroupBtn.onclick = null;
      }
    }

    if (rules.length === 0) {
      el.innerHTML = '<div class="empty-state">' +
        '<div class="empty-icon">' + IC.code + '</div>' +
        '<h3>' + (search ? '未找到匹配规则' : '暂无规则') + '</h3>' +
        '<p>' + (search ? '尝试其他关键词' : '点击添加规则创建接口拦截') + '</p>' +
        (search ? '' : '<button class="btn btn-primary" id="emptyAddBtn">' + IC.add + ' 添加规则</button>') +
        '</div>';

      var emptyBtn = document.getElementById('emptyAddBtn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', function() { openRuleModal(); });
      }
      return;
    }

    var html = '<div class="rule-card"><div class="rule-items" data-gid="' + esc(currentGroupId) + '">';
    rules.forEach(function(r) {
      var g = groups.find(function(x) { return x.id === r.groupId; }) || { enabled: true, name: r.groupName || '' };
      html += renderRuleItem(r, g, currentGroupId === 'all');
    });
    html += '</div></div>';
    el.innerHTML = html;

    bindRuleEvents();
    bindRuleDrag();
    bindRuleDropZone(el.querySelector('.rule-items'));
  }

  function renderRuleItem(r, g, showGroupName) {
    return SharedUI.renderRuleItemHtml(SharedUI.buildRuleItemViewModel({
      rule: r,
      group: g,
      hitCount: hitCounts[r.id] || 0,
      showHitCount: settings.showHitCount !== false,
      allowHoverActions: true,
      showGroupName: !!showGroupName,
      draggable: true,
      dragIcon: IC.drag,
      hitIcon: IC.finger,
      editIcon: IC.edit,
      deleteIcon: IC.del
    }));
  }

  // ========== 规则事件 ==========
  function bindRuleEvents() {
    // 规则开关
    document.querySelectorAll('.rule-toggle input').forEach(function(cb) {
      cb.onchange = async function(e) {
        var rid = cb.closest('.rule-toggle').dataset.rid;
        for (var i = 0; i < groups.length; i++) {
          var g = groups[i];
          if (g.rules) {
            var rule = g.rules.find(function(r) { return r.id === rid; });
            if (rule) {
              rule.enabled = e.target.checked;
              await saveData();
              renderRules();
              break;
            }
          }
        }
      };
    });

    // 编辑按钮
    document.querySelectorAll('.edit-btn').forEach(function(btn) {
      btn.onclick = function() {
        openRuleModal(btn.dataset.rid);
      };
    });

    // 删除按钮
    document.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.onclick = function() {
        var rid = btn.dataset.rid;
        showConfirm('删除规则', '确定要删除这条规则吗？', async function() {
          groups.forEach(function(g) {
            if (g.rules) {
              g.rules = g.rules.filter(function(r) { return r.id !== rid; });
            }
          });
          delete hitCounts[rid];
          await saveData();
          renderSidebar();
          renderRules();
          showToast('规则已删除');
        });
      };
    });
  }

  // ========== 拖拽功能 ==========
  var draggedRuleId = null;
  var draggedFromGroupId = null;

  function bindRuleDrag() {
    document.querySelectorAll('.rule-item[draggable="true"]').forEach(function(item) {
      item.addEventListener('dragstart', function(e) {
        draggedRuleId = item.dataset.rid;
        draggedFromGroupId = item.closest('.rule-items').dataset.gid;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedRuleId);
        console.log('开始拖拽:', draggedRuleId, '从:', draggedFromGroupId);
      });

      item.addEventListener('dragend', function(e) {
        item.classList.remove('dragging');
        draggedRuleId = null;
        draggedFromGroupId = null;
        document.querySelectorAll('.drag-over').forEach(function(el) {
          el.classList.remove('drag-over');
        });
      });
    });
  }

  function bindRuleDropZone(container) {
    if (!container) return;

    container.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      container.classList.add('drag-over');
    });

    container.addEventListener('dragleave', function(e) {
      container.classList.remove('drag-over');
    });

    container.addEventListener('drop', async function(e) {
      e.preventDefault();
      container.classList.remove('drag-over');

      var targetGroupId = container.dataset.gid;
      var ruleId = e.dataTransfer.getData('text/plain') || draggedRuleId;

      console.log('放置:', ruleId, '到:', targetGroupId);

      if (!ruleId || !targetGroupId) return;

      // 找到规则并从原位置移除
      var rule = null;
      var fromGroup = null;

      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.rules) {
          for (var j = 0; j < g.rules.length; j++) {
            if (g.rules[j].id === ruleId) {
              rule = g.rules.splice(j, 1)[0];
              fromGroup = g;
              break;
            }
          }
        }
        if (rule) break;
      }

      if (!rule) {
        console.log('未找到规则');
        return;
      }

      // 放置到目标分组
      var toGroup = groups.find(function(g) { return g.id === targetGroupId; });
      if (!toGroup) {
        console.log('未找到目标分组');
        return;
      }

      if (!toGroup.rules) toGroup.rules = [];
      rule.order = toGroup.rules.length;
      toGroup.rules.push(rule);

      await saveData();
      renderSidebar();
      renderRules();
      showToast('规则已移动');
      console.log('规则移动完成');
    });
  }

  function bindGroupDropZones() {
    document.querySelectorAll('.group-item[data-drop-target]').forEach(function(item) {
      var gid = item.dataset.dropTarget;
      if (gid === 'all') return;

      item.addEventListener('dragover', function(e) {
        if (!draggedRuleId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', function(e) {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', async function(e) {
        e.preventDefault();
        item.classList.remove('drag-over');

        var ruleId = e.dataTransfer.getData('text/plain') || draggedRuleId;
        if (!ruleId || !gid) return;

        console.log('跨组移动:', ruleId, '到:', gid);

        // 找到规则并移除
        var rule = null;
        for (var i = 0; i < groups.length; i++) {
          var g = groups[i];
          if (g.rules) {
            for (var j = 0; j < g.rules.length; j++) {
              if (g.rules[j].id === ruleId) {
                rule = g.rules.splice(j, 1)[0];
                break;
              }
            }
          }
          if (rule) break;
        }

        if (rule) {
          var toGroup = groups.find(function(g) { return g.id === gid; });
          if (toGroup) {
            if (!toGroup.rules) toGroup.rules = [];
            rule.order = toGroup.rules.length;
            toGroup.rules.push(rule);
            await saveData();
            renderSidebar();
            renderRules();
            showToast('规则已移动到 ' + toGroup.name);
          }
        }
      });
    });
  }

  // ========== 事件绑定 ==========
  function bindEvents() {
    // 全局开关
    var globalToggle = document.getElementById('globalToggle');
    if (globalToggle) {
      globalToggle.addEventListener('change', async function(e) {
        globalEnabled = e.target.checked;
        await saveData();
        showToast(globalEnabled ? '拦截器已启用' : '拦截器已禁用');
      });
    }

    // 新建分组
    var newGroupBtn = document.getElementById('newGroupBtn');
    if (newGroupBtn) {
      newGroupBtn.addEventListener('click', function() {
        editingGroupId = null;
        document.getElementById('groupModalTitle').textContent = '新建分组';
        document.getElementById('groupNameInput').value = '';
        openModal('groupModal');
      });
    }

    // 保存分组
    var saveGroupBtn = document.getElementById('saveGroupBtn');
    if (saveGroupBtn) {
      saveGroupBtn.addEventListener('click', async function() {
        var name = document.getElementById('groupNameInput').value.trim();
        if (!name) { showToast('请输入分组名称'); return; }

        if (editingGroupId) {
          var g = groups.find(function(x) { return x.id === editingGroupId; });
          if (g) g.name = name;
        } else {
          groups.push({ id: genId(), name: name, enabled: true, order: groups.length, rules: [] });
        }

        await saveData();
        renderSidebar();
        closeModal('groupModal');
        showToast(editingGroupId ? '分组已更新' : '分组已创建');
      });
    }

    // 新建规则
    var newRuleBtn = document.getElementById('newRuleBtn');
    if (newRuleBtn) {
      newRuleBtn.addEventListener('click', function() { openRuleModal(); });
    }

    // 保存规则
    var saveRuleBtn = document.getElementById('saveRuleBtn');
    if (saveRuleBtn) {
      saveRuleBtn.addEventListener('click', async function() {
        var url = document.getElementById('ruleUrl').value.trim();
        if (!url) { showToast('请输入 URL'); return; }

        var gid = document.getElementById('ruleGroup').value;
        var g = groups.find(function(x) { return x.id === gid; });
        if (!g) { showToast('请选择分组'); return; }

        // JSON 编辑器内容
        var resp = getJsonValue().trim();

        // 删除旧规则
        if (editingRuleId) {
          groups.forEach(function(gp) {
            if (gp.rules) {
              gp.rules = gp.rules.filter(function(r) { return r.id !== editingRuleId; });
            }
          });
        }

        var rule = {
          id: editingRuleId || genId(),
          name: document.getElementById('ruleName') ? document.getElementById('ruleName').value.trim() : '',
          method: document.getElementById('ruleMethod').value,
          urlPattern: url,
          response: resp,
          status: parseInt(document.getElementById('ruleStatus').value) || 200,
          enabled: document.getElementById('ruleEnabled').checked,
          order: g.rules ? g.rules.length : 0
        };

        if (!g.rules) g.rules = [];
        g.rules.push(rule);

        await saveData();
        chrome.storage.local.remove('ruleEditorDraft');
        renderSidebar();
        renderRules();
        closeModal('ruleModal');
        showToast(editingRuleId ? '规则已更新' : '规则已创建');
      });
    }

    // 搜索
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', renderRules);
    }

    // 导出
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        renderExportList();
        openModal('exportModal');
      });
    }

    var confirmExportBtn = document.getElementById('confirmExportBtn');
    if (confirmExportBtn) {
      confirmExportBtn.addEventListener('click', doExport);
    }

    // 导入
    var importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', function() {
        importData = null;
        var btn = document.getElementById('confirmImportBtn');
        if (btn) btn.disabled = true;
        openModal('importModal');
      });
    }

    var fileDropZone = document.getElementById('fileDropZone');
    var importFile = document.getElementById('importFile');
    if (fileDropZone && importFile) {
      fileDropZone.addEventListener('click', function() { importFile.click(); });
      importFile.addEventListener('change', function(e) {
        if (e.target.files[0]) handleImport(e.target.files[0]);
      });
    }

    var confirmImportBtn = document.getElementById('confirmImportBtn');
    if (confirmImportBtn) {
      confirmImportBtn.addEventListener('click', doImport);
    }

    // 设置按钮
    var settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function() {
        console.log('打开设置');
        // 设置当前值
        var modeRadio = document.querySelector('input[name="openMode"][value="' + (settings.openMode || 'popup') + '"]');
        if (modeRadio) modeRadio.checked = true;

        var showHitCountCb = document.getElementById('showHitCount');
        if (showHitCountCb) showHitCountCb.checked = settings.showHitCount !== false;

        var enableAnimationsCb = document.getElementById('enableAnimations');
        if (enableAnimationsCb) enableAnimationsCb.checked = settings.enableAnimations !== false;

        openModal('settingsModal');
      });
    }

    // 设置选项
    var showHitCount = document.getElementById('showHitCount');
    if (showHitCount) {
      showHitCount.addEventListener('change', async function(e) {
        settings.showHitCount = e.target.checked;
        await saveData();
        renderRules();
      });
    }

    var enableAnimations = document.getElementById('enableAnimations');
    if (enableAnimations) {
      enableAnimations.addEventListener('change', async function(e) {
        settings.enableAnimations = e.target.checked;
        await saveData();
      });
    }

    // 清除数据
    var clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
      clearDataBtn.addEventListener('click', function() {
        showConfirm('清除数据', '确定要清除所有数据吗？', async function() {
          groups = [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }];
          hitCounts = {};
          await saveData();
          renderSidebar();
          renderRules();
          closeModal('settingsModal');
          showToast('数据已清除');
        });
      });
    }

    // 导出配置
    var exportConfigBtn = document.getElementById('exportConfigBtn');
    if (exportConfigBtn) {
      exportConfigBtn.addEventListener('click', function() {
        var data = { settings: settings, groups: groups };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ajax-interceptor-config.json';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('配置已导出');
      });
    }

    // 模式切换
    document.querySelectorAll('input[name="openMode"]').forEach(function(radio) {
      radio.addEventListener('change', async function(e) {
        settings.openMode = e.target.value;
        await saveData();
        showToast('已切换到 ' + (e.target.value === 'devtools' ? 'DevTools' : '弹窗') + ' 模式');
      });
    });

    // 弹窗关闭按钮
    document.querySelectorAll('[data-close]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        closeModal(btn.dataset.close);
      });
    });

    // 确认弹窗按钮
    var confirmActionBtn = document.getElementById('confirmActionBtn');
    if (confirmActionBtn) {
      confirmActionBtn.addEventListener('click', function() {
        if (confirmCallback) {
          confirmCallback();
          confirmCallback = null;
        }
        closeModal('confirmModal');
      });
    }

    // JSON 编辑器

    // JSON 编辑器初始化（延迟到打开弹窗时）
  }

  // ========== Monaco Editor ==========
  var monacoEditor = null;
  var editorDraftTimer = null;

  function getCurrentDraftKey() {
    return editingRuleId || '__new__';
  }

  function emitEditorDraft(value) {
    clearTimeout(editorDraftTimer);
    editorDraftTimer = setTimeout(function() {
      chrome.storage.local.set({
        ruleEditorDraft: {
          key: getCurrentDraftKey(),
          value: value || '',
          source: 'devtools',
          updatedAt: Date.now()
        }
      });
    }, 120);
  }

  function initJsonEditor() {
    var container = document.querySelector('.monaco-editor-container');
    if (!container || monacoEditor) return;

    monacoEditor = new MonacoEditor(container, {
      value: '',
      onChange: function(value) {
        emitEditorDraft(value);
      }
    });
  }

  function getJsonValue() {
    if (monacoEditor) return monacoEditor.getValue();
    return '';
  }

  function setJsonValue(value, silent) {
    if (!monacoEditor) initJsonEditor();
    if (monacoEditor) {
      monacoEditor.setValue(value || '', !!silent);
      monacoEditor.layout();
    }
  }
  async function openRuleModal(rid) {
    // 打开弹窗前先加载最新数据
    await loadData();
    
    editingRuleId = rid;
    var rule = null, gid = null;
    document.getElementById('ruleModalTitle').textContent = rid ? '编辑规则' : '添加规则';

    // 填充分组下拉框
    var sel = document.getElementById('ruleGroup');
    if (sel) {
      sel.innerHTML = groups
        .filter(function(g) { return g.id !== 'all'; })
        .map(function(g) { return '<option value="' + g.id + '">' + esc(g.name) + '</option>'; })
        .join('');
    }

    if (rid) {
      // 编辑模式
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.rules) {
          for (var j = 0; j < g.rules.length; j++) {
            if (g.rules[j].id === rid) {
              rule = g.rules[j];
              gid = g.id;
              break;
            }
          }
        }
        if (rule) break;
      }

      if (rule) {
        var nameInput = document.getElementById('ruleName');
        if (nameInput) nameInput.value = rule.name || '';
        document.getElementById('ruleMethod').value = rule.method || 'GET';
        document.getElementById('ruleUrl').value = rule.urlPattern || '';
        if (sel) sel.value = gid || currentGroupId;
        document.getElementById('ruleStatus').value = rule.status || 200;
        document.getElementById('ruleEnabled').checked = rule.enabled !== false;
      }
    } else {
      // 新建模式
      var nameInput = document.getElementById('ruleName');
      if (nameInput) nameInput.value = '';
      document.getElementById('ruleMethod').value = 'GET';
      document.getElementById('ruleUrl').value = '';
      if (sel) sel.value = currentGroupId === 'all' ? 'default' : currentGroupId;
      document.getElementById('ruleStatus').value = 200;
      document.getElementById('ruleEnabled').checked = true;
    }

    openModal('ruleModal');
    initJsonEditor();
    
    // 弹窗打开后再设置 JSON 值
    setTimeout(function() {
      setJsonValue(rule ? (rule.response || '') : '', true);
      if (monacoEditor) monacoEditor.focus();
    }, 80);
  }

  // ========== 右键菜单 ==========
  function showContextMenu(e, gid) {
    // 移除已有菜单
    document.querySelectorAll('.context-menu').forEach(function(m) { m.remove(); });

    var menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = 'position:fixed;left:' + e.clientX + 'px;top:' + e.clientY + 'px;z-index:1000;';
    menu.innerHTML =
      '<div class="menu-item" data-action="rename">' + IC.edit + ' 重命名</div>' +
      '<div class="menu-item" data-action="export">' + IC.download + ' 导出该组</div>' +
      '<div class="menu-item" data-action="delete" style="color:#ef4444">' + IC.del + ' 删除分组</div>';

    document.body.appendChild(menu);

    menu.querySelectorAll('.menu-item').forEach(function(item) {
      item.addEventListener('click', async function() {
        menu.remove();
        var action = item.dataset.action;

        if (action === 'rename') {
          var g = groups.find(function(x) { return x.id === gid; });
          if (g) {
            editingGroupId = gid;
            document.getElementById('groupModalTitle').textContent = '重命名分组';
            document.getElementById('groupNameInput').value = g.name;
            openModal('groupModal');
          }
        } else if (action === 'export') {
          doExportGroup(gid);
        } else if (action === 'delete') {
          showConfirm('删除分组', '确定要删除这个分组吗？', async function() {
            var g = groups.find(function(x) { return x.id === gid; });
            if (g && g.rules && g.rules.length) {
              var def = groups.find(function(x) { return x.id === 'default'; });
              if (def) def.rules = (def.rules || []).concat(g.rules);
            }
            groups = groups.filter(function(x) { return x.id !== gid; });
            if (currentGroupId === gid) currentGroupId = 'all';
            await saveData();
            renderSidebar();
            renderRules();
            showToast('分组已删除');
          });
        }
      });
    });

    // 点击其他地方关闭
    setTimeout(function() {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  // ========== 导出 ==========
  function renderExportList() {
    var el = document.getElementById('exportGroupList');
    if (!el) return;
    el.innerHTML = groups
      .filter(function(g) { return g.id !== 'all'; })
      .map(function(g) {
        return '<label style="display:block;padding:4px 0;cursor:pointer;">' +
          '<input type="checkbox" value="' + g.id + '" checked> ' + esc(g.name) + ' (' + (g.rules ? g.rules.length : 0) + ')</label>';
      })
      .join('');
  }

  function doExport() {
    var scopeRadio = document.querySelector('input[name="exportScope"]:checked');
    var scope = scopeRadio ? scopeRadio.value : 'all';
    var exp = [];

    if (scope === 'all') {
      exp = groups.filter(function(g) { return g.id !== 'all'; });
    } else if (scope === 'current') {
      if (currentGroupId === 'all') {
        exp = groups.filter(function(g) { return g.id !== 'all'; });
      } else {
        var g = groups.find(function(x) { return x.id === currentGroupId; });
        if (g) exp = [g];
      }
    } else {
      var selected = Array.from(document.querySelectorAll('#exportGroupList input:checked'))
        .map(function(i) { return i.value; });
      exp = groups.filter(function(g) { return selected.indexOf(g.id) !== -1; });
    }

    var data = {
      version: '2.1.0',
      exportTime: new Date().toISOString(),
      groups: exp.map(function(g) {
        return { id: g.id, name: g.name, enabled: g.enabled, order: g.order, rules: g.rules || [] };
      })
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ajax-interceptor-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(a.href);

    closeModal('exportModal');
    showToast('导出成功');
  }

  function doExportGroup(gid) {
    var g = groups.find(function(x) { return x.id === gid; });
    if (!g) return;

    var data = {
      version: '2.1.0',
      exportTime: new Date().toISOString(),
      groups: [{ id: g.id, name: g.name, enabled: g.enabled, order: g.order, rules: g.rules || [] }]
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ajax-interceptor-' + g.name + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('分组导出成功');
  }

  // ========== 导入 ==========
  function handleImport(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        importData = JSON.parse(e.target.result);
        if (!importData.groups || !Array.isArray(importData.groups)) {
          throw new Error('无效格式');
        }
        var btn = document.getElementById('confirmImportBtn');
        if (btn) btn.disabled = false;
        showToast('已选择：' + file.name);
      } catch(err) {
        showToast('文件格式错误');
        importData = null;
      }
    };
    reader.readAsText(file);
  }

  async function doImport() {
    if (!importData) return;

    var strategyRadio = document.querySelector('input[name="importStrategy"]:checked');
    var strategy = strategyRadio ? strategyRadio.value : 'merge';

    if (strategy === 'overwrite') {
      groups = importData.groups.slice();
      if (!groups.find(function(g) { return g.id === 'default'; })) {
        groups.push({ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] });
      }
    } else {
      importData.groups.forEach(function(ig) {
        var eg = groups.find(function(g) { return g.name === ig.name; });
        if (eg) {
          if (strategy === 'merge' && ig.rules) {
            ig.rules.forEach(function(ir) {
              var exists = eg.rules && eg.rules.some(function(r) {
                return r.urlPattern === ir.urlPattern && r.method === ir.method;
              });
              if (!exists) {
                if (!eg.rules) eg.rules = [];
                eg.rules.push(Object.assign({}, ir, { id: genId() }));
              }
            });
          }
        } else {
          groups.push(Object.assign({}, ig, { id: genId() }));
        }
      });
    }

    await saveData();
    renderSidebar();
    renderRules();
    closeModal('importModal');
    showToast('导入成功');
  }

  // ========== 工具函数 ==========
  function showConfirm(title, message, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = callback;
    openModal('confirmModal');
  }

  function showToast(message) {
    var toast = document.getElementById('toast');
    var toastMessage = document.getElementById('toastMessage');
    if (toast && toastMessage) {
      toastMessage.textContent = message;
      toast.style.display = 'block';
      setTimeout(function() {
        toast.style.display = 'none';
      }, 2000);
    }
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
      console.log('打开弹窗:', id);
    }
  }

  function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'none';
      console.log('关闭弹窗:', id);
    }
  }

  // 暴露给全局
  window.openModal = openModal;
  window.closeModal = closeModal;
})();
