---
summary: "OpenClaw 工具和插件概览：代理能做什么以及如何扩展它"
read_when:
  - 你想了解 OpenClaw 提供了哪些工具
  - 你需要配置、允许或拒绝工具
  - 你正在在内置工具、技能和插件之间做选择
title: "工具和插件"
---

代理所做的一切，凡是超出生成文本的部分，都是通过 **工具** 完成的。
工具是代理读取文件、运行命令、浏览网页、发送消息以及与设备交互的方式。

## 工具、技能和插件

OpenClaw 有三层协同工作：

<Steps>
  <Step title="工具是代理调用的内容">
    工具是代理可以调用的带类型函数（例如 `exec`、`browser`、
    `web_search`、`message`）。OpenClaw 自带一组**内置工具**，插件也可以
    注册额外工具。

    代理将工具视为发送给模型 API 的结构化函数定义。

  </Step>

  <Step title="技能教会代理何时以及如何使用">
    技能是注入到系统提示中的 markdown 文件（`SKILL.md`）。
    技能为代理提供上下文、约束，以及如何有效使用工具的
    分步骤指导。技能可以位于你的工作区、共享文件夹中，
    或者随插件一起提供。

    [技能参考](/tools/skills) | [创建技能](/tools/creating-skills)

  </Step>

  <Step title="插件将所有内容打包在一起">
    插件是一个可以注册任意能力组合的包：频道、模型提供商、工具、技能、语音、实时转录、
    实时语音、媒体理解、图像生成、视频生成、web 获取、web 搜索等等。某些插件是**核心**插件（随
    OpenClaw 一起提供），其他则是**外部**插件（由社区发布在 npm 上）。

    [安装和配置插件](/tools/plugin) | [构建你自己的插件](/plugins/building-plugins)

  </Step>
</Steps>

## 内置工具

这些工具随 OpenClaw 一起提供，无需安装任何插件即可使用：

| 工具                                       | 功能说明                                                          | 页面                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `exec` / `process`                         | 运行 shell 命令，管理后台进程                       | [Exec](/tools/exec), [Exec Approvals](/tools/exec-approvals) |
| `code_execution`                           | 运行沙箱化的远程 Python 分析                                  | [Code Execution](/tools/code-execution)                      |
| `browser`                                  | 控制 Chromium 浏览器（导航、点击、截图）              | [Browser](/tools/browser)                                    |
| `web_search` / `x_search` / `web_fetch`    | 搜索网页、搜索 X 帖子、获取页面内容                                            | [Web](/tools/web), [Web Fetch](/tools/web-fetch)             |
| `read` / `write` / `edit`                  | 工作区中的文件 I/O                                             |                                                              |
| `apply_patch`                              | 多块文件补丁                                               | [Apply Patch](/tools/apply-patch)                            |
| `message`                                  | 在所有频道之间发送消息                                     | [Agent Send](/tools/agent-send)                              |
| `canvas`                                   | 驱动 node Canvas（present、eval、snapshot）                           |                                                              |
| `nodes`                                    | 发现并定位配对设备                                    |                                                              |
| `cron` / `gateway`                         | 管理计划任务；检查、修补、重启或更新网关 |                                                              |
| `image` / `image_generate`                 | 分析或生成图像                                            | [Image Generation](/tools/image-generation)                  |
| `music_generate`                           | 生成音乐曲目                                                 | [Music Generation](/tools/music-generation)                  |
| `video_generate`                           | 生成视频                                                       | [Video Generation](/tools/video-generation)                  |
| `tts`                                      | 一次性文本转语音转换                                    | [TTS](/tools/tts)                                            |
| `sessions_*` / `subagents` / `agents_list` | 会话管理、状态和子代理编排               | [Sub-agents](/tools/subagents)                               |
| `session_status`                           | 轻量级的 `/status` 风格回读以及会话模型覆盖       | [Session Tools](/concepts/session-tool)                      |

