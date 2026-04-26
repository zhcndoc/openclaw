---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件时
  - 了解插件发现和加载规则时
  - 使用兼容 Codex/Claude 的插件包时
title: "插件"
sidebarTitle: "安装与配置"
---

插件通过新的能力扩展 OpenClaw：channels、model providers、
agent harnesses、tools、skills、speech、realtime transcription、realtime
voice、media-understanding、image generation、video generation、web fetch、web
search 等等。有些插件是 **core**（随 OpenClaw 一起发布），另一些是
**external**（由社区发布到 npm）。

## 快速开始

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # 从 npm 安装
    openclaw plugins install @openclaw/voice-call

    # 从本地目录或归档文件安装
    openclaw plugins install ./my-plugin
    openclaw plugins install ./my-plugin.tgz
    ```

  </Step>

  <Step title="重启 Gateway">
    ```bash
    openclaw gateway restart
    ```

    然后在配置文件中的 `plugins.entries.\<id\>.config` 下进行配置。

  </Step>
</Steps>

如果你更喜欢在聊天中直接控制，可以启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:@openclaw/voice-call
/plugin show voice-call
/plugin enable voice-call
```

安装路径使用与 CLI 相同的解析器：本地路径/归档文件、显式
`clawhub:<pkg>`，或裸包规格（先 ClawHub，再回退到 npm）。

如果配置无效，正常安装会直接失败，并提示你执行
`openclaw doctor --fix`。唯一的恢复例外是一个窄范围的捆绑插件
重装路径，适用于启用了
`openclaw.install.allowInvalidConfigRecovery` 的插件。

打包后的 OpenClaw 安装不会急切地安装每个捆绑插件的运行时依赖树。当一个捆绑的、由 OpenClaw 维护的插件通过插件配置、旧版 channel 配置或默认启用的清单处于活动状态时，启动修复只会在导入它之前修复该插件声明的运行时依赖。显式禁用仍然优先：`plugins.entries.<id>.enabled: false`、`plugins.deny`、`plugins.enabled: false` 和 `channels.<id>.enabled: false` 会阻止对该插件/通道的自动捆绑运行时依赖修复。外部插件和自定义加载路径仍必须通过 `openclaw plugins install` 安装。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作方式                                                     | 示例                                                   |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| **原生**   | `openclaw.plugin.json` + 运行时模块；在进程内执行            | 官方插件、社区 npm 包                                  |
| **Bundle** | 兼容 Codex/Claude/Cursor 的布局；映射到 OpenClaw 功能       | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

两者都会显示在 `openclaw plugins list` 中。有关 bundle 的详细信息，请参见 [插件 Bundles](/plugins/bundles)。

如果你正在编写原生插件，请从 [构建插件](/plugins/building-plugins)
和 [插件 SDK 概览](/plugins/sdk-overview) 开始。

## 官方插件

### 可安装（npm）

| 插件             | 包                      | 文档                                 |
| ---------------- | ----------------------- | ------------------------------------ |
| Matrix          | `@openclaw/matrix`     | [Matrix](/channels/matrix)           |
| Microsoft Teams | `@openclaw/msteams`    | [Microsoft Teams](/channels/msteams) |
| Nostr           | `@openclaw/nostr`      | [Nostr](/channels/nostr)             |
| Voice Call      | `@openclaw/voice-call` | [Voice Call](/plugins/voice-call)    |
| Zalo            | `@openclaw/zalo`       | [Zalo](/channels/zalo)               |
| Zalo Personal   | `@openclaw/zalouser`   | [Zalo Personal](/plugins/zalouser)   |

### 核心（随 OpenClaw 一起发布）

<AccordionGroup>
  <Accordion title="模型提供方（默认启用）">
    `anthropic`, `byteplus`, `cloudflare-ai-gateway`, `github-copilot`, `google`,
    `huggingface`, `kilocode`, `kimi-coding`, `minimax`, `mistral`, `qwen`,
    `moonshot`, `nvidia`, `openai`, `opencode`, `opencode-go`, `openrouter`,
    `qianfan`, `synthetic`, `together`, `venice`,
    `vercel-ai-gateway`, `volcengine`, `xiaomi`, `zai`
  </Accordion>

  <Accordion title="内存插件">
    - `memory-core` — 内置内存搜索（通过 `plugins.slots.memory` 默认启用）
    - `memory-lancedb` — 按需安装的长期记忆，带自动回忆/捕获（设置 `plugins.slots.memory = "memory-lancedb"`）
  </Accordion>

  <Accordion title="语音提供方（默认启用）">
    `elevenlabs`, `microsoft`
  </Accordion>

  <Accordion title="其他">
    - `browser` — 用于浏览器工具、`openclaw browser` CLI、`browser.request` 网关方法、浏览器运行时以及默认浏览器控制服务的捆绑浏览器插件（默认启用；替换前请禁用）
    - `copilot-proxy` — VS Code Copilot Proxy 桥接（默认禁用）
  </Accordion>
