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
| `codexDynamicToolsExclude` | `[]`                     | 从 Codex app-server 轮次中排除的其他 OpenClaw 动态工具名称。                                                                                 |
| `codexPlugins`             | 已禁用                   | 原生 Codex 插件/app 支持，包括对已连接账户应用的可选访问。参见 [原生 Codex 插件](/plugins/codex-native-plugins)。                              |
| `computerUse`              | 已禁用                   | Codex Computer Use 配置。参见 [Codex Computer Use](/plugins/codex-computer-use)。                                                          |
| `sessionCatalog`           | 已启用                   | 侧边栏中的原生 Codex 会话发现。设置 `enabled: false` 可在不禁用 provider 或 harness 的情况下关闭发现。                                           |
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
| `id`            | all           | 稳定的端点 id。                                                 |
| `label`        | all           | 可选显示标签。                                                 |
| `transport`    | all           | `"stdio-proxy"` 或 `"websocket"`。                              |
| `command`      | `stdio-proxy` | 可选的 App Server 命令。                                       |
| `args`          | `stdio-proxy` | 可选的命令参数。                                               |
| `cwd`          | `stdio-proxy` | 可选的子进程工作目录。                                         |
| `url`           | `websocket`   | 必需的 WebSocket 或受支持的本地 socket URL。                   |
| `authTokenEnv` | `websocket`   | 可选的环境变量，其值用于认证该端点。                            |

**Codex 会话**页面使用插件的监管 App Server，并且只显示未归档会话。若没有显式的 `appServer` 连接设置，该连接会由托管的 user-home stdio 管理。存储的或空闲的本地行可以通过最后一个终端持久化的来源回合，创建一个带有受限用户和助手历史的模型锁定 Chat。其私有绑定会保留快照 fork、规范的 `appServer`-source 分支、历史注入以及该连接上的后续回合。第一次规范启动会使用 fork 返回的配对。之后的恢复会省略 OpenClaw 模型和提供方覆盖，以便 Codex 恢复规范线程中持久化的配对；单独的原生更改可以更新该配对，但外部模型和回退链绝不会替换它。存储的和空闲的行在经过无其他运行器确认后可以归档，除非另一个活跃的 OpenClaw 绑定拥有确切目标或其未归档的已生成后代之一。OpenClaw 遵循 Codex 的后代分页，并在枚举错误、循环或安全限制耗尽时失败关闭。确认仍然涵盖未知的原生客户端以及从状态到归档的竞态。受监管的模型锁定 Chat 在保护原生绑定时无法被删除。活跃来源不能创建分支或被归档，但现有的受监管 Chat 仍然可以打开。每一条配对节点行都保持只读；节点传输目前尚未提供 harness 所需的流式生命周期。

仅设置 `appServer.homeScope: "user"` 会改变受管理的 harness 进程使用哪个 Codex home；它不会发布 fleet 目录。启用监管不会改变 harness 默认值。相反，当没有显式的 `appServer` 连接设置时，单独的监管连接默认使用受管理的 user-home stdio。该连接会遵循显式设置。挂起和已提交的受监管绑定会在每一回合保留该连接；禁用监管或连接/生命周期漂移会失败关闭，而不是回退到 agent-home harness。默认连接与原生 Codex 客户端共享存储会话，而不是共享其进程本地活动状态。

旧的 `plugins.entries.codex-supervisor` 设置已被废弃。运行 `openclaw doctor --fix` 以将旧条目、端点定义、策略标志以及插件允许/拒绝引用迁移到此块中。显式的规范 `codex.config.supervision` 值在冲突中优先生效。

## App-server 传输

对于普通 harness turn，OpenClaw 会启动官方插件随附的受管理 Codex 二进制文件（当前为
`@openai/codex` `0.146.1`）：

```bash
codex app-server --listen stdio://
```

