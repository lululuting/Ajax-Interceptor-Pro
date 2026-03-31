import React from 'react';
import { Modal, Form, Switch, Select, Button, Popconfirm, Divider } from 'antd';
import { ClearOutlined } from '@ant-design/icons';

export default function SettingsModal({ open, settings, groups, onClose, onSaveSettings, onSaveGroups, onSaveHitCounts }) {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      form.setFieldsValue({
        showHitCount: settings.showHitCount,
        enableAnimations: settings.enableAnimations,
        openMode: settings.openMode,
      });
    }
  }, [open, settings, form]);

  const handleSave = async () => {
    const values = form.getFieldsValue();
    await onSaveSettings({ ...settings, ...values });
    onClose();
  };

  const handleClearAll = async () => {
    const defaultGroup = [{ id: 'default', name: '未分组', enabled: true, order: 999, rules: [] }];
    await onSaveGroups(defaultGroup);
    await onSaveHitCounts({});
    onClose();
  };

  return (
    <Modal
      title="设置"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
      width={480}
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item label="显示命中次数" name="showHitCount" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="开启动画" name="enableAnimations" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="打开方式" name="openMode">
          <Select
            options={[
              { label: '弹窗模式', value: 'popup' },
              { label: 'DevTools 面板', value: 'devtools' },
            ]}
          />
        </Form.Item>
        <Divider />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>清除所有规则和数据</span>
          <Popconfirm
            title="清除所有数据"
            description="此操作将删除所有规则和命中记录，不可恢复。"
            onConfirm={handleClearAll}
            okText="清除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger size="small" icon={<ClearOutlined />}>清除所有数据</Button>
          </Popconfirm>
        </div>
      </Form>
    </Modal>
  );
}
