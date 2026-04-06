import React, { useEffect, useRef } from 'react';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';

const METHODS = ['*', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function RuleEditor({ open, rule, groupId, groups, resolvedTheme, onClose, onSave }) {
  const [form] = Form.useForm();
  const editorContainerRef = useRef(null);
  const monacoRef = useRef(null);
  const layoutTimerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    form.setFieldsValue({
      name: rule?.name || '',
      urlPattern: rule?.urlPattern || '',
      method: rule?.method || 'GET',
      status: rule?.status || 200,
      enabled: rule?.enabled !== false,
      targetGroupId: groupId || 'default',
    });
  }, [form, groupId, open, rule]);

  useEffect(() => {
    if (!open || !editorContainerRef.current) {
      return;
    }

    if (!monacoRef.current && window.MonacoEditor) {
      monacoRef.current = new window.MonacoEditor(editorContainerRef.current, {
        value: '',
        language: 'json',
        theme: resolvedTheme,
      });
    }

    if (layoutTimerRef.current) {
      window.clearTimeout(layoutTimerRef.current);
    }

    layoutTimerRef.current = window.setTimeout(() => {
      if (!monacoRef.current) {
        return;
      }
      monacoRef.current.setValue(rule?.response || '', true);
      monacoRef.current.layout();
      monacoRef.current.focus();
    }, 80);

    return () => {
      if (layoutTimerRef.current) {
        window.clearTimeout(layoutTimerRef.current);
        layoutTimerRef.current = null;
      }
    };
  }, [open, resolvedTheme, rule]);

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }

    monacoRef.current.setTheme?.(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => () => {
    if (layoutTimerRef.current) {
      window.clearTimeout(layoutTimerRef.current);
    }
    if (monacoRef.current) {
      monacoRef.current.dispose();
      monacoRef.current = null;
    }
  }, []);

  const handleSave = async () => {
    const values = await form.validateFields();
    const response = monacoRef.current ? monacoRef.current.getValue() : '';
    await onSave(
      {
        ...rule,
        name: values.name?.trim() || '',
        urlPattern: values.urlPattern.trim(),
        method: values.method,
        status: values.status,
        enabled: values.enabled,
        response,
      },
      values.targetGroupId,
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      title={rule ? '编辑规则' : '添加规则'}
      width={620}
      maskClosable={true}
      okText="保存"
      cancelText="取消"
      centered
      forceRender
      wrapClassName="rule-editor-modal-wrap"
      className="rule-editor-modal"
    >
      <div className="rule-editor-scroll">
        <Form form={form} layout="vertical" className="rule-editor-form">
          <div className="rule-editor-grid">
            <Form.Item label="规则名称" name="name" className="rule-editor-name">
              <Input placeholder="给规则起个名字（可选）" maxLength={60} />
            </Form.Item>
            <Form.Item
              label="请求方法"
              name="method"
              className="rule-editor-method"
              rules={[{ required: true, message: '请选择请求方法' }]}
            >
              <Select
                popupMatchSelectWidth
                style={{ width: '100%' }}
                options={METHODS.map((method) => ({ label: method, value: method }))}
              />
            </Form.Item>
          </div>
          <Form.Item
            label="URL 匹配模式"
            name="urlPattern"
            rules={[
              { required: true, whitespace: true, message: '请输入 URL 匹配规则' },
              { max: 300, message: 'URL 匹配规则过长' },
            ]}
          >
            <Input placeholder="/api/user/*" />
          </Form.Item>
          <Form.Item
            label="所属分组"
            name="targetGroupId"
            rules={[{ required: true, message: '请选择所属分组' }]}
          >
            <Select
              popupMatchSelectWidth
              style={{ width: '100%' }}
              options={groups.map((group) => ({
                label: group.name,
                value: group.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="返回数据 (JSON)">
            <div className="monaco-editor-container rule-editor-monaco" ref={editorContainerRef} />
          </Form.Item>
          <div className="rule-options-row">
            <Form.Item
              label="状态码"
              name="status"
              className="rule-status-wrap"
              rules={[{ required: true, message: '请输入状态码' }]}
            >
              <InputNumber min={100} max={599} controls={false} />
            </Form.Item>
            <Form.Item name="enabled" valuePropName="checked" className="rule-enable-wrap">
              <div className="rule-enable-inline">
                <span className="rule-enable-label">是否启用</span>
                <Switch checkedChildren="启用" unCheckedChildren="禁用" />
              </div>
            </Form.Item>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
