---
summary: "CLI 后端：运行代理通过本地 AI CLI，以及可选的 MCP 工具桥"
read_when:
  - "你想要在 API 提供商失败时有一个可靠的回退"
  - "您正在运行本地 AI CLI 并希望重用它们"
  - "您想了解MCP环回桥用于CLI后端工具访问"
title: "CLI 后端"
---

OpenClaw 可以通过本地 AI CLI 运行代理轮流，例如 Claude Code 或 Gemini CLI，而不是调用提供者 API 本身：

- A 后端与 `bundleMcp: true` 通过环回 MCP 桥接收网关工具。 OpenClaw 不会直接将工具调用注入到 CLI 协议中。
- JSONL 支持 CLI 的流式传输。
- 支持会话，因此后续轮次能够保持连贯。
- 如果 CLI 接受图片路径，则图片会被透传。

CLI 后端可以是代理的主要运行时或后备运行时。在入门引导期间选择 **Claude CLI** 会保留 `anthropic/*` 模型参考并通过 Claude Code 运行它们。对于 ACP 会话控制、后台任务、thread/conversation 绑定和持久外部编码会话，请改用 [ACP Agents](/tools/acp-agents)。 CLI 后端不是 ACP。

<Tip>
  要构建新的后端插件吗？请参阅 [CLI 后端插件](/plugins/cli-backend-plugins)。本页介绍的是如何配置和操作一个已经注册的后端。
</Tip>

## <a id="quick-start"></a> 快速开始

捆绑的 Anthropic 插件注册 `claude-cli` 后端。在网关主机上安装并登录 Claude Code 后，为 Anthropic 模型选择它：

```bash
openclaw models auth login --provider anthropic --method cli --set-default
openclaw agent --agent main --message "hi"
```

登录保留标准 `anthropic/*` 模型引用，并在尚未命名运行时的 Claude 模型条目上设置 `agentRuntime: { id: "claude-cli" }`，因此 `--model anthropic/claude-sonnet-5` 也通过 Claude Code 运行。它还添加了具有相同运行时的 `"anthropic/*"` 条目，因此登录后发布或由 ID 键入的 Claude 模型也可以通过 Claude Code 运行。命名另一个运行时的特定模型的条目仍然获胜。在 `openclaw onboard` 中选择 **Claude CLI** 会写入相同的配置。旧版 `claude-cli/*` 引用仍可用作兼容性输入，并且 `openclaw doctor --fix` 将持久引用重写为此标准形式。

登录时不会添加已弃用的目录模型；保留现有条目并通过 Claude CLI 运行。早期 Claude CLI 登录的配置缺少 `"anthropic/*"` 条目，因此登录未添加的 Claude 模型会因缺少 Anthropic API 密钥而失败。 `openclaw doctor --fix` 和 `openclaw update` 当默认模型是固定到 `claude-cli` 的 Anthropic 模型、不存在 `"anthropic/*"` 条目且未配置 Anthropic 凭证（Anthropic 身份验证配置文件、提供程序）时添加它API 密钥或 `ANTHROPIC_API_KEY`/`ANTHROPIC_OAUTH_TOKEN`）。使用凭证或 API 默认模型，其他 Claude 模型将保留其当前路由。

`main` 是未配置显式座席列表时的默认座席 ID。否则请交换您自己的代理 ID。

当您将现有聊天从 Claude CLI 切换回来时，第一个恢复的回合包括自上次保存的 Claude CLI 回复以来消息的简短计数、时间范围和模型摘要，而不是其内容。该注释是本机用户提示的前缀； OpenClaw 的文字记录保留了原始用户文本。当 `sessions_history` 可用时，注释包括当前聊天的会话密钥和呼叫形状，以便 Claude 可以按需读取这些消息。空的 Claude 回复不会留下已保存的回复边界，因此注释可以在下一轮重复。

当帐户更改在现有聊天中启动新的本机 Claude 会话时，其第一轮会收到有关聊天中早期消息的相同类型的注释。这包括不透明的本机登录。当工具策略允许时，Claude 可以通过 `sessions_history` 按需读取该历史记录； OpenClaw 永远不会跨帐户边界自动重播原始转录内容或持久上下文。全新的聊天没有之前的消息注释。

网关服务的 `PATH` 上必须有 CLI。如果部署需要非标准可执行路径或参数，请在 [CLI 后端插件 ](/plugins/cli-backend-plugins) 中注册该适配器，而不是将启动机制放入 `openclaw.json` 中。

当模型选择或模型范围的 `agentRuntime.id` 引用了某个后端时，OpenClaw 会自动加载拥有该后端的捆绑插件。

活动回顾、会话标题、对话标签、进度旁白和工具调用标题的实用程序完成使用所选模型的运行时。 Claude CLI 运行全新、免工具的完成方式，并具有自己的身份验证。

当 `agents.defaults.utilityModel` 未设置时，OpenClaw 使用主要提供商声明的小模型。 Claude CLI 主要使用推荐的 Haiku 模型到 Claude CLI，即使 Anthropic API 凭证也可用。它不会自动将公用事业工作切换到 Anthropic API。

显式配置的实用程序模型保留其自己的运行时。为会话显式选择的兼容运行时或固定在派生模型自己的条目上的运行时也胜过继承的路由。对于其他运行时，自动实用程序路由可以在借用主模型的固定运行时之前首选可用的提供者凭证。

要显式使用 Anthropic API 进行实用程序工作，请在实用程序模型上配置其运行时：

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-5": { agentRuntime: { id: "claude-cli" } },
        // Always HTTP, even with no provider credential configured.
        "anthropic/claude-haiku-4-5": { agentRuntime: { id: "openclaw" } },
      },
    },
  },
}
```

## <a id="using-it-as-a-fallback"></a> 作为回退使用

为了保持API作为主要途径和用途Claude Code仅当失败时，才固定CLI后备模型上的运行时：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["anthropic/claude-sonnet-5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "anthropic/claude-sonnet-5": { agentRuntime: { id: "claude-cli" } },
      },
    },
  },
}
```

当主模型失败（身份验证、速率限制、超时）时，配置的后备仍然有效，即使它们不在 `agents.defaults.modelPolicy.allow` 中。仅当人们也应该能够直接选择它时，才将后备模型添加到该策略中。直接选择意味着 `/model`、会话覆盖或 `--model`。 `agents.defaults.models` 仅拥有每个模型的别名、参数、运行时和元数据。

