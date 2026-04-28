---
summary: "OpenClaw 工具和插件概述：代理能做什么以及如何扩展它"
read_when:
  - 你想了解 OpenClaw 提供了哪些工具
  - 你需要配置、允许或拒绝工具
  - 你正在内置工具、技能和插件之间做选择
title: "工具和插件"
---

代理除了生成文本之外所做的一切都通过**工具**来完成。
工具是代理读取文件、运行命令、浏览网页、发送消息以及与设备交互的方式。

## 工具、技能和插件

OpenClaw 有三个协同工作的层级：

<Steps>
  <Step title="工具是代理调用的内容">
    工具是代理可以调用的类型化函数（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 附带一组**内置工具**，并且
    插件可以注册额外的工具。

    代理将工具视为发送给模型 API 的结构化函数定义。

  </Step>

  <Step title="技能教导代理何时以及如何操作">
    技能是注入到系统提示中的 markdown 文件（`SKILL.md`）。
    技能为代理提供上下文、约束和逐步指导，以便
    有效地使用工具。技能存在于你的工作区、共享文件夹中，
    或包含在插件内。

    [技能参考](/tools/skills) | [创建技能](/tools/creating-skills)

  </Step>

  <Step title="插件将一切打包在一起">
    插件是一个可以注册任意组合能力的软件包：渠道、模型提供商、工具、技能、语音、实时转录、
    实时语音、媒体理解、图像生成、视频生成、网页抓取、网页搜索等。某些插件是**核心**的（随
    OpenClaw 一起发布），其他插件是**外部**的（由社区发布在 npm 上）。

    [安装和配置插件](/tools/plugin) | [构建你自己的插件](/plugins/building-plugins)
  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 附带，无需安装任何插件即可使用：

| Tool                                       | What it does                                                          | Page                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `exec` / `process`                         | 运行 shell 命令，管理后台进程                                            | [Exec](/tools/exec), [Exec Approvals](/tools/exec-approvals) |
| `code_execution`                           | 在沙盒中运行远程 Python 分析                                              | [Code Execution](/tools/code-execution)                      |
| `browser`                                  | 控制 Chromium 浏览器（导航、点击、截图）                                 | [Browser](/tools/browser)                                    |
| `web_search` / `x_search` / `web_fetch`    | 搜索网络、搜索 X 帖子、获取页面内容                                       | [Web](/tools/web), [Web Fetch](/tools/web-fetch)             |
| `read` / `write` / `edit`                  | 工作区中的文件 I/O                                                    |                                                              |
| `apply_patch`                              | 多块文件补丁                                                          | [Apply Patch](/tools/apply-patch)                            |
| `message`                                  | 在所有渠道之间发送消息                                                   | [Agent Send](/tools/agent-send)                              |
| `canvas`                                   | 驱动 node Canvas（呈现、求值、快照）                                     |                                                              |
| `nodes`                                    | 发现并定位配对设备                                                     |                                                              |
| `cron` / `gateway`                         | 管理计划任务；检查、补丁、重启或更新网关                                     |                                                              |
| `image` / `image_generate`                 | 分析或生成图像                                                         | [Image Generation](/tools/image-generation)                  |
| `music_generate`                           | 生成音乐曲目                                                         | [Music Generation](/tools/music-generation)                  |
| `video_generate`                           | 生成视频                                                           | [Video Generation](/tools/video-generation)                  |
| `tts`                                      | 一次性文本转语音转换                                                    | [TTS](/tools/tts)                                            |
| `sessions_*` / `subagents` / `agents_list` | 会话管理、状态和子代理编排                                                | [Sub-agents](/tools/subagents)                               |
| `session_status`                           | 轻量级的 `/status` 风格回读和会话模型覆盖                                   | [Session Tools](/concepts/session-tool)                      |

对于图像工作，使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果你目标指向 `openai/*`、`google/*`、`fal/*` 或其他非默认图像提供商，请先配置该提供商的认证/API 密钥。

对于音乐工作，使用 `music_generate`。如果你目标指向 `google/*`、`minimax/*` 或其他非默认音乐提供商，请先配置该提供商的认证/API 密钥。

对于视频工作，使用 `video_generate`。如果你目标指向 `qwen/*` 或其他非默认视频提供商，请先配置该提供商的认证/API 密钥。

对于工作流驱动的音频生成，当某个插件（例如 ComfyUI）注册了 `music_generate` 时，请使用它。这与 `tts` 是分开的，`tts` 是文本转语音。

