---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件
  - 了解插件发现和加载规则
  - 使用与 Codex/Claude 兼容的插件包
title: "插件"
sidebarTitle: "安装和配置"
---

插件为 OpenClaw 扩展新能力：频道、模型提供方、
代理执行框架、工具、技能、语音、实时转写、实时
语音、媒体理解、图像生成、视频生成、网页获取、网页
搜索等。部分插件是 **核心**（随 OpenClaw 一起发布），其余
是 **外部**。大多数外部插件通过
[ClawHub](/tools/clawhub) 发布和发现。Npm 仍然支持直接安装，以及在
OpenClaw 自有插件包的临时集合上使用，直到迁移完成。

## 快速开始

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # 来自 npm
    openclaw plugins install npm:@acme/openclaw-plugin

    # 来自本地目录或归档
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

如果你更喜欢通过聊天进行控制，请启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

安装路径使用与 CLI 相同的解析器：本地路径/归档、显式
`clawhub:<pkg>`、显式 `npm:<pkg>`，或裸包规范（先 ClawHub，再
回退到 npm）。

如果配置无效，正常安装会失败并提示你运行
`openclaw doctor --fix`。唯一的恢复例外是一个狭窄的捆绑插件
重装路径，适用于选择启用
`openclaw.install.allowInvalidConfigRecovery` 的插件。
在 Gateway 启动期间，某个插件的无效配置会与其他插件隔离：
启动日志会记录 `plugins.entries.<id>.config` 的问题，加载时跳过该插件，
并保持其他插件和频道在线。运行 `openclaw doctor --fix`
可通过禁用该插件条目并删除其无效配置负载来隔离坏插件配置；常规配置备份会保留之前的值。
当某个频道配置引用了一个已不再可发现的插件，但相同的过时插件 id 仍然存在于插件配置或安装记录中时，Gateway 启动会记录警告并跳过该频道，而不是阻止其他所有频道。
运行 `openclaw doctor --fix` 以移除过时的频道/插件条目；若未知
频道键没有过时插件证据，则仍会失败校验，这样拼写错误就能保持可见。
如果设置了 `plugins.enabled: false`，过时的插件引用会被视为无效状态：
Gateway 启动会跳过插件发现/加载工作，而 `openclaw doctor` 会保留
已禁用的插件配置，而不是自动删除它。若你想移除过时的插件 id，请先重新启用插件再运行 doctor 清理。

打包版 OpenClaw 安装不会急切地为每个捆绑插件安装
其运行时依赖树。当某个捆绑的 OpenClaw 自有插件因
插件配置、旧版频道配置或默认启用的清单而处于激活状态时，启动时
只会在导入它之前修复该插件声明的运行时依赖。
仅持久化的频道认证状态不会在 Gateway 启动时激活捆绑频道的运行时依赖修复。
显式禁用仍然优先：`plugins.entries.<id>.enabled: false`、
`plugins.deny`、`plugins.enabled: false` 以及 `channels.<id>.enabled: false`
会阻止对该插件/频道进行自动捆绑运行时依赖修复。
非空的 `plugins.allow` 也会限制默认启用的捆绑运行时依赖修复；显式捆绑频道启用（`channels.<id>.enabled: true`）仍可修复该频道的插件依赖。
外部插件和自定义加载路径仍必须通过
`openclaw plugins install` 安装。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作方式                                                       | 示例                                                   |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| **Native** | `openclaw.plugin.json` + 运行时模块；在进程内执行              | 官方插件、社区 npm 包               |
| **Bundle** | 与 Codex/Claude/Cursor 兼容的布局；映射到 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

二者都会显示在 `openclaw plugins list` 中。有关捆绑包详情，请参见 [Plugin Bundles](/plugins/bundles)。

如果你正在编写原生插件，请从 [Building Plugins](/plugins/building-plugins)
和 [Plugin SDK Overview](/plugins/sdk-overview) 开始。

## 包入口点

原生插件 npm 包必须在 `package.json` 中声明 `openclaw.extensions`。
每个条目必须保留在包目录内，并解析到可读的
运行时文件，或者解析到 TypeScript 源文件及其推断生成的 JavaScript
同级文件，例如 `src/index.ts` 对应 `dist/index.js`。

