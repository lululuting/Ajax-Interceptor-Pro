import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal, Popconfirm, Radio, Switch, message } from 'antd';
import RuleEditor from './RuleEditor';
import { genId } from '../utils/index';
import {
  AddIcon,
  CodeIcon,
  DeleteIcon,
  EditIcon,
  ExportIcon,
  FileIcon,
  ImportIcon,
  ListIcon,
  RadarTargetIcon,
} from './LegacyIcons';
import {
  findRuleLocation,
  getRulePreview,
  moveRuleToGroup,
  normalizeGroups,
  parseImportedGroups,
  reindexRules,
  sortGroups,
} from '../utils/data';

function prepareGroupsForExport(groups = []) {
  return (Array.isArray(groups) ? groups : []).filter(Boolean).map((group, index) => ({
    ...group,
    id: group.id || `group-${index + 1}`,
    name: group.name || `分组 ${index + 1}`,
    enabled: group.enabled !== false,
    order: Number.isFinite(group.order) ? group.order : index,
    rules: reindexRules(group.rules || []),
  }));
}

export default function RuleList({
  groups,
  currentGroupId,
  search,
  hitCounts,
  settings,
  onSaveGroups,
  onSaveStoragePatch,
  onRequestRenameGroup,
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState('all');
  const [importOpen, setImportOpen] = useState(false);
  const [importStrategy, setImportStrategy] = useState('merge');
  const [importFileName, setImportFileName] = useState('');
  const [importPayload, setImportPayload] = useState(null);
  const [fileDragging, setFileDragging] = useState(false);
  const fileInputRef = useRef(null);

  const resetImportState = () => {
    setImportOpen(false);
    setImportPayload(null);
    setImportFileName('');
    setImportStrategy('merge');
    setFileDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentGroup = currentGroupId === 'all' ? null : groups.find((group) => group.id === currentGroupId);
  const sortedGroups = sortGroups(groups);
  const keyword = search.trim().toLowerCase();
  const visibleRules = [];

  if (currentGroupId === 'all') {
    sortedGroups.forEach((group) => {
      (group.rules || []).forEach((rule) => {
        visibleRules.push({
          ...rule,
          groupId: group.id,
          groupName: group.name,
          groupEnabled: group.enabled !== false,
        });
      });
    });
  } else if (currentGroup) {
    (currentGroup.rules || []).forEach((rule) => {
      visibleRules.push({
        ...rule,
        groupId: currentGroup.id,
        groupName: currentGroup.name,
        groupEnabled: currentGroup.enabled !== false,
      });
    });
  }

  const filteredRules = visibleRules
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .filter((rule) => {
      if (!keyword) {
        return true;
      }

      return (
        (rule.name || '').toLowerCase().includes(keyword) ||
        (rule.urlPattern || '').toLowerCase().includes(keyword) ||
        (rule.response || '').toLowerCase().includes(keyword)
      );
    });

  const handleAddRule = (groupId) => {
    setEditingRule(null);
    setEditingGroupId(groupId || currentGroupId || 'default');
    setEditorOpen(true);
  };

  const handleEditRule = (rule, groupId) => {
    setEditingRule(rule);
    setEditingGroupId(groupId);
    setEditorOpen(true);
  };

  const handleDeleteRule = async (ruleId) => {
    const location = findRuleLocation(groups, ruleId);
    if (!location) {
      return;
    }

    const nextGroups = normalizeGroups(
      groups.map((group) =>
        group.id === location.groupId
          ? { ...group, rules: reindexRules((group.rules || []).filter((rule) => rule.id !== ruleId)) }
          : group,
      ),
    );
    const nextHitCounts = { ...hitCounts };
    delete nextHitCounts[ruleId];

    await onSaveStoragePatch({
      groups: nextGroups,
      hitCounts: nextHitCounts,
    });
    message.success('规则已删除');
  };

  const handleToggleRule = async (ruleId, checked) => {
    const location = findRuleLocation(groups, ruleId);
    if (!location) {
      return;
    }

    const nextGroups = groups.map((group) =>
      group.id !== location.groupId
        ? group
        : {
            ...group,
            rules: reindexRules(
              (group.rules || []).map((rule) => (rule.id === ruleId ? { ...rule, enabled: checked } : rule)),
            ),
          },
    );
    await onSaveGroups(nextGroups);
  };

  const handleSaveRule = async (rule, targetGroupId) => {
    const normalized = normalizeGroups(groups).map((group) => ({
      ...group,
      rules: [...(group.rules || [])],
    }));
    const draft = {
      ...rule,
      enabled: rule.enabled !== false,
      method: rule.method || 'GET',
      status: Number(rule.status) || 200,
    };

    if (editingRule) {
      const originalLocation = findRuleLocation(normalized, editingRule.id);
      if (!originalLocation) {
        return;
      }

      if (originalLocation.groupId === targetGroupId) {
        const nextGroups = normalized.map((group) =>
          group.id !== targetGroupId
            ? group
            : {
                ...group,
                rules: reindexRules(
                  (group.rules || []).map((item) => (item.id === editingRule.id ? { ...item, ...draft, id: editingRule.id } : item)),
                ),
              },
        );
        await onSaveGroups(nextGroups);
      } else {
        const withoutSource = normalized.map((group) =>
          group.id !== originalLocation.groupId
            ? group
            : {
                ...group,
                rules: reindexRules((group.rules || []).filter((item) => item.id !== editingRule.id)),
              },
        );

        const nextGroups = withoutSource.map((group) =>
          group.id !== targetGroupId
            ? group
            : {
                ...group,
                rules: reindexRules([...(group.rules || []), { ...draft, id: editingRule.id }]),
              },
        );

        await onSaveGroups(nextGroups);
      }
    } else {
      const newRule = { ...draft, id: genId() };
      const nextGroups = normalized.map((group) =>
        group.id !== targetGroupId
          ? group
          : {
              ...group,
              rules: reindexRules([...(group.rules || []), newRule]),
            },
      );
      await onSaveGroups(nextGroups);
    }

    setEditorOpen(false);
    setEditingRule(null);
    message.success(editingRule ? '规则已更新' : '规则已创建');
  };

  const doExport = () => {
    const exportGroups =
      exportScope === 'current' && currentGroupId !== 'all'
        ? groups.filter((group) => group.id === currentGroupId)
        : groups;

    const data = {
      version: '2.1.0',
      exportTime: new Date().toISOString(),
      groups: prepareGroupsForExport(exportGroups),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ajax-interceptor-${new Date().toISOString().split('T')[0]}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
    message.success('导出成功');
  };

  const handleImportFile = async (file) => {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const groupsToImport = parseImportedGroups(text);
      setImportPayload(groupsToImport);
      setImportFileName(file.name);
      message.success(`已选择：${file.name}`);
    } catch (error) {
      setImportPayload(null);
      setImportFileName('');
      message.error('文件格式错误，请导入插件导出的 JSON 或包含规则数据的 JSON');
    }
  };

  const doImport = async () => {
    if (!importPayload) {
      message.error('请先选择导入文件');
      return;
    }

    let nextGroups;
    let nextHitCounts = hitCounts;
    if (importStrategy === 'overwrite') {
      nextGroups = normalizeGroups(
        importPayload.map((group) => ({
          ...group,
          id: group.id === 'default' ? 'default' : genId(),
          rules: (group.rules || []).map((rule) => ({ ...rule, id: genId() })),
        })),
      );
      nextHitCounts = {};
    } else {
      const merged = normalizeGroups(groups).map((group) => ({
        ...group,
        rules: [...(group.rules || [])],
      }));

      importPayload.forEach((incoming) => {
        const match =
          merged.find((group) => group.name === incoming.name) ||
          (incoming.id === 'default' ? merged.find((group) => group.id === 'default') : null);

        if (match) {
          const existingRules = match.rules || [];
          (incoming.rules || []).forEach((rule) => {
            const duplicated = existingRules.some(
              (item) => item.urlPattern === rule.urlPattern && (item.method || 'GET') === (rule.method || 'GET'),
            );
            if (!duplicated) {
              existingRules.push({ ...rule, id: genId() });
            }
          });
          match.rules = reindexRules(existingRules);
        } else {
          merged.push({
            ...incoming,
            id: incoming.id === 'default' ? 'default' : genId(),
            rules: (incoming.rules || []).map((rule) => ({ ...rule, id: genId() })),
          });
        }
      });

      nextGroups = normalizeGroups(merged);
    }

    await onSaveStoragePatch({
      groups: nextGroups,
      hitCounts: nextHitCounts,
    });
    resetImportState();
    message.success('导入成功');
  };

  const handleRuleDragStart = (event, ruleId, groupId) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', ruleId);
    event.dataTransfer.setData('application/ajax-interceptor-rule', JSON.stringify({ ruleId, fromGroupId: groupId }));
    event.currentTarget.classList.add('dragging');
  };

  const handleRuleDragEnd = (event) => {
    event.currentTarget.classList.remove('dragging');
  };

  const handleRuleDrop = async (event) => {
    if (currentGroupId === 'all') {
      return;
    }

    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const payload = event.dataTransfer.getData('application/ajax-interceptor-rule');
    let ruleId = event.dataTransfer.getData('text/plain');
    let fromGroupId = null;
    if (payload) {
      try {
        const data = JSON.parse(payload);
        ruleId = data.ruleId;
        fromGroupId = data.fromGroupId;
      } catch (error) {
        ruleId = event.dataTransfer.getData('text/plain');
      }
    }
    
    // 获取拖动时的具体位置
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const items = event.currentTarget.querySelectorAll('.rule-item');
    let targetIndex = items.length;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemRect = item.getBoundingClientRect();
      const itemY = itemRect.top - rect.top + itemRect.height / 2;
      if (y < itemY) {
        targetIndex = i;
        break;
      }
    }
    
    // 简化实现，直接调用 moveRuleToGroup 函数
    // 该函数已经处理了同一组内移动时的索引调整
    const moved = moveRuleToGroup(groups, ruleId, currentGroupId, targetIndex);
    if (!moved) {
      return;
    }

    await onSaveGroups(moved.groups);
    message.success(moved.fromGroup.id === currentGroupId ? '规则顺序已更新' : `规则已移动到 ${moved.toGroup.name}`);
  };

  const currentGroupName = currentGroupId === 'all' ? '全部规则' : (currentGroup?.name || '规则列表');
  const allowRenameCurrentGroup = currentGroupId !== 'all' && currentGroup;

  return (
    <main className="content">
      <div className="content-header">
        <div className="content-title-wrap">
          <h2 id="currentGroupName">{currentGroupName}</h2>
          {allowRenameCurrentGroup && (
            <Button
              type="text"
              size="small"
              icon={<EditIcon />}
              title="重命名分组"
              className="rename-current-group-btn btn-icon action-btn"
              onClick={() => onRequestRenameGroup(currentGroup.id)}
            />
          )}
        </div>
        <span className="rule-count">
          <ListIcon />
          <span>{filteredRules.length} 条规则</span>
        </span>
      </div>

      <div className="rule-list" id="ruleList">
        {filteredRules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <CodeIcon />
            </div>
            <h3>{keyword ? '未找到匹配规则' : '暂无规则'}</h3>
            <p>{keyword ? '尝试其他关键词' : '点击添加规则创建接口拦截'}</p>
            {!keyword && (
              <Button type="primary" className="btn btn-primary" icon={<AddIcon />} onClick={() => handleAddRule(currentGroupId === 'all' ? 'default' : currentGroupId)}>
                添加规则
              </Button>
            )}
          </div>
        ) : (
          <div className="rule-card">
            <div
              className="rule-items"
              data-gid={currentGroupId}
              onDragOver={
                currentGroupId === 'all'
                  ? undefined
                  : (event) => {
                      event.preventDefault();
                      event.currentTarget.classList.add('drag-over');
                    }
              }
              onDragLeave={
                currentGroupId === 'all'
                  ? undefined
                  : (event) => {
                      event.currentTarget.classList.remove('drag-over');
                    }
              }
              onDrop={currentGroupId === 'all' ? undefined : handleRuleDrop}
            >
              {filteredRules.map((rule) => (
                <RuleItem
                  key={rule.id}
                  rule={rule}
                  groupId={rule.groupId}
                  hitCount={hitCounts?.[rule.id] || 0}
                  showHitCount={settings?.showHitCount !== false}
                  showGroupName={currentGroupId === 'all'}
                  onEdit={() => handleEditRule(rule, rule.groupId)}
                  onDelete={() => handleDeleteRule(rule.id)}
                  onToggle={(checked) => handleToggleRule(rule.id, checked)}
                  onDragStart={(event) => handleRuleDragStart(event, rule.id, rule.groupId)}
                  onDragEnd={handleRuleDragEnd}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="content-footer">
        <Button type="primary" icon={<AddIcon />} onClick={() => handleAddRule(currentGroupId === 'all' ? 'default' : currentGroupId)}>
          添加规则
        </Button>
        <div className="spacer"></div>
        <Button icon={<ImportIcon />} onClick={() => setImportOpen(true)}>
          导入
        </Button>
        <Button icon={<ExportIcon />} onClick={() => setExportOpen(true)}>
          导出
        </Button>
      </div>

      <RuleEditor
        open={editorOpen}
        rule={editingRule}
        groupId={editingGroupId}
        groups={groups}
        onSave={handleSaveRule}
        onClose={() => {
          setEditorOpen(false);
          setEditingRule(null);
        }}
      />
      <Modal
        open={exportOpen}
        title="导出数据"
        onCancel={() => setExportOpen(false)}
        onOk={doExport}
        okText="导出"
        cancelText="取消"
        centered
        maskClosable
      >
        <Radio.Group value={exportScope} onChange={(event) => setExportScope(event.target.value)} className="radio-group">
          <Radio value="all">导出全部</Radio>
          <Radio value="current">仅导出当前分组</Radio>
        </Radio.Group>
      </Modal>
      <Modal
        open={importOpen}
        title="导入数据"
        onCancel={resetImportState}
        onOk={doImport}
        okText="导入"
        cancelText="取消"
        okButtonProps={{ disabled: !importPayload }}
        centered
        maskClosable
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          hidden
          onChange={(event) => handleImportFile(event.target.files?.[0])}
        />
        <div
          className={`file-drop-zone${fileDragging ? ' drag-over' : ''}`}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
              fileInputRef.current.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setFileDragging(true);
          }}
          onDragLeave={() => setFileDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setFileDragging(false);
            handleImportFile(event.dataTransfer.files?.[0]);
          }}
        >
          <div className="file-drop-content">
            <FileIcon />
            <p>{importFileName || '点击或拖拽文件到此处'}</p>
            <p className="text-muted">支持 .json 格式</p>
          </div>
        </div>
        <Radio.Group
          value={importStrategy}
          onChange={(event) => setImportStrategy(event.target.value)}
          className="radio-group import-radio-group"
        >
          <Radio value="merge">合并</Radio>
          <Radio value="overwrite">覆盖</Radio>
        </Radio.Group>
      </Modal>
    </main>
  );
}

function RuleItem({
  rule,
  hitCount,
  showHitCount,
  showGroupName,
  onEdit,
  onDelete,
  onToggle,
  onDragStart,
  onDragEnd,
}) {
  const enabled = rule.enabled !== false;
  const method = rule.method || 'GET';
  const methodClass = String(method === '*' ? 'all' : method).toLowerCase();
  const preview = getRulePreview(rule.response, 50);
  const previousHitCountRef = useRef(hitCount);
  const [hitAnimationVersion, setHitAnimationVersion] = useState(0);

  useEffect(() => {
    if (hitCount > previousHitCountRef.current) {
      setHitAnimationVersion((version) => version + 1);
    }
    previousHitCountRef.current = hitCount;
  }, [hitCount]);

  return (
    <div
      className={`rule-item${!enabled || rule.groupEnabled === false ? ' disabled' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <span className="drag-handle" title="拖动排序">⋮⋮</span>
      <div className="rule-main">
        <div className="rule-name-row">
          <span className={`rule-method ${methodClass}`}>{method}</span>
          <span className="rule-name rule-name-main" title={rule.name || '未命名规则'}>
            {rule.name || '未命名规则'}
          </span>
        </div>
        <div className="rule-meta">
          {showGroupName && rule.groupName ? <span className="rule-group-label">{rule.groupName}</span> : null}
          <code className="rule-preview">{preview}</code>
        </div>
      </div>
      <div className="rule-side">
        <div className="rule-side-title">
          <span className="rule-url rule-route-side" title={rule.urlPattern}>
            {rule.urlPattern}
          </span>
        </div>
        <div className="rule-side-controls">
          {showHitCount && (
            <span
              key={`${rule.id}-${hitAnimationVersion}`}
              className={`hit-badge${hitCount > 0 ? ' hit-active' : ''}${hitAnimationVersion > 0 ? ' hit-badge-burst' : ''}`}
              title={`命中 ${hitCount} 次`}
            >
              <b>{hitCount}</b>
              <RadarTargetIcon />
            </span>
          )}
          <Switch checked={enabled} onChange={onToggle} size="small" />
          <div className="rule-actions">
            <Button type="text" size="small" icon={<EditIcon />} onClick={onEdit} className="btn-icon action-btn action-btn-edit" />
            <Popconfirm
              title="删除规则"
              description="确定要删除这条规则吗？"
              onConfirm={onDelete}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" icon={<DeleteIcon />} className="btn-icon action-btn action-btn-delete" />
            </Popconfirm>
          </div>
        </div>
      </div>
    </div>
  );
}
