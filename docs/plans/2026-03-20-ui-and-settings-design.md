# Ajax Interceptor Pro - 功能迭代需求文档

**版本**: 2.1.0  
**日期**: 2026-03-20  
**状态**: 已确认

---

## 一、功能概述

在 v2.0.0 基础上新增以下功能：
1. 设置功能 - 支持弹窗 / Chrome DevTools 嵌入两种模式切换
2. 规则拖拽排序 - 支持同分组内排序 + 跨分组移动
3. JSON 格式化显示 - 基本格式化 + 可折叠树形视图

---

## 二、UI 设计规范

### 2.1 配色方案（绿色系）

```css
:root {
  /* 主色 */
  --primary: #10b981;          /* Emerald 绿 */
  --primary-dark: #059669;    /* 深绿 */
  --primary-light: #d1fae5;   /* 浅绿背景 */
  --primary-hover: #047857;    /* 悬停 */
  
  /* 状态色 */
  --success: #34a853;
  --warning: #fbbc04;
  --error: #ef4444;
  --disabled: #9ca3af;
  
  /* 中性色 */
  --bg: #f9fafb;
  --bg2: #ffffff;
  --bg3: #f3f4f6;
  --border: #e5e7eb;
  --text: #1f2937;
  --text2: #6b7280;
  --text3: #9ca3af;
  
  /* 阴影 */
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.15);
}
```

### 2.2 圆润设计

```css
/* 按钮 */
.btn {
  border-radius: 20px;  /* 大圆角 */
  padding: 8px 20px;
}

/* 卡片 */
.rule-card {
  border-radius: 12px;
}

/* 输入框 */
.input, .select {
  border-radius: 10px;
}

/* 开关 */
.toggle-slider {
  border-radius: 20px;  /* 药丸形 */
}
```

### 2.3 布局调整

- 弹窗宽度: 800px → 850px
- 高度: 600px → 650px
- 侧边栏宽度: 200px → 220px

---

## 三、详细功能

### 3.1 设置功能

#### 3.1.1 设置面板入口
- 位置：头部右侧 ⚙️ 按钮
- 点击打开设置弹窗

#### 3.1.2 设置内容

```
┌─────────────────────────────────────────┐
│            ⚙️ 设置                      │
├─────────────────────────────────────────┤
│                                         │
│  启动模式                               │
│  ○ 弹窗模式                             │
│  ● 嵌入 DevTools 面板                   │
│                                         │
│  ─────────────────────────────────     │
│                                         │
│  外观                                   │
│  [✓] 显示命中计数                       │
│  [✓] 动画效果                           │
│                                         │
│  数据                                   │
│  [清除所有数据]  [导出配置]             │
│                                         │
│  关于                                   │
│  版本: 2.1.0                            │
│                                         │
└─────────────────────────────────────────┘
```

#### 3.1.3 模式切换逻辑

**弹窗模式**（默认）：
- 使用 `action.default_popup`

**嵌入模式**：
- 使用 `devtools_page` + `chrome.devtools.panels.create`
- 在 Chrome DevTools 底部创建面板

```json
{
  "devtools_page": "devtools.html",
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  }
}
```

---

### 3.2 规则拖拽功能

#### 3.2.1 拖拽触发
- 规则项左侧拖拽手柄图标
- 整个规则项可拖动

#### 3.2.2 拖拽效果

**同分组内排序：**
- 拖动规则上下移动
- 释放后自动调整顺序
- 保存新的 `order` 字段

**跨分组移动：**
- 拖动规则到左侧分组区域
- 目标分组高亮显示
- 释放后移动规则到目标分组

#### 3.2.3 视觉反馈

```
拖动中:
- 规则半透明 (opacity: 0.5)
- 原位置显示占位符
- 拖动预览阴影

放置目标:
- 有效区域显示绿色边框
- 目标分组高亮
```

#### 3.2.4 数据结构

```javascript
{
  "rules": [
    {
      "id": "uuid",
      "method": "GET",
      "urlPattern": "/api/*",
      "response": "{}",
      "enabled": true,
      "order": 0    // 新增：排序字段
    }
  ]
}
```

---

### 3.3 JSON 格式化显示

#### 3.3.1 基本格式化

- 自动缩进（2 空格）
- 语法高亮
- 行号显示

```
1| {
2|   "code": 0,
3|   "data": {
4|     "user": "张三"
5|   }
6| }
```

#### 3.3.2 语法高亮颜色

```css
.json-key { color: #059669; }    /* 键 - 绿色 */
.json-string { color: #0891b2; } /* 字符串 - 青色 */
.json-number { color: #dc2626; } /* 数字 - 红色 */
.json-boolean { color: #7c3aed; } /* 布尔 - 紫色 */
.json-null { color: #9ca3af; }    /* null - 灰色 */
.json-bracket { color: #6b7280; } /* 大括号 - 中灰 */
```

#### 3.3.3 可折叠树形视图

```
▼ data
  ▼ user
      "张三"
  ▼ roles
    ▼ 0
        "admin"
    ▼ 1
        "editor"
  "token": "xxx"
▶ meta
```

- 点击 ▶ 展开
- 点击 ▼ 折叠
- 层级缩进
- 支持全部展开/折叠

#### 3.3.4 交互

- 悬停行高亮
- 点击可复制值
- 双击编辑（可选）

---

## 四、技术实现

### 4.1 文件变更

| 文件 | 操作 |
|------|------|
| `manifest.json` | 新增 devtools_page |
| `devtools.html` | 新建 - DevTools 面板入口 |
| `devtools.js` | 新建 - DevTools 面板逻辑 |
| `popup/popup.js` | 拖拽逻辑 + JSON 编辑器 |
| `popup/popup.css` | 绿色主题 + 新样式 |
| `popup/popup.html` | 设置按钮 |
| `background/background.js` | 无变更 |

### 4.2 兼容性

- Chrome 120+
- Manifest V3

---

## 五、测试用例

### 5.1 设置功能
- [ ] 点击 ⚙️ 打开设置弹窗
- [ ] 切换到 DevTools 模式 → 刷新插件 → 打开 DevTools 可见面板
- [ ] 切换回弹窗模式 → 刷新 → 点击图标弹出面板

### 5.2 拖拽功能
- [ ] 拖动规则排序 → 顺序改变
- [ ] 拖动规则到其他分组 → 规则移动
- [ ] 拖动到无效区域 → 规则返回原位

### 5.3 JSON 显示
- [ ] 添加规则 → JSON 正确格式化显示
- [ ] 复杂 JSON → 树形可折叠
- [ ] 高亮颜色正确

---

## 六、待定事项

- [ ] 图标美化（后续迭代）
- [ ] 快捷键设置（后续迭代）

---

*文档版本: 1.0*  
*审批: 待用户确认*
