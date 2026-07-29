---
summary: "Codex harness 的配置、认证、发现以及 app-server 参考"
title: "Codex harness 参考"
read_when:
  - 你需要 Codex harness 的每一个配置字段
  - 你正在更改 app-server 传输、认证、发现或超时行为
  - 你正在调试 Codex harness 启动、模型发现或环境隔离
---

此参考文档涵盖官方 `codex` 插件的详细配置。
关于设置和路由决策，请先阅读
[Codex harness](/plugins/codex-harness)。

## 插件配置面

所有 Codex harness 设置都位于 `plugins.entries.codex.config` 下。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

顶级字段：

| 字段                       | 默认值                   | 含义                                                                                                                                         |
| -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | 已启用                  | Codex app-server `model/list` 的模型发现设置。                                                                                               |
| `appServer`                | 托管的 stdio app-server | 传输、命令、认证、审批、沙箱和超时设置。普通 harness 默认使用 agent 作用域状态。                                                             |
| `codexDynamicToolsLoading` | `"searchable"`           | 使用 `"direct"` 可将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。                                                                      |
| `codexDynamicToolsExclude` | `[]`                     | 从 Codex app-server 轮次中排除的额外 OpenClaw 动态工具名称。                                                                                 |
| `codexPlugins`             | 已禁用                   | 原生 Codex 插件/app 支持，包括对已连接账户应用的可选访问。参见 [原生 Codex 插件](/plugins/codex-native-plugins)。                              |
| `computerUse`              | 已禁用                   | Codex Computer Use 配置。参见 [Codex Computer Use](/plugins/codex-computer-use)。                                                          |
| `sessionCatalog`           | 已启用                   | 侧边栏的原生 Codex 会话发现。设置 `enabled: false` 可在不禁用 provider 或 harness 的情况下关闭发现。                                           |
| `supervision`              | 已禁用                   | 面向 agent 的原生会话转录和写入控制策略。参见 [Codex supervision](/plugins/codex-supervision)。                                               |

## 监管

原生会话发现默认会列出来自 Gateway 计算机以及已选择加入的配对节点中的未归档 Codex 会话。仅通过以下方式禁用该目录：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          sessionCatalog: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

`supervision` 单独控制面向代理的工具：

