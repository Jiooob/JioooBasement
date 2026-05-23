# Database Guidelines

> 本仓库没有数据库层。本文件记录“数据配置”的真实约定。

---

## Overview

当前站点数据来自文件系统和 JSON：

- 文章内容：`content/sector-*/*.html`
- 扇区自定义内容：`content/sector-*/section.html`
- 首页导航和公告：`data/homepage.json`
- 模板和 partial：`templates/`

没有 ORM、migration、transaction、SQL query 或 server state。

---

## Configuration Data Patterns

当前 `data/homepage.json` 包含：

- `sector_navigation`：扇区卡片、深度、目标线、右侧标签。
- `announcements`：首页公告列表。

未来架构方向：

- 新建总控配置文件，例如 `data/site.json` 或 `site.config.json`。
- 站点级可配置数据优先进入总控配置，不要散落在 Python 常量、模板硬编码、CSS/JS magic values 里。
- `homepage.json` 可以并入总控配置，或成为总控配置的 `homepage` 子配置。

---

## Query Patterns

不适用。读取配置时应使用标准 JSON parser 和明确字段访问，不要用字符串拼接模拟结构化读取。

新增配置字段时：

- 先搜索字段名和相关 placeholder。
- 更新 Python 渲染逻辑、模板 partial、前端 JS/CSS 使用点。
- 保持字段命名稳定，避免让同一概念在 JSON、Python、JS 中使用不同名字。

---

## Migrations

没有数据库 migration。

配置结构迁移应当：

- 保留旧数据到新数据的清晰映射。
- 一次迁移同时更新构建器和示例配置。
- 跑 `./venv/bin/python run_build.py`。
- 如果影响页面，浏览器检查 `output/index.html`。

---

## Naming Conventions

- JSON 字段使用 snake_case，例如 `target_id`、`depth_meters`、`title_primary`。
- DOM id 与扇区命名保持可推导，例如 `sector-1-line`、`sector-1-content-anchor`。
- 深度值使用 meters 语义，配置字段用 `depth_meters`，不要在标题字符串里重复维护深度。

---

## Common Mistakes

- 把站点配置硬编码到多个文件，导致 JSON、模板和 JS 表示不一致。
- 修改扇区数量时只改 `homepage.json`，忘记更新 sector line / content anchor partial。
- 手动改 `output/`，但下一次构建会被覆盖。
