---
summary: "Codex harness 的配置、认证、发现以及 app-server 参考"
title: "Codex harness 参考"
read_when:
  - 你需要 Codex harness 的每一个配置字段
  - 你正在更改 app-server 传输、认证、发现或超时行为
  - 你正在调试 Codex harness 启动、模型发现或环境隔离
---

本参考涵盖捆绑的 `codex` 插件的详细配置。
有关设置和路由决策，请从
[Codex harness](/plugins/codex-harness) 开始。

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

| 字段                       | 默认值                   | 含义                                                                                                                                   |
| -------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | 已启用                   | Codex app-server `model/list` 的模型发现设置。                                                                                         |
| `appServer`                | 托管的 stdio app-server  | 传输、命令、认证、审批、沙箱和超时设置。                                                                                                 |
| `codexDynamicToolsLoading` | `"searchable"`           | 使用 `"direct"` 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。                                                                  |
| `codexDynamicToolsExclude` | `[]`                     | 要从 Codex app-server turn 中省略的额外 OpenClaw 动态工具名称。                                                                          |
| `codexPlugins`             | 已禁用                   | 为已迁移的、源安装的精选插件提供原生 Codex 插件/app 支持。参见 [Native Codex plugins](/plugins/codex-native-plugins)。                   |
| `computerUse`              | 已禁用                   | Codex Computer Use 设置。参见 [Codex Computer Use](/plugins/codex-computer-use)。                                                     |

## App-server 传输

默认情况下，OpenClaw 会启动与捆绑插件一起提供的受管理 Codex 二进制文件（当前为 `@openai/codex` `0.142.5`）：

```bash
codex app-server --listen stdio://
```

这会使 app-server 版本固定为捆绑的 `codex` 插件，而不是本地可能安装的某个单独 Codex CLI。只有当你有意使用不同的可执行文件时，才设置 `appServer.command`。

对于已经在运行的 app-server，请使用 WebSocket 传输：

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

`appServer` 字段：

| 字段                                         | 默认值                                                 | 含义                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                  | `"stdio"`                                              | `"stdio"` 会启动 Codex；`"websocket"` 会连接到 `url`。                                                                                                                                                                                                                                                                                                                                             |
| `homeScope`                                  | `"agent"`                                              | `"agent"` 会按 OpenClaw agent 隔离 Codex 状态。`"user"` 共享原生 `$CODEX_HOME` 或 `~/.codex`，使用原生认证，并启用仅所有者可管理线程。用户作用域要求使用 stdio。                                                                                                                                                                                                                                   |
| `command`                                    | managed Codex binary                                   | 用于 stdio 传输的可执行文件。留空则使用受管理的二进制文件。                                                                                                                                                                                                                                                                                                                                       |
| `args`                                       | `["app-server", "--listen", "stdio://"]`               | stdio 传输的参数。                                                                                                                                                                                                                                                                                                                                                                                 |
| `url`                                        | unset                                                  | WebSocket app-server URL。                                                                                                                                                                                                                                                                                                                                                                         |
| `authToken`                                  | unset                                                  | WebSocket 传输的 Bearer token。接受字面字符串或诸如 `${CODEX_APP_SERVER_TOKEN}` 这样的 SecretInput。                                                                                                                                                                                                                                                                                              |
| `headers`                                    | `{}`                                                   | 额外的 WebSocket 请求头。请求头值接受字面字符串或 SecretInput 值，例如 `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`。                                                                                                                                                                                                                                                           |
| `clearEnv`                                   | `[]`                                                   | OpenClaw 构建继承环境后，从已启动的 stdio app-server 进程中移除的额外环境变量名。                                                                                                                                                                                                                                                                                                                  |
| `remoteWorkspaceRoot`                        | unset                                                  | 远程 Codex app-server 工作区根目录。设置后，OpenClaw 会从已解析的 OpenClaw 工作区推断本地工作区根目录，保留当前 cwd 在该远程根目录下的后缀，并且只将最终的 app-server cwd 发送给 Codex。如果 cwd 位于已解析的 OpenClaw 工作区根目录之外，OpenClaw 会直接失败，而不是向远程 app-server 发送 gateway 本地路径。 |
| `requestTimeoutMs`                           | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                                                                                 |
| `turnCompletionIdleTimeoutMs`                | `60000`                                                | 在 Codex 接受一个 turn 之后，或在 OpenClaw 等待 `turn/completed` 时，收到一次 turn 作用域的 app-server 请求之后的安静窗口。                                                                                                                                                                                                                                                                       |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                               | 在工具交接、原生工具完成、tool 之后的原始 assistant 进度、原始推理完成，或在 OpenClaw 等待 `turn/completed` 时的推理进度之后使用的完成空闲与进度保护。适用于受信任或重负载场景，此时工具后合成的静默时间可以合理地长于最终 assistant 释放预算。                                                                              |
| `mode`                                       | `"yolo"` unless local Codex requirements disallow YOLO | YOLO 或经过守护者审查的执行预设。                                                                                                                                                                                                                                                                                                                                                                   |
| `approvalPolicy`                             | `"never"` or an allowed guardian approval policy       | 发送给 thread start、resume 和 turn 的原生 Codex 许可策略。                                                                                                                                                                                                                                                                                                                                          |
| `sandbox`                                    | `"danger-full-access"` or an allowed guardian sandbox  | 发送给 thread start 和 resume 的原生 Codex 沙箱模式。启用中的 OpenClaw 沙箱会将 `danger-full-access` 的 turn 收窄为 Codex `workspace-write`；turn 的网络标志遵循 OpenClaw 沙箱的出站策略。                                                                                                                                                                                                                 |
| `approvalsReviewer`                          | `"user"` or an allowed guardian reviewer               | 在允许时使用 `"auto_review"` 让 Codex 审查原生许可提示。                                                                                                                                                                                                                                                                                                                                              |
| `defaultWorkspaceDir`                        | current process directory                              | 当省略 `--cwd` 时，供 `/codex bind` 使用的工作区。                                                                                                                                                                                                                                                                                                                                                  |
| `serviceTier`                                | unset                                                  | 可选的 Codex app-server 服务层级。`"priority"` 启用 fast-mode 路由，`"flex"` 请求 flex 处理，`null` 清除覆盖。旧的 `"fast"` 会被接受为 `"priority"`。                                                                                                                                                                                                                                              |
| `networkProxy`                               | disabled                                               | 为 app-server 命令启用 Codex permissions-profile 网络。OpenClaw 会定义所选的 `permissions.<profile>.network` 配置，并使用 `default_permissions` 选择它，而不是发送 `sandbox`。                                                                                                                                                                                                                       |
| `experimental.sandboxExecServer`             | `false`                                                | 预览版可选项，会在 Codex app-server 0.132.0 或更新版本中注册一个由 OpenClaw 沙箱支持的 Codex 环境，从而让原生 Codex 执行可以在当前 OpenClaw 沙箱内运行。                                                                                                                                                                                                                                             |

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

