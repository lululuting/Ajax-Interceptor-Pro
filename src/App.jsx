import React, { useState, useCallback } from 'react';
import { ConfigProvider, Switch, Button, Tooltip, theme } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import Sidebar from './components/Sidebar';
import RuleList from './components/RuleList';
import SettingsModal from './components/SettingsModal';
import { useStorage } from './hooks/useStorage';
import './app.css';

export default function App({ mode }) {
  const storage = useStorage();
  const [currentGroupId, setCurrentGroupId] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (storage.loading) return null;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#10b981',
          borderRadius: 8,
          fontSizeBase: 13,
        },
      }}
    >
      <div className="app" style={{ width: mode === 'devtools' ? '100vw' : 850, height: mode === 'devtools' ? '100vh' : 650 }}>
        <header className="app-header">
          <div className="header-title">
            <svg className="header-logo" viewBox="0 0 24 24"><path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3z" /></svg>
            <span>Ajax Interceptor Pro</span>
          </div>
          <div className="header-actions">
            <Tooltip title={storage.globalEnabled ? '拦截已开启' : '拦截已关闭'}>
              <Switch
                checked={storage.globalEnabled}
                onChange={storage.saveGlobalEnabled}
                size="small"
                style={{ marginRight: 8 }}
              />
            </Tooltip>
            <Tooltip title="设置">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setSettingsOpen(true)}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          </div>
        </header>
        <div className="app-body">
          <Sidebar
            groups={storage.groups}
            currentGroupId={currentGroupId}
            onSelect={setCurrentGroupId}
            onSaveGroups={storage.saveGroups}
          />
          <RuleList
            groups={storage.groups}
            currentGroupId={currentGroupId}
            hitCounts={storage.hitCounts}
            settings={storage.settings}
            onSaveGroups={storage.saveGroups}
            onSaveHitCounts={storage.saveHitCounts}
          />
        </div>
      </div>
      <SettingsModal
        open={settingsOpen}
        settings={storage.settings}
        groups={storage.groups}
        onClose={() => setSettingsOpen(false)}
        onSaveSettings={storage.saveSettings}
        onSaveGroups={storage.saveGroups}
        onSaveHitCounts={storage.saveHitCounts}
      />
    </ConfigProvider>
  );
}
