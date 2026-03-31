import React, { useState } from 'react';
import { Button, Switch, Tag, Tooltip, Popconfirm, Input, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExportOutlined, ImportOutlined, ClearOutlined } from '@ant-design/icons';
import RuleEditor from './RuleEditor';
import { genId } from '../utils/index';

const METHOD_COLORS = { GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'purple', '*': 'default' };

export default function RuleList({ groups, currentGroupId, hitCounts, settings, onSaveGroups, onSaveHitCounts }) {
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);

  const visibleGroups = currentGroupId === 'all' ? groups : groups.filter(g => g.id === currentGroupId);
  const filteredGroups = visibleGroups.map(g => ({
    ...g,
    rules: (g.rules || []).filter(r =>
      !search ||
      (r.urlPattern || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.name || '').toLowerCase().includes(search.toLowerCase())
    ),
  }));

  const handleAddRule = (groupId) => {
    setEditingRule(null);
    setEditingGroupId(groupId || groups[0]?.id || 'default');
    setEditorOpen(true);
  };

  const handleEditRule = (rule, groupId) => {
    setEditingRule(rule);
    setEditingGroupId(groupId);
    setEditorOpen(true);
  };

  const handleDeleteRule = async (ruleId, groupId) => {
    const updated = groups.map(g =>
      g.id !== groupId ? g : { ...g, rules: (g.rules || []).filter(r => r.id !== ruleId) }
    );
    await onSaveGroups(updated);
  };

  const handleToggleRule = async (ruleId, groupId, enabled) => {
    const updated = groups.map(g =>
      g.id !== groupId ? g : { ...g, rules: (g.rules || []).map(r => r.id === ruleId ? { ...r, enabled } : r) }
    );
    await onSaveGroups(updated);
  };

  const handleSaveRule = async (rule, targetGroupId) => {
    let updated;
    if (editingRule) {
      // Remove from original group, add/update in target group
      if (editingGroupId !== targetGroupId) {
        updated = groups.map(g => {
          if (g.id === editingGroupId) return { ...g, rules: (g.rules || []).filter(r => r.id !== rule.id) };
          if (g.id === targetGroupId) return { ...g, rules: [...(g.rules || []), rule] };
          return g;
        });
      } else {
        updated = groups.map(g =>
          g.id !== targetGroupId ? g : { ...g, rules: (g.rules || []).map(r => r.id === rule.id ? rule : r) }
        );
      }
    } else {
      updated = groups.map(g =>
        g.id !== targetGroupId ? g : { ...g, rules: [...(g.rules || []), { ...rule, id: genId() }] }
      );
    }
    await onSaveGroups(updated);
    setEditorOpen(false);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(groups, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ajax-interceptor-rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (Array.isArray(imported)) await onSaveGroups(imported);
      } catch {}
    };
    input.click();
  };

  const totalRules = groups.reduce((s, g) => s + (g.rules || []).length, 0);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="搜索规则..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          style={{ flex: 1, maxWidth: 260 }}
          allowClear
        />
        <div style={{ flex: 1 }} />
        <Tooltip title="导入规则"><Button size="small" icon={<ImportOutlined />} onClick={handleImport} /></Tooltip>
        <Tooltip title="导出规则"><Button size="small" icon={<ExportOutlined />} onClick={handleExport} /></Tooltip>
        <Tooltip title="清除命中计数"><Button size="small" icon={<ClearOutlined />} onClick={() => onSaveHitCounts({})} /></Tooltip>
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddRule(currentGroupId === 'all' ? groups[0]?.id : currentGroupId)}
          style={{ background: '#10b981', borderColor: '#10b981' }}
        >
          新建规则
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {totalRules === 0 && !search ? (
          <Empty description="暂无规则" style={{ marginTop: 60 }} />
        ) : (
          filteredGroups.map(g => (
            <div key={g.id} style={{ marginBottom: 16 }}>
              {currentGroupId === 'all' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>({(g.rules || []).length})</span>
                </div>
              )}
              {(g.rules || []).length === 0 && search ? null : (
                (g.rules || []).map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    groupId={g.id}
                    hitCount={hitCounts[rule.id] || 0}
                    showHitCount={settings.showHitCount}
                    onEdit={() => handleEditRule(rule, g.id)}
                    onDelete={() => handleDeleteRule(rule.id, g.id)}
                    onToggle={(enabled) => handleToggleRule(rule.id, g.id, enabled)}
                  />
                ))
              )}
              {(g.rules || []).length === 0 && !search && currentGroupId !== 'all' && (
                <Empty description="此分组暂无规则" style={{ margin: '20px 0' }} />
              )}
            </div>
          ))
        )}
      </div>

      <RuleEditor
        open={editorOpen}
        rule={editingRule}
        groupId={editingGroupId}
        groups={groups}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveRule}
      />
    </div>
  );
}

function RuleCard({ rule, hitCount, showHitCount, onEdit, onDelete, onToggle }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      opacity: rule.enabled ? 1 : 0.5,
      transition: 'opacity 0.2s',
    }}>
      <Switch
        checked={rule.enabled}
        onChange={onToggle}
        size="small"
        style={{ flexShrink: 0 }}
      />
      <Tag color={METHOD_COLORS[rule.method] || 'default'} style={{ flexShrink: 0, margin: 0, fontSize: 11 }}>
        {rule.method || '*'}
      </Tag>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {rule.name && (
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rule.name}
          </div>
        )}
        <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rule.urlPattern}
        </div>
      </div>
      {showHitCount && hitCount > 0 && (
        <Tag color="green" style={{ flexShrink: 0, margin: 0, fontSize: 11 }}>{hitCount} 次</Tag>
      )}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <Tooltip title="编辑">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} style={{ color: '#6b7280' }} />
        </Tooltip>
        <Popconfirm
          title="删除规则"
          description="确定要删除这条规则吗？"
          onConfirm={onDelete}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="删除">
            <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#ef4444' }} />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  );
}
