(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StorageNormalizer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  function genId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  function reindexRules(rules) {
    return (Array.isArray(rules) ? rules : []).filter(Boolean).map(function(rule, index) {
      return {
        id: rule.id || genId(),
        method: rule.method || 'GET',
        status: Number(rule.status) || 200,
        enabled: rule.enabled !== false,
        order: index,
        name: rule.name,
        urlPattern: rule.urlPattern,
        response: rule.response
      };
    });
  }

  function createDefaultGroup(overrides) {
    overrides = overrides || {};

    return {
      id: 'default',
      name: '未分组',
      enabled: true,
      order: 999,
      rules: [],
      id: 'default',
      name: overrides.name || '未分组',
      enabled: overrides.enabled !== false,
      order: 999,
      rules: reindexRules(overrides.rules || [])
    };
  }

  function normalizeGroups(groups) {
    var source = Array.isArray(groups) ? groups.filter(Boolean) : [];
    var defaultGroup = source.find(function(group) {
      return group.id === 'default';
    });

    var customGroups = source
      .filter(function(group) {
        return group.id !== 'default';
      })
      .map(function(group, index) {
        return {
          id: group.id || genId(),
          name: group.name || ('分组 ' + (index + 1)),
          enabled: group.enabled !== false,
          order: Number.isFinite(group.order) ? group.order : index,
          rules: reindexRules(group.rules || [])
        };
      })
      .sort(function(left, right) {
        return (left.order || 0) - (right.order || 0);
      })
      .map(function(group, index) {
        return {
          id: group.id,
          name: group.name,
          enabled: group.enabled,
          order: index,
          rules: group.rules
        };
      });

    return customGroups.concat(createDefaultGroup(defaultGroup || {}));
  }

  function toComparableGroups(groups) {
    return (Array.isArray(groups) ? groups : []).filter(Boolean).map(function(group, index) {
      return {
        id: group.id,
        name: group.name,
        enabled: group.enabled !== false,
        order: Number.isFinite(group.order) ? group.order : index,
        rules: (Array.isArray(group.rules) ? group.rules : []).filter(Boolean).map(function(rule, ruleIndex) {
          return {
            id: rule.id,
            method: rule.method || 'GET',
            status: Number(rule.status) || 200,
            enabled: rule.enabled !== false,
            order: Number.isFinite(rule.order) ? rule.order : ruleIndex,
            name: rule.name,
            urlPattern: rule.urlPattern,
            response: rule.response
          };
        })
      };
    });
  }

  function normalizeGroupsWithMeta(groups) {
    var rawGroups = Array.isArray(groups) ? groups : [];
    var normalizedGroups = normalizeGroups(rawGroups);

    return {
      groups: normalizedGroups,
      changed: JSON.stringify(toComparableGroups(rawGroups)) !== JSON.stringify(toComparableGroups(normalizedGroups))
    };
  }

  return {
    normalizeGroups: normalizeGroups,
    normalizeGroupsWithMeta: normalizeGroupsWithMeta
  };
});
