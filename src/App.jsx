import React, { useEffect, useState } from 'react';
import { Button, ConfigProvider, Form, Input, Modal, Switch, message, theme } from 'antd';
import Sidebar from './components/Sidebar';
import RuleList from './components/RuleList';
import SettingsModal from './components/SettingsModal';
import { useStorage } from './hooks/useStorage';
import { LogoIcon, SettingsIcon } from './components/LegacyIcons';
import { normalizeGroups, sortGroups } from './utils/data';
import { getRuntimeModeHint } from './utils/mode';
import { normalizeThemeMode, resolveThemeMode } from './utils/theme';
import './app.css';

const LIGHT_THEME_TOKENS = {
  colorBgBase: '#f9fafb',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBorder: '#e5e7eb',
  colorText: '#1f2937',
  colorTextSecondary: '#6b7280',
  colorTextTertiary: '#9ca3af',
};

const DARK_THEME_TOKENS = {
  colorBgBase: '#0b1220',
  colorBgContainer: '#111827',
  colorBgElevated: '#090f10',
  colorBorder: '#253244',
  colorText: '#e5edf6',
  colorTextSecondary: '#9fb0c7',
  colorTextTertiary: '#6f8197',
};

export default function App({ mode }) {
  const storage = useStorage();
  const [currentGroupId, setCurrentGroupId] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groupModal, setGroupModal] = useState({ open: false, mode: 'create', groupId: null });
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return resolveThemeMode('auto', window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    return 'light';
  });
  const [groupForm] = Form.useForm();

  const groups = sortGroups(storage.groups);
  const editingGroup = groupModal.groupId ? groups.find((group) => group.id === groupModal.groupId) : null;
  const themeMode = normalizeThemeMode(storage.settings.themeMode);
  const isDarkTheme = resolvedTheme === 'dark';

  useEffect(() => {
    if (currentGroupId !== 'all' && !groups.some((group) => group.id === currentGroupId)) {
      setCurrentGroupId('all');
    }
  }, [currentGroupId, groups]);

  useEffect(() => {
    if (!groupModal.open) {
      groupForm.resetFields();
      return;
    }

    groupForm.setFieldsValue({
      name: editingGroup?.name || '',
    });
  }, [editingGroup, groupForm, groupModal.open]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setResolvedTheme(resolveThemeMode(themeMode, false));
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncTheme = () => {
      setResolvedTheme(resolveThemeMode(themeMode, mediaQuery.matches));
    };

    syncTheme();

    if (themeMode !== 'auto') {
      return undefined;
    }

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncTheme);
      return () => mediaQuery.removeEventListener('change', syncTheme);
    }

    mediaQuery.addListener(syncTheme);
    return () => mediaQuery.removeListener(syncTheme);
  }, [themeMode]);

  useEffect(() => {
    document.body.dataset.appMode = mode;
    document.documentElement.dataset.appMode = mode;
    document.body.dataset.appTheme = resolvedTheme;
    document.documentElement.dataset.appTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;

    return () => {
      delete document.body.dataset.appMode;
      delete document.documentElement.dataset.appMode;
      delete document.body.dataset.appTheme;
      delete document.documentElement.dataset.appTheme;
      document.documentElement.style.colorScheme = '';
    };
  }, [mode, resolvedTheme]);

  if (storage.loading) return null;

  const runtimeHint = getRuntimeModeHint(mode, storage.settings.openMode);

  const openCreateGroupModal = () => setGroupModal({ open: true, mode: 'create', groupId: null });
  const openRenameGroupModal = (groupId) => setGroupModal({ open: true, mode: 'rename', groupId });
  const closeGroupModal = () => setGroupModal({ open: false, mode: 'create', groupId: null });

  const handleSubmitGroup = async () => {
    const values = await groupForm.validateFields();
    const name = values.name.trim();
    const nextGroups = normalizeGroups(
      groupModal.mode === 'rename' && editingGroup
        ? groups.map((group) => (group.id === editingGroup.id ? { ...group, name } : group))
        : [...groups, { id: undefined, name, enabled: true, rules: [], order: groups.length }],
    );

    await storage.saveGroups(nextGroups);
    closeGroupModal();
    message.success(groupModal.mode === 'rename' ? '分组已更新' : '分组已创建');
  };

  const handleToggleGroup = async (groupId, enabled) => {
    const nextGroups = groups.map((group) => (group.id === groupId ? { ...group, enabled } : group));
    await storage.saveGroups(nextGroups);
  };

  const handleDeleteGroup = (groupId) => {
    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup || groupId === 'default') {
      return;
    }

    Modal.confirm({
      title: '删除规则组',
      content: '删除此规则组将同时删除组内所有规则，此操作不可恢复',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      maskClosable: true,
      centered: true,
      onOk: async () => {
        const nextGroups = normalizeGroups(groups.filter((group) => group.id !== groupId));
        const nextHitCounts = { ...storage.hitCounts };

        for (const rule of targetGroup.rules || []) {
          delete nextHitCounts[rule.id];
        }

        if (currentGroupId === groupId) {
          setCurrentGroupId('all');
        }

        await storage.save({
          groups: nextGroups,
          hitCounts: nextHitCounts,
        });
        message.success('分组已删除');
      },
    });
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkTheme ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#10b981',
          borderRadius: 12,
          fontSizeBase: 13,
          ...(isDarkTheme ? DARK_THEME_TOKENS : LIGHT_THEME_TOKENS),
        },
      }}
    >
      <div className={`app ${mode === 'devtools' ? 'devtools' : 'popup'}`}>
        {runtimeHint ? (
          <main className="mode-placeholder">
            <div className="mode-placeholder-card">
              <div className="mode-placeholder-badge">运行模式提示</div>
              <div className="mode-placeholder-icon" aria-hidden="true">
                <LogoIcon />
              </div>
              <h2>{runtimeHint.title}</h2>
              <p>{runtimeHint.message}</p>
              <div className="mode-placeholder-note">
                当前扩展主界面已经切换到 DevTools 面板，点击页面后按 `F12`，在顶部找到“Ajax拦截”标签即可。
              </div>
            </div>
          </main>
        ) : (
          <>
            <header className="header">
              <div className="header-title">
                <span className="logo"><LogoIcon /></span>
                <span>Ajax Interceptor Pro</span>
              </div>
              <div className="header-actions">
                <Switch checked={storage.globalEnabled} onChange={storage.saveGlobalEnabled} title="全局开关" />
                <Button className="header-settings-btn" type="text" onClick={() => setSettingsOpen(true)} title="设置" icon={<SettingsIcon />} />
              </div>
            </header>
            <div className="main">
              <Sidebar
                groups={groups}
                currentGroupId={currentGroupId}
                onSelect={setCurrentGroupId}
                onSaveGroups={storage.saveGroups}
                onToggleGroup={handleToggleGroup}
                onRequestCreateGroup={openCreateGroupModal}
                onRequestRenameGroup={openRenameGroupModal}
                onDeleteGroup={handleDeleteGroup}
                search={search}
                onSearchChange={setSearch}
              />
              <RuleList
                groups={groups}
                currentGroupId={currentGroupId}
                search={search}
                hitCounts={storage.hitCounts}
                settings={storage.settings}
                resolvedTheme={resolvedTheme}
                onSaveGroups={storage.saveGroups}
                onSaveStoragePatch={storage.save}
                onRequestRenameGroup={openRenameGroupModal}
              />
            </div>
          </>
        )}
      </div>
      <SettingsModal
        open={settingsOpen}
        settings={storage.settings}
        resolvedTheme={resolvedTheme}
        groups={groups}
        onClose={() => setSettingsOpen(false)}
        onSaveSettings={storage.saveSettings}
        onSaveGroups={storage.saveGroups}
        onSaveHitCounts={storage.saveHitCounts}
      />
      <Modal
        open={groupModal.open}
        title={groupModal.mode === 'rename' ? '重命名分组' : '新建分组'}
        onCancel={closeGroupModal}
        onOk={handleSubmitGroup}
        okText="确认"
        cancelText="取消"
        centered
        maskClosable
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            label="分组名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入分组名称' },
              { max: 32, message: '分组名称不能超过 32 个字符' },
              {
                validator: async (_, value) => {
                  const trimmed = (value || '').trim();
                  if (!trimmed) {
                    return;
                  }

                  const duplicated = groups.some((group) => group.name === trimmed && group.id !== editingGroup?.id);
                  if (duplicated) {
                    throw new Error('分组名称已存在');
                  }
                },
              },
            ]}
          >
            <Input placeholder="例如：用户模块" maxLength={32} />
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
