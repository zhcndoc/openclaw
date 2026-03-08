---
summary: "OpenClaw 插件/扩展：发现、配置与安全"
read_when:
  - 添加或修改插件/扩展时
  - 记录插件安装或加载规则时
title: "插件"
---

# 插件（扩展）

## 快速入门（插件新手？）

插件只是一个 **小型代码模块**，用来为 OpenClaw 扩展额外功能（命令、工具和 Gateway RPC）。

大多数情况下，当你想要核心 OpenClaw 还未内置的功能（或者想将可选功能从主安装中剥离）时，会用到插件。

快速路径：

1. 查看已有插件：

```bash
openclaw plugins list
```

2. 安装官方插件（示例：语音通话）：

```bash
openclaw plugins install @openclaw/voice-call
```

Npm 规范仅支持 **注册表包名 + 可选精确版本或分发标签**。Git/URL/文件规范和语义版本范围均不支持。

裸规范和 `@latest` 保持在稳定版本轨道。如果 npm 解析为预发布版本，OpenClaw 会停止安装并要求你显式选择预发布标签，如 `@beta` / `@rc`，或指定精确预发布版本以确认。

3. 重启 Gateway，然后在 `plugins.entries.<id>.config` 下配置。

具体示例请见 [语音通话](/plugins/voice-call) 插件。
寻找第三方插件？请参考 [社区插件](/plugins/community)。

## 可用插件（官方）

- Microsoft Teams 从 2026.1.15 版起仅提供插件形式；若使用 Teams，请安装 `@openclaw/msteams`。
- Memory（Core）— 内置内存检索插件（默认启用，通过 `plugins.slots.memory`）
- Memory（LanceDB）— 内置长期记忆插件（自动回忆/捕获，配置 `plugins.slots.memory = "memory-lancedb"`）
- [语音通话](/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo Personal](/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/channels/matrix) — `@openclaw/matrix`
- [Nostr](/channels/nostr) — `@openclaw/nostr`
- [Zalo](/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/channels/msteams) — `@openclaw/msteams`
- Google Antigravity OAuth（供应商认证）— 内置为 `google-antigravity-auth`（默认关闭）
- Gemini CLI OAuth（供应商认证）— 内置为 `google-gemini-cli-auth`（默认关闭）
- Qwen OAuth（供应商认证）— 内置为 `qwen-portal-auth`（默认关闭）
- Copilot Proxy（供应商认证）— 本地 VS Code Copilot Proxy 桥，区别于内置的 `github-copilot` 设备登录（内置，默认关闭）

OpenClaw 插件是 **TypeScript 模块**，在运行时通过 jiti 加载。**配置校验不会执行插件代码**，而是使用插件清单和 JSON Schema。详见 [插件清单](/plugins/manifest)。

插件可注册：

- Gateway RPC 方法
- Gateway HTTP 路由
- 代理工具
- CLI 命令
- 后台服务
- Context 引擎
- 可选配置校验
- **技能**（通过插件清单列出 `skills` 目录）
- **自动回复命令**（无需调用 AI 代理即可执行）

插件与 Gateway 同进程运行，视为受信任代码。
工具编写指南： [插件代理工具](/plugins/agent-tools)。

## 运行时助手

插件可通过 `api.runtime` 访问核心助手。示例：电话文本转语音（TTS）：

```ts
const result = await api.runtime.tts.textToSpeechTelephony({
  text: "Hello from OpenClaw",
  cfg: api.config,
});
```

注意：

- 使用核心 `messages.tts` 配置（OpenAI 或 ElevenLabs）。
- 返回 PCM 音频缓冲和采样率。插件必须为不同提供商重新采样/编码。
- 电话未支持 Edge TTS。

语音转文本/转录调用示例：

```ts
const { text } = await api.runtime.stt.transcribeAudioFile({
  filePath: "/tmp/inbound-audio.ogg",
  cfg: api.config,
  // MIME 类型无法可靠推断时可选：
  mime: "audio/ogg",
});
```

注意：