当发布后的运行时文件不位于与源入口相同的路径时，请使用 `openclaw.runtimeExtensions`。若存在，
`runtimeExtensions` 必须为每个 `extensions` 条目精确包含一个条目。列表不匹配会导致安装和
插件发现失败，而不是静默回退到源路径。

```json
{
  "name": "@acme/openclaw-plugin",
  "openclaw": {
    "extensions": ["./src/index.ts"],
    "runtimeExtensions": ["./dist/index.js"]
  }
}
```

## 官方插件

### 迁移期间的 OpenClaw 自有 npm 包

ClawHub 是大多数插件的主要分发路径。当前打包版
OpenClaw 发布版已经捆绑了许多官方插件，因此在正常设置下这些插件不需要
单独的 npm 安装。在每个 OpenClaw 自有插件都迁移到 ClawHub 之前，OpenClaw 仍会在 npm 上提供一些 `@openclaw/*` 插件包，用于较旧/自定义安装和直接 npm 工作流。

如果 npm 将某个 `@openclaw/*` 插件包报告为已弃用，
说明该版本来自较旧的外部包线。请使用当前 OpenClaw 中捆绑的插件，或本地检出版本，直到发布更新的 npm 包。

| 插件            | 包                         | 文档                                       |
| --------------- | -------------------------- | ------------------------------------------ |
| BlueBubbles     | `@openclaw/bluebubbles`    | [BlueBubbles](/channels/bluebubbles)       |
| Discord         | `@openclaw/discord`        | [Discord](/channels/discord)               |
| Feishu          | `@openclaw/feishu`         | [Feishu](/channels/feishu)                 |
| Matrix          | `@openclaw/matrix`         | [Matrix](/channels/matrix)                 |
| Mattermost      | `@openclaw/mattermost`     | [Mattermost](/channels/mattermost)         |
| Microsoft Teams | `@openclaw/msteams`        | [Microsoft Teams](/channels/msteams)       |
| Nextcloud Talk  | `@openclaw/nextcloud-talk` | [Nextcloud Talk](/channels/nextcloud-talk) |
| Nostr           | `@openclaw/nostr`          | [Nostr](/channels/nostr)                   |
| Synology Chat   | `@openclaw/synology-chat`  | [Synology Chat](/channels/synology-chat)   |
| Tlon            | `@openclaw/tlon`           | [Tlon](/channels/tlon)                     |
| WhatsApp        | `@openclaw/whatsapp`       | [WhatsApp](/channels/whatsapp)             |
| Zalo            | `@openclaw/zalo`           | [Zalo](/channels/zalo)                     |
| Zalo Personal   | `@openclaw/zalouser`       | [Zalo Personal](/plugins/zalouser)         |

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
    - `memory-core` — 捆绑的内存搜索（默认通过 `plugins.slots.memory`）
    - `memory-lancedb` — 按需安装、带自动召回/捕获的长期记忆（设置 `plugins.slots.memory = "memory-lancedb"`）

    有关 OpenAI 兼容的
    embedding 设置、Ollama 示例、召回限制和故障排查，请参见 [Memory LanceDB](/plugins/memory-lancedb)。

  </Accordion>

  <Accordion title="语音提供方（默认启用）">
    `elevenlabs`, `microsoft`
  </Accordion>

  <Accordion title="其他">
    - `browser` — 用于浏览器工具的捆绑浏览器插件、`openclaw browser` CLI、`browser.request` gateway 方法、浏览器运行时以及默认浏览器控制服务（默认启用；在替换之前请先禁用）
    - `copilot-proxy` — VS Code Copilot Proxy 桥接（默认禁用）

  </Accordion>
</AccordionGroup>

在寻找第三方插件？请参见 [社区插件](/plugins/community)。

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

| 字段             | 描述                                               |
| ---------------- | --------------------------------------------------------- |
| `enabled`        | 总开关（默认：`true`）                           |
| `allow`          | 插件允许列表（可选）                               |
| `deny`           | 插件拒绝列表（可选；拒绝优先生效）                     |
| `load.paths`     | 额外的插件文件/目录                            |
| `slots`          | 独占槽位选择器（例如 `memory`、`contextEngine`） |
| `entries.\<id\>` | 每个插件的开关 + 配置                               |

