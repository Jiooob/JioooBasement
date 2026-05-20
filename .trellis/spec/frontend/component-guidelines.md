# Component Guidelines

> 本仓库的“组件”是 HTML partial、内容 block 和 CSS/JS 约定组合，不是框架组件。

---

## Overview

页面结构主要由模板 partial 组成。构建器在 `assemble_index_template()` 中把 partial 注入 `index.template`，再把 JSON 和文章卡片注入 partial 中的 placeholder。

不要引入 React/Vue/Svelte 来实现普通页面调整，除非用户明确要求重建技术栈。

---

## Component Structure

一个可维护的页面部件应包含：

- HTML partial 或 `section.html` 中的结构。
- 清晰且可搜索的 class/id。
- 必要时在 `homepage.js` 中有单一职责的行为函数。
- 数据来自 JSON 或构建器注入，而不是散落硬编码。

示例：

- 扇区导航卡片由 `data/homepage.json` 的 `sector_navigation` 驱动，Python 的 `render_sector_navigation()` 渲染为 `.page-card`。
- 公告由 `announcements` 驱动，Python 的 `render_announcements()` 渲染为 `.announcement-item`。
- 右侧大字标签由 `right_panel.display_text` 驱动，JS 的 `updateSectorSideLabels()` 根据 sector line 位置排版。

---

## Props Conventions

没有 props。跨 HTML / JS 的数据通过以下方式传递：

- JSON 配置字段。
- HTML `data-*` attribute。
- DOM id/class。
- CSS custom properties，例如 `--indicator-accent-rgb`。

新增跨层字段时，必须同步记录字段含义，避免 JSON、Python、HTML、JS 各自解释。

---

## Styling Patterns

- 优先复用 `:root` 中的 CSS 变量。
- 保持 `main.css` 作为共享视觉/布局基础，页面特定补充放入对应 CSS 文件。
- 文章排版修改优先放入 `article.css`。
- 首页特定组件和覆盖规则放入 `homepage.css` 或 `main.css` 中已有相关区域，避免无序追加。

页面调整按用户当次意图决定幅度。小改时不要顺手重做整体视觉；大改时也要主动清理不再适用的 CSS/JS 耦合。

---

## Accessibility

当前项目没有完整 a11y 体系，但新增可交互元素应至少做到：

- 使用语义 HTML 元素，例如 button 用 `<button>`。
- 外链使用 `target="_blank"` 时加 `rel="noopener noreferrer"`。
- 图片保留有意义的 `alt`。
- 不让 fixed UI 覆盖正文阅读或移动端主要内容。

---

## Common Mistakes

- 改了 class/id 但没有同步 `homepage.js` 查询选择器。
- 改了扇区数量但没有同步 lines、anchors、homepage JSON。
- 把一次页面小调扩展成未请求的大范围 redesign。
- 新增卡片时只写 HTML，不考虑移动端宽度和文本溢出。
