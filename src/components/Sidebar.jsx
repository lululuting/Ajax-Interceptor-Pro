import React, { useState } from 'react';
import { Button, Dropdown, Input, Switch, message } from 'antd';
import { AddIcon, DeleteIcon, EditIcon, FolderIcon, FolderOpenIcon, SearchIcon } from './LegacyIcons';
import { moveRuleToGroup, sortGroups } from '../utils/data';
import './Sidebar.css';

function readDragPayload(event) {
  const raw = event.dataTransfer.getData('application/ajax-interceptor-rule');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return { ruleId: event.dataTransfer.getData('text/plain') };
    }
  }

  return { ruleId: event.dataTransfer.getData('text/plain') };
}

export default function Sidebar({
  groups,
  currentGroupId,
  onSelect,
  onSaveGroups,
  onToggleGroup,
  onRequestCreateGroup,
  onRequestRenameGroup,
  onDeleteGroup,
  search,
  onSearchChange,
}) {
  const [dropTargetId, setDropTargetId] = useState(null);
  const sortedGroups = sortGroups(groups);
  const customGroups = sortedGroups.filter((group) => group.id !== 'default');
  const defaultGroup = sortedGroups.find((group) => group.id === 'default');
  const totalCount = sortedGroups.reduce((sum, group) => sum + (group.rules || []).length, 0);

  const handleDrop = async (event, targetGroupId) => {
    event.preventDefault();
    setDropTargetId(null);

    const { ruleId } = readDragPayload(event);
    if (!ruleId || targetGroupId === 'all') {
      return;
    }

    const moved = moveRuleToGroup(groups, ruleId, targetGroupId);
    if (!moved) {
      return;
    }

    await onSaveGroups(moved.groups);
    message.success(
      moved.fromGroup.id === targetGroupId ? '规则顺序已更新' : `规则已移动到 ${moved.toGroup.name}`,
    );
  };

  const renderGroupItem = (group, options = {}) => {
    const isAll = group.id === 'all';
    const isActive = currentGroupId === group.id;
    const count = options.count ?? (group.rules || []).length;
    const dropdownMenu = !isAll
      ? {
          items: [
            {
              key: 'rename',
              label: '重命名',
              icon: <EditIcon />,
            },
            {
              key: 'delete',
              label: '删除',
              icon: <DeleteIcon />,
              danger: true,
              disabled: group.id === 'default',
            },
          ],
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();
            if (key === 'rename') {
              onRequestRenameGroup(group.id);
            } else if (key === 'delete') {
              onDeleteGroup(group.id);
            }
          },
        }
      : null;

    const content = (
      <div
        className={`group-item${isActive ? ' active' : ''}${dropTargetId === group.id ? ' drag-over' : ''}`}
        onClick={() => onSelect(group.id)}
        onDragOver={
          isAll
            ? undefined
            : (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTargetId(group.id);
              }
        }
        onDragLeave={isAll ? undefined : () => setDropTargetId((current) => (current === group.id ? null : current))}
        onDrop={isAll ? undefined : (event) => handleDrop(event, group.id)}
      >
        <span className="group-icon">{options.icon}</span>
        <span className="group-name">{group.name}</span>
        <span className="group-count">{count}</span>
        {!isAll && (
          <div className="group-actions" onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={group.enabled}
              onChange={(checked) => onToggleGroup(group.id, checked)}
              size="small"
            />
          </div>
        )}
      </div>
    );

    if (!dropdownMenu) {
      return (
        <div key={group.id} className="group-item-context-holder">
          {content}
        </div>
      );
    }

    return (
      <Dropdown key={group.id} trigger={['contextMenu']} menu={dropdownMenu} overlayClassName="group-menu-overlay">
        <div className="group-item-context-holder">{content}</div>
      </Dropdown>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Input
          placeholder="搜索接口..."
          prefix={<SearchIcon />}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="sidebar-search-input"
        />
      </div>

      <div className="group-list">
        {renderGroupItem({ id: 'all', name: '全部', rules: [], enabled: true }, { icon: <FolderIcon />, count: totalCount })}
        {customGroups.map((group) => renderGroupItem(group, { icon: <FolderIcon /> }))}
        {defaultGroup && renderGroupItem(defaultGroup, { icon: <FolderOpenIcon /> })}
      </div>

      <div className="sidebar-footer">
        <Button className="btn btn-secondary btn-block" onClick={onRequestCreateGroup} icon={<AddIcon />}>
          新建分组
        </Button>
      </div>
    </aside>
  );
}