配置更改**需要重启 gateway**。如果 Gateway 正在使用配置
监听 + 进程内重启（默认 `openclaw gateway` 路径）运行，那么该
重启通常会在配置写入生效后不久自动执行。
原生插件运行时代码或生命周期
钩子没有受支持的热重载路径；在期望更新后的 `register(api)` 代码、`api.on(...)` 钩子、工具、服务或
提供方/运行时钩子生效之前，请先重启正在提供实时频道服务的 Gateway 进程。

`openclaw plugins list` 是本地插件注册表/配置快照。其中文件中
`enabled` 的插件表示持久化注册表和当前配置允许该
插件参与运行。它并不能证明一个已经在运行的远程 Gateway
子进程已经重启并加载了相同的插件代码。在 VPS/容器部署中，如果有
包装进程，请将重启发送到实际的 `openclaw gateway run` 进程，
或者对正在运行的 Gateway 使用 `openclaw gateway restart`。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">
  - **已禁用**：插件存在，但启用规则将其关闭。配置会被保留。
  - **缺失**：配置引用了一个发现未找到的插件 id。
  - **无效**：插件存在，但其配置不符合声明的模式。Gateway 启动只会跳过该插件；`openclaw doctor --fix` 可以通过禁用它并删除其配置负载来隔离该无效条目。

</Accordion>

## 发现与优先级

OpenClaw 按以下顺序扫描插件（先匹配者优先）：

