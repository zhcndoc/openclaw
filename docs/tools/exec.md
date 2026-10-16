---
summary: "Exec 工具使用、stdin 模式和 TTY 支持"
read_when:
  - "使用或修改 exec 工具时"
  - "调试 stdin 或 TTY 行为时"
title: "Exec 工具"
---

在工作区中运行 shell 命令。`exec` 是一个会修改环境的 shell 接口：命令可以在所选主机或沙箱文件系统允许的任何位置创建、编辑或删除文件。禁用 OpenClaw 文件系统工具（如 `write`、`edit` 或 `apply_patch`）并不会让 `exec` 变成只读。

网关、沙箱和工作线程本地执行通过 `process` 支持前台和后台执行。远程 `host=node` 执行使用同步 `system.run` 并且永远不会创建 `process` 会话，即使启用了 `process` 也是如此。如果不允许 `process`，则本地 `exec` 也会同步运行并忽略 `yieldMs`/`background`. 后台会话的作用域为每个代理。 `process` 只能看到来自同一座席的会话。

完成的调用直接返回命令输出。仅当 `exec` 报告命令仍在运行并提供 `sessionId` 时才使用 `process`；该命令打印的标识符是普通输出，而不是进程句柄。

由操作系统信号终止的无头节点主机命令在结果中包含信号名称，即使没有可用的数字退出代码也是如此。终止前打印的输出并不意味着命令成功。

## <a id="parameters"></a> 参数

<ParamField path="command" type="string" required>
要运行的 shell 命令。包含文字 NUL （U+0000） 的网关托管命令在进程启动之前返回错误；更正命令并重试。空参数、换行符和文字反斜杠零文本仍然有效并且不会被重写。
</ParamField>

<ParamField path="workdir" type="string" default="cwd">
命令的工作目录。对于本地执行，相对路径根据会话的默认 cwd 进行解析； `.` 保留该目录。路径是文字的，因此 `~` 不会扩展。
</ParamField>

<ParamField path="env" type="object">
Key/value 环境覆盖合并在继承的环境之上。
</ParamField>

<ParamField path="yieldMs" type="number" default="10000">
在此延迟（毫秒）后返回正在运行的进程句柄。在网关及其沙箱中，普通的生成命令仍由其请求拥有：浏览器的“停止”按钮并键入 `/stop` 取消它。正常模型完成后使其继续运行。
</ParamField>

<ParamField path="background" type="boolean" default="false">
立即启动刻意独立的服务。请求停止使其继续运行；使用其进程句柄单独停止它。使用 `yieldMs` 进行普通工作。工具返回后，进程超时仍然适用。
</ParamField>

<ParamField path="timeoutSeconds" type="number" default="tools.exec.timeoutSeconds">
限制命令的总生命周期（以 **秒** 为单位），覆盖为此调用配置的执行超时。即使在 `background` 或 `yieldMs` 返回会话 ID 后，到期也会终止进程。 `yieldMs` 控制工具在后台运行之前等待的时间。 `process` 工具的 `timeout` 控制轮询等待的时间，同样以毫秒为单位。

适用于网关、沙箱和节点 `system.run` 执行。 `timeoutSeconds: 0` 禁用该调用的 exec 进程超时。对于网关上或沙箱中的持久服务，请将 `background: true` 与 `timeoutSeconds: 0` 结合使用，然后在完成后使用 `process` 操作 `kill` 停止它。禁用此超时不会使进程在主机或工作线程关闭后继续存在。

Codex 前台 `node_exec` 继承此预算，包括每个代理的默认值，而不是普通的动态工具超时。 Node 即使命令定时器被禁用，传输等待仍保持有限；停止和转弯取消仍然适用。请参阅 [Codex 超时](/plugins/codex-harness-reference/timeouts)。
</ParamField>

<ParamField path="pty" type="boolean" default="false">
如果可用，在伪终端中运行。用于 TTY-only CLI、编码代理和终端 UI。
</ParamField>

<ParamField path="host" type="'auto' | 'sandbox' | 'gateway' | 'node'" default="auto">
在哪里执行。如果没有 `node` 参数，则省略 `host` 或使用 `auto` 继承配置的执行主机，包括代理和会话覆盖。当配置的主机也是 `auto` 时，当沙箱运行时处于活动状态时，它将解析为 `sandbox`，否则解析为 `gateway`。无论配置的主机如何，需要沙箱的会话都会保持沙箱状态。

面向模型的架构和代码模式签名仅列出会话主机策略允许的主机，并在没有沙箱运行时处于活动状态时省略 `sandbox`。创建工具时会捕获这些选择。 Node 连接性在执行时检查。
</ParamField>

<ParamField path="ask" type="'off' | 'on-miss' | 'always'">
基线询问模式源自 `tools.exec.mode` 和主机批准。对于通道源模型调用，当有效主机请求为 `off` 时，每次调用 `ask` 将被忽略。否则只能硬化到更严格的模式。
</ParamField>