这样可以使 app-server 版本绑定到官方 `codex` 插件，而不是本地恰好安装的某个独立 Codex CLI。仅当你有意使用不同的可执行文件时，才设置 `appServer.command`。在默认隔离的 agent home 下，普通的受管理 turn 即使安装了 macOS 桌面应用包，也会优先使用这个固定版本的包。当启用 [Computer Use](/plugins/codex-computer-use) 时，或者当 `homeScope` 为 `"user"` 且可以加载原生 Computer Use 状态时，受管理启动会优先使用拥有所需 macOS 权限的桌面应用二进制文件。当隔离的 agent home 的有效 Codex 配置启用了原生 Computer Use 时，也同样适用桌面优先规则。如果未安装桌面应用包，OpenClaw 会回退到固定版本的包二进制文件。

可执行文件交接和原生配置隔离会在同一个运行中的 Gateway 进程内协调客户端。当另一个进程更改原生 Codex 插件配置后，请重启 Gateway。

监督会解析单独的连接。不显式指定 `appServer` 连接设置时，它使用 `homeScope: "user"` 的受管理 stdio；普通 harness 则保持使用 `homeScope: "agent"` 的受管理 stdio。显式的连接设置会被两条路径共同遵守。当普通 harness 应该与原生客户端共享 `$CODEX_HOME`（或 `~/.codex`）时，请显式设置 `homeScope: "user"`。私有的 supervised 绑定会无论普通 harness 默认值如何，都使用 supervision 连接。独立的 App Server 进程保留各自的实时状态和审批状态。

对于针对已运行 app-server 的非生产测试，可以使用 WebSocket
传输：

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

Codex 将 WebSocket 传输归类为实验性且不受支持。生产工作负载应优先使用
受管理的 stdio 或本地 Unix 控制套接字。

`appServer` 字段：