- 使用核心媒体理解音频配置（`tools.media.audio`）及提供者顺序。
- 无转录输出时，返回 `{ text: undefined }`（例如跳过或不支持的输入）。

## Gateway HTTP 路由

插件可通过 `api.registerHttpRoute(...)` 暴露 HTTP 端点。

```ts
api.registerHttpRoute({
  path: "/acme/webhook",
  auth: "plugin",
  match: "exact",
  handler: async (_req, res) => {
    res.statusCode = 200;
    res.end("ok");
    return true;
  },
});
```

路由字段：

- `path`：在 Gateway HTTP 服务下的路由路径。
- `auth`：必需。用 `"gateway"` 表示需正常网关认证，用 `"plugin"` 表示插件管理认证/Webhook 验证。
- `match`：可选。`"exact"`（默认）或 `"prefix"`。
- `replaceExisting`：可选。允许同插件替换自身已注册路由。
- `handler`：处理请求后返回 `true` 代表成功处理。

备注：

- `api.registerHttpHandler(...)` 已废弃，请用 `api.registerHttpRoute(...)`。
- 插件路由必须显式声明 `auth`。
- 完全匹配的 `path + match` 冲突会拒绝，除非 `replaceExisting: true`，且插件不可替换另一插件的路由。
- 不同认证级别的交叠路由被拒绝。保持 `exact` / `prefix` 匹配链仅在相同认证级别。

## 插件 SDK 导入路径

开发插件时，请使用 SDK 子路径替代庞大的 `openclaw/plugin-sdk` 导入：

- `openclaw/plugin-sdk/core`：通用插件 API、供应商认证类型和共享助手。
- `openclaw/plugin-sdk/compat`：内置/打包插件代码，需比 `core` 更多共享运行时助手。
- `openclaw/plugin-sdk/telegram`：Telegram 频道插件。
- `openclaw/plugin-sdk/discord`：Discord 频道插件。
- `openclaw/plugin-sdk/slack`：Slack 频道插件。
- `openclaw/plugin-sdk/signal`：Signal 频道插件。
- `openclaw/plugin-sdk/imessage`：iMessage 频道插件。
- `openclaw/plugin-sdk/whatsapp`：WhatsApp 频道插件。
- `openclaw/plugin-sdk/line`：LINE 频道插件。
- `openclaw/plugin-sdk/msteams`：内置 Microsoft Teams 插件界面。
- 还有其它打包扩展专用子路径，如：
  `openclaw/plugin-sdk/acpx`、`openclaw/plugin-sdk/bluebubbles`、
  `openclaw/plugin-sdk/copilot-proxy`、`openclaw/plugin-sdk/device-pair`、
  `openclaw/plugin-sdk/diagnostics-otel`、`openclaw/plugin-sdk/diffs`、
  `openclaw/plugin-sdk/feishu`、
  `openclaw/plugin-sdk/google-gemini-cli-auth`、`openclaw/plugin-sdk/googlechat`、
  `openclaw/plugin-sdk/irc`、`openclaw/plugin-sdk/llm-task`、
  `openclaw/plugin-sdk/lobster`、`openclaw/plugin-sdk/matrix`、
  `openclaw/plugin-sdk/mattermost`、`openclaw/plugin-sdk/memory-core`、
  `openclaw/plugin-sdk/memory-lancedb`、
  `openclaw/plugin-sdk/minimax-portal-auth`、
  `openclaw/plugin-sdk/nextcloud-talk`、`openclaw/plugin-sdk/nostr`、
  `openclaw/plugin-sdk/open-prose`、`openclaw/plugin-sdk/phone-control`、
  `openclaw/plugin-sdk/qwen-portal-auth`、`openclaw/plugin-sdk/synology-chat`、
  `openclaw/plugin-sdk/talk-voice`、`openclaw/plugin-sdk/test-utils`、
  `openclaw/plugin-sdk/thread-ownership`、`openclaw/plugin-sdk/tlon`、
  `openclaw/plugin-sdk/twitch`、`openclaw/plugin-sdk/voice-call`、
  `openclaw/plugin-sdk/zalo` 和 `openclaw/plugin-sdk/zalouser`。