该插件会阻止较旧或未指定版本的 app-server 握手：Codex app-server 必须报告稳定版本 `0.125.0` 或更高。

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

稳定的默认行为是失败关闭：启用的 OpenClaw 沙箱会禁用原本会从 Codex app-server 主机运行的原生 Codex 执行入口。仅当你想尝试使用 OpenClaw 的沙箱后端来支持 Codex 的远程环境能力时，才使用 `appServer.experimental.sandboxExecServer: true`。
这个预览路径需要 Codex app-server 0.132.0 或更高版本。

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

当该标志开启且当前 OpenClaw 会话处于沙箱中时，OpenClaw 会启动一个由活动沙箱支持的本地回环 exec-server，将其注册到 Codex app-server，并使用该 OpenClaw 拥有的环境启动 Codex thread 和 turn。如果 app-server 无法注册该环境，运行会失败关闭，而不是静默回退到主机执行。

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

将 `appServer.homeScope: "user"` 设为共享原生 Codex 状态，
以便与 Codex Desktop 和 CLI 共用。这种仅限本地 stdio 的模式在设置了
`$CODEX_HOME` 时使用它，否则使用 `~/.codex`，包括原生认证、配置、插件和线程。
OpenClaw 会对 app-server 跳过其认证 profile 桥接。经验证的 owner
turn 可以使用 `codex_threads` 来列出（可选带 `search` 过滤器）、
读取、分叉、重命名、归档和取消归档这些线程。请在 OpenClaw 中继续
一个线程之前先分叉它；独立的 Codex 进程不会协调同一线程的并发写入。

OpenClaw 在普通本地 app-server 启动时不会重写 `HOME`。
Codex 运行的子进程，例如 `openclaw`、`gh`、`git`、云 CLI 和 shell
命令，会看到正常的进程 home，并且可以找到用户 home 下的配置和
token。Codex 还可能发现 `$HOME/.agents/skills` 和
`$HOME/.agents/plugins/marketplace.json`；这种 `.agents` 发现机制
是故意与操作者 home 共享的，并且与隔离的 `~/.codex` 状态是分开的。

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

Codex 动态工具默认以 `searchable` 方式加载，并通过
`openclaw` 命名空间暴露，且 `deferLoading: true`。OpenClaw 不会暴露
与 Codex 原生工作区操作或 Codex 自身工具搜索界面重复的动态工具：

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