| 字段                 | 默认值                   | 含义                                                                                                                                                                                                                                   |
| --------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`            | `false`                  | 启用面向代理的 Codex 监管工具。这不控制已认证的操作员会话目录。                                                                                                                                |
| `endpoints`          | 内置本地端点             | 为保留的 Codex 监管代理和独立 MCP 工具提供兼容性和高级端点目标。人类目录和分支流会忽略这些目标，并使用从 `appServer` 解析得到的监管 App Server。       |
| `allowRawTranscripts` | `false`                 | 在启用监管的情况下，允许自主代理或独立 MCP 读取完整转录，以及基于转录派生的列表字段。`codex_threads` 的仅元数据读取仍然可用。不会控制已认证的 Control UI 续接。     |
| `allowWriteControls`  | `false`                  | 在启用监管的情况下，允许自主的 `codex_threads` 分叉、重命名、归档和取消归档变更，以及独立 MCP 的发送、引导和中断操作。不会绕过其他绑定、主机、状态或确认检查。 |

端点条目接受以下字段：

| 字段           | 适用于        | 含义                                                          |
| -------------- | ------------- | ------------------------------------------------------------- |
| `id`           | all           | 稳定的端点 id。                                                 |
| `label`        | all           | 可选显示标签。                                                 |
| `transport`    | all           | `"stdio-proxy"` 或 `"websocket"`。                              |
| `command`      | `stdio-proxy` | 可选的 App Server 命令。                                       |
| `args`         | `stdio-proxy` | 可选的命令参数。                                               |
| `cwd`          | `stdio-proxy` | 可选的子进程工作目录。                                         |
| `url`          | `websocket`   | 必需的 WebSocket 或受支持的本地 socket URL。                   |
| `authTokenEnv` | `websocket`   | 可选的环境变量，其值用于认证该端点。                            |

**Codex Sessions** 页面使用插件的监管 App Server，并且只显示未归档会话。若没有显式的 `appServer` 连接设置，该连接会由托管的 user-home stdio 管理。存储的或空闲的本地行可以通过最后一个终端持久化的来源回合，创建一个带有受限用户和助手历史的模型锁定 Chat。其私有绑定会保留快照 fork、规范的 `appServer`-source 分支、历史注入以及该连接上的后续回合。第一次规范启动会使用 fork 返回的配对。之后的恢复会省略 OpenClaw 模型和提供方覆盖，以便 Codex 恢复规范线程中持久化的配对；单独的原生更改可以更新该配对，但外部模型和回退链绝不会替换它。存储的和空闲的行在经过无其他运行器确认后可以归档，除非另一个活跃的 OpenClaw 绑定拥有确切目标或其未归档的已生成后代之一。OpenClaw 遵循 Codex 的后代分页，并在枚举错误、循环或安全限制耗尽时失败关闭。确认仍然涵盖未知的原生客户端以及从状态到归档的竞态。受监管的模型锁定 Chat 在保护原生绑定时无法被删除。活跃来源不能创建分支或被归档，但现有的受监管 Chat 仍然可以打开。每一条配对节点行都保持只读；节点传输目前尚未提供 harness 所需的流式生命周期。

仅设置 `appServer.homeScope: "user"` 会改变受管理的 harness 进程使用哪个 Codex home；它不会发布 fleet 目录。启用监管不会改变 harness 默认值。相反，当没有显式的 `appServer` 连接设置时，单独的监管连接默认使用受管理的 user-home stdio。该连接会遵循显式设置。挂起和已提交的受监管绑定会在每一回合保留该连接；禁用监管或连接/生命周期漂移会失败关闭，而不是回退到 agent-home harness。默认连接与原生 Codex 客户端共享存储会话，而不是共享其进程本地活动状态。

旧的 `plugins.entries.codex-supervisor` 设置已被废弃。运行 `openclaw doctor --fix` 以将旧条目、端点定义、策略标志以及插件允许/拒绝引用迁移到此块中。显式的规范 `codex.config.supervision` 值在冲突中优先生效。

## App-server 传输

For ordinary harness turns, OpenClaw starts the managed Codex binary shipped
with the official plugin (currently `@openai/codex` `0.145.0`):

```bash
codex app-server --listen stdio://
```

这样可以使 app-server 版本绑定到官方 `codex` 插件，而不是本地恰好安装的某个独立 Codex CLI。仅当你有意使用不同的可执行文件时，才设置 `appServer.command`。在默认隔离的 agent home 下，普通的受管理 turn 即使安装了 macOS 桌面应用包，也会优先使用这个固定版本的包。当启用 [Computer Use](/plugins/codex-computer-use) 时，或者当 `homeScope` 为 `"user"` 且可以加载原生 Computer Use 状态时，受管理启动会优先使用拥有所需 macOS 权限的桌面应用二进制文件。当隔离的 agent home 的有效 Codex 配置启用了原生 Computer Use 时，也同样适用桌面优先规则。如果未安装桌面应用包，OpenClaw 会回退到固定版本的包二进制文件。

可执行文件交接和原生配置隔离会在同一个运行中的 Gateway 进程内协调客户端。当另一个进程更改原生 Codex 插件配置后，请重启 Gateway。

Supervision 会解析单独的连接。不显式指定 `appServer` 连接设置时，它使用 `homeScope: "user"` 的受管理 stdio；普通 harness 则保持使用 `homeScope: "agent"` 的受管理 stdio。显式的连接设置会被两条路径共同遵守。当普通 harness 应该与原生客户端共享 `$CODEX_HOME`（或 `~/.codex`）时，请显式设置 `homeScope: "user"`。私有的 supervised 绑定会无论普通 harness 默认值如何，都使用 supervision 连接。独立的 App Server 进程保留各自的实时状态和审批状态。

For non-production testing against an already-running app-server, WebSocket
transport is available:

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            transport: "websocket",
            url: "ws://gateway-host:39175",
            authToken: "${CODEX_APP_SERVER_TOKEN}",
            requestTimeoutMs: 60000,
          },
        },
      },
    },
  },
}
```

Codex classifies WebSocket transport as experimental and unsupported. Prefer
managed stdio or the local Unix control socket for production workloads.

`appServer` fields:

| Field                                         | Default                                                | Meaning                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                              | `"stdio"` spawns Codex; explicit `"unix"` connects to the local control socket; `"websocket"` connects to `url`.                                                                                                                                                                                                                                                                                |
| `homeScope`                                   | `"agent"`                                              | `"agent"` isolates ordinary harness state per OpenClaw agent. `"user"` is an explicit opt-in that shares the native `$CODEX_HOME` or `~/.codex`, uses native auth, and enables owner-only thread management. User scope supports local stdio or Unix transport. For the separate supervision connection, an unset value resolves to `"user"` for stdio or Unix and `"agent"` for WebSocket.     |
| `command`                                     | managed Codex binary                                   | Executable for stdio transport. Leave unset to use the managed binary.                                                                                                                                                                                                                                                                                                                          |
| `args`                                        | `["app-server", "--listen", "stdio://"]`               | Arguments for stdio transport.                                                                                                                                                                                                                                                                                                                                                                  |
| `url`                                         | unset                                                  | WebSocket App Server URL or `unix://` URL. An empty explicit Unix path selects the canonical user-home control socket.                                                                                                                                                                                                                                                                          |
| `authToken`                                   | unset                                                  | Bearer token for WebSocket transport. Accepts a literal string or SecretInput such as `${CODEX_APP_SERVER_TOKEN}`.                                                                                                                                                                                                                                                                              |
| `headers`                                     | `{}`                                                   | Extra WebSocket headers. Header values accept literal strings or SecretInput values, for example `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`.                                                                                                                                                                                                                               |
| `clearEnv`                                    | `[]`                                                   | Extra environment variable names removed from the spawned stdio app-server process after OpenClaw builds its inherited environment.                                                                                                                                                                                                                                                             |
| `remoteWorkspaceRoot`                         | unset                                                  | Remote Codex app-server workspace root. When set, OpenClaw infers the local workspace root from the resolved OpenClaw workspace, preserves the current cwd suffix under this remote root, and sends only the final app-server cwd to Codex. If the cwd is outside the resolved OpenClaw workspace root, OpenClaw fails closed instead of sending a gateway-local path to the remote app-server. |
| `loopDetectionPreToolUseRelay`                | `true`                                                 | Install the Codex `PreToolUse` subprocess used only for OpenClaw loop detection and its explicit no-policy marker. Set `false` to reduce per-tool process fan-out. Before-tool plugin hooks and trusted-tool policy still install their required relay.                                                                                                                                         |
| `requestTimeoutMs`                            | `60000`                                                | Timeout for app-server control-plane calls.                                                                                                                                                                                                                                                                                                                                                     |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                | Quiet window after Codex accepts a turn or after a turn-scoped app-server request while OpenClaw waits for `turn/completed`.                                                                                                                                                                                                                                                                    |
| `turnAssistantCompletionIdleTimeoutMs`        | `10000`                                                | Quiet window after a final/non-commentary assistant item or pre-tool raw assistant completion arms the assistant-output release while OpenClaw still waits for `turn/completed`. Raising it gives Codex more time to emit `turn/completed` before OpenClaw interrupts and releases the session lane.                                                                                            |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                               | Completion-idle and progress guard used after a tool handoff, native tool completion, post-tool raw assistant progress, raw reasoning completion, or reasoning progress while OpenClaw waits for `turn/completed`. Use this for trusted or heavy workloads where post-tool synthesis can legitimately stay quiet longer than the final assistant release budget.                                |
| `mode`                                        | `"yolo"` unless local Codex requirements disallow YOLO | Preset for YOLO or guardian-reviewed execution.                                                                                                                                                                                                                                                                                                                                                 |
| `approvalPolicy`                              | `"never"` or an allowed guardian approval policy       | Native Codex approval policy sent to thread start, resume, and turn.                                                                                                                                                                                                                                                                                                                            |
| `sandbox`                                     | `"danger-full-access"` or an allowed guardian sandbox  | Native Codex sandbox mode sent to thread start and resume. Active OpenClaw sandboxes narrow `danger-full-access` turns to Codex `workspace-write`; the turn network flag follows OpenClaw sandbox egress.                                                                                                                                                                                       |
| `approvalsReviewer`                           | `"user"` or an allowed guardian reviewer               | Use `"auto_review"` to let Codex review native approval prompts when allowed.                                                                                                                                                                                                                                                                                                                   |
| `defaultWorkspaceDir`                         | current process directory                              | Workspace used by `/codex bind` when `--cwd` is omitted.                                                                                                                                                                                                                                                                                                                                        |
| `serviceTier`                                 | unset                                                  | Optional Codex app-server service tier. `"priority"` enables fast-mode routing, `"flex"` requests flex processing, and `null` clears the override. Legacy `"fast"` is accepted as `"priority"`.                                                                                                                                                                                                 |
| `networkProxy`                                | disabled                                               | Opt into Codex permissions-profile networking for app-server commands. OpenClaw defines the selected `permissions.<profile>.network` config and selects it with `default_permissions` instead of sending `sandbox`.                                                                                                                                                                             |
| `experimental.sandboxExecServer`              | `false`                                                | Preview opt-in that registers an OpenClaw sandbox-backed Codex environment with the supported Codex app-server so native Codex execution can run inside the active OpenClaw sandbox.                                                                                                                                                                                                            |

