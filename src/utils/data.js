import { genId } from './index.js';

export const DEFAULT_SETTINGS = Object.freeze({
  showHitCount: true,
  openMode: 'popup',
});

export function createDefaultGroup(overrides = {}) {
  return {
    id: 'default',
    name: '未分组',
    enabled: true,
    order: 999,
    rules: [],
    ...overrides,
    id: 'default',
    rules: reindexRules(overrides.rules || []),
  };
}

export function reindexRules(rules = []) {
  return (Array.isArray(rules) ? rules : []).filter(Boolean).map((rule, index) => ({
    ...rule,
    id: rule.id || genId(),
    method: rule.method || 'GET',
    status: Number(rule.status) || 200,
    enabled: rule.enabled !== false,
    order: index,
  }));
}

export function normalizeGroups(groups = []) {
  const source = Array.isArray(groups) ? groups.filter(Boolean) : [];
  const defaultGroup = source.find((group) => group.id === 'default');
  const customGroups = source
    .filter((group) => group.id !== 'default')
    .map((group, index) => ({
      ...group,
      id: group.id || genId(),
      name: group.name || `分组 ${index + 1}`,
      enabled: group.enabled !== false,
      order: Number.isFinite(group.order) ? group.order : index,
      rules: reindexRules(group.rules || []),
    }))
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((group, index) => ({
      ...group,
      order: index,
    }));

  return [...customGroups, createDefaultGroup(defaultGroup || {})];
}

export function sortGroups(groups = []) {
  const normalized = normalizeGroups(groups);
  const defaultGroup = normalized.find((group) => group.id === 'default');
  const customGroups = normalized.filter((group) => group.id !== 'default');
  return defaultGroup ? [...customGroups, defaultGroup] : customGroups;
}

export function findRuleLocation(groups = [], ruleId) {
  for (const group of groups) {
    const ruleIndex = (group.rules || []).findIndex((rule) => rule.id === ruleId);
    if (ruleIndex >= 0) {
      return {
        group,
        groupId: group.id,
        rule: group.rules[ruleIndex],
        ruleIndex,
      };
    }
  }

  return null;
}

export function moveRuleToGroup(groups = [], ruleId, targetGroupId, targetIndex) {
  const normalized = normalizeGroups(groups);
  const location = findRuleLocation(normalized, ruleId);
  const targetGroup = normalized.find((group) => group.id === targetGroupId);

  if (!location || !targetGroup) {
    return null;
  }

  // 处理同一组内的移动
  if (location.groupId === targetGroupId) {
    const group = normalized.find((g) => g.id === location.groupId);
    const rules = [...(group.rules || [])];
    
    // 找到规则在原始数组中的索引
    const originalIndex = rules.findIndex((rule) => rule.id === ruleId);
    if (originalIndex === -1) {
      return null;
    }
    
    // 移除规则
    const removedRule = rules.splice(originalIndex, 1)[0];
    
    // 调整目标索引
    if (targetIndex > originalIndex) {
      targetIndex--;
    }
    
    // 插入规则
    rules.splice(targetIndex, 0, removedRule);
    
    // 更新组
    const updated = normalized.map((g) => 
      g.id === location.groupId 
        ? { ...g, rules: reindexRules(rules) } 
        : g
    );
    
    return {
      groups: updated,
      movedRule: location.rule,
      fromGroup: location.group,
      toGroup: { ...location.group, rules: reindexRules(rules) },
    };
  }
  
  // 处理跨组移动
  const updated = normalized.map((group) => {
    if (group.id === location.groupId) {
      return {
        ...group,
        rules: reindexRules((group.rules || []).filter((rule) => rule.id !== ruleId)),
      };
    }

    return {
      ...group,
      rules: [...(group.rules || [])],
    };
  });

  const destination = updated.find((group) => group.id === targetGroupId);
  const rules = [...(destination.rules || [])];
  
  // 插入到指定位置
  if (targetIndex !== undefined && targetIndex >= 0) {
    rules.splice(targetIndex, 0, { ...location.rule });
  } else {
    // 默认添加到末尾
    rules.push({ ...location.rule });
  }
  
  destination.rules = reindexRules(rules);

  return {
    groups: updated,
    movedRule: location.rule,
    fromGroup: location.group,
    toGroup: destination,
  };
}

export function getRulePreview(response, maxLength = 50) {
  if (!response) {
    return '📄 无数据';
  }

  let preview = '';
  try {
    preview = JSON.stringify(JSON.parse(response));
  } catch (error) {
    preview = String(response);
  }

  return preview.length > maxLength ? `${preview.slice(0, maxLength)}...` : preview;
}

function isRuleLike(item) {
  return !!item && typeof item === 'object' && (
    Object.prototype.hasOwnProperty.call(item, 'urlPattern') ||
    Object.prototype.hasOwnProperty.call(item, 'method') ||
    Object.prototype.hasOwnProperty.call(item, 'response')
  );
}

function isGroupLike(item) {
  return !!item && typeof item === 'object' && (
    Array.isArray(item.rules) ||
    Object.prototype.hasOwnProperty.call(item, 'name') ||
    Object.prototype.hasOwnProperty.call(item, 'id')
  );
}

function wrapRulesAsDefaultGroup(rules) {
  return [
    createDefaultGroup({
      rules: Array.isArray(rules) ? rules : [],
    }),
  ];
}

export function parseImportedGroups(rawText) {
  const sanitizedText = String(rawText || '').replace(/^\uFEFF/, '').trim();
  const parsed = JSON.parse(sanitizedText);

  if (Array.isArray(parsed)) {
    if (parsed.every(isRuleLike)) {
      return wrapRulesAsDefaultGroup(parsed);
    }

    if (parsed.every(isGroupLike)) {
      return parsed;
    }
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.groups)) {
      return parsed.groups;
    }

    if (parsed.data && Array.isArray(parsed.data.groups)) {
      return parsed.data.groups;
    }

    if (Array.isArray(parsed.rules)) {
      return wrapRulesAsDefaultGroup(parsed.rules);
    }

    if (isGroupLike(parsed) && Array.isArray(parsed.rules)) {
      return [parsed];
    }
  }

  throw new Error('invalid-import-format');
}
