---
summary: "入站频道位置解析（Telegram/WhatsApp/Matrix）与上下文字段"
read_when:
  - 添加或修改频道位置解析
  - 在代理提示或工具中使用位置上下文字段
title: "频道位置解析"
---

OpenClaw 将来自聊天频道的共享位置规范化为：

- 附加到入站正文末尾的简洁坐标文本，以及
- 自动回复上下文负载中的结构化字段。频道提供的标签、地址以及标题/评论会通过共享的未受信任元数据 JSON 块渲染到提示中，而不是以内联方式出现在用户正文里。

当前支持：

- **Telegram**（位置标记 + 场所 + 实时位置）
- **WhatsApp**（locationMessage + liveLocationMessage）
- **Matrix**（带 `geo_uri` 的 `m.location`）

## 文本格式

位置会以友好的行形式呈现，不带括号：

- 标记：
  - `📍 48.858844, 2.294351 ±12m`
- 命名地点：
  - `📍 48.858844, 2.294351 ±12m`
- 实时共享：
  - `🛰 实时位置：48.858844, 2.294351 ±12m`

如果频道包含标签、地址或标题/评论，它会保留在上下文负载中，并作为带围栏的未受信任 JSON 显示在提示里：

````text
Location (untrusted metadata):
```json
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "name": "埃菲尔铁塔",
  "address": "战神广场，巴黎",
  "caption": "在这里见面"
}
```
````

## 上下文字段

当存在位置时，以下字段会添加到 `ctx`：

- `LocationLat`（number）
- `LocationLon`（number）
- `LocationAccuracy`（number，米；可选）
- `LocationName`（string；可选）
- `LocationAddress`（string；可选）
- `LocationSource`（`pin | place | live`）
- `LocationIsLive`（boolean）
- `LocationCaption`（string；可选）

提示渲染器将 `LocationName`、`LocationAddress` 和 `LocationCaption` 视为未受信任元数据，并通过与其他频道上下文相同的受限 JSON 路径进行序列化。

## 频道说明

- **Telegram**：场所会映射到 `LocationName/LocationAddress`；实时位置使用 `live_period`。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 会填充 `LocationCaption`。
- **Matrix**：`geo_uri` 会被解析为标记位置；海拔会被忽略，且 `LocationIsLive` 始终为 false。

## 相关内容

- [位置命令（节点）](/nodes/location-command)
- [摄像头拍摄](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