<Steps>
  <Step title="配置路径">
    `plugins.load.paths` — 显式的文件或目录路径。指向 OpenClaw 自身打包内置插件目录的路径会被忽略；运行 `openclaw doctor --fix` 以移除这些过期别名。
  </Step>

  <Step title="工作区插件">
    `\<workspace\>/.openclaw/<plugin-root>/*.ts` 和 `\<workspace\>/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="全局插件">
    `~/.openclaw/<plugin-root>/*.ts` 和 `~/.openclaw/<plugin-root>/*/index.ts`。
  </Step>

  <Step title="内置插件">
    随 OpenClaw 一起提供。许多默认启用（模型提供器、语音）。
    其他则需要显式启用。
  </Step>
</Steps>

打包安装和 Docker 镜像通常从编译后的 `dist/extensions` 树中解析内置插件。若将某个内置插件的源码目录通过 bind mount 覆盖到对应的打包源码路径上，例如
`/app/extensions/synology-chat`，OpenClaw 会将该挂载的源码目录视为一个内置源码覆盖层，并优先于打包的
`/app/dist/extensions/synology-chat` bundle 发现它。这样可以在不把每个内置插件都切回 TypeScript 源码的情况下，保持维护者容器循环正常工作。
设置 `OPENCLAW_DISABLE_BUNDLED_SOURCE_OVERLAYS=1` 可强制使用打包的 dist bundles，即使存在源码覆盖挂载。

### 启用规则

- `plugins.enabled: false` 会禁用所有插件并跳过插件发现/加载工作
- `plugins.deny` 始终优先于 allow
- `plugins.entries.\<id\>.enabled: false` 会禁用该插件
- 工作区来源的插件默认**禁用**（必须显式启用）
- 内置插件遵循默认开启的内置集合，除非被覆盖
- 独占槽位可以强制启用该槽位选定的插件
- 当配置命名了某个由插件拥有的 surface，例如 provider model ref、channel 配置或 harness runtime 时，某些内置的可选插件会自动启用
- 在 `plugins.enabled: false` 处于活动状态时，过期的插件配置会被保留；如果你希望移除过期 id，请先重新启用插件再运行 doctor 清理
- OpenAI 家族的 Codex 路由保留独立的插件边界：
  `openai-codex/*` 属于 OpenAI 插件，而内置的 Codex app-server 插件则由 `agentRuntime.id: "codex"` 或旧版
  `codex/*` model refs 选中

## 运行时钩子排查

如果某个插件出现在 `plugins list` 中，但 `register(api)` 的副作用或钩子
没有在实时聊天流量中运行，请先检查以下内容：

- 运行 `openclaw gateway status --deep --require-rpc`，确认当前活动的
  Gateway URL、profile、config path 和 process 正是你正在修改的那些。
- 在插件安装/配置/代码变更后重启实时 Gateway。在包装器
  容器中，PID 1 可能只是一个 supervisor；请重启或向子进程发送信号
  `openclaw gateway run`。
- 使用 `openclaw plugins inspect <id> --json` 确认钩子注册和诊断信息。非内置的对话钩子，例如 `llm_input`、
  `llm_output`、`before_agent_finalize` 和 `agent_end`，需要
  `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，优先使用 `before_model_resolve`。它会在代理轮次的模型
  解析之前运行；`llm_output` 只会在某个模型尝试
  产生助手输出之后运行。
- 如需确认最终生效的会话模型，请使用 `openclaw sessions` 或 Gateway 的 session/status 界面，并且在调试 provider payloads 时，使用 `--raw-stream --raw-stream-path <path>` 启动 Gateway。

### 重复的 channel 或工具所有权

症状：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

这些情况意味着不止一个已启用插件正在尝试拥有同一个 channel、
setup flow 或工具名。最常见的原因是某个外部 channel 插件安装在一个
现在也提供相同 channel id 的内置插件旁边。

调试步骤：

- 运行 `openclaw plugins list --enabled --verbose` 查看每个已启用插件
  及其来源。
- 对每个可疑插件运行 `openclaw plugins inspect <id> --json`，并比较
  `channels`、`channelConfigs`、`tools` 和诊断信息。
- 安装或移除插件包后运行 `openclaw plugins registry --refresh`，以便持久化元数据反映当前安装状态。
- 在安装、registry 或配置变更后重启 Gateway。

修复选项：

- 如果某个插件有意替换同一 channel id 的另一个插件，优先的插件应声明
  `channelConfigs.<channel-id>.preferOver`，其值为低优先级插件 id。参见 [/plugins/manifest#replacing-another-channel-plugin](/plugins/manifest#replacing-another-channel-plugin)。
- 如果重复是偶然发生的，请用
  `plugins.entries.<plugin-id>.enabled: false` 禁用其中一方，或移除过期的插件安装。
- 如果你显式启用了这两个插件，OpenClaw 会保留该请求并
  报告冲突。请为该 channel 选择一个所有者，或重命名插件拥有的工具，使运行时 surface 清晰明确。

## 插件槽位（独占类别）

某些类别是独占的（同一时间只能有一个处于活动状态）：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // 或 "none" 以禁用
      contextEngine: "legacy", // 或一个插件 id
    },
  },
}
```

| 槽位            | 它控制的内容         | 默认值              |
| --------------- | -------------------- | ------------------- |
| `memory`        | 活动的 memory 插件   | `memory-core`       |
| `contextEngine` | 活动的上下文引擎     | `legacy`（内置） |

## CLI 参考

```bash
openclaw plugins list                       # 紧凑清单
openclaw plugins list --enabled            # 仅已启用插件
openclaw plugins list --verbose            # 每个插件的详细行
openclaw plugins list --json               # 机器可读的清单
openclaw plugins inspect <id>              # 深度详情
openclaw plugins inspect <id> --json       # 机器可读
openclaw plugins inspect --all             # 全局表格
openclaw plugins info <id>                 # inspect 别名
openclaw plugins doctor                    # 诊断
openclaw plugins registry                  # 检查持久化的 registry 状态
openclaw plugins registry --refresh        # 重建持久化 registry
openclaw doctor --fix                      # 修复插件 registry 状态

openclaw plugins install <package>         # 安装（先 ClawHub，再 npm）
openclaw plugins install clawhub:<pkg>     # 仅从 ClawHub 安装
openclaw plugins install npm:<pkg>         # 仅从 npm 安装
openclaw plugins install <spec> --force    # 覆盖现有安装
openclaw plugins install <path>            # 从本地路径安装
openclaw plugins install -l <path>         # 链接（不复制）用于开发
openclaw plugins install <plugin> --marketplace <source>
openclaw plugins install <plugin> --marketplace https://github.com/<owner>/<repo>
openclaw plugins install <spec> --pin      # 记录精确解析出的 npm spec
openclaw plugins install <spec> --dangerously-force-unsafe-install
openclaw plugins update <id-or-npm-spec> # 更新一个插件
openclaw plugins update <id-or-npm-spec> --dangerously-force-unsafe-install
openclaw plugins update --all            # 更新全部
openclaw plugins uninstall <id>          # 移除配置和插件索引记录
openclaw plugins uninstall <id> --keep-files
openclaw plugins marketplace list <source>
openclaw plugins marketplace list <source> --json

openclaw plugins enable <id>
openclaw plugins disable <id>
```

内置插件随 OpenClaw 一起发布。许多默认启用（例如
内置模型提供器、内置语音提供器以及内置浏览器
插件）。其他内置插件仍需要 `openclaw plugins enable <id>`。

`--force` 会直接覆盖现有已安装插件或 hook pack。日常升级已跟踪的 npm 插件时，请使用
`openclaw plugins update <id-or-npm-spec>`。它不支持与 `--link` 一起使用，后者会复用源码路径，而不是复制到受管理的安装目标。

当 `plugins.allow` 已经设置时，`openclaw plugins install` 会在启用之前将已安装插件 id 添加到该 allowlist 中。若同一插件 id
存在于 `plugins.deny` 中，install 会移除该过期 deny 条目，使显式安装在重启后可立即加载。

OpenClaw 维护一个持久化的本地插件 registry，作为插件清单、贡献所有权和启动规划的冷读模型。install、update、
uninstall、enable 和 disable 流程会在更改插件状态后刷新该 registry。相同的 `plugins/installs.json` 文件在顶层 `installRecords` 中保存持久化安装元数据，并在 `plugins` 中保存可重建的 manifest 元数据。如果 registry 缺失、过期或无效，`openclaw plugins registry
--refresh` 会在不加载插件运行时模块的情况下，基于安装记录、配置策略以及 manifest/package 元数据重建其 manifest 视图。
`openclaw plugins update <id-or-npm-spec>` 适用于已跟踪的安装。传入带有 dist-tag 或精确版本的 npm package spec 时，会将包名解析回已跟踪的插件记录，并记录新的 spec 以便未来更新。只传包名而不带版本时，会把精确固定安装移回 registry 的默认发布线。如果已安装的 npm 插件已经匹配解析后的版本和记录的 artifact identity，OpenClaw 会跳过更新，而不会下载、重新安装或重写配置。

`--pin` 仅适用于 npm。它不支持与 `--marketplace` 一起使用，因为
marketplace 安装会持久化 marketplace 源元数据，而不是 npm spec。

`--dangerously-force-unsafe-install` 是一个紧急开关，用于处理内置危险代码扫描器的误报。它允许插件安装
和插件更新继续通过内置的 `critical` 结果，但仍然不能绕过插件 `before_install` 策略阻止或扫描失败阻止。
安装扫描会忽略常见测试文件和目录，例如 `tests/`、
`__tests__/`、`*.test.*` 和 `*.spec.*`，以避免阻止打包的测试 mock；
即使声明的插件运行时入口点使用这些名称之一，也仍然会被扫描。

这个 CLI 标志仅适用于插件安装/更新流程。由 Gateway 支持的技能依赖安装会改用匹配的
`dangerouslyForceUnsafeInstall` 请求覆盖，而 `openclaw skills install` 仍然是独立的 ClawHub 技能下载/安装流程。

如果你在 ClawHub 上发布的插件被隐藏或因扫描而被阻止，请打开
ClawHub 仪表板，或运行 `clawhub package rescan <name>`，让 ClawHub 再检查一次。`--dangerously-force-unsafe-install`
只影响你自己机器上的安装；它不会要求 ClawHub 重新扫描该插件，也不会让被阻止的 release 公开。

兼容的 bundle 参与同样的插件 list/inspect/enable/disable
流程。当前运行时支持包括 bundle skills、Claude command-skills、
Claude `settings.json` defaults、Claude `.lsp.json` 和 manifest 声明的
`lspServers` defaults、Cursor command-skills，以及兼容的 Codex hook
目录。

`openclaw plugins inspect <id>` 还会报告检测到的 bundle 功能，以及
由 bundle 支持的插件中受支持或不受支持的 MCP 和 LSP server 条目。

Marketplace 源可以是 `~/.claude/plugins/known_marketplaces.json` 中 Claude 已知的 marketplace 名称、本地 marketplace 根目录或 `marketplace.json` 路径、类似 `owner/repo` 的 GitHub 简写、GitHub 仓库 URL，或 git URL。对于远程 marketplace，插件条目必须保留在克隆的 marketplace 仓库内部，并且只能使用相对路径来源。

详见 [`openclaw plugins` CLI 参考](/cli/plugins)。

## 插件 API 概览

原生插件导出一个入口对象，该对象暴露 `register(api)`。较旧的
插件可能仍然使用 `activate(api)` 作为旧别名，但新插件应当
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

OpenClaw 在插件激活期间加载入口对象并调用 `register(api)`。加载器仍然会为较旧的插件回退到 `activate(api)`，
但打包插件和新的外部插件应将 `register` 视为
公共契约。

`api.registrationMode` 会告诉插件其入口被加载的原因：

| 模式            | 含义                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `full`          | 运行时激活。注册工具、钩子、服务、命令、路由以及其他实时副作用。                              |
| `discovery`     | 只读能力发现。注册提供方和元数据；可信的插件入口代码可能会被加载，但会跳过实时副作用。 |
| `setup-only`    | 通过轻量级设置入口加载通道设置元数据。                                                                |
| `setup-runtime` | 既需要运行时入口的通道设置加载。                                                                         |
| `cli-metadata`  | 仅收集 CLI 命令元数据。                                                                                            |

打开套接字、数据库、后台工作线程或长生命周期
客户端的插件入口，应使用 `api.registrationMode === "full"` 来保护这些副作用。
发现加载会与激活加载分开缓存，并且不会替换
正在运行的 Gateway 注册表。发现是非激活的，但不是无导入的：
OpenClaw 可能会评估受信任的插件入口或通道插件模块以构建
快照。请保持模块顶层轻量且无副作用，并将
网络客户端、子进程、监听器、凭据读取以及服务启动
放在完整运行时路径之后。

常见注册方法：

| 方法                                  | 注册内容           |
| ------------------------------------- | ------------------- |
| `registerProvider`                    | 模型提供方（LLM）    |
| `registerChannel`                     | 聊天通道            |
| `registerTool`                        | Agent 工具          |
| `registerHook` / `on(...)`            | 生命周期钩子        |
| `registerSpeechProvider`              | 文本转语音 / STT    |
| `registerRealtimeTranscriptionProvider` | 流式 STT            |
| `registerRealtimeVoiceProvider`       | 双工实时语音        |
| `registerMediaUnderstandingProvider`   | 图像/音频分析       |
| `registerImageGenerationProvider`     | 图像生成            |
| `registerMusicGenerationProvider`     | 音乐生成            |
| `registerVideoGenerationProvider`     | 视频生成            |
| `registerWebFetchProvider`            | Web 获取 / 抓取提供方 |
| `registerWebSearchProvider`           | Web 搜索            |
| `registerHttpRoute`                   | HTTP 端点           |
| `registerCommand` / `registerCli`     | CLI 命令            |
| `registerContextEngine`               | 上下文引擎          |
| `registerService`                     | 后台服务            |

类型化生命周期钩子的钩子守卫行为：

- `before_tool_call`: `{ block: true }` 是终态；低优先级处理器会被跳过。
- `before_tool_call`: `{ block: false }` 是空操作，不会清除先前的阻止。
- `before_install`: `{ block: true }` 是终态；低优先级处理器会被跳过。
- `before_install`: `{ block: false }` 是空操作，不会清除先前的阻止。
- `message_sending`: `{ cancel: true }` 是终态；低优先级处理器会被跳过。
- `message_sending`: `{ cancel: false }` 是空操作，不会清除先前的取消。

原生 Codex 应用服务器会将 Codex 原生工具事件通过桥接回传到这个
钩子表面。插件可以通过 `before_tool_call` 阻止原生 Codex 工具，
通过 `after_tool_call` 观察结果，并参与 Codex
`PermissionRequest` 审批。该桥接目前不会重写 Codex 原生工具
参数。Codex 运行时支持边界的确切定义位于
[Codex harness v1 支持契约](/plugins/codex-harness#v1-support-contract)。

有关完整的类型化钩子行为，请参见 [SDK 概览](/plugins/sdk-overview#hook-decision-semantics)。

## 相关内容

- [构建插件](/plugins/building-plugins) — 创建你自己的插件
- [插件包](/plugins/bundles) — Codex/Claude/Cursor 包兼容性
- [插件清单](/plugins/manifest) — 清单架构
- [注册工具](/plugins/building-plugins#registering-agent-tools) — 在插件中添加 agent 工具
- [插件内部机制](/plugins/architecture) — 能力模型和加载管线
- [社区插件](/plugins/community) — 第三方列表