<ParamField path="node" type="string">
Node id/name. 省略 `host` 后，`node` 表示 `host=node`，并遵循相同的主机策略和批准。 `node`（包括`auto`）以外的显式主机发生冲突，执行前被拒绝；省略 `host` 或将其设置为 `node`。
</ParamField>

<ParamField path="elevated" type="boolean" default="false">
请求提升模式：当操作员允许时，将沙箱逃逸到配置的主机路径上。仅当有效的安全和询问策略已允许 `full` 和 `off` 时，提升的 `full` 才会跳过批准。
</ParamField>

注意：

- `host` 仅接受 `auto`、`sandbox`、`gateway` 或 `node`。它不是主机名选择器。在命令运行之前，类似主机名的值将被拒绝。
- 仅当没有沙箱运行时处于活动状态时，才允许从 `auto` 执行每次调用 `host=node` 和 `host=gateway`。当沙箱运行时处于活动状态时，`auto` 将 exec 保留在沙箱中并拒绝这两个覆盖。显式设置 `tools.exec.host=node`（或 `gateway`）以在那里运行。
- 没有额外的配置，`host=auto` 仍然“正常工作”：没有沙箱意味着它解析为 `gateway`。实时沙箱意味着它留在沙箱中。
- `elevated` 将沙箱转义到配置的主机路径：默认情况下为 `gateway`，或 `tools.exec.host=node` 时为 `node`（或会话默认为 `host=node`）。仅当当前 session/provider. 启用提升访问权限时才可用
- `gateway`/`node` 的批准由主机批准文件控制。
- `node` 需要支持 `system.run`（配套应用程序或无头节点主机）的配对连接节点。如果没有设置目标，exec 将选择唯一符合条件的节点。如果连接了多个符合条件的节点，请设置`exec.node`、`tools.exec.node`或`/exec node=...`选择其中一个。它从不使用活动的 Canvas 目标。显式或绑定目标本身必须是连接的且可执行的。完成的结果与命令输出一起标识所选节点。
- Remote `host=node` 调用忽略 `background`/`yieldMs` 并在 `system.run` 完成时返回输出。显式 `background: true` 或 `yieldMs` 请求会在执行结果中生成警告，而不是在等待批准时生成警告。没有返回进程 `sessionId`。对于配对设备上的后台工作，请使用 [OpenClaw 工作会话 ](/nodes/session-hosting) 以及工作本地 `exec` 和 `process`；请参阅 [ 工作环境](/gateway/background-process#worker-environments)。
- `exec host=node` 是节点的远程 shell 执行路径。旧版 `nodes.run` 包装器已在 2026.3.31. 中删除
- 在非 Windows 主机上，exec 设置时使用 `SHELL`。如果 `SHELL` 是 `fish`，则它会优先选择 `PATH` 中的 `bash`（或 `sh`）以避免与鱼类不兼容的 bashism，如果两者都不存在，则回退到 `SHELL`。
- 在 Windows 主机上，exec 更喜欢 PowerShell 7 （`pwsh`） 发现：Program Files、ProgramW6432，然后是 PATH。它回落到 Windows PowerShell 5.1.
- 在非 Windows 网关主机上，bash 和 zsh exec 命令使用启动快照。 OpenClaw 将可获取的 aliases/functions 和从 shell 启动文件设置的小型安全环境捕获到 `$OPENCLAW_STATE_DIR/cache/shell-snapshots/`，然后在每个 exec 命令之前获取该快照。看起来秘密的变量被排除在外。内存缓存最多保存128个最近使用的快照键；被驱逐的密钥可以重复使用磁盘上的新快照，而无需启动另一个验证 shell。新捕获在原子发布之前进行验证。沙箱和节点执行不使用此快照。在网关进程环境中设置 `OPENCLAW_EXEC_SHELL_SNAPSHOT=0` 以禁用此快照路径。
- 主机执行（`gateway`/`node`）会拒绝 `env.PATH` 和加载器覆盖（`LD_*`/`DYLD_*`），以防止二进制劫持或注入代码。
- Exact `"cat"` 或空 `GIT_PAGER` 和 `PAGER` 覆盖标准化为空值，包括在节点 shell 包装器执行上。这会禁用 Git 分页，而不通过 `PATH` 传递可执行分页程序名称。其他程序可能会以不同的方式解释空 `PAGER`。需要时使用它们的非交互式标志。其他寻呼机命令、路径、空白变体和 `MANPAGER` 覆盖仍然被阻止。
- OpenClaw 会在生成的命令环境中设置 `OPENCLAW_SHELL=exec`（包括 PTY 和 sandbox 执行），以便 shell/profile 规则能够检测 exec-tool 上下文。
- 使用默认关闭的 [ 秘密出口代理 ](/gateway/secrets#secret-egress-proxy)，网关托管的 exec 仅作为进程本地哨兵接收共享存储 `secret` 条目。经过身份验证的环回代理在出站 HTTPS 请求时替换明文。每个托管进程都有自己的代理授权，该代理授权在原始轮次后仍然存在，并在进程退出、取消、超时或网关关闭时被撤销。
- 共享存储 `env` 条目有意为纯文本，并从下一次代理运行时到达网关托管的执行程序。它们无法到达沙箱、远程 `node`、ACP 或 Codex-native shell 执行。在 Codex harness下，使用 `gateway_exec` 作为此 OpenClaw- 托管环境路径。
- 使用 [ 托管的 GitHub 身份 ](/gateway/config-tools#tools.github)，网关托管的 exec 会验证所选配置文件并在每次进程启动时私下绑定其凭证。不可用的配置文件会通过重新连接指导阻止本地执行，而不是回退到本机密钥环凭据。正在运行的 shell 会保留其启动令牌。稍后 exec 启动观察刷新。 Codex-native shell 不共享此启动绑定。
- 沙盒执行程序排除该身份，除非 `agents.entries.<id>.tools.github.allowInSandbox: true`。此仅代理选择加入支持 Docker 和 Podman，包括角色所需的沙箱：配置文件以只读方式安装在 `/openclaw/github`，命令接收其托管令牌和 Git 作者。有效共享范围拒绝注入并发出警告；安全审核会对每次选择加入发出警告。请参阅 [ 沙盒 GitHub 身份 ](/gateway/config-tools/github-identity#sandbox-opt-in)。
- Secret 出口设置 `NODE_USE_ENV_PROXY=1`，因此受支持的 Node.js 全局 `fetch` 客户端遵循进程范围的代理。它不使用 `NODE_OPTIONS`。
- 对于通道起源运行，当通道提供这些 ID 时，OpenClaw 还会在 `OPENCLAW_CHANNEL_CONTEXT` 中公开窄 sender/chat 身份 JSON 有效负载。
- Capable 节点独立于自定义环境覆盖接收 channel/subagent 路由上下文，并自行注入固定标记。有关功能协商和混合版本行为，请参阅 [ 节点执行上下文](/nodes/node-exec#channel-and-subagent-context)。
- `exec` 不能运行 `openclaw channels login` 或 `/approve` shell 命令：`openclaw channels login` 是一个交互式 channel 认证流程，而 `/approve` 需要走批准命令处理器，而不是 shell。请在 gateway 主机上的终端中运行 channel 登录，或者在存在相应工具时使用特定于 channel 的登录代理工具（例如 `whatsapp_login`）。
- 重要提示：沙箱默认为 **关闭**。如果沙箱关闭，则隐式 `host=auto` 解析为 `gateway`。显式 `host=sandbox` 请求仍会被拒绝，而不是在网关主机上静默运行。启用沙箱或在获得批准的情况下使用 `host=gateway`。
- Python 脚本针对常见 shell 语法错误的预检检查仅检查有效 `workdir` 边界内的文件。如果脚本路径在 `workdir` 之外解析，则会跳过文件检查。 JavaScript 源留给 Node，它返回其正常诊断和退出代码；运行时错误之前的语句可能已经执行。对不明确的 Python/Node 解释器命令的单独限制仍然适用。当 `host=gateway` 且有效策略为 `security=full` 和 `ask=off` 时，预检将完全跳过。
- 对于现在开始的长时间运行的工作，启动一次并在启用它且命令发出输出或失败时依赖自动完成唤醒。使用 `process` 进行日志、状态、输入或干预。不要通过睡眠循环、超时循环或重复轮询来模拟调度。
- 当`tools.exec.notifyOnExit=false`时，运行结果在其文本和结构化`followUp`中明确表明自动完成唤醒被禁用。后来的 `process poll`、`log` 和 `list` 结果在命令运行时使用启动时捕获的策略保留该指导。如果任务需要结果，则在结束回合之前使用 `process poll` 和超时收集结果，除非已经安排了另一个延续。正在运行的进程或活动会话目标不会安排该延续。
- 当批准的异步命令完成时，其继续使用 `agents.defaults.timeoutSeconds` 的正常代理运行超时。当接受的代理继续运行时，后续观察者可以完成等待。
- Subagent 会话不会接收自动后台执行唤醒。在没有其他完成源的情况下产生之前，使用 `process poll` 收集结果。
- 进程所有者跟踪代理启动的后台命令。使用返回的进程会话 ID 来检查输出、轮询或停止命令；它的完成可以唤醒代理。
- 对于应在稍后或按计划执行的工作，请使用 cron，而不是 `exec` 的 sleep/delay 模式。

## <a id="config"></a> 配置

| 键                                  | 默认值                  | 笔记                                                                                                                                                              |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools.exec.timeoutSeconds`          | `1800`                   | 每条命令的默认 exec 超时时间，单位为秒。每次调用的 `timeoutSeconds` 会覆盖该值；每次调用的 `timeoutSeconds: 0` 会禁用 exec 进程超时。               |
| `tools.exec.host`                    | `auto`                   | 沙盒运行时处于活动状态时解析为 `sandbox`，否则解析为 `gateway`。                                                                                       |
| `tools.exec.mode`                    | 宿主衍生的             | 保存的执行模式。请参阅下面的 [Modes](#modes)。                                                                                                                   |
| `tools.exec.reviewer.model`          | 配置的主要代理 | `mode=auto` 审查时可选的 provider/model 覆盖项。                                                                                                           |
| `tools.exec.reviewer.timeoutMs`      | `30000`                  | 在回退到人工审批之前，审查者模型准备和完成阶段的超时时间。                                                                             |
| `tools.exec.node`                    | 未设置                    | 通过 id、名称或 IP 选择运行 `host=node` 命令的配对节点。仅当连接多个符合条件的节点时才需要；参见[参数](#parameters)。 |
| `tools.exec.notifyOnExit`            | `true`                   | 如果为 true，则后台主机执行会话在退出时将在其原始会话中继续正常轮流。                                                 |
| `tools.exec.approvalRunningNoticeMs` | `10000`                  | 当受审批约束的 exec 运行时间超过此值时，发送一次“running”提示（`0` 表示禁用）。                                                                   |
| `tools.exec.strictInlineEval`        | `false`                  | 见[内联求值](#inline-eval-strictinlineeval)。                                                                                                                  |
| `tools.exec.commandHighlighting`     | `false`                  | 为 true 时，审批提示可以在命令文本中高亮由解析器推导出的命令片段。可全局或按 agent 设置；不会改变审批策略。            |
| `tools.exec.pathPrepend`             | 未设置                    | 用于网关、沙箱和拥有的本地本机 Codex 命令的 `PATH` 前面的目录。                                                                      |
| `tools.exec.safeBins`                | 未设置                    | 仅允许 stdin 的安全二进制文件，可在没有显式 allowlist 条目的情况下运行。见[安全二进制文件](/tools/exec-approvals-advanced#safe-bins-stdin-only)。                    |
| `tools.exec.safeBinTrustedDirs`      | `/bin`, `/usr/bin`       | 用于 `safeBins` 路径检查的额外显式受信目录。`PATH` 条目不会被自动信任。                                                         |
| `tools.exec.safeBinProfiles`         | 未设置                    | 按安全二进制文件配置可选的自定义 argv 策略（`minPositional`、`maxPositional`、`allowedValueFlags`、`deniedFlags`）。                                                   |

无批准主机执行是网关和节点的默认值 （`mode=full`） — 这来自主机策略默认值，而不是来自 `host=auto`。如果您想要 approvals/allowlist 行为，请设置 `tools.exec.mode` 并收紧主机批准文件。请参阅 [Exec 批准](/tools/exec-approvals#yolo-mode-no-approval)。要强制网关或节点路由而不管沙箱状态如何，请设置 `tools.exec.host` 或使用 `/exec host=...`。

示例：

```json5
{
  tools: {
    exec: {
      pathPrepend: ["~/bin", "/opt/oss/bin"],
    },
  },
}
```

### <a id="modes"></a> 模式

`tools.exec.mode` 是保存的执行模式。运行时安全性和审批行为均源自它。

| 模式        | 安全    | 问       | 行为                                                                                                                        |
| ----------- | ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `deny`      | `deny`      | `off`     | 禁止 exec。                                                                                                                 |
| `allowlist` | `allowlist` | `off`     | 仅运行 allowlisted/safe-bin 命令；没有其他的询问。                                                                  |
| `ask`       | `allowlist` | `on-miss` | allowlist 匹配的命令直接运行；其他所有命令都向人工询问。                                                                   |
| `auto`      | `allowlist` | `on-miss` | Allowlist/safe-bin 匹配直接运行；符合资格的未命中者将收到来自本地审阅者的 `allow`、`deny` 或 `ask` 判决。 |
| `full`      | `full`      | `off`     | 无普通政策提示；请参阅 [ 严格内联 eval](#inline-eval-strictinlineeval)。                                            |

使用 `/exec ask=always` 和一条消息，要求该运行需要人工批准。它不会保留到以后的消息中。将 [ 会话权限模式 ](/gateway/permission-modes) 用于会话范围策略。

自动审核批准是一次性的。审阅者返回 `allow`、`deny` 或 `ask`：`allow` 运行一次低风险或中风险命令。 `deny` 向代理返回一个原因，代理必须选择一个实质上更安全的替代方案或询问用户而不是解决拒绝问题。 `ask` 请求人工批准。包含审阅者指导文本的命令将被拒绝返回给代理，以便代理可以重写该命令。它们不会直接升级到人类的认可。审阅者失败、超时和无效响应也会询问人工。在网关上，连续三次审阅者拒绝会话会将第三个命令升级为人工批准。审阅者津贴或已解决的人工批准会重置计数。

将 `tools.exec.reviewer.thinking` 设置为 `minimal`、`low`、`medium`、`high`、`xhigh` 或 `max` 以独立于主代理选择审阅者推理工作。例如，`reviewer: { model: "openai/gpt-5.6-terra", thinking: "low" }` 请求轻松审核。支持的级别针对所选模型进行标准化。省略 `thinking` 以保留现有提供程序默认值；审稿人并不继承主智能体的思维设定。 `agents.entries.<id>.tools.exec.reviewer` 下也有相同的设置。它也适用于模型支持的小部件评审，但不配置 Codex 的本机 Guardian 评审器。

将 `tools.exec.reviewer.fastMode` 设置为 `true` 以请求对支持的 OpenAI 响应和 ChatGPT/OAuth 路由进行快速处理，或将 `false` 设置为标准处理。例如，`reviewer: { model: "openai/gpt-5.6-terra", thinking: "low", fastMode: true }` 要求低推理工作量和优先处理。省略 `fastMode` 以保留提供程序默认值。此设置独立于主代理的快速模式，并且也可用于每个代理。优先处理可能会花费更多，并且仍然取决于 provider/model 的可用性；其他提供商可能会忽略该设置。

标记为推理模型的审稿人会自动获得基于 `thinking`（省略时为中等）的 1,024 个代币判决预算之上的有限思维津贴。该请求保持在模型公布的输出限制范围内。非推理评审者保留 1,024 个代币的预算。无需单独设置完成预算；耗尽的预算仍然需要人工批准。

模型准备和完成均收到配置的 `tools.exec.reviewer.timeoutMs` 预算。超时立即返回人工批准。待定的准备工作和提供者清理工作在解决之前仍属于其所有。超时后完成的准备不会开始审核。

对于嵌入式代理运行，审阅者会收到当前对话的有界摘录，无需秘密屏蔽：用户请求、助理文本、工具调用和工具结果，按来源标记。它使用此上下文来判断命令是否满足用户的请求。摘录是不受信任的证据，而不是说明。对话上下文对于直接节点 `system.run` 调用和小部件不可用。

在网关上，命令在审核之前仍必须通过现有的可变文件绑定检查。这些检查继续拒绝此处文档、未解析的可执行文件和丢失的脚本操作数。整个普通的外部调度链（每个原始包装器可执行文件和最终命令段可执行文件）在审查时绑定并在启动前重新检查：受保护的可执行文件仅使用解析的真实路径身份，而可写可执行文件也使用内容哈希。更改的可执行文件解析（包括 `PATH` 上早期的新可执行文件）拒绝批准的运行。提交的主机批准策略也会在最终进程生成边界重新验证，包括在异步启动工作之后和 PTY 回退之前。策略撤销会阻止待定的启动；它不会停止已经启动的进程。仅身份绑定不会使其他合格的人类批准一次性使用。

审阅者批准的非固定执行要求完整的调度链是身份绑定的：授权计划必须完整，使用直接传输，并且为每个包装器和最终可执行文件记录可执行操作数。合格的 glob 和链保留其参数扩展，而每个包装器和可执行文件都固定到其绑定的绝对调用路径。可执行符号链接保留其调用语义，包括 Python 虚拟环境，而其解析的目标和可变内容仍保持绑定和重新验证。从授权计划重建的命令使用准备好的运行时环境，而不加载 shell 启动快照，因此别名、函数和启动 PATH 更改无法替换已批准的调度。普通全模式命令保留 shell 启动自定义。 Node-host 自动审查接受准备好的固定直接命令，包括节点自己的内置 POSIX shell 围绕一个带有静态参数的直接绝对可执行文件传输。当网关无法检查节点的内存中绑定时，裸露的可执行文件名称、不带引号的全局变量和用户提供的包装器仍然需要人工批准。 Node 可执行身份重新验证涵盖通过调度的本地策略评估。 Node-host 启动还会在异步准备后重新验证已提交的审批策略。它不会在远程人工批准等待过程中保留每个内壳可执行文件的身份。有关该边界，请参阅 [Interpreter/runtime 命令](/tools/exec-approvals-advanced#interpreter%2Fruntime-commands)。

Shell `-c` 包装器、带有作业的 `env`、`xcrun`、BusyBox/Toybox 小程序、shell `builtin`/`command`/`exec` 调度以及任何其他不完整的调度链都会通过 `Exec auto-review skipped: dispatch chain cannot be bound` 跳过审阅者。在自动模式下，当现有绑定检查成功时，这些表单将采用一次性人工审批路径。现有的绑定拒绝仍然适用。当完整的链被绑定时，没有分配的普通命令和透明 `env` 仍然符合资格。没有持久的数据模型更改：绑定在批准生命周期内保留在内存中。

POSIX 请求的命令中的登录或交互式 shell 包装器永远不会收到自动审核。当绑定成功时，就像 `bash -lc 'printf ok'` 一样，它们需要人工批准，因为它们的隐式启动文件位于操作数绑定之外。现有的绑定拒绝仍然优先。由于代码加载选项而被拒绝的交互式表单仍然被拒绝。这适用于请求命令中的包装器。网关的普通 shell 启动快照没有变化。

明确的 `ask=always` 和高于审查候选限制的命令直接进入人工批准。

对于并非已由显式运行时或原生策略决定的 Codex app-server 命令审批，会走人工审批路径。OpenClaw 不会为这些请求运行其配置的 exec 审查器，因为 Codex 不会暴露一个可执行且可强制绑定的已解析可执行文件，使审查决定与 Codex 实际运行的命令绑定起来。

### <a id="inline-eval-(strictinlineeval)"></a><a id="inline-eval-strictinlineeval"></a> 内联求值（`strictInlineEval`）

`tools.exec.strictInlineEval` 是一个单独的选择加入设置，默认为 `false`。当普通主机批准评估运行时，即使执行和主机策略允许 `full`/`off`.，启用它也需要审阅者或明确批准认可的内联解释器评估表单。示例包括 `python -c`、`node -e`、`ruby -e`、`perl -e`、`php -r`、 `lua -e`、`osascript -e` 以及其他受支持的解释器和命令载体的类似形式（`awk`、`find -exec`、`make`、`sed`、`xargs` 等）。在 `mode=auto` 中，正常的执行批准路径可能会让本机自动审阅器允许低风险或中等风险的一次性命令。直接节点主机 `system.run` 调用仍然需要显式批准，因为它们无法将命令交给人工批准路径。审稿人的拒绝会返回给代理并附上理由。 `ask` 指向人类。 `allow-always` 仍然可以持久保存良性 interpreter/script 调用，但内联评估表单不会成为持久的允许规则。

单独配置的 `tools.exec.mode: "full"` 不会跳过此检查。在以下任一情况下，网关执行都会跳过主机批准路径：

- A全权限会话保持有效安全`full`并询问`off`。
- E 允许提升完全执行，并且执行策略和主机批准都允许 `full`/`off`.

这些路径会跳过检测严格内联评估的审批所有者。收紧完整会话的询问模式可以恢复该评估，即使会话仍然绕过主机批准文件底线。请参见[会话权限模式](/gateway/permission-modes)和[E提升模式](/tools/elevated)。

对于普通配置的 full/off 执行而不提示这些表单，请保留 `strictInlineEval` 未设置或将其设置为 `false`。当检测运行时，`askFallback: "full"` 不满足严格的内联评估批准。

### <a id="path-handling"></a> PATH 处理

网关托管的命令使用与正在运行的网关安装绑定的 `openclaw` 启动器。源签出将任何继承的 TSX 预加载固定到 Node 和 Bun 上的签出，因此启动器也可以在签出之外的代理工作区中工作。

准备好的子命令在启动之前解析启动器的具体路径。在更新期间切换安装符号链接不会重定向已准备好的命令。更新后的链接后面会出现新的 `openclaw` 调用。

- `host=gateway`：将你的登录 shell `PATH` 合并到 exec 环境中。`env.PATH` 覆盖会被拒绝用于 host 执行。daemon 本身仍使用最小 `PATH` 运行：
  - macOS: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `/bin`
  - Linux: `/usr/local/bin`, `/usr/bin`, `/bin`
  - 为防止用户 shell 配置（如 `~/.zshenv` 或 `/etc/zshenv`）在启动期间覆盖优先路径，`tools.exec.pathPrepend` 条目会在执行前，安全地预先追加到 shell 命令内最终的 `PATH` 前面。
- `host=sandbox`：在容器内运行`sh -lc`（登录shell），因此`/etc/profile`可能会重置`PATH`。 OpenClaw 通过内部环境变量（无 shell 插值）在配置文件源之后添加 `env.PATH`。 `tools.exec.pathPrepend` 也适用于此。
- 拥有的本地 stdio 进程上的 Native Codex 在显式配置的本机 shell `PATH` 之前接收非空配置的前缀和网关 CLI 填充程序，或者在未设置本机值时接收网关进程 `PATH`。请求级本机 PATH 覆盖优先于本机配置文件；显式空 PATH 仅保留前缀。每个代理 `tools.exec.pathPrepend` 覆盖全局列表，包括空列表。 OpenClaw 将此环境应用于新的和恢复的本机线程，而不更改本机登录 shell 策略。 Codex 在加载 shell 快照后重新应用环境，但当快照不可用或被绕过时，或者当命令 shell 启动时，shell 启动文件仍然可以替换 `PATH`。 Codex 的现有 `allow_login_shell = false` 设置选择退出登录配置文件启动；它不会抑制每个 shell 启动文件。主机 PATH 条目不会转发到沙箱、远程工作区或套接字支持的 Codex 执行。
- `host=node`：只有您传递的非阻塞环境覆盖才会发送到节点。 `env.PATH` 覆盖被主机执行拒绝并被节点主机忽略。如果节点上需要额外的 PATH 条目，请配置节点主机服务环境 （systemd/launchd） 或在标准位置安装工具。对于 Linux 登录 shell 命令，节点在配置文件启动后、在配置文件提供的条目之前重新应用其服务 PATH。

按 agent 绑定 node（在配置中使用带键的 agent ID）：

```bash
openclaw config get agents.entries
openclaw config set 'agents.entries.main.tools.exec.node' "node-id-or-name"
```

Control UI：**Devices** 页面包含一个用于相同设置的小型“Exec 节点绑定”面板。保存的目标可能变得无法解析或停止广告执行支持。然后，其绑定保持选中状态并标记为 **Unavailable**。您可以使用 **任何节点** 或 **使用默认值** 来清除它，即使没有具有执行能力的节点可用。支持的名称、地址和 ID 前缀无需重写已保存的引用即可解析。

### <a id="python-environments-(uv)"></a><a id="python-environments-uv"></a> Python 环境 （`uv`）

在 [uv 管理的项目](https://docs.astral.sh/uv/guides/projects/) 中，裸 `python` 或 `python3` 使用执行主机的 `PATH` 选择的解释器。如果项目环境不在该路径上，则导入安装在那里的依赖项可能会失败，并显示 `ModuleNotFoundError`。

将`workdir`设置为项目目录并运行`uv run python3 script.py`以使用其环境。当项目环境已位于 `PATH` 上时，裸解释器也可以工作。

对于重复的代理工作，请在工作区的 `AGENTS.md` 中记录项目约定，例如：

```md
- Run Python scripts from this project with `uv run python3 script.py` so they use its dependencies.
```

## <a id="session-overrides-(%2Fexec)"></a><a id="session-overrides-/exec"></a> 会话覆盖（`/exec`）

单独发送 `/exec host=... node=...` 以设置 **per-session** 放置默认值。 `security`和`ask`仅适用于**当前消息**。将它们包含在您要运行的任务中。发送不带参数的 `/exec` 以显示已解析的默认值。

示例：

```text
/exec host=node node=worker-1
/exec security=allowlist ask=always inspect the build output
```

`/exec` 仅适用于 **授权发件人** 通过通道 allowlists/pairing 和访问组。访问组强制始终处于开启状态。它不写配置。授权的外部渠道发送者可以保留放置默认值。内部 gateway/webchat 客户端需要 `operator.admin` 才能执行此操作。回合范围的 `security` 和 `ask` 不需要该持久性权限。

独立的 `/exec security=deny` 确认仅运行设置，但不启动代理运行，并且不会影响下一条消息。使用 [ 会话权限模式 ](/gateway/permission-modes) 保持跨消息的策略。

`sessions.patch` 和 `sessions.patchMany` 中的 `execSecurity` 和 `execAsk` 字段已在 2026.8.1. 中停用。它们保留在协议 v4 线路架构中，但包含任一字段（包括 `null`）的请求将被 `INVALID_REQUEST` 和替换指南拒绝。为会话范围策略设置 `permissionMode`（`read-only`、`guarded`、`workspace` 或 `full`），或将 `/exec` 与单次运行的消息一起使用。

当会话具有权限模式时，每回合 `/exec` 覆盖只能收紧其安全和批准策略。例如，`/exec security=deny` 即使在完全访问会话中也会阻止该回合的 exec。请求更宽松的安全性或更少的批准的覆盖会使会话模式的限制保持不变。完全访问会话仅绕过主机批准文件楼层，同时保持有效的安全性 `full`。仅收紧 `ask` 仍适用所请求的批准级别，而无需恢复这些楼层。

要硬禁用 exec，请通过工具策略（`tools.deny: ["exec"]` 或每个代理）拒绝它。除了上述完全访问会话例外之外，主机批准文件底线仍然适用。

## <a id="exec-approvals-(companion-app-%2F-node-host)"></a><a id="exec-approvals-companion-app-/-node-host"></a> Exec 批准（伴侣应用／node 主机）

沙盒化代理在网关或 node 主机上运行 `exec` 之前，可能需要按请求进行批准。有关策略、允许列表和 UI 流程，请参见 [Exec 批准](/tools/exec-approvals)。

当可以交付人工批准时，普通网关和节点执行调用会在当前工具调用中等待，并在批准后返回命令结果。显式请求异步后续的流程会立即返回 `status: "approval-pending"` 和批准 ID。 `approval-pending` 结果意味着该命令尚未启动，因此仅当批准的命令实际内联运行时才会出现前台回退警告。批准的异步运行会发出命令进度和完成系统事件 （`Exec running` / `Exec finished`）。拒绝或超时的批准对于主机命令来说是终止的。有关通知行为，请参阅 [ 系统事件和拒绝](/tools/exec-approvals#system-events-and-denials)。

在具有本机批准 cards/buttons 的渠道上，代理应首先依赖本机 UI，并且仅当工具结果明确表明聊天批准不可用或手动批准是唯一路径时才包含手动 `/approve` 命令。

## <a id="allowlist-%2B-safe-bins"></a><a id="allowlist-+-safe-bins"></a> 允许列表 + 安全 bin

手动白名单强制执行与已解析的二进制路径 glob 和裸命令名称 glob 相匹配。裸名称仅匹配通过 PATH 调用的命令，因此当命令为 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但不能匹配 `./rg` 或 `/tmp/rg`。

当 `security=allowlist` 时，只有在流水线中的每个分段都在允许列表中或属于安全 bin 时，shell 命令才会被自动允许。除非每个顶层分段都满足允许列表（包括安全 bin），否则链式操作（`;`、`&&`、`||`）和重定向会在允许列表模式下被拒绝。重定向仍然不受支持。持久化的 `allow-always` 信任不会绕过该规则：链式命令仍然要求每个顶层分段都匹配。

`autoAllowSkills` 是 exec 审批中的一个单独便捷路径，不同于手动路径允许列表条目。若要严格地显式信任，请保持 `autoAllowSkills` 处于禁用状态。

将这两个控制项用于不同用途：

- `tools.exec.safeBins`：小型、仅 stdin 的流过滤器。
- `tools.exec.safeBinTrustedDirs`：为安全 bin 可执行路径显式添加额外受信任目录。
- `tools.exec.safeBinProfiles`：为自定义安全 bin 显式指定 argv 策略。
- 允许列表：对可执行路径的显式信任。

请勿将 `safeBins` 视为通用白名单，也不要添加 interpreter/runtime 二进制文件（例如 `python3`、`node`、`ruby`、`bash`）。如果您需要这些，请使用明确的允许列表条目并保持启用批准提示。

`openclaw security audit`警告时interpreter/runtime `safeBins`条目缺少明确的配置文件，并且`openclaw doctor --fix`脚手架可以缺少定制吗`safeBinProfiles`条目。`openclaw security audit`和`openclaw doctor`当您显式添加广泛行为垃圾箱时也会发出警告，例如`jq`回到`safeBins` （`jq`可以读取环境数据并从模块或启动文件加载 jq 代码，因此更喜欢显式允许列表条目或批准门控运行）。`jq`即使明确列出，也被拒绝作为安全垃圾箱。如果您明确将解释器列入允许名单，请启用`tools.exec.strictInlineEval`要求审阅者或明确批准认可的内联表格[普通审批路径](#inline-eval-strictinlineeval)。

有关完整的策略细节和示例，请参见 [Exec approvals](/tools/exec-approvals-advanced#safe-bins-stdin-only) 和 [Safe bins versus allowlist](/tools/exec-approvals-advanced#safe-bins-versus-allowlist)。

## <a id="examples"></a> 示例

前台：

```json
{ "tool": "exec", "command": "ls -la" }
```

产生句柄的普通工作，然后轮询：

```json
{"tool":"exec","command":"npm run build","yieldMs":1000}
{"tool":"process","action":"poll","sessionId":"<id>","timeout":30000}
```

当没有自动完成唤醒可用时，使用 `process poll` 实现按需状态和有限等待。避免快速的状态循环；在等待当前任务需要的结果时传递超时。如果启用自动完成唤醒，则该命令可以在发出输出或失败时唤醒会话。

发送按键（tmux 风格）：

```json
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Enter"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["C-c"]}
{"tool":"process","action":"send-keys","sessionId":"<id>","keys":["Up","Up","Enter"]}
```

对于文本，请使用 `literal`。对于精确的输入字节，请使用 `hex`。混合请求按以下顺序发送文字 UTF-8 文本、十六进制字节，然后是命名键：

```json
{
  "tool": "process",
  "action": "send-keys",
  "sessionId": "<id>",
  "literal": "hello ",
  "hex": ["c3", "a9"],
  "keys": ["Enter"]
}
```

提交（仅发送 CR）：

```json
{ "tool": "process", "action": "submit", "sessionId": "<id>" }
```

粘贴（默认用括号包裹）：

```json
{ "tool": "process", "action": "paste", "sessionId": "<id>", "text": "line1\nline2\n" }
```

## apply_patch

`apply_patch` 是 `exec` 的子工具，用于结构化多文件编辑。它默认启用并且可供任何模型提供商使用。 `allowModels` 可以对其进行限制。仅当您想要禁用它或将其限制为特定模型时才使用配置：

```json5
{
  tools: {
    exec: {
      applyPatch: { workspaceOnly: true, allowModels: ["gpt-6-astra"] },
    },
  },
}
```

注意：

- Tool 政策仍然适用。 `allow: ["write"]` 隐式允许 `apply_patch`。
- `deny: ["write"]`并不否认`apply_patch`。当补丁写入也应被阻止时，显式拒绝 `apply_patch` 或使用 `deny: ["group:fs"]`。
- 配置位于 `tools.exec.applyPatch` 下。
- `tools.exec.applyPatch.enabled` 默认为 `true`。将其设置为 `false` 以禁用该工具。
- `tools.exec.applyPatch.workspaceOnly` 默认为 `true`（包含工作区）。仅当您有意希望工作区目录之外的 `apply_patch` 为 write/delete 时，才将其设置为 `false`。
- `tools.exec.applyPatch.allowModels` 是可选的模型 ID 允许列表（原始，如 `gpt-5.4`，或完整，如 `openai/gpt-5.4`）。设置后，只有匹配的模型才能获得该工具。取消设置后，所有模型都会获得它。

## <a id="related"></a> 相关内容

- [Exec Approvals](/tools/exec-approvals) — shell 命令的批准门
- [沙箱](/gateway/sandboxing) — 在沙箱环境中运行命令
- [Background Process](/gateway/background-process) — 长时间运行的执行和处理工具
- [安全性](/gateway/security) — 工具策略和提升权限
- [Code Mode](/tools/code-mode) — 模型编写调用隐藏工具目录的程序的运行时
- [`apply_patch`](/tools/apply-patch) — 应用结构化编辑而不是剔除
- [Tokenjuice](/tools/tokenjuice) — 压缩大型命令输出
