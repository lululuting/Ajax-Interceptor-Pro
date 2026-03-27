# Shared UI & Mode Exclusivity Design

**Date:** 2026-03-27  
**Status:** Approved by user

---

## Goal

让 `popup` 与 `devtools` 的完整管理界面保持**同一套展示结果**，并让“弹窗模式 / DevTools 模式”成为**真正互斥**的单选模式。

---

## Confirmed Product Decisions

### 1. Shared full UI
- `popup` 展示什么，`devtools` 就展示什么。
- 两边都使用同一套规则列表渲染结构。
- 仅允许页面容器差异（popup 尺寸 / devtools 全高），不允许规则项信息结构差异。

### 2. Rule card layout
统一规则项布局如下：

```text
[拖拽]
[ METHOD ][ 规则路由......................... ]   [规则名称]
                                                [命中图标/计数] [开关]
```

#### Required details
- 规则名称：
  - 放在右侧控制区上方
  - 黑色字体
  - 无背景色
- 规则路由：必须展示
- 命中图标/计数：放在规则名称下方
- 开关：放在命中图标/计数旁边
- 编辑 / 删除：hover 才显示
- “全部规则”视图中保留分组归属提示，避免无法识别规则来自哪个分组

### 3. Mode exclusivity
#### popup mode
- 点击扩展图标：打开完整管理界面
- DevTools `Ajax拦截` 面板：不显示管理界面，只显示提示文案
- 提示文案：`当前为弹窗模式，请点击扩展图标使用`

#### devtools mode
- 点击扩展图标：不打开完整管理界面，只显示极简提示页
- 提示文案：`当前为 DevTools 模式，请按 F12 → Ajax拦截 使用`
- DevTools `Ajax拦截` 面板：显示完整管理界面

---

## Technical Design

### A. Shared rendering layer
新增一个共享渲染脚本，负责以下纯展示逻辑：
- 规则项 HTML 结构
- 规则项 class / 状态标记
- 模式提示页 / 提示块 HTML
- 规则预览文本裁剪与展示文案

这样 `popup` 和 `devtools` 不再各自维护两套规则项模板，后续 UI 调整改一处即可。

### B. Page controllers remain separate
保留两个页面控制器：
- `popup/popup.js`
- `devtools-panel.js`

它们继续负责：
- 读取 storage
- 绑定事件
- 保存设置 / 规则 / 分组
- 初始化编辑器

但两边都调用同一套共享渲染方法输出列表与提示内容。

### C. Runtime mode application
在后台增加 mode applicator：
- 根据 `settings.openMode` 动态调用 `chrome.action.setPopup`
- `popup` 模式：toolbar popup 指向 `popup/popup.html`
- `devtools` 模式：toolbar popup 指向 `popup/mode-hint.html`

同时：
- DevTools 页面无法动态卸载，因此在 `popup` 模式下由 `devtools-panel.js` 仅渲染单行提示
- 在 `devtools` 模式下渲染完整管理器

---

## Proposed File Changes

### New files
- `libs/shared-ui.js`
- `libs/mode-config.js`
- `popup/mode-hint.html`
- `popup/mode-hint.css`（可选，若直接复用 popup.css 则可不建）
- `tests/mode-config.test.js`
- `tests/shared-ui.test.js`

### Modified files
- `background/background.js`
- `popup/popup.js`
- `devtools-panel.js`
- `popup/popup.css`
- `popup/popup.html`
- `devtools-panel.html`
- `package.json`

---

## UI Acceptance Criteria

### Shared list consistency
- 同一份 storage 数据下，popup 与 devtools 渲染出的规则项结构一致
- 规则名称、规则路由、METHOD、命中、开关、hover 操作区域位置一致

### Rule information
- 每条规则都能直接看到：
  - method
  - route / urlPattern
  - rule name（若为空则不占位）
- 规则名称没有彩色 badge 背景

### Mode exclusivity
- `openMode = popup` 时：
  - toolbar 打开完整 popup
  - DevTools 面板只显示提示
- `openMode = devtools` 时：
  - toolbar 打开极简提示页
  - DevTools 面板打开完整管理界面

### No regression
- 编辑、删除、启用/停用、分组切换、命中计数、JSON 编辑器仍可正常使用

---

## Risks & Mitigations

### Risk 1: popup / devtools still drift later
**Mitigation:** 共享规则项模板，不允许再复制两套字符串模板。

### Risk 2: mode toggle saves but UI does not switch immediately
**Mitigation:** 在 background 中监听 `settings` 变化并立即执行 `chrome.action.setPopup`。

### Risk 3: devtools cannot truly disappear
**Mitigation:** 用显式提示页代替“空白页”，满足用户感知上的“没有 dev 管理界面”。

---

## Recommendation

按本设计进入实现：
1. 先抽共享渲染 + mode helper
2. 再接 popup / devtools
3. 最后补后台互斥模式切换与提示页
