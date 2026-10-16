---
summary: "Feishu 多账户设置、消息限制、流媒体、工作区工具、ACP 会话和多代理路由"
read_when:
  - "从一个网关运行多个 Feishu 机器人"
  - "调整流卡回复或消息分块"
  - "启用 Feishu 文档、wiki、驱动器或 Bitable 工具"
  - "将 Feishu DM 或组路由到不同的座席"
title: "Feishu高级配置"
sidebarTitle: "高级配置"
---

原始高级配置标题下的所有内容：多个帐户、传递限制、流卡、配额标志、组会话范围、工作区工具、ACP 会话和多代理路由。

## <a id="advanced-configuration"></a> 高级配置

### <a id="multiple-accounts"></a> 多个账户

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` 控制出站 API 未指定 `accountId` 时使用哪个帐户。账户条目继承顶层设置；每个帐户都可以覆盖大多数顶级密钥。 `accounts.<id>.tts` 使用与 `tts` 相同的形状，并在全局 TTS 配置上进行深度合并，因此多机器人 Feishu 设置可以在全局范围内保留共享的提供商凭据，同时仅覆盖每个帐户的语音、模型、角色或自动模式。

### <a id="message-limits"></a> 消息限制

- `textChunkLimit` - 出站文本分块大小（默认：`4000` 字符）
- `streaming.chunkMode` - `"length"`（默认）在限制处拆分；`"newline"` 优先按换行边界拆分
- `mediaMaxMb` - 媒体 upload/download 限制（默认值：`30` MB）

普通 Markdown 卡片和富文本帖子也被拆分，以适应 Feishu 的 30 KB 序列化消息限制。标题、注释、提及、JSON 转义和 UTF-8 文本均计入该限制，因此块可能比 `textChunkLimit` 短。长媒体标题在附件之前作为 text/card 块发送。

### <a id="streaming"></a> 流式输出

Feishu/Lark 支持通过交互式卡进行流式回复（卡套件流 API）。启用后，机器人会在生成文本时实时更新卡片。

如果 Card Kit 在接受流式预览后拒绝完整的答案，OpenClaw 将完整的答案作为单独的静态回复发送，而不是仅保留预览。

```json5
{
  channels: {
    feishu: {
      streaming: {
        mode: "partial", // streaming card output (default: "partial")
        block: { enabled: true }, // opt into completed-block streaming
      },
    },
  },
}
```

设置 `streaming.mode: "off"` 发送完成的回复而不进行流式更新；长回复仍然在上述消息限制下分开。 `renderMode: "raw"`（纯文本而不是卡）也会禁用流卡。 `streaming.block.enabled` 默认关闭；仅当您希望在最终回复之前刷新已完成的辅助块时才启用它。旧版布尔值 `streaming` 和平面 `blockStreaming` / `blockStreamingCoalesce` / `chunkMode` 键通过 `openclaw doctor --fix` 迁移到此嵌套形状。

带有控件的回复使用本机卡作为命令按钮和 HTTP（S） 链接，包括流关闭时。卡片上带有回复文字；附件仍然是单独的消息。超出 Feishu 大小限制的不受支持的控件和卡会将其完整标签保留在可读的后备中。当稍后的回复流时，该回退仍然是单独的消息。最终控件回复将取代活动的流媒体预览，而无需再次发送预览文本；完成答案后的错误控制保持独立。如果 Feishu 无法删除或清除替换的预览，则传递会报告失败并保留原始消息回执。

### <a id="quota-optimization"></a> 配额优化

使用两个可选标志减少 Feishu/Lark API 调用的数量：

- `typingIndicator`（默认 `true`）：设为 `false` 可跳过输入中反应调用
- `resolveSenderNames`（默认 `true`）：设为 `false` 可跳过发送者资料查询

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### <a id="group-session-scope-and-topic-threads"></a> 群组会话范围和话题线程

`channels.feishu.groupSessionScope`（顶层、按账户或按群组）控制群消息如何映射到代理会话：

| 值                  | 会话                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `"group"`（默认）    | 每个群聊一个会话                                       |
| `"group_sender"`       | 每个（群组 + 发送者）一个会话                                 |
| `"group_topic"`        | 每个话题线程一个会话；回退到群组会话    |
| `"group_topic_sender"` | 每个（话题 + 发送者）一个会话；回退到（群组 + 发送者）会话 |

对于主题范围，本机 Feishu/Lark 主题组使用事件 `thread_id` （`omt_*`） 作为主题会话密钥。如果原生主题起始事件省略了 `thread_id`，则 OpenClaw 在路由回合之前会从 Feishu 中对其进行水合。 OpenClaw 变成线程的普通组回复继续使用回复根消息 ID （`om_*`），因此第一轮和后续轮保持在同一会话中。

设置 `replyInThread: "enabled"`（顶级或每组）以使机器人回复创建或继续 Feishu 主题线程，而不是内联回复。 `topicSessionMode` 是 `groupSessionScope` 的已弃用前身；更喜欢 `groupSessionScope`。

### <a id="feishu-workspace-tools"></a> Feishu 工作区工具

该插件提供了用于 Feishu 文档、聊天、知识库、云存储、权限和 Bitable 的代理工具，以及匹配技能（`feishu-doc`、`feishu-drive`、`feishu-perm`、`feishu-wiki`）。工具系列由 `channels.feishu.tools` 控制：

| 键             | 工具                                         | 默认值             |
| --------------- | --------------------------------------------- | ------------------- |
| `tools.doc`     | `feishu_doc` 文档操作              | `true`              |
| `tools.chat`    | `feishu_chat` 聊天信息 + 成员查询      | `true`              |
| `tools.wiki`    | `feishu_wiki` 知识库（需要 `doc`） | `true`              |
| `tools.drive`   | `feishu_drive` 云存储                  | `true`              |
| `tools.perm`    | `feishu_perm` 权限管理           | `false`（敏感） |
| `tools.scopes`  | `feishu_app_scopes` 应用权限范围诊断     | `true`              |
| `tools.bitable` | `feishu_bitable_*` Bitable/Base 操作    | `true`              |

按账户设置的开关位于 `accounts.<id>.tools` 下。

应用配置更新后，新代理将使用更新的工具门和帐户选择，而无需重新启动网关。已为正在进行的轮次创建的工具将保留其原始配置。

Bitable 操作使用来自 `/base/` URL 或返回的 `app_token` 的应用程序令牌，而不是 `/wiki/` URL 中的节点令牌。如果应用创建成功但未检索到表元数据，则保留返回的`app_token`和URL。检查现有应用程序而不是创建另一个应用程序；缺少 `table_id` 并不意味着创建失败。

`feishu_doc` 创建仅标题文档。要添加 Markdown，请在单独的 `write` 操作中将返回的 `document_id` 作为 `doc_token` 传递。包含 `content` 的 `create` 请求失败，且未创建空文档。

授予 `drive:drive.metadata:readonly` 在根目录之外直接进行 `feishu_drive info` 查找的权限，除非应用程序已经具有完整的 `drive:drive` 范围。如果没有任一作用域，`info` 仍可通过 `drive:drive:readonly` 进行旧根目录查找。

### <a id="acp-sessions"></a> ACP 会话

Feishu/Lark 支持 ACP DM 和群组线程消息。 Feishu/Lark ACP 是文本命令驱动的 - 没有本机斜杠命令菜单，因此直接在对话中使用 `/acp ...` 消息。

#### <a id="persistent-acp-binding"></a> 持久化 ACP 绑定

```json5
{
  agents: {
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
    },
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### <a id="spawn-acp-from-chat"></a> 从聊天中启动 ACP

在 Feishu/Lark DM 或线程中：

```text
/acp spawn codex --thread here
```

`--thread here` 适用于 DM 和 Feishu/Lark 线程消息。绑定对话中的后续消息直接路由到该 ACP 会话。

### <a id="multi-agent-routing"></a> 多智能体路由

使用 `bindings` 将 Feishu/Lark DM 或组路由到不同的座席。

```json5
{
  agents: {
    ownership: "explicit",
    defaults: {
      heartbeat: { agentId: "main" },
      systemAgent: { agentId: "main" },
    },
    entries: {
      main: { workspace: "~/.openclaw/workspace" },
      "agent-a": { workspace: "/home/user/agent-a" },
      "agent-b": { workspace: "/home/user/agent-b" },
    },
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
    { agentId: "main", match: { channel: "feishu", accountId: "*" } },
  ],
  talk: { agentId: "main" },
}
```

路由字段：

- `match.channel`: `"feishu"`
- `match.peer.kind`：`"direct"`（DM）或`"group"`（群聊）
- `match.peer.id`：用户 Open ID（`ou_xxx`）或群组 ID（`oc_xxx`）

请参阅 [Get group/user IDs](/channels/feishu/access-control#get-groupuser-ids) 了解查找提示。