## <a id="configuration"></a> 配置

用户通过模型和运行时策略选择注册的后端。保持模型引用的标准形式，并为每个模型选择 CLI 运行时：

```json5
{
  agents: {
    defaults: {
      model: "anthropic/claude-opus-5-5",
      models: {
        "anthropic/claude-opus-5-5": {
          agentRuntime: { id: "claude-cli" },
        },
      },
    },
  },
}
```

凭据仍保留在 OpenClaw 认证配置文件或所属插件的配置中。命令、argv、环境、解析、会话、图像和看门狗机制均属于通过 `api.registerCliBackend(...)` 注册的插件代码。

## <a id="how-it-works"></a> 工作原理

1. 从模型的运行时策略 （`agentRuntime.id`） 或独立后端模型引用的提供程序前缀 （`acme-cli/...`） 中选择后端。
2. 使用相同的 OpenClaw 提示词和工作区上下文构建系统提示。
3. 使用会话 ID（如果支持）执行 CLI，以便历史记录保持一致。捆绑的 `claude-cli` 后端直接与安装的 Claude Code 可执行文件通信，并在兼容的代理轮次中保持其经过身份验证的子进程的温暖。
4. 解析输出（JSON 或纯文本）并返回最终文本。
5. 按后端持久化会话 id，以便后续跟进复用同一个 CLI 会话。

Claude CLI 启动钩子事件在初始化完成时按顺序消耗，因此 `SessionStart` 钩子的突发不会在第一轮停止。受限运行继续禁用本机挂钩。

Claude 流 json 后端还会在 `write`、`edit` 和 `apply_patch` 参数流时发出实时行计数进度。进度仅包含工具 ID、名称和 added/removed 行计数，每次调用每秒最多更新四次。执行开始事件仍然等待完整的参数；输入进度并不意味着该工具已经开始执行。如果输入生成被中断，则后面的文本块不会将废弃的工具标记为已启动。

直接代理呼叫和子完成更新共享相同的会话回复策略。完成回合的交付覆盖本身不会启动新的 CLI 会话；身份验证、工作区和工具兼容性检查仍然适用。每个回合都会收到当前模式和可用工具的传送指令，而存储的用户消息和可重复使用的系统提示保持不变。

存储隐式自动策略的现有会话也保持连续性。 OpenClaw 下一轮完成时记录当前策略。

## <a id="timeouts-and-long-running-work"></a> 超时和长时间运行的工作

CLI 后端有两个独立的限制：

- `agents.defaults.timeoutSeconds` 限制整个代理转动。普通网关轮流继承 48 小时默认值。 `0` 使转弯预算不受限制。存储的覆盖（例如 `600`）会替换该默认值。
- CLI 无输出看门狗停止保持静默的子进程。每个后端插件都拥有单独的 fresh/resume 配置文件，即使总体回合预算不受限制，看门狗仍保持活动状态。

移除较短的总体超时覆盖设置，以恢复 48 小时默认值；或者设置一个明确的预算，例如 12 小时：

```bash
# Return to the 48-hour default:
openclaw config unset agents.defaults.timeoutSeconds

# Or choose an explicit 12-hour limit:
openclaw config set agents.defaults.timeoutSeconds 43200
```

CLI 内部启动的后台工作仍然是该 CLI 子进程的一部分。如果父进程达到其总体限制，OpenClaw 会一起停止子进程及其 CLI- 内部后台任务。为了实现持久的长时间工作，请使用分离式 OpenClaw [ 子代理 ](/tools/subagents) 或 [ACP 代理 ](/tools/acp-agents)。默认情况下，分离的子代理没有运行超时。

本地 Claude CLI 与捆绑网关 MCP 一起使用 OpenClaw 的 `exec` 和 `process` 进行 shell 工作。本机 `Bash` 在这些回合中被禁用。在默认的 10 秒屈服窗口后仍在运行的命令会返回托管进程句柄，而不是保持工具调用直到完成。当启用完成通知时，结果会唤醒原始对话；繁忙的对话会在当前轮次之后处理它。延续保留原始回合的工具策略，包括本机工具和其他 MCP 工具，并遵守当前会话策略。限制转弯保持其原始限制。如果只剩下等待，代理会报告作业正在运行并结束轮询，而不是重复轮询。执行策略、配置的产量窗口、命令截止日期和显式通知设置仍然适用。

精确的工具选择、无工具的附带问题、无需网关 MCP 的独立 CLI 运行以及配对节点 Claude 运行保留其现有的工具合同。远程 SSH 等插件工具不会自动成为后台作业。

当 Claude Code 在工具超时后将前台 Bash 命令移动到后台时，OpenClaw 会保持轮次活动，直到 Claude 处理完成并返回其最终答案。后续工具仍然需要当前回合的主机权限。在后台显式启动的命令不会保持回合开放。如果轮次失败或被取消，而其中一个命令仍需要后续操作，则 OpenClaw 将关闭该子进程并为下一轮启动一个新的子进程。

当本机后台代理或工作流程继续时，完整的 Claude 答案可以通过正常回复管道到达通道，而无需等待继续完成。这也适用于原始预览和禁用块流。已发送的答案段在最终结算时不会再次发送；失败的交付仍有资格重试。提供答案并不结束已承认的回合或授予其后台工作另一个回合的权限。

`openclaw agent` 命令也有自己的请求截止时间。其 600 秒后备默认值适用于该命令调用，而不适用于普通网关轮次。参见 [`openclaw agent`](/cli/agent)。

### <a id="claude-cli-specifics"></a> Claude CLI 特定说明

对于每轮传送一个最终回复的通道，Claude Code Stop-hook 拒绝会丢弃被拒绝的回复段，包括当 Claude 在重写之前运行工具时。 `NO_REPLY` 重写保持沉默。普通的工具分割回复仍然保留实质性的工具前文本。

中断的转折可以保留普通的部分散文。如果未完成的回复包含代码示例之外的独立工具协议标记，则 OpenClaw 会丢弃该部分回复，而不是将其保存在对话历史记录中。完成的回复保留其现有验证，包括对讨论不完整标记的支持。停止转弯不会让网关保存 CLI 跑步者拒绝的部分回复的缓冲副本。