</AccordionGroup>

在找第三方插件吗？请参见 [社区插件](/plugins/community)。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-plugin"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

| 字段              | 说明                                                  |
| ----------------- | ----------------------------------------------------- |
| `enabled`        | 总开关（默认：`true`）                                |
| `allow`          | 插件允许列表（可选）                                  |
| `deny`           | 插件拒绝列表（可选；拒绝优先）                        |
| `load.paths`     | 额外的插件文件/目录                                  |
| `slots`          | 独占槽选择器（例如 `memory`、`contextEngine`）        |
| `entries.\<id\>` | 每个插件的开关 + 配置                                |

配置更改**需要重启 gateway**。如果 Gateway 正在以配置监视 + 进程内重启启用的方式运行（默认的 `openclaw gateway` 路径），那么该重启通常会在配置写入落地后不久自动执行。原生插件运行时代码或生命周期钩子没有受支持的热重载路径；在期望更新后的 `register(api)` 代码、`api.on(...)` 钩子、tools、services 或 provider/runtime 钩子运行之前，请重启正在服务实时通道的 Gateway 进程。

`openclaw plugins list` 是本地 CLI/配置快照。那里显示为 `loaded` 的插件表示，对于该次 CLI 调用所见到的配置/文件，该插件是可发现且可加载的。这并不能证明已经运行中的远程 Gateway 子进程已经重启并使用相同的插件代码。在带有包装进程的 VPS/容器环境中，请将重启发送到实际的 `openclaw gateway run` 进程，或针对正在运行的 Gateway 使用 `openclaw gateway restart`。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">
  - **已禁用**：插件存在，但启用规则将其关闭。配置会被保留。
  - **缺失**：配置引用了一个发现过程中未找到的插件 id。
  - **无效**：插件存在，但其配置与声明的 schema 不匹配。
</Accordion>

## 发现与优先级

