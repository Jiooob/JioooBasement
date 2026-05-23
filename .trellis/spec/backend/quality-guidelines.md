# Quality Guidelines

> Python 构建器和构建流程的质量标准。

---

## Overview

质量目标是：文章可继续直接写 HTML，页面调整符合当次用户意图，构建器模块化时职责更清楚，站点配置逐步集中到单文件控制。

---

## Forbidden Patterns

- 不手动编辑 `output/` 作为源内容；`output/` 是生成物。
- 不把同一站点配置散落在 JSON、模板、Python、JS 多处硬编码。
- 不引入大型框架来解决当前静态构建器的小范围职责拆分。
- 不把文章写作流程迁移到 Markdown/frontmatter，除非用户后续明确改变方向。
- 不用字符串正则解析完整 HTML 结构；现状使用 BeautifulSoup，应继续用 HTML parser。

---

## Required Patterns

- 构建入口保持简单：`run_build.py` 调用构建器的 `build()`。
- 新增文章继续放入 `content/sector-*/*.html`，并包含 `blog-title`、`blog-date`、`blog-summary`。
- 可选扇区内容使用 `content/sector-*/section.html`。
- 新增或修改站点可配置数据时，优先考虑未来总控配置文件边界。
- 修改任何配置值、placeholder、DOM id、sector 名称前先搜索现有引用。

---

## Testing Requirements

最低验证：

```bash
./venv/bin/python run_build.py
```

页面调整或构建部分改动后，必须额外使用浏览器检查生成页面。可以直接打开 `output/index.html`，也可以启动本地静态服务。

如果未来引入测试，应优先覆盖：

- 文章 metadata 解析。
- 扇区排序和文章卡片生成。
- 模板 partial 注入。
- 总控配置到首页数据的转换。

---

## Code Review Checklist

- 构建是否通过。
- 改动是否影响 GitHub Actions deploy。
- 是否错误修改或依赖了 `output/`。
- 新字段是否在 JSON、Python、模板、JS/CSS 中保持一致。
- 页面/构建改动是否已浏览器检查。
- 模块化是否真的降低职责耦合，而不是只把一个文件拆成多个互相强依赖的文件。
