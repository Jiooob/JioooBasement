# Type Safety

> 本仓库没有 TypeScript；通过数据契约和构建验证保证结构一致。

---

## Overview

当前类型边界主要是：

- JSON 配置字段。
- HTML metadata。
- DOM id/class/data attribute。
- Python `Page` 对象属性。

没有 TypeScript、Zod、runtime schema validation。

---

## Type Organization

当前没有独立 type 文件。

未来模块化时，如果新增总控配置文件，建议在 Python 构建器中集中定义配置读取/规范化逻辑，避免每个渲染函数直接读取 raw dict。

---

## Validation

当前验证主要依靠构建运行和浏览器检查。

新增总控配置时，推荐增加轻量 validation：

- 必需字段存在。
- `depth_meters` 等数字字段可转换为 int。
- `target_id` 指向存在的 sector line。
- sector navigation 与 sector anchors/lines 数量一致。

---

## Common Patterns

- Python 读取 JSON 后用 helper 函数规范化，例如当前 `normalize_sector_depth()` 和 `build_sector_primary_title()`。
- HTML metadata 用 `blog-*` 命名，构建器去掉前缀后存入 `Page.metadata`。
- JS 从 `dataset` 读取字符串后显式转换数字，例如 `Number(card.dataset.depthMeters || 0)`。

---

## Forbidden Patterns

- 不在 JS 中假设 `dataset` 数值已经是 number。
- 不让多个文件各自发明同一配置字段的 fallback 规则。
- 不把结构化数据塞进标题字符串再解析，除非是为了兼容旧内容；新数据应优先有明确字段。
