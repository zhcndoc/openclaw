---
summary: "CLI `openclaw status` 参考（诊断、检查、使用快照）"
read_when:
  - "你想快速诊断通道健康状况 + 最近的会话接收者"
  - "你想要一个可直接粘贴的“all”状态用于调试"
title: "开爪状态"
---

通道 + 会话的诊断。

任务计数和审核总计使用只读元数据摘要。不会为每个状态请求加载保留的任务有效负载和传递历史记录，并且重叠请求共享挂起的摘要读取。数据库工作在共享 SQLite 工作线程上运行；实时任务所有权仍由网关检查。这些摘要并不是完整的物理数据库完整性检查。完全恢复注册表，Doctor 保留其完整性验证。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
openclaw status --all --usage
openclaw status --usage --agent work
```

| 标志                    | 描述                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--all`                 | 完整诊断（只读，可粘贴）。包括安全审核、插件兼容性和内存向量检查。 |
| `--deep`                | 请求通道运行状况（支持实时检查）。还可以启用安全审核。                         |
| `--usage`               | 以 `X% left` 的形式输出标准化的提供商使用情况窗口。                                                          |
| `--agent <id>`          | 为 `--usage` 选择代理 auth/profile 范围。当显式多代理队列没有默认值时需要。 |
| `--json`                | 机器可读输出。                                                                                        |
| `--timeout <ms>`        | 检查超时以毫秒为单位（默认值：`60000`）。                                                               |
| `--verbose` / `--debug` | 在报告之前同时输出原始网关目标解析结果。                                                 |

当命令开始时，状态会启动一个单调检查截止时间。本地准备情况、网关状态、提供商使用情况和深度健康状况会消耗剩余的配额。远程目标和显式网关 URL 会跳过本地准备工作，但保持相同的截止日期。本地检查报告等待时观察到的启动阶段。如果预算到期时网关仍在启动，状态报告“仍在启动”而不是无法访问，并跳过深度通道检查。 JSON 保留状态报告并添加 `gateway.readiness: "still-starting"` 和 `gateway.startupPhase`。明确的 `--timeout` 限制了共享限额。

当不存在匹配的网关服务或实时前台所有者且其端口空闲时，直接检查状态而不是等待网关启动。因此，仅限本地的代理环境会立即报告不可用的网关。积极识别为另一个进程的侦听器报告与诊断指导的端口冲突，而不是等待准备预算。未知的侦听器属性可保持启动正常。观察到的启动迁移在向网关所有权的移交过程中保留了启动的优雅性；无法验证的所有权也保留了这种恩典。锁定和本机进程检查消耗相同的剩余检查余量。

没有检查的通道（例如 WhatsApp）会报告生命周期运行状况。 Health表中，`healthy`为`OK`；降级的生命周期状态和失败的检查仍然是 `WARN`。生命周期 `OK` 并不意味着运行了实时检查。

更新运行行保留最后记录的更新结果。当本地网关通过当前准备情况和连接检查并且其服务版本与记录的更新目标匹配时，先前的故障将被标记为历史：当目标和实时检查都公开它们时，`Last update run failed (post-update-failed) — Gateway is serving 2026.9.7; run openclaw update to clear the record.` 构建 ID 也必须匹配。健康的旧版本、不同的版本或未知的身份会保留警告及其记录的故障详细信息，以及已知的服务版本和目标版本。回滚和恢复观察本身无法确定预期的候选者身份。当无法验证预期的候选版本时，同一版本回滚会保持警告。从未选择目标的失败运行（例如未记录目标版本、SHA、标记或更新后身份的预检拒绝）也会被标记为历史，一旦网关提供与该失败时保存的正在运行的网关观察不同的版本或构建：`Last update run failed (preflight-no-good-commit) — Gateway is now serving 2026.10.1; recorded serving identity was 2026.9.4.` 仅安装的软件包身份无法建立此更改：当更新失败时，它可能已经领先于正在运行的网关。与旧安装的软件包匹配的恢复检查不会建立更新目标。如果没有保存的服务身份，警告仍然存在。具有明确目标的运行遵循上述规则。状态不会重写失败的运行或声明更新成功。正在启动、无法访问、降级和远程网关不符合本注释的条件。使用`openclaw update status`查看保存的验证失败信息。