OpenClaw 按以下顺序扫描插件（先匹配者优先）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 显式文件或目录路径。
  </Step>

  <Step title="Workspace plugins">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="Global plugins">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`.
  </Step>

  <Step title="捆绑插件">
    随 OpenClaw 一起发布。许多默认启用（模型提供方、语音）。
    其他则需要显式启用。
  </Step>
</Steps>

### 启用规则

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 永远优先于 allow
- `plugins.entries.\<id\>.enabled: false` 禁用该插件
- Workspace-origin 插件默认**禁用**（必须显式启用）
- 捆绑插件遵循内置的默认开启集合，除非被覆盖
- 独占槽可以强制启用该槽选定的插件
- 当配置命名了插件拥有的表面时，某些捆绑的可选启用插件会自动启用，例如 provider 模型引用、channel 配置或 harness 运行时
- OpenAI 系 Codex 路由保留独立的插件边界：
  `openai-codex/*` 属于 OpenAI 插件，而捆绑的 Codex app-server 插件由 `embeddedHarness.runtime: "codex"` 或旧版 `codex/*` 模型引用选择

## 运行时钩子排障

如果某个插件出现在 `plugins list` 中，但 `register(api)` 副作用或钩子没有在实时聊天流量中运行，请先检查这些：

- 运行 `openclaw gateway status --deep --require-rpc`，并确认你正在编辑的活动 Gateway URL、配置文件、config 路径和进程都是正确的。
- 在插件安装/配置/代码变更后重启实时 Gateway。在包装容器中，PID 1 可能只是一个 supervisor；请重启或向子进程 `openclaw gateway run` 发送信号。
- 使用 `openclaw plugins inspect <id> --json` 确认钩子注册和诊断信息。非捆绑的对话钩子，如 `llm_input`、`llm_output` 和 `agent_end`，需要 `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，优先使用 `before_model_resolve`。它会在 agent 回合的模型解析之前运行；`llm_output` 只会在一次模型尝试产生 assistant 输出后运行。
- 若要确认实际生效的会话模型，请使用 `openclaw sessions` 或 Gateway 的 session/status 界面；在调试 provider 负载时，可使用 `--raw-stream --raw-stream-path <path>` 启动 Gateway。

## 插件槽（独占分类）

某些类别是独占的（同一时间只能激活一个）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // 或 `none` 以禁用
      contextEngine: "legacy", // 或一个插件 id
    },
  },
}
```

| 槽              | 控制内容              | 默认值              |
| --------------- | --------------------- | ------------------- |
| `memory`        | 当前生效的内存插件    | `memory-core`       |
| `contextEngine` | 当前生效的上下文引擎  | `legacy`（内置）    |

## CLI 参考

```bash
openclaw plugins list                       # 紧凑清单
openclaw plugins list --enabled            # 仅已加载插件
openclaw plugins list --verbose            # 每个插件的详细行
openclaw plugins list --json               # 机器可读清单
openclaw plugins inspect <id>              # 深度详情
openclaw plugins inspect <id> --json       # 机器可读
openclaw plugins inspect --all             # 全局表格
openclaw plugins info <id>                 # inspect 别名
openclaw plugins doctor                    # 诊断

openclaw plugins install <package>         # 安装（先 ClawHub，再 npm）
openclaw plugins install clawhub:<pkg>     # 仅从 ClawHub 安装
openclaw plugins install <spec> --force    # 覆盖现有安装
openclaw plugins install <path>            # 从本地路径安装
openclaw plugins install -l <path>         # 链接（不复制），用于开发
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # 记录精确解析后的 npm 规格
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # 更新一个插件
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # 更新全部
openclaw plugins uninstall <id>          # 移除配置/安装记录
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

捆绑插件随 OpenClaw 一起发布。许多会默认启用（例如
捆绑模型提供方、捆绑语音提供方以及捆绑浏览器
插件）。其他捆绑插件仍需要执行 `openclaw plugins enable <id>`。

`--force` 会就地覆盖现有已安装插件或 hook pack。日常升级已跟踪的 npm
插件请使用 `openclaw plugins update <id-or-npm-spec>`。它不支持与
`--link` 一起使用，因为 `--link` 会复用源路径，而不是复制到受管理的安装目标。

当 `plugins.allow` 已经设置时，`openclaw plugins install` 会在启用该插件之前将已安装插件的 id 添加到该允许列表中，因此安装在重启后即可立即加载。

`openclaw plugins update <id-or-npm-spec>` 适用于已跟踪的安装。传入带 dist-tag 或精确版本的 npm 包规格会将包名解析回已跟踪的插件记录，并记录新的规格以供后续更新。直接传入不带版本的包名会将精确锁定的安装移回 registry 的默认发布线。如果已安装的 npm 插件已与解析出的版本和记录的制品标识匹配，OpenClaw 会跳过更新，不会下载、重新安装或重写配置。

`--pin` 仅适用于 npm。它不支持与 `--marketplace` 一起使用，因为 marketplace 安装会保留 marketplace 源元数据，而不是 npm 规格。

`--dangerously-force-unsafe-install` 是一个“破窗”覆盖选项，用于处理内置危险代码扫描器的误报。它允许插件安装和插件更新在遇到内置 `critical` 发现后继续进行，但仍然不能绕过插件 `before_install` 策略阻止或扫描失败阻止。

此 CLI 标志仅适用于插件安装/更新流程。由 Gateway 驱动的技能依赖安装则改用对应的 `dangerouslyForceUnsafeInstall` 请求覆盖项，而 `openclaw skills install` 仍然是独立的 ClawHub 技能下载/安装流程。

兼容的 bundle 会参与相同的插件 list/inspect/enable/disable
流程。当前运行时支持包括 bundle 技能、Claude 命令技能、
Claude `settings.json` 默认项、Claude `.lsp.json` 以及清单声明的
`lspServers` 默认项、Cursor 命令技能，以及兼容的 Codex hook
目录。

`openclaw plugins inspect <id>` 还会报告已检测到的 bundle 能力，以及
bundle 支持或不支持的 MCP 和 LSP 服务器条目。

Marketplace 来源可以是 Claude 已知 marketplace 名称，来自
`~/.claude/plugins/known_marketplaces.json`，也可以是本地 marketplace 根目录或
`marketplace.json` 路径、像 `owner/repo` 这样的 GitHub 简写、GitHub 仓库
URL，或 git URL。对于远程 marketplace，插件条目必须保留在
克隆的 marketplace 仓库内，并且只能使用相对路径来源。

完整详情请参见 [`openclaw plugins` CLI 参考](/cli/plugins)。

## 插件 API 概览

原生插件会导出一个入口对象，其中暴露 `register(api)`。较旧的
插件可能仍然使用 `activate(api)` 作为旧版别名，但新插件应当
使用 `register`。

```typescript
export default definePluginEntry({
  id: "my-plugin",
  name: "My Plugin",
  register(api) {
    api.registerProvider({
      /* ... */
    });
    api.registerTool({
      /* ... */
    });
    api.registerChannel({
      /* ... */
    });
  },
});
```

OpenClaw 在插件
激活期间加载入口对象并调用 `register(api)`。加载器对较旧插件仍然会回退到 `activate(api)`，
但打包插件和新的外部插件都应将 `register` 视为
公共契约。

`api.registrationMode` 告诉插件其入口为何被加载：

| Mode            | 含义                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `full`          | 运行时激活。注册工具、钩子、服务、命令、路由以及其他实时副作用。    |
| `discovery`     | 只读能力发现。注册提供者和元数据，但跳过耗时的实时副作用。 |
| `setup-only`    | 通过轻量级 setup 入口加载频道设置元数据。                                      |
| `setup-runtime` | 同时也需要运行时入口的频道设置加载。                                               |
| `cli-metadata`  | 仅收集 CLI 命令元数据。                                                                  |

打开 socket、数据库、后台 worker 或长生命周期
客户端的插件，应当通过 `api.registrationMode === "full"` 来保护这些副作用。
发现类加载会与激活类加载分别缓存，并且不会替换正在运行的 Gateway 注册表。

常见注册方法：

| 方法                                  | 注册内容                  |
| --------------------------------------- | --------------------------- |
| `registerProvider`                      | 模型提供者（LLM）        |
| `registerChannel`                       | 聊天频道                |
| `registerTool`                          | Agent 工具                  |
| `registerHook` / `on(...)`              | 生命周期钩子             |
| `registerSpeechProvider`                | 文本转语音 / STT        |
| `registerRealtimeTranscriptionProvider` | 流式 STT               |
| `registerRealtimeVoiceProvider`         | 双工实时语音       |
| `registerMediaUnderstandingProvider`    | 图像/音频分析        |
| `registerImageGenerationProvider`       | 图像生成            |
| `registerMusicGenerationProvider`       | 音乐生成            |
| `registerVideoGenerationProvider`       | 视频生成            |
| `registerWebFetchProvider`              | Web 抓取 / 爬取提供者 |
| `registerWebSearchProvider`             | Web 搜索                  |
| `registerHttpRoute`                     | HTTP 端点               |
| `registerCommand` / `registerCli`       | CLI 命令                |
| `registerContextEngine`                 | 上下文引擎              |
| `registerService`                       | 后台服务          |

类型化生命周期钩子的守卫行为：

- `before_tool_call`: `{ block: true }` 是终态；较低优先级的处理器将被跳过。
- `before_tool_call`: `{ block: false }` 是无操作，且不会清除之前的阻止状态。
- `before_install`: `{ block: true }` 是终态；较低优先级的处理器将被跳过。
- `before_install`: `{ block: false }` 是无操作，且不会清除之前的阻止状态。
- `message_sending`: `{ cancel: true }` 是终态；较低优先级的处理器将被跳过。
- `message_sending`: `{ cancel: false }` 是无操作，且不会清除之前的取消状态。

Native Codex app-server runs bridge Codex-native tool events back into this
hook surface. Plugins can block native Codex tools through `before_tool_call`,
observe results through `after_tool_call`, and participate in Codex
`PermissionRequest` approvals. The bridge does not rewrite Codex-native tool
arguments yet.

For full typed hook behavior, see [SDK 概览](/plugins/sdk-overview#hook-decision-semantics).

## 相关内容

- [构建插件](/plugins/building-plugins) — 创建你自己的插件
- [插件 Bundles](/plugins/bundles) — 兼容 Codex/Claude/Cursor 的 bundle
- [插件清单](/plugins/manifest) — manifest 架构
- [注册工具](/plugins/building-plugins#registering-agent-tools) — 在插件中添加 agent 工具
- [插件内部机制](/plugins/architecture) — 能力模型和加载流水线
- [社区插件](/plugins/community) — 第三方列表