`appServer.networkProxy` 是显式配置，因为它会改变 Codex 沙箱契约。启用后，OpenClaw 还会在 Codex thread 配置中设置 `features.network_proxy.enabled` 和 `default_permissions`，以便生成的权限配置文件能够启动由 Codex 管理的网络。默认情况下，OpenClaw 会根据配置文件内容生成一个具有冲突抵抗能力的 `openclaw-network-<fingerprint>` 配置文件名；只有在需要稳定的本地名称时才使用 `profileName`。

```js
export default {
  plugins: {
    entries: {
      codex: {
        config: {
          appServer: {
            sandbox: "workspace-write",
            networkProxy: {
              enabled: true,
              domains: {
                "api.openai.com": "allow",
                "blocked.example.com": "deny",
              },
              allowUpstreamProxy: true,
              proxyUrl: "http://127.0.0.1:3128",
            },
          },
        },
      },
    },
  },
};
```

如果正常的 app-server 运行时本应是 `danger-full-access`，启用 `networkProxy` 会改为为生成的权限配置文件使用工作区风格的文件系统访问。Codex 管理的网络强制执行是经过沙箱化的网络，因此 full-access 配置文件不会保护出站流量。

The plugin blocks older, newer-unvalidated, prerelease, build-suffixed, or
unversioned app-server handshakes. Codex app-server must report a stable version
from `0.143.0` through the bundled `0.145.0`.

OpenClaw 会将非 loopback 的 WebSocket app-server URL 视为远程，并要求通过 `appServer.authToken` 或 `Authorization` 请求头提供带身份信息的 WebSocket 认证。`appServer.authToken` 和每个 `appServer.headers.*` 值都可以是 SecretInput；secrets 运行时会在 OpenClaw 构建 app-server 启动选项之前解析 SecretRefs 和 env 简写，而未解析的结构化 SecretRefs 会在发送任何 token 或请求头之前失败。当配置了原生 Codex 插件时，OpenClaw 会使用所连接 app-server 的插件控制平面来安装或刷新这些插件，然后刷新 app inventory，以便插件拥有的 app 对 Codex thread 可见。`app/list` 仍然是权威的 inventory 和元数据来源，但 OpenClaw 策略会决定是否在 `thread/start` 中为列表里可访问的 app 设置 `config.apps[appId].enabled = true`，即使 Codex 当前将其标记为 disabled。未知或缺失的 app id 仍然采用失败关闭；这一路径只通过 `plugin/install` 激活 marketplace 插件并刷新 inventory。只有在远程 app-server 被信任且愿意接受 OpenClaw 管理的插件安装和 app inventory 刷新时，才将 OpenClaw 连接到它。

## 审批和沙箱模式

本地 stdio app-server 会话默认使用 YOLO 模式：
`approvalPolicy: "never"`、`approvalsReviewer: "user"`，以及
`sandbox: "danger-full-access"`。这种受信任的本地操作员姿态使得无人值守的 OpenClaw turn 和心跳能够继续推进，而不会出现没人可回应的原生审批提示。

如果 Codex 的本地系统要求文件禁止隐式的 YOLO 审批、
reviewer 或 sandbox 值，OpenClaw 会将隐式默认值改为 guardian，
并选择允许的 guardian 权限。`tools.exec.mode: "auto"`
同样会强制使用经 guardian 审核的 Codex 审批，并且不会保留不安全的
旧版 `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；
将 `tools.exec.mode: "full"` 设为有意的不审批姿态。
同一 requirements 文件中的按主机名匹配的 `[[remote_sandbox_config]]` 条目也会被遵守，用于沙箱默认决策。

将 `appServer.mode: "guardian"` 设置为 Codex guardian 审核审批：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            mode: "guardian",
            serviceTier: "priority",
          },
        },
      },
    },
  },
}
```

`guardian` 预设在这些值被允许时会展开为 `approvalPolicy: "on-request"`、
`approvalsReviewer: "auto_review"` 和 `sandbox: "workspace-write"`。单独的策略字段会覆盖 `mode`。较旧的 `guardian_subagent` reviewer 值仍然被接受作为兼容别名，但新配置应使用 `auto_review`。

