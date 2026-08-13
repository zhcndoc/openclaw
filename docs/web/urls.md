---
summary: "控制 UI URL 路由、稳定的会话链接语法和连接交接参数"
read_when:
  - 你需要为控制 UI 会话添加书签或分享
  - 你正在添加或更改控制 UI 路由
  - 你需要终端、批准、入门引导或远程 Gateway URL
title: "控制 UI URL"
---

控制 UI 为页面和会话链接使用可读路径。已配置的
`gateway.controlUi.basePath` 会作为下面每个路径的前缀。例如，当基础路径为 `/openclaw` 时，`/chat/main`
会变成 `/openclaw/chat/main`。

## 会话和仪表盘 URL

聊天和仪表盘视图是并行路由命名空间：

```text
/chat/main/deploy-monitor-6db92d48
/dashboard/main/deploy-monitor-6db92d48
/chat/main/telegram/12345
/chat/main/cron/nightly/run/8821
/chat/main
```

路径语法如下：

```text
/<namespace>/<agentId>
/<namespace>/<agentId>/<sessionRef>
/<namespace>/<agentId>/<restSegment>/<restSegment>...
```

`<namespace>` 要么是 `/chat`，要么是 `/dashboard`。第一种形式会打开该
agent 的主会话。其他形式通过两种方式之一编码一个不可变会话键。

当会话键的剩余部分（即 `agent:<agentId>:` 之后的全部内容）以 UUID 结尾时，适用短 ID 形式。`<sessionRef>` 是一个可选的显示名 slug 加一个短 ID，例如 `deploy-monitor-6db92d48`。短 ID 是权威部分：它是键尾随 UUID 起始处至少八个小写十六进制字符，并省略了 UUID 中的连字符。接受更长的前缀，最长可达全部 32 个十六进制字符。行的轮转 `sessionId` 不属于 URL 身份的一部分。

其他所有键都使用字面键形式。`agent:<agentId>:` 之后每个以冒号分隔的段都会变成一个经过 URL 编码的路径段。例如，
`agent:main:telegram:12345` 会变成 `/chat/main/telegram/12345`，而 `agent:main:cron:nightly:run:8821` 会变成
`/chat/main/cron/nightly/run/8821`。

完全等于 `.` 或 `..` 的字面剩余段会使用 `~dot` 和 `~dotdot`，这样浏览器就不会把它们折叠为相对路径段。以 `~` 开头的字面段会把这个前导字符加倍，以保持编码可逆。当一个原本字面的一段剩余内容可能被误认为短 ID 时，构建器会在其前面插入 `~key`，例如
`agent:main:release-deadbeef` 会变成
`/chat/main/~key/release-deadbeef`。这个标记会强制按字面解释，并且只会在未转义形式存在歧义时出现。

保留的单段字面剩余名称是 `main`、`global`、`boot` 和 `sessions`。配置的 `session.mainKey` 会在运行时加入这个集合。当 agent id 后只有一个段时，如果它是保留项或不包含有效短 ID，则它是字面值；否则它是短引用。agent id 后有两个或更多段时，始终按字面值处理。

只有配置的 `session.mainKey` 才会折叠为仅包含 agent 的主会话路径。若 `session.mainKey: "workspace"`，则 `agent:research:workspace` 会变成 `/chat/research`，而不同的键 `agent:research:main` 仍保持为字面路径 `/chat/research/main`。

### 稳定性约定

以下部分是稳定的 URL 约定：

- `/chat` 和 `/dashboard` 这两个命名空间词。
- 短 ID URL 中的键 UUID 短 ID。
- 上述的参数个数以及短／字面解析规则。

在短 ID 形式中，agent 段只是装饰性的，slug 几乎也是装饰性的。二者都不能单独标识会话，并且都可能在没有通知的情况下更改。唯一的例外是平局：如果短 ID 匹配多个会话，并且其中恰好有一个仍在链接中带有 slug，那么就使用该会话，因此生成的链接即使在两个 ID 碰巧共享前缀时也能继续工作。若 slug 一个都不匹配或匹配了多个平局中的会话，则会忽略 slug，并显示消歧视图。解析完成后，Control UI 会将地址栏替换为当前 agent id 和当前显示名 slug，而不会添加浏览器历史记录项。

在字面键形式中，agent 段是权威的，因为它是重建会话键的一部分。其余字面段也同样是权威的。slug（如果存在）始终只是装饰性的；字面键形式不会自动生成 slug。

