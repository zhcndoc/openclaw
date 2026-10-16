---
doc-schema-version: 1
summary: "OpenClaw 工具、技能和插件概览：代理可以调用什么以及如何扩展它们"
read_when:
  - "你想了解 OpenClaw 提供了哪些工具"
  - "你正在在内置工具、技能和插件之间做选择"
  - "你需要关于工具策略、自动化或代理协调的正确文档入口"
title: "概览"
---

使用此页面来选择合适的能力层。**工具**是可调用的动作，**技能**教会代理如何工作，而**插件**添加运行时能力，例如工具、提供者、通道、钩子和打包的技能。

这是一个概览和路由页面。有关完整的工具策略、默认值、 组成员关系、提供者限制和配置字段，请使用 [工具和自定义提供者](/gateway/config-tools)。

## <a id="start-here"></a> 从这里开始

对于大多数代理，先从内置工具类别开始，然后仅当代理应看到更少的工具或需要明确的主机访问时再调整策略。

| 如果您需要to...                            | 先用这个                                 | 然后阅读                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 让代理利用现有能力行动  | [内置工具](#built-in-tool-categories)    | [工具类别](#built-in-tool-categories)                                                                                                           |
| Control 代理可以调用​​什么               | [刀具政策](#configure-access-and-approvals) | [工具和定制提供商](/gateway/config-tools)                                                                                                    |
| 教座席工作流程                    | [技能](#choose-tools-skills-or-plugins)      | [技能](/tools/skills)、[创作技能](/tools/creating-skills)、[技能Workshop](/tools/skill-workshop)和[自学](/tools/self-learning) |
| 添加新的集成或运行时表面     | [插件](#extend-capabilities)                | [插件](/tools/plugin) 和 [构建插件](/plugins/building-plugins)                                                                                |
| 稍后或在后台运行工作          | [自动化](/automation)                      | [自动化概览](/automation)                                                                                                                     |
| 协调多个代理或harness      | [子智能体](/tools/subagents)                 | [ACP代理](/tools/acp-agents)和[代理发送](/tools/agent-send)                                                                                    |
| 从代码中编排并发代理      | [Swarm](/tools/swarm)                          | [代码Mode](/tools/code-mode)和[子智能体](/tools/subagents)                                                                                       |
| 搜索大型 OpenClaw 工具目录         | [工具 Search](/tools/tool-search)              | [工具 Search](/tools/tool-search)                                                                                                                      |
| 将多种工具组合到一个紧凑的程序中 | [代码 Mode](/tools/code-mode)                  | [代码 Mode](/tools/code-mode)                                                                                                                          |

## <a id="choose-tools%2C-skills%2C-or-plugins"></a><a id="choose-tools-skills-or-plugins"></a> 选择工具、技能或插件

<Steps>
  <Step id="use-a-tool-when-the-agent-needs-to-act" title="当代理需要采取行动时使用工具">
    工具是代理可以调用的类型化函数，例如 `exec`、`browser`、 `web_search`、`message` 或 `image_generate`。当代理需要读取数据、修改文件、发送消息、调用提供者或操作其他系统时，使用工具。可见工具会作为结构化函数定义发送给模型。

    该模型仅看到在活动配置文件、allow/deny 策略、提供商限制、沙箱状态、通道权限和插件可用性中存活的工具。

  </Step>

  <Step id="use-a-skill-when-the-agent-needs-instructions" title="当客服人员需要指示时使用技能">
    技能是加载到代理提示中的 `SKILL.md` 指令包。当代理已经拥有所需工具，但需要可重复的工作流程、审查标准、命令序列或操作约束时，使用技能。

    技能可以位于工作区、共享技能目录、受管理的 OpenClaw 技能根目录或插件包中。

    [技能](/tools/skills) | [技能Workshop](/tools/skill-workshop) | [自学](/tools/self-learning) | [创作技能](/tools/creating-skills) | [技能配置](/tools/skills-config)

  </Step>

  <Step id="use-a-plugin-when-openclaw-needs-a-new-capability" title="当 OpenClaw 需要新功能时使用插件">
    插件可以添加工具、技能、通道、模型提供者、语音、 实时语音、媒体生成、网页搜索、网页获取、钩子以及其他运行时能力。当该能力包含代码、凭据、生命周期钩子、 清单元数据或可安装打包内容时，使用插件。现有插件可以从 ClawHub、npm、git、本地目录或归档中安装。

    [安装和配置插件](/tools/plugin) | [构建插件](/plugins/building-plugins) | [插件 SDK](/plugins/sdk-overview)

  </Step>
</Steps>

## <a id="built-in-tool-categories"></a> 内置工具类别

该表列出了代表性工具，以便您可以识别表面。这不是完整的政策参考。对于确切的组、默认值和 allow/deny 语义，请使用 [ 工具和自定义提供程序](/gateway/config-tools)。

| 类别                | 当代理需要to...时使用                                                               | 代表性工具                                                                                                | 阅读下一篇                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 运行时                 | 运行命令、管理流程、使用共享操作员终端或使用提供商支持的 Python | `exec`, `process`, `terminal`, `code_execution`                                                                     | [执行](/tools/exec)、[控制UI终端](/web/control-ui/panels#operator-terminal)、[代码执行](/tools/code-execution) |
| 文件数                   | 读取和修改工作区文件                                                              | `read`, `write`, `edit`, `apply_patch`                                                                              | [应用补丁](/tools/apply-patch)                                                                                             |
| 人工输入             | 暂停用户拥有的结构化决策，或在未查看凭证的情况下获取凭证  | `ask_user`, `secrets`                                                                                               | [询问用户](/tools/ask-user)， [Secrets](/tools/secrets)                                                                        |
| 网络                     | 搜索网页、搜索 X 帖子，或获取可读页面内容                               | `web_search`, `x_search`, `web_fetch`                                                                               | [Web 工具](/tools/web), [Web 获取](/tools/web-fetch)                                                                        |
| 浏览器                 | 操作浏览器会话                                                                    | `browser`                                                                                                           | [浏览器](/tools/browser)                                                                                                     |
| 操作员 UI             | 排列 Control UI 窗格和面板，或选择并创建外观主题                  | `screen`, `theme`                                                                                                   | [屏幕](/tools/screen)，[主题](/tools/theme)                                                                                |
| 会话进度        | 更新父会话的持久进度卡；子代理无法使用                 | `progress_card`                                                                                                     | [进度卡](/tools/progress-card)                                                                                         |
| 消息传递和渠道  | 发送回复或通道操作                                                              | `message`                                                                                                           | [代理发送](/tools/agent-send)                                                                                               |
| 会话和代理     | 检查会话、委派工作、编排采集器、引导另一次运行，或报告状态 | `sessions_*`, `agents_wait`, `subagents`, `agents_list`, `session_status`, `get_goal`, `create_goal`, `update_goal` | [目标](/tools/goal), [群体](/tools/swarm), [子代理](/tools/subagents), [会话工具](/concepts/session-tool)            |
| 自动化              | 调度工作或响应后台事件                                                | `cron`, `heartbeat_respond`                                                                                         | [自动化](/automation)                                                                                                     |
| 网关和节点       | 检查 Gateway 状态或配对的目标设备                                               | `gateway`, `nodes`                                                                                                  | [Gateway 配置](/gateway/configuration), [节点](/nodes)                                                              |
| 插件生命周期        | 检查、安装、启用、禁用、删除或重新加载插件                                 | `plugins`                                                                                                           | [代理插件管理](/plugins/manage-plugins#manage-plugins-from-an-agent-conversation)                                  |
| 媒体                   | 分析、生成或朗读媒体                                                            | `view_image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                           | [媒体概览](/tools/media-overview)                                                                                       |
| 大型 OpenClaw 目录 | 搜索、调用和组合许多符合条件的工具，而无需将每个架构发送到模型      | `exec`, `wait`, `tool_search`, `tool_describe`, `dispatch_action`                                                   | [代码 Mode](/tools/code-mode)、[工具 Search](/tools/tool-search)                                                              |

会话工具和 `sessions_spawn` 接受 `user`（请求者经过验证的 `requester_profile.id`）并根据该人的权限进行操作。当多人转向时需要这样做。请参见[会话工具](/concepts/session-tool)和[子代理工具参考](/tools/subagents/tool-reference)。

在多用户网关上，`personal_instructions` 通过网关读取并更新经过身份验证的请求者的个人 `USER.md`，即使聊天使用项目工作树也是如此。它包含在编码和消息传递配置文件中；它不会扩大一般文件工具的访问范围。请参见 [ 用户模型 ](/concepts/user-model#personal-user-files-on-a-shared-gateway)。

`edit` 工具支持有针对性的格式更改，包括删除尾随空格或替换 Unicode 引号、破折号和空格。即使新旧文本在模糊归一化后比较相等，也会应用这些更改。产生未更改内容的相同替换请求和编辑仍然报告没有更改。

<Note>
代码模式和工具搜索是实验性 OpenClaw 代理表面。 Codex harness运行使用 Codex-native 代码模式、本机工具搜索、延迟动态工具和嵌套工具调用，而不是 `tools.codeMode` 或 `tools.toolSearch`。
</Note>

## <a id="plugin-provided-tools"></a> 插件提供的工具

插件可以注册额外的工具。插件作者通过 `api.registerTool(...)` 和清单中的 `contracts.tools` 来接入工具；请使用 [插件 SDK](/plugins/sdk-overview) 和 [插件清单](/plugins/manifest) 查看契约细节。

常见的插件提供工具包括：

- [Diffs](/tools/diffs) 用于渲染文件和 markdown 差异
- [Show widget](/tools/show-widget) 用于在受支持的聊天客户端中显示自包含的内联 SVG 和 HTML
- [Screen](/tools/screen) 用于组织一个已连接的 Control UI
- [LLM Task](/tools/llm-task) 仅适用于 JSON- 工作流程步骤
- [Lobster](/tools/lobster) 用于带有可恢复审批的类型化工作流
- [Tokenjuice](/tools/tokenjuice) 用于压缩噪声较多的 `exec` 和 `bash` 工具输出
- [Tool Search](/tools/tool-search) 用于发现并调用大型工具目录，而无需将每个 schema 都放进提示词中
- [Canvas](/plugins/reference/canvas) 用于 macOS 小部件面板演示器和 A2UI 仪表板内容

## <a id="configure-access-and-approvals"></a> 配置访问和审批

工具策略在模型调用之前强制执行。如果策略删除工具，模型不会收到该工具的轮次架构。由于全局配置、每个代理配置、通道策略、提供商限制、沙箱规则、channel/runtime 策略或插件可用性，运行可能会丢失工具。

`message` 工具还将其操作列表和参数缩小到当前通道以及代理的 [ 路由绑定 ](/concepts/agent-bindings) 中的通道。多渠道代理保持这些渠道声明的行动和能力的联合。没有通道绑定和计划运行的本地会话保留配置的通道发现。这减少了提示开销，无需进行新设置；绑定选择架构所通告的内容，而正常的交付权限仍然控制执行。无论插件注册顺序如何，不变的绑定和功能都会生成稳定的模式字节。

OpenClaw 公开了一种名为 `view_image` 的语义图像检查功能。当活动harness提供自己的加载器时，OpenClaw 会抑制其重复项。否则，OpenClaw- 提供的实现接受一个本地图像路径的 `path` 或允许的 URL 或多个本地图像路径的 `paths`； `maxImages` 限制组合列表，默认为 20。Codex 的本机实现接受一个本地文件系统 `path`。调用者必须遵循活动工具架构。

名为`image`的现有策略条目必须迁移到`view_image`；运行 `openclaw doctor --fix` 以更新支持的配置策略表面和持久自动化 `toolsAllow` 列表。

- [工具和自定义提供程序](/gateway/config-tools) 记录工具配置文件、allow/deny 列表、提供程序特定的限制、循环检测和提供程序支持的工具设置。
- [Exec 审批](/tools/exec-approvals) 文档说明了主机命令审批策略。
- [特权执行](/tools/elevated) 文档说明了在沙箱之外受控执行。
- [沙箱 vs 工具策略 vs 特权执行](/gateway/sandbox-vs-tool-policy-vs-elevated) 解释了哪一层控制文件和进程访问。
- [按代理的沙箱和工具限制](/tools/multi-agent-sandbox-tools) 文档说明了用于委派运行的特定代理限制。

## <a id="extend-capabilities"></a> 扩展能力

根据你需要 OpenClaw 执行的任务选择扩展路径：

- 使用 [插件](/tools/plugin) 安装或管理现有插件。
- 通过 [构建插件](/plugins/building-plugins) 来构建新的集成、提供程序、渠道、工具或钩子。
- 使用 [技能](/tools/skills) 和 [创建技能](/tools/creating-skills) 来添加或调整可复用的代理指令。
- 当你需要实现合同时，使用 [插件 SDK](/plugins/sdk-overview) 和 [插件清单](/plugins/manifest)。

## <a id="troubleshoot-missing-tools"></a> 排查缺失工具

配置的 `tools.exec` 和 `tools.fs` 部分不授予工具访问权限。仅当其他活动的全局、代理和提供商策略允许这些工具时，配置文件迁移警告才会建议 `alsoAllow` 条目。

如果模型无法看到或调用某个工具，请先从当前轮次的有效策略开始检查：

1. 检查活动配置文件、`tools.allow` 和 `tools.deny`，见 [工具与自定义提供方](/gateway/config-tools)。
2. 检查 [工具与自定义提供方](/gateway/config-tools) 中提供方特定的限制，并确认所选 [模型提供方](/concepts/model-providers) 支持该工具形状。
3. 检查通道权限、沙箱状态以及提升权限，见 [沙箱 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) 和 [提升执行](/tools/elevated)。
4. 检查拥有该插件是否已安装并启用，见 [插件](/tools/plugin)。
5. 对于委派运行，检查每个代理的限制，见 [每个代理的沙箱和工具限制](/tools/multi-agent-sandbox-tools)。
6. 对于大型 OpenClaw 目录，确认运行是否使用直接工具曝光、[Code Mode](/tools/code-mode) 或 [Tool Search](/tools/tool-search)。

## <a id="related"></a> 相关内容

- [Automation](/automation) 用于 cron、任务、心跳、挂钩、常规订单和工作流程
- [智能体](/concepts/agent) 用于智能体模型、会话、记忆，以及多智能体协调
- [工具和自定义提供程序](/gateway/config-tools)，用于工具策略参考
- [插件](/tools/plugin) 用于插件安装和管理
- [插件 SDK](/plugins/sdk-overview) 用于插件作者参考
- [技能](/tools/skills) 用于技能加载顺序、门控和配置
- [用于生成和审核技能创建的技能 Workshop](/tools/skill-workshop)
- [Tool Search](/tools/tool-search)，用于紧凑型 OpenClaw 工具目录发现
- [代码 Mode](/tools/code-mode)，用于隐藏 OpenClaw 工具目录上的紧凑型 JavaScript 工作流程
- [Swarm](/tools/swarm) 用于从 Code Mode 进行结构化扇出和收集
- [Tools 调用 API](/gateway/tools-invoke-http-api) — 通过 HTTP 调用这些工具
