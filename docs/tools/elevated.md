---
summary: "提升执行模式和 /elevated 指令"
read_when:
  - 调整提升模式默认值、允许列表或斜杠命令行为时
title: "提升模式"
---

# 提升模式 (/elevated 指令)

## 功能说明

- `/elevated on` 在网关主机上运行并保留执行审批（与 `/elevated ask` 相同）。
- `/elevated full` 在网关主机上运行 **并且** 自动批准执行（跳过执行审批）。
- `/elevated ask` 在网关主机上运行但保留执行审批（与 `/elevated on` 相同）。
- `on` / `ask` **不会** 强制设置 `exec.security=full`；仍然适用已配置的安全/询问策略。
- 仅当代理处于 **沙箱环境** 时才改变行为（否则 exec 已经在主机上运行）。
- 指令格式：`/elevated on|off|ask|full`，也支持 `/elev on|off|ask|full`。
- 仅接受 `on|off|ask|full`，其他输入会返回提示且不改变状态。

## 控制范围（及不控制的部分）

- **可用门槛**：`tools.elevated` 是全局基线。`agents.list[].tools.elevated` 可以进一步限制每个代理的提升权限（两者都必须允许）。
- **每会话状态**：`/elevated on|off|ask|full` 为当前会话密钥设置提升级别。
- **内嵌指令**：消息中使用 `/elevated on|ask|full` 仅对该条消息生效。
- **群组**：在群聊中，只有当代理被提及时，提升指令才生效。绕过提及要求的仅命令消息视同已提及。
- **主机执行**：提升模式强制将 `exec` 放到网关主机上；`full` 还会设置 `security=full`。
- **审批**：`full` 跳过执行审批；`on`/`ask` 在允许列表/询问规则要求时依然遵守审批。
- **非沙箱代理**：位置无效，只影响门槛判断、日志和状态。
- **工具策略依然适用**：如果工具策略拒绝 `exec`，则不能使用提升。
- **独立于 `/exec` 指令**：`/exec` 调整授权发送者的每会话默认，不需要提升权限。

## 决策顺序

1. 消息中的内嵌指令（仅对该消息有效）。
2. 会话覆盖（通过发送仅包含指令的消息设置）。
3. 全局默认（配置中的 `agents.defaults.elevatedDefault`）。

## 设置会话默认值

- 发送仅包含指令的消息（允许有空白符），例如 `/elevated full`。
- 会收到确认回复（如 “提升模式已设置为 full...” / “提升模式已禁用。”）。
- 如果提升访问被禁用或发送者不在允许列表，会回复可操作的错误提示且不改变会话状态。
- 发送 `/elevated`（或 `/elevated:`）无参数，可查看当前提升级别。

## 可用性与允许列表

- 功能开关：`tools.elevated.enabled`（即使代码支持，配置默认也可能关闭）。
- 发送者允许列表：`tools.elevated.allowFrom`，支持按服务提供商细分（如 `discord`、`whatsapp`）。
- 无前缀的允许列表项仅匹配发送者身份标识值（`SenderId`、`SenderE164`、`From`）；收件人路由字段不用于提升授权。
- 可变发送者元数据需要显式前缀：
  - `name:<值>` 匹配 `SenderName`
  - `username:<值>` 匹配 `SenderUsername`
  - `tag:<值>` 匹配 `SenderTag`
  - `id:<值>`、`from:<值>`、`e164:<值>` 可用作显式身份定位
- 每代理门槛：`agents.list[].tools.elevated.enabled`（可选，只能进一步限制）。
- 每代理允许列表：`agents.list[].tools.elevated.allowFrom`（可选，设置时发送者必须同时满足全局和代理允许列表）。
- Discord 后备机制：若未设置 `tools.elevated.allowFrom.discord`，会使用 `channels.discord.allowFrom` 作为后备（旧版为 `channels.discord.dm.allowFrom`）。设置 `tools.elevated.allowFrom.discord`（包含空数组 `[]`）则覆盖后备。代理允许列表不适用后备机制。
- 所有门槛均必须通过，否则视为提升不可用。

## 日志与状态

- 提升执行调用以信息级别记录日志。
- 会话状态包括提升模式状态（如 `elevated=ask`，`elevated=full`）。