`--deep` 还会询问正在运行的网关是否可以启动它仍然保留的 Node 可执行文件。 Homebrew 升级可以删除该 Cellar 路径，而 LaunchAgent plist 仍指向有效的符号链接并且网关端口保持可访问。然后状态警告：

```text
Gateway runtime is stale after Node upgrade: child workers are using <path>, which no longer exists. Restart the Gateway.
```

该检查不会重新启动网关。出现警告后运行 `openclaw gateway restart`。当旧的可执行文件消失时，Exec 和 stdio MCP 命令继电器可以使用稳定的 Homebrew Node 路径。需要网关精确运行时间的工作人员仍然需要重新启动；失败的主管或经纪人启动会报告相同的警告。

`--deep` 和 `--all` 还显示针对死信消息和压力入站通道的传递队列警告。即使通道连接正常，这些警告也包括待处理、已声明和已阻止的消息计数。请参阅 [ 队列警告](/gateway/health#queue-warnings)。

普通 `openclaw status` 停留在快速只读路径上，并在跳过内存检查时将内存标记为 `not checked`，而不是不可用。严格的安全审核、插件兼容性和内存向量检查留给了 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。

本地代理所有权检查从一个一致的 SQLite 快照读取架构和所有者元数据，包括已提交的 WAL 更改。它们不会复制整个代理数据库，除非其日志状态需要私有恢复。启动和迁移准备情况检查保留其完整验证。

CLI 在单独的进程中运行，并通过 WebSocket 联系网关，即使对于本地环回目标也是如此。 `--timeout` 边界检查，而不是整个状态命令。冷设备令牌工作线程初始化发生在请求准备期间，RPC 超时开始之前；连接令牌读取保持最新。将 `openclaw gateway call status --json` 与 `openclaw status --json` 进行比较，以将网关响应与本地报告收集​​分开。网关 [Prometheus RPC 计时](/gateway/prometheus) 不包括 CLI 启动和连接设置；慢速 CLI 可以在没有慢速网关处理程序的情况下完成。

当网关可访问并获得授权时，`status --json` 使用其状态投影，而不是在本地扫描每个代理的插件元数据和数据库所有权。网关提供会话计数、心跳和任务状态、运行时生命体征以及座席名册事实。该请求保留 `operator.read` 范围，包括会话路径、最近会话、模型默认值和详细的准入拒绝的编辑。网关水合物理会话存储后，干净的重复状态读取将重用其驻留的物化会话行；仅拓扑更改以及脏或丢失的精确身份返回到现有只读 SQLite 路径。

JSON `collection.notCollected` 列出了未检查的字段并解释了原因。在线状态使工作区和引导程序检查未知，包括 `agents.bootstrapPendingCount: null`。它返回`channelSummary: []`而不加载通道插件，并将`channelSummary`记录在`collection.notCollected`中。那里的空列表意味着未收集该字段，而不是没有配置任何通道。使用 `openclaw channels status` 进行配置的库存，或使用 `openclaw channels status --probe` 进行真实账户检查。在线状态跳过本地配置验证、通道和内存凭证检查以及 `--all` 或 `--deep` 通常请求的本地插件检查。要求安全审计和插件兼容性部分报告`collected: false`；内存仍然是`null`。使用 `openclaw security audit`、`openclaw plugins inspect --all` 或 `openclaw memory status --deep` 进行本地检查。 `--deep` 仍然请求网关运行状况，并且 `--usage --agent <id>` 保留其凭证范围。当网关不可用时，JSON 状态保留本地诊断。

对于 Git 安装，纯状态会比较缓存的远程跟踪引用，而无需网络获取。如果最新记录的更新提取失败并且后续更新运行没有记录已完成的提取，则更新行将显示 `update check stale: last update fetch failed 5m ago (network error)` 而不是 `up to date`，其中 ahead/behind 计数标记为 `cached`。 JSON 在 `update.git.stale`（`reason`、`failedAtMs`、`detail` 和 `runId`）下公开此内容，并将 `update.git.countsCached` 设置为 `true`。如果没有记录获取失败，通常的缓存比较不会改变。历史记录属于当前状态目录。即使更新的其余部分被跳过、失败或回滚，稍后完成其提取的运行也会清除警告。手册`git fetch`不会清除记录的警告。使用 `openclaw update status` 进行全新检查并运行最后一次更新，或再次运行 `openclaw update`。 `openclaw status --deep` 也获取该支票；它不会改变分类账。参见[发布渠道](/install/development-channels#checking-current-status)。

## <a id="status-timing"></a> 状态时序

使用现有的诊断时间线来定位在网关 RPC 之外花费的时间：

```bash
OPENCLAW_DIAGNOSTICS=timeline \
OPENCLAW_DIAGNOSTICS_TIMELINE_PATH=/tmp/openclaw-status-timeline.jsonl \
  openclaw status --json
```

时间线包括配置和秘密解析、代理准入、本地会话读取、网关检查和摘要收集。持续时间包括等待；并行阶段重叠，不应添加在一起。

## <a id="skills-diagnosis"></a> 技能诊断

`status --all` 报告符合条件的技能以及缺少技能行中显示的工作区先决条件的技能。缺少的先决条件使用与 `openclaw skills check` 相同的类别：故意禁用的技能和被捆绑许可列表阻止的技能被排除在外；代理白名单排除保持独立。尽管 Doctor 不会因 OS 不兼容而禁用技能，但未满足的 OS 要求也包含在此计数中。使用 `openclaw skills check --agent <id>` 检查缺失的需求。

## <a id="session-and-model-resolution"></a> 会话和模型解析

- 会话状态输出将`Execution:`与`Runtime:`分开。 `Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉您会话是否使用 `OpenClaw Default`、`OpenAI Codex`、CLI 后端或 ACP 后端，例如`codex (acp/acpx)`。请参阅 [Agent 运行时](/concepts/agent-runtimes) 了解 provider/model/runtime 的区别。
- `/status`聊天命令显示`Endpoint`：上游基地URL来自相同准备的model/auth用于选择路线的决定。它描述当前选择，而不是先前的请求或计费归属。 URL 是 API 底座； Transport在发送请求时添加`/responses`等操作路径。没有已解析端点的路由显示 `unknown`。显示的 URL 省略了用户信息、查询参数和片段；自定义路径被隐藏。
- 当当前会话快照稀疏时，`/status` 聊天命令（请参阅 [Slash 命令](/tools/slash-commands)）可以从最近的转录本使用日志中回填令牌和缓存计数器。现有的非零实时值仍然胜过转录后备值。
- 转录回退还可以在实时会话条目缺少它时恢复活动运行时模型标签。如果该转录模型与所选模型不同，状态会针对恢复出的运行时模型而不是所选模型来解析上下文窗口。
- 对于提示词大小统计，当会话元数据缺失或更小时，转录回退会优先采用更大的面向提示词的总量，因此自定义提供方会话不会显示为 `0` token。
- 当会话被固定到一个与已配置主模型不同的模型时，状态会同时打印两个值、原因（`session override`）以及提示 `/model default`。已配置的主模型适用于新的或未固定的会话；现有已固定会话会保留其会话选择，直到被清除。
- 当配置了多个代理时，输出会包含每个代理的会话存储。
- Fleet 状态在没有系统代理所有者的情况下也有效。待处理事件包括每个代理的主队列；共享全局队列只计数一次。 `--agent` 仅选择 `--usage` 的凭证。

## <a id="usage-and-quota"></a> 用量和配额

- `--usage` 将规范化的提供商使用窗口打印为 `X% left`。它还为 `--all` 添加了使用情况快照； `--agent` 保持相同的仅限使用范围。使用检查接收剩余的共享检查预算，设置时上限为 `--timeout`；超出该限制的提供商会在使用输出中报告 `Timeout`。耗尽预算报告 `Timeout`，但未启动提供商身份验证或使用请求。过期会取消活动的使用请求，并防止迟到的身份验证结果启动另一个请求；已完成的提供者快照仍然可用。
- 在显式多代理设置中，`--usage` 默认读取 `agents.defaults.systemAgent.agentId` 拥有的身份验证配置文件。通过`--agent <id>`检验另一智能体；如果没有任何一个所有者，OpenClaw 不会从不明确的名册中猜测一个特工的凭据。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度， 因此 OpenClaw 会在显示前将其反转；当存在基于计数的字段时，它们优先。 `model_remains` 响应会优先选择 chat-model 条目，在需要时根据时间戳推导窗口标签，并将模型名称包含在计划标签中。
- 模型定价刷新失败会显示为可选的定价警告。 这并不意味着 Gateway 或通道不健康。

## <a id="overview-and-update-status"></a> 概览和更新状态

网关服务行将其安装的软件包与活动的 CLI 进行比较。如果它们解析为不同的安装，状态名称将包括包路径和版本。当允许服务安装时，它会推荐 `openclaw doctor --fix` 或 `openclaw gateway install --force`，或者报告安装所有者拒绝。当网关连接失败（包括协议不匹配）时，此本地诊断仍然可用。 JSON 将比较公开为 `gatewayService.installationDrift`。如果本地会话状态需要 Doctor，则状态会将任何安装偏差与原始错误一起打印到 stderr，并保留失败退出状态。

- **Sessions** 概述对存储的对话行（包括存档的行）进行计数。运行轮次和最近的活动与此库存分开。
- Overview 包括网关 + 节点主机服务 install/runtime 状态（如果可用），以及紧凑的网关进程正常运行时间和主机系统正常运行时间。
- `status --all` 在 **Gateway self** 中显示返回的主机、IP、版本和平台。仅当这些字段不可用时，它才使用 `unknown`。
- 在Linux上，当服务管理器不可用时，可读的已安装节点服务仍保持列出状态；它的运行时状态仍然未知。
- 概览包括更新渠道 + git SHA（对于源代码检出）。
- 更新信息会显示在概览中；如果有可用更新，状态信息会提示运行 `openclaw update`（参见[更新](/install/updating)）。
- `status` 和 `status --all` 在 **Update** 中保持当前可用性，并在 **Update run** 中分别显示活动或最近的更新历史记录。除非将同一运行命名为 ID，否则不同的 **Update restart** 报告仍然可见。
- `status --all` 包括 **遥测导出器**诊断，其中包含最新的、受信任的各信号导出器状态和传输方式。不显示端点值、标头、证书、负载和原始错误。

## <a id="secrets"></a> 密钥

- 当运行中的 Gateway 在启动、重载或配置写入期间存在任何隔离的 SecretRef 所有者时，状态会在 JSON 中包含 `degradedSecretOwners`，并在人工输出中包含一个 **降级密钥** 概览行。每个条目都会标明所有者、降级状态（`cold` 或 `stale`）、配置路径以及已脱敏的原因。cold 所有者不可用；stale 所有者会继续使用已知的最后可用值。
- 只读状态表面（`status`、`status --json`、`status --all`）尽可能解析其目标配置路径支持的SecretRefs。
- 如果配置了受支持的通道 SecretRef，但在当前命令路径中不可用，status 仍保持只读，并返回降级输出而不是崩溃。人工输出会显示类似 “configured token unavailable in this command path” 的警告，而 JSON 输出会包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用已解析的快照，并清除最终输出中临时的 “secret unavailable” 通道标记。
- `status --all` 包含一个密钥概览行和一个诊断部分，用于汇总密钥诊断信息（为便于阅读会截断），且不会停止报告生成。

## <a id="memory"></a> 内存

`status --json --all` 从由 `plugins.slots.memory` 选择的当前活动内存插件报告内存详情。自定义内存插件可以保持内置的 `memory.search.enabled` 处于禁用状态，同时仍然报告它们自己的文件、块、向量和 FTS 状态。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [诊断工具](/gateway/doctor)
- [`openclaw health`](/cli/health) — RPC 上的网关运行状况快照
