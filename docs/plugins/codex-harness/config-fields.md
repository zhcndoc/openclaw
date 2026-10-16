---
summary: "Codex 插件的顶级和 appServer 配置字段"
read_when:
  - "您需要支持的 Codex 插件配置字段"
  - "您正在设置一个 appServer 字段并希望使用默认值"
  - "您正在启用 Codex 托管网络"
title: "Codex 插件配置字段"
sidebarTitle: "配置字段"
---

支持的 `plugins.entries.codex.config` 字段及其默认值。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="config-fields"></a> 配置字段

支持的顶层 Codex 插件字段：

| 字段                      | 默认值        | 含义                                                                                  |
| -------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `codexDynamicToolsLoading` | `"searchable"` | 使用 `"direct"` 可将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。 |
| `codexDynamicToolsExclude` | `[]`           | 从 Codex 应用程序服务器轮次中省略的其他 OpenClaw 动态工具名称。              |
| `codexPlugins`             | 已禁用       | 本机 Codex plugin/app 支持迁移的源安装的精选插件。           |
| `sessionCatalog`           | 已启用        | 用于在此 Gateway 和符合条件的配对节点上发现原生 Codex 会话的侧边栏功能。   |
| `supervision`              | 已禁用       | 面向代理的原生会话转录与写入控制策略。                         |

支持的 `appServer` 字段：

