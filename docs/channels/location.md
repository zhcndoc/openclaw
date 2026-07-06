---
summary: "入站频道位置解析（Telegram、WhatsApp、Matrix、LINE）和上下文字段"
read_when:
  - 添加或修改频道位置解析
  - 在代理提示或工具中使用位置上下文字段
title: "频道位置解析"
---

OpenClaw 将来自聊天频道的共享位置规范化为：

- 附加到入站正文末尾的简洁坐标文本，以及
- 自动回复上下文负载中的结构化字段。频道提供的标签、地址以及标题/评论会通过共享的未受信任元数据 JSON 块渲染到提示中，而不是以内联方式出现在用户正文里。

当前支持：

- **LINE**（带标题/地址的位置消息）
- **Matrix**（`m.location`，带 `geo_uri`）
- **Telegram**（位置图钉 + 场所 + 实时位置）
- **WhatsApp**（`locationMessage` + `liveLocationMessage`）

## 文本格式

位置会以友好的行形式显示，不带括号。坐标使用六位小数；精度四舍五入到整米：

- 标记：
  - `📍 48.858844, 2.294351 ±12m`
- 名称地点（同一行；名称/地址仅进入元数据块）：
  - `📍 48.858844, 2.294351 ±12m`
- 实时共享：
  - `🛰 实时位置：48.858844, 2.294351 ±12m`

如果频道包含标签、地址或标题/评论，它会保留在上下文载荷中，并以带围栏的不受信任 JSON 形式出现在提示中（缺失时会省略字段）：

````text
位置（不受信任的元数据）：
```json
{
  "latitude": 48.858844,
  "longitude": 2.294351,
  "accuracy_m": 12,
  "source": "place",
  "name": "Eiffel Tower",
  "address": "Champ de Mars, Paris",
  "caption": "Meet here"
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

当频道未设置显式来源时，OpenClaw 会推断它：live 分享变为 `live`，带有名称或地址的位置变为 `place`，其余情况均为 `pin`。

提示渲染器将 `LocationName`、`LocationAddress` 和 `LocationCaption` 视为不受信任的元数据，并通过与其他频道上下文相同的受限 JSON 路径对它们进行序列化。

## 频道说明

- **LINE**：位置消息的 `title`/`address` 映射到 `LocationName`/`LocationAddress`；不支持实时位置。
- **Matrix**：`geo_uri` 解析为固定位置；`u`（不确定性）参数映射到 `LocationAccuracy`，事件正文填充 `LocationCaption`，海拔被忽略，且 `LocationIsLive` 始终为 false。
- **Telegram**：地点信息映射到 `LocationName`/`LocationAddress`；通过 `live_period` 检测实时位置。
- **WhatsApp**：`locationMessage.comment` 和 `liveLocationMessage.caption` 填充 `LocationCaption`。

## 相关内容

- [位置命令（节点）](/nodes/location-command)
- [摄像头拍摄](/nodes/camera)
- [媒体理解](/nodes/media-understanding)
