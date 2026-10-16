---
summary: "将对话或线程绑定到 ACP 会话，并配置持久绑定[]条目"
title: "ACP 代理绑定"
read_when:
  - "将消息渠道对话绑定到持久 ACP 会话"
  - "在消息渠道上设置绑定到对话的 ACP 会话"
  - "您正在配置类型为 acp 的顶级绑定[]条目"
---

## <a id="bound-sessions"></a> 绑定会话

### <a id="mental-model"></a> 心智模型

- **聊天界面** - 人们持续对话的地方（Discord 频道、Telegram 主题、iMessage 聊天）。
- **ACP 会话** - 持久 Codex/Claude/Gemini 运行时状态 OpenClaw 路由到。
- **Child thread/topic** - 仅由 `--thread ...` 创建的可选额外消息传递表面。
- **运行时工作区** - harness 运行所在的文件系统位置（`cwd`、仓库检出目录、后端工作区）。与聊天界面相互独立。

### <a id="current-conversation-binds"></a> 当前对话绑定

`/acp spawn <harness> --bind here` 将当前对话固定到已 spawn 的 ACP 会话——没有子线程，使用相同的聊天界面。OpenClaw 继续负责传输、认证、安全和投递。该对话中的后续消息会路由到同一个会话；`/new` 和 `/reset` 会在原地重置会话；`/acp close` 会移除绑定。

示例：

```text
/codex bind                                              # native Codex bind, route future messages here
/codex model gpt-5.4                                     # tune the bound native Codex thread
/codex stop                                              # control the active native Codex turn
/acp spawn codex --bind here                             # explicit ACP fallback for Codex
/acp spawn codex --thread auto                           # may create a child thread/topic and bind there
/acp spawn codex --bind here --cwd /workspace/repo       # same chat binding, Codex runs in /workspace/repo
```

<AccordionGroup>
  <Accordion id="binding-rules-and-exclusivity" title="约束规则和排他性">
    - `--bind here` 和 `--thread ...` 互斥。
    - `--bind here` 仅适用于声明支持当前对话绑定的频道；否则 OpenClaw 会返回清晰的不支持消息。绑定会在网关重启后保持。
    - 在 Discord 上，`spawnSessions` 控制 `--thread auto|here` 的子线程创建 - 不控制 `--bind here`。
    - 如果您在没有 `--cwd` 的情况下生成到不同的 ACP 代理，则 OpenClaw 默认继承 **目标代理的** 工作区。缺少继承路径（`ENOENT`/`ENOTDIR`）回退到后端默认值；其他访问错误 （e.g. `EACCES`） 表现为生成错误。
    - 网关管理命令在绑定会话中保留在本地 - 即使正常的后续文本路由到绑定的 ACP 会话，`/acp ...` 命令也由 OpenClaw 处理；每当为该表面启用命令处理时，`/status` 和 `/session` 也会保持本地状态。

  </Accordion>
  <Accordion id="thread-bound-sessions" title="线程绑定会话">
    当频道适配器启用了线程绑定时：

    - OpenClaw 会将线程绑定到目标 ACP 会话。
    - 该线程中的后续消息会路由到已绑定的 ACP 会话。
    - ACP 输出会回送到同一个线程。
    - `/session unbind`、关闭、存档、空闲超时或 max-age 到期会删除绑定。 `/session unbind` 仅分离当前会话并让 ACP 会话保持运行。
    - `/acp close`、`/acp cancel`、`/acp status`、`/status` 和 `/session` 是网关命令，不是对 ACP harness的提示。

    线程绑定 ACP 所需的功能开关：

    - `acp.enabled=true`
    - `acp.dispatch.enabled` 默认开启（设置为 `false` 可暂停自动 ACP 线程分发；显式 `sessions_spawn({ runtime: "acp" })` 调用仍然可用）。
    - 已启用频道适配器线程会话 spawn（默认：`true`）：
      - Discord/Telegram: `session.threadBindings.spawnSessions=true`

    线程绑定支持是特定于适配器的。如果活动通道适配器不支持线程绑定，则 OpenClaw 返回明确的 unsupported/unavailable 消息。

  </Accordion>
  <Accordion id="thread-supporting-channels" title="线程支持通道">
    - 公开 session/thread 绑定功能的任何通道适配器。
    - 当前内置支持：**Discord** threads/channels， **Telegram**主题（论坛主题groups/supergroups和DM主题）。
    - 插件频道可以通过同一绑定接口添加支持。

  </Accordion>
</AccordionGroup>

## <a id="persistent-channel-bindings"></a> 持久频道绑定

对于非临时工作流，在顶层 `bindings[]` 条目中配置持久的 ACP 绑定。

### <a id="binding-model"></a> 绑定模型

<ParamField path="bindings[].type" type='"acp"'>
  标记一个持久 ACP 对话绑定。
</ParamField>
<ParamField path="bindings[].match" type="object">
  标识目标对话。按频道的形状如下：

- **Discord channel/thread:** `match.channel="discord"` + `match.peer.id="<channelOrThreadId>"`
- **Slack channel/DM：** `match.channel="slack"` + `match.peer.id="<channelId|channel:<channelId>|#<channelId>|userId|user:<userId>|slack:<userId>|<@userId>>"`。优先选择稳定的Slack ids；通道绑定还匹配该通道线程内的回复。
- **Telegram 论坛主题:** `match.channel="telegram"` + `match.peer.id="<chatId>:topic:<topicId>"`
- **WhatsApp DM/group：** `match.channel="whatsapp"` + `match.peer.id="<E.164|group JID>"`。使用 E.164 号码（例如 `+15555550123`）进行直接聊天，使用 WhatsApp 群组 JID（例如 `120363424282127706@g.us`）进行群组。
- **iMessage DM/group：** `match.channel="imessage"` + `match.peer.id="<handle|chat_id:*|chat_guid:*|chat_identifier:*>"`。优选 `chat_id:*` 以获得稳定的基团结合。

