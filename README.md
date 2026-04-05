# Ajax Interceptor Pro

基于 [Ajax Interceptor](https://github.com/YGYOOO/ajax-interceptor) 演进而来的 Chrome 接口拦截插件。

它保留了接口拦截这个核心能力，同时把规则管理、导入导出、命中统计和界面交互补得更完整，更适合日常前端开发、联调和调试使用。

这个项目也是一次 AI 协作开发的实践。现在仓库里看到的界面和大部分功能，都是在不断对话、生成、调整和打磨中逐步完成的。

## 特性

- 支持拦截 `XMLHttpRequest` 和 `fetch`
- 支持规则分组管理
- 支持规则拖拽排序和跨组移动
- 支持命中计数与状态查看
- 支持配置导入导出
- 支持弹窗模式与 DevTools 模式

## 技术栈

- React
- Ant Design
- Vite
- Chrome Extension Manifest V3

## 本地开发

```bash
npm install
npm run build
```

如果你希望边改边构建，可以使用：

```bash
npm run dev
```

构建完成后，产物会输出到 `dist/`，在 Chrome 扩展管理页加载这个目录即可。

## 项目结构

```text
background/   后台 Service Worker
content/      页面注入与请求拦截逻辑
icons/        插件图标资源
libs/         Monaco 与共享前端脚本
popup/        弹窗静态资源
src/          React 源码
tests/        Node 测试
```

## 使用说明

详细使用方式见 [USAGE.md](./USAGE.md)。

## 适合的场景

- 本地没有后端时先模拟接口
- 联调前先用固定响应自测页面
- 复现异常状态或特殊返回结构
- 临时接管某些请求，快速验证前端逻辑
