# Directory Structure

> 前端源文件的组织方式。

---

## Overview

本仓库没有 `src/`、React components、bundler 或 npm package。浏览器直接加载构建后复制到 `output/` 的 CSS、JS、图片和 HTML。

---

## Directory Layout

```text
templates/
├── index.template
├── article.template
└── partials/
    ├── homepage_head.partial.html
    ├── homepage_hero.partial.html
    ├── homepage_sector_lines.partial.html
    ├── homepage_main_grid.partial.html
    ├── homepage_footer.partial.html
    └── homepage_sector_anchors.partial.html

content/
└── sector-*/
    ├── *.html
    └── section.html

static/
├── css/
│   ├── main.css
│   ├── homepage.css
│   ├── article.css
│   └── page.css
├── js/
│   └── homepage.js
├── icons/
└── images/
```

---

## Module Organization

- 首页 skeleton 放在 `templates/index.template`。
- 首页可复用结构放在 `templates/partials/`。
- 文章页公共框架放在 `templates/article.template`。
- 文章正文直接写完整 HTML 文件，构建器只提取 `<body>` 子节点。
- 首页交互集中在 `static/js/homepage.js`，目前不拆前端模块、不引入 bundler。
- CSS 变量和主要布局在 `main.css`；首页补充规则在 `homepage.css`；文章阅读体验在 `article.css`。

未来如果做模块化整理，优先让模板 partial、配置数据、构建器渲染职责对齐，不要只移动文件名。

---

## Naming Conventions

- 首页扇区线 id：`sector-1-line`、`sector-2-line`。
- 扇区内容锚点 id：`sector-1-content-anchor`。
- 导航卡片通过 `data-target-id` 和 `data-depth-meters` 连接 JS 布局逻辑。
- CSS class 使用现有语义，例如 `page-card`、`article-card-item`、`sector-depth-line`、`depth-indicator-left`。
- 新增 HTML partial 时使用 `homepage_<purpose>.partial.html` 这类清晰命名。

---

## Examples

- `homepage_hero.partial.html`：首页 hero、雪花 canvas、电梯 overlay、边界线。
- `homepage_main_grid.partial.html`：左侧 sector navigation 和右侧公告/标签面板。
- `homepage_sector_anchors.partial.html`：各扇区文章卡片注入位置。
- `homepage.js` 中的 `layoutSectorDepths()`：根据配置深度和内容高度重新定位 sector line。
