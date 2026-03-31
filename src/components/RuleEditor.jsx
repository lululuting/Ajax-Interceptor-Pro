import React, { useEffect, useRef, useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button } from 'antd';

const METHODS = ['*', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function RuleEditor({ open, rule, groupId, groups, onClose, onSave }) {
  const [form] = Form.useForm();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [targetGroupId, setTargetGroupId] = useState(groupId);

  useEffect(() => {
    if (open) {
      setTargetGroupId(groupId);
      form.setFieldsValue({
        name: rule?.name || '',
        urlPattern: rule?.urlPattern || '',
        method: rule?.method || '*',
        status: rule?.status || 200,
        enabled: rule?.enabled !== false,
      });
      // Set monaco value after mount
      setTimeout(() => {
        if (monacoRef.current) {
          monacoRef.current.setValue(rule?.response || '');
        }
      }, 100);
    }
  }, [open, rule, groupId, form]);

  useEffect(() => {
    if (!open || !editorRef.current) return;
    if (monacoRef.current) return;

    // Initialize Monaco Editor
    if (window.MonacoEditor) {
      monacoRef.current = new window.MonacoEditor(editorRef.current, {
        value: rule?.response || '',
        language: 'json',
      });
    }
    return () => {
      // Keep editor alive for reuse
    };
  }, [open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    const responseValue = monacoRef.current ? monacoRef.current.getValue() : '';
    const saved = {
      ...rule,
      name: values.name,
      urlPattern: values.urlPattern,
      method: values.method,
      status: values.status,
      enabled: rule?.enabled !== false,
      response: responseValue,
    };
    await onSave(saved, targetGroupId);
  };

  return (
    <Modal
      title={rule ? '编辑规则' : '新建规则'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      width={680}
      okButtonProps={{ style: { background: '#10b981', borderColor: '#10b981' } }}
      destroyOnClose={false}
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item label="规则名称" name="name">
          <Input placeholder="可选，用于标识此规则" />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item label="URL 匹配" name="urlPattern" rules={[{ required: true, message: '请输入 URL 匹配规则' }]} style={{ flex: 1 }}>
            <Input placeholder="支持 * 通配符，如 https://api.example.com/*" />
          </Form.Item>
          <Form.Item label="请求方法" name="method" style={{ width: 120 }}>
            <Select options={METHODS.map(m => ({ label: m, value: m }))} />
          </Form.Item>
          <Form.Item label="状态码" name="status" style={{ width: 100 }}>
            <InputNumber min={100} max={599} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        {groups.length > 1 && (
          <Form.Item label="所属分组">
            <Select
              value={targetGroupId}
              onChange={setTargetGroupId}
              options={groups.map(g => ({ label: g.name, value: g.id }))}
            />
          </Form.Item>
        )}
        <Form.Item label="返回内容（JSON）">
          <div
            ref={editorRef}
            style={{ height: 260, border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
