# Directory Structure

> Python 静态构建器和站点源文件的组织方式。

---

## Overview

本仓库没有传统 backend server。构建期 Python 代码负责把 HTML 内容、模板、
partial、JSON 数据和静态资源组装成 `output/` 中的静态站点。

当前核心入口：

- `run_build.py`：最小入口，只导入并调用 `site_builder.build()`。
- `site_builder.py`：当前单文件构建器，包含路径常量、文章解析、模板读取、首页数据注入、扇区遍历、输出写入。
- `.github/workflows/deploy.yml`：CI 构建并发布 `output/` 到 `gh-pages`。

---

## Directory Layout

```text
.
├── run_build.py                 # 构建入口
├── site_builder.py              # Python 静态站点生成器
├── content/
│   └── sector-*/                # 文章和扇区自定义 HTML
│       ├── *.html               # 直接编写的文章 HTML
│       └── section.html         # 可选扇区自定义内容
├── data/
│   └── homepage.json            # 当前首页扇区导航和公告数据
├── templates/
│   ├── index.template           # 首页主模板
│   ├── article.template         # 文章页模板
│   └── partials/                # 首页片段
├── static/                      # CSS、JS、icons、images
└── output/                      # 生成物，Git 忽略
```

---

## Module Organization

当前现实：`site_builder.py` 仍是单文件构建器。未来做数据/代码架构模块化时，优先按现有构建职责拆分，而不是引入大型框架或插件系统。

推荐职责边界：

- config loading：读取站点总控配置。未来应新增 `data/site.json` 或类似总控文件，不继续无限扩展 `data/homepage.json`。
- content parsing：读取 `content/sector-*/*.html`，解析 `blog-title`、`blog-date`、`blog-summary`，提取 `<body>`。
- template rendering：读取 `templates/` 和 `templates/partials/`，替换 placeholder。
- homepage rendering：把站点配置、扇区导航、公告、自定义 section 注入首页。
- output preparation：清空 `output/`，复制 `static/`、`pages/`、`CNAME`，写入构建结果。

拆分时保持 public entrypoint 稳定：`run_build.py` 仍应能调用一个清晰的 `build()`。

---

## Naming Conventions

- `content/sector-*` 是扇区目录命名规则；新增扇区时保持 `sector-数字` 格式，并同步首页数据和 sector anchors/lines。
- 文章文件可以使用中文文件名；构建器按文件名生成同名输出。
- 文章 HTML 必须包含 `meta name="blog-title"`、`meta name="blog-date"`、`meta name="blog-summary"`。
- 模板 placeholder 使用 HTML 注释格式，例如 `<!-- HOMEPAGE_HEAD_HERE -->`、`<!-- SECTOR_01_CARDS_HERE -->`。
- Python helper 使用简短动词命名，如 `load_homepage_data()`、`render_announcements()`、`prepare_output_dir()`。

---

## Examples

- `Page.parse()`：解析文章 metadata 和 `<body>` 内容。
- `assemble_index_template()`：把首页 partial 注入 `index.template`。
- `inject_homepage_data()`：把 JSON 数据渲染成首页 HTML。
- `build()`：当前完整构建流程的顺序来源，模块化时应先保护这个行为。
