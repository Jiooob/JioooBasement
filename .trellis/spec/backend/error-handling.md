# Error Handling

> 构建期错误处理约定。

---

## Overview

本仓库错误主要发生在构建期：缺少模板、HTML metadata 不完整、JSON 配置字段缺失、路径不一致、静态资源引用错误。

当前 `build()` 对模板缺失有 `FileNotFoundError` 捕获并打印中文错误后中止。其他错误会直接抛出 Python traceback，这对个人项目调试是可接受的当前状态。

---

## Error Types

当前没有自定义 exception 类型。未来模块化时，只有在多个构建部件需要区分错误种类时才增加自定义错误；不要为了形式引入复杂异常层级。

推荐未来最小分类：

- config error：JSON 无法读取、必需字段缺失、字段类型不符合预期。
- content error：文章 metadata 缺失或 HTML 无法解析。
- template error：模板文件、partial 或 placeholder 缺失。
- output error：输出目录无法清理或写入。

---

## Error Handling Patterns

- 构建器应 fail fast。关键模板、配置、内容结构错误不要静默吞掉。
- 对可选文件使用显式 fallback。当前 `load_sector_custom_content()` 对缺失 `section.html` 返回空字符串是合理模式。
- 对必需文件使用清晰错误。当前 `load_templates()` 缺文件会中止构建。
- 不要用裸 `except Exception` 隐藏具体问题。

---

## API Error Responses

不适用。本仓库没有 HTTP API。

---

## Common Mistakes

- 文章缺少 `blog-title` 时会显示默认 `无标题`，但这通常不是期望结果；新增文章时应主动补齐 metadata。
- 配置字段在 `render_sector_navigation()` 等函数中直接索引，如 `sector["target_id"]`，字段缺失会抛错。改配置结构时必须同步渲染逻辑。
- 复制静态资源路径时混用 Windows 反斜杠和 URL 正斜杠，可能在浏览器中表现异常。