| 字段                                         | 默认值                                                 | 含义                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                                   | `"stdio"`                                              | `"stdio"` 会启动 Codex；显式设置为 `"unix"` 时连接本地控制套接字；`"websocket"` 连接到 `url`。                                                                                                                                                                                                                                                                                                |
| `homeScope`                                   | `"agent"`                                              | `"agent"` 按 OpenClaw agent 隔离普通 harness 状态。`"user"` 是显式选择加入的设置，会共享原生 `$CODEX_HOME` 或 `~/.codex`、使用原生身份验证，并启用仅所有者可用的线程管理。用户范围支持本地 stdio 或 Unix 传输。对于单独的监督连接，未设置时，stdio 或 Unix 解析为 `"user"`，WebSocket 解析为 `"agent"`。 |
| `command`                                     | 受管理的 Codex 二进制文件                                | stdio 传输使用的可执行文件。留空则使用受管理的二进制文件。                                                                                                                                                                                                                                                                                                                                    |
| `args`                                        | `["app-server", "--listen", "stdio://"]`               | stdio 传输使用的参数。                                                                                                                                                                                                                                                                                                                                                                      |
| `url`                                         | 未设置                                                  | WebSocket App Server URL 或 `unix://` URL。显式设置为空的 Unix 路径时，会选择规范的用户主目录控制套接字。                                                                                                                                                                                                                                                                                    |
| `authToken`                                   | 未设置                                                  | WebSocket 传输使用的 Bearer 令牌。接受字面字符串或 SecretInput，例如 `${CODEX_APP_SERVER_TOKEN}`。                                                                                                                                                                                                                                                                                           |
| `headers`                                     | `{}`                                                   | 额外的 WebSocket 标头。标头值接受字面字符串或 SecretInput 值，例如 `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`。                                                                                                                                                                                                                                                           |
| `clearEnv`                                    | `[]`                                                   | 在 OpenClaw 构建继承的环境后，从启动的 stdio app-server 进程中移除的额外环境变量名称。                                                                                                                                                                                                                                                                                                       |
| `remoteWorkspaceRoot`                         | 未设置                                                  | 远程 Codex app-server 工作区根目录。OpenClaw 将本地 cwd 映射到此根目录，并通过有输出上限且无 shell 的 `command/exec` 读取器传输权威远程附件。越出任一工作区的路径、符号链接、超大文件和无界附件批次都会安全失败；上传会保留配置的频道身份和 app-server 请求超时。     |
| `loopDetectionPreToolUseRelay`                | `true`                                                 | 安装仅用于 OpenClaw 循环检测及其显式无策略标记的 Codex `PreToolUse` 子进程。设置为 `false` 可减少每个工具产生的进程数量。工具调用前插件钩子和受信任工具策略仍会安装其所需的中继。                                                                                                                                                                                                                  |
| `requestTimeoutMs`                            | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                                                                         |
| `turnCompletionIdleTimeoutMs`                 | `60000`                                                | Codex 接受 turn 后，或 turn 作用域的 app-server 请求完成后，在 OpenClaw 等待 `turn/completed` 时使用的静默窗口。                                                                                                                                                                                                                                                                              |
| `turnAssistantCompletionIdleTimeoutMs`        | `10000`                                                | 在最终/非评论性 assistant 项或工具调用前的原始 assistant 完成后，在 OpenClaw 仍等待 `turn/completed` 时，用于启动 assistant 输出释放的静默窗口。提高该值可以让 Codex 有更多时间发出 `turn/completed`，再由 OpenClaw 中断并释放会话通道。                                                                                        |
| `postToolRawAssistantCompletionIdleTimeoutMs` | `300000`                                               | 在工具交接、原生工具完成、工具调用后的原始 assistant 进展、原始推理完成或推理进展之后，OpenClaw 等待 `turn/completed` 时使用的完成静默和进度保护时间。对于受信任或繁重的工作负载，如果工具调用后的综合过程确实可能比最终 assistant 释放预算保持更长时间的静默，请使用此设置。                            |
| `mode`                                        | `"yolo"`，除非本地 Codex 要求不允许 YOLO              | YOLO 或由守护者审查的执行预设。                                                                                                                                                                                                                                                                                                                                                             |
| `approvalPolicy`                              | `"never"` 或允许的守护者审批策略                        | 发送到 thread start、resume 和 turn 的原生 Codex 审批策略。                                                                                                                                                                                                                                                                                                                                  |
| `sandbox`                                     | `"danger-full-access"` 或允许的守护者沙箱              | 发送到 thread start 和 resume 的原生 Codex 沙箱模式。启用的 OpenClaw 沙箱会将 `danger-full-access` turn 收窄为 Codex 的 `workspace-write`；turn 的网络标志遵循 OpenClaw 沙箱的出口设置。                                                                                                                                                                                              |
| `approvalsReviewer`                           | `"user"` 或允许的守护者审查者                          | 在允许的情况下，使用 `"auto_review"` 让 Codex 审查原生审批提示。                                                                                                                                                                                                                                                                                                                             |
| `defaultWorkspaceDir`                         | 当前进程目录                                            | 未提供 `--cwd` 时 `/codex bind` 使用的工作区。                                                                                                                                                                                                                                                                                                                                              |
| `serviceTier`                                 | 未设置                                                  | 可选的 Codex app-server 服务层级。`"priority"` 启用快速模式路由，`"flex"` 请求弹性处理，`null` 清除覆盖设置。旧版 `"fast"` 会按 `"priority"` 接受。                                                                                                                                                                                                                                           |
| `networkProxy`                                | 已禁用                                                  | 为 app-server 命令选择加入 Codex 权限配置文件网络。OpenClaw 会定义所选 `permissions.<profile>.network` 配置，并使用 `default_permissions` 选择它，而不是发送 `sandbox`。                                                                                                                                                                                                                   |
| `experimental.sandboxExecServer`              | `false`                                                | 预览版选择加入功能：向受支持的 Codex app-server 注册由 OpenClaw 沙箱提供支持的 Codex 环境，使原生 Codex 执行可以在活动的 OpenClaw 沙箱内运行。                                                                                                                                                                                                                                             |

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

该插件仅接受稳定版 Codex app-server `0.146.1`。旧版或新版、预发布版、带构建后缀的版本以及未提供版本号的 app-server 握手都会被拒绝。同样的精确版本要求也适用于显式指定的自定义可执行文件、远程 app-server 和 macOS 桌面二进制文件。

OpenClaw 将非回环 WebSocket app-server URL 视为远程连接，并要求通过 `appServer.authToken` 或 `Authorization` 标头提供包含身份信息的 WebSocket 身份验证。`appServer.authToken` 和每个 `appServer.headers.*` 值都可以是 SecretInput；在 OpenClaw 构建 app-server 启动选项前，机密运行时会解析 SecretRef 和环境变量简写，未解析的结构化 SecretRef 会在发送任何令牌或标头前失败。

