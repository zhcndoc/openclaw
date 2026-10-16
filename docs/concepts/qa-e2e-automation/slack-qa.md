---
doc-schema-version: 1
summary: "Slack QA 通道及其所需的工作区、应用程序和范围配置。"
read_when:
  - "您正在运行 Slack QA 通道"
  - "您正在为 QA 配置 Slack 工作区"
title: "Slack QA"
---

## Slack QA

```bash
pnpm openclaw qa slack
```

以一个真实的私有 Slack 频道为目标，包含两个不同的机器人：一个由 harness 控制的 driver bot，以及一个由子 OpenClaw gateway 通过捆绑的 Slack 插件启动的 SUT bot。

Slack QA 适配器加载后，它需要异步代理捕获支持，因此无需在网关线程上运行 SQLite 即可读取写入证据。如果缺少该功能，适配器创建会要求您在获取凭据或联系 Slack 之前进行升级。这不能保证当前的 QA CLI 在较旧的主机上加载：使用匹配的当前源签出并查看 [older-host 导入限制 ](/concepts/qa-e2e-automation/operator-flow#operator-flow)。

### <a id="agent-e2e-recipes"></a> 代理E2E食谱

使用测试中的 `.agents/skills/slack-e2e/SKILL.md` 进行可重用本机固定装置、网关回复和 runtime/config 实验。使用可以访问 QA 经纪商的现有经过身份验证的 Convex CLI：

```bash
pnpm openclaw qa slack --doctor
pnpm openclaw qa slack \
  --scenario-file qa/scenarios/channels/slack-e2e-lifecycle.yaml
```

这些选择加入模式会发现内存中的凭证，并默认为 Convex、CI 角色和 `mock-openai`。显式标志或凭证环境设置优先；普通`qa slack`默认值保持不变。重复 `--scenario-file` 以获取声明 `execution.channel: slack` 和 `execution.config.agentE2e: true` 的完整自定义 YAML 流。本机写入运行一次；正的 `retryCount` 值将被拒绝。

准备情况检查实际租赁的身份、共享工作空间、通道访问、网关连接和广告范围。整个生命周期还需要驱动程序 `reactions:read`、`reactions:write`、`files:read` 和 `files:write`。下面的驱动程序清单包含这些功能。现有安装需要应用程序所有者添加缺少的范围并在重新运行生命周期之前重新安装应用程序。缺失的范围会阻止其操作和完整的生命周期证明，而不是基本的文本流。跑步者不会授予权限或轮换凭证来查找通过的结果。授权这些装置操作的是机器人 OAuth 范围，而不是工作区管理员权限。

驱动程序使用Web API调用； SUT 单独拥有套接字模式。存储的 message/file/reaction 回读证明本机状态，而相关的 SUT 回复则证明网关入口和传递。两者都无法证明客户端渲染、人工斜线命令、按钮单击、代理视图或人工打字。使用 [ 手动客户端工作流程 ](/concepts/qa-e2e-automation/operator-flow#mantis-slack-desktop-and-visual-task-runners) 处理这些索赔。

清理在进程关闭后和删除临时捕获状态之前捕获最终的网关写入收据，然后在释放租约之前仅删除拥有的固定装置。私人 `<scenario-id>-slack-e2e.json` 收据区分接受的写入、存储的状态和不完整的清理。

使用 `agentE2e: true`，租用通道中的消息场景还通过本机收据所有者记录其驱动程序根。即使场景断言失败，清理也包括这些根及其捕获的 SUT 回复和独立进度消息。捕获读取获取当前数据库准入，因此网关重新启动不会使最终清理无效。

### <a id="direct-credential-setup"></a> 直接凭证设置

`--credential-source env` 时所需的环境：

- `OPENCLAW_QA_SLACK_CHANNEL_ID`
- `OPENCLAW_QA_SLACK_DRIVER_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_BOT_TOKEN`
- `OPENCLAW_QA_SLACK_SUT_APP_TOKEN`

可选项：

- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 为 Mantis 启用可视化批准检查点。适配器会写入 `<scenario>.pending.json` 和 `<scenario>.resolved.json`，然后等待匹配的 `.ack.json` 文件。
- `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_TIMEOUT_MS` 覆盖检查点确认超时时间。默认值为 `120000`。

通过 Slack 实时适配器公开的共享 YAML 场景：

- `thread-follow-up`
- `thread-isolation`

Slack YAML 模块场景（`qa/scenarios/channels/slack-*.yaml`）：

- `slack-canary`
- `slack-mention-gating`
- `slack-mpim-app-mention-dedupe` - 打开一个真正的 C- 前缀组 DM，在 message/app-mention 双传递后验证一个 SUT 回复，确认本机线程后续可以调用该机器人回复，然后关闭 MPIM。
- `slack-allowlist-block`
- `slack-channel-disabled-warning` - 选择实时 Slack 检查，确认配置的禁用通道发出结构化警告而不回复。
- `slack-top-level-reply-shape`
- `slack-restart-resume`
- `slack-progress-commentary-true`、`slack-progress-commentary-false`、`slack-progress-commentary-omitted` 和 `slack-progress-commentary-verbose-dedupe` / `slack-progress-commentary-verbose-full` - 选择加入真实 Slack 检查独立的 commentary/tool-progress 控件、省略密钥传统默认值和单次交付持久详细进展的行为。 `on` 检查需要安全的 Exec 摘要，无需命令文本或输出； `full` 检查需要在单独的工具输出消息中提供准确的标准输出标记。两者都使用相同的命令，并且需要一个与最终答案分开的注释标识。完整的详细程度允许运行时的命令元数据和一个单独的启动摘要，同时需要唯一的完成输出标识。 Slack 可能会在交付过程中删除命令摘要标头，因此准确的输出行（而不是工具标签）标识已完成的输出。故障保留有限的表示事实，没有原始 Slack 消息或平台标识，包括标记格式和缺少命令标记的 `sleep` 摘要。
- `slack-reaction-glyph-native` —— 可选的实时消息工具 reaction 场景。指示 agent 传递确切的 `✅` 字形，并确认 Slack 已为目标消息上的 SUT bot 存储 `white_check_mark`。
- `slack-chart-presentation-native` —— 可选的可移植图表场景，用于验证原生 `data_visualization` 块和确切的可访问文本。
- `slack-table-presentation-native` —— 可选的可移植表格场景，用于验证原生 `data_table` 块、确切的行和可访问文本。
- `slack-table-invalid-blocks-fallback` —— 可选的直接传输场景，通过生产 Slack 发送路径发送一个结构上可读但超出限制的原始表格，其中包含 101 个数据行及其表头，证明 Slack 本身返回 `invalid_blocks`，并验证已存储的禁用格式回退内容完整且不含原生数据块。场景详情仅保留安全的错误代码、计数和布尔证据。
- `slack-approval-exec-native` —— 可选的原生 Slack exec 批准场景。通过 gateway 请求 exec 批准，验证 Slack 消息包含原生批准按钮，解决该批准，并验证已解决的 Slack 更新。
- `slack-approval-plugin-native` - 选择加入本机 Slack 插件审批场景。一起启用 exec 和插件批准转发，以便插件事件不会被 exec 批准路由抑制，然后验证相同的 pending/resolved 本机 Slack UI 路径。
- `slack-codex-approval-exec-native` - 选择加入 Codex 监护人命令批准场景。在 Guardian 模式下启用 Codex 插件，通过 Codex 应用程序服务器harness路由 Slack-originated Gateway 代理转向，等待 `codex` 的本机 Slack 插件批准提示，解决它，并使用预期的命令输出和助手验证 Codex 转向完成标记。
- `slack-codex-approval-plugin-native` - 选择加入 Codex Guardian 文件审批场景。使用外部工作空间 `apply_patch` 指令，以便 Codex 发出应用程序服务器文件更改批准路径，然后在清理之前验证相同的本机 Slack pending/resolved 批准路径、最终辅助标记和确切的文件内容。

Codex 批准场景需要 `openai/*` 或 `codex/*` `--model`、正常的实时模型凭证以及 Codex 插件接受的 Codex 身份验证或 API-key 身份验证。场景详细信息包括 Codex 应用程序服务器方法、选定的 Codex 模型密钥、最终 Codex 转弯状态、操作标记验证以及经过编辑的 Slack 批准元数据。

输出工件：

- `qa-suite-report.md`
- `qa-suite-summary.json`
- `qa-evidence.json` - 实时传输检查的证据条目。
- `approval-checkpoints/` - 仅当 Mantis 设置 `OPENCLAW_QA_SLACK_APPROVAL_CHECKPOINT_DIR` 时；包含检查点 JSON、确认 JSON 和 pending/resolved 屏幕截图。

### <a id="setting-up-the-slack-workspace"></a> 设置 Slack 工作区

该通道需要同一工作区中的两个不同 Slack 应用，以及一个两个机器人都加入的频道：

- `channelId` —— 两个机器人都已被邀请加入的频道的 `Cxxxxxxxxxx` id。请使用专用频道；该通道每次运行都会发消息。
- `driverBotToken` —— **Driver** 应用的 bot token（`xoxb-...`）。
- `sutBotToken` —— **SUT** 应用的 bot token（`xoxb-...`），它必须与 driver 是不同的 Slack 应用，这样它的 bot user id 才会不同。
- `sutAppToken` —— SUT 应用的 app-level token（`xapp-...`），带有 `connections:write`，由 Socket Mode 使用，使 SUT 应用能够接收事件。

优先使用专用于 QA 的 Slack 工作区，而不是复用生产工作区。

下面的 SUT 清单有意将捆绑的 Slack 插件的生产安装 （`extensions/slack/src/setup-shared.ts:12`） 缩小到实时 Slack QA 套件涵盖的权限和事件。用户看到的生产通道设置请参见[Slack通道快速设置](/channels/slack/setup#quick-setup)； QA Driver/SUT 对故意分开，因为通道在一个工作区中需要两个不同的机器人用户 ID。

**1. 创建 Driver 应用**

Go 到 [api.slack.com/apps](https://api.slack.com/apps) → _创建新应用程序_ → _从清单_ → 选择 QA 工作区，粘贴以下清单，然后_安装到工作区_：

```json
{
  "display_information": {
    "name": "OpenClaw QA Driver",
    "description": "Test driver bot for OpenClaw QA Slack live lane"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA Driver",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "channels:history",
        "chat:write",
        "files:read",
        "files:write",
        "groups:history",
        "reactions:read",
        "reactions:write",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": false
  }
}
```

复制 _Bot 用户 OAuth 令牌_ （`xoxb-...`） - 变成 `driverBotToken`。驱动程序可以 read/write 固定消息、反应和文件；它既不需要事件订阅，也不需要套接字模式。

**2. 创建 SUT 应用**

在同一工作区中重复 _Create New App → From a manifest_。这个 QA 应用故意使用捆绑的 Slack 插件生产 manifest（`extensions/slack/src/setup-shared.ts:12`）的更窄版本：省略了 reaction 作用域和事件，因为 live Slack QA 套件尚未覆盖 reaction 处理。

```json
{
  "display_information": {
    "name": "OpenClaw QA SUT",
    "description": "OpenClaw QA SUT connector for OpenClaw"
  },
  "features": {
    "bot_user": {
      "display_name": "OpenClaw QA SUT",
      "always_online": true
    },
    "app_home": {
      "home_tab_enabled": true,
      "messages_tab_enabled": true,
      "messages_tab_read_only_enabled": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "app_mentions:read",
        "assistant:write",
        "channels:history",
        "channels:read",
        "chat:write",
        "commands",
        "emoji:read",
        "files:read",
        "files:write",
        "groups:history",
        "groups:read",
        "im:history",
        "im:read",
        "im:write",
        "mpim:history",
        "mpim:read",
        "mpim:write",
        "pins:read",
        "pins:write",
        "usergroups:read",
        "users:read"
      ]
    }
  },
  "settings": {
    "socket_mode_enabled": true,
    "event_subscriptions": {
      "bot_events": [
        "app_home_opened",
        "app_mention",
        "channel_rename",
        "member_joined_channel",
        "member_left_channel",
        "message.channels",
        "message.groups",
        "message.im",
        "message.mpim",
        "pin_added",
        "pin_removed"
      ]
    }
  }
}
```

Slack 创建应用后，在其设置页面执行两件事：

- _Install to Workspace_ → 复制 _Bot User OAuth Token_ → 它将成为 `sutBotToken`。
- _Basic Information → App-Level Tokens → Generate Token and Scopes_ → 添加 scope `connections:write` → 保存 → 复制 `xapp-...` 值 → 它将成为 `sutAppToken`。

通过对每个 token 调用 `auth.test` 来验证两个机器人拥有不同的 user id。运行时通过 user id 区分 driver 和 SUT；若两个角色复用同一个应用，mention-gating 会立即失败。

**3. 创建频道**

在 QA 工作区中，创建一个频道 （e.g. `#openclaw-qa`） 并从频道内部邀请两个机器人：

```text
/invite @OpenClaw QA Driver
/invite @OpenClaw QA SUT
```

从 _channel info → About → Channel ID_ 复制 `Cxxxxxxxxxx` id —— 它将成为 `channelId`。公开频道可以使用；如果你使用私有频道，两个应用已经拥有 `groups:history`，因此 harness 的历史读取仍然会成功。

**4. 注册凭据**

两种方式。单机调试使用环境变量（设置四个 `OPENCLAW_QA_SLACK_*` 变量并传入 `--credential-source env`），或者将共享 Convex 池预先填充，以便 CI 和其他维护者租用。

对于 Convex 池，写入一个 JSON 文件中的四个字段：

```json
{
  "channelId": "Cxxxxxxxxxx",
  "driverBotToken": "xoxb-...",
  "sutBotToken": "xoxb-...",
  "sutAppToken": "xapp-..."
}
```

在 shell 中导出 `OPENCLAW_QA_CONVEX_SITE_URL` 和 `OPENCLAW_QA_CONVEX_SECRET_MAINTAINER` 后，注册并验证：

```bash
pnpm openclaw qa credentials add \
  --kind slack \
  --payload-file slack-creds.json \
  --note "QA Slack pool seed"

pnpm openclaw qa credentials list --kind slack --status all --json
```

预期 `count: 1`、`status: "active"`，且没有 `lease` 字段。

**5. 端到端验证**

在本地运行该通道，以确认两个机器人能够通过 broker 相互通信：

```bash
pnpm openclaw qa slack \
  --credential-source convex \
  --credential-role maintainer \
  --output-dir .artifacts/qa-e2e/slack-local
```

一次绿色运行在 30 秒内即可完成，而 `qa-suite-report.md` 会显示 `slack-canary` 和 `slack-mention-gating` 的状态均为 `pass`。如果该通道卡住约 90 秒并以 `Convex credential pool exhausted for kind "slack"` 退出，则要么池为空，要么每一行都已被租用——`qa credentials list --kind slack --status all --json` 会告诉你具体情况。