兼容性提示：

- `openclaw/plugin-sdk` 仍支持现有外部插件。
- 新插件或迁移插件应使用频道或扩展专用子路径；通用界面用 `core`，仅当需要更广共享助手时使用 `compat`。

## 只读频道检查

如果插件注册了频道，建议实现 `plugin.config.inspectAccount(cfg, accountId)`，与 `resolveAccount(...)` 配合使用。

为什么？

- `resolveAccount(...)` 是运行路径，允许假设凭证已完整并在缺失时快速失败。
- 诸如 `openclaw status`、`openclaw channels status` 等只读命令不应强制物化凭证，仅用于描述配置。

推荐 `inspectAccount(...)` 行为：

- 仅返回描述性账户状态。
- 保留 `enabled` 和 `configured` 字段。
- 包含相关的凭证来源/状态字段，如：
  - `tokenSource`、`tokenStatus`
  - `botTokenSource`、`botTokenStatus`
  - `appTokenSource`、`appTokenStatus`
  - `signingSecretSource`、`signingSecretStatus`
- 无需返回原始 token 值，只报告读可用即可。如报告 `tokenStatus: "available"` 及对应来源字段，足够用在状态命令。
- 对于通过 SecretRef 配置但当前路径不可用的凭证，应使用 `configured_unavailable`。

这样，读只命令便可报告“已配置但当前路径不可用”，避免崩溃或误报未配置。

性能提示：

- 插件发现和清单元数据使用短期进程内缓存，减轻启动/重载压力。
- 通过环境变量 `OPENCLAW_DISABLE_PLUGIN_DISCOVERY_CACHE=1` 或 `OPENCLAW_DISABLE_PLUGIN_MANIFEST_CACHE=1` 可禁用缓存。
- 使用 `OPENCLAW_PLUGIN_DISCOVERY_CACHE_MS` 和 `OPENCLAW_PLUGIN_MANIFEST_CACHE_MS` 调整缓存时间。

## 发现与优先级

OpenClaw 依次扫描：

1. 配置路径

- `plugins.load.paths`（文件或目录）

2. 工作区扩展

- `<workspace>/.openclaw/extensions/*.ts`
- `<workspace>/.openclaw/extensions/*/index.ts`

3. 全局扩展

- `~/.openclaw/extensions/*.ts`
- `~/.openclaw/extensions/*/index.ts`

4. 内置扩展（随 OpenClaw 发布，大部分默认禁用）

- `<openclaw>/extensions/*`

大多数内置插件须显式启用，方式：

- 通过 `plugins.entries.<id>.enabled`
- 或用命令 `openclaw plugins enable <id>`

默认启用的内置插件例外：

- `device-pair`
- `phone-control`
- `talk-voice`
- 活动内存槽插件（默认槽位：`memory-core`）

安装的插件默认启用，也可用同样方式禁用。

安全加固提示：

- 当 `plugins.allow` 为空且可发现非内置插件时，OpenClaw 会在启动时记录插件 id 与来源的警告。
- 候选路径在通过发现前会进行安全检查。OpenClaw 会阻止候选路径，当：
  - 扩展入口解析出插件根目录外（包括符号链接/路径穿越）
  - 插件根目录或源码路径具有全员写权限
  - （非内置插件）路径所有权异常（POSIX 所有者既不是当前用户 uid 也不是 root）
- 加载的非内置插件若无安装/加载路径信息，会发出警告，方便用 `plugins.allow` 固定信任或 `plugins.installs` 跟踪安装。

每个插件根目录必须包含 `openclaw.plugin.json` 文件。若路径指向文件，插件根是该文件所在目录，必须包含清单。

若多个插件拥有相同 id，排序中第一个匹配被采纳，低优先拷贝被忽略。

### 包装包（Package Packs）

