import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Switch, message } from 'antd';

const METHODS = ['*', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export default function RuleEditor({ open, rule, groupId, groups, resolvedTheme, onClose, onSave }) {
  const [form] = Form.useForm();
  const [jsonFullscreen, setJsonFullscreen] = useState(false);
  const editorContainerRef = useRef(null);
  const monacoRef = useRef(null);
  const layoutTimerRef = useRef(null);
  const resolvedThemeRef = useRef(resolvedTheme);
  const hydratedSessionKeyRef = useRef(null);

  resolvedThemeRef.current = resolvedTheme;

  useEffect(() => {
    if (!open) {
      hydratedSessionKeyRef.current = null;
      setJsonFullscreen(false);
      return;
    }

    // groups 热更新会换新的 rule 引用；同一条规则编辑中不能回灌，否则输入会被还原。
    const sessionKey = `${rule?.id || 'new'}|${groupId || 'default'}`;
    const shouldHydrate = hydratedSessionKeyRef.current !== sessionKey;
    if (!shouldHydrate) {
      return;
    }

    hydratedSessionKeyRef.current = sessionKey;
    form.setFieldsValue({
      name: rule?.name || '',
      urlPattern: rule?.urlPattern || '',
      method: rule?.method || 'GET',
      status: rule?.status || 200,
      enabled: rule?.enabled !== false,
      targetGroupId: groupId || 'default',
    });

    if (!editorContainerRef.current) {
      return;
    }

    if (!monacoRef.current && window.MonacoEditor) {
      monacoRef.current = new window.MonacoEditor(editorContainerRef.current, {
        value: '',
        language: 'json',
        theme: resolvedThemeRef.current,
      });
    }

    if (layoutTimerRef.current) {
      window.clearTimeout(layoutTimerRef.current);
    }

    const responseValue = rule?.response || '';
    layoutTimerRef.current = window.setTimeout(() => {
      if (!monacoRef.current) {
        return;
      }
      monacoRef.current.setValue(responseValue, true);
      monacoRef.current.layout();
      monacoRef.current.focus();
    }, 80);

    return () => {
      if (layoutTimerRef.current) {
        window.clearTimeout(layoutTimerRef.current);
        layoutTimerRef.current = null;
      }
    };
  }, [form, groupId, open, rule]);

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }

    monacoRef.current.setTheme?.(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (!monacoRef.current) {
      return;
    }

    const layoutEditor = () => {
      monacoRef.current?.layout();
    };

    const timer = window.setTimeout(layoutEditor, 50);
    const timer2 = window.setTimeout(() => {
      layoutEditor();
      monacoRef.current?.focus();
    }, 200);

    window.addEventListener('resize', layoutEditor);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
      window.removeEventListener('resize', layoutEditor);
    };
  }, [jsonFullscreen]);

  useEffect(() => {
    if (!jsonFullscreen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setJsonFullscreen(false);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [jsonFullscreen]);

  useEffect(() => () => {
    if (layoutTimerRef.current) {
      window.clearTimeout(layoutTimerRef.current);
    }
    if (monacoRef.current) {
      monacoRef.current.dispose();
      monacoRef.current = null;
    }
  }, []);

  const handleFormatJson = async () => {
    if (!monacoRef.current) {
      return;
    }

    const ok = await monacoRef.current.format();
    if (!ok) {
      message.error('JSON 格式无效，无法格式化');
    }
  };

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

  const handleClose = () => {
    setJsonFullscreen(false);
    onClose();
  };

  const jsonLabel = (
    <div className="rule-editor-json-label">
      <span>返回数据 (JSON)</span>
      <div className="rule-editor-monaco-actions">
        <Button
          type="default"
          size="small"
          className="rule-editor-monaco-btn"
          onClick={handleFormatJson}
        >
          格式化
        </Button>
        <Button
          type="default"
          size="small"
          className="rule-editor-monaco-btn"
          onClick={() => setJsonFullscreen((current) => !current)}
        >
          {jsonFullscreen ? '退出全屏' : '全屏'}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      onOk={handleSave}
      title={rule ? '编辑规则' : '添加规则'}
      width={jsonFullscreen ? '100%' : 620}
      maskClosable={!jsonFullscreen}
      okText="保存"
      cancelText="取消"
      centered={!jsonFullscreen}
      forceRender
      wrapClassName={`rule-editor-modal-wrap${jsonFullscreen ? ' is-json-fullscreen' : ''}`}
      className="rule-editor-modal"
      style={jsonFullscreen ? {
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        top: 0,
        margin: 0,
        paddingBottom: 0,
      } : undefined}
      styles={jsonFullscreen ? {
        wrapper: { overflow: 'hidden' },
        container: {
          height: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          padding: 0,
        },
        body: {
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '12px 12px 0',
        },
        footer: {
          marginTop: 0,
          flexShrink: 0,
        },
      } : undefined}
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
          <Form.Item label={jsonLabel} className="rule-editor-json-item">
            <div className="rule-editor-monaco-wrap">
              <div className="monaco-editor-container rule-editor-monaco" ref={editorContainerRef} />
            </div>
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
            <Form.Item
              label="是否启用"
              name="enabled"
              valuePropName="checked"
              className="rule-enable-wrap"
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
          </div>
        </Form>
      </div>
    </Modal>
  );
}