配置原生 Codex 插件时，OpenClaw 会缓存一个运行时和工作区范围内的 `plugin/installed` 快照。该快照涵盖已安装的精选插件和工作区插件，包括已禁用的所有权信息；`plugin/read` 只解析完全匹配的已配置插件身份。失败或不完整的已安装快照绝不会被缓存。OpenClaw 仅使用 `plugin/list` 查找或修复该已安装快照中缺失的、显式启用的精选插件。它只会为显式配置且启用的精选插件调用 `plugin/install`；绝不会安装、启用或验证工作区插件。

`app/installed` 报告已安装的应用运行时状态，`app/read` 每次调用最多为 100 个请求的应用 ID 返回已验证身份的元数据。OpenClaw 会强制刷新首次冷启动的已安装快照，并将成功的精选插件安装合并到一次应用清单刷新中。之后的缓存读取不会强制重复刷新连接器。

Codex 应用的默认拒绝策略按 thread 评估，因此显式允许的应用可以在变为可调用之前完成安装和身份验证。OpenClaw 只会临时接受已证明所有权且通过策略批准的应用，使用 `_default.enabled = false` 和显式应用覆盖项创建 thread，然后仅针对该 thread 的 ID 调用一次 `app/installed`，并将 `forceRefresh: false`。只有 Codex 确认该应用已针对实际 thread 启用且可调用时，OpenClaw 才会公开该应用。受管理限制、工作区策略、缺失的元数据、已撤销的身份验证和不可用的工具仍会安全失败。

证明会在 OpenClaw 注入历史记录、启动 turn 或持久化原生 thread 绑定之前完成。如果失败，OpenClaw 会通过 `thread/delete` 删除持久化的临时 thread，或通过 `thread/unsubscribe` 取消订阅临时 thread。如果无法确认安全清理，OpenClaw 会停用所属的 app-server 连接。受监督分支也会清理其临时探测，并在清理失败时保留恢复状态。

使用 `allow_all_plugins` 时，显式禁用的已配置工作区插件仍会拒绝其拥有的应用。当 `app/read` 未公开该所有权时，OpenClaw 会使用其 `plugin/installed` 快照，并仅读取完全匹配的已配置插件详情，以保留被拒绝的应用 ID。它不会扫描无关的市场，也不会安装、启用或验证被禁用的插件；缺失所有权会安全失败。

仅将 OpenClaw 连接到受信任的 `0.146.1` 远程 app-server，并确保其能够接受已配置的市场插件安装和清单刷新。缺失现代清单方法，以及服务器、身份验证或传输故障，都会以故障关闭方式处理。

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

稳定默认行为是故障关闭：启用 OpenClaw 沙箱后，会禁用原本会从 Codex app-server 主机运行的原生 Codex 执行接口。只有当你希望尝试 Codex 的远程环境支持与 OpenClaw 沙箱后端时，才使用 `appServer.experimental.sandboxExecServer: true`。此预览路径使用固定版本的 Codex `0.146.1` app-server。

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

沙箱化进程的输出会以有序的 stdout、stderr 或 PTY 通知流式传输。OpenClaw 仅保留一个有界的近期输出缓冲区，用于轮询和重放，因此长时间运行的进程不会无限增长 app-server 桥接的资源占用。进程退出和清理仍与沙箱拥有的进程绑定。

此预览路径仅支持本地环境。远程 WebSocket app-server 无法访问回环 exec-server，除非二者运行在同一主机上，因此 OpenClaw 会拒绝这种组合。

## 认证和环境隔离

在默认的每个 agent 专属 home 中，受管 stdio 启动会使用 Codex 的临时凭据存储。OpenClaw 按以下顺序提供认证：

1. 为该 agent 显式指定或按顺序排列的 OpenClaw 认证 profile。
2. 仅对于 API key 路由，使用已准备的 key，或依次从
   `CODEX_API_KEY`、`OPENAI_API_KEY` 获取本地 stdio 备用方案。

