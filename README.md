# Ajax Interceptor Pro

基于 [ajax-interceptor](https://github.com/YGYOOO/ajax-interceptor) 增强的 Chrome 插件，新增**接口分组管理**和**导入导出**功能。

## ✨ 新增功能

### 1. 接口分组管理
- 📁 **创建/编辑/删除分组** - 右键分组或点击「新建分组」
- ⚡ **分组总开关** - 一键启用/禁用组内所有规则
- 🔄 **拖拽排序** - 分组和规则都支持拖拽调整顺序
- 📂 **规则归属** - 新建规则时可选择分组

### 2. 导入导出
- 📤 **导出** - 支持导出全部/选中分组/单条规则
- 📥 **导入** - 支持合并/覆盖/仅新增三种策略
- 💾 **JSON 格式** - 便于备份和分享

## 📁 文件结构

```
ajax-interceptor-pro/
├── manifest.json          # 插件配置
├── background/
│   └── background.js      # Service Worker
├── content/
│   ├── content.js         # 内容脚本
│   └── inject.js          # 注入脚本（拦截 AJAX）
├── popup/
│   ├── popup.html         # 弹窗界面
│   ├── popup.css          # 样式
│   └── popup.js           # 弹窗逻辑
└── icons/
    ├── icon16.svg         # 图标
    ├── icon48.svg
    └── icon128.svg
```

## 🚀 安装方法

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `ajax-interceptor-pro` 文件夹

## 📝 使用说明

### 创建分组
- 点击左侧「➕ 新建分组」按钮
- 或右键现有分组选择「重命名/删除」

### 添加规则
- 点击「➕ 添加规则」按钮
- 填写 URL 匹配模式、返回数据等信息
- 选择所属分组

### 导入导出
- 点击「📤 导出」选择导出范围
- 点击「📥 导入」选择 JSON 文件

### 快捷键
- `Ctrl/Cmd + N` - 新建规则
- `Ctrl/Cmd + Shift + N` - 新建分组
- `Ctrl/Cmd + E` - 导出
- `Ctrl/Cmd + I` - 导入

## 🔧 技术说明

- **Manifest V3** - 使用最新的 Chrome 扩展规范
- **分组开关逻辑** - 分组关闭时组内规则全部失效，但保留各自开关状态
- **数据存储** - 使用 `chrome.storage.local` 持久化
- **拦截原理** - 注入脚本覆盖 XMLHttpRequest 和 fetch API

## 📄 数据格式

导出/导入的 JSON 格式：

```json
{
  "version": "2.0.0",
  "exportTime": "2024-01-15T10:30:00Z",
  "groups": [
    {
      "id": "uuid",
      "name": "用户模块",
      "enabled": true,
      "order": 0,
      "rules": [
        {
          "id": "uuid",
          "method": "GET",
          "urlPattern": "/api/user/*",
          "response": "{...}",
          "status": 200,
          "enabled": true,
          "order": 0
        }
      ]
    }
  ]
}
```

## ⚠️ 注意事项

1. 使用插件时建议关闭浏览器缓存（DevTools → Network → Disable cache）
2. 不需要使用时建议关闭全局开关，避免影响正常开发
3. 导入时会自动处理版本兼容

---

**版本**: 2.0.0  
**基于**: ajax-interceptor by YGYOOO
