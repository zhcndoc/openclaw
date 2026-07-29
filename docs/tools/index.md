---
doc-schema-version: 1
summary: "OpenClaw 工具、技能和插件概览：代理可以调用什么以及如何扩展它们"
read_when:
  - 你想了解 OpenClaw 提供了哪些工具
  - 你正在在内置工具、技能和插件之间做选择
  - 你需要关于工具策略、自动化或代理协调的正确文档入口
title: "概览"
---

使用此页面来选择合适的能力层。**工具**是
可调用的动作，**技能**教会代理如何工作，而**插件**添加
运行时能力，例如工具、提供者、通道、钩子和打包的
技能。

这是一个概览和路由页面。有关完整的工具策略、默认值、
组成员关系、提供者限制和配置字段，请使用
[工具和自定义提供者](/gateway/config-tools)。

## 从这里开始

对于大多数代理，先从内置工具类别开始，然后仅当代理应看到更少的工具或需要明确的主机访问时再调整策略。

| 如果你需要...                            | 首先使用这个                                 | 然后阅读                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 让代理利用现有能力行动              | [内置工具](#built-in-tool-categories)    | [工具类别](#built-in-tool-categories)                                                                                                           |
| 控制代理可以调用什么               | [工具策略](#configure-access-and-approvals) | [工具和自定义提供程序](/gateway/config-tools)                                                                                                    |
| 教授代理一个工作流程                    | [技能](#choose-tools-skills-or-plugins)      | [技能](/tools/skills)、[创建技能](/tools/creating-skills)、[技能工作坊](/tools/skill-workshop) 和 [自学习](/tools/self-learning) |
| 添加新的集成或运行时表面     | [插件](#extend-capabilities)                | [插件](/tools/plugin) 和 [构建插件](/plugins/building-plugins)                                                                                |
| 稍后或在后台运行工作          | [自动化](/automation)                      | [自动化概览](/automation)                                                                                                                     |
| 协调多个代理或 harnesses      | [子代理](#sub-agents)                 | [ACP 代理](/tools/acp-agents) 和 [Agent 发送](/tools/agent-send)                                                                                    |
| 从代码中编排并发代理      | [Swarm](/tools/swarm)                          | [代码模式](/tools/code-mode) 和 [子代理](/tools/subagents)                                                                                       |
| 搜索大型 OpenClaw 工具目录         | [工具搜索](/tools/tool-search)              | [工具搜索](/tools/tool-search)                                                                                                                      |
| 在一个紧凑程序中组合多个工具 | [代码模式](/tools/code-mode)                  | [代码模式](/tools/code-mode)                                                                                                                          |

## 选择工具、技能或插件

<Steps>
  <Step title="当代理需要执行操作时使用工具">
    工具是代理可以调用的类型化函数，例如 `exec`、`browser`、
    `web_search`、`message` 或 `image_generate`。当代理需要
    读取数据、修改文件、发送消息、调用提供者或
    操作其他系统时，使用工具。可见工具会作为结构化
    函数定义发送给模型。

    模型只能看到那些在当前配置文件、允许/拒绝
    策略、提供者限制、沙箱状态、通道权限以及
    插件可用性下仍然保留的工具。

  </Step>

  <Step title="当代理需要指令时使用技能">
    技能是加载到代理提示中的 `SKILL.md` 指令包。当代理
    已经拥有所需工具，但需要可重复的工作流程、审查
    标准、命令序列或操作约束时，使用技能。

    技能可以位于工作区、共享技能目录、受管理的 OpenClaw
    技能根目录或插件包中。

    [技能](/tools/skills) | [技能工作坊](/tools/skill-workshop) | [自学](/tools/self-learning) | [创建技能](/tools/creating-skills) | [技能配置](/tools/skills-config)

  </Step>

  <Step title="当 OpenClaw 需要新能力时使用插件">
    插件可以添加工具、技能、通道、模型提供者、语音、
    实时语音、媒体生成、网页搜索、网页获取、钩子以及其他
    运行时能力。当该能力包含代码、凭据、生命周期钩子、
    清单元数据或可安装打包内容时，使用插件。现有插件
    可以从 ClawHub、npm、git、本地目录或归档中安装。

    [安装和配置插件](/tools/plugin) | [构建插件](/plugins/building-plugins) | [插件 SDK](/plugins/sdk-overview)

  </Step>
</Steps>

## 内置工具类别

下表列出了一些代表性工具，方便你识别这个能力层。它不是
完整的策略参考。有关精确的组、默认值和允许/拒绝
语义，请使用 [工具和自定义提供者](/gateway/config-tools)。

| Category                | Use when the agent needs to...                                                               | Representative tools                                                                                                | Read next                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Runtime                 | 当代理需要执行命令、管理进程或使用由提供者支持的 Python 分析时                                        | `exec`, `process`, `terminal`, `code_execution`                                                                     | [Exec](/tools/exec), [Control UI 终端](/web/control-ui#operator-terminal), [代码执行](/tools/code-execution) |
| Files                   | 读取和修改工作区文件                                                                                      | `read`, `write`, `edit`, `apply_patch`                                                                              | [应用补丁](/tools/apply-patch)                                                                                      |
| Human input             | 为由用户拥有的结构化决策暂停                                                                      | `ask_user`                                                                                                          | [询问用户](/tools/ask-user)                                                                                            |
| Web                     | 搜索网页、搜索 X 帖子，或获取可读页面内容                                                         | `web_search`, `x_search`, `web_fetch`                                                                               | [Web 工具](/tools/web), [Web 获取](/tools/web-fetch)                                                                 |
| Browser                 | 操作浏览器会话                                                                    | `browser`                                                                                                           | [浏览器](/tools/browser)                                                                                              |
| Operator UI             | 整理已连接的 Control UI 窗格、面板和导航                                   | `screen`                                                                                                            | [屏幕](/tools/screen)                                                                                                |
| Messaging and channels  | 发送回复或通道操作                                                              | `message`                                                                                                           | [代理发送](/tools/agent-send)                                                                                        |
| Sessions and agents     | 检查会话、委派工作、编排采集器、引导另一次运行，或报告状态 | `sessions_*`, `agents_wait`, `subagents`, `agents_list`, `session_status`, `get_goal`, `create_goal`, `update_goal` | [目标](/tools/goal), [群体](/tools/swarm), [子代理](/tools/subagents), [会话工具](/concepts/session-tool)     |
| Automation              | 调度工作或响应后台事件                                                | `cron`, `heartbeat_respond`                                                                                         | [自动化](/automation)                                                                                              |
| Gateway and nodes       | 检查 Gateway 状态或配对的目标设备                                               | `gateway`, `nodes`                                                                                                  | [Gateway 配置](/gateway/configuration), [节点](/nodes)                                                       |
| Media                   | 分析、生成或朗读媒体                                                            | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                | [媒体概览](/tools/media-overview)                                                                                |
| Large OpenClaw catalogs | 搜索、调用并组合许多符合条件的工具，而无需将每个 schema 都发送给模型      | `exec`, `wait`, `tool_search_code`, `tool_search`, `tool_describe`                                                  | [代码模式](/tools/code-mode), [工具搜索](/tools/tool-search)                                                       |

<Note>
代码模式和工具搜索是实验性的 OpenClaw 代理入口。Codex
harness 运行使用 Codex 原生代码模式、原生工具搜索、延迟动态
工具以及嵌套工具调用，而不是 `tools.codeMode` 或 `tools.toolSearch`。
</Note>

## 插件提供的工具

插件可以注册额外的工具。插件作者通过
`api.registerTool(...)` 和清单中的 `contracts.tools` 来接入工具；请使用
[插件 SDK](/plugins/sdk-overview) 和 [插件清单](/plugins/manifest)
查看契约细节。

常见的插件提供工具包括：

- [Diffs](/tools/diffs) 用于渲染文件和 markdown 差异
- [Show widget](/tools/show-widget) 用于在受支持的聊天客户端中显示自包含的内联 SVG 和 HTML
- [Screen](/tools/screen) 用于组织一个已连接的 Control UI
- [LLM Task](/tools/llm-task) 用于仅 JSON 的工作流步骤
- [Lobster](/tools/lobster) 用于带有可恢复审批的类型化工作流
- [Tokenjuice](/tools/tokenjuice) 用于压缩噪声较多的 `exec` 和 `bash` 工具
  输出
- [Tool Search](/tools/tool-search) 用于发现并调用大型工具
  目录，而无需将每个 schema 都放进提示词中
- [Canvas](/plugins/reference/canvas) 用于节点 Canvas 控制和 A2UI
  渲染

## 配置访问和审批

工具策略在模型调用之前强制执行。如果策略移除了某个工具，
模型在该轮不会收到该工具的 schema。运行可能会因为全局配置、
按代理配置、通道策略、提供者限制、沙箱规则、通道/运行时策略或
插件可用性而失去工具。

- [工具和自定义提供者](/gateway/config-tools) 文档说明了工具配置文件、
  允许/拒绝列表、特定提供者限制、循环检测，以及
  基于提供者的工具设置。
- [Exec 审批](/tools/exec-approvals) 文档说明了主机命令审批
  策略。
- [特权执行](/tools/elevated) 文档说明了在
  沙箱之外受控执行。
- [沙箱 vs 工具策略 vs 特权执行](/gateway/sandbox-vs-tool-policy-vs-elevated)
  解释了哪一层控制文件和进程访问。
- [按代理的沙箱和工具限制](/tools/multi-agent-sandbox-tools)
  文档说明了用于委派运行的特定代理限制。

## 扩展能力

根据你需要 OpenClaw 执行的任务选择扩展路径：

- 使用 [插件](/tools/plugin) 安装或管理现有插件。
- 通过 [构建插件](/plugins/building-plugins) 来构建新的集成、提供程序、渠道、工具或钩子。
- 使用 [技能](/tools/skills) 和
  [创建技能](/tools/creating-skills) 来添加或调整可复用的代理指令。
- 当你需要实现
  合同时，使用 [插件 SDK](/plugins/sdk-overview) 和
  [插件清单](/plugins/manifest)。

## 排查缺失工具

如果模型无法看到或调用某个工具，请先从当前轮次的有效策略开始检查：

1. 检查活动配置文件、`tools.allow` 和 `tools.deny`，见
   [工具与自定义提供方](/gateway/config-tools)。
2. 检查
   [工具与自定义提供方](/gateway/config-tools) 中提供方特定的限制，并确认
   所选 [模型提供方](/concepts/model-providers) 支持该工具
   形状。
3. 检查通道权限、沙箱状态以及提升权限，见
   [沙箱 vs 工具策略 vs 提升权限](/gateway/sandbox-vs-tool-policy-vs-elevated)
   和 [提升执行](/tools/elevated)。
4. 检查拥有该插件是否已安装并启用，见
   [插件](/tools/plugin)。
5. 对于委派运行，检查每个代理的限制，见
   [每个代理的沙箱和工具限制](/tools/multi-agent-sandbox-tools)。
6. 对于大型 OpenClaw 目录，确认此次运行是否使用直接工具
   暴露、[代码模式](/tools/code-mode) 或 [工具搜索](/tools/tool-search)。

## 相关内容

- [自动化](/automation) 用于 cron、任务、心跳、钩子、
  常驻订单，以及 Task Flow
- [智能体](/concepts/agent) 用于智能体模型、会话、记忆，以及
  多智能体协调
- [工具和自定义提供程序](/gateway/config-tools) 用于权威工具
  策略参考
- [插件](/tools/plugin) 用于插件安装和管理
- [插件 SDK](/plugins/sdk-overview) 用于插件作者参考
- [技能](/tools/skills) 用于技能加载顺序、门控和配置
- [技能工作坊](/tools/skill-workshop) 用于生成和审核的技能
  创建
- [工具搜索](/tools/tool-search) 用于紧凑的 OpenClaw 工具目录
  发现
- [代码模式](/tools/code-mode) 用于通过隐藏的 OpenClaw 工具目录进行紧凑的 JavaScript 或 TypeScript 工作流
- [Swarm](/tools/swarm) 用于从 Code Mode 进行结构化扇出和收集