在此模式下，受管的 app-server 不会读取现有的
`codex-home/auth.json`。请按照下文所述显式导入该文件。仅当 app-server
应改为拥有并使用操作者原生的 Codex 账号时，才将
`appServer.homeScope: "user"` 设置为 `"user"`。

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

凭据需要通过敏感迁移路径处理，因为默认的 agent 范围不会直接使用复制或挂载的 `codex-home/auth.json`。将 `<agent-id>` 替换为拥有此 Codex home 的已配置 agent：

```bash
openclaw migrate plan codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai
openclaw migrate apply codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai --yes
```

如果部署需要额外的环境隔离，请将这些变量添加到
`appServer.clearEnv` 中：

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

Codex 动态工具默认以 `searchable` 模式加载，并通过 `openclaw` 命名空间暴露，同时设置
`deferLoading: true`。OpenClaw 通常不会暴露与 Codex 原生工作区操作或 Codex 自身工具搜索界面重复的动态工具：

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

当有限的运行时允许列表禁用原生 Code Mode 时，OpenClaw 会发送一个空的执行环境选择。在这种直接、无沙箱的情况下，
OpenClaw 会保留经过策略过滤的 `exec` 和 `process` 工具，作为 Shell 后备方案。运行时允许列表和
`codexDynamicToolsExclude` 仍然适用。

大多数剩余的 OpenClaw 集成工具，例如消息、媒体、cron、浏览器、节点、网关、
`heartbeat_respond` 和 `web_search`，都可通过该命名空间下的 Codex 工具搜索使用。这样可以减小初始模型上下文。
无论 `codexDynamicToolsLoading` 的设置如何，仍有一小组工具会保持可直接调用，因为 Codex 工具搜索可能不可用，或可能解析出一个仅包含连接器的工具集合：
`agents_list`、`sessions_spawn` 和 `sessions_yield`。开发者指令仍会引导普通 Codex 子代理优先使用原生的
`spawn_agent` 来执行 Codex 原生子代理工作，而 `sessions_spawn` 仍可用于显式的 OpenClaw 或 ACP 委派。
仅消息工具的源回复也会保持直接调用，因为这是回合控制契约。

Codex Code Mode 会将通用的 OpenClaw 动态工具结果投影为文本。在读取字段之前，请先解析 JSON 结果。
嵌套的动态调用由 Codex 运行时串行化，因此 `Promise.all` 不会并发提交这些调用；启动收集器子任务时，请使用有界的顺序启动循环。

标记为 `catalogMode: "direct-only"` 的工具（包括 OpenClaw 的 `computer` 工具）会归入
`openclaw_direct`。OpenClaw 会将该命名空间添加到 Codex 的
`code_mode.direct_only_tool_namespaces` 列表中，而不会替换操作员提供的条目。因此，在普通线程和仅代码模式线程中，
Codex 会将这些工具暴露为 `DirectModelOnly`，而不是通过嵌套的 Code Mode `tools.*` 调用路由它们。
对于包含图像的结果，这一边界是必需的：嵌套的 Code Mode 序列化会将图像输出扁平化为文本，从而丢失下一次
computer 操作所需的屏幕截图。

只有在连接到一个无法搜索延迟动态工具的自定义 Codex app-server，或者在调试完整工具负载时，才设置
`codexDynamicToolsLoading: "direct"`。

## 超时

OpenClaw 拥有的动态工具调用在独立于
`appServer.requestTimeoutMs` 的情况下受到限制。每个 Codex `item/tool/call` 请求使用
以下顺序中的第一个可用超时：

- 每次调用的 `timeoutMs` 参数（必须为正数）。
- 对于 `image_generate`，使用 `agents.defaults.mediaModels.image.timeoutMs`。
- 对于未配置超时的 `image_generate`，使用 120 秒的
  图像生成默认值。
- 对于媒体理解的 `image` 工具，使用所选支持图像的 `tools.media.models[]` 条目的 `timeoutSeconds`
  转换为毫秒后的值，或使用 60 秒的媒体默认值。对于图像
  理解，此设置应用于请求本身，不会因之前的准备工作而缩短。
- 对于 `message` 工具，使用固定的 600 秒外部预算，该预算涵盖网关传递和有界的同键协调。
- 90 秒的动态工具默认值。