</ParamField>
<ParamField path="bindings[].agentId" type="string">
  所属的 OpenClaw agent id。
</ParamField>
<ParamField path="bindings[].acp.mode" type='"persistent" | "oneshot"'>
  可选的 ACP 覆盖。
</ParamField>
<ParamField path="bindings[].acp.label" type="string">
  面向操作者的可选标签。
</ParamField>
<ParamField path="bindings[].acp.cwd" type="string">
  可选的运行时工作目录。
</ParamField>
<ParamField path="bindings[].acp.backend" type="string">
  可选的后端覆盖。
</ParamField>

### <a id="runtime-defaults-per-agent"></a> 每个 agent 的运行时默认值

使用 `agents.entries.*.runtime` 为每个 agent 一次性定义 ACP 默认值：

- `agents.entries.*.runtime.type="acp"`
- `agents.entries.*.runtime.acp.agent`（harness ID、e.g. `codex` 或 `claude`）
- `agents.entries.*.runtime.acp.backend`
- `agents.entries.*.runtime.acp.mode`
- `agents.entries.*.runtime.acp.cwd`

**ACP 绑定会话的覆盖优先级：**

1. `bindings[].acp.*`
2. `agents.entries.*.runtime.acp.*`
3. 全局 ACP 默认值 （e.g. `acp.backend`）

配置的绑定还转发所属代理的显式模型和思维策略。对于具有 `runtime.type: "acp"` 的代理，`agents.entries.*.model.primary` 选择 ACP harness模型，即使其值也看起来像本机 `provider/model` 参考。 OpenClaw-side 调用（例如 `/btw` 和内部实用程序）使用 `agents.defaults.model` 作为其本机默认值。显式本机会话覆盖和专用实用程序或子代理模型设置仍然适用。所选的本地提供商需要有自己的凭据； ACP harness登录不会验证 OpenClaw 的本机调用。

对于现有配置，即使 ACP 主要是有效的本机引用，这也可能会更改本机提供程序。 `openclaw doctor` 描述了每个 ACP 代理的harness模型并解析了本机默认值，而无需重写配置。 `agents.defaults.model`中选择本机默认值；本机会话、实用程序和子代理覆盖仍然可用于其各自的操作。

对于支持模型回退的本机调用，省略代理 `model.fallbacks` 继承 `agents.defaults.model.fallbacks`。显式本机后备列表会替换该列表，并且 `fallbacks: []` 会禁用它。这些条目必须是本机 OpenClaw 模型引用，而不是仅限harness的 ID。 `/btw` 使用其选择的本机模型，没有模型后备链。

Thinking 使用代理的 `thinkingDefault`，然后是每个模型的 `agents.defaults.models["provider/model"].params.thinking`，然后是 `agents.defaults.thinkingDefault`。如果没有配置策略，外部harness将保留其自己的默认值。

更改配置的模型或思考值会在下一轮之前更新现有会话，而不会替换对话。每个选项仅在harness接受后才会保存；被拒绝的选项会返回错误并保留该选项之前的选择。模型和思维的改变是独立的，不是原子批次的。删除默认值会使用任何剩余的配置策略；如果没有剩余，OpenClaw 保留会话的最后选择。省略不是后端重置。要明确改变思维，请使用 `/acp set thinking <level>` 以及harness支持的级别。对于 Codex ACP，`off` 仅省略新会话的启动覆盖。不支持将现有会话切换到 `off`，并且会返回错误而不清除其当前的推理工作或对话。

### <a id="example"></a> 示例

```json5
{
  agents: {
    ownership: "explicit",
    entries: {
      codex: {
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
      claude: {
        runtime: {
          type: "acp",
          acp: { agent: "claude", backend: "acpx", mode: "persistent" },
        },
      },
    },
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "222222222222222222" },
      },
      acp: { label: "codex-main" },
    },
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "telegram",
        accountId: "default",
        peer: { kind: "group", id: "-1001234567890:topic:42" },
      },
      acp: { cwd: "/workspace/repo-b" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "discord", accountId: "default" },
    },
    {
      type: "route",
      agentId: "main",
      match: { channel: "telegram", accountId: "default" },
    },
  ],
  channels: {
    discord: {
      guilds: {
        "111111111111111111": {
          channels: {
            "222222222222222222": { requireMention: false },
          },
        },
      },
    },
    telegram: {
      groups: {
        "-1001234567890": {
          topics: { "42": { requireMention: false } },
        },
      },
    },
  },
}
```

### <a id="behavior"></a> 行为

- 如果需要，在通道特定准入之后和使用之前，OpenClaw 会创建配置的 ACP 会话。
- 该频道、主题或聊天中的消息会路由到配置的 ACP 会话。
- 已配置的 ACP 绑定拥有其会话路由。频道广播扇出不会替代匹配绑定所对应的配置 ACP 会话。
- 在已绑定的对话中，`/new` 和 `/reset` 会就地重置同一个 ACP 会话 key。
- 由线程绑定生成创建的运行时绑定仍然适用于存在的情况。
- 对于未显式指定 `cwd` 的跨 agent ACP spawn，OpenClaw 会从 agent 配置继承目标 agent 工作区。
- 缺失的继承工作区路径会回退到后端默认 cwd；真实的访问失败会作为 spawn 错误暴露出来。