插件目录可包含带 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"]
  }
}
```

条目各自成为插件。若有多个扩展，插件 id 形如 `name/<fileBase>`。

插件依赖请在该目录安装，以保证 `node_modules` 可用（运行 `npm install` 或 `pnpm install`）。

安全防护：每个 `openclaw.extensions` 条目解析后必须在插件目录内，拒绝目录外条目。

安全提示：`openclaw plugins install` 安装依赖时，会使用 `npm install --ignore-scripts` （无生命周期脚本）。请保证依赖树只含“纯 JS/TS”，避免需 `postinstall` 构建的包。

### 频道目录元数据

频道插件可通过 `openclaw.channel` 宣传接入元数据，`openclaw.install` 提供安装提示，保持核心无需目录数据。

示例：

```json
{
  "name": "@openclaw/nextcloud-talk",
  "openclaw": {
    "extensions": ["./index.ts"],
    "channel": {
      "id": "nextcloud-talk",
      "label": "Nextcloud Talk",
      "selectionLabel": "Nextcloud Talk (自托管)",
      "docsPath": "/channels/nextcloud-talk",
      "docsLabel": "nextcloud-talk",
      "blurb": "通过 Nextcloud Talk Webhook 机器人的自托管聊天。",
      "order": 65,
      "aliases": ["nc-talk", "nc"]
    },
    "install": {
      "npmSpec": "@openclaw/nextcloud-talk",
      "localPath": "extensions/nextcloud-talk",
      "defaultChoice": "npm"
    }
  }
}
```

OpenClaw 也可合并 **外部频道目录**（如 MPM 注册表导出），可将 JSON 文件放于：

- `~/.openclaw/mpm/plugins.json`
- `~/.openclaw/mpm/catalog.json`
- `~/.openclaw/plugins/catalog.json`

或使用环境变量 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`） 指向一个或多个 JSON 文件（逗号/分号/路径分隔）。文件内容应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 id：

- 包装包：取 `package.json` 中的 `name`
- 独立文件：用文件名（例如 `~/.../voice-call.ts` → `voice-call`）

若插件导出 `id`，OpenClaw 使用该 id，但若与配置 id 不符会输出警告。

## 配置

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    deny: ["untrusted-plugin"],
    load: { paths: ["~/Projects/oss/voice-call-extension"] },
    entries: {
      "voice-call": { enabled: true, config: { provider: "twilio" } },
    },
  },
}
```

字段说明：

- `enabled`：总开关（默认启用）
- `allow`：允许列表（可选）
- `deny`：拒绝列表（可选，拒绝优先）
- `load.paths`：额外插件文件/目录
- `slots`：独占槽选择器，如 `memory` 和 `contextEngine`
- `entries.<id>`：单插件开关及配置

配置改动 **需要重启网关**。

严格校验规则：

- `entries`、`allow`、`deny` 或 `slots` 中出现未知插件 id 视为 **错误**。
- 未知 `channels.<id>` 键视为错误，除非插件清单声明了对应频道 id。
- 插件配置使用 `openclaw.plugin.json` 中的 JSON Schema (`configSchema`) 进行校验。
- 插件被禁用时，配置会保存，并发出 **警告**。

## 插件槽（独占分类）

部分插件分类是 **独占性的**（同一时刻仅能启用一个）。可用
`plugins.slots` 配置选择哪个插件拥有槽位：

```json5
{
  plugins: {
    slots: {
      memory: "memory-core", // 或用 "none" 禁用内存插件
      contextEngine: "legacy", // 或插件 id，如 "lossless-claw"
    },
  },
}
```

支持的独占槽：

- `memory`：活动内存插件（`"none"` 禁用内存插件）
- `contextEngine`：活动上下文引擎插件（`"legacy"` 是内置默认）

如果多个插件声明 `kind: "memory"` 或 `kind: "context-engine"`，仅加载被选中的槽位插件，其他禁用并生成诊断。

### 上下文引擎插件

上下文引擎插件负责会话上下文的摄取、组装和压缩。可通过插件中调用 `api.registerContextEngine(id, factory)` 注册，然后通过配置 `plugins.slots.contextEngine` 选择激活引擎。

当插件需要替换或扩展默认上下文管线，而不仅仅是添加内存搜索或钩子时，使用此功能。

示例：

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

配置启用：

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## 控制界面（schema + 标签）

控制界面通过 `config.schema`（JSON Schema + `uiHints`）渲染更优表单。

OpenClaw 会在运行时基于发现的插件增强 `uiHints`：

- 为 `plugins.entries.<id>` / `.enabled` / `.config` 添加插件标签
- 合并插件可选的配置字段提示，路径如：
  `plugins.entries.<id>.config.<field>`

若想让插件配置字段显示友好标签/占位符（敏感字段标记为机密），在插件清单里 JSON Schema 附带 `uiHints`。

示例：

```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiKey": { "type": "string" },
      "region": { "type": "string" }
    }
  },
  "uiHints": {
    "apiKey": { "label": "API 密钥", "sensitive": true },
    "region": { "label": "区域", "placeholder": "us-east-1" }
  }
}
```

## CLI

```bash
openclaw plugins list
openclaw plugins info <id>
openclaw plugins install <path>                 # 复制本地文件/目录到 ~/.openclaw/extensions/<id>
openclaw plugins install ./extensions/voice-call # 支持相对路径
openclaw plugins install ./plugin.tgz           # 从本地 tarball 安装
openclaw plugins install ./plugin.zip           # 从本地 zip 安装
openclaw plugins install -l ./extensions/voice-call # 链接安装（无复制）用于开发
openclaw plugins install @openclaw/voice-call # 从 npm 安装
openclaw plugins install @openclaw/voice-call --pin # 保存精确版本号
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`plugins update` 仅对由 `plugins.installs` 跟踪的 npm 安装有效。
当完整性元数据变化时，更新时会发出警告并请求确认（全局 `--yes` 参数可跳过确认）。