当 OpenClaw 沙箱处于活动状态时，本地 Codex app-server 进程仍然运行在 Gateway 主机上。因此，OpenClaw 会为该轮次禁用 Codex 原生 Code Mode、用户 MCP 服务器以及由 app 支持的插件执行，而不是将 Codex 主机侧沙箱视为与 OpenClaw 沙箱后端等效。Shell 访问通过 OpenClaw 沙箱支持的动态工具暴露，例如在正常的 exec/process 工具可用时使用 `sandbox_exec` 和 `sandbox_process`。

<Note>
在由 Docker 支持的 OpenClaw 沙箱主机上（`agents.defaults.sandbox.mode` 设置为
Docker 后端），`openclaw doctor` 会探测主机是否允许
非特权用户所需的命名空间（以及在禁用 Docker 沙箱网络外连时，
网络命名空间），以满足嵌套 Codex `bwrap` 在沙箱容器内进行
`workspace-write` shell 执行的需要。失败的探测通常会在
Ubuntu/AppArmor 主机上表现为 `bwrap: setting up uid map: Permission denied` 或
`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`。
请为 OpenClaw
服务用户修复所报告的主机命名空间策略并重启 gateway；优先为服务进程使用范围限定的 AppArmor 配置文件，而不是采用全局的
`kernel.apparmor_restrict_unprivileged_userns=0` 回退，也不要仅仅为了满足嵌套 `bwrap`
而赋予更宽泛的 Docker 容器权限。
</Note>

## 沙箱化原生执行

稳定的默认行为是失败即关闭：启用中的 OpenClaw 沙箱会禁用原本会从 Codex 应用服务器主机运行的原生
Codex 执行入口。仅当你希望尝试 Codex 的远程环境支持并使用 OpenClaw 的沙箱后端时，才使用
`appServer.experimental.sandboxExecServer: true`。
此预览路径适用于所有受支持的 Codex 应用服务器版本。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            experimental: {
              sandboxExecServer: true,
            },
          },
        },
      },
    },
  },
}
```

当该标志开启且当前 OpenClaw 会话处于沙箱中时，OpenClaw 会启动一个由活动沙箱支持的本地回环 exec-server，将其注册到 Codex app-server，并使用该 OpenClaw 拥有的环境启动 Codex thread 和 turn。如果 app-server 无法注册该环境，运行将失败关闭，而不是静默回退到主机执行。

这个预览路径仅限本地。远程 WebSocket app-server 无法访问回环 exec-server，除非它运行在同一台主机上，因此 OpenClaw 会拒绝这种组合。

## 认证和环境隔离

在默认的每个 agent 的 home 中，认证按以下顺序选择：

1. 该 agent 的显式 OpenClaw Codex 认证配置文件。
2. 该 agent 的 Codex home 中 app-server 已有的账号。
3. 仅对于本地 stdio app-server 启动：当没有 app-server 账号且仍需要 OpenAI 认证时，依次使用 `CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

当 OpenClaw 看到 ChatGPT 订阅风格的 Codex auth profile（OAuth 或
token 凭据类型）时，它会从启动的 Codex 子进程中移除
`CODEX_API_KEY` 和 `OPENAI_API_KEY`。
这样可以让 Gateway 级别的 API key 可用于 embeddings 或直接的 OpenAI 模型，
同时避免原生 Codex app-server 的交互意外通过 API 计费。

显式的 Codex API key profile 和本地 stdio 环境 key 备用方案使用
app-server 登录，而不是继承子进程环境。WebSocket app-server
连接不会接收 Gateway 环境中的 API key 备用方案；请使用显式认证
profile 或远程 app-server 自身的账号。

Stdio app-server 启动默认会继承 OpenClaw 的进程环境。
OpenClaw 负责 Codex app-server 账号桥接，并将 `CODEX_HOME` 设置为
该 agent 的 OpenClaw 状态目录下的每个 agent 专属目录。
这样可以让 Codex 配置、账号、插件缓存/数据以及线程状态都限定在 OpenClaw
agent 范围内，而不会从操作者个人的 `~/.codex` home 中泄漏进来。

