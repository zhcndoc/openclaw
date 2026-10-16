---
summary: "应用程序服务器传输选择、应用程序服务器字段表和本地测试环境覆盖"
read_when:
  - "您正在选择 Codex 应用程序服务器传输"
  - "您需要一个默认的 appServer 字段"
  - "您正在覆盖应用程序服务器二进制文件以进行本地测试"
title: "Codex 应用程序服务器传输"
sidebarTitle: "应用程序-服务器传输"
---

OpenClaw 如何启动并到达 Codex 应用程序服务器以及每个 `appServer` 字段。 [Codex harness参考 ](/plugins/codex-harness-reference) 的一部分； [ 每个部分移动的位置](/plugins/codex-harness-reference#where-each-section-moved) 列出每个部分。

## <a id="app-server-transport"></a> App-server 传输

对于普通harness转弯，OpenClaw 启动托管的 Codex 二进制文件：您自己安装的较新的 Codex，或者随官方插件附带的二进制文件（当前为 `@openai/codex` `0.162.0`）：

```bash
codex app-server --listen stdio://
```

OpenClaw 使用 Node 包解析从加载程序选择的插件根解析发货的 `@openai/codex/bin/codex.js`，包括 npm-hoisted 和 pnpm-linked 依赖项。在 Windows 上，Node 运行相同的包入口点，而不需要 `codex.cmd` 填充程序。仅当您有意需要不同的可执行文件时才设置 `appServer.command`。

### <a id="newer-installed-codex"></a> 较新安装的 Codex

ChatGPT 在运行回合的 Codex 版本上门控新模型，因此 OpenClaw 使用 `PATH` 中较新的 Codex（例如 `npm i -g @openai/codex`、Bun 全局安装、Homebrew 或独立安装程序）（如果安全的话），否则使用附带的二进制文件。每个网关进程都会检查 `PATH` 上的第一个 `codex`，并仅在所有这些都满足时才使用它：

- 它是本机可执行文件或官方`@openai/codex` npm启动器。其他包装器脚本（例如 pnpm 全局填充程序）将被跳过。指向 macOS 桌面拥有的二进制文件的 `PATH` 符号链接也会被跳过；桌面启动保留其单独的权限和身份验证规则。
- `codex --version` 使用比出厂版本更新的稳定版本进行答复。版本检查和选择握手共享四秒的预算。剩余期限较短的托管请求最多将一半的时间用于选择，其余的则保留用于捆绑启动。当预算用完时，此过程会保留捆绑的引脚并忽略任何后期的探测成功。同等的、较旧的、不可解析的和预发布的版本将被跳过。
- 它与发布的二进制文件具有相同的主要版本。应用程序服务器协议没有协商版本，因此新的专业被视为不兼容。具有相同专业的新版本仍然可以更改请求OpenClaw之后使用`initialize`；这些检查没有检测到这一点。如果有较新的Codex行为不端，设置`appServer.command`到特定的二进制文件或删除较新的`codex`从网关的`PATH`。
- A 真实应用程序服务器 `initialize` 与一次性 `CODEX_HOME` 的握手在剩余选择预算内成功，并报告相同版本。通过环境和 CLI 配置，将其 SQLite 位置强制进入该临时位置。系统要求文件、托管首选项或旧托管配置的存在会禁用已安装的选择，因为这些源可以覆盖此位置。缺少 macOS 首选项域不是限制。不涉及任何授权或转向。

否则，OpenClaw 使用附带的二进制文件。网关会记录一行，其中包含所选二进制文件、其版本和原因，例如 `Codex app-server: using installed /usr/local/bin/codex 0.162.1 (newer than bundled 0.162.0)` 或 `Codex app-server: using bundled 0.162.0 (installed /usr/local/bin/codex 0.159.0 is not newer)`。

如果选定的 Codex 稍后无法启动、`initialize` 失败或报告另一个版本（例如就地升级后），则 OpenClaw 在任何线程或轮次存在之前启动该请求的附带二进制文件，记录一个警告，并继续使用附带的二进制文件，直到网关重新启动。 ChatGPT 模型发现将所选二进制文件的版本报告为 `client_version`，因此模型列表与运行的二进制文件相匹配。网关重新启动会重复该选择，从而进行 Codex 安装、升级和删除。

在这样的回退之后，模型列表可能会短暂地与二进制文件不一致。仅在安装的二进制文件已经通过选择握手之后才会发生回退，因此这些窗口很少见：

- A 在回退之前开始的模型列表刷新（包括仍在排队等候目录工作器的模型列表刷新）以已安装版本的列表完成。
- 在回退之前获取的 A 列表将保持缓存，直到 ChatGPT 模型行过期（大约一分钟）并且下一次刷新运行。可以在该窗口中选择仅已安装版本提供的模型，然后轮流在附带的二进制文件上运行。
- 没有正在运行的网关的 `openclaw models list --refresh` 在其自己的进程中选择二进制文件，因此其列表可能与稍后启动的网关不同，例如在安装或升级 Codex 之后。

`appServer.command`、`OPENCLAW_CODEX_APP_SERVER_BIN` 和远程应用程序服务器始终获胜； discovery 然后继续报告已发布的版本。登录状态检查、节点执行服务器和 Doctor 包检查始终使用附带的二进制文件。

即使安装了 macOS 桌面捆绑包，具有默认隔离代理主目录的普通托管轮流也更喜欢此软件包选择。当启用 [Computer Use](/plugins/codex-computer-use) 时，或者当 `homeScope` 为 `"user"` 并且可以加载本机计算机使用状态时，托管启动会优先选择拥有所需 macOS 权限的桌面应用程序二进制文件。当隔离代理主目录的有效 Codex 配置启用本机计算机使用时，适用相同的桌面优先规则。如果未安装桌面应用程序包，OpenClaw 将回退到软件包选择。查找桌面应用程序的桌面优先启动不会检查 `PATH`：提供的二进制文件是其后备，并且该代理的 ChatGPT 模型发现不断报告提供的版本。

在切换分阶段的 OpenClaw 包之前，请针对候选安装运行选择加入托管二进制文件检查：

```bash
openclaw doctor --lint --only codex/managed-app-server --json
```

该支票是只读的。对于每个配置的 Codex 代理，它会应用与实时harness转动相同的最终命令选择，而无需安装较新的 Codex，然后验证所选包拥有的本机二进制文件是否存在并报告插件的确切固定版本。选定的 Codex 桌面二进制文件、显式自定义命令和远程应用程序服务器不在此包检查范围内。该命令在错误级别发现时退出非零，因此部署者可以在切换之前拒绝候选者，而无需更改 Codex 状态或应用程序服务器设置。

进行中的工作可以用它开始时的可执行文件和本机配置来完成；并发更改是最大的努力。新的客户端获取使用当前的可执行文件选择。在另一个进程更改本机 Codex 插件配置后重新启动网关。

监督解决了单独的连接。由于没有明确的 `appServer` 连接设置，它使用带有 `homeScope: "user"` 的托管 stdio；普通harness仍然由 `homeScope: "agent"` 管理 stdio。两条路径均遵循显式连接设置。当普通harness应与本机客户端共享 `$CODEX_HOME`（或 `~/.codex`）时，显式设置 `homeScope: "user"`。无论普通harness默认设置如何，私有受监督绑定都会使用监督连接。独立的应用程序服务器进程保留单独的实时状态和批准状态。

对于具有代理主目录的托管本地应用程序服务器，OpenClaw 设置 `thread_unload_delay_secs=0`，覆盖本机取消订阅后保留。 OpenClaw 保持温暖的订阅并保护活跃的子作品本身。当会话需要新配置时，它会在恢复其历史记录之前等待最多两秒以获取该线程的卸载通知，因此失败的线程可以在同级线程继续运行时恢复。如果未确认卸载，则保留绑定；仅当不会中断同级工作时，失败线程恢复才能替换客户端。用户主目录、stdio 代理和外部套接字连接保留其本机保留设置。

对于针对已运行 app-server 的非生产测试，可以使用 WebSocket 传输：

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

Codex 将 WebSocket 传输归类为实验性且不受支持。生产工作负载应优先使用受管理的 stdio 或本地 Unix 控制套接字。

`appServer` 字段：

| 字段                            | 默认值                                                | 含义                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport`                      | `"stdio"`                                              | `"stdio"` 生成 Codex；显式 `"unix"` 连接到本地控制套接字； `"websocket"` 连接到 `url`。                                                                                                                                                                                                                                                                                                                                                             |
| `homeScope`                      | `"agent"`                                              | `"agent"` 根据 OpenClaw 代理隔离普通harness状态。 `"user"` 是一个显式选择加入，它共享本机 `$CODEX_HOME` 或 `~/.codex`、使用本机身份验证并启用仅限所有者的线程管理。用户范围支持本地 stdio 或 Unix 传输。对于单独的监控连接，未设置的值解析为 `"user"`（对于 stdio 或 Unix）和 `"agent"`（对于 WebSocket）。                                                                                  |
| `command`                        | 托管 Codex 二进制文件                                   | stdio 传输使用的可执行文件。留空则使用受管理的二进制文件。                                                                                                                                                                                                                                                                                                                                                                                                       |
| `args`                           | `["app-server", "--listen", "stdio://"]`               | stdio 传输使用的参数。                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `url`                            | 未设置                                                  | WebSocket 应用服务器 URL 或 `unix://` URL。空的显式 Unix 路径选择标准用户主控制套接字。                                                                                                                                                                                                                                                                                                                                                        |
| `authToken`                      | 未设置                                                  | WebSocket 传输的不记名令牌。接受文字字符串或 SecretInput，例如 `${CODEX_APP_SERVER_TOKEN}`。                                                                                                                                                                                                                                                                                                                                                           |
| `headers`                        | `{}`                                                   | 额外的 WebSocket 标头。标头值接受文字字符串或 SecretInput 值，例如 `x-codex-client-session-token: "${CODEX_CLIENT_SESSION_TOKEN}"`。                                                                                                                                                                                                                                                                                                            |
| `clearEnv`                       | `[]`                                                   | 在 OpenClaw 构建继承的环境后，从启动的 stdio app-server 进程中移除的额外环境变量名称。                                                                                                                                                                                                                                                                                                                                          |
| `remoteWorkspaceRoot`            | 未设置                                                  | 远程 Codex 应用程序服务器工作区根。 OpenClaw 将本地 cwd 映射到此根目录，并通过输出上限、无 shell `command/exec` 阅读器传输权威远程附件。转义工作区、符号链接、超大文件和无限制附件批次的路径将被拒绝；上传保留配置的通道标识和应用程序服务器请求超时。                                                                                     |
| `loopDetectionPreToolUseRelay`   | `true`                                                 | 当启用 OpenClaw 环路检测时，启用 Codex `PreToolUse` 继电器进行环路检测。当没有工具前插件挂钩、可信工具策略或已启用的循环检测器在本地工作时，OpenClaw 不会安装 `PreToolUse` 中继。设置`false`，即使在检测使能的情况下，也禁用环路检测继电器； before-tool 插件挂钩和可信工具策略仍然安装其所需的中继，以阻止错误调用。                                      |
| `requestTimeoutMs`               | `60000`                                                | app-server 控制平面调用的超时时间。                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `mode`                           | `"yolo"`，除非本地 Codex 要求不允许 YOLO | YOLO 或由 guardian 审核的执行预设。                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `approvalPolicy`                 | `"never"` 或允许的 guardian 审批策略       | 发送到 thread 启动、恢复和 turn 的原生 Codex 审批策略。                                                                                                                                                                                                                                                                                                                                                                                                         |
| `sandbox`                        | `"danger-full-access"` 或允许的 guardian 沙箱  | 发送到 thread 启动和恢复的原生 Codex 沙箱模式。启用的 OpenClaw 沙箱会将 `danger-full-access` turn 收窄为 Codex 的 `workspace-write`；turn 的网络标志遵循 OpenClaw 沙箱出口配置。                                                                                                                                                                                                                                                                    |
| `approvalsReviewer`              | `"user"` 或允许的 guardian 审核者               | 允许时，使用 `"auto_review"` 让 Codex 审核原生审批提示。                                                                                                                                                                                                                                                                                                                                                                                                |
| `defaultWorkspaceDir`            | 当前进程目录                              | 当省略 `--cwd` 时，`/codex bind` 使用的工作空间。                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `serviceTier`                    | 未设置                                                  | 当未提供共享快速模式控件时，本机应用程序服务器首选项。非空字符串通过；记录的值为 `"priority"` 和 `"flex"`。旧版 `"fast"` 标准化为 `"priority"`，并且 `null` 清除覆盖。本机 `"ultrafast"` 从 `priority` 开始，需要显式共享超快选择。共享快速发送 `priority`，关闭发送 `null`，自动根据呼叫决定。这不会配置直接嵌入的 OpenAI 请求。 |
| `enableUltrafast`                | `true`                                                 | 仅允许 `ultrafast` 用于显式共享 `"ultrafast"` 选择和公布的本机模型。未设置或 `true` 允许该选择； `false` 在 Codex 选择器中隐藏 Ultrafast，发送普通 Fast （`priority`） 进行显式选择，并跳过 Ultrafast 目录检查。快速、自动和未指定的选择永远不会自动升级。不受支持的模型和不可用的目录保留基线层。                                        |
| `networkProxy`                   | 已禁用                                               | 选择应用程序服务器命令的 Codex 权限配置文件网络。 OpenClaw 定义选定的 `permissions.<profile>.network` 配置，并使用 `default_permissions` 选择它，而不是发送 `sandbox`。                                                                                                                                                                                                                                                          |
| `experimental.sandboxExecServer` | `false`                                                | 预览选择加入，将 OpenClaw 沙箱支持的 Codex 环境注册到受支持的 Codex 应用程序服务器，以便本机 Codex 执行可以在活动的 OpenClaw 沙箱内运行。                                                                                                                                                                                                                                                                                         |

`appServer.args` 接受数组（推荐）或带引号的参数字符串。 `OPENCLAW_CODEX_APP_SERVER_ARGS` 在每个平台上使用相同的字符串解析：单引号和双引号将单词分组，反斜杠和 `#` 保持原义，未完成的引号将剩余文本分组。这保留了 `v2026.9.1` 中附带的字符串语法；字符串不使用 shell 转义。

对包含嵌入引号的值使用数组条目，例如 `'model="gpt-5.6-luna"'`。对于包含文字反斜杠的目录，以下两种形式将相同的路径传递给 Codex：

```json5 validate=false
args: "app-server --listen stdio:// -c log_dir=/tmp/openclaw\\logs"
```

```json5 validate=false
args: ["app-server", "--listen", "stdio://", "-c", "log_dir=/tmp/openclaw\\logs"]
```

JSON5 中的 `\\` 编码一个反斜杠。数组条目保留嵌入的引号和反斜杠，但周围的空格被修剪，空条目被省略。字符串还省略空的带引号的参数。在将现有字符串转换为数组之前，请考虑这些限制。

`appServer.serviceTier` 仅在未提供共享快速模式运行控制时使用。在 Codex harness转弯时，共享 Fast on 从 `priority` 开始，Fast off 发送 `null` 以清除 OpenClaw- 拥有的层​​，并自动决定每个模型调用。 `/codex fast off` 是独立的：它将 `flex` 保留在绑定本机对话首选项中以供以后的对话绑定轮流使用，并且不会更改共享的 OpenClaw 会话策略。这些值描述本机配置和首选项状态，而不是观察到的提供者路由。

超快需要 `"ultrafast"` 的有效共享快速模式选择。在 Control UI 中选择它，使用 `/fast ultrafast`，在会话或运行控件中提供 `fastMode: "ultrafast"`，或在配置中编写 `fastModeDefault: "ultrafast"`。未设置的 `appServer.enableUltrafast` 或 `true` 允许进行此显式选择。设置 `appServer.enableUltrafast: false` 以在选择器中隐藏 Codex 运行时的 Ultrafast。即使已保存或显式 Ultrafast 选择也会发送普通 Fast （`priority`） 并跳过 Ultrafast 目录检查。

只有启用开关的显式超快选择才会通过该回合经过身份验证的 Codex 应用程序服务器连接检查所​​选本机模型的 `serviceTiers`。目录不公布层的模型、自定义模型提供程序和不可用的目录将回退到快速 （`priority`）。本机目录可以包含脱机后备元数据，因此此轮换检查不会建立帐户权利。 Control UI 在显示超快之前需要单独的经过身份验证的帐户发现证据。保存的首选项并不能保证上游层会尊重该请求。

快速 （`true`）、活动自动和未指定的共享运行控件永远不会自动升级或执行超快目录查找。他们保留其基线等级（`priority` 表示快速或主动自动）；本机 `serviceTier: "ultrafast"` 也从 `priority` 开始，直到共享选择明确请求 Ultrafast。标准 （`false`） 和不活动的自动保持关闭状态。

`appServer.networkProxy` 是显式的，因为它更改了 Codex 沙箱合约。启用后，OpenClaw 还会在 Codex 线程配置中设置 `features.network_proxy.enabled` 和 `default_permissions`，以便生成的权限配置文件可以启动 Codex- 托管网络。 OpenClaw 默认从配置文件主体生成防碰撞的 `openclaw-network-<fingerprint>` 配置文件名称；仅当需要稳定的本地名称时才使用 `profileName`。

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
            },
          },
        },
      },
    },
  },
}
```

不在有效本机允许列表中的主机将被拒绝。该示例的 `approvalPolicy: "never"` 防止基于批准的异常；本机系统要求仍然可以贡献允许的域。这些限制适用于 Codex 沙箱命令。请参阅 [ 网络代理配置参考](/plugins/codex-harness/config-fields)，了解更新后空白可选字段的匹配、策略继承、范围和显式医生修复。

如果正常的应用程序服务器运行时为 `danger-full-access`，则启用 `networkProxy` 会使用工作区样式的文件系统访问来访问生成的权限配置文件。 Codex- 托管网络实施是沙盒网络，因此完全访问配置文件不会保护出站流量。

该插件附带稳定的 Codex 应用程序服务器 `0.162.0`，并且仅在 [ 较新安装的 Codex](#newer-installed-codex) 中的规则下更喜欢较新安装的 Codex。显式自定义可执行文件、远程应用程序服务器和 macOS 桌面二进制文件必须报告 `0.149.0` 或更高版本的可解析语义版本。较旧的、格式错误的和未版本化的握手将被拒绝。较新的版本会记录兼容性警告，并继续进行正常的运行时和功能验证。

OpenClaw 将非环回 WebSocket 应用程序服务器 URL 视为远程，并需要通过 `appServer.authToken` 或 `Authorization` 标头进行身份承载 WebSocket 身份验证。 `appServer.authToken` 和每个 `appServer.headers.*` 值可以是 SecretInput；在 OpenClaw 构建应用程序服务器启动选项之前，秘密运行时会解析 SecretRefs 和 env 简写，并且在发送任何令牌或标头之前未解析的结构化 SecretRefs 会失败。

配置本机 Codex 插件时，OpenClaw 会缓存一个运行时和工作空间范围的 `plugin/installed` 快照。此快照涵盖了来自 Codex- 发现的市场的已安装插件，包括禁用的所有权； `plugin/read` 仅解析精确配置的插件标识。失败或不完整的安装快照永远不会被缓存。 `/codex plugins available` 查询 `plugin/list` 的当前对话工作区，而 `/codex plugins install <plugin>@<marketplace>` 仅在所有者或 `operator.admin` 明确授权该插件后安装。现有的显式配置的精选插件保留其自动恢复路径。该模型的插件发现工具无法安装、启用或验证插件。

`app/installed` 报告已安装的应用程序运行时状态，`app/read` 每次调用返回最多 100 个请求的应用程序 ID 的经过身份验证的元数据。 OpenClaw 强制刷新第一个冷安装快照，并将成功的策划安装整合到一次应用程序清单刷新中。稍后缓存的读取不会强制重复连接器刷新。

默认情况下拒绝 Codex 应用程序策略是按线程进行评估的，因此可以在明确允许的应用程序可调用之前对其进行安装和身份验证。 OpenClaw 暂时只允许经过所有权验证、策略批准的应用程序，使用 `_default.enabled = false` 和显式应用程序覆盖创建线程，然后使用该线程的 ID 和 `forceRefresh: false` 调用 `app/installed` 一次。如果该快照报告丢失、禁用或不可调用的应用程序，OpenClaw 会记录一个警告并继续使用其余工具。 Codex 仍强制执行托管限制、工作区策略和 app/tool 权限；不可用的应用程序无法访问。

检查在 OpenClaw 注入历史记录、开始轮次或保留本机线程绑定之前完成。如果快照请求失败，OpenClaw 将删除 `thread/delete` 的持久临时线程或取消订阅 `thread/unsubscribe` 的临时线程。如果无法确认安全清理，则会终止所属的应用程序服务器连接。受监督的分支还会清理其临时检查并在清理失败时保留恢复状态。

使用 `allow_all_plugins`，显式禁用的配置工作区插件仍然拒绝其拥有的应用程序。当 `app/read` 未公开该所有权时，OpenClaw 使用其 `plugin/installed` 快照并仅读取确切配置的插件详细信息以保留被拒绝的应用程序 ID。它不会扫描不相关的市场或安装、启用或验证禁用的插件；缺少所有权会阻止帐户范围的访问。

仅将 OpenClaw 连接到受信任的 `0.149.0` 或较新的远程应用程序服务器，以接受配置的市场插件安装和库存刷新。缺少现代库存方法和服务器、身份验证或传输故障会阻止请求。

## <a id="environment-overrides"></a> 环境覆盖

本地测试仍然可以使用环境覆盖：

- `OPENCLAW_CODEX_APP_SERVER_BIN`
- `OPENCLAW_CODEX_APP_SERVER_ARGS`
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

当 `appServer.command` 未设置时，`OPENCLAW_CODEX_APP_SERVER_BIN` 会绕过托管二进制文件。

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 在 2026.4.22. 中被删除使用 `plugins.entries.codex.config.appServer.mode: "guardian"` 代替，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。 Config 是可重复部署的首选，因为它将插件行为保留在与 Codex harness设置的其余部分相同的审查文件中。
