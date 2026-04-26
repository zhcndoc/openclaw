---
summary: "入站频道位置解析（Telegram/WhatsApp/Matrix）及上下文字段"
read_when:
  - 添加或修改频道位置解析
  - 在 agent 提示词或工具中使用位置上下文字段
title: "频道位置解析"
---

OpenClaw 将聊天频道中共享的位置规范化为：

- 追加到入站正文末尾的简洁坐标文本，以及
- 自动回复上下文负载中的结构化字段。频道提供的标签、地址和标题/评论会通过共享的不受信任元数据 JSON 块渲染到提示词中，而不是内联到用户正文里。

当前支持：

- **Telegram**（位置标记 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（带有 `geo_uri` 的 `m.location`）

## 文本格式

位置以友好文本行形式渲染，不带括号：

- 标记：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 48.858844, 2.294351 ±12m`
- 实时共享：
  - `🛰 实时位置：48.858844, 2.294351 ±12m`

如果频道包含标签、地址或标题/评论，它会保留在上下文负载中，并以带围栏的不受信任 JSON 形式出现在提示词里：

````text
Location (untrusted metadata):
```json
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris",
  "caption": "Meet here"
}
```
````

## 上下文字段

存在位置信息时，以下字段会添加到 `ctx` 中：

- `LocationLat` (number)
- `LocationLon` (number)
- `LocationAccuracy` (number, meters; optional)
- `LocationName` (string; optional)
- `LocationAddress` (string; optional)
- `LocationSource` (`pin | place | live`)
- `LocationIsLive` (boolean)
- `LocationCaption` (string; optional)

提示词渲染器会将 `LocationName`、`LocationAddress` 和 `LocationCaption` 视为不受信任的元数据，并通过与其他频道上下文相同的受限 JSON 路径进行序列化。

## 频道说明

- **Telegram**：venue 会映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 会填充 `LocationCaption`。
- **Matrix**：`geo_uri` 会被解析为标记位置；海拔会被忽略，且 `LocationIsLive` 始终为 false。

## 相关

- [位置命令（节点）](/nodes/location-command)
- [摄像头拍摄](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