此看门狗是外部动态 `item/tool/call` 预算。提供商特定的
请求超时在该调用内部运行，并保留其自身的超时语义。
动态工具预算上限为 600000 毫秒。`agents_wait` 会额外增加 30000 毫秒的
外部完成宽限期，而 app-server 客户端允许 660000 毫秒，以便结构化的等待结果能够传递给 Codex。
超时时，OpenClaw 会在支持的情况下中止工具信号，并向 Codex 返回失败的动态工具响应，
以便轮次能够继续，而不是让会话停留在 `processing` 状态。

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

如果发现功能暂时不可用或超时，订阅路由会使用根据捆绑的 OpenAI 模型清单生成的离线提示：

| 模型 ID       | 显示名称   | 推理级别                          |
| ------------- | ---------- | ---------------------------------- |
| `gpt-5.6-sol` | GPT-5.6 Sol | low, medium, high, xhigh, max, ultra |
| `gpt-5.5`     | GPT-5.5     | low, medium, high, xhigh             |
| `gpt-5.5-pro` | gpt-5.5-pro | medium, high, xhigh                  |

离线提示永远不能证明账户拥有相应权限。即使经过身份验证的发现响应中没有可见模型，它仍然具有权威性；HTTP `401` 和 `403` 会返回空目录，而不会暴露备用模型。

<Note>
当前捆绑的 harness 是 `@openai/codex` `0.146.1`。针对官方 `0.146.1` app-server 的实时 `model/list`
探测返回了以下公开选择器条目：

| 模型 ID        | 输入模态 | 推理能力                    |
| --------------- | -------- | --------------------------- |
| `gpt-5.6-sol`   | text, image      | low, medium, high, xhigh, max, ultra |
| `gpt-5.6-terra` | text, image      | low, medium, high, xhigh, max, ultra |
| `gpt-5.6-luna`  | text, image      | low, medium, high, xhigh, max        |
| `gpt-5.5`       | text, image      | low, medium, high, xhigh             |
| `gpt-5.2`       | text, image      | low, medium, high, xhigh             |

可用的模型 ID、输入模态和推理级别仍然取决于账户范围。启动或升级 gateway 后运行 `/codex models`，以查看你账户的实际公开选择器。

app-server 目录可能会报告 `ultra`；OpenClaw 当前的推理控制项最多只提供 `max` 级别。app-server 目录中也可能出现供内部或专用流程使用的隐藏模型，但它们不一定是普通模型选择器中的选项。
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

为了实现 OpenClaw 工作区的一致性，本地工具说明位于 `AGENTS.md` 的 `## Tools` 部分，并通过 Codex 原生项目文档发现机制加载。Codex harness 会将其他引导文件作为开发者指令转发：

- `SOUL.md`、`IDENTITY.md` 和 `USER.md` 会作为**回合范围内**的协作指令转发。
  原生 Codex 子代理不会继承这些文件，从而避免子代理回合获取父代理的 persona 和用户资料。
- 精简后的 OpenClaw 技能列表也会作为回合范围内的协作开发者指令转发，因此原生 Codex 子代理同样不会继承该列表。
- 心跳回合会通过协作模式获得通用的主动性指导。监控 cron 临时内容会追加到心跳提示中，而不是注入为工作区上下文。
- 当工作区启用了记忆工具时，配置的代理工作区中的 `MEMORY.md` 内容不会粘贴到原生 Codex 回合输入中；如果该文件存在，harness 会在回合范围内的协作开发者指令中添加一个简短的工作区记忆指针。当持久记忆与当前任务相关时，Codex 应使用 `memory_search` 或 `memory_get`。
  如果工具被禁用、记忆搜索不可用，或当前工作区与代理记忆工作区不同，则 `MEMORY.md` 会改用正常的有界回合上下文路径。
- 如果存在 `BOOTSTRAP.md`，则会作为 OpenClaw 回合输入的参考上下文转发。

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

- [Codex 工具框架](/plugins/codex-harness)
- [Codex 工具框架运行时](/plugins/codex-harness-runtime)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 计算机使用](/plugins/codex-computer-use)
- [OpenAI 提供商](/providers/openai)
- [配置参考](/gateway/configuration-reference)。
