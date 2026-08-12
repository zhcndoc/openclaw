---
summary: "管理 Talk Voice 语音选择（list/set）。"
read_when:
  - 安装、配置或审查 Talk Voice 插件时
title: "Talk Voice 插件"
---

# Talk Voice 插件

管理 Talk 语音选择（list/set）。

## 分发

- Package：`openclaw`
- Install route：包含在 OpenClaw 中

## 界面

命令：`/voice`

<!-- openclaw-plugin-reference:manual-start -->

## 从聊天中配置 Talk voice

使用命令前，请设置 `talk.provider`，并配置匹配的 `talk.providers.<provider>` 条目。活动 provider 必须支持 voice 列表。

- `/voice status` 显示活动 provider 和选定的 provider 作用域 voice ID。API-key 字段仅表示经过掩码处理或未设置的配置值；它不能证明可用凭据已经存在。
- `/voice list [limit]` 列出活动 provider 中的 voice。默认限制为 12，最大为 50。
- `/voice set <voiceId|name>` 按精确 ID、精确名称或部分名称解析 voice，然后将其保存到 `talk.providers.<activeProvider>.voiceId`。

Discord 将原生命令注册为 `/talkvoice`；其子命令和参数相同。Status 和 list 为只读操作。在消息频道中设置 voice 需要 owner，或 Gateway 客户端需要 `operator.admin` 作用域。

失败会在聊天中直接返回。缺少 Talk 配置时会指出所需的键；provider 查询错误会包含 provider 错误；未知 voice 会建议列出可用 voice；未经授权的写入会说明所需权限。

<!-- openclaw-plugin-reference:manual-end -->