插件也可注册自己的顶层命令（示例：`openclaw voicecall`）。

## 插件 API（概览）

插件导出可为：

- 函数：`(api) => { ... }`
- 对象：`{ id, name, configSchema, register(api) { ... } }`

Context 引擎插件亦可注册运行时拥有的上下文管理器：

```ts
export default function (api) {
  api.registerContextEngine("lossless-claw", () => ({
    info: { id: "lossless-claw", name: "Lossless Claw", ownsCompaction: true },
    async ingest() {
      return { ingested: true };
    },
    async assemble({ messages }) {
      return { messages, estimatedTokens: 0 };
    },
    async compact() {
      return { ok: true, compacted: false };
    },
  }));
}
```

然后在配置中启用：

```json5
{
  plugins: {
    slots: {
      contextEngine: "lossless-claw",
    },
  },
}
```

## 插件钩子

插件可在运行时注册钩子，实现事件驱动自动化，无需单独安装钩包。

### 示例

```ts
export default function register(api) {
  api.registerHook(
    "command:new",
    async () => {
      // 钩子逻辑
    },
    {
      name: "my-plugin.command-new",
      description: "调用 /new 时执行",
    },
  );
}
```

备注：

- 用 `api.registerHook(...)` 显式注册钩子。
- 钩子生效受限于资格规则（操作系统/二进制/环境/配置条件）。
- 插件管理的钩子会出现在 `openclaw hooks list`，标记为 `plugin:<id>`。
- 不能通过 `openclaw hooks` 启用/禁用插件钩子，只能启用/禁用插件本身。

### 代理生命周期钩子 (`api.on`)

使用 `api.on(...)` 订阅强类型运行时生命周期钩子：

```ts
export default function register(api) {
  api.on(
    "before_prompt_build",
    (event, ctx) => {
      return {
        prependSystemContext: "遵循公司风格指南。",
      };
    },
    { priority: 10 },
  );
}
```

构建提示的重要钩子：

- `before_model_resolve`：会话载入前调用（`messages` 尚不可用），可确定性覆盖 `modelOverride` 或 `providerOverride`。
- `before_prompt_build`：会话载入后调用（`messages` 可用），用于调整提示输入。
- `before_agent_start`：旧兼容钩，建议优先使用上述两个。

