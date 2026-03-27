(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SharedUI = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getRulePreview(response, maxLength) {
    maxLength = maxLength || 50;
    if (!response) return '📄 无数据';

    var preview = '';
    try {
      preview = JSON.stringify(JSON.parse(response));
    } catch (error) {
      preview = String(response);
    }

    if (preview.length > maxLength) {
      preview = preview.slice(0, maxLength) + '...';
    }

    return preview;
  }

  function getMethodClass(method) {
    return String(method || 'GET').toLowerCase();
  }

  function buildRuleItemViewModel(options) {
    options = options || {};
    var rule = options.rule || {};
    var group = options.group || {};
    var hitCount = Number(options.hitCount || 0);
    var enabled = rule.enabled !== false;
    var disabled = group.enabled === false || !enabled;

    return {
      id: rule.id || '',
      enabled: enabled,
      disabled: disabled,
      draggable: options.draggable !== false,
      allowHoverActions: options.allowHoverActions !== false,
      showGroupName: !!options.showGroupName,
      hitVisible: options.showHitCount !== false,
      hitCount: hitCount,
      hitActive: hitCount > 0,
      method: rule.method || 'GET',
      methodClass: getMethodClass(rule.method),
      urlPattern: rule.urlPattern || '',
      name: rule.name || '未命名规则',
      rawName: rule.name || '',
      groupName: rule.groupName || group.name || '',
      preview: getRulePreview(rule.response, options.previewLength || 50),
      dragIcon: options.dragIcon || '⋮⋮',
      hitIcon: options.hitIcon || '👆',
      editIcon: options.editIcon || '✏️',
      deleteIcon: options.deleteIcon || '🗑️'
    };
  }

  function renderHitBadge(vm) {
    if (!vm.hitVisible) return '';
    if (vm.hitActive) {
      return '<span class="hit-badge hit-active" title="命中' + vm.hitCount + '次"><b>' + vm.hitCount + '</b> ' + vm.hitIcon + '</span>';
    }
    return '<span class="hit-badge" title="未命中">' + vm.hitIcon + '</span>';
  }

  function renderActionIcon(kind, fallback) {
    if (kind === 'edit') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path></svg>';
    }
    if (kind === 'delete') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
    }
    return fallback || '';
  }

  function renderRuleItemHtml(vm) {
    return '' +
      '<div class="rule-item' + (vm.disabled ? ' disabled' : '') + (vm.hitActive ? ' has-hit' : '') + '" data-rid="' + escapeHtml(vm.id) + '"' + (vm.draggable ? ' draggable="true"' : '') + '>' +
        '<span class="drag-handle" title="拖动排序">' + vm.dragIcon + '</span>' +
        '<div class="rule-main">' +
          '<div class="rule-name-row">' +
            '<span class="rule-method ' + escapeHtml(vm.methodClass) + '">' + escapeHtml(vm.method) + '</span>' +
            '<span class="rule-name rule-name-main" title="' + escapeHtml(vm.name) + '">' + escapeHtml(vm.name) + '</span>' +
          '</div>' +
          '<div class="rule-meta">' +
            (vm.showGroupName && vm.groupName ? '<span class="rule-group-label">' + escapeHtml(vm.groupName) + '</span>' : '') +
            '<code class="rule-preview">' + escapeHtml(vm.preview) + '</code>' +
          '</div>' +
        '</div>' +
        '<div class="rule-side">' +
          '<div class="rule-side-title"><span class="rule-url rule-route-side" title="' + escapeHtml(vm.urlPattern) + '">' + escapeHtml(vm.urlPattern) + '</span></div>' +
          '<div class="rule-side-controls">' +
            renderHitBadge(vm) +
            '<label class="rule-toggle" data-rid="' + escapeHtml(vm.id) + '">' +
              '<input type="checkbox"' + (vm.enabled ? ' checked' : '') + '>' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
            '<div class="rule-actions' + (vm.allowHoverActions ? '' : ' always-visible') + '">' +
              '<button class="btn-icon action-btn action-btn-edit edit-btn" data-rid="' + escapeHtml(vm.id) + '" title="编辑">' + renderActionIcon('edit', vm.editIcon) + '</button>' +
              '<button class="btn-icon action-btn action-btn-delete delete-btn" data-rid="' + escapeHtml(vm.id) + '" title="删除">' + renderActionIcon('delete', vm.deleteIcon) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  return {
    escapeHtml: escapeHtml,
    getRulePreview: getRulePreview,
    buildRuleItemViewModel: buildRuleItemViewModel,
    renderRuleItemHtml: renderRuleItemHtml
  };
});
