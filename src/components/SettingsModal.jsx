import React, { useEffect, useState } from "react";
import { Button, Modal, Radio, Switch, message } from "antd";
import { DeleteIcon, ExportIcon, InfoIcon } from "./LegacyIcons";
import { createDefaultGroup } from "../utils/data";
import { normalizeThemeMode } from "../utils/theme";

export default function SettingsModal({
  open,
  settings,
  resolvedTheme,
  groups,
  onClose,
  onSaveSettings,
  onSaveGroups,
  onSaveHitCounts,
}) {
  const [showHitCount, setShowHitCount] = useState(true);
  const [openMode, setOpenMode] = useState("popup");
  const [themeMode, setThemeMode] = useState("auto");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setShowHitCount(settings.showHitCount !== false);
      setOpenMode(settings.openMode || "popup");
      setThemeMode(normalizeThemeMode(settings.themeMode));
    }
  }, [open, settings]);

  const handleSave = async () => {
    const changedMode = openMode !== (settings.openMode || "popup");
    await onSaveSettings({
      ...settings,
      showHitCount,
      openMode,
      themeMode,
    });
    if (changedMode) {
      message.success(
        openMode === "devtools"
          ? "已切换到 DevTools 模式，请按 F12 → Ajax拦截 查看"
          : "已切换到弹窗模式，请点击扩展图标查看",
      );
    }
    onClose();
  };

  const handleClearAll = async () => {
    await onSaveGroups([createDefaultGroup()]);
    await onSaveHitCounts({});
    onClose();
    setShowConfirm(false);
    message.success("数据已清除");
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        title="设置"
        wrapClassName="settings-modal-wrap"
        styles={{ body: { paddingTop: 20 } }}
        footer={[
          <Button type="primary" key="close" onClick={handleSave}>
            完成
          </Button>,
        ]}
        maskClosable
        centered
      >
        <div className="settings-section">
          <div className="settings-section-title">启动模式</div>
          <div className="settings-item settings-item-stack">
            <Radio.Group
              value={openMode}
              onChange={(e) => setOpenMode(e.target.value)}
              className="settings-choice-group"
            >
              <Radio value="popup">弹窗模式</Radio>
              <Radio value="devtools">DevTools 面板</Radio>
            </Radio.Group>
            <p className="settings-note">
              <InfoIcon />
              <span>DevTools 模式：按 F12 打开开发者工具，在「Ajax拦截」标签页使用</span>
            </p>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">外观</div>
          <div className="settings-item settings-item-stack">
            <div>
              <div className="settings-item-label">主题模式</div>
              <div className="settings-item-desc">
                默认自动跟随系统，当前生效为{resolvedTheme === "dark" ? "暗色" : "亮色"}
              </div>
            </div>
            <Radio.Group
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value)}
              className="settings-choice-group"
            >
              <Radio value="auto">自动</Radio>
              <Radio value="light">浅色</Radio>
              <Radio value="dark">暗色</Radio>
            </Radio.Group>
          </div>
          <div className="settings-item">
            <div>
              <div className="settings-item-label">显示命中计数</div>
            </div>
            <Switch
              checked={showHitCount}
              onChange={(checked) => setShowHitCount(checked)}
            />
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">数据</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              icon={<ExportIcon />}
              onClick={() => {
                const data = { groups, settings };
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "ajax-interceptor-config.json";
                a.click();
                URL.revokeObjectURL(url);
                message.success("配置已导出");
              }}
            >
              导出配置
            </Button>
            <Button
              danger
              icon={<DeleteIcon />}
              onClick={() => setShowConfirm(true)}
            >
              清除数据
            </Button>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-section-title">关于</div>
          <div className="settings-about">
            <div className="settings-item settings-info-block">
              版本：{__APP_VERSION__}
              <br />
              项目地址：
              <a
                href="https://github.com/lululuting/Ajax-Interceptor-Pro"
                target="_blank"
                rel="noreferrer"
                className="settings-link"
              >
                Ajax Interceptor Pro
              </a>
              <br />
              基于
              <a
                href="https://github.com/YGYOOO/ajax-interceptor"
                target="_blank"
                rel="noreferrer"
                className="settings-link"
              >
                Ajax Interceptor
              </a>
              扩展，全程 AI 生成。
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        title="清除数据"
        styles={{ body: { paddingTop: 20 } }}
        footer={[
          <Button key="cancel" onClick={() => setShowConfirm(false)}>
            取消
          </Button>,
          <Button key="confirm" type="primary" danger onClick={handleClearAll}>
            确定
          </Button>,
        ]}
        centered
        maskClosable
      >
        <p>此操作将删除所有规则和命中记录，不可恢复。</p>
      </Modal>
    </>
  );
}