将 `appServer.homeScope` 设为 `"user"`，即可与 Codex Desktop 和 CLI 共享原生 Codex 状态。此本地用户 home 模式支持受管 stdio 和显式 Unix 传输。它会在设置了 `$CODEX_HOME` 时使用它，否则使用 `~/.codex`，包括原生认证、配置、插件和线程。OpenClaw 会跳过 app-server 的认证配置文件桥接。已验证所有者的会话可以使用 `codex_threads` 来列出（可选带 `search` 过滤）、读取、分叉、重命名、归档和取消归档这些线程。在 OpenClaw 中继续某个线程之前，请先分叉它；独立的 Codex 进程不会协调同一线程的并发写入者。

该 `homeScope` 开关适用于普通的 harness 会话。通过 Codex Sessions 创建的 Chat 会改用其私有的监督连接，这会为规范分支和未来恢复保留原生连接的认证和提供方配置。

在模型锁定的受监督 Chat 中，`codex_threads` 不能附加到不同的分叉，也不能归档 Chat 绑定的原生线程。列表和仅元数据读取仍然可用。原始转录读取需要 `allowRawTranscripts`；当它被禁用时，列表搜索也会被拒绝，因为原生搜索可能匹配转录预览。对不属于其他 OpenClaw Chat 的无关线程进行重命名、取消归档、分叉（分离）和归档，需要 `allowWriteControls`。这两个选项都不能绕过已锁定的绑定。

OpenClaw 不会为普通的本地 app-server 启动重写 `HOME`。Codex 运行的子进程，例如 `openclaw`、`gh`、`git`、云端 CLI 和 shell 命令，会看到正常的进程 home，并且可以找到用户 home 配置和令牌。Codex 还可能发现 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json`；这种 `.agents` 发现机制有意与操作者 home 共享，并且独立于隔离的 `~/.codex` 状态。

在默认的 agent 范围内，OpenClaw 插件和 OpenClaw 技能快照
仍然通过 OpenClaw 自身的插件注册表和技能加载器流转；个人的
Codex `~/.codex` 资源不会。若你有来自某个 Codex home 的有用
Codex CLI 技能或插件，希望成为隔离的 OpenClaw agent 的一部分，请明确列出它们：

```bash
openclaw migrate codex --dry-run
openclaw migrate apply codex --yes
```

如果某个部署需要额外的环境隔离，请将这些变量添加到
`appServer.clearEnv`：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          appServer: {
            clearEnv: ["CODEX_API_KEY", "OPENAI_API_KEY"],
          },
        },
      },
    },
  },
}
```

`appServer.clearEnv` 只影响启动出来的 Codex app-server 子进程。
OpenClaw 在本地启动规范化期间会从这个列表中移除 `CODEX_HOME` 和 `HOME`：
`CODEX_HOME` 会保持指向所选的 agent 或 user 范围，而 `HOME` 会保持继承，
以便子进程可以使用正常的用户 home 状态。

## 动态工具

Codex dynamic tools default to `searchable` loading, exposed under the
`openclaw` namespace with `deferLoading: true`. OpenClaw normally does not
expose dynamic tools that duplicate Codex-native workspace operations or
Codex's own tool-search surface:

- `read`
- `write`
- `edit`
- `apply_patch`
- `exec`
- `process`
- `update_plan`
- `tool_call`
- `tool_describe`
- `tool_search`
- `tool_search_code`

When a finite runtime allowlist disables native Code Mode, OpenClaw sends an
empty execution-environment selection. In that direct, unsandboxed case,
OpenClaw keeps its policy-filtered `exec` and `process` tools as the shell
fallback. Runtime allowlists and `codexDynamicToolsExclude` still apply.

Most remaining OpenClaw integration tools, such as messaging, media, cron,
browser, nodes, gateway, `heartbeat_respond`, and `web_search`, are available
through Codex tool search under that namespace. This keeps the initial model
context smaller. A small set of tools stay directly callable regardless of
`codexDynamicToolsLoading`, because Codex tool search can be unavailable or
resolve a connector-only universe: `agents_list`, `sessions_spawn`, and
`sessions_yield`. Developer instructions still steer normal Codex subagents
toward native `spawn_agent` for Codex-native subagent work, while
`sessions_spawn` remains available for explicit OpenClaw or ACP delegation.
Message-tool-only source replies also stay direct, since that is a
turn-control contract.

Codex Code Mode projects generic OpenClaw dynamic-tool results as text. Parse a
JSON result before reading fields. Nested dynamic calls are serialized by the
Codex runtime, so `Promise.all` does not submit them concurrently; use a
bounded sequential launch loop when starting collector children.

