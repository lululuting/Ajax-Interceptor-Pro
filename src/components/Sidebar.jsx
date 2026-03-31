import React, { useState } from 'react';
import { Input, Button, Tooltip, Popconfirm } from 'antd';
import { FolderOutlined, FolderOpenOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { genId } from '../utils/index';
import './Sidebar.css';

export default function Sidebar({ groups, currentGroupId, onSelect, onSaveGroups }) {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const allCount = groups.reduce((s, g) => s + (g.rules || []).length, 0);

  const handleRenameStart = (g) => {
    setEditingId(g.id);
    setEditingName(g.name);
  };

  const handleRenameConfirm = async (groupId) => {
    if (!editingName.trim()) return;
    const updated = groups.map(g => g.id === groupId ? { ...g, name: editingName.trim() } : g);
    await onSaveGroups(updated);
    setEditingId(null);
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const newGroup = { id: genId(), name: newGroupName.trim(), enabled: true, order: groups.length, rules: [] };
    await onSaveGroups([...groups, newGroup]);
    setAddingGroup(false);
    setNewGroupName('');
  };

  const handleDeleteGroup = async (groupId) => {
    const updated = groups.filter(g => g.id !== groupId);
    await onSaveGroups(updated);
  };

  return (
    <aside style={{
      width: 200,
      borderRight: '1px solid #e5e7eb',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 10px 6px', borderBottom: '1px solid #f3f4f6' }}>
        <div
          className={`sidebar-item${currentGroupId === 'all' ? ' active' : ''}`}
          onClick={() => onSelect('all')}
        >
          <FolderOpenOutlined style={{ color: '#10b981', fontSize: 14 }} />
          <span style={{ flex: 1, fontSize: 13 }}>全部规则</span>
          <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', borderRadius: 10, padding: '1px 6px' }}>{allCount}</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px' }}>
        {groups.map(g => {
          const isDefault = g.id === 'default';
          const isActive = currentGroupId === g.id;
          const isEditing = editingId === g.id;
          const count = (g.rules || []).length;

          return (
            <div
              key={g.id}
              className={`sidebar-item${isActive ? ' active' : ''}`}
              onClick={() => { if (!isEditing) onSelect(g.id); }}
            >
              {isEditing ? (
                <>
                  <Input
                    size="small"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(g.id); if (e.key === 'Escape') setEditingId(null); }}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, height: 24, fontSize: 12 }}
                  />
                  <CheckOutlined style={{ color: '#10b981', cursor: 'pointer', fontSize: 12 }} onClick={e => { e.stopPropagation(); handleRenameConfirm(g.id); }} />
                  <CloseOutlined style={{ color: '#9ca3af', cursor: 'pointer', fontSize: 12 }} onClick={e => { e.stopPropagation(); setEditingId(null); }} />
                </>
              ) : (
                <>
                  <FolderOutlined style={{ color: isActive ? '#10b981' : '#6b7280', fontSize: 14, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', borderRadius: 10, padding: '1px 6px', flexShrink: 0 }}>{count}</span>
                  {isActive && !isDefault && (
                    <span className="sidebar-item-actions" onClick={e => e.stopPropagation()}>
                      <Tooltip title="重命名">
                        <EditOutlined style={{ fontSize: 12, color: '#6b7280', cursor: 'pointer' }} onClick={() => handleRenameStart(g)} />
                      </Tooltip>
                      <Popconfirm
                        title="删除分组"
                        description="分组内的规则也会被删除"
                        onConfirm={() => handleDeleteGroup(g.id)}
                        okText="删除"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                      >
                        <DeleteOutlined style={{ fontSize: 12, color: '#ef4444', cursor: 'pointer' }} />
                      </Popconfirm>
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}

        {addingGroup ? (
          <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
            <Input
              size="small"
              placeholder="分组名称"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName(''); } }}
              autoFocus
              style={{ flex: 1, fontSize: 12 }}
            />
            <CheckOutlined style={{ color: '#10b981', cursor: 'pointer', fontSize: 12, marginTop: 4 }} onClick={handleAddGroup} />
            <CloseOutlined style={{ color: '#9ca3af', cursor: 'pointer', fontSize: 12, marginTop: 4 }} onClick={() => { setAddingGroup(false); setNewGroupName(''); }} />
          </div>
        ) : (
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setAddingGroup(true)}
            style={{ width: '100%', marginTop: 6, fontSize: 12, color: '#10b981', borderColor: '#10b981' }}
          >
            新建分组
          </Button>
        )}
      </div>
    </aside>
  );
}
