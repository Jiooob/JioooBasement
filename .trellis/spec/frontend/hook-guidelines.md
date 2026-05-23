# Hook Guidelines

> 本仓库没有 React hooks。本文件记录原生 JavaScript stateful logic 的约定。

---

## Overview

所有首页交互当前集中在 `static/js/homepage.js`。它在 `DOMContentLoaded` 后读取 DOM 元素，计算布局，并注册 scroll、resize、pointer、mousemove 等事件。

---

## Custom Hook Patterns

不适用。不要创建 `use*` hook 或引入 React。

对于原生 JS 行为，按职责拆函数：

- 纯计算函数，例如 `clamp()`、`mixChannel()`。
- DOM 更新函数，例如 `updateDepthIndicator()`、`updateSectorSideLabels()`。
- 事件处理函数，例如 `startDepthIndicatorDragScroll()`、`handleDepthIndicatorPointerRelease()`。
- 调度函数，例如 `scheduleLayout()`，避免 resize/scroll 时重复重排。

---

## Data Fetching

不适用。当前页面没有 client-side API fetching。页面数据由构建期注入 HTML。

如果未来要添加前端读取配置或远程数据，需要先明确是否仍然保持静态站点部署模型。

---

## Naming Conventions

- 布局刷新函数使用 `update*` / `layout*` / `align*`。
- 事件处理函数使用 `handle*` 或描述动作的动词。
- 状态对象使用明确后缀，如 `layoutState`、`dragScrollState`。
- 常量使用大写 snake case，例如 `DRAG_SCROLL_CONFIG`。

---

## Common Mistakes

- 在 scroll/resize 事件中直接做大量 DOM 读写而不使用 `requestAnimationFrame` 调度。
- 忘记在移动端禁用或调整 desktop-only 交互。
- 多个函数分别维护同一布局状态，导致滚动后位置不一致。