Tools marked `catalogMode: "direct-only"`, including the OpenClaw `computer`
tool, are grouped under `openclaw_direct`. OpenClaw adds that namespace to
Codex's `code_mode.direct_only_tool_namespaces` list without replacing
operator-supplied entries. Codex therefore exposes those tools as
`DirectModelOnly` in normal and code-mode-only threads instead of routing them
through nested Code Mode `tools.*` calls. This boundary is required for
image-bearing results: nested Code Mode serialization flattens image output to
text, which would discard the screenshot needed for the next computer action.

只有在连接到一个无法搜索延迟动态工具的自定义 Codex app-server，或者在调试完整工具负载时，才设置
`codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用在独立于
`appServer.requestTimeoutMs` 的情况下受到限制。每个 Codex `item/tool/call` 请求使用
以下顺序中的第一个可用超时：

- A positive per-call `timeoutMs` argument.
- For `image_generate`, `agents.defaults.mediaModels.image.timeoutMs`.
- For `image_generate` without a configured timeout, the 120 second
  image-generation default.
- For the media-understanding `image` tool, the selected image-capable `tools.media.models[]` entry's `timeoutSeconds`
  converted to milliseconds, or the 60 second media default. For image
  understanding, this applies to the request itself and is not reduced by
  earlier preparation work.
- For the `message` tool, a fixed 600 second outer budget that covers Gateway delivery and bounded same-key reconciliation.
- The 90 second dynamic-tool default.

This watchdog is the outer dynamic `item/tool/call` budget. Provider-specific
request timeouts run inside that call and keep their own timeout semantics.
Dynamic tool budgets are capped at 600000 ms. `agents_wait` adds 30000 ms of
outer completion grace, and the app-server client allows 660000 ms so that
structured wait result can reach Codex. On timeout, OpenClaw aborts the tool
signal where supported and returns a failed dynamic-tool response to Codex so
the turn can continue instead of leaving the session in `processing`.

在 Codex 接受一个轮次之后，以及在 OpenClaw 对一个轮次范围内的
app-server 请求作出响应之后，harness 期望 Codex 让当前轮次继续推进，
并最终以 `turn/completed` 完成原生轮次。如果
app-server 在 `appServer.turnCompletionIdleTimeoutMs` 时间内保持静默，OpenClaw
会尽最大努力中断 Codex 轮次，记录诊断超时，并
释放 OpenClaw 会话通道，以便后续聊天消息不会排在
一个过时的原生轮次之后。

同一轮次的大多数非终态通知都会解除该短期看门狗，
因为 Codex 已证明该轮次仍然存活。工具交接使用更长的
工具后空闲预算：在 OpenClaw 返回 `item/tool/call` 响应后，
在原生工具项（如 `commandExecution`）完成后，
在原始 `custom_tool_call_output` 完成后，以及在工具后的原始 assistant 进展、
原始 reasoning 完成或 reasoning 进展后。若已配置，守卫使用
`appServer.postToolRawAssistantCompletionIdleTimeoutMs`，否则默认是五分钟。
相同的工具后预算也会扩展在 Codex 发出
下一个当前轮次事件之前的静默合成窗口的进度看门狗。reasoning 完成、注释性的 `agentMessage`
完成，以及工具前的原始 reasoning 或 assistant 进展之后，可能会跟随自动最终回复，因此它们使用
进度后回复守卫，而不是立即释放会话通道。只有最终/非注释性的
已完成 `agentMessage` 项和工具前原始 assistant 完成才会武装 assistant 输出释放：如果 Codex
随后保持静默而未发出 `turn/completed`，OpenClaw 会尽最大努力中断原生轮次
并释放会话通道。可重放安全的 stdio app-server 失败，包括没有 assistant、工具、活动项或副作用证据的轮次完成空闲超时，
会在新的 app-server 尝试上重试一次。非安全超时仍会退役
卡住的 app-server 客户端并释放 OpenClaw 会话通道。它们还会
清除陈旧的原生线程绑定，而不是自动重放。完成看门狗超时会呈现
Codex 特定的超时文本：可重放安全的情况会说明响应可能不完整，而
非安全情况会提示用户在重试前先确认当前状态。公开的超时诊断包括结构化字段，
例如最后一条 app-server 通知的方法、原始 assistant 响应项的 id/type/role、活动请求/项计数，以及
已武装的看门狗状态。当最后一条通知是原始 assistant 响应项时，它们还会包含一个有界的 assistant 文本预览。
它们不包含原始提示词或工具内容。

## 模型发现

默认情况下，Codex 插件会向 app-server 请求可用模型。模型可用性由 Codex app-server 负责，因此当 OpenClaw 升级捆绑的 `@openai/codex` 版本，或某次部署将 `appServer.command` 指向不同的 Codex 二进制文件时，列表可能会发生变化。可用性也可能按账户范围划分。请在正在运行的 gateway 上使用 `/codex models`，以查看该 harness 和账户的实时目录。

如果发现失败或超时，OpenClaw 会使用捆绑的备用目录：

| Model id       | 显示名称 | 推理能力        |
| -------------- | -------- | ---------------- |
| `gpt-5.5`      | gpt-5.5  | low, medium, high, xhigh |
| `gpt-5.4-mini` | GPT-5.4-Mini | low, medium, high, xhigh |

<Note>
The current bundled harness is `@openai/codex` `0.145.0`. A `model/list` probe
against that bundled app-server returned these public picker rows:

| Model id        | 输入模态 | 推理能力                    |
| --------------- | -------- | --------------------------- |
| `gpt-5.6-sol`   | text, image      | low, medium, high, xhigh, max, ultra |
| `gpt-5.6-terra` | text, image      | low, medium, high, xhigh, max, ultra |
| `gpt-5.6-luna`  | text, image      | low, medium, high, xhigh, max        |
| `gpt-5.5`       | text, image      | low, medium, high, xhigh             |
| `gpt-5.2`       | text, image      | low, medium, high, xhigh             |

app-server 目录可以报告 `ultra`；OpenClaw 的推理控制当前通过 `max` 级别暴露。

实时选择器行按账户范围划分，并且会随着账户、Codex 目录或捆绑版本而变化；请运行 `/codex models` 获取当前列表，而不要依赖任何某一时刻的表格。app-server 目录中也可能出现隐藏模型，用于内部或专门流程，而不会作为普通的模型选择器选项。
</Note>

通过 `plugins.entries.codex.config.discovery` 调整发现行为：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 2500,
          },
        },
      },
    },
  },
}
```

