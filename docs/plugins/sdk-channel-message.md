---
summary: "重定向到 /plugins/sdk-channel-outbound"
title: "Channel message API"
---

此页面已移动到 [Channel outbound API](/plugins/sdk-channel-outbound)。

`openclaw/plugin-sdk/channel-message` remains a deprecated compatibility
subpath for older plugins. New channel plugins should use
`openclaw/plugin-sdk/channel-outbound` for message lifecycle, receipt,
durable send, and live preview helpers instead of adding new helpers to the
deprecated subpath.

移除计划：在外部插件迁移窗口期间保留这些别名，
然后在调用方迁移到 `channel-outbound` 之后，在下一次主要 SDK 清理中移除它们。
