# State Management

> 原生静态页面中的状态管理约定。

---

## Overview

没有全局状态库。状态来源包括：

- 构建期 HTML：文章卡片、扇区内容、公告。
- DOM layout：sector line、content anchor、right panel、depth indicator 的实际位置。
- Web Storage：滚动位置和雪花开关。
- JS runtime state：拖动滚动、layout scheduling、canvas particles。

---

## State Categories

- Build-time state：来自 `data/homepage.json`、文章 metadata 和模板注入。
- DOM-derived state：由 `getBoundingClientRect()`、`offsetTop`、`offsetHeight` 计算。
- Session state：`sessionStorage` 中的 `jio_base_scroll_position`。
- Persistent UI state：`localStorage` 中的 `jio_snow_enabled`。
- Animation state：雪花 canvas 粒子数组和 animation frame id。

---

## When to Use Global State

不使用 global state library。

如果多个函数需要共享运行时状态，使用集中对象，例如：

- `layoutState`
- `dragScrollState`

不要把同一状态复制到多个局部变量后分别更新。

---

## Server State

不适用。没有 server state。

---

## Common Mistakes

- 保存滚动位置后在布局尚未完成时恢复，导致定位偏差；当前 `scheduleLayout()` 中会在布局后调用 `restoreSavedScrollPosition()`。
- DOM 尺寸和配置深度不一致时没有重新计算 main grid 高度。
- 在 mobile viewport 上沿用 desktop right panel 位置逻辑。