捆绑的 Anthropic 插件通过其结构化 stdio 协议直接与安装的 Claude Code 可执行文件进行通信。 Claude Code 拥有其现有的本地登录和订阅。 OpenClaw 使用非秘密路由标记。它从不读取、保留、刷新或转发本机令牌，或发送合成的 Anthropic API 请求。兼容代理转共享一个热Claude Code子进程。更改的模型、系统提示或工具策略会启动新的子流程。当网关或子进程重新启动时，保留的 Claude 会话 ID 仍可提供对话连续性。

对于本地插件管理的轮次，提示构建挂钩上下文保持私有：Claude 将其作为本机挂钩附件接收，而 OpenClaw 历史记录保留原始用户消息。本机会话保留恢复的上下文。导入的可见历史记录和跨提供商后备前奏不会复制私有挂钩附件。

本地插件管理的 Claude 回合还通过此私有钩子上下文在每个回合接收渲染器拥有的运行时事实。会话身份不包含在附加的系统提示中，因此相同的对话可以共享其稳定的前缀。策略和工作区说明保留在系统提示中；进程和配对节点传输保留其现有的运行时交付。替换整个系统提示符的钩子仍然会替换其运行时事实；那些被删除的事实不会通过私人背景来恢复。

保存的会话笔记也可以作为引用的参考数据达到新的和恢复的目的。 OpenClaw 从活动的 reset/compaction 窗口重播符合条件的音符，包括框架在内的总重量限制为 2,000 个字符。较新的笔记优先。省略或截断的注释均已标记。注释可能会重复，因为 CLI 绑定不跟踪本机会话已消耗的 OpenClaw 注释。瞬态运行时上下文和从模型上下文中排除的注释不会重播。

Claude Code 将 OpenClaw MCP 工具注册为 `mcp__openclaw__<name>`，并且可以将它们推迟到 ToolSearch 后面。仅当 OpenClaw MCP 工具暴露于调用时，Claude CLI 后端才会在系统提示符中解释此映射。仅当 `message` 公开时才包含消息传递指南：它使用 `mcp__openclaw__message`，并且可以使用 `select:mcp__openclaw__<name>` 加载延迟工具。当对话需要仅消息工具回复时，这有助于新会话发现传送工具。

保持 Claude Code 更新，特别是如果 OpenClaw 报告安装的可执行文件不兼容：

```bash
claude --version
claude update
# Restart the OpenClaw Gateway after updating.
```

捆绑的 `claude-cli` 后端更喜欢 Claude Code 的本机技能解析器。当当前技能快照至少有一项具有具体化路径的选定技能时，OpenClaw 通过 `--plugin-dir` 传递临时 Claude Code 插件。然后，它会从附加的系统提示符中省略重复的 OpenClaw 技能目录。如果没有具体化的插件技能，OpenClaw 会保留提示目录作为后备。技能 env/API 键覆盖仍然适用于运行的子进程环境。

OpenClaw 禁用 Claude Code 的内置 Git 工作流程指令并使用 `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` 启动 Git 状态快照。当进程恢复时，Claude Code 会重建该快照，因此工作区编辑或提交将使缓存的对话历史记录无效。 Git 工具和工作区说明仍然可用。这并不能防止提示更改、压缩、模型或思维更改或缓存过期后发生缓存未命中。

OpenClaw 禁用 Claude Code 保存的系统提示快照，以便恢复的轮次接收当前附加指令，包括每轮插件上下文。提示不变，保持流程温暖和前缀稳定；更改后的提示将重新启动进程并恢复相同的对话，而不重写其历史记录。更改提示字节可能会使更改的缓存前缀无效。

OpenClaw 始终以其默认权限模式启动 Claude Code。 OpenClaw 的权限响应和 `PreToolUse` 挂钩将本机工具保持在主机控制之下，包括当用户或企业设置以其他方式预先批准呼叫时。本机请求在执行策略和批准之前通过标准 `before_tool_call` 策略，本机工具名称和文件参数投影到其 OpenClaw 等效项中。每个代理和会话的限制仍然凌驾于更广泛的全球政策之上。 OpenClaw- 拥有的 MCP 工具仍由网关授权，而不是接收重复的本机批准。其他 MCP 工具保持主机权限控制。

Claude 的原生 `AskUserQuestion` 使用 OpenClaw 的结构化问题流程。当 OpenClaw 拒绝格式错误的问题时，它会报告失败的字段和约束，而不重复提交的文本，并要求 Claude 更正字段并重试。无效问题不会提示用户。如果用户跳过有效问题，Claude 则会继续做出最佳判断。

当有效的执行询问设置为 `on-miss` 或 `always` 时，OpenClaw 将需要批准的本机或扩展工具请求中继到会话通道： **Allow Once** 允许单个调用，**Allow Always** 允许同一热实时会话的工具名称，而每个后续轮次的策略和可用工具仍然允许它，并且 **Deny**、超时、无法到达的批准路由或关闭轮次都会拒绝该调用。授予会保留在内存中，当替换确切的实时会话时结束，并且永远不会应用于 Bash。从不提示的策略保留其现有行为：`security: "deny"` 拒绝每个请求，并在不询问的情况下以低于完全安全拒绝的方式询问 `off`。

### <a id="native-bash-and-the-exec-allowlist"></a> Native Bash 和 exec 允许列表

当运行保留本机 `Bash` 时，`ask: "on-miss"` 会根据代理的 [exec 允许列表 ](/tools/exec-approvals) 生成 `claude-cli` 后端检查命令。例如：

```bash
openclaw approvals allowlist add --agent main /usr/local/bin/gog
```

OpenClaw 重用其 exec shell 求值器，并且仅当每个命令段解析为显式允许的二进制文件并且可以完全分类和绑定时才允许调用而不提示。可执行文件可以是绝对路径，也可以通过 CLI 启动 PATH 以及代理配置的 exec PATH 进行解析。批准的输入固定解析的可执行路径。成功匹配会更新许可名单使用元数据。 Bindable 会错过第一个不匹配的段或分类原因的提示。批准绑定防护无法绑定的命令（包括管道、命令替换、子 shell、写入重定向和不可解析的语法）在出现提示之前仍然被拒绝。环境前缀覆盖、shell 扩展和 `eval`/`exec`/`source` 包装器不会自动允许。

`ask: "always"` 仍提示输入白名单命令。 `security: "deny"`仍然否认，`ask: "off"`保持上述行为。 **始终允许** 对于 Bash 仍然不可用，并且截断的 Bash 批准描述仍然会阻止执行。