当你希望启动时避免探测 Codex、并且只使用备用目录时，请禁用发现：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: false,
          },
        },
      },
    },
  },
}
```

## 工作区引导文件

Codex 通过原生项目文档发现机制自行处理 `AGENTS.md`。
OpenClaw 不会为 persona 文件编写合成的 Codex 项目文档文件，也不会依赖 Codex
回退文件名，因为 Codex 回退仅在 `AGENTS.md` 缺失时适用。

For OpenClaw workspace parity, local tool notes live in the `## Tools` section of `AGENTS.md` and ride Codex's native project-doc discovery. The Codex harness forwards the other bootstrap files as developer instructions:

- `SOUL.md`, `IDENTITY.md`, and `USER.md` are forwarded as **turn-scoped**
  collaboration instructions. Native Codex subagents do not inherit them,
  which keeps subagent turns from picking up the parent agent's persona and
  user profile.
- The compact loaded OpenClaw skills list is also forwarded as turn-scoped
  collaboration developer instructions, so native Codex subagents do not
  inherit it either.
- Heartbeat turns receive generic initiative guidance through collaboration
  mode. Monitor cron scratch is appended to the heartbeat prompt instead of
  injected as workspace context.
- `MEMORY.md` content from the configured agent workspace is not pasted into
  native Codex turn input when memory tools are available for that
  workspace; when it exists, the harness adds a small workspace-memory
  pointer to turn-scoped collaboration developer instructions and Codex
  should use `memory_search` or `memory_get` when durable memory is relevant.
  If tools are disabled, memory search is unavailable, or the active
  workspace differs from the agent memory workspace, `MEMORY.md` uses the
  normal bounded turn-context path instead.
- `BOOTSTRAP.md`, when present, is forwarded as OpenClaw turn input reference
  context.

## 环境覆盖

本地测试仍然可以使用环境覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当未设置 `appServer.command` 时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者在进行一次性本地测试时使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复的部署，建议优先使用配置，因为它能将插件行为与 Codex 其余的 harness 设置一起保存在同一个经过审查的文件中。

## 相关内容

- [Codex harness](/plugins/codex-harness)
- [Codex harness runtime](/plugins/codex-harness-runtime)
- [Codex supervision](/plugins/codex-supervision)
- [Native Codex plugins](/plugins/codex-native-plugins)
- [Codex Computer Use](/plugins/codex-computer-use)
- [OpenAI provider](/providers/openai)
- [配置参考](/gateway/configuration-reference)
