---
summary: "重定向到 /plugins/sdk-channel-outbound"
title: "Channel message API"
---

此页面已移动到 [Channel outbound API](/plugins/sdk-channel-outbound)。

`openclaw/plugin-sdk/channel-message` 和
`openclaw/plugin-sdk/channel-message-runtime` 仍然是为旧插件保留的已弃用兼容
子路径；这两者都只是共享 channel
message core 的轻量别名。新的 channel 插件应使用
`openclaw/plugin-sdk/channel-outbound` 来处理消息生命周期、回执、
持久化发送和实时预览辅助功能，而不是向已弃用的子路径添加新的辅助方法。

移除计划：在外部插件迁移窗口期间保留这些别名，
然后在调用方迁移到 `channel-outbound` 之后，在下一次主要 SDK 清理中移除它们。