`session_status` 是 sessions 组中轻量级的状态/回读工具。
它可回答关于当前会话的 `/status` 风格问题，并且可以
选择性地设置每会话模型覆盖；`model=default` 会清除该
覆盖。与 `/status` 一样，它可以回填稀疏的 token/cache 计数器以及
来自最新转录使用条目的活动运行时模型标签。

`gateway` 是仅所有者可用的网关运行时工具，用于网关操作：

- `config.schema.lookup`：在编辑前查询一个路径范围内的配置子树
- `config.get`：获取当前配置快照 + 哈希
- `config.patch`：部分配置更新并重启
- `config.apply`：仅用于完整配置替换
- `update.run`：显式自更新 + 重启

对于局部更改，优先使用 `config.schema.lookup` 然后 `config.patch`。仅当你有意替换整个配置时才使用 `config.apply`。
该工具还会拒绝更改 `tools.exec.ask` 或 `tools.exec.security`；旧的 `tools.bash.*` 别名会规范化为相同的受保护 exec 路径。

### 插件提供的工具

插件可以注册额外的工具。一些示例：

- [Diffs](/tools/diffs) — diff 查看器和渲染器
- [LLM Task](/tools/llm-task) — 仅 JSON 的 LLM 步骤，用于结构化输出
- [Lobster](/tools/lobster) — 带可恢复授权的类型化工作流运行时
- [Music Generation](/tools/music-generation) — 带工作流支持提供商的共享 `music_generate` 工具
- [OpenProse](/prose) — 以 markdown 为中心的工作流编排
- [Tokenjuice](/tools/tokenjuice) — 压缩冗长的 `exec` 和 `bash` 工具结果

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny` 控制代理可以调用哪些工具。拒绝始终优先于允许。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

当显式允许列表解析后没有任何可调用工具时，OpenClaw 会安全失败。
例如，`tools.allow: ["query_db"]` 只有在加载的插件实际
注册了 `query_db` 时才有效。如果没有任何内置、插件或捆绑的 MCP 工具与
允许列表匹配，则运行会在模型调用之前停止，而不是继续作为
可能会幻觉出工具结果的纯文本运行。

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置基础允许列表。
每代理覆盖：`agents.list[].tools.profile`。

| 配置文件     | 包含内容                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 不受限制的基础配置，用于更广泛的命令/控制访问；与不设置 `tools.profile` 相同                                                   |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 仅 `session_status`                                                                                                                             |

<Note>
`tools.profile: "messaging"` 是有意设定为较窄的，适用于以渠道为中心的
代理。它不包含更广泛的命令/控制工具，例如文件系统、运行时、
浏览器、canvas、nodes、cron 和 gateway 控制。将 `tools.profile: "full"`
用作更广泛命令/控制访问的不受限制基础配置，然后在需要时通过
`tools.allow` / `tools.deny` 收紧
访问。
</Note>

`coding` 包括轻量级网络工具（`web_search`、`web_fetch`、`x_search`）
但不包括完整的浏览器控制工具。浏览器自动化可以驱动真实
会话和已登录配置文件，因此请通过
`tools.alsoAllow: ["browser"]` 或按代理单独配置
`agents.list[].tools.alsoAllow: ["browser"]` 显式添加它。

### 工具组

Example (broadest tool surface by default):

```json5
{
  tools: {
    profile: "full",
  },
}
```

### Tool groups

| 组              | 工具                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec, process, code_execution（`bash` 也可作为 `exec` 的别名）                                 |
| `group:fs`         | read, write, edit, apply_patch                                                                            |
| `group:sessions`   | sessions_list, sessions_history, sessions_send, sessions_spawn, sessions_yield, subagents, session_status |
| `group:memory`     | memory_search, memory_get                                                                                 |
| `group:web`        | web_search, x_search, web_fetch                                                                           |
| `group:ui`         | browser, canvas                                                                                           |
| `group:automation` | cron, gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image, image_generate, music_generate, video_generate, tts                                                |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                       |

`sessions_history` 返回一个有边界、安全过滤的回忆视图。它会移除
思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML
负载（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及截断的工具调用块），
降级的工具调用脚手架、泄露的 ASCII/全角模型控制
令牌，以及来自助手文本中的格式错误 MiniMax 工具调用 XML，然后应用
脱敏/截断以及可能的超大行占位符，而不是将其视为
原始转录转储。

### 特定提供商的限制

使用 `tools.byProvider` 限制特定提供商的工具，而无需
更改全局默认值：

```json5
{
  tools: {
    profile: "coding",
    byProvider: {
      "google-antigravity": { profile: "minimal" },
    },
  },
}
```