其余大多数 OpenClaw 集成工具，例如消息、媒体、cron、
浏览器、节点、gateway、`heartbeat_respond` 和 `web_search`，都可
通过该命名空间下的 Codex 工具搜索使用。这使初始模型
上下文更小。一小部分工具会始终保持可直接调用，无论
`codexDynamicToolsLoading` 如何设置，因为 Codex 工具搜索可能不可用，或者
只能解析出仅连接器的工具宇宙：`agents_list`、`sessions_spawn` 和
`sessions_yield`。开发者指令仍会引导正常的 Codex 子代理
在处理 Codex 原生子代理工作时优先使用原生 `spawn_agent`，而
`sessions_spawn` 则仍可用于显式的 OpenClaw 或 ACP 委派。
仅限消息工具的源回复也仍然直接返回，因为这是一个
转向控制契约。

仅在连接到无法搜索延迟动态工具的自定义
Codex app-server，或在调试完整工具负载时，才设置
`codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用在独立于
`appServer.requestTimeoutMs` 的情况下受到限制。每个 Codex `item/tool/call` 请求使用
以下顺序中的第一个可用超时：

- 一个正的逐次调用 `timeoutMs` 参数。
- 对于 `image_generate`，使用 `agents.defaults.imageGenerationModel.timeoutMs`。
- 对于未配置超时的 `image_generate`，使用默认的 120 秒
  图像生成超时。
- 对于媒体理解的 `image` 工具，使用 `tools.media.image.timeoutSeconds`
  转换为毫秒，或者使用默认的 60 秒媒体超时。对于图像理解，
  这适用于请求本身，不会因更早的准备工作而缩短。
- 对于 `message` 工具，使用固定的 120 秒默认值。
- 90 秒的动态工具默认值。

这个看门狗是外层的动态 `item/tool/call` 预算。提供方特定的
请求超时在该调用内部运行，并保留各自的超时语义。
动态工具预算上限为 600000 ms。超时时，OpenClaw 会在支持的情况下中止
工具信号，并向 Codex 返回失败的动态工具响应，从而使轮次能够继续，
而不是让会话停留在 `processing` 中。

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

| Model id       | Display name | Reasoning efforts        |
| -------------- | ------------ | ------------------------ |
| `gpt-5.5`      | gpt-5.5      | low, medium, high, xhigh |
| `gpt-5.4-mini` | GPT-5.4-Mini | low, medium, high, xhigh |

<Note>
当前捆绑的 harness 是 `@openai/codex` `0.142.5`。针对该捆绑 app-server 的一次 `model/list` 探测，除了备用目录之外，还返回了这些公开选择器行：

| Model id              | Input modalities | Reasoning efforts        |
| --------------------- | ---------------- | ------------------------ |
| `gpt-5.5`             | text, image      | low, medium, high, xhigh |
| `gpt-5.4`             | text, image      | low, medium, high, xhigh |
| `gpt-5.4-mini`        | text, image      | low, medium, high, xhigh |
| `gpt-5.3-codex-spark` | text             | low, medium, high, xhigh |

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

为了与 OpenClaw 工作区保持一致，Codex harness 会将其他
引导文件作为开发者指令转发，但并非完全相同：

- `TOOLS.md` 会作为**继承式** Codex 开发者指令转发，因此
  在本轮中启动的原生 Codex 子代理也能看到它。
- `SOUL.md`、`IDENTITY.md` 和 `USER.md` 会作为**轮次范围内**的
  协作指令转发。原生 Codex 子代理不会继承它们，
  这样可以避免子代理轮次拾取父代理的 persona 和
  用户配置文件。
- 紧凑加载的 OpenClaw skills 列表也会作为轮次范围内的协作开发者指令转发，
  因此原生 Codex 子代理也不会继承它。
- `HEARTBEAT.md` 内容不会被注入；心跳轮次会获得一个协作模式指针，
  在文件存在且非空时去读取该文件。
- 来自已配置代理工作区的 `MEMORY.md` 内容，在该工作区可用 memory 工具时，
  不会被粘贴到原生 Codex 的轮次输入中；当它存在时，harness 会向轮次范围内的
  协作开发者指令添加一个小型工作区记忆指针，而当持久记忆相关时，Codex
  应使用 `memory_search` 或 `memory_get`。如果工具被禁用、memory 搜索不可用，
  或当前工作区与代理记忆工作区不同，则 `MEMORY.md` 会改为使用正常的受限轮次上下文路径。
- `BOOTSTRAP.md` 在存在时，会作为 OpenClaw 轮次输入的参考上下文转发。

## 环境覆盖

本地测试仍可使用环境覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过受管理的二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 已被移除。请改用
`plugins.entries.codex.config.appServer.mode: "guardian"`，或者在一次性本地测试中使用
`OPENCLAW_CODEX_APP_SERVER_MODE=guardian`。对于可重复部署，更推荐使用配置，因为它能将插件行为与 Codex harness 其余设置一起保留在同一个经过审查的文件中。

## 相关内容

- [Codex 宿主](/plugins/codex-harness)
- [Codex 宿主运行时](/plugins/codex-harness-runtime)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 电脑使用](/plugins/codex-computer-use)
- [OpenAI 提供方](/providers/openai)
- [配置参考](/gateway/configuration-reference)