这是应用于 Claude Code 将运行的命令的参数级策略，而不是 OpenClaw 的沙箱执行。 Claude Code 拥有 cwd、PATH、环境和沙箱。当需要沙盒执行时，使用 [ 配对节点 ](/nodes) 或带有 [ 沙盒处理 ](/gateway/sandboxing) 的嵌入式运行时。

### <a id="claude-browser-tools-and-1password-sign-in"></a> Claude 浏览器工具和 1Password 登录

Claude Code可以通过Chrome扩展](https://code.claude.com/docs/en/chrome)中的[Claude驱动Chrome浏览器，包括[1用于Claude](/gateway/1password#browser-sign-in-with-1password-for-claude)凭证自动填充的密码。捆绑的后端不启用它。注册一个 [CLI 后端插件](/plugins/cli-backend-plugins)，它将 `--chrome` 附加到 `claude-stream-json`-dialect 后端的启动参数中。 OpenClaw 在正常运行时保留已配置的 `--chrome`，并始终在使用受限工具策略（例如附带问题）运行时强制使用 `--no-chrome`。 Chrome 窗口、扩展和任何 1Password 批准提示均位于网关主机上。必须有人在该机器旁才能批准凭证的使用。

后端将 OpenClaw `/think` 级别映射到 Claude Code 的本机 `--effort` 标志：`minimal`/`low` -> `low`、`medium` -> `medium` 和 `high`/`xhigh`/`max`直接通过。对于允许固定思维预算的模型，它还推出了 Claude Code 和 `MAX_THINKING_TOKENS`：`off=0`、`minimal=1024`、`low=2048`、`medium=8192`、`high`/`xhigh=16384` 和 `max=32768`。积极的固定预算会阻碍适应性思维。需要适应性思维的模型省略固定预算并继续使用`--effort`。 `adaptive` 删除了配置的工作量标志和固定预算环境覆盖，因此 Claude Code 从其自身的环境、设置和模型默认值中解决了有效的思考问题。其他 CLI 后端需要自己的插件来映射选定的级别，然后 `/think` 才会影响生成的 CLI。

对于本机登录，请登录网关主机上的 Claude Code：

```bash
claude auth login
claude auth status --text
openclaw models auth login --provider anthropic --method cli --set-default
```

普通代理轮流也可以使用保存的订阅令牌，而无需本机登录：

```bash
openclaw models auth paste-token --provider anthropic
```

新会话通过配置的帐户顺序选择保存的订阅凭据，并通过受保护的文件描述符将它们转发到 CLI。现有会话将保留其帐户，直到您选择另一个会话或删除其已保存的配置文件。明确的账户选择和空账户订单仍然具有权威性。为 `anthropic` 提供程序保存的 API 密钥需要显式选择；它们不会自动替换本机订阅登录。

新的插件完成，包括记忆梦想，使用相同的帐户顺序。所请求模型的明确配置文件保持权威；空帐户订单保留本机 Claude 登录。

Docker 安装需要 Claude Code 和持久容器主目录中所选的凭据，而不仅仅是在主机上。请参阅 Docker](/install/docker#claude-cli-backend-in-docker) 中的 [Claude CLI 后端。

网关服务必须解析 `PATH` 上的 `claude`。对于非标准路径，请注册一个小型包装后端插件。

## <a id="sessions"></a> 会话

- 如果CLI支持会话，请使用`{sessionId}`占位符设置`sessionArgs`（例如`["--session-id", "{sessionId}"]`）。
- 如果 CLI 使用带有不同标志的恢复子命令，请设置 `resumeArgs`（恢复时替换 `args`），并可选择为非 JSON 恢复设置 `resumeOutput`。
- `sessionMode`:
  - `always`：始终发送会话 ID（如果未存储，则发送新的 UUID）。
  - `existing`：如果之前存储过会话 ID，则仅发送会话 ID。
  - `none`：从不发送会话 ID。
- `claude-cli` 默认为 `liveSession: "claude-stdio"`、`output: "jsonl"` 和 `input: "stdin"`。拥有的 Anthropic 插件使一个 Claude Code 子进程保持温暖，以便通过其直接 CLI 传输兼容连续代理轮流。如果网关重新启动或空闲进程退出，OpenClaw 将从存储的 Claude 会话 ID 恢复。在恢复之前，将根据可读的项目记录来验证存储的会话 ID。丢失的转录本会清除绑定（记录为 `reason=transcript-missing`），而不是在 `--resume` 下默默地启动新会话。
- Forking 会话（Control UI“分叉对话”、`sessions.create` 与 `fork: true`、`sessions_spawn` 与 `context: "fork"`）将存储的 CLI 会话与记录进行分支。子进程的第一个回合将使用后端的分叉标志（`--fork-session` for `claude-cli`）恢复父进程的本机会话，固定到父进程最后记录的检查点，然后保留新的本机 ID。复制的绑定在恢复之前会像其他任何绑定一样进行验证，因此更改后的身份验证配置文件或环境会重新启动子项。父级的绑定不变。没有分叉和检查点恢复支持的后端，或者没有记录检查点的绑定，会在子进程中启动一个新的本机会话。聊天窗格中的每条消息分叉都会启动一个新的 CLI 会话，因为它们在较早的时间点剪切了脚本。
- 停止或超时恢复的轮次会保留其现有的本机会话，包括当它已经通过网关工具发送进度消息时。下一轮可以恢复该历史记录，而无需重播中断的请求。提供商报告的过期会话或中止的分叉替换仍然会清除绑定；正常帐户、工作区和工具兼容性检查仍然适用。
- 存储的 CLI 会话是提供商拥有的连续性。默认情况下禁用自动重置。 `/reset` 和明确的日常或闲置 `session.reset` 保单仍然会削减它们。
- 当 Fresh CLI 会话的独立帐户边界与所选凭证匹配时，可以从会话 SQLite 数据库恢复 OpenClaw 历史记录。压缩恢复包括最新摘要、保留消息以及活动分支上的后续开启。后端可以在使用 `reseedFromRawTranscriptWhenUncompacted: true` 压缩之前选择有界恢复，包括在清除其本机会话绑定之后。恢复包括保存的工具结果文本和错误标记。它不执行过去的工具。当前用户回合在恢复的历史记录之外发送一次。
- Helper 与调用者拥有的内存中记录一起运行，使用该历史记录进行挂钩、有界会话注释和新会话重新播种，包括压缩之前有意义的历史记录。即使运行携带另一个会话的存储标识，空内存也会保持为空。即使引擎请求后台维护，上下文引擎维护也会在助手返回之前重写相同的内存。持久的成绩单保留其后台维护路径。显式拥有的本机 CLI 绑定仍然可以恢复。恢复轮流发送当前提示和有界会话注释，而不重播对话历史记录。

温暖的过程属于对话，包括轮流在频道和 `chat.send` 之间交替的过程。不同的入站帐户或身份验证配置文件会退出先前的进程，并等待清理后再开始替换。账户私人身份批准不影响更换。

当提示内容更改时，兼容的 CLI 会话可以在当前用户提示之前恢复 OpenClaw 上下文注释。聊天历史记录首先匹配导入的 Claude 用户转向完整的本地文本，包括注释的任何文字引用。如果不匹配，它会忽略一个精确的上下文注释进行比较，因此相同的回合会出现一次。即使在生成对话元数据和最近的聊天历史记录之后，排队的系统事件（包括模型切换通知）也会被忽略进行匹配。存储的 OpenClaw 和本机转录文本保持不变。对于不匹配的导入用户轮次，聊天历史记录仅从显示副本中删除生成的简历注释、历史请求者指南和排队的系统事件前缀。历史请求者指导通过其完整生成的前缀进行识别；匹配的规范用户文本和后来引用的指南保持不变。可识别的运行时提示（例如默认心跳、执行完成、重新启动恢复和本机压缩提示）是隐藏的，而不是显示为人工消息。后续内容块中匹配的规范用户转向和引用文本保持不变。本机和 OpenClaw 历史记录共享有界页面和消息锚点查找。历史工作者准备一个临时合并索引，而不修改存储的记录。冷索引扫描有界源页面以保留全局重复数据删除；后续读取仅选择其请求的窗口。当脚本更改或其数据库所有者关闭时，索引将被丢弃。重置归档回退会根据请求重建索引，因为它们的源文件具有与活动数据库不同的修订版本。隐身历史记录使用请求范围的内存索引，并且从不将该索引写入磁盘。无需迁移或更新修复。

当受限完成回合在单独的 Claude 会话中运行时，下一个普通回合可以恢复从未看到该结果的会话。 OpenClaw 携带自上次普通 Claude 回复到恢复回合以来记录的完成回复，包括保存时的提示。这使用了规范的转录本；它不添加存储状态并且在网关重新启动后仍然存在。其中包括最新的 8 个交易所，每个字符串上限为 2000 个字符，并标记为历史记录，当前事实需要验证。已在绑定会话中运行的完成可能会再次显示为引用的上下文。

此重播需要恢复回合的 [history 帐户边界 ](#history-account-boundaries)。当该边界保留已保存的文本时，仅元数据会话间隙注释会改为计算完成轮次，并在该工具可用时显示 `sessions_history` 提示。完井工具限制保持不变。

### <a id="history-account-boundaries"></a> H历史账户边界

本机会话兼容性和重播保存的 OpenClaw 历史记录的权限是分开的。清除或替换本机绑定不会建立旧转录本行的所有权。 OpenClaw 在承认的 CLI 回合之前记录私人帐户指纹和连续的副本覆盖范围，然后使用该回合存储的副本写入来推进覆盖范围。它从不在此元数据中存储凭证值。

自动持久恢复需要解析的静态凭据或命名的 OAuth 帐户。不透明的 CLI 登录、无身份的 OAuth 凭证、没有出处的旧副本、导入或以其他方式记不清的内容以及不兼容的出处版本无法授权自动重播。根据后端的现有规则，本机简历仍然可用。即使在成功替换、稍后清除或切换回原始帐户后，切换帐户也会使混合历史记录不符合资格。新的会话或空重置可以建立新的边界。保留消息的重置无法重新标记它们。

这使用现有会话元数据和记录 generation/sequence 计数器。不会发生 SQLite 架构迁移或转录本删除。现有对话不会从最新的本机绑定中回填。较旧的二进制文件不强制执行此新的恢复边界。在降级和随后的成绩单写入后，再次升级会拒绝自动重播，因为这些写入未被覆盖。不要依靠降级来保留新的安全行为。

显式调用者拥有的内存上下文仍然是调用者提供的输入，而不是读取携带相同标识符的持久对话的权限。身份验证失效仍然拒绝其恢复提示和保存的会话注释。当自动恢复被拒绝时，保存的记录保持不变。下一个 CLI 进程接收当前请求，但不保存历史记录或注释。

同一本机 Claude 会话的已承认恢复仍然可以接收干预消息的计数、时间范围和模型，以及当该工具可用时当前聊天的 `sessions_history` 调用。在身份验证配置文件、纪元或未知身份边界之后的新本机 Claude 会话可以接收有关其现有 OpenClaw 聊天中早期记录的消息的相同元数据。本通知不包含文字记录或保存的注释，也不授权自动重播；读取历史记录仍然是受当前工具政策约束的按需工具操作。

该通知仅在本机用户轮流中添加前缀。 OpenClaw 保留原始用户文本；本机历史导入将前缀转弯与其现有的本地行相关联，而不是添加重复项。

序列化：`serialize: true` 保持同通道运行有序（大多数 CLI 在一个提供程序通道上进行序列化）。当选定的身份验证身份更改时，OpenClaw 还会删除存储的 CLI 会话重用。当 CLI 公开时，已更改的身份验证配置文件 ID、静态 API 密钥、静态令牌或 OAuth 帐户身份均有效。 OAuth 单独的访问和刷新令牌轮换不会中断会话。如果 CLI 没有稳定的 OAuth 帐户 ID，则 OpenClaw 允许该 CLI 强制执行其自己的恢复权限。

## <a id="fallback-prelude-from-claude-cli-sessions"></a> claude-cli 会话中的回退前导

`claude-cli` 尝试可以故障转移到 [`agents.defaults.model.fallbacks`](/concepts/model-failover) 中的非 CLI 候选者。然后，OpenClaw 使用从 Claude Code 的本地 JSONL 转录本中获取的上下文前奏来播种下一次尝试。该转录本位于 `~/.claude/projects/` 下，按工作区键入。这提供了 CLI- 拥有的上下文，该上下文可能不存在于 OpenClaw 的 SQLite 会话记录中。

- 该前导优先使用最新的 `/compact` 摘要或 `compact_boundary` 标记，然后再附加边界之后最近的对话轮次，直到达到字符预算。边界之前的轮次会被丢弃，因为摘要已经代表了它们。
- 工具块合并为紧凑的`(tool call: name)`和`(tool result: …)`提示，以保持即时预算的真实性。过大的摘要被截断并标记为 `(truncated)`。
- 同提供方的 `claude-cli` 到 `claude-cli` 回退依赖 Claude 自身的 `--resume`，并会跳过前导。
- 该种子会复用现有的 Claude 会话文件路径校验，因此无法读取任意路径。

## <a id="images"></a> 图片

插件作者通过 `imageArg` 声明图片路径支持：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 将 Base64 图像写入临时文件。如果设置了 `imageArg`，这些路径将作为 CLI 参数传递。如果没有，OpenClaw 会将文件路径附加到提示符中（路径注入），这适用于从普通路径自动加载本地文件的 CLI。

## <a id="inputs-and-outputs"></a> 输入和输出

- `output: "text"`（默认）将 stdout 视为最终响应。
- `output: "json"` 尝试解析 JSON 并提取文本和会话 ID。
- `output: "jsonl"` 解析 JSONL 流，并提取最终代理消息以及（如有）会话标识符。
- 对于 Gemini CLI JSON 输出，当 `usage` 丢失或为空时，OpenClaw 读取来自 `response` 的回复文本和 `stats` 的用法。捆绑的 Gemini CLI 适配器使用 `stream-json`。

双引号横幅文本内的 JSON 示例不被视为响应或错误记录。对于 JSONL，横幅扫描在每行上都重新开始。

Claude 流式传输限制折扣识别的部分消息信封，同时计算其文本、思维和工具输入有效负载。累积快照和工具结果仍计入输出预算。单行限制和有界帧计数保持活动状态，包括空事件或无法识别的事件。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。
- `input: "stdin"` 通过 stdin 发送提示。
- 如果提示非常长，并且设置了 `maxPromptArgChars`，则会改用 stdin。

## <a id="plugin-owned-defaults"></a> 插件的所有默认值

CLI 后端默认值是插件接口的一部分：

- 插件通过 `api.registerCliBackend(...)` 注册这些默认值。
- 后端 `id` 会成为模型引用中的提供商前缀。
- 命令、argv、环境、解析器、会话和 watchdog 行为均保留在插件代码中。
- 特定于后端的规范化仍由插件通过可选的 `normalizeConfig` 钩子负责。

Anthropic 拥有 `claude-cli`，Google 拥有 `google-gemini-cli`。 OpenAI Codex 代理通过 `openai/*` 运行使用 Codex 应用程序服务器工具。没有捆绑的 `codex-cli` 后端。

内置的 Anthropic 插件为 `claude-cli` 注册：

| 键                   | 值                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`             | `claude`                                                                                                                                                                                                      |
| `args`                | `-p --output-format stream-json --include-partial-messages --verbose --setting-sources user --allowedTools mcp__openclaw__* --disallowedTools ScheduleWakeup,CronCreate,Bash(run_in_background:true),Monitor` |
| `output`              | `jsonl`                                                                                                                                                                                                       |
| `input`               | `stdin`                                                                                                                                                                                                       |
| `modelArg`            | `--model`                                                                                                                                                                                                     |
| `sessionArgs`         | `["--session-id", "{sessionId}"]`                                                                                                                                                                             |
| `sessionMode`         | `always`                                                                                                                                                                                                      |
| 代理运行时         | 将 stdio 直接传输到温暖的会话范围 Claude Code 子进程                                                                                                                                       |
| `imageArg`            | `@`                                                                                                                                                                                                           |
| `imagePathScope`      | `workspace`                                                                                                                                                                                                   |
| `systemPromptFileArg` | `--append-system-prompt-file`                                                                                                                                                                                 |
| `systemPromptMode`    | `append`                                                                                                                                                                                                      |

在 Claude Code 2.1.98 或更新版本上，捆绑后端在第一次执行 CLI 时进行有界版本检查后添加 `--exclude-dynamic-system-prompt-sections`。并发执行共享检查。 API 目录发现不会启动它。较旧的、未知的或失败的检查保留已建立的 argv。

内置的 Google 插件为 `google-gemini-cli` 注册：

| 键                       | 值                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `command`                 | `gemini`                                                                               |
| `args`                    | `--skip-trust --approval-mode auto_edit --output-format stream-json --prompt {prompt}` |
| `resumeArgs`              | 相同，但加上 `--resume {sessionId}`                                                      |
| `output` / `resumeOutput` | `jsonl`                                                                                |
| `jsonlDialect`            | `gemini-stream-json`                                                                   |
| `imageArg`                | `@`                                                                                    |
| `imagePathScope`          | `workspace`                                                                            |
| `modelArg`                | `--model`                                                                              |
| `sessionMode`             | `existing`                                                                             |
| `sessionIdFields`         | `["session_id", "sessionId"]`                                                          |

先决条件：必须安装本地 Gemini CLI，并在 `PATH` 上作为 `gemini`（`brew install gemini-cli` 或 `npm install -g @google/gemini-cli`），并且所选模型必须具有受支持的 Google AI Studio API-key 配置文件。现有的有效旧版 Gemini CLI OAuth 配置文件保持运行时兼容，但 OpenClaw 不会创建或修复它们。

Gemini CLI 输出说明：

- 默认的 `stream-json` 解析器会读取 assistant `message` 事件、工具事件、最终 `result` 使用量以及致命的 Gemini 错误事件。
- 当 `usage` 不存在或为空时，Usage 回落到 `stats`。 `stats.cached` 标准化为 OpenClaw `cacheRead`，如果 `stats.input` 缺失，则输入令牌源自 `stats.input_tokens - stats.cached`。

## <a id="text-transform-overlays"></a> 文本转换覆盖层

需要小型 prompt/message 兼容性垫片的插件可以声明双向文本转换，而无需替换提供程序或 CLI 后端：

```typescript
api.registerTextTransforms({
  input: [{ from: /red basket/g, to: "blue basket" }],
  output: [{ from: /blue basket/g, to: "red basket" }],
});
```

`input` 重写传递给 CLI 的系统提示符和用户提示符。在 OpenClaw 处理其自己的控制标记和通道传递之前，`output` 重写流式助理文本并解析最终文本。对于提供程序支持的模型调用，它还会在流修复之后和工具执行之前恢复结构化工具调用参数内的字符串值。原始提供者 JSON 片段保持不变。消费者应该使用结构化的部分、最终或结果有效负载。

对于发出特定于提供程序的 JSONL 事件的 CLI，请在该后端的配置上设置 `jsonlDialect`：`claude-stream-json` 用于 Claude Code- 兼容流，`gemini-stream-json` 用于 Gemini CLI `stream-json` 事件。声明`claude-stream-json`是一个合约：后端的`result`记录携带Claude Code的终端语义，包括`terminal_reason`。无回复的 `result` 可以携带 `terminal_reason`，表示 CLI 在工作可能已运行后有意结束开启。这些原因是 `hook_stopped`、`stop_hook_prevented`、`aborted_tools`、`aborted_streaming`、`budget_exhausted` 和 `max_turns`。 OpenClaw 将其视为记录的转弯停止。它向用户报告原因，并且不会在后备模型上重放回合，因为后端的工具操作可能已经运行。

## <a id="native-compaction-ownership"></a> 原生压缩所有权

一些 CLI 后端运行一个压缩其自己的转录本的代理。 OpenClaw 不得针对它们运行其防护摘要程序。这样做会对抗后端自身的压缩，并且可能导致转弯失败。

`claude-cli` 没有harness端点（Claude Code 内部压缩），因此它声明 `ownsNativeCompaction: true`。自动 OpenClaw 压缩遵循 Claude Code，而显式 `/compact` 恢复绑定的 Claude Code 会话并发送其本机 `/compact` 命令。 OpenClaw 通过 Claude Code 记录的 [`CLAUDE_CODE_AUTO_COMPACT_WINDOW`](https://code.claude.com/docs/en/env-vars) 传递运行的有效上下文预算，使本机自动压缩与配置的 Anthropic `contextTokens` 限制保持一致。诸如 Codex 之类的本机harness会话会继续路由到其harness压缩端点。

`google-gemini-cli`还拥有自动压缩功能，并保留其压缩会话以进行恢复。 OpenClaw 遵循 Gemini CLI，而不是运行第二个摘要生成器。此后端不支持显式 `/compact`，因为它未声明手动压缩功能。

```typescript
api.registerCliBackend({
  id: "my-cli",
  ownsNativeCompaction: true,
  manualCompaction: {
    buildPrompt: (instructions) => (instructions ? `/compact ${instructions}` : "/compact"),
    input: "arg",
    validateOutput: (rawOutput) =>
      rawOutput.includes('"type":"compaction_complete"')
        ? { ok: true }
        : { ok: false, reason: "CLI did not confirm compaction." },
  },
  // ...
});
```

仅为真正拥有压缩的后端声明 `ownsNativeCompaction`。它必须可靠地将自己的转录本绑定到上下文窗口附近，并保留可恢复的会话，例如 `--resume` 或 `--session-id`。否则，推迟的会话可能会超出预算。

仅当其命令将恢复的会话压缩到位时才添加原子 `manualCompaction` 功能。它的 `input` 选择后端命令实际识别的传输，而 `validateOutput` 必须要求后端肯定确认，而不是将零退出视为成功。 OpenClaw 将其作为内部控制操作运行：它不是作为用户轮次编写的，并且不运行代理或上下文引擎轮次挂钩。

## <a id="bundle-mcp-overlays"></a> Bundle MCP 覆盖层

CLI 后端不会直接接收 OpenClaw 工具调用，但后端可以通过 `bundleMcp: true` 选择启用生成的 MCP 配置覆盖层。当前捆绑行为如下：

- `claude-cli`：生成严格的 MCP 配置文件。
- `google-gemini-cli`：生成 Gemini 系统设置文件。

启用 bundle MCP 后，OpenClaw 会：

- 生成环回 HTTP MCP 服务器，该服务器向 CLI 进程公开网关工具，并使用仅针对当前执行尝试有效的每次运行上下文授予 （`OPENCLAW_MCP_TOKEN`） 进行身份验证
- 绑定工具访问网关选择的会话、帐户和通道上下文，而不是信任子进程标头
- 为当前工作区启用捆绑 MCP 服务器，并将它们与任何现有后端 MCP 配置或设置形状合并
- 使用所属插件中的后端所有集成模式重写启动配置。

环回桥在工具响应或通知流空闲时发送保活字节，因此 HTTP 空闲超时不会中断长时间运行的工具。这些字节不是工具结果或代理进度；客户端请求截止时间和当前模型尝试的超时仍然适用。

每个环回响应都使用 `Connection: close`，因此客户端无法重用池化套接字，因为服务器会在空闲超时后将其关闭。仅当响应结束时连接才会关闭；长时间运行的工具响应和 SSE 通知流保持打开状态，直到完成或关闭。后面的每个请求都会打开一个新的环回 TCP 连接。

共享侦听器在首次启动的回合完成后仍然可用。稍后的调用使用它们自己的运行权限和调用者活跃度，而不保留起始回合的脚本读取栅栏或请求范围。侦听器保留网关的进程代理和数据库读取器生命周期。替换插件后，新的 CLI 会针对当前插件生成解析桥接工具，而无需重新启动侦听器。退役的插件实例仍然不可用，并且每个回合仍然需要其自己的活动上下文授予。

通过网关的 MCP 桥接器，通道源 CLI 轮流可以使用 `message` 工具进行允许的读取和相同对话操作，包括反应。网桥保留已承认的发件人、帐户和对话；通道访问和写入权限仍然适用。该权限随着轮次或取消而结束，包括当热 CLI 进程被重用于稍后的轮次时。

通过桥创建的没有有限 `toolsAllow` 列表的自动化在运行时遵循所有者会话的工具策略。有限的列表仅限于桥的最终允许的工具和支持的本机功能。当运行为 `exec` 保留本机 `Bash` 时，保存的自动化将保留其网关主机目标，包括显式 `toolsAllow: ["exec"]` 上限。往来账户、工具、沙箱和审批限制仍然适用；捕获目标不会授予更广泛的执行权限。

保留其本机 shell 的后端还可以接收仅节点 `exec` 工具，仅在策略允许且连接的节点通告 `system.run` 时才提供。离线配对的设备和仅限批准的电话不支持远程执行。配置的节点绑定必须标识合格的节点。它永远不会重定向到另一个设备。当连接多个符合条件的节点时，明确选择一个。当策略允许本地执行时，本地 Claude MCP 轮转使用托管 `exec`，或者后端保留时使用本机 shell。

`tools.allow` 和 `tools.deny` 还约束配置的本机 MCP 服务器。 OpenClaw 通过其会话范围的运行时列出每个服务器，分配嵌入式工具使用的相同的提供者安全的 `<safe-server>__<safe-tool>` 身份，并在进程生成或 Codex `thread/start`/`thread/resume`. 之前应用完整的分层策略，然后将准确的原始名称投影到每个后端的执行合同中：Claude 接收服务器遗漏加上裸露`--disallowedTools`条目，Codex接收`enabled_tools`和`disabled_tools`，Gemini接收`includeTools`和`excludeTools`。配置的服务器过滤器和会话覆盖仍然是额外的限制。这些后端字段是生成的实现细节。将操作员策略保留在 OpenClaw 配置中。

例如，`agents.entries.research.tools.allow: ["docs__read_docs"]` 仅公开安全 `docs` 命名空间中的该工具，而 `deny: ["docs__delete_*"]` 则删除匹配的同级工具。空交集会忽略受影响的 MCP 服务器。无法建立限制性目录的服务器也会被忽略并报告，而不是未经过滤地通过。

受限运行（例如使用 `toolsAllow` 的 cron 作业）需要精确的后端拥有的转换。捆绑的 `claude-cli` 后端禁用 Claude 的本机工具以及用户、项目和本地自定义，包括挂钩、插件、代理、技能和 `CLAUDE.md`。然后，它通过授权范围的 MCP 服务器公开每个允许的 OpenClaw 工具。这将文件系统、进程、执行、批准和沙箱策略保留在 OpenClaw 内部，而不是将权限扩大到 Claude 的本机工具或自定义进程。相同的 MCP 列表在 Claude 生成的配置中强制执行，并由网关在工具列表和执行时再次执行。在授予授权之前，核心会拒绝在原始允许列表之外命名任何 MCP 权限的后端翻译。没有精确翻译的后端仍然拒绝运行。

如果没有启用 MCP 服务器，当后端选择捆绑 MCP 时，OpenClaw 仍然会注入严格的配置，因此后台运行保持隔离。

会话范围内的捆绑 MCP 运行时会被缓存以在会话中重复使用，然后在 10 分钟的空闲时间后收获。一次性嵌入式运行，例如运行结束时的身份验证检查、slug 生成和活动内存调用请求清理。因此，Stdio 子级和 Streamable HTTP 或 SSE 流的寿命不会超过运行时间。

新的 CLI 会话必须等待其前一个会话的清理。如果清理失败或超过截止日期，OpenClaw 会拒绝更换，包括以后运行的更换。在重试之前检查清理错误和后端的剩余进程。仅命令输出和进程退出并不能确认后代已停止。

对于 `claude-cli`，安装的 Claude Code 进程使用其当前的本机登录。 OpenClaw 使用非秘密路由标记，并且从不读取、保留、刷新、选择或转发本机令牌。在网关进程上设置 `CLAUDE_CONFIG_DIR` 以使用单独的 Claude 配置目录。显式 OpenClaw- 托管 API- 密钥和令牌配置文件继续使用受保护的、每次调用凭证转发 CLI 路径。

## <a id="reseed-history-cap"></a> 重设历史上限

新的 CLI 会话可以从先前的 OpenClaw 转录本中播种，例如在 `session_expired` 重试之后。然后，渲染的 `<conversation_history>` 块被限制，以防止重新播种提示无限制地增长。默认值为 12,288 个字符（约 3,000 个标记）。

Claude CLI 后端通过解析的 Claude 上下文窗口来缩放此上限。更大的上下文窗口会获得更大的先验历史切片，直到固定的上限。其他 CLI 后端保留保守的默认值。此上限仅管理重新播种提示的先前历史块。

## <a id="limitations"></a> 限制

- OpenClaw 不会将工具调用注入到 CLI 后端协议中。后端仅在选择 `bundleMcp: true` 时才能看到网关工具。
- 流式传输取决于后端：某些后端以 JSONL 形式进行流式传输，其他后端则会缓冲内容直到退出。
- 结构化输出取决于 CLI 自身的 JSON 格式。

## <a id="troubleshooting"></a> 故障排查

一旦最终的 CLI 回复提交到 OpenClaw 转录本，以后的清理、连续性或授权失败将被记录为警告，并且不会将已完成的运行转变为失败的请求。最终回复提交之前的失败仍然会导致运行失败；中断或暂停的回复不是完整的答案。

当本地 Claude Code 子进程失败时，其运行错误包括有限的、经过编辑的 stderr 诊断（如果可用）。检查运行错误或 `openclaw logs` 是否存在底层启动、权限或运行时故障。成功的转向不会将 stderr 转发到日志中。每个实时进程都有自己的诊断缓冲区。由于 stderr 没有轮次标识符，因此热进程的失败可能包括较早的轮次。该错误将输出标记为进程范围的输出，而不是将其归因于失败的回合。过大的不完整行被省略，因此截断不会暴露凭证片段。本机标准输出和 MCP 输入不包含在这些诊断中。 Stderr 只是补充显示文本。它不会更改本机错误的重试、身份验证、超时或后备分类。

在 macOS 和 Linux 上，当子进程在正常关闭期间退出时，损坏的输入管道会保留进程的退出错误。如果 OpenClaw 必须终止子进程，则原始管道错误仍然是失败；取消保留其自身的原因。

| 症状               | 修复                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| 找不到 CLI         | 将 CLI 放在网关服务的 `PATH` 上，或者更新所属插件的注册命令。 |
| 模型名称错误      | 更新插件的 `modelAliases` 映射。                                                    |
| 会话无法保持连续性 | 检查插件的 `sessionArgs` 和 `sessionMode`。                                            |
| 图片被忽略        | 检查插件的 `imageArg` 以及 CLI 对文件路径的支持情况。                                 |

## <a id="related"></a> 相关内容

- [Gateway 运行手册](/gateway)
- [本地模型](/gateway/local-models)
- [思维水平](/tools/thinking) — 推理预算如何映射到 CLI 后端