对于图像工作，使用 `image` 进行分析，使用 `image_generate` 进行生成或编辑。如果你目标是 `openai/*`、`google/*`、`fal/*` 或其他非默认图像提供商，请先配置该提供商的认证/API 密钥。

对于音乐工作，使用 `music_generate`。如果你目标是 `google/*`、`minimax/*` 或其他非默认音乐提供商，请先配置该提供商的认证/API 密钥。

对于视频工作，使用 `video_generate`。如果你目标是 `qwen/*` 或其他非默认视频提供商，请先配置该提供商的认证/API 密钥。

对于工作流驱动的音频生成，当插件（例如
ComfyUI）注册了 `music_generate` 时，请使用它。这与 `tts` 不同，后者是文本转语音。

`session_status` 是 sessions 组中的轻量级状态/回读工具。
它回答关于当前会话的 `/status` 风格问题，并且可以
选择性地设置每个会话的模型覆盖；`model=default` 会清除该
覆盖。与 `/status` 类似，它可以回填稀疏的 token/cache 计数以及
从最新转录使用条目中获取当前运行时模型标签。

`gateway` 是仅限所有者的网关操作运行时工具：

- `config.schema.lookup`：在编辑前查找一个路径范围内的配置子树
- `config.get`：获取当前配置快照 + 哈希
- `config.patch`：用于带重启的部分配置更新
- `config.apply`：仅用于完整配置替换
- `update.run`：用于显式自更新 + 重启

对于部分更改，优先使用 `config.schema.lookup` 然后 `config.patch`。仅当你有意替换整个配置时才使用 `config.apply`。
有关更广泛的配置文档，请阅读 [配置](/gateway/configuration) 和
[配置参考](/gateway/configuration-reference)。
该工具还拒绝更改 `tools.exec.ask` 或 `tools.exec.security`；
传统的 `tools.bash.*` 别名会规范化为相同的受保护 exec 路径。

### 插件提供的工具

插件可以注册额外工具。一些示例：

- [Diffs](/tools/diffs) — diff 查看器和渲染器
- [LLM Task](/tools/llm-task) — 仅 JSON 的 LLM 步骤，用于结构化输出
- [Lobster](/tools/lobster) — 带可恢复审批的类型化工作流运行时
- [Music Generation](/tools/music-generation) — 由工作流支持提供商共享的 `music_generate` 工具
- [OpenProse](/prose) — 以 markdown 为先的工作流编排
- [Tokenjuice](/tools/tokenjuice) — 紧凑化噪声较多的 `exec` 和 `bash` 工具结果

插件工具仍然通过 `api.registerTool(...)` 编写，并在插件清单的 `contracts.tools` 列表中声明。OpenClaw 在发现阶段会捕获已验证的工具描述符，并按插件源和契约进行缓存，因此后续的工具规划可以跳过插件运行时加载。工具执行仍然会加载所属插件并调用实时注册的实现。

## 工具配置

### 允许和拒绝列表

通过配置中的 `tools.allow` / `tools.deny` 控制代理可以调用哪些工具。拒绝列表始终优先于允许列表。

```json5
{
  tools: {
    allow: ["group:fs", "browser", "web_search"],
    deny: ["exec"],
  },
}
```

当显式允许列表解析后没有任何可调用工具时，OpenClaw 会以关闭失败的方式处理。例如，`tools.allow: ["query_db"]` 只有在加载的插件实际注册了 `query_db` 时才有效。如果没有任何内置、插件或打包的 MCP 工具匹配该允许列表，运行会在模型调用之前停止，而不是继续作为纯文本运行，从而避免工具结果被幻觉出来。

### 工具配置文件

`tools.profile` 在应用 `allow`/`deny` 之前设置基础允许列表。
按代理覆盖：`agents.list[].tools.profile`。

