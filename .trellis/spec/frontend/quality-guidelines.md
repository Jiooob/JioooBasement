# Quality Guidelines

> 页面、样式和原生 JavaScript 的质量标准。

---

## Overview

前端质量重点是：按用户当次意图调整页面，保持构建输出可用，避免 CSS/JS/模板/配置脱节，并通过浏览器检查实际效果。

---

## Forbidden Patterns

- 不在未确认意图时擅自把小调整扩大成整体 redesign。
- 不在大改后保留明显失效的旧 CSS/JS 逻辑。
- 不添加依赖 npm/bundler 的前端代码，除非用户明确同意技术栈变化。
- 不只检查源码不检查构建后的 `output/` 页面。
- 不把页面配置硬编码到多个层里。

---

## Required Patterns

- 页面或构建部分改动后必须浏览器检查。
- CSS/JS 改动要搜索相关 class/id/data attribute。
- 修改 sector 结构时同步检查 `homepage_sector_lines.partial.html`、`homepage_sector_anchors.partial.html`、`data/homepage.json` 和 `homepage.js`。
- 修改文章模板后检查至少一个生成的文章页。
- 修改首页模板或 JS 后检查 `output/index.html`。

---

## Testing Requirements

最低命令：

```bash
./venv/bin/python run_build.py
```

浏览器检查建议：

- 首页首屏。
- 滚动到多个 sector。
- 移动端或窄屏布局。
- 深度指示器位置。
- 文章页返回链接和正文排版。

---

## Code Review Checklist

- 用户本次页面意图是否被明确遵守。
- 构建是否通过。
- 浏览器检查是否完成。
- 是否有文本溢出、遮挡、错位、不可点击区域。
- 是否保持直接 HTML 文章工作流。
- 是否误改 generated `output/`。
- 是否给未来总控配置留下清晰边界，而不是继续扩散硬编码。