核心钩子策略：

- 管理员可用 `plugins.entries.<id>.hooks.allowPromptInjection: false` 禁用插件的提示注入钩。
- 禁用时，OpenClaw 会阻止 `before_prompt_build` 钩执行并忽略旧钩返回的提示变更字段，但保留旧的模型/供应商覆盖字段。

`before_prompt_build` 返回字段：

- `prependContext`：本轮对用户提示前置文本，适合动态或特定回合内容。
- `systemPrompt`：替换完整系统提示。
- `prependSystemContext`：在当前系统提示前添加文本。
- `appendSystemContext`：在当前系统提示后添加文本。

内嵌运行时提示构建顺序：

1. 用户提示先应用 `prependContext`。
2. 若提供，应用 `systemPrompt` 覆盖。
3. 应用 `prependSystemContext + 当前系统提示 + appendSystemContext`。

合并与优先顺序：

- 钩子以优先级从高到低顺序执行。
- 合并字段时，按执行顺序连接值。
- `before_prompt_build` 的值先于旧的 `before_agent_start` 备选应用。

迁移建议：

- 静态指导信息由 `prependContext` 移至 `prependSystemContext` 或 `appendSystemContext`，方便供应商缓存稳定系统上下文。
- `prependContext` 保留给每轮动态上下文，与用户输入捆绑。

## 供应商插件（模型认证）

插件可注册 **模型供应商认证** 流程，支持在 OpenClaw 内完成 OAuth 或 API Key 配置，无需外部脚本。

通过 `api.registerProvider(...)` 注册供应商。每个供应商可提供一个或多个认证方式（OAuth、API Key、设备码等），用于：

- `openclaw models auth login --provider <id> [--method <id>]`

示例：

```ts
api.registerProvider({
  id: "acme",
  label: "AcmeAI",
  auth: [
    {
      id: "oauth",
      label: "OAuth",
      kind: "oauth",
      run: async (ctx) => {
        // 运行 OAuth 流程并返回认证配置
        return {
          profiles: [
            {
              profileId: "acme:default",
              credential: {
                type: "oauth",
                provider: "acme",
                access: "...",
                refresh: "...",
                expires: Date.now() + 3600 * 1000,
              },
            },
          ],
          defaultModel: "acme/opus-1",
        };
      },
    },
  ],
});
```

说明：

- `run` 接收 `ProviderAuthContext`，含有 `prompter`、`runtime`、`openUrl` 和 `oauth.createVpsAwareHandlers` 等辅助。
- 如需添加默认模型或供应商配置，返回 `configPatch`。
- 返回 `defaultModel` 可让 `--set-default` 设置代理默认。

### 注册消息频道

插件可注册 **频道插件**，功能类似内置频道（WhatsApp、Telegram 等）。频道配置存于 `channels.<id>`，由频道插件负责校验。

示例：

```ts
const myChannel = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "演示频道插件。",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async () => ({ ok: true }),
  },
};

export default function (api) {
  api.registerChannel({ plugin: myChannel });
}
```

备注：

- 配置应放在 `channels.<id>` 下，不是 `plugins.entries`。
- `meta.label` 用于 CLI/UI 列表标签。
- `meta.aliases` 添加别名，用于规范和 CLI 输入。
- `meta.preferOver` 列出要覆盖的频道 id，双配置时自动启用偏好本插件。
- `meta.detailLabel` 与 `meta.systemImage` 可让 UI 显示更丰富标签和图标。

### 频道接入钩子

频道插件可以在 `plugin.onboarding` 定义可选接入钩：

- `configure(ctx)`：基本设置流程。
- `configureInteractive(ctx)`：全面接管交互式配置（支持已配置和未配置状态）。
- `configureWhenConfigured(ctx)`：仅覆写已配置频道的行为。

向导钩子优先级：

1. `configureInteractive`（存在时）
2. `configureWhenConfigured`（仅频道已配置时）
3. fallback 到 `configure`

