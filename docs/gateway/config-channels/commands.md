---
summary: "Commands.* 块：本机和文本命令界面、bash、配置写入和所有者白名单"
read_when:
  - "启用或禁用聊天命令界面"
  - "限制谁可以在通道上运行命令"
  - "审核 `/config`、`/mcp`、`/plugins` 或 `!` bash 访问"
title: "配置——聊天命令"
---

`commands.*` 块：注册了哪些聊天命令界面以及谁可以使用它们。

## <a id="commands-(chat-command-handling)"></a><a id="commands-chat-command-handling"></a> Commands（聊天命令处理）

```json5
{
  commands: {
    native: "auto", // register native commands when supported
    nativeSkills: "auto", // register native skill commands when supported
    text: true, // parse /commands in chat messages
    bash: false, // allow ! (alias: /bash)
    bashForegroundMs: 2000,
    config: false, // allow /config
    mcp: false, // allow /mcp
    plugins: false, // allow /plugins
    debug: false, // allow /debug
    restart: true, // allow /restart + external SIGUSR2 restart requests
    ownerAllowFrom: ["discord:123456789012345678"],
    allowFrom: {
      "*": ["user1"],
      discord: ["user:123"],
    },
  },
}
```

<Accordion id="command-details" title="命令详情">

- 此区块用于配置命令入口。有关当前内置命令和捆绑命令的目录，请参阅 [Slash Commands](/tools/slash-commands)。
- 此页面是**配置密钥参考**，而不是完整的命令目录。 Channel/plugin-owned 命令，例如 QQ Bot `/bot-ping` `/bot-help` `/bot-logs`、LINE `/card`、设备对 `/pair`、内存 `/dreaming` 和 Talk `/voice` 记录在其 channel/plugin 页面以及 [Slash Commands](/tools/slash-commands) 中。
- 文本命令必须是带有前导 `/` 的**独立**消息。
- `native: "auto"` 会为 Discord/Telegram 启用原生命令，但会关闭 Slack 的原生命令。
- `nativeSkills: "auto"` 会为 Discord/Telegram 启用原生技能命令，但会关闭 Slack 的原生技能命令。
- 可按频道覆盖：`channels.discord.commands.native`（布尔值或 `"auto"`）。对于 Discord，`false` 会在启动期间跳过原生命令的注册和清理。
- 使用 `channels.<provider>.commands.nativeSkills` 可按频道覆盖原生技能注册。
- `channels.telegram.customCommands` 会添加额外的 Telegram bot 菜单项。
- `bash: true` 会为主机 shell 启用 `! <cmd>`。需要启用 `tools.elevated.enabled`，且发送者必须位于 `tools.elevated.allowFrom.<channel>` 中。
- `config: true` 启用 `/config` （reads/writes `openclaw.json`）。对于网关`chat.send`客户端，持久`/config set|unset`写入也需要`operator.admin`；只读 `/config show` 对普通写范围操作员客户端仍然可用。
- `mcp: true` 为 `mcp.servers` 下的 OpenClaw- 托管 MCP 服务器配置启用 `/mcp`。
- `plugins: true` 启用 `/plugins` 进行插件发现、安装和 enable/disable 控制。
- `channels.<provider>.configWrites` 控制每个频道的配置变更（默认值：true）。
- 对于多账户频道，`channels.<provider>.accounts.<id>.configWrites` 还会控制针对该账户的写入操作（例如 `/allowlist --config --account <id>` 或 `/config set channels.<provider>.accounts.<id>...`）。
- `restart: false` 禁用 `/restart` 和外部 `SIGUSR2` 重启请求。默认值：`true`。
- `ownerAllowFrom` 是用于仅限所有者命令和由所有者控制的频道操作的显式所有者允许列表。它与 `allowFrom` 分开。
- `allowFrom` 是每个提供商的。设置后，它是命令和指令的 **only** 授权源。
- 未设置 `allowFrom` 时，命令授权遵循频道允许列表和配对状态。频道允许列表中的访问组条目会自动解析。
- 命令文档映射：
  - 内置命令和捆绑命令目录：[Slash Commands](/tools/slash-commands)
  - 频道专属命令入口：[Channels](/channels)
  - QQ Bot 命令：[QQ Bot](/channels/qqbot)
  - 配对命令：[Pairing](/channels/pairing)
  - LINE 卡片命令：[LINE](/channels/line)
  - 记忆梦想：[Dreaming](/concepts/dreaming)

</Accordion>
