---
summary: "应用程序-服务器传输、审批姿势、授权顺序和环境隔离"
read_when:
  - "您正在选择应用程序服务器传输或批准姿势"
  - "您需要 Codex 授权选择订单"
  - "您正在隔离 Codex 应用程序服务器环境"
title: "Codex 应用程序服务器策略"
sidebarTitle: "应用程序服务器策略"
---

OpenClaw 如何启动和验证 Codex 应用程序服务器，以及它与操作员环境隔离的内容。 [Codex harness](/plugins/codex-harness) 指南的一部分； [ 每个部分移动的位置](/plugins/codex-harness#where-each-section-moved) 列出每个部分。

## <a id="app-server-policy"></a> App-server 策略

默认情况下，该插件使用 stdio 传输在本地启动 OpenClaw 的托管 Codex 二进制文件。仅设置 `appServer.command` 来有意运行不同的可执行文件。已验证的安装接受本机 Codex 可执行文件或官方 `@openai/codex` npm 入口点，包括其安装的符号链接或 Windows npm 启动程序。无法验证任意包装脚本，因为它们的本机目标未知；选择本机可执行文件或官方 npm 启动器。 `app-server proxy` 也无法提供经过验证的设置，因为其本地可执行文件仅将请求转发到单独的守护程序。 Codex 将 WebSocket 传输分类为实验性且不受支持；仅将其用于针对已在其他地方运行的应用程序服务器的非生产测试：

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
          },
        },
      },
    },
  },
}
```

Ask OpenClaw 可以通过显式配置的 WebSocket 或 Unix 套接字应用服务器来验证已配置的模型。初始 Codex 设置和登录流程仍然需要本地 stdio；在使用此验证路径之前，请在远程主机上完成登录并配置远程端点。远程验证绑定选定的端点、连接凭据和初始化的 Codex 身份。它信任已配置的服务；它不证明远程可执行文件的字节。 OpenClaw 在重用之前重新检查连接选择，并在启动线程之前比较新连接上的初始化标识。端点、凭证、版本或报告的 Codex home/platform 更改需要新的推理验证。模型、身份验证、托管需​​求和工具策略检查仍然适用。

WebSocket 传输会在网关启动时主动建立与 app-server 的连接，并将打开握手限制为 10 秒。空闲连接每 20 秒发送一次 WebSocket ping，并为匹配的 pong 等待 20 秒。健康的 app-server 消息或 pong 会重置未收到心跳的计数；连续五次未收到 pong 将关闭连接。临时故障会通过有界且带抖动的指数退避自动重连。身份验证失败和不受支持的 app-server 版本会停止重连，并报告需要操作员介入。Ping 和 pong 帧是传输层健康检查：它们不会启动 Codex 轮次，也不会调用模型。本地 stdio 和 Unix 传输不会执行这些远程连接检查。

当调用者在远程替换期间需要连接时，获取在调用者的超时和取消范围内最多进行 3 次连接尝试。这仅适用于 WebSocket 从未打开的情况，因此没有缓冲的初始化帧到达服务器。身份验证和证书错误立即失败。此恢复不会重放打开的连接上的请求，包括模型转动和工具执行。

WebSocket 和 Unix 套接字关闭在连接关闭时解决，包括服务器首先断开连接时。如果对等方无法完成关闭握手，则 OpenClaw 在关闭截止时间终止其套接字。关闭的连接并不证明远程应用程序服务器上的工作已停止。

本地 stdio app-server 会话默认采用受信任的本地操作员姿态：`approvalPolicy: "never"`、`approvalsReviewer: "user"` 和 `sandbox: "danger-full-access"`。如果本地 Codex 要求不允许这种隐式的 YOLO 姿态，OpenClaw 会改为选择允许的 guardian 权限。当会话启用了 OpenClaw sandbox 时，OpenClaw 会在该轮次中禁用 Codex 原生 Code Mode、用户 MCP 服务器和基于 app 的插件执行，而不是依赖 Codex 主机侧的 sandbox。相应地，当常规 exec/process 工具可用时，Shell 访问会通过由 OpenClaw sandbox 支持的动态工具（例如 `sandbox_exec` 和 `sandbox_process`）进行。

在沙箱逃逸或额外权限之前，使用标准化 OpenClaw 执行模式进行 Codex 本机自动审查：

```json5
{
  tools: {
    exec: {
      mode: "auto",
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

对于 Codex app-server 会话，`tools.exec.mode: "auto"` 会映射为经过 Codex Guardian 审核的批准： 在本地要求允许这些值时，通常是 `approvalPolicy: "on-request"`、 `approvalsReviewer: "auto_review"`，以及 `sandbox: "workspace-write"`。 在 `tools.exec.mode: "auto"` 下，OpenClaw 不会保留旧版不安全的 Codex `approvalPolicy: "never"` 或 `sandbox: "danger-full-access"` 覆盖；如果有意采用无需批准的 Codex 姿态，请使用 `tools.exec.mode: "full"`。旧版 `plugins.entries.codex.config.appServer.mode: "guardian"` 预设仍然可用， 但 `tools.exec.mode: "auto"` 才是规范化的 OpenClaw 接口。

关于该模式与主机 exec 批准及 ACPX 权限的对比，请参见 [权限模式](/tools/permission-modes)。关于所有 app-server 字段、认证顺序、环境隔离和超时行为， 请参见 [Codex harness 参考](/plugins/codex-harness-reference)。

### <a id="native-approval-audit-evidence"></a> 本机审批审核证据

借助 `tools.exec.mode: "ask"` 和 Codex 用户审阅者，本机命令和文件提示使用 OpenClaw 的两阶段操作员批准路径。提示仅显示本机请求可以保留的决策。仅具有一次性本机决策的命令提供一次允许和拒绝；字节绑定脚本的批准也仍然是一次性的。文件提示支持一次性批准和会话批准。对于命令，当 Codex 提供会话信任时，“允许始终”会使用会话信任。否则，当提示可以显示确切的命令前缀或网络主机及其在未来会话中的范围时，它可以请求持久的本机允许规则。 Codex 拥有应用并保存该规则；批准事件报告所请求的修改，而不是确认它已保存。自动命令和文件批准仍然是一次性的，并且永远不会选择持久的策略修订。

如果另一个连接的 Codex 客户端回答本机批准请求，则 OpenClaw 会忽略匹配的待处理提示，而不发送第二个答案或将该解决方案视为超时或工具故障。

终端操作员决策重用网关的权威批准行及其确切的执行绑定。启用执行身份收集后，使用 [`openclaw audit --run <run-id> --explain`](/cli/audit) 检查已许可的运行。生成的收据可以报告一次允许、始终允许、拒绝、无路由、过期或取消，而无需暴露命令文本、补丁内容、路径或本机请求 ID。

Codex 自动审查、完全访问策略和本机挂钩或 OpenClaw 策略决策不会创建操作员审批行。丢失或过时的本机轮次上下文在路由之前会被拒绝。因此，这些情况不会产生强制运营商批准收据；审计检查不会从后来的工具事件中重建一个。

## <a id="auth-order"></a> 授权订单

在默认的按 agent 划分的 home 中，认证按以下顺序选择：

1. 为代理订购 OpenAI 身份验证配置文件，最好在 `auth.order.openai` 下。运行 `openclaw doctor --fix` 以迁移旧版 Codex 身份验证配置文件 ID 和旧版 Codex 身份验证顺序。
2. 该 agent 的 Codex home 中 app-server 现有的账户。
3. 仅对于本地 stdio app-server 启动，在没有 app-server 账户且仍然需要 OpenAI 认证时，依次使用 `CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

当 OpenClaw 看到 ChatGPT 订阅式 Codex 身份验证配置文件时，它会从生成的 Codex 子进程中删除 `CODEX_API_KEY` 和 `OPENAI_API_KEY` 。这使得网关级 API 密钥可用于嵌入或直接 OpenAI 模型，而不会使本机 Codex 应用程序服务器意外地通过 API 转帐。显式 Codex API-key 配置文件和本地 stdio env-key 后备使用应用程序服务器登录而不是继承的子进程环境。 WebSocket 应用程序服务器连接不接收网关环境 API-key 回退；使用显式身份验证配置文件或远程应用程序服务器自己的帐户。

当在隔离代理主目录中未选择 OpenAI 配置文件时，模型发现使用相同的本地 stdio 环境密钥回退。更改环境密钥后刷新发现会获取新密钥的客户端。本机用户家庭和远程应用程序服务器保留自己的身份验证。 Discovery 不会从运营商的本机 Codex 身份验证文件导入 API 密钥。

如果订阅配置文件遇到 Codex 使用限制，OpenClaw 会在 Codex 报告重置时间时记录该时间，并为同一次 Codex 运行尝试下一个按顺序排列的认证配置文件。 当重置时间过去后，该订阅配置文件会再次具备资格，而无需更改所选的 `openai/gpt-*` 模型或 Codex 运行时。

当 Codex 报告普通使用情况可用或未知时，耗尽的使用百分比不会使模型进入冷却。已知耗尽的配额仍然可以提供预定的重置提示；该提示并不保证可续订。特定于功能的重置与普通帐户权限保持独立。

配置本机 Codex 插件时，OpenClaw 会读取并缓存一份运行时和工作空间范围的 `plugin/installed` 快照。该快照涵盖了来自 Codex- 发现的市场的已配置插件，包括禁用的插件所有权。 `plugin/read` 仅解析显式配置的插件详细信息。 `/codex plugins available` 使用绑定的工作空间查询 `plugin/list`，而 `/codex plugins install <plugin>@<marketplace>` 是所有者或管理员授权的安装路径。常规线程设置保留现有的显式配置的策划插件恢复。

`app/installed` 提供已安装的应用程序运行时快照，`app/read` 批量提供最多 100 个应用程序 ID 的经过身份验证的应用程序元数据。 OpenClaw 强制刷新一次冷快照，并将成功的策划安装整合到一次应用程序清单刷新中。普通缓存读取不会强制每个线程刷新连接器。

授权应用程序最初可能会显示为禁用或不可调用，因为 Codex 尚未应用目标线程的限制性应用程序配置。 OpenClaw 暂时只允许明确允许的、经过所有权验证的应用程序，使用 `_default.enabled = false` 启动线程，并使用该线程的 ID 和 `forceRefresh: false` 读取 `app/installed` 一次。丢失、禁用或不可调用的应用程序会产生一个警告，而不会阻止不相关的聊天或心跳运行。 Codex 仍强制执行 app/tool 权限、托管限制和工作区策略；继续对话不会启用不可用的应用程序。

该检查在 OpenClaw 开始转动或提交线程绑定之前运行。如果快照请求失败，则删除持久临时线程并取消订阅临时线程。如果无法确认清理，OpenClaw 会停用应用程序-服务器连接，而不是重用不安全的线程。

整个账户范围的应用访问权限永远不会覆盖显式禁用的已配置工作区插件。当 `app/read` 省略该插件的归属信息时，OpenClaw 会使用 `plugin/installed` 快照，并且只读取完全匹配的已配置插件的详情，以继续拒绝其应用访问。此检查绝不会安装、启用或验证该插件。

OpenClaw 不会安装未知应用程序或让模型授权安装新插件。所有者批准的插件安装会刷新目标运行时清单。缺少清单方法、身份验证错误、传输失败和连接器刷新失败会阻止请求。

## <a id="scheduled-app-authority"></a> 预定应用权限

当 Codex 创建者轮次捕获计划的应用程序权限时，没有显式 `toolsAllow` 列表的自动化将保存该轮次的可调用工具和应用程序策略。通过准备好的 ChatGPT 配置文件，计划的应用程序访问仍然绑定到该确切的配置文件和帐户。如果没有准备好的配置文件，代理范围内配置的 WebSocket 应用程序服务器通过其连接指纹拥有计划。对另一个帐户重新验证同一端点不会撤销计划：后续运行使用端点的当前帐户，并受捕获的应用程序上限和当前 app/tool 策略的约束。预定授权机构不存储或重放身份验证凭据。

计划的应用程序批准上限保留本机工具覆盖以及每个工具识别的帐户的批准策略。对于调用时选择帐户的工具，共享工具上限使用配置的帐户和默认策略的最严格组合。即使一个帐户自动允许该操作，此类工具也可能需要跨帐户批准。

删除或取消配置端点、更改其连接指纹或更改其捕获的托管需求会在应用程序执行之前拒绝运行。该作业仍然可以检查，但自动化运行历史记录及其上次运行状态存在错误；正常的故障退避仍然适用。恢复授权连接或从新的经过身份验证的所有者轮流重新创建自动化。删除对捕获的应用程序的访问权限的帐户更改也会明显失败。

在回滚到没有配置端点权限和 cron 权限水合作用的构建之前，请使用 `openclaw automations disable <id>` 禁用这些作业，并使用 `openclaw automations list --all` 验证它们。不要依赖旧的二进制文件来强制执行新的权限信封。保持作业禁用，直到您返回支持版本或在该版本支持的身份验证路径下重新创建它们。有关运行历史记录和故障处理，请参阅 [Automations](/automation/cron-jobs)。

## <a id="environment-isolation"></a> 环境隔离

对于本地 stdio 应用程序服务器启动，OpenClaw 将 `CODEX_HOME` 设置为每个代理目录，因此默认情况下 Codex 配置、auth/account 文件、插件 cache/data 和本机线程状态不会读取或写入操作员的个人 `~/.codex`。 OpenClaw 保留正常进程`HOME`； Codex-run 子进程仍然可以找到用户主目录配置和令牌，并且 Codex 可能会发现共享的 `$HOME/.agents/skills` 和 `$HOME/.agents/plugins/marketplace.json` 条目。对于 `appServer.homeScope: "user"`，OpenClaw 使用本机用户 Codex home 及其现有帐户，而不注入 OpenClaw 身份验证配置文件。用户主 stdio 或 Unix 连接上的标准 `openai/*` 聊天还​​保留本机配置的模型提供程序；选择带有标准 OpenClaw 模型参考的模型。显式非 OpenAI 提供程序保持显式。准备好的路由兼容性和 subscription/API-key 帐户检查仍然适用。

拥有的本地 stdio 进程使用 [agent Git 维护默认值 ](/concepts/managed-worktrees)。 OpenClaw 保留不相关的本机 Git 参数和 shell 环境策略。继承的 Git 参数保留在私有进程环境中，而不是复制到本机线程配置中。清除它们会删除继承的值，同时保留主机的维护默认值。外部应用程序服务器对等点和远程执行保留自己的环境策略。

如果部署需要额外的环境隔离，请将这些变量添加到 `appServer.clearEnv`：

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

`appServer.clearEnv` 仅影响生成的 Codex 应用程序服务器子进程。 OpenClaw 在本地启动规范化期间从此列表中删除 `CODEX_HOME` 和 `HOME`：`CODEX_HOME` 保持指向所选代理或用户范围，而 `HOME` 保持继承状态，因此子进程可以使用正常的用户主状态。

经过验证的本地设置还证明了所选的 Codex 启动器和软件包。继承的 `NODE_OPTIONS` 可能包含有界资源、警告、DNS 结果顺序、网络系列自动选择、环境代理和 CA- 源选项，因为这些设置无法预加载代码或更改模块分辨率。例如，`--dns-result-order=ipv4first --no-network-family-autoselection` 是允许的。格式错误或未知的选项以及代码加载选项（例如 `--require` 或 `--import`）将被拒绝。如果 Codex 不需要继承的选项，请删除 `NODE_OPTIONS` 和 `appServer.clearEnv`。

## <a id="local-testing-env-overrides"></a> 本地测试环境覆盖

- `OPENCLAW_CODEX_APP_SERVER_BIN` 在 `appServer.command` 未设置时会绕过受管二进制文件。
- `OPENCLAW_CODEX_APP_SERVER_ARGS` 接受带引号的参数字符串；参见[参数解析](/plugins/codex-harness-reference#app-server-transport)。
- `OPENCLAW_CODEX_APP_SERVER_MODE=yolo|guardian`
- `OPENCLAW_CODEX_APP_SERVER_APPROVAL_POLICY`
- `OPENCLAW_CODEX_APP_SERVER_SANDBOX`

`OPENCLAW_CODEX_APP_SERVER_GUARDIAN=1` 在 2026.4.22. 中被删除使用 `plugins.entries.codex.config.appServer.mode: "guardian"` 代替，或使用 `OPENCLAW_CODEX_APP_SERVER_MODE=guardian` 进行一次性本地测试。 Config 是可重复部署的首选，因为它将插件行为保留在与 Codex harness设置的其余部分相同的审查文件中。