| 配置文件     | 包含内容                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | 所有核心和可选插件工具；用于更广泛命令/控制访问的无限制基线                                                      |
| `coding`    | `group:fs`, `group:runtime`, `group:web`, `group:sessions`, `group:memory`, `cron`, `image`, `image_generate`, `music_generate`, `video_generate` |
| `messaging` | `group:messaging`, `sessions_list`, `sessions_history`, `sessions_send`, `session_status`                                                         |
| `minimal`   | 仅 `session_status`                                                                                                                             |

<Note>
`tools.profile: "messaging"` 故意设置得很窄，适用于以频道为中心的
代理。它不包含更广泛的命令/控制工具，例如文件系统、运行时、
浏览器、canvas、nodes、cron 和 gateway 控制。使用 `tools.profile: "full"`
作为更广泛命令/控制访问的无限制基线，然后在需要时通过
`tools.allow` / `tools.deny` 缩减访问。
</Note>

`coding` 包含轻量级 web 工具（`web_search`、`web_fetch`、`x_search`）
但不包含完整的浏览器控制工具。浏览器自动化可以驱动真实
会话和已登录配置文件，因此请通过
`tools.alsoAllow: ["browser"]` 或按代理的
`agents.list[].tools.alsoAllow: ["browser"]` 显式添加它。

<Note>
在限制性配置文件（`messaging`、`minimal`）下配置 `tools.exec` 或 `tools.fs` 并不会隐式扩大该配置文件的允许列表。当你希望限制性配置文件使用这些已配置的部分时，请添加显式的 `tools.alsoAllow` 条目（例如用于 exec 的 `["exec", "process"]`，或用于 fs 的 `["read", "write", "edit"]`）。当某个配置部分存在但没有匹配的 `alsoAllow` 授权时，OpenClaw 会记录启动警告。
</Note>

`coding` 和 `messaging` 配置文件也允许通过插件键 `bundle-mcp` 配置的捆绑 MCP 工具。
当你希望某个配置文件保留其正常的内置工具但隐藏所有已配置的 MCP 工具时，请添加 `tools.deny: ["bundle-mcp"]`。
`minimal` 配置文件不包含捆绑 MCP 工具。

示例（默认情况下最宽泛的工具面）：

```json5
{
  tools: {
    profile: "full",
  },
}
```

### 工具分组

在允许/拒绝列表中使用 `group:*` 简写：

| 分组              | 工具                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `group:runtime`    | exec、process、code_execution（`bash` 可作为 `exec` 的别名接受）                                 |
| `group:fs`         | read、write、edit、apply_patch                                                                            |
| `group:sessions`   | sessions_list、sessions_history、sessions_send、sessions_spawn、sessions_yield、subagents、session_status |
| `group:memory`     | memory_search、memory_get                                                                                 |
| `group:web`        | web_search、x_search、web_fetch                                                                           |
| `group:ui`         | browser、canvas                                                                                           |
| `group:automation` | cron、gateway                                                                                             |
| `group:messaging`  | message                                                                                                   |
| `group:nodes`      | nodes                                                                                                     |
| `group:agents`     | agents_list                                                                                               |
| `group:media`      | image、image_generate、music_generate、video_generate、tts                                                |
| `group:openclaw`   | 所有内置 OpenClaw 工具（不包括插件工具）                                                       |

`sessions_history` 返回一个有边界、经过安全过滤的回忆视图。它会移除
思考标签、`<relevant-memories>` 脚手架、纯文本工具调用 XML
负载（包括 `<tool_call>...</tool_call>`、
`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、
`<function_calls>...</function_calls>` 以及被截断的工具调用块）、
降级的工具调用脚手架、泄露的 ASCII/全角模型控制
标记，以及助手文本中的格式错误 MiniMax 工具调用 XML，然后再应用
脱敏/截断以及可能的超大行占位符，而不是将其作为原始转录转储。

### 提供商特定限制

使用 `tools.byProvider` 为特定提供商限制工具，而无需
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