上下文细节：

- `configureInteractive` 与 `configureWhenConfigured` 接收：
  - `configured`（布尔）
  - `label`（用于提示的频道名）
  - 以及共享的配置/运行时/提示器/选项字段
- 返回 `"skip"` 表示跳过修改，保留选择和账户追踪。
- 返回 `{ cfg, accountId? }` 表示应用配置更新并记录账户选择。

### 编写新消息频道（分步）

针对想新增 **聊天界面**（“消息频道”），非模型供应商。模型供应商文档位于 `/providers/*`。

1. 选择 id 和配置结构

- 所有频道配置置于 `channels.<id>`。
- 多账户时首选 `channels.<id>.accounts.<accountId>`。

2. 定义频道元数据

- `meta.label`、`meta.selectionLabel`、`meta.docsPath`、`meta.blurb` 控制 CLI/UI 列表显示。
- `meta.docsPath` 应指向相应文档页（如 `/channels/<id>`）。
- `meta.preferOver` 允许插件替代另一个频道（自动启用优先规则）。
- `meta.detailLabel` 和 `meta.systemImage` 用于 UI 显示细节文本和图标。

3. 实现必要适配器

- `config.listAccountIds`
- `config.resolveAccount`
- `capabilities`（聊天类型、媒体、线程等）
- `outbound.deliveryMode` 和 `outbound.sendText`（基础发送）

4. 根据需要添加可选适配器

- `setup`（向导）、`security`（私信策略）、`status`（健康/诊断）
- `gateway`（启动/停止/登录）、`mentions`、`threading`、`streaming`
- `actions`（消息操作）、`commands`（原生命令行为）

5. 在插件内注册频道

- `api.registerChannel({ plugin })`

最简配置示例：

```json5
{
  channels: {
    acmechat: {
      accounts: {
        default: { token: "ACME_TOKEN", enabled: true },
      },
    },
  },
}
```

最简频道插件（仅出站）：

```ts
const plugin = {
  id: "acmechat",
  meta: {
    id: "acmechat",
    label: "AcmeChat",
    selectionLabel: "AcmeChat (API)",
    docsPath: "/channels/acmechat",
    blurb: "AcmeChat 消息频道。",
    aliases: ["acme"],
  },
  capabilities: { chatTypes: ["direct"] },
  config: {
    listAccountIds: (cfg) => Object.keys(cfg.channels?.acmechat?.accounts ?? {}),
    resolveAccount: (cfg, accountId) =>
      cfg.channels?.acmechat?.accounts?.[accountId ?? "default"] ?? {
        accountId,
      },
  },
  outbound: {
    deliveryMode: "direct",
    sendText: async ({ text }) => {
      // 在此处将 `text` 发送至频道
      return { ok: true };
    },
  },
};

export default function (api) {
  api.registerChannel({ plugin });
}
```

加载插件（放入扩展目录或通过 `plugins.load.paths`），重启 gateway，再在配置中设置 `channels.<id>`。

### 代理工具

详见专门指南：[插件代理工具](/plugins/agent-tools)。

### 注册 Gateway RPC 方法

```ts
export default function (api) {
  api.registerGatewayMethod("myplugin.status", ({ respond }) => {
    respond(true, { ok: true });
  });
}
```

### 注册 CLI 命令

```ts
export default function (api) {
  api.registerCli(
    ({ program }) => {
      program.command("mycmd").action(() => {
        console.log("Hello");
      });
    },
    { commands: ["mycmd"] },
  );
}
```

### 注册自动回复命令

插件可注册自定义斜杠命令，可 **无需调用 AI 代理即可执行**。适合切换命令、状态检查和不需 LLM 处理的快捷操作。

```ts
export default function (api) {
  api.registerCommand({
    name: "mystatus",
    description: "显示插件状态",
    handler: (ctx) => ({
      text: `插件正在运行！频道：${ctx.channel}`,
    }),
  });
}
```

命令处理上下文：

