---
doc-schema-version: 1
summary: "OpenClaw 工具、技能和插件概览：代理可以调用什么以及如何扩展它们"
read_when:
  - 你想了解 OpenClaw 提供了哪些工具
  - 你正在在内置工具、技能和插件之间做选择
  - 你需要关于工具策略、自动化或代理协调的正确文档入口
title: "概览"
---

使用本页来选择合适的能力层。**工具**是可调用的
动作，**技能**教会代理如何工作，而**插件**则添加运行时
能力，例如工具、提供者、通道、钩子以及打包好的技能。

这是一个概览和路由页面。有关完整的工具策略、默认值、
组成员关系、提供者限制和配置字段，请使用
[工具和自定义提供者](/gateway/config-tools)。

## 从这里开始

对于大多数代理，先从内置工具类别开始，然后仅当代理应看到更少的工具或需要明确的主机访问时再调整策略。

| 如果你需要...                           | 首先使用这个                                 | 然后阅读                                                               |
| ------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| 让代理利用现有能力执行操作 | [内置工具](#built-in-tool-categories)    | [工具类别](#built-in-tool-categories)                            |
| 控制代理可以调用什么              | [工具策略](#configure-access-and-approvals) | [工具和自定义提供者](/gateway/config-tools)                     |
| 教会代理一个工作流                   | [技能](#choose-tools-skills-or-plugins)      | [技能](/tools/skills) 和 [创建技能](/tools/creating-skills)   |
| 添加新的集成或运行时能力    | [插件](#extend-capabilities)                | [插件](/tools/plugin) 和 [构建插件](/plugins/building-plugins) |
| 稍后或在后台运行工作         | [自动化](/automation)                      | [自动化概览](/automation)                                      |
| 协调多个代理或运行器     | [子代理](/tools/subagents)                 | [ACP agents](/tools/acp-agents) 和 [Agent send](/tools/agent-send)     |
| 搜索庞大的 PI 工具目录              | [工具搜索](/tools/tool-search)              | [工具搜索](/tools/tool-search)                                       |

## 选择工具、技能或插件

<Steps>
  <Step title="当代理需要执行操作时使用工具">
    工具是代理可以调用的类型化函数，例如 `exec`、`browser`、
    `web_search`、`message` 或 `image_generate`。当代理
    需要读取数据、更改文件、发送消息、调用提供者或操作
    其他系统时使用工具。可见的工具会作为结构化函数定义发送给模型。

    模型只能看到那些在当前配置文件、允许/拒绝
    策略、提供者限制、沙箱状态、通道权限以及
    插件可用性下仍然保留的工具。

  </Step>

  <Step title="当代理需要指令时使用技能">
    技能是加载到代理提示中的 `SKILL.md` 指令包。当代理
    已经拥有所需工具，但需要可重复的
    工作流、审查标准、命令序列或运行约束时使用技能。

    技能可以位于工作区、共享技能目录、受管理的 OpenClaw
    技能根目录或插件包中。

    [技能](/tools/skills) | [创建技能](/tools/creating-skills) | [技能配置](/tools/skills-config)

  </Step>

  <Step title="当 OpenClaw 需要新能力时使用插件">
    插件可以添加工具、技能、通道、模型提供者、语音、实时
    语音、媒体生成、网页搜索、网页获取、钩子以及其他运行时
    能力。当能力具有代码、凭据、
    生命周期钩子、清单元数据或可安装打包形式时使用插件。现有
    插件可以从 ClawHub、npm、git、本地目录或
    压缩包安装。

    [安装和配置插件](/tools/plugin) | [构建插件](/plugins/building-plugins) | [插件 SDK](/plugins/sdk-overview)

  </Step>
</Steps>

## 内置工具类别

下表列出了一些代表性工具，方便你识别这个能力层。它不是
完整的策略参考。有关精确的组、默认值和允许/拒绝
语义，请使用 [工具和自定义提供者](/gateway/config-tools)。

| 类别               | 当代理需要... 时使用                                                                 | 代表性工具                                                 | 接下来阅读                                                              |
| ---------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 运行时                | 运行命令、管理进程，或使用由提供者支持的 Python 分析        | `exec`、`process`、`code_execution`                                  | [Exec](/tools/exec)、[代码执行](/tools/code-execution)           |
| 文件                  | 读取和修改工作区文件                                               | `read`、`write`、`edit`、`apply_patch`                               | [应用补丁](/tools/apply-patch)                                      |
| Web                    | 搜索网页、搜索 X 帖子，或获取可读页面内容                | `web_search`、`x_search`、`web_fetch`                                | [Web 工具](/tools/web)、[Web 获取](/tools/web-fetch)                 |
| 浏览器                | 操作浏览器会话                                                     | `browser`                                                            | [浏览器](/tools/browser)                                              |
| 消息与通道 | 发送回复或通道操作                                               | `message`                                                            | [Agent send](/tools/agent-send)                                        |
| 会话与代理    | 检查会话、委派工作、引导另一次运行，或报告状态          | `sessions_*`、`subagents`、`agents_list`、`session_status`           | [子代理](/tools/subagents)、[会话工具](/concepts/session-tool) |
| 自动化             | 调度工作或响应后台事件                                 | `cron`、`heartbeat_respond`                                          | [自动化](/automation)                                              |
| 网关和节点      | 检查 Gateway 状态或配对的目标设备                                | `gateway`、`nodes`                                                   | [Gateway 配置](/gateway/configuration)、[节点](/nodes)       |
| 媒体                  | 分析、生成或朗读媒体                                             | `image`、`image_generate`、`music_generate`、`video_generate`、`tts` | [媒体概览](/tools/media-overview)                                |
| 大型 PI 目录      | 搜索并调用大量符合条件的工具，而无需将每个 schema 都发送给模型 | `tool_search_code`、`tool_search`、`tool_describe`                   | [工具搜索](/tools/tool-search)                                      |

<Note>
工具搜索是一个实验性的 PI 代理能力。Codex harness 运行使用
Codex 原生代码模式、原生工具搜索、延迟动态工具，以及嵌套
工具调用，而不是 `tools.toolSearch`。
</Note>

## 插件提供的工具

插件可以注册额外的工具。插件作者通过
`api.registerTool(...)` 和清单中的 `contracts.tools` 来接入工具；请使用
[插件 SDK](/plugins/sdk-overview) 和 [插件清单](/plugins/manifest)
查看契约细节。

常见的插件提供工具包括：

- [Diffs](/tools/diffs) 用于渲染文件和 markdown 差异
- [LLM Task](/tools/llm-task) 用于仅 JSON 的工作流步骤
- [Lobster](/tools/lobster) 用于带有可恢复审批的类型化工作流
- [Tokenjuice](/tools/tokenjuice) 用于压缩噪声较多的 `exec` 和 `bash` 工具
  输出
- [工具搜索](/tools/tool-search) 用于发现并调用大型工具
  目录，而无需把每个 schema 都放进提示词中
- [Canvas](/plugins/reference/canvas) 用于节点 Canvas 控制和 A2UI
  渲染

## 配置访问和审批

工具策略在模型调用之前强制执行。如果策略移除了某个工具，
模型在该轮不会收到该工具的 schema。运行可能会因为全局配置、
按代理配置、通道策略、提供者限制、沙箱规则、通道/运行时策略或
插件可用性而失去工具。

- [工具和自定义提供者](/gateway/config-tools) 文档说明了工具配置文件、
  允许/拒绝列表、特定提供者限制、循环检测以及
  由提供者支持的工具设置。
- [Exec 审批](/tools/exec-approvals) 文档说明了主机命令审批
  策略。
- [提权 exec](/tools/elevated) 文档说明了在
  沙箱之外的受控执行。
- [沙箱 vs 工具策略 vs 提权](/gateway/sandbox-vs-tool-policy-vs-elevated) 解释了哪个层控制文件和进程访问。
- [按代理的沙箱和工具限制](/tools/multi-agent-sandbox-tools)
  文档说明了委派运行的代理特定限制。

## 扩展能力

根据你需要 OpenClaw 执行的任务选择扩展路径：

- 使用 [插件](/tools/plugin) 安装或管理现有插件。
- 使用 [构建插件](/plugins/building-plugins) 构建新的集成、提供者、通道、工具或钩子。
- 使用 [技能](/tools/skills) 和 [创建技能](/tools/creating-skills) 添加或调整可复用的代理指令。
- 当工作流适合放入插件分发的技能包时，使用 [技能工作坊](/plugins/skill-workshop) 打包可复用的工作流材料。
- 当你需要实现契约时，使用 [插件 SDK](/plugins/sdk-overview) 和 [插件清单](/plugins/manifest)。

## 排查缺失工具

如果模型无法看到或调用某个工具，请从当前轮次的有效策略开始检查：

1. 检查当前生效的配置文件、`tools.allow` 和 `tools.deny`，见
   [工具和自定义提供方](/gateway/config-tools)。
2. 检查
   [工具和自定义提供方](/gateway/config-tools) 中与提供方相关的限制，并确认所选
   [模型提供方](/concepts/model-providers) 支持该工具形状。
3. 结合 [沙箱与工具策略与提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated) 和 [提升执行](/tools/elevated) 检查通道权限、沙箱状态和提升访问权限。
4. 检查所属插件是否已安装并在 [插件](/tools/plugin) 中启用。
5. 对于委派运行，请检查 [按代理的沙箱和工具限制](/tools/multi-agent-sandbox-tools) 中的每个代理限制。
6. 对于大型 PI 目录，请确认该运行使用的是直接工具暴露还是 [工具搜索](/tools/tool-search)。

## 相关内容

- [自动化](/automation)：用于 cron、任务、心跳、承诺、钩子、常驻订单和任务流
- [代理](/concepts/agent)：用于代理模型、会话、记忆和多代理协调
- [工具和自定义提供方](/gateway/config-tools)：用于权威的工具策略参考
- [插件](/tools/plugin)：用于插件安装和管理
- [插件 SDK](/plugins/sdk-overview)：用于插件作者参考
- [技能](/tools/skills)：用于技能加载顺序、门控和配置
- [工具搜索](/tools/tool-search)：用于紧凑的 PI 工具目录发现
