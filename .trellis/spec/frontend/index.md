# Frontend Development Guidelines

> 本仓库 frontend 指模板、HTML 内容、CSS 和原生 JavaScript，不是 React/TypeScript 应用。

---

## Overview

`JioooBasement` 的前端由以下部分组成：

- `templates/index.template` 和 `templates/partials/*`：首页结构。
- `templates/article.template`：文章页结构。
- `content/sector-*/*.html`：直接编写的文章内容。
- `content/sector-*/section.html`：扇区级自定义内容。
- `static/css/main.css`、`homepage.css`、`article.css`、`page.css`：视觉和布局。
- `static/js/homepage.js`：首页交互、深度指示器、滚动定位、雪花 canvas、拖动滚动。

页面设计改动不预设为“保护现有设计”或“大胆重构”。每次任务必须按用户当次意图决定改动幅度。

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | 模板、内容、CSS、JS、静态资源组织 | Filled |
| [Component Guidelines](./component-guidelines.md) | HTML partial、内容 block、CSS class 的组件化约定 | Filled |
| [Hook Guidelines](./hook-guidelines.md) | 明确本仓库没有 React hooks；记录原生 JS stateful logic 约定 | Filled |
| [State Management](./state-management.md) | DOM、scroll、localStorage/sessionStorage 状态约定 | Filled |
| [Quality Guidelines](./quality-guidelines.md) | 页面修改、浏览器检查、响应式和交互质量要求 | Filled |
| [Type Safety](./type-safety.md) | 无 TypeScript；JSON/DOM/data attribute 契约约定 | Filled |

---

## Pre-Development Checklist

改页面、模板、CSS 或 JS 前：

- 明确用户当次意图：小调整、局部 redesign、还是大范围重构。
- 搜索相关 class、id、data attribute、placeholder 和 JSON 字段引用。
- 运行 `./venv/bin/python run_build.py`。
- 页面调整或构建相关改动后，必须浏览器检查生成页面。
- 检查 desktop 和 mobile 的布局风险，尤其是深度线、右侧栏、文章卡片、固定指示器和文本溢出。
