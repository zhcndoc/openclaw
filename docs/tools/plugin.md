---
summary: "安装、配置和管理 OpenClaw 插件"
read_when:
  - 安装或配置插件
  - 了解插件发现和加载规则
  - 使用与 Codex/Claude 兼容的插件包
title: "插件"
sidebarTitle: "安装和配置"
---

插件为 OpenClaw 扩展了新能力：频道、模型提供方、
代理程序支架、工具、技能、语音、实时转写、实时
语音、媒体理解、图像生成、视频生成、网页抓取、网页
搜索等。部分插件是 **核心**（随 OpenClaw 一起发布），其余
是 **外部**。大多数外部插件通过
[ClawHub](/clawhub) 发布和发现。npm 仍然支持直接安装，以及在
OpenClaw 自有插件包完成迁移之前的一组临时插件包。

## 快速开始

用于复制粘贴的安装、列出、卸载、更新和发布示例，请参见
[管理插件](/plugins/manage-plugins)。

<Steps>
  <Step title="查看已加载内容">
    ```bash
    openclaw plugins list
    ```
  </Step>

  <Step title="安装插件">
    ```bash
    # 搜索 ClawHub 插件
    openclaw plugins search "calendar"

    # 来自 ClawHub
    openclaw plugins install clawhub:openclaw-codex-app-server

    # 来自 npm
    openclaw plugins install npm:@acme/openclaw-plugin
    openclaw plugins install npm-pack:./openclaw-plugin-1.2.3.tgz

    # 来自 git
    openclaw plugins install git:github.com/acme/openclaw-plugin@v1.0.0

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

  <Step title="聊天原生管理">
    在运行中的 Gateway 里，只有所有者可用的 `/plugins enable` 和 `/plugins disable`
    会触发 Gateway 配置重新加载。Gateway 会在进程内重新加载插件运行时
    相关表面，新代理轮次会从刷新后的注册表重新构建工具列表。
    `/plugins install` 会更改插件源代码，因此 Gateway 会请求重启，
    而不是假装当前进程能够安全地重新加载已经导入的模块。

  </Step>

  <Step title="验证插件">
    ```bash
    openclaw plugins inspect <plugin-id> --runtime --json

    # 如果插件注册了一个 CLI 根命令，从该根命令运行一个命令。
    openclaw <plugin-command> --help
    ```

    当你需要证明已注册的工具、服务、gateway 方法、hooks，或插件拥有的 CLI 命令时，请使用 `--runtime`。普通的 `inspect` 只是一次冷态的清单/注册表检查，并且刻意避免导入插件运行时。

  </Step>
</Steps>

如果你更喜欢通过聊天进行控制，请启用 `commands.plugins: true` 并使用：

```text
/plugin install clawhub:<package>
/plugin show <plugin-id>
/plugin enable <plugin-id>
```

安装路径使用与 CLI 相同的解析器：本地路径/归档、显式
`clawhub:<pkg>`、显式 `npm:<pkg>`、显式 `npm-pack:<path.tgz>`、
显式 `git:<repo>`，或通过 npm 的裸包规范。

如果配置无效，安装通常会直接失败，并指向
`openclaw doctor --fix`。唯一的恢复例外是一个狭窄的捆绑插件
重装路径，适用于选择加入
`openclaw.install.allowInvalidConfigRecovery` 的插件。
在 Gateway 启动期间，无效插件配置会像其他无效
配置一样直接失败。运行 `openclaw doctor --fix` 可以通过
禁用该插件条目并移除其无效配置载荷来隔离坏掉的插件配置；
正常的配置备份会保留之前的值。
当某个频道配置引用了一个不再可发现的插件，而
插件配置或安装记录中仍保留着相同的旧插件 id 时，Gateway 启动会
记录警告并跳过该频道，而不是阻塞其他所有频道。
运行 `openclaw doctor --fix` 可以移除这些陈旧的频道/插件条目；没有
陈旧插件证据的未知频道键仍然会失败校验，这样拼写错误仍然可见。
如果设置了 `plugins.enabled: false`，陈旧的插件引用会被视为无操作：
Gateway 启动会跳过插件发现/加载工作，而 `openclaw doctor` 会保留
已禁用的插件配置，而不会自动移除它。若你希望移除陈旧的插件 id，
请在运行 doctor 清理之前重新启用插件。

插件依赖安装只会在显式安装/更新或 doctor 修复流程期间发生。Gateway 启动、配置重新加载和运行时检查都不会运行包管理器或修复依赖树。本地插件必须已经安装好其依赖，而 npm、git 和 ClawHub 插件会安装在 OpenClaw 托管的插件根目录下。npm 依赖在 OpenClaw 托管的 npm 根目录中可能会被提升；安装/更新会在信任之前扫描该托管根目录，而卸载会通过 npm 移除由 npm 托管的包。外部插件和自定义加载路径仍然必须通过 `openclaw plugins install` 安装。
使用 `openclaw plugins list --json` 可查看每个可见插件静态的 `dependencyStatus`，而无需导入运行时代码或修复依赖。
有关安装时生命周期，请参见 [插件依赖解析](/plugins/dependency-resolution)。

### 被阻止的插件路径所有权

如果插件诊断提示 `blocked plugin candidate: suspicious ownership (... uid=1000, expected uid=0 or root)`
并且随后配置校验显示 `plugin present but blocked`，说明 OpenClaw 发现的插件
文件归属于与加载它们的进程不同的 Unix 用户。请保持插件配置不变；修复文件系统所有权，或以拥有状态目录的相同用户运行 OpenClaw。

对于 Docker 安装，官方镜像以 `node`（uid `1000`）运行，因此
宿主机绑定挂载的 OpenClaw 配置和工作区目录通常应归属于 uid `1000`：

```bash
sudo chown -R 1000:1000 /path/to/openclaw-config /path/to/openclaw-workspace
```

如果你有意将 OpenClaw 作为 root 运行，则改为修复受管理的插件根目录，
使其归属于 root：

```bash
sudo chown -R root:root /path/to/openclaw-config/npm
```

修复所有权后，重新运行 `openclaw doctor --fix` 或
`openclaw plugins registry --refresh`，以便持久化的插件注册表与
已修复的文件保持一致。

对于 npm 安装，`latest` 或 dist-tag 等可变选择器会在安装前解析，
然后在 OpenClaw 托管的 npm 根目录中固定到精确的已验证版本。npm 完成后，
OpenClaw 会验证已安装的 `package-lock.json` 条目仍与解析后的版本和完整性一致。
如果 npm 写入了不同的包元数据，安装将失败，并且受管理的包会被回滚，
而不是接受不同的插件制品。
受管理的 npm 根目录也会继承 OpenClaw 的包级 npm `overrides`，
因此保护打包宿主的安全固定同样适用于提升后的外部插件依赖。

源代码检出是 pnpm 工作区。如果你克隆 OpenClaw 来修改捆绑插件，请运行 `pnpm install`；OpenClaw 随后会从 `extensions/<id>` 加载捆绑插件，这样编辑和包本地依赖会被直接使用。
普通的 npm 根目录安装是用于打包后的 OpenClaw，而不是源代码检出的开发。

## 插件类型

OpenClaw 识别两种插件格式：

| 格式       | 工作方式                                                       | 示例                                                   |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| **Native** | `openclaw.plugin.json` + 运行时模块；在进程内执行              | 官方插件、社区 npm 包               |
| **Bundle** | 与 Codex/Claude/Cursor 兼容的布局；映射到 OpenClaw 功能 | `.codex-plugin/`、`.claude-plugin/`、`.cursor-plugin/` |

二者都会显示在 `openclaw plugins list` 中。有关捆绑包详情，请参见 [Plugin Bundles](/plugins/bundles)。

如果你正在编写原生插件，请从 [构建插件](/plugins/building-plugins)
和 [插件 SDK 概览](/plugins/sdk-overview) 开始。

## 包入口点

原生插件 npm 包必须在 `package.json` 中声明 `openclaw.extensions`。
每个条目都必须保留在包目录内，并解析到可读取的
运行时文件，或者解析到一个 TypeScript 源文件及其可推断的构建后 JavaScript
对应文件，例如 `src/index.ts` 对应 `dist/index.js`。
打包后的安装必须携带该 JavaScript 运行时输出。TypeScript
源代码回退适用于源代码检出和本地开发路径，而不是用于
安装到 OpenClaw 托管插件根目录中的 npm 包。

如果某个受管理的包警告说它 `requires compiled runtime output for
TypeScript entry ...`，则表示该包发布时没有包含 OpenClaw 运行时所需的 JavaScript 文件。
这是插件打包问题，不是本地配置问题。请在发布者重新发布编译后的
JavaScript 后更新或重新安装该插件，或者在修复版包可用之前禁用/卸载该插件。

当已发布的运行时文件不在与源入口相同的路径时，请使用 `openclaw.runtimeExtensions`。如果存在，`runtimeExtensions` 必须为每个 `extensions` 条目恰好包含一个条目。不匹配的列表会导致安装和插件发现失败，而不是静默回退到源路径。如果你还发布了 `openclaw.setupEntry`，请为其构建后的
JavaScript 对应文件使用 `openclaw.runtimeSetupEntry`；当声明时，该文件是必需的。

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

  <Accordion title="Memory plugins">
    - `memory-core` - 捆绑内存搜索（默认通过 `plugins.slots.memory`）
    - `memory-lancedb` - 基于 LanceDB 的长期记忆，带自动召回/捕获（设置 `plugins.slots.memory = "memory-lancedb"`）

    有关 OpenAI 兼容的
    embedding 设置、Ollama 示例、召回限制和故障排查，请参见 [Memory LanceDB](/plugins/memory-lancedb)。

  </Accordion>

  <Accordion title="语音提供方（默认启用）">
    `elevenlabs`, `microsoft`
  </Accordion>

  <Accordion title="Other">
    - `browser` - 浏览器工具、`openclaw browser` CLI、`browser.request` gateway 方法、浏览器运行时和默认浏览器控制服务所使用的捆绑浏览器插件（默认启用；在替换它之前请先禁用）
    - `copilot-proxy` - VS Code Copilot Proxy 桥接（默认禁用）

  </Accordion>
</AccordionGroup>

想查找第三方插件？请参见 [ClawHub](/clawhub)。

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

| Field              | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `enabled`          | 主开关（默认：`true`）                                    |
| `allow`            | 插件白名单（可选）                                         |
| `bundledDiscovery` | 打包插件发现模式（默认 `allowlist`）                      |
| `deny`             | 插件黑名单（可选；拒绝优先）                               |
| `load.paths`       | 额外的插件文件/目录                                        |
| `slots`            | 独占槽位选择器（例如 `memory`、`contextEngine`）          |
| `entries.\<id\>`   | 每个插件的开关 + 配置                                      |

`plugins.allow` 是排他性的。当它非空时，只有列表中的插件可以加载
或暴露工具，即使 `tools.allow` 包含 `"*"` 或某个特定的插件拥有
工具名称。如果某个工具允许列表引用了插件工具，请将所属插件 id 添加到
`plugins.allow`，或移除 `plugins.allow`；`openclaw doctor` 会对此形态发出警告。

`plugins.bundledDiscovery` 新配置默认值为 `"allowlist"`，因此
限制性的 `plugins.allow` 清单也会阻止被省略的内置提供器插件，
包括运行时 web-search 提供器的发现。Doctor 在迁移期间会将旧的、
限制性的 allowlist 配置标记为 `"compat"`，以便升级时继续保留
旧版内置提供器行为，直到操作者切换到更严格的模式。
空的 `plugins.allow` 仍会被视为未设置/开放。

通过 `/plugins enable` 或 `/plugins disable` 做出的配置变更会触发
进程内的 Gateway 插件重新加载。新的 agent 回合会从刷新后的插件注册表
重建其工具列表。安装、更新和卸载等会改变源码的操作仍然会重启 Gateway 进程，
因为已经导入的插件模块不能安全地原地替换。

`openclaw plugins list` 是本地插件注册表/配置快照。那里显示为
`enabled` 的插件表示持久化注册表和当前配置允许该插件参与。
这并不能证明已经运行的远程 Gateway 已经重新加载或重启到了相同的插件代码。在带有包装进程的 VPS/容器部署中，请将重启或触发重新加载的写操作发送到实际的 `openclaw gateway run` 进程，或者在重新加载报告失败时对正在运行的 Gateway 使用 `openclaw gateway restart`。

<Accordion title="插件状态：已禁用 vs 缺失 vs 无效">
  - **已禁用**：插件存在，但启用规则将其关闭。配置会被保留。
  - **缺失**：配置引用了一个发现未找到的插件 id。
  - **无效**：插件存在，但其配置不符合声明的模式。Gateway 启动只会跳过该插件；`openclaw doctor --fix` 可以通过禁用它并删除其配置负载来隔离该无效条目。

</Accordion>

## 发现与优先级

OpenClaw 按以下顺序扫描插件（先匹配者优先）：

<Steps>
  <Step title="Config paths">
    `plugins.load.paths` - 显式的文件或目录路径。指回 OpenClaw 自身打包的内置插件目录的路径会被忽略；
    运行 `openclaw doctor --fix` 可移除这些过期别名。
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
- `plugins.deny` 永远优先于 allow
- `plugins.entries.\<id\>.enabled: false` 会禁用该插件
- 工作区来源插件默认**禁用**（必须显式启用）
- 内置插件遵循内置默认开启集合，除非被覆盖
- 独占槽位可以强制为该槽位选定的插件启用
- 当配置命名了某个插件拥有的 surface 时，某些内置的可选插件会自动启用，例如提供器模型引用、channel 配置或 harness 运行时
- 当 `plugins.enabled: false` 处于活动状态时，会保留过期插件配置；如果你希望移除过期 id，请在运行 doctor 清理前重新启用插件
- OpenAI 系 Codex 路由保持独立的插件边界：
  `openai-codex/*` 属于 OpenAI 插件，而打包的 Codex
  app-server 插件则由规范化的 `openai/*` agent 引用、显式 provider/model `agentRuntime.id: "codex"`，
  或旧版 `codex/*` 模型引用来选定

## 运行时钩子排查

如果某个插件出现在 `plugins list` 中，但 `register(api)` 的副作用或钩子
没有在实时聊天流量中运行，请先检查以下内容：

- 运行 `openclaw gateway status --deep --require-rpc`，并确认当前活动的
  Gateway URL、profile、config path 和进程就是你正在编辑的那些。
- 在插件安装/配置/代码变更后重启正在运行的 Gateway。在包装容器中，PID 1 可能只是一个 supervisor；请重启或向子进程
  `openclaw gateway run` 发送信号。
- 使用 `openclaw plugins inspect <id> --runtime --json` 确认钩子注册和
  diagnostics。非打包的对话钩子，例如 `before_model_resolve`、
  `before_agent_reply`、`before_agent_run`、`llm_input`、`llm_output`、
  `before_agent_finalize` 和 `agent_end` 需要
  `plugins.entries.<id>.hooks.allowConversationAccess=true`。
- 对于模型切换，优先使用 `before_model_resolve`。它会在 agent 回合的
  模型解析之前运行；`llm_output` 只会在一次模型尝试产生 assistant 输出后运行。
- 若要证明会话实际使用的模型，请使用 `openclaw sessions` 或
  Gateway 的 session/status 界面，并且在调试提供器负载时，使用
  `--raw-stream --raw-stream-path <path>` 启动 Gateway。

### 慢速插件工具设置

如果 agent 回合在准备工具时似乎停滞，请启用 trace 日志并
检查插件工具工厂的耗时行：

```bash
openclaw config set logging.level trace
openclaw logs --follow
```

查找：

```text
[trace:plugin-tools] factory timings ...
```

摘要会列出总工厂耗时以及最慢的插件工具工厂，
包括 plugin id、声明的工具名、result 形状，以及该工具是否是
optional。当单个工厂耗时至少 1s，或插件工具工厂总准备耗时至少 5s 时，
慢速行会提升为 warning。

OpenClaw 会为使用相同有效请求上下文的重复解析缓存成功的插件工具工厂结果。缓存键包括有效的运行时配置、工作区、agent/session id、sandbox policy、浏览器设置、交付上下文、请求者身份以及所有权状态，因此依赖这些受信任字段的工厂会在上下文变化时重新运行。

如果某个插件在耗时上占主导，请检查其运行时注册：

```bash
openclaw plugins inspect <plugin-id> --runtime --json
```

然后更新、重新安装或禁用该插件。插件作者应将昂贵的依赖加载
放到工具执行路径之后，而不是放在工具工厂内部完成。

### 重复的 channel 或工具所有权

症状：

- `channel already registered: <channel-id> (<plugin-id>)`
- `channel setup already registered: <channel-id> (<plugin-id>)`
- `plugin tool name conflict (<plugin-id>): <tool-name>`

这些情况意味着不止一个已启用插件正在尝试拥有同一个 channel、
setup flow 或工具名。最常见的原因是某个外部 channel 插件安装在一个
现在也提供相同 channel id 的内置插件旁边。

调试步骤：

- 运行 `openclaw plugins list --enabled --verbose`，查看每个已启用插件
  及其来源。
- 针对每个可疑插件运行 `openclaw plugins inspect <id> --runtime --json`，并
  比较 `channels`、`channelConfigs`、`tools` 和 diagnostics。
- 在安装或移除插件包后运行 `openclaw plugins registry --refresh`，以便持久化元数据反映当前安装状态。
- 在安装、registry 或 config 变更后重启 Gateway。

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
openclaw plugins list                       # 精简清单
openclaw plugins list --enabled            # 仅显示已启用插件
openclaw plugins list --verbose            # 按插件显示详细行
openclaw plugins list --json               # 机器可读清单
openclaw plugins search <query>            # 搜索 ClawHub 插件目录
openclaw plugins inspect <id>              # 静态详情
openclaw plugins inspect <id> --runtime    # 已注册的钩子/工具/CLI/gateway 方法
openclaw plugins inspect <id> --json       # 机器可读
openclaw plugins inspect --all             # 全局表
openclaw plugins info <id>                 # inspect 别名
openclaw plugins doctor                    # 诊断
openclaw plugins registry                  # 检查持久化的 registry 状态
openclaw plugins registry --refresh        # 重建持久化 registry
openclaw doctor --fix                      # 修复插件 registry 状态

openclaw plugins install <package>         # 默认从 npm 安装
openclaw plugins install clawhub:<pkg>     # 仅从 ClawHub 安装
openclaw plugins install npm:<pkg>         # 仅从 npm 安装
openclaw plugins install git:<repo>        # 从 git 安装
openclaw plugins install git:<repo>@<ref>  # 从 git ref 安装
openclaw plugins install <spec> --force    # 覆盖现有安装
openclaw plugins install <path>            # 从本地路径安装
openclaw plugins install -l <path>         # 开发用链接（不复制）
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

# 安装后验证运行时注册。
openclaw plugins inspect <id> --runtime --json

# 直接从 OpenClaw 根 CLI 运行插件拥有的 CLI 命令。
openclaw <plugin-command> --help

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

OpenClaw 会将持久化的本地插件注册表作为插件清单、贡献所有权以及启动规划的冷读模型。install、update、
uninstall、enable 和 disable 流程在改变插件状态后会刷新该注册表。相同的 `plugins/installs.json` 文件会在顶层 `installRecords` 中保存持久化安装元数据，并在 `plugins` 中保存可重建的 manifest 元数据。如果注册表缺失、过期或无效，`openclaw plugins registry
--refresh` 会在不加载插件运行时模块的情况下，根据安装记录、配置策略和 manifest/package 元数据重建其 manifest 视图。

在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，插件生命周期变更器被禁用。
请改为通过该安装的 Nix 源来管理插件包选择和配置；对于 nix-openclaw，请从 agent-first 的
[Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) 开始。
`openclaw plugins update <id-or-npm-spec>` 适用于已跟踪的安装。传入带 dist-tag 或精确版本的 npm 包 spec 时，会将包名
解析回已跟踪的插件记录，并为后续更新记录新的 spec。仅传入包名而不带版本时，会将精确固定的安装移回
注册表的默认发布线。如果已安装的 npm 插件已经与解析出的版本和记录的 artifact 标识一致，OpenClaw 会跳过更新，
不会下载、重新安装或重写配置。
当 `openclaw update` 在 beta 通道上运行时，默认线的 npm 和 ClawHub
插件记录会先尝试 `@beta`，若不存在插件 beta 发布则回退到默认/latest。
精确版本和显式 tag 仍保持固定。

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
  name: "我的插件",
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
| `registerImageGenerationProvider`      | 图像生成            |
| `registerMusicGenerationProvider`      | 音乐生成            |
| `registerVideoGenerationProvider`      | 视频生成            |
| `registerWebFetchProvider`            | Web 获取 / 抓取提供方 |
| `registerWebSearchProvider`            | Web 搜索            |
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

- [Building plugins](/plugins/building-plugins) - 创建你自己的插件
- [Plugin bundles](/plugins/bundles) - Codex/Claude/Cursor 捆绑兼容性
- [Plugin manifest](/plugins/manifest) - 清单模式
- [Registering tools](/plugins/building-plugins#registering-agent-tools) - 在插件中添加 agent 工具
- [Plugin internals](/plugins/architecture) - 能力模型和加载管线
- [ClawHub](/clawhub) - 第三方插件发现
