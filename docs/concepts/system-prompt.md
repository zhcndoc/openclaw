---
summary: "OpenClaw 系统提示词包含的内容以及其组装方式"
read_when:
  - "编辑系统提示文本、工具列表或临时部分"
  - "更改工作区引导加载或技能注入行为"
title: "系统提示词"
---

OpenClaw 拥有每次代理运行的系统提示；没有运行时默认提示。运行时适配器可以在应用当前回合上下文和显式刷新时重用会话准备。

组装分为三层：

- `buildAgentSystemPrompt` 根据显式输入渲染提示词。它保持纯渲染器的特性，不直接读取全局配置。
- `buildConfiguredAgentSystemPrompt` 在渲染之前为特定代理应用配置支持的提示旋钮（所有者显示、TTS 提示、模型别名、内存引用模式、子代理委托模式）。
- 运行时适配器（嵌入式、CLI、command/export预览、压缩）收集实时事实（工具、沙箱状态、通道功能、上下文文件、提供者提示贡献）并调用配置的提示外观。

这使得 exported/debug 提示界面与实时运行保持一致，而无需将每个运行时细节转变为一个整体构建器。

Node- 托管 OpenClaw 会话使用与网关本地会话相同的提示和引导程序准备。网关根据会话的现有隐私和工具策略选择代理指令、角色文件、技能、记忆指导和对话上下文。该节点提供自己的工作空间路径、主机、OS、shell 和活动进程事实。将执行移至节点不会将代理切换到通用编码提示或使未选定的节点本地引导文件成为其上下文的一部分。

上下文引擎选择、历史记录准备和回合结算仍归 Gateway 所有。直接后转挂钩在节点的工作区结果被接受之后且其放置声明被释放之前运行。

提供程序插件可以提供缓存感知指导，而无需替换 OpenClaw-owned 提示。提供者运行时可以：

- 替换三个命名核心部分之一：`interaction_style`、`tool_call_style`、`execution_bias`
- 在提示词缓存边界之上注入一个 **稳定前缀**
- 在提示词缓存边界之下注入一个 **动态后缀**

使用提供商拥有的贡献进行特定于模型系列的调整；自 v2026.4.5. 以来，它们一直是推荐路径保留仍受支持的 `before_prompt_build` 挂钩，以实现兼容性或真正的全局提示更改。

内置的 GPT-5- 系列提示贡献 （`resolveGpt5SystemPromptContribution`） 使用此机制：`stablePrefix` 行为契约（执行策略、工具规则、输出契约、完成契约）加上可选的 `interaction_style` 覆盖，以获得更友好的语气。对于 OpenAI-family 路由，`plugins.entries.openai.config.personality` 控制该样式层：`"friendly"` 是默认值，`"on"` 别名 `"friendly"`，`"off"` 仅删除友好覆盖；稳定的行为契约仍然存在。

## <a id="structure"></a> 结构

提示词很紧凑，包含固定部分：