作为尽力而为的便利，未转义的单段字面值如果无法解析为精确会话键，也会拿去和显示名 slug 进行比对。若恰好一个 slug 完全匹配，则地址栏会被其完整的
`/<namespace>/<agentId>/<slug>-<shortId>` 引用替换。如果多个会话共享同一个 slug，UI 会显示与短 ID 平局时相同的消歧视图，而不是猜测。精确的短 ID 和字面键引用总是优先于 slug 匹配。

如果一个短 ID 匹配多个会话，且 slug 无法解决歧义，UI 不会进行猜测。它会显示一个简短的消歧视图，其中包含匹配的显示名称、agent 以及更长的 ID 前缀。使用更长的前缀来使 URL 唯一。当前 Gateways 最多返回十个最近的候选项；达到这一上限时，视图会将结果视为不完整，而不是进行猜测。对于早于短 ID 解析支持的旧版 Gateway，UI 会回退到之前的有界列表搜索，最多扫描五页结果。当该回退方式无法证明唯一性时，它同样会报告搜索结果不完整，而不是进行猜测。

如需在终端中继续使用其中一个链接或附加编码 harness，请参阅
[会话同步和附加](/concepts/session-attachment)。

规范链接不使用 `?session=` 或 `?face=`。诸如
`/chat?session=<sessionKey>` 这样的已发布链接，仅在应用边界处作为迁移辅助方式接受，并会立即重写为规范路径，且不会添加浏览器历史记录。已发布的 `?face=dashboard` 配套参数会在该重写过程中选择 `/dashboard` 命名空间。加载器和页面代码从不读取查询形式的身份信息，新链接不得输出该形式。Sessions 列表保留其自身的 `?session=` 参数，因为该参数会展开一行；它不是会话深层链接。一次性的编辑器值 `?draft=` 仍在聊天和仪表盘会话路径上受支持。

## 路由表

此表列出了每个 Control UI 应用路由。破折号表示该路由没有特定于路由的 URL 参数。

| 页面                | 规范路径                    | 别名                      | 参数或动态形式                                               |
| ------------------- | --------------------------- | ------------------------- | -------------------------------------------------------------- |
| 聊天                | `/chat`                     | -                         | 上述基于键的会话形式；`?draft=<text>`                         |
| 仪表盘              | `/dashboard`                | -                         | 上述基于键的会话形式；`?draft=<text>`                         |
| 仪表盘列表          | `/dashboards`               | -                         | -                                                              |
| 询问 OpenClaw       | `/custodian`                | -                         | `?intent=new-agent`、`?onboarding=1`                           |
| 新会话              | `/new`                      | -                         | `?agent=<agentId>`、`?catalog=<catalogId>`                     |
| 活动                | `/activity`                 | -                         | `?view=run&run=<run-id>`、`?view=run&execution=<execution-id>` |
| 应用                | `/apps`                     | -                         | -                                                              |
| Agents              | `/settings/agents`          | `/agents`                 | `/settings/agents/<agentId>[/<panel>]`                         |
| Channels            | `/settings/channels`        | `/channels`               | 下面的共享设置参数                                           |
| 连接                | `/settings/connection`      | -                         | 下面的共享设置参数                                           |
| 旧版常规设置        | `/settings/general`         | `/config`                 | 重定向到外观 → 语言                                           |
| 个人资料            | `/settings/profile`         | `/profile`                | 下面的共享设置参数                                           |
| 通信                | `/settings/communications`  | `/communications`         | 下面的共享设置参数                                           |
| 外观                | `/settings/appearance`      | `/appearance`             | 下面的共享设置参数                                           |
| 通知                | `/settings/notifications`   | -                         | 下面的共享设置参数                                           |
| 安全                | `/settings/security`        | -                         | 下面的共享设置参数                                           |
| 密钥                | `/settings/secrets`         | -                         | 下面的共享设置参数                                           |
| 高级                | `/settings/advanced`        | -                         | 下面的共享设置参数                                           |
| 批准                | `/settings/approvals`       | -                         | 下面的共享设置参数                                           |
| 自动化设置          | `/settings/automation`      | `/automation`             | 下面的共享设置参数                                           |
| MCP                 | `/settings/mcp`             | `/mcp`                    | 下面的共享设置参数                                           |
| 记忆                | `/settings/memory`          | -                         | `/settings/memory/memories\|dreams\|settings`                  |
| 基础设施            | `/settings/infrastructure`  | `/infrastructure`         | 下面的共享设置参数                                           |
| 实验室              | `/settings/labs`            | -                         | 下面的共享设置参数                                           |
| 关于                | `/settings/about`           | -                         | 下面的共享设置参数                                           |
| AI 和 Agents        | `/settings/ai-agents`       | `/ai-agents`              | 下面的共享设置参数                                           |
| 模型设置            | `/settings/model-setup`     | `/model-setup`            | `?firstRun=1`                                                  |
| 模型提供商          | `/settings/model-providers` | `/model-providers`        | 下面的共享设置参数                                           |
| 导入记忆            | `/memory-import`            | `/settings/memory-import` | -                                                              |
| 工作看板            | `/workboard`                | -                         | `/workboard/<boardId>`                                         |
| 工作树              | `/worktrees`                | `/settings/worktrees`     | -                                                              |
| 会话                | `/sessions`                 | `/settings/sessions`      | `?session=<sessionKey>`、`?status=archived\|all`               |
| 用量                | `/usage`                    | -                         | -                                                              |
| 调试                | `/debug`                    | -                         | -                                                              |
| 日志                | `/logs`                     | -                         | -                                                              |
| Skill Workshop      | `/skills/workshop`          | -                         | -                                                              |
| Skills              | `/skills`                   | -                         | -                                                              |
| 插件                | `/settings/plugins`         | -                         | `/settings/plugins/discover`                                   |
| 自动化              | `/cron`                     | -                         | -                                                              |
| 任务                | `/tasks`                    | -                         | -                                                              |
| 设备                | `/settings/devices`         | `/nodes`                  | 下面的共享设置参数                                           |
| 插件标签页宿主      | `/plugin`                   | -                         | `?plugin=<pluginId>&id=<tabId>`                                |

