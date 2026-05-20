# Logging Guidelines

> 构建脚本输出约定。

---

## Overview

当前构建器使用 `print()` 输出中文构建进度，例如“演算开始”、“模板已加载”、“正在处理 sector-01”。没有 logging library，也没有 structured logging。

对这个个人静态站点，`print()` 足够。不要为了简单构建脚本引入复杂 logging 框架。

---

## Log Levels

当前没有 formal log levels。

约定：

- 普通构建进度：用 `print()`。
- 可恢复或可选内容缺失：通常不需要输出，除非会影响用户理解。
- 构建中止错误：输出清晰中文错误信息，再停止。

---

## Structured Logging

不需要 structured logging。

如果未来构建器拆成多个模块，仍优先保持人类可读的构建日志，而不是 JSON log。

---

## What to Log

应输出：

- 构建开始和结束。
- 静态文件复制完成。
- 模板加载完成。
- 正在处理的 sector。
- 发现并渲染的文章文件。
- 构建中止原因。

当前 `build()` 已覆盖这些核心信息。

---

## What NOT to Log

- 不输出本地绝对路径，除非是调试错误必需。
- 不输出任何未来可能进入配置文件的 token、部署 secret 或私有路径。
- 不把文章全文打印到构建日志。