- **Tooling**：结构化工具真相来源提醒以及运行时工具使用指导。当 `progress_card` 启用时（`tools.updatePlan`，默认情况下打开），其自身的描述解释了如何维护一份持久计划和状态注释，最多保留一个步骤 `in_progress`，并跳过不改变图片的例行更新。
- **执行偏差**：依次对可操作的请求采取行动，继续直到完成或被阻止，从弱工具结果中恢复，实时检查可变状态，并在最终确定之前进行验证。使用可用工具请求的操作已获得授权：工具策略、沙箱和执行批准会在运行时控制风险，因此提示不会要求模型预先拒绝、警告或寻求额外权限。
- **Promised Work**：有希望的未来、背景、委派或持续的工作创建后续所有权：在结束回合之前安排可用的完成或观察路径，主动返回结果或具体的阻碍，并且永远不要将进度（如 `running`）视为完成。
- **Care**：在编辑现有配置或调度程序文件之前检查和合并，使用或存储用户根据要求共享的凭据，分组中私人交付短期登录代码，以及在没有可用控制工具时的终端设置路线。
- **运行时上下文**：针对缓存边界之上的所有提供者的通用指南；特定于工具的说明保留在当前工具功能的下方。 OpenClaw 为当前请求附加单独的类型化运行时上下文消息。这包括本地日期和时区、有关活动执行会话、活动子代理和媒体生成进度的紧凑事实，以及 `exec` 可用时有关 Windows 的咨询批准可执行提示。 [运行时上下文和提供者角色](/concepts/context#runtime-context-and-provider-roles)解释了本机操作员通道、用户角色兼容性载体和引用数据边界。使用它时无需回复或描述它，将其内部详细信息保密，并且无需等待另一条消息即可继续。
- **技能**（可用时）：告诉模型如何按需加载技能说明。
- **OpenClaw Control**：使用 `gateway` 检查配置（`config.get` / `config.schema.lookup`）；请求重新启动、配置、通道、插件、代理和 model/provider 通过 `openclaw` 更改（如果可用）。委托变更遵循[有效权限](/gateway/permission-modes#delegated-setup-and-repair)。对于托管此会话的网关，所有者请求的更新仅在明确的用户请求时使用 `gateway` 操作 `update.run`，并自动重新启动和完成或失败通知。如果没有 `gateway`，请将用户定向到 OpenClaw 所有者、终端中的 `openclaw update` 或 Control UI 以更新该网关。切勿修改网关的安装或通过 exec 或分离作业控制其服务；不要发明 CLI 命令。当 `exec` 可用时，提示还显示：“对于另一台主机上的用户请求的更新，请验证它不是此网关，然后将 exec/SSH 与 `openclaw update --yes` 一起使用；正常的执行批准仍然适用。”请参阅 [ 自动化和 SSH](/cli/update#automation-and-ssh)。
- **Messaging**：使用 OpenClaw 路由进行连接的通道回复和操作，而不是 shell 或 HTTP 解决方法。这并不禁止用户授权CLI或API进行其他服务的操作，例如发送电子邮件；正常的工具权限和批准仍然适用。
- **工作区**：工作目录（`agents.defaults.workspace`）。
- **Documentation**：本地 docs/source 路径以及何时读取它们。
- **工作区文件（注入）**：说明引导文件已包含在下方。
- **沙箱**（启用时）：沙箱化运行时、沙箱路径、是否可用提升权限的执行。
- **助手输出指令**：紧凑附件、语音消息和回复标签语法。
- **UI 演示**（当演示工具可用时）：紧凑的小部件、仪表板和门户路由；验证实际交付的表面。
- **可折叠详情**（支持时）：教导模型在 `<details>` 披露内容中保留可选的深度，同时让主要回答和必需操作保持可见。
- **Runtime**：主机、OS、节点、模型、存储库根（检测到时）和会话身份（一行）。仅当共享会话有某人值得赞扬时，Git 共同作者预告片才会出现在此处。活动执行会话在运行时上下文载体中传播。推理工作通过提供商控制进行；其 Ultra 编排指导保持在缓存边界以下。使用 `/status` 检查所选工作。
- **推理**：当前可见性级别以及 `/reasoning` 切换提示。

大型稳定内容（**Project Context**、工作区指令、固定执行和提供程序策略以及常见的 **Runtime Context** 指令）保留在内部提示缓存边界之上。当前工具功能和目录（**Tooling**、**Skills**、**Memory Recall**、**Model Aliases**、工具特定运行时指南（**Care**、**Documentation** 和 **Sandbox**）在其下方呈现，旁边还有通道和每转指南。因此，刷新目录或更改授予的工具会使缓存的工作空间前缀字节相同，同时保留完整的当前指令。

其他易失部分包括 **UI 演示**、Control UI 嵌入指南、**Messaging**、**Collapsible Details**、 **语音**、**群聊上下文**、**反应**、**运行时**、**项目内存**事实、通道特定的ACP提示、delegation/orchestration模式和当前提升的级别。日期、时区、执行、子代理和媒体事实也使用后面的运行时上下文载体来保留对话历史记录前缀。边界是内部传输元数据：每个部分仍然是 CLI 后端的系统提示指导。当接受的模式已经携带该运行时详细信息时，工具描述应避免嵌入当前通道名称。

当尝试解决时，工具完成会准备不可变的特定于提供者的模式描述符。热轮会重用这些描述符，而启用的工具、插件清单、provider/model、配置和源模式保持不变。模式所有者通过替换模式对象来发布更改。为每次尝试创建执行回调、取消、挂钩和权限绑定；保留的描述符永远不会授予权限。

动态工具模式重用由其解析的功能和策略输入作为关键的有界的、不可变的变体。更改的操作集、生成策略、自动化模式或通道属性会选择新的变体。无法就地编辑已发布的嵌套架构；需要不同描述符的自定义挂钩必须用自己的副本替换它们。

在受支持的直接 Anthropic API-key 路由和本机 OpenAI 响应路由上，嵌入式会话固定此边界的两侧。刷新的部分在当前用户轮流后作为指令消息附加，保留早期的提示和历史字节。路线或选定的个人资料更改、重置和压缩开始新系列；技能和记忆刷新合同继续提供更新的指导。提示缓存诊断使用一组有界名称来识别更改的部分，而不记录其内容。

媒体任务事实仅包括启用的媒体工具和属于当前请求者的任务。没有记录请求者的恢复任务使用配置的会话所有者；已完成的任务被省略。

工具链还包含长期任务指导：

- 使用 cron 进行未来的后续工作（`check back later`、提醒、重复工作），而不是 `exec` 睡眠循环、`yieldMs` 延迟技巧或重复 `process` 轮询
- 仅对“现在开始并在后台继续”的命令使用 `exec` / `process`
- 当启用自动完成唤醒时，只启动一次命令并依赖推送式唤醒路径
- 使用 `process` 处理运行中命令的日志、状态、输入或干预
- 对于较大的任务，更喜欢 `sessions_spawn` 并遵循其可接受的完成模式：宣布子级返回完成事件；收集器需要明确的结果收集
- 将子完成视为该运行的结束，而不是证明委托用户目标已完成；当范围内的工作仍然存在时，继续持续会话
- 不要为了等待完成而循环轮询 `subagents list` / `sessions_list`

`agents.defaults.subagents.delegationMode`可以加强这一点。如果没有明确设置，OpenClaw 在每个代理的主会话中使用 `"prefer"`，在其他地方使用 `"suggest"`；明确的默认值或每个代理的覆盖总是获胜。 `"prefer"` 添加了专用的 **Delegation** 部分，告诉代理保持响应，使用隐藏的子代理进行内部跑腿工作，并使用可见的侧边栏会话来处理用户将跟踪或返回的工作。这只是提示；工具策略仍然控制 `sessions_spawn` 是否可用。

在 `ultra` 思考级别下，当 `sessions_spawn` 可用时，还会添加一个 **主动的子代理编排** 部分：它告诉模型通过子代理并行化独立的调查、实现和验证工作，将简单或紧密耦合的工作保留在本地，为每个子代理设定有边界的目标，并在回复前综合结果。

`secrets` 工具描述教导元数据优先发现、任务所需的屏蔽请求以及支持的配置字段的返回存储 SecretRefs。设置工具描述通过屏蔽流路由凭证收集。 **Care** 部分告诉代理使用或存储用户根据要求共享的凭据、完成任务，并在最终回复中简要确认如何使用或存储所提供的凭据，而无需重复其值。该承认仍然是事实且不令人担忧。它还将用户请求的登录或配对代码以及验证 URL 从群组对话私下发送给请求用户，然后在没有代码或 URL 的情况下进行群组确认。当 `openclaw` 和 `gateway` 都不可用时，它将通道、提供商和凭证设置定向到终端中的 `openclaw channels add <channel>` 或 `openclaw configure`，其中提示屏蔽机密。根据 Codex 和 Copilot 的可调用控制工具，此凭据指南也会出现在提示中。请参阅 [Secrets](/tools/secrets)。

UI 演示指南与本机 Codex 开发人员说明共享。它仅包括当前可调用工具，包括延迟工具和代码模式工具；最小提示省略它。工具资格遵循客户端和频道演示者的功能，而不是硬编码的频道列表。 [widget](/tools/show-widget) 可以内联渲染或使用通道演示器；其返回的演示文稿具有权威性。

该紧凑指南将小部件与 [dashboard](/web/dashboards) 布局、[portals](/gateway/portals) 和浏览器选项卡区分开来。缺少创作是会话限制，而不是平台限制。通过 **Control UI 打开门户 → Portals**，而不是裸露的 `publicUrl`；带有令牌的 URL 保持私密。代理必须验证所交付的交互或声明其未经验证。工具描述和链接文档拥有详细的沙箱、权限和服务器设置说明。

风险是在运行时强制执行的，而不是在即时散文中强制执行的。工具策略、执行批准、沙箱和通道白名单决定运行或需要确认的内容；提示告诉代理根据请求的工作采取行动，并让这些门来决定。

网关拥有的提示组件携带与消息文本分开的上下文来源。上下文生成器将运行时指令与对话数据和心跳结果区分开来。在新会话中，模型投影会转义入站文本中提到的内部上下文分隔符，并引用上下文数据，而不更改存储的用户记录。匹配文本永远不会将消息提升到运行时上下文中。这是即时强化，而不是授权边界或针对即时注入的保证。

转录本标题选择此投影：新会话使用版本 4；现有版本 3 会话在重新启动后保留其先前的投影。分支和恢复的历史记录保留源版本，重置边界和现有转录本中的压缩也是如此。采用后保留的历史未受影响； Doctor 使用版本 3 修复了遗留的无标头历史记录。在模型提交之前未知的投影版本将被拒绝。提供者消息角色保持不变，以保持保留思维前缀兼容性。云工作线程在启动前会使用相同的网关拥有的提示投影，并将受信任的运行时上下文单独传递给工作线程，从而添加其执行主机事实。

恢复的房间 CLI 会保留新的线程注释、系统事件和 MCP 应用程序上下文。

在具有本机批准 cards/buttons 的渠道上，提示会告诉代理首先依赖该 UI，并且仅当工具结果表明聊天批准不可用或手动批准是唯一路径时才包含手动 `/approve` 命令。

## <a id="prompt-modes"></a> 提示词模式

OpenClaw 会为子代理渲染更小的系统提示词。运行时会为每次运行设置一个 `promptMode`（不是面向用户的配置）：

- `full`（默认）：所有上述部分。
- `minimal`：用​​于分代理；省略内存提示部分（捆绑为 **Memory Recall**）、**Model Aliases**、**User Identity**、**Assistant Output指令**、**消息传递**、**可折叠详细信息**和**无声回复**。工具、**Care**、**Skills**（如果提供）、工作区、沙箱、运行时和注入上下文保持可用。当前日期和时区仍然通过回合上下文到达。
- `none`：仅返回基础身份行。

在 `promptMode=minimal` 下，额外注入的提示词会标记为 **子代理上下文**，而不是 **群聊上下文**。

**Silent Replies** 部分适用于外部消息通道，包括仅消息工具回复；直接消息提示省略它。即使需要答案，仅令牌 `NO_REPLY` 仍会默默地结束外转。该指南解释说，`NO_REPLY` 会丢弃未发送的文本，因此请先发送确认。子代理、私人完成、Control UI 和其他内部会话不会收到静默令牌指导：它们必须返回结果或继续未完成的工作。参见[无声回复](/concepts/messages#silent-replies)。

## <a id="prompt-snapshots"></a> 提示词快照

OpenClaw 在 `test/fixtures/agents/prompt-snapshots/codex-runtime-happy-path/` 下保留 Codex 运行时快乐路径的提交提示快照。它们渲染选定的应用程序服务器 thread/turn 参数以及用于 Telegram direct、Discord 组和心跳轮次的重构的模型绑定提示层堆栈：固定的 Codex `gpt-5.5` 模型提示固定装置、Codex 快乐路径许可开发人员文本、父本地请求指令、 OpenClaw 开发人员说明、本机协作模式说明、用户轮流输入以及动态工具规范参考。

使用 `pnpm prompt:snapshots:sync-codex-model` 刷新固定的 Codex 模型提示词夹具。默认情况下，它会依次查找 `$CODEX_HOME/models_cache.json`、`~/.codex/models_cache.json`，然后是维护者检出约定 `~/code/codex/codex-rs/models-manager/models.json`；如果这些都不存在，它会直接退出而不修改已提交的夹具。传入 `--catalog <path>` 可从特定的 `models_cache.json` 或 `models.json` 文件刷新。

这些快照不是逐字节的原始 OpenAI 请求捕获。 Codex 可以在 OpenClaw 发送线程和转弯参数后添加运行时拥有的工作空间上下文（`AGENTS.md`、环境上下文、内存、app/plugin 指令、内置默认协作模式指令）。

使用 `pnpm prompt:snapshots:gen` 重新生成；使用 `pnpm prompt:snapshots:check` 验证漂移。CI 会将漂移检查与额外边界分片一并运行，因此提示词变更和快照更新会在同一个 PR 中落地。

## <a id="workspace-bootstrap-injection"></a> 工作区引导注入

代理身份、指令和内存从配置的代理工作区解析，并路由到与其生命周期相匹配的提示表面。当会话从另一个文件夹或托管工作树运行时，该文件夹仍然是执行工作区。其 `AGENTS.md` 作为项目上下文附加在配置的工作区文件之后； OpenClaw 不会从执行文件夹加载 `SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md` 或 `BOOTSTRAP.md`。

仅在配置的代理工作区中将启动种子缺少引导模板，而不要在单独的执行文件夹中。这也适用于生成的子会话和会话绑定的 cron 轮次。

- `AGENTS.md`
- `SOUL.md`
- `IDENTITY.md`
- `USER.md`
- `BOOTSTRAP.md` (仅在全新工作区中)
- `MEMORY.md`（如果存在）

在本机 Codex harness上，OpenClaw 避免在每次用户轮流中重复稳定的工作区文件。 Codex 通过本机项目文档发现加载执行文件夹的 `AGENTS.md`，包括其 `## Tools` 部分，因此 OpenClaw 不会再次注入该文件。当执行使用另一个文件夹时，OpenClaw 将配置的代理工作区的有界 `AGENTS.md` 快照添加到线程级开发人员指令中，以便本机 Codex 子代理继承它。在托管捆绑 stdio 应用程序服务器上，`SOUL.md`、`IDENTITY.md` 和 `USER.md` 附加到仅限父模型请求指令而不是本机历史记录，因此新交付的角色不会自动流向本机子代理。没有托管推理中继的连接（包括外部连接和桌面连接）通过本机子级可以继承的可刷新线程开发人员指令提供共享角色。选定的个人 `users/<profile-id>/USER.md` 覆盖在这些连接上被省略，因为它们缺少仅限家长的运营商； OpenClaw 在选择其中一个时记录一条警告。更古老的历史被保留下来。 `MEMORY.md` 内容也不会粘贴到每个本机 Codex 转弯中：当内存工具可用于代理工作区时，Codex 转弯会获得一个小的工作区内存注释，将模型定向到 `memory_search` 或 `memory_get`。如果工具被禁用或内存搜索不可用，`MEMORY.md` 会回退到正常的有界回合上下文路径。 `BOOTSTRAP.md` 保持正常的回合上下文角色。

心跳监视器暂存不是引导程序文件。心跳运行器仅将其附加到预定的心跳用户消息中；正常轮次不会收到它，并且系统提示不包含心跳特定部分。

在非 Codex harness 上，其余启动文件会按现有门控组合成 OpenClaw 提示。请保持注入文件简洁，尤其是非 Codex 的 `MEMORY.md`：它应保持为经过整理的长期摘要，详细的每日笔记则放在 `memory/*.md` 中，并可通过 `memory_search` / `memory_get` 按需检索。过大的非 Codex `MEMORY.md` 文件会增加提示占用，并可能在下方启动文件限制下被部分注入。

<Note>
`memory/*.md` 每日文件**不属于**正常的启动 Project Context。对于普通轮次，它们通过 `memory_search` / `memory_get` 按需访问，因此不会计入上下文窗口，除非模型显式读取它们。裸 `/new` 和 `/reset` 轮次是例外：运行时可以在第一个轮次中预先附加最近的每日记忆，作为一次性的启动上下文块。
</Note>

大文件会被截断，并带有标记：

| 限制                   | 配置键                               | 默认值 |
| ----------------------- | ---------------------------------------- | ------- |
| 每个文件的最大字符数 | `agents.defaults.bootstrapMaxChars`      | 20000   |
| 所有文件的总字符数  | `agents.defaults.bootstrapTotalMaxChars` | 60000   |

当发生截断时，OpenClaw 总是在系统提示符中注入一个简洁的通知，指出某些引导文件被截断，并直接读取受影响的文件；该通知是内置的且不可配置，并且故意省略每个文件的详细信息。丢失文件注入一个短的丢失文件标记。文件名和 raw/injected 计数保留在诊断中，例如 `/context`、`/status`、医生和日志。

对于记忆文件，截断并不意味着数据丢失：文件仍会完整保留在磁盘上。在原生 Codex 中，当记忆工具可用时，`MEMORY.md` 会通过记忆工具按需读取，否则回退到有界提示。对于其他 harness，模型只会看到被缩短后的注入副本，直到它直接读取或搜索记忆。如果 `MEMORY.md` 反复被截断，应将其提炼为更短的持久摘要，把详细历史移入 `memory/*.md`，或者有意提高启动限制。

子代理会话只注入 `AGENTS.md`（其他启动文件会被过滤，以保持子代理上下文较小）。

内部钩子可以通过 `agent:bootstrap` 事件拦截此步骤，以修改或替换注入的启动文件（例如用替代人格替换 `SOUL.md`）。

为了听起来不那么通用，请从 [SOUL.md 个性 Guide](/concepts/soul) 开始。

要查看每个注入文件的贡献大小（原始值 vs 注入值、截断、工具架构开销），请使用 `/context list` 或 `/context detail`。参见 [Context](/concepts/context)。

## <a id="time-handling"></a> 时间处理

**Temporal Context** 部分在系统提示符之外的当前运行时上下文中携带用户本地日历日期和时区。它会刷新每个回合，而不会重写之前的消息。因此，日翻转使完整的系统提示和先前的对话字节保持不变，从而保留本地和托管提供商的前缀缓存重用。原始模型探针忽略 OpenClaw 运行时上下文。

默认情况下，聊天完成和本机 Ollama 会保留这些隐藏的每轮消息，因此下一个请求会扩展上一个请求的前缀。提供者重放策略可以明确选择退出。保留的运行时事实包括用于清除早期活动状态的空快照，并计入正常历史记录和压缩预算；瞬态路由仍然忽略空的生产者快照。

当代理需要确切的当前时间且该工具可用时，请使用 `session_status`；其状态卡片包含时间戳行。同一工具还可以选择设置每个会话的模型覆盖（`model=default` 可清除该设置）。

通过以下项进行配置：

- `agents.defaults.userTimezone`

有关完整行为详细信息，请参阅 [Timezones](/concepts/timezone) 和 [Date & Time](/date-time)。

## <a id="skills"></a> 技能

当存在符合条件的技能时，OpenClaw 会为每个技能注入一个紧凑的 `<available_skills>` 列表 （`formatSkillsForPrompt`），其中包含 **文件路径**。该提示指示模型使用 `read` 在列出的位置（工作区、托管或捆绑）加载 SKILL.md。如果没有符合条件的技能，则省略技能部分。

托管本机 Codex 轮次通过父本地模型请求指令而不是每轮用户输入接收此列表，但保留确切计划提示的轻量级 cron 轮次除外。没有该中继的连接使用线程开发人员指令，因此模型拥有的协作指令无法替换目录。其他harness保留正常的提示部分。

该位置可以指向嵌套技能，例如 `skills/personal/foo/SKILL.md`。嵌套仅用于组织；提示使用的是来自 `SKILL.md` frontmatter 的扁平技能名称。

资格包括技能元数据门控、运行时 environment/config 检查以及配置 `agents.defaults.skills` 或 `agents.entries.*.skills` 时的有效座席技能允许列表。插件捆绑的技能仅在启用其所属插件时才有效，让工具插件公开更深入的操作指南，而无需将所有这些指南嵌入到每个工具描述中。

```xml
<available_skills>
  <skill>
    <name>...</name>
    <description>...</description>
    <location>...</location>
  </skill>
</available_skills>
```

这使得基本提示保持较小，同时仍然允许有针对性的技能使用。大小调整由技能子系统拥有，与通用运行时 read/injection 大小调整分开：

| 范围     | 技能提示预算                                 | 运行时摘录预算             |
| --------- | ---------------------------------------------------- | ---------------------------------- |
| 全球    | `skills.limits.maxSkillsPromptChars`                 | `agents.defaults.contextLimits.*`  |
| 每个代理 | `agents.entries.*.skillsLimits.maxSkillsPromptChars` | `agents.entries.*.contextLimits.*` |

运行时摘录预算涵盖 `memory_get`、实时工具结果以及压缩后 `AGENTS.md` 的刷新。

## <a id="documentation"></a> 文档

**Documentation** 部分指向可用的本地文档（Git 签出中的 `docs/` 或捆绑的 npm 包文档），否则回退到 [https://docs.openclaw.ai](https://docs.openclaw.ai)。它还列出了 OpenClaw 源位置：Git 签出公开本地源根目录，软件包安装获取 GitHub 源 URL 以及当文档不完整或过时时查看源的说明。

在模型理解 OpenClaw 的工作原理（memory/daily 注释、会话、工具、网关、配置、命令、项目上下文）之前，提示框将文档作为 OpenClaw 自我知识的权威，并告诉模型处理 `AGENTS.md`、项目上下文、workspace/profile/memory 注释和 `memory_search`作为指令上下文或用户内存而不是 OpenClaw design/implementation 知识。如果文档是沉默的或过时的，模型应该这样说并检查来源。它还告诉模型在可能的情况下自行运行 `openclaw status`，仅在缺乏访问权限时询问用户。

就配置而言，它会引导代理先使用 `gateway` 工具动作 `config.schema.lookup` 获取精确的字段级文档和约束，然后再查看 `docs/gateway/configuration.md` 和 `docs/gateway/configuration-reference.md` 以获得更全面的指导。

## <a id="related"></a> 相关内容

- [代理回路](/concepts/agent-loop)
- [代理运行时](/concepts/agent)
- [Agent 工作区](/concepts/agent-workspace)
- [上下文引擎](/concepts/context-engine)