使用基于 schema 的深链接的设置路由接受 `?section=<section>`、
`?advanced=1` 和 `#<setting-id>`。这些值用于选择页面内的内容；
它们不会改变路由标识。

已弃用的常规路由及其 `/config` 别名会被一次性替换为
`/settings/appearance?section=__appearance__#settings-language`。历史上的
`#settings-general-model` 目标则会跳转到“模型”行为部分。

记忆标签页使用表中的路径，而不是 `?tab=`。带有
`?tab=memories|dreams|settings`、`?tab=dreaming`、`?tab=search` 或
`?section=memory` 的旧版记忆链接会被一次性替换为相应路径，同时保留任何设置锚点。

插件目录标签页也使用路径，而不是 `?tab=`。带有
`?tab=discover|installed` 的旧版链接会被一次性替换为相应路径，同时保留其他查询参数和片段。

代理选择及其 `overview|files|tools|skills|channels|cron|memory`
面板使用路径。带有 `?agent=<agentId>` 的旧版链接会被一次性替换为代理路径，同时保留其他查询参数和片段。

## 特殊文档和启动模式

这些由 Gateway 提供的文档位于应用路由表之外：

- `/?onboarding=1` 打开首次运行引导演示。
- `/terminal` 打开面向用户的全屏终端。使用基础路径时，请使用
  `<basePath>/terminal`。
- `/?view=terminal` 在移动应用使用的 WebView/embed 形式中打开相同的仅终端文档。无论采用哪种形式，终端可用性仍需要 `gateway.terminal.enabled` 和 `operator.admin`。
- `/approve/<approvalId>` 打开独立的审批文档。使用基础路径时，请使用 `<basePath>/approve/<approvalId>`。该 id 用于标识审批，但永远不会为其授权；正常的 Gateway 身份验证仍然适用。

对于所有 HTTP 方法，审批命名空间都会在插件 HTTP 路由之前被保留。当禁用 Control UI 提供服务时，它会返回 `404`，而不是继续匹配到插件路由。

## 远程 Gateway 交接

Vite 开发界面可以连接到不同的 Gateway：

```text
http://localhost:5173/?gatewayUrl=ws%3A%2F%2F<gateway-host>%3A18789
http://localhost:5173/?gatewayUrl=wss%3A%2F%2F<gateway-host>%3A18789#token=<gateway-token>
```

请对完整的 `ws://` 或 `wss://` 值进行 URL 编码。`gatewayUrl` 仅在顶层窗口中接受，会在加载后存储，并从地址栏中移除。优先使用 `#token=`，因为片段不会进入 HTTP 请求日志或 Referer 头。旧的 `?token=` 交接仍然作为仅用于引导的凭据回退方式，并会立即被剥离。密码仅保留在内存中。

当 `gatewayUrl` 选择另一个 Gateway 时，UI 不会回退到本地配置或环境凭据。请显式提供远程 Gateway 的 token 或密码，并在 TLS 后面使用 `wss://`。

## 相关内容

- [控制界面](/web/control-ui)
- [仪表盘](/web/dashboard)
- [会话仪表盘](/web/dashboards)。
