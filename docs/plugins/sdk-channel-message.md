---
summary: "重定向到 /plugins/sdk-channel-outbound"
title: "Channel message API"
---

此页面已移动到 [Channel outbound API](/plugins/sdk-channel-outbound)。

`openclaw/plugin-sdk/channel-message` 和
`openclaw/plugin-sdk/channel-message-runtime` 仍然是为旧插件保留的已弃用兼容
子路径。新的 channel 插件应使用
`openclaw/plugin-sdk/channel-outbound` 来处理消息生命周期、回执、持久化
发送和实时预览辅助功能。已弃用的子路径只是共享 channel message 核心以及聚焦的 inbound/outbound SDK 表面的轻量别名；
不要在其中添加新的辅助功能。

移除计划：在外部插件迁移窗口期间保留这些别名，
然后在调用方迁移到 `channel-outbound` 之后，于下一次主要 SDK 清理中将其移除。
