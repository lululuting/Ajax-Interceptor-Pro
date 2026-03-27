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

  function renderRuleItemHtml(vm) {
    return '' +
      '<div class="rule-item' + (vm.disabled ? ' disabled' : '') + (vm.hitActive ? ' has-hit' : '') + '" data-rid="' + escapeHtml(vm.id) + '"' + (vm.draggable ? ' draggable="true"' : '') + '>' +
        '<span class="drag-handle" title="拖动排序">' + vm.dragIcon + '</span>' +
        '<div class="rule-main">' +
          '<div class="rule-route-row">' +
            '<span class="rule-method ' + escapeHtml(vm.methodClass) + '">' + escapeHtml(vm.method) + '</span>' +
            '<span class="rule-url" title="' + escapeHtml(vm.urlPattern) + '">' + escapeHtml(vm.urlPattern) + '</span>' +
          '</div>' +
          '<div class="rule-meta">' +
            (vm.showGroupName && vm.groupName ? '<span class="rule-group-label">' + escapeHtml(vm.groupName) + '</span>' : '') +
            '<code class="rule-preview">' + escapeHtml(vm.preview) + '</code>' +
          '</div>' +
        '</div>' +
        '<div class="rule-side">' +
          '<div class="rule-side-title"><span class="rule-name" title="' + escapeHtml(vm.name) + '">' + escapeHtml(vm.name) + '</span></div>' +
          '<div class="rule-side-controls">' +
            renderHitBadge(vm) +
            '<label class="rule-toggle" data-rid="' + escapeHtml(vm.id) + '">' +
              '<input type="checkbox"' + (vm.enabled ? ' checked' : '') + '>' +
              '<span class="toggle-slider"></span>' +
            '</label>' +
          '</div>' +
        '</div>' +
        '<div class="rule-actions' + (vm.allowHoverActions ? '' : ' always-visible') + '">' +
          '<button class="btn-icon edit-btn" data-rid="' + escapeHtml(vm.id) + '" title="编辑">' + vm.editIcon + '</button>' +
          '<button class="btn-icon delete-btn" data-rid="' + escapeHtml(vm.id) + '" title="删除">' + vm.deleteIcon + '</button>' +
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
