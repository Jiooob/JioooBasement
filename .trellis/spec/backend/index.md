# Backend Development Guidelines

> 本仓库的 backend 指 Python 静态站点生成器与构建流程，不是常驻服务端。

---

## Overview

`JioooBasement` 是单仓库个人静态站点。构建入口是 `run_build.py`，核心逻辑在
`site_builder.py`。构建器读取 `content/sector-*` 下的 HTML 文章，使用
`templates/` 和 `data/` 组装站点，输出到 Git 忽略的 `output/` 目录，再由 GitHub
Actions 发布到 `gh-pages`。

项目特定规范使用中文书写，保留必要 English technical terms。

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Python 构建器、内容、模板、数据和输出目录边界 | Filled |
| [Database Guidelines](./database-guidelines.md) | 明确本仓库没有数据库层，配置数据如何处理 | Filled |
| [Error Handling](./error-handling.md) | 构建期错误、缺失模板、内容 metadata 的处理方式 | Filled |
| [Quality Guidelines](./quality-guidelines.md) | 构建器改动、页面改动、验证和 review 要求 | Filled |
| [Logging Guidelines](./logging-guidelines.md) | 构建日志输出、错误信息和敏感信息规则 | Filled |

---

## Pre-Development Checklist

改 Python 构建器或构建配置前：

- 阅读 `site_builder.py`，确认现有职责边界。
- 搜索将要改的 placeholder、配置字段或路径常量，避免模板、JSON、JS、CSS 漏改。
- 运行 `./venv/bin/python run_build.py` 验证构建。
- 如果改动影响页面输出、模板、CSS/JS 引用或构建产物结构，必须进行浏览器检查。

改内容数据或模板前：

- 确认 `content/sector-*`、`templates/partials/*`、`data/homepage.json` 的现有契约。
- 保持 `output/` 为生成物，不手写维护其中内容。
- 直接 HTML 文章是当前和未来的主要内容写作方式。
