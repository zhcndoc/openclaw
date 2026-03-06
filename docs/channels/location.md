---
summary: "入站频道位置解析（Telegram + WhatsApp）及上下文字段"
read_when:
  - 添加或修改频道位置解析
  - 在客服提示或工具中使用位置上下文字段
title: "频道位置解析"
---

# 频道位置解析

OpenClaw 会将聊天频道中共享的位置规范化为：

- 追加到入站消息正文中的可读文本，及
- 自动回复上下文负载中的结构化字段。

当前支持：

- **Telegram**（位置标记 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（带有 `geo_uri` 的 `m.location`）

## 文本格式

位置以友好文本行形式渲染，不带括号：

- 标记：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 Eiffel Tower — Champ de Mars, Paris (48.858844, 2.294351 ±12m)`
- 实时共享：
  - `🛰 Live location: 48.858844, 2.294351 ±12m`

若频道中包含标题/备注，则追加在下一行：

```
📍 48.858844, 2.294351 ±12m
Meet here
```

## 上下文字段

存在位置信息时，以下字段会添加到 `ctx` 中：

- `LocationLat`（数字）
- `LocationLon`（数字）
- `LocationAccuracy`（数字，单位米；可选）
- `LocationName`（字符串；可选）
- `LocationAddress`（字符串；可选）
- `LocationSource`（`pin | place | live`）
- `LocationIsLive`（布尔值）

## 频道说明

- **Telegram**：场所映射为 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 追加为标题行。
- **Matrix**：`geo_uri` 解析为标记位置；忽略海拔高度，`LocationIsLive` 始终为 false。