| 字段                            | 默认值                                                | 含义                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                      | `"stdio"`                                              | `"stdio"` 生成 Codex；显式 `"unix"` 连接到本地控制套接字； `"websocket"` 连接到 `url`。                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `homeScope`                      | `"agent"`                                              | `"agent"` 根据 OpenClaw 代理隔离普通harness状态。 `"user"` 是一个显式选择加入，它共享本机 `$CODEX_HOME` 或 `~/.codex`、使用本机身份验证并启用仅限所有者的线程管理。用户范围支持本地 stdio 或 Unix 传输。对于单独的监控连接，未设置的值解析为 `"user"`（对于 stdio 或 Unix）和 `"agent"`（对于 WebSocket）。                                                                                                                                                    |
| `command`                        | 托管 Codex 二进制文件                                   | stdio 传输使用的可执行文件。留空以使用受管理的二进制文件；仅在需要显式覆盖时设置。                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `args`                           | `["app-server", "--listen", "stdio://"]`               | stdio 传输使用的参数。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `url`                            | 未设置                                                  | WebSocket 应用服务器 URL 或 `unix://` URL。空的显式 Unix 路径选择标准用户主控制套接字。                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `authToken`                      | 未设置                                                  | WebSocket 传输的不记名令牌。接受文字字符串或 SecretInput，例如 `${CODEX_APP_SERVER_TOKEN}`。                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `headers`                        | `{}`                                                   | 额外的 WebSocket 标头。标头值接受文字字符串或 SecretInput 值，例如 `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`。                                                                                                                                                                                                                                                                                                                                                                              |
| `clearEnv`                       | `[]`                                                   | 在 OpenClaw 构建继承的环境后，从生成的 stdio app-server 进程中移除的额外环境变量名称。对于本地启动，OpenClaw 会保留所选的 `CODEX_HOME` 和继承的 `HOME`。                                                                                                                                                                                                                                                                                                                          |
| `codeModeOnly`                   | `false`                                                | 选择加入 Codex 的仅代码模式工具面。普通 OpenClaw 动态工具仍可通过嵌套的 `tools.*` 调用使用；`openclaw_direct` 工具仍会直接对模型可见。                                                                                                                                                                                                                                                                                                                                                            |
| `remoteWorkspaceRoot`            | 未设置                                                  | 远程 Codex 应用程序服务器工作区根。 OpenClaw 将本地 cwd 映射到此根目录，并通过输出上限、无 shell `command/exec` 阅读器传输权威远程附件。转义工作区、符号链接、超大文件和无限制附件批次的路径将被拒绝；上传保留配置的通道标识和应用程序服务器请求超时。                                                                                                                                                       |
| `requestTimeoutMs`               | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `mode`                           | `"yolo"`，除非本地 Codex 要求不允许 YOLO | YOLO 或受监管方审核执行的预设。本地 stdio 要求如果不包含 `danger-full-access`、`never` 审批或 `user` 审核者，则隐式默认值为 guardian。                                                                                                                                                                                                                                                                                                                                                          |
| `approvalPolicy`                 | `"never"` 或允许的 guardian 审批策略       | 发送到线程 start/resume/turn. 的本机 Codex 批准策略在允许时默认首选 `"on-request"`。                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `sandbox`                        | `"danger-full-access"` 或允许的 guardian 沙箱  | 发送到线程 start/resume. 的本机 Codex 沙箱模式在允许的情况下监护人默认首选 `"workspace-write"`，否则为 `"read-only"`。当 OpenClaw 沙箱处于活动状态时，`danger-full-access` 会转而使用 Codex `workspace-write` 以及从 OpenClaw 沙箱出口设置派生的网络访问权限。                                                                                                                                                                                                                                    |
| `approvalsReviewer`              | `"user"` 或允许的 guardian 审核者               | 在允许时，使用 `"auto_review"` 让 Codex 审核原生审批提示，否则使用 `guardian_subagent` 或 `user`。`guardian_subagent` 仍是旧版别名。                                                                                                                                                                                                                                                                                                                                                                             |
| `serviceTier`                    | 未设置                                                  | 当未提供共享快速模式控件时，本机应用程序服务器首选项。非空字符串通过；记录的值为 `"priority"` 和 `"flex"`。旧版 `"fast"` 标准化为 `"priority"`，并且 `null` 清除覆盖。本机 `"ultrafast"` 从 `priority` 开始，需要显式共享超快选择。共享快速发送 `priority`，关闭发送 `null`，自动根据呼叫决定。这不会配置直接嵌入的 OpenAI 请求。                                                                   |
| `enableUltrafast`                | `true`                                                 | 仅允许 `ultrafast` 用于显式共享 `"ultrafast"` 选择和公布的本机模型。未设置或 `true` 允许该选择； `false` 在 Codex 选择器中隐藏 Ultrafast，发送普通 Fast （`priority`） 进行显式选择，并跳过 Ultrafast 目录检查。快速、自动和未指定的选择永远不会自动升级。不受支持的模型和不可用的目录保留基线层。                                                                                                          |
| `cyberFailover`                  | 自动黎明蓝升级                     | 控制 OpenAI 网络策略拒绝后的自动重试。 `mode`（默认`"auto"`，或`"off"`）启用它，`model`（默认`"gpt-daybreak-blue-latest"`）是升级目标，`cooloffMs`（默认`600000`）限制尝试后的会话窗口。升级重试一次被拒绝的回合，永远不会更改存储的模型选择，并将未经授权的目标视为不可用，而不是重试。请参见 [ 运行时行为](/plugins/codex-harness/runtime-behavior#automatic-daybreak-escalation)。 |
| `networkProxy`                   | 已禁用                                               | 选择应用程序服务器命令的 Codex 权限配置文件网络。 OpenClaw 定义选定的 `permissions.<profile>.network` 配置，并使用 `default_permissions` 选择它，而不是发送 `sandbox`。                                                                                                                                                                                                                                                                                                                            |
| `experimental.sandboxExecServer` | `false`                                                | 预览选择加入，将 OpenClaw 沙箱支持的 Codex 环境注册到受支持的 Codex 应用程序服务器，以便本机 Codex 执行可以在活动的 OpenClaw 沙箱内运行。                                                                                                                                                                                                                                                                                                                                                           |

`appServer.networkProxy` 是显式配置，因为它会改变 Codex 沙箱契约。启用后，OpenClaw 还会在 Codex 线程配置中设置 `features.network_proxy.enabled` 和 `default_permissions`，以便生成的权限配置文件可以启动 Codex 托管网络。默认情况下，OpenClaw 会根据配置文件主体生成一个抗冲突的 `openclaw-network-<fingerprint>` 配置文件名称；仅在需要稳定的本地名称时使用 `profileName`。

```json5
{
  plugins: {
    entries: {
      codex: {
        config: {
          appServer: {
            approvalPolicy: "never",
            sandbox: "workspace-write",
            networkProxy: {
              enabled: true,
              domains: {
                "api.openai.com": "allow",
                "blocked.example.com": "deny",
              },
              unixSockets: {
                "/tmp/proxy.sock": "allow",
                "/tmp/blocked.sock": "none",
              },
              allowUpstreamProxy: true,
              proxyUrl: "http://127.0.0.1:3128",
            },
          },
        },
      },
    },
  },
}
```

与`enabled: true`、`domains`使用Codex的本机主机匹配。除非配置的批准策略允许显式例外，否则有效本机允许列表中不存在的主机将被拒绝。如上所述设置 `approvalPolicy: "never"`，以防止基于批准的异常。本机系统要求可以贡献允许的域或选择托管白名单，因此此映射不会替换系统的网络策略。有效政策中的明确拒绝优先于重叠允许，不能获得批准。

对子域使用 `*.example.com`，对顶级域和子域使用 `**.example.com`。这些限制适用于通过 Codex 沙箱运行的命令。它们不限制网关流量、模型提供者请求或不相关的 MCP 进程。

对于 `networkProxy.enabled: true`，无效配置会失败并拒绝字段路径，且不会记录配置值。插件更新后，使用空白可选 `networkProxy.profileName` 或 `remoteWorkspaceRoot` 值保存的配置需要显式 `openclaw doctor --fix` 才能运行 Codex。 Doctor 会删除这些空白值，同时保留域策略。在重试之前手动修复其他无效字段。有效的配置无需修复。

如果正常的应用程序服务器运行时为 `danger-full-access`，则启用 `networkProxy` 会对生成的权限配置文件使用工作区样式的文件系统访问：Codex 托管网络实施是沙盒网络，因此完全访问配置文件不会保护出站流量。域条目使用 `allow` 或 `deny`。 Unix套接字条目使用`allow`或`none`； OpenClaw 将 `none` 转换为 Codex 的本机 `deny` 权限。