- `senderId`：发件人 ID（若可用）
- `channel`：命令所在频道
- `isAuthorizedSender`：发件人是否被授权
- `args`：命令参数（若 `acceptsArgs: true`）
- `commandBody`：完整命令文本
- `config`：当前 OpenClaw 配置

命令选项：

- `name`：命令名（不含前导 `/`）
- `nativeNames`：可选的本地命令别名，用于斜杠菜单界面。可使用 `default` 表示所有本地提供商，或指定特定提供商如 `discord`
- `description`：命令列表帮助文本
- `acceptsArgs`：是否接受参数（默认 false），如果为 false 且带参数，则消息不会匹配，落到其他处理器
- `requireAuth`：是否需要授权发送者（默认 true）
- `handler`：返回 `{ text: string }` 的函数（可异步）

示例（带授权和参数）：

```ts
api.registerCommand({
  name: "setmode",
  description: "设置插件模式",
  acceptsArgs: true,
  requireAuth: true,
  handler: async (ctx) => {
    const mode = ctx.args?.trim() || "default";
    await saveMode(mode);
    return { text: `模式已设为：${mode}` };
  },
});
```

备注：

- 插件命令在内置命令和 AI 代理之前处理。
- 命令注册全局有效，跨所有频道可用。
- 命令不区分大小写（`/MyStatus` 等同 `/mystatus`）。
- 命令名须以字母开头，仅含字母、数字、连字符和下划线。
- 保留命令（如 `help`、`status`、`reset` 等）无法被插件覆盖。
- 插件间命令名冲突注册失败，会生成诊断错误。

### 注册后台服务

```ts
export default function (api) {
  api.registerService({
    id: "my-service",
    start: () => api.logger.info("准备就绪"),
    stop: () => api.logger.info("告别"),
  });
}
```

## 命名规范

- Gateway 方法：`pluginId.action`（如 `voicecall.status`）
- 工具：snake_case（如 `voice_call`）
- CLI 命令：kebab 或 camel，避免与核心命令冲突

## 技能

插件可携带技能至仓库（`skills/<name>/SKILL.md`）。
通过 `plugins.entries.<id>.enabled`（或其他配置门槛）启用，确保存在于工作区/管理技能路径。

## 分发（npm）

推荐打包形式：

- 主包：`openclaw`（本仓库）
- 插件：单独 npm 包，命名空间为 `@openclaw/*`（示例：`@openclaw/voice-call`）

发布约定：

- 插件 `package.json` 必须包含 `openclaw.extensions`，列出一个或多个入口文件。
- 入口文件可为 `.js` 或 `.ts`（jiti 运行时支持加载 TS）。
- `openclaw plugins install <npm-spec>` 会调用 `npm pack`，解压至 `~/.openclaw/extensions/<id>/` 并在配置中启用。
- 配置键稳定性：命名空间包会被归一化为无命名空间 id 用于 `plugins.entries.*`。

## 示例插件：语音通话

本仓库包含语音通话插件（支持 Twilio 或日志回退）：

- 源码：`extensions/voice-call`
- 技能：`skills/voice-call`
- CLI 命令：`openclaw voicecall start|status`
- 工具：`voice_call`
- RPC：`voicecall.start`，`voicecall.status`
- 配置（Twilio）：`provider: "twilio"` + `twilio.accountSid/authToken/from`（可选 `statusCallbackUrl`、`twimlUrl`）
- 配置（开发）：`provider: "log"`（无网络）

详见 [语音通话](/plugins/voice-call) 及 `extensions/voice-call/README.md` 使用说明。

## 安全提示

插件与 Gateway 同进程运行，应视为受信任代码：

- 仅安装你信任的插件。
- 优先使用 `plugins.allow` 白名单。
- 变更后请重启 Gateway。

## 插件测试

插件可以（且应当）带测例：

- 仓库内插件可在 `src/**` 下保持 Vitest 测试（示例：`src/plugins/voice-call.plugin.test.ts`）。
- 独立发布插件需运行自建 CI（lint/build/test），并确保 `openclaw.extensions` 指向构建入口（`dist/index.js`）。
