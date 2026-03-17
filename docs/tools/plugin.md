---
summary: "OpenClaw 插件/扩展：发现、配置与安全"
read_when:
  - 添加或修改插件/扩展时
  - 记录插件安装或加载规则时
  - 使用兼容 Codex/Claude 的插件包时
title: "插件"
---

# 插件（扩展）

## 快速入门（插件新手？）

插件可以是：

- 原生的 **OpenClaw 插件**（`openclaw.plugin.json` + 运行时模块），或者
- 兼容的 **包**（`.codex-plugin/plugin.json` 或 `.claude-plugin/plugin.json`）

两者都会在 `openclaw plugins` 中显示，但只有原生 OpenClaw 插件会在进程内执行运行时代码。

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

请参阅 [语音通话](/plugins/voice-call) 了解具体示例插件。
寻找第三方插件列表？参见 [社区插件](/plugins/community)。
需要包兼容性详情？参见 [插件包](/plugins/bundles)。

对于兼容包，可以从本地目录或压缩包安装：

```bash
openclaw plugins install ./my-bundle
openclaw plugins install ./my-bundle.tgz
```

对于 Claude 市场安装，先列出市场，然后通过市场条目名安装：

```bash
openclaw plugins marketplace list <marketplace-name>
openclaw plugins install <plugin-name>@<marketplace-name>
```

OpenClaw 会从 `~/.claude/plugins/known_marketplaces.json` 解析已知 Claude 市场名。你也可以通过 `--marketplace` 显式传递市场来源。

## 可用插件（官方）

OpenClaw 的插件系统包含四个层面：

1. **清单与发现**  
   OpenClaw 从配置路径、工作区根目录、全局扩展根和内置扩展中找到候选插件。发现阶段优先读取原生的 `openclaw.plugin.json` 清单及支持的包清单。
2. **启用与验证**  
   核心决定发现的插件是启用、禁用、阻止，还是选入独占槽位，例如记忆槽。
3. **运行时加载**  
   原生 OpenClaw 插件通过 jiti 在进程内加载并注册能力到中央注册表。兼容包被规范化为注册表记录，但不导入运行时代码。
4. **接口使用**  
   OpenClaw 其余部分读取注册表以暴露工具、通道、提供商配置、钩子、HTTP 路由、CLI 命令及服务。

重要的设计边界：

- 发现与配置验证应当只依赖 **清单/模式元数据**，无需执行插件代码
- 原生运行时行为来自插件模块的 `register(api)` 路径

这种划分让 OpenClaw 在完整运行时激活前，能验证配置、解释缺失/禁用插件，并构建 UI/模式提示。

## 兼容包

OpenClaw 还识别两种兼容的外部包结构：

- Codex 风格包：`.codex-plugin/plugin.json`
- Claude 风格包：`.claude-plugin/plugin.json` 或默认 Claude 组件布局，无需清单
- Cursor 风格包：`.cursor-plugin/plugin.json`

Claude 市场条目可指向任意这些兼容包，也可指向原生 OpenClaw 插件源。OpenClaw 先解析市场条目，然后执行正常安装流程。

它们在插件列表中显示为 `format=bundle`，详细输出中子类型为 `codex` 或 `claude`。

详见 [插件包](/plugins/bundles) 了解精准的检测规则、映射行为和支持矩阵。

目前，OpenClaw 将这些视为 **能力包**，而非原生运行时插件：

- 当前支持：打包的 `skills`
- 当前支持：Claude `commands/` Markdown 根目录，映射到普通 OpenClaw 技能加载器
- 当前支持：Claude 包中的 `settings.json` 默认为嵌入式 Pi 代理设置（对 shell 覆盖键进行了清理）
- 当前支持：Cursor `.cursor/commands/*.md` 根目录，映射到普通 OpenClaw 技能加载器
- 当前支持：Codex 包的钩子目录，使用 OpenClaw 钩子包布局（`HOOK.md` + `handler.ts`/`handler.js`）
- 已检测但尚未绑定：声明的其他包能力，如代理、Claude 钩子自动化、Cursor 规则/钩子/MCP 元数据、MCP/app/LSP 元数据、输出样式

这意味着包的安装、发现、列表、信息查询和启用均有效，包技能、Claude 命令技能、Claude 包设置默认值和兼容的 Codex 钩子目录在启用时加载，但包的运行时代码不会在进程内执行。

包钩子支持限于普通 OpenClaw 钩子目录格式（声明钩子根目录下的 `HOOK.md` 加 `handler.ts`/`handler.js`）。供应商特定的 shell/JSON 钩子运行时，包括 Claude 的 `hooks.json`，目前仅被检测，不会直接执行。

## 执行模型

原生 OpenClaw 插件与 Gateway **在同一进程内运行**。它们不沙箱隔离。加载的原生插件拥有与核心代码相同的进程级信任边界。

影响：

- 原生插件可注册工具、网络处理器、钩子和服务
- 原生插件的缺陷可能导致 Gateway 崩溃或不稳定
- 恶意原生插件等同于在 OpenClaw 进程内执行任意代码

兼容包默认更安全，因为 OpenClaw 目前把它们视为元数据/内容包。当前发布版本中，这主要指打包技能。

对于非打包插件，使用允许列表和显式安装/加载路径。将工作区插件视为开发时代码，而非生产默认。

重要信任提示：

- `plugins.allow` 信任的是 **插件 ID**，而非来源出处。
- 同一 ID 的工作区插件启用/允许时，会有意覆盖打包插件的副本。
- 这在本地开发、补丁测试和热修复中是正常且有用的。

## 可用插件（官方）

- Microsoft Teams 在 2026.1.15 起仅插件方式提供；如果使用 Teams，请安装 `@openclaw/msteams`。
- Memory (Core) — 打包的内存搜索插件（默认启用，通过 `plugins.slots.memory`）
- Memory (LanceDB) — 打包的长期记忆插件（自动回忆/捕获；设置 `plugins.slots.memory = "memory-lancedb"`）
- [语音通话](/plugins/voice-call) — `@openclaw/voice-call`
- [Zalo 个人](/plugins/zalouser) — `@openclaw/zalouser`
- [Matrix](/channels/matrix) — `@openclaw/matrix`
- [Nostr](/channels/nostr) — `@openclaw/nostr`
- [Zalo](/channels/zalo) — `@openclaw/zalo`
- [Microsoft Teams](/channels/msteams) — `@openclaw/msteams`
- Anthropic 提供商运行时 — 打包为 `anthropic`（默认启用）
- BytePlus 提供商目录 — 打包为 `byteplus`（默认启用）
- Cloudflare AI Gateway 提供商目录 — 打包为 `cloudflare-ai-gateway`（默认启用）
- Google 网页搜索 + Gemini CLI OAuth — 打包为 `google`（网页搜索自动加载；提供商身份验证为选用）
- GitHub Copilot 提供商运行时 — 打包为 `github-copilot`（默认启用）
- Hugging Face 提供商目录 — 打包为 `huggingface`（默认启用）
- Kilo Gateway 提供商运行时 — 打包为 `kilocode`（默认启用）
- Kimi Coding 提供商目录 — 打包为 `kimi-coding`（默认启用）
- MiniMax 提供商目录 + 使用 + OAuth — 打包为 `minimax`（默认启用；拥有 `minimax` 和 `minimax-portal`）
- Mistral 提供商能力 — 打包为 `mistral`（默认启用）
- Model Studio 提供商目录 — 打包为 `modelstudio`（默认启用）
- Moonshot 提供商运行时 — 打包为 `moonshot`（默认启用）
- NVIDIA 提供商目录 — 打包为 `nvidia`（默认启用）
- OpenAI 提供商运行时 — 打包为 `openai`（默认启用；拥有 `openai` 和 `openai-codex`）
- OpenCode Go 提供商能力 — 打包为 `opencode-go`（默认启用）
- OpenCode Zen 提供商能力 — 打包为 `opencode`（默认启用）
- OpenRouter 提供商运行时 — 打包为 `openrouter`（默认启用）
- Qianfan 提供商目录 — 打包为 `qianfan`（默认启用）
- Qwen OAuth（提供商身份验证 + 目录）— 打包为 `qwen-portal-auth`（默认启用）
- Synthetic 提供商目录 — 打包为 `synthetic`（默认启用）
- Together 提供商目录 — 打包为 `together`（默认启用）
- Venice 提供商目录 — 打包为 `venice`（默认启用）
- Vercel AI Gateway 提供商目录 — 打包为 `vercel-ai-gateway`（默认启用）
- Volcengine 提供商目录 — 打包为 `volcengine`（默认启用）
- Xiaomi 提供商目录 + 使用 — 打包为 `xiaomi`（默认启用）
- Z.AI 提供商运行时 — 打包为 `zai`（默认启用）
- Copilot 代理（提供商身份验证）— 本地 VS Code Copilot 代理桥，与内建的 `github-copilot` 设备登录不同（打包，默认禁用）

原生 OpenClaw 插件是通过 jiti 运行时加载的 **TypeScript 模块**。  
**配置验证不会执行插件代码**；它使用插件清单和 JSON 模式。参见 [插件清单](/plugins/manifest)。

原生 OpenClaw 插件可注册：

- Gateway RPC 方法
- Gateway HTTP 路由
- 代理工具
- CLI 命令
- 后台服务
- 上下文引擎
- 提供商身份验证流程和模型目录
- 提供商运行时钩子，用于动态模型 ID、传输规范化、能力元数据、流包装、缓存 TTL 策略、缺失身份验证提示、内建模型抑制、目录增强、运行时身份验证交换及使用/计费认证 + 快照解析
- 可选配置校验
- **技能**（通过插件清单中列出的 `skills` 目录）
- **自动回复命令**（无需调用 AI 代理即可执行）

原生 OpenClaw 插件与 Gateway **在同一进程内运行**，因此应将其视为可信代码。  
工具创作指南：[插件代理工具](/plugins/agent-tools)。

## 提供者运行时钩子

提供者插件现在有两层：

- 清单元数据：`providerAuthEnvVars` 用于在运行时加载前进行廉价的环境认证查找，另外 `providerAuthChoices` 用于在运行时加载前显示廉价的入门/认证选择标签和 CLI 标志元数据
- 配置时钩子：`catalog` / 传统的 `discovery`
- 运行时钩子：`resolveDynamicModel`、`prepareDynamicModel`、`normalizeResolvedModel`、`capabilities`、`prepareExtraParams`、`wrapStreamFn`、`formatApiKey`、`refreshOAuth`、`buildAuthDoctorHint`、`isCacheTtlEligible`、`buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、`isBinaryThinking`、`supportsXHighThinking`、`resolveDefaultThinkingLevel`、`isModernModelRef`、`prepareRuntimeAuth`、`resolveUsageAuth`、`fetchUsageSnapshot`

OpenClaw 仍然负责通用代理循环、故障切换、转录处理和工具策略。这些钩子是针对提供者特有行为的接口，无需整个自定义推理传输。

当提供者有基于环境变量的凭证，且希望通用认证/状态/模型选择器路径在不加载插件运行时的情况下读取，应使用清单的 `providerAuthEnvVars`。当入门/认证选择 CLI 界面需要知道提供者的选择 ID、组标签及简单的一标志认证连接且不加载运行时时，应使用清单的 `providerAuthChoices`。将运行时 `envVars` 保留给面向操作员的提示，如入门标签或 OAuth 客户端 ID/客户端密钥设置变量。

### 钩子调用顺序

对于模型/提供者插件，OpenClaw 粗略使用如下顺序的钩子：

1. `catalog`  
   在生成 `models.json` 时发布提供者配置到 `models.providers`。
2. 内置/发现的模型查找  
   OpenClaw 先尝试常规注册表/目录路径。
3. `resolveDynamicModel`  
   作为对本地注册表尚未存在的提供者拥有模型 ID 的同步回退。
4. `prepareDynamicModel`  
   仅在异步模型解析路径时异步预热，然后再次运行 `resolveDynamicModel`。
5. `normalizeResolvedModel`  
   嵌入式运行器使用解析模型前的最终重写。
6. `capabilities`  
   提供者拥有的转录/工具元数据被共享核心逻辑使用。
7. `prepareExtraParams`  
   在通用流选项包装前进行提供者拥有的请求参数规范化。
8. `wrapStreamFn`  
   在通用包装应用后进行提供者拥有的流包装。
9. `formatApiKey`  
   当存储的认证配置需要转换为运行时 `apiKey` 字符串时使用提供者拥有的格式化器。
10. `refreshOAuth`  
    对于自定义刷新端点或刷新失败策略，提供者拥有的 OAuth 刷新覆盖。
11. `buildAuthDoctorHint`  
    当 OAuth 刷新失败时追加提供者拥有的修复提示。
12. `isCacheTtlEligible`  
    代理/回传提供者拥有的提示缓存策略。
13. `buildMissingAuthMessage`  
    由提供者替换通用的缺少认证恢复消息。
14. `suppressBuiltInModel`  
    提供者拥有的上游过时模型抑制及可选的面向用户的错误提示。
15. `augmentModelCatalog`  
    提供者拥有的合成/最终目录行在发现后追加。
16. `isBinaryThinking`  
    提供者拥有的开关式二元推理切换。
17. `supportsXHighThinking`  
    提供者针对特定模型支持的 `xhigh` 推理。
18. `resolveDefaultThinkingLevel`  
    针对特定模型族的提供者默认 `/think` 级别。
19. `isModernModelRef`  
    供实时配置过滤和冒烟选择使用的提供者现代模型匹配器。
20. `prepareRuntimeAuth`  
    在推理前将配置好的凭证兑换为实际运行时令牌/密钥。
21. `resolveUsageAuth`  
    解析 `/usage` 和相关状态界面的使用/计费凭证。
22. `fetchUsageSnapshot`  
    在认证解析后获取并规范化提供者特定的使用/配额快照。

### 选择哪个钩子

- `catalog`：发布提供者配置和模型目录到 `models.providers`
- `resolveDynamicModel`：处理尚未在本地注册表中存在的传递或向前兼容模型 ID
- `prepareDynamicModel`：在重试动态解析前的异步预热（例如刷新提供者元数据缓存）
- `normalizeResolvedModel`：在推理前重写解析的模型传输/基础 URL/兼容性
- `capabilities`：发布提供者家族及转录/工具特性，避免在核心硬编码提供者 ID
- `prepareExtraParams`：在通用流包装前设置提供者默认或规范提供者特定的每模型参数
- `wrapStreamFn`：在仍使用正常 `pi-ai` 执行路径时，添加提供者特定的头部/负载/模型兼容补丁
- `formatApiKey`：将存储的认证配置转换为运行时 `apiKey` 字符串，避免在核心中硬编码提供者令牌块
- `refreshOAuth`：为不适合共享 `pi-ai` 刷新机制的提供者实现自定义 OAuth 刷新端点或策略
- `buildAuthDoctorHint`：刷新失败时追加提供者拥有的认证修复指导
- `isCacheTtlEligible`：确定提供者/模型对是否应使用缓存 TTL 元数据
- `buildMissingAuthMessage`：用提供者特定的恢复提示替换通用的缺少认证错误
- `suppressBuiltInModel`：隐藏过时的上游记录，或者返回提供者拥有的错误以应对直接解析失败
- `augmentModelCatalog`：在发现和配置合并后追加合成/最终目录行
- `isBinaryThinking`：暴露二元开关推理 UX，避免在 `/think` 中硬编码提供者 ID
- `supportsXHighThinking`：只让特定模型支持 `xhigh` 级别推理
- `resolveDefaultThinkingLevel`：将提供者/模型的默认推理策略保持在核心之外
- `isModernModelRef`：由提供者维护实时/冒烟模型族包括规则
- `prepareRuntimeAuth`：将配置的凭证兑换为请求使用的短期运行时令牌/密钥
- `resolveUsageAuth`：解析提供者拥有的使用/计费端点凭证，避免在核心硬编码令牌解析
- `fetchUsageSnapshot`：提供者拥有的使用端点抓取和解析，核心负责汇总和格式化

经验法则：

- 提供者拥有目录或基础 URL 默认值：使用 `catalog`
- 提供者接受任意上游模型 ID：使用 `resolveDynamicModel`
- 提供者需要在解析未知 ID 前进行网络元数据获取：新增 `prepareDynamicModel`
- 提供者需要传输重写但仍使用核心传输：使用 `normalizeResolvedModel`
- 提供者需要转录/提供者家族特性：使用 `capabilities`
- 提供者需要默认请求参数或每提供者参数清理：使用 `prepareExtraParams`
- 提供者需要请求头/体/模型兼容包装，无自定义传输：使用 `wrapStreamFn`
- 提供者在认证配置中存储额外元数据且需要自定义运行时令牌格式：使用 `formatApiKey`
- 提供者需要自定义 OAuth 刷新端点或刷新失败策略：使用 `refreshOAuth`
- 提供者需要刷新失败后的认证修复指导：使用 `buildAuthDoctorHint`
- 提供者需要代理特定缓存 TTL 策略：使用 `isCacheTtlEligible`
- 提供者需要特定的缺少认证恢复提示：使用 `buildMissingAuthMessage`
- 提供者需要隐藏过时上游行或用供应商提示替代：使用 `suppressBuiltInModel`
- 提供者需要在 `models list` 和选择器中追加合成向前兼容行：使用 `augmentModelCatalog`
- 提供者仅暴露二元开关推理：使用 `isBinaryThinking`
- 提供者仅让部分模型支持 `xhigh` 级别推理：使用 `supportsXHighThinking`
- 提供者拥有模型族的默认 `/think` 策略：使用 `resolveDefaultThinkingLevel`
- 提供者拥有实时/冒烟首选模型匹配：使用 `isModernModelRef`
- 提供者需要令牌兑换或短期请求凭证：使用 `prepareRuntimeAuth`
- 提供者需要自定义使用令牌解析或不同的使用凭证：使用 `resolveUsageAuth`
- 提供者需要特定使用端点或负载解析：使用 `fetchUsageSnapshot`

如果提供者需要完全自定义的传输协议或自定义请求执行器，那是另一类扩展。这些钩子用于在 OpenClaw 的正常推理循环上运行的提供者行为。

### 提供者示例

```ts
api.registerProvider({
  id: "example-proxy",
  label: "示例代理",
  auth: [],
  catalog: {
    order: "simple",
    run: async (ctx) => {
      const apiKey = ctx.resolveProviderApiKey("example-proxy").apiKey;
      if (!apiKey) {
        return null;
      }
      return {
        provider: {
          baseUrl: "https://proxy.example.com/v1",
          apiKey,
          api: "openai-completions",
          models: [{ id: "auto", name: "自动" }],
        },
      };
    },
  },
  resolveDynamicModel: (ctx) => ({
    id: ctx.modelId,
    name: ctx.modelId,
    provider: "example-proxy",
    api: "openai-completions",
    baseUrl: "https://proxy.example.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8192,
  }),
  prepareRuntimeAuth: async (ctx) => {
    const exchanged = await exchangeToken(ctx.apiKey);
    return {
      apiKey: exchanged.token,
      baseUrl: exchanged.baseUrl,
      expiresAt: exchanged.expiresAt,
    };
  },
  resolveUsageAuth: async (ctx) => {
    const auth = await ctx.resolveOAuthToken();
    return auth ? { token: auth.token } : null;
  },
  fetchUsageSnapshot: async (ctx) => {
    return await fetchExampleProxyUsage(ctx.token, ctx.timeoutMs, ctx.fetchFn);
  },
});
```

### 内置示例

- Anthropic 使用 `resolveDynamicModel`、`capabilities`、`buildAuthDoctorHint`、`resolveUsageAuth`、`fetchUsageSnapshot`、`isCacheTtlEligible`、`resolveDefaultThinkingLevel` 和 `isModernModelRef`，因为它拥有 Claude 4.6 向前兼容、提供者家族提示、认证修复指导、使用端点集成、提示缓存资格以及 Claude 默认/自适应推理策略。
- OpenAI 使用 `resolveDynamicModel`、`normalizeResolvedModel` 和 `capabilities`，同时还用 `buildMissingAuthMessage`、`suppressBuiltInModel`、`augmentModelCatalog`、`supportsXHighThinking` 和 `isModernModelRef`，因为它拥有 GPT-5.4 向前兼容、直接的 OpenAI `openai-completions` -> `openai-responses` 规范化、Codex 相关认证提示、Spark 抑制、合成 OpenAI 列表行以及 GPT-5 推理/实时模型策略。
- OpenRouter 使用 `catalog` 以及 `resolveDynamicModel` 和 `prepareDynamicModel`，因为该提供者为转发且可能在 OpenClaw 静态目录更新之前暴露新模型 ID。
- GitHub Copilot 使用 `catalog`、`auth`、`resolveDynamicModel` 和 `capabilities`，还包括 `prepareRuntimeAuth` 和 `fetchUsageSnapshot`，因为它需要提供者拥有的设备登录、模型回退行为、Claude 转录特性、GitHub 令牌到 Copilot 令牌的兑换，以及提供者拥有的使用端点。
- OpenAI Codex 使用 `catalog`、`resolveDynamicModel`、`normalizeResolvedModel`、`refreshOAuth` 和 `augmentModelCatalog`，还包括 `prepareExtraParams`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它仍运行在核心 OpenAI 传输基础上，但拥有自己的传输/基础 URL 规范化、OAuth 刷新回退策略、默认传输选择、合成 Codex 目录行和 ChatGPT 使用端点集成。
- Google AI Studio 和 Gemini CLI OAuth 使用 `resolveDynamicModel` 和 `isModernModelRef`，因为它们拥有 Gemini 3.1 向前兼容回退和现代模型匹配；Gemini CLI OAuth 还使用 `formatApiKey`、`resolveUsageAuth` 和 `fetchUsageSnapshot` 进行令牌格式化、令牌解析和配额端点连接。
- OpenRouter 使用 `capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible` 保持提供者特定请求头、路由元数据、推理补丁及提示缓存策略在核心之外。
- Moonshot 使用 `catalog` 及 `wrapStreamFn`，因为它仍采用共享的 OpenAI 传输，但需要提供者拥有的思考负载规范化。
- Kilocode 使用 `catalog`、`capabilities`、`wrapStreamFn` 和 `isCacheTtlEligible`，因为它需要提供者拥有的请求头、推理负载规范化、Gemini 转录提示和 Anthropic 缓存 TTL 护栏。
- Z.AI 使用 `resolveDynamicModel`、`prepareExtraParams`、`wrapStreamFn`、`isCacheTtlEligible`、`isBinaryThinking`、`isModernModelRef`、`resolveUsageAuth` 和 `fetchUsageSnapshot`，因为它拥有 GLM-5 回退、`tool_stream` 默认值、二元推理 UX、现代模型匹配以及使用认证和配额抓取。
- Mistral、OpenCode Zen 和 OpenCode Go 仅使用 `capabilities`，以避免核心内包含转录/工具特性。
- 仅包含目录的打包提供者如 `byteplus`、`cloudflare-ai-gateway`、`huggingface`、`kimi-coding`、`modelstudio`、`nvidia`、`qianfan`、`synthetic`、`together`、`venice`、`vercel-ai-gateway` 和 `volcengine` 仅使用 `catalog`。
- Qwen 门户使用 `catalog`、`auth` 和 `refreshOAuth`。
- MiniMax 和 Xiaomi 使用 `catalog` 及使用相关钩子，因为它们的 `/usage` 行为是插件拥有，尽管推理仍通过共享传输执行。

## 加载流程

启动时，OpenClaw 大致执行以下操作：

1. 发现候选插件根目录
2. 读取原生或兼容的包清单和包元数据
3. 拒绝不安全的候选项
4. 规范化插件配置（`plugins.enabled`、`allow`、`deny`、`entries`、`slots`、`load.paths`）
5. 决定每个候选的启用状态
6. 通过 jiti 加载启用的原生模块
7. 调用原生的 `register(api)` 钩子，并将注册信息收集进插件注册表
8. 向命令/运行时环境暴露注册表

安全检查发生在**运行时执行之前**。当入口路径逃出插件根目录、路径可被所有人写入，或非捆绑插件的路径所有权可疑时，候选项会被阻止。

### 以清单为先的行为

清单是控制面唯一真实来源。OpenClaw 利用它来：

- 标识插件
- 发现声明的频道/技能/配置模式或包能力
- 验证 `plugins.entries.<id>.config`
- 增强控制 UI 标签/占位符
- 展示安装/目录元数据

对于原生插件，运行时模块是数据面部分。它注册实际行为，如钩子、工具、命令或提供者流程。

### 加载器缓存内容

OpenClaw 保留短期进程内缓存，用于：

- 发现结果
- 清单注册表数据
- 已加载的插件注册表

这些缓存降低突发启动和重复命令的开销。它们可安全视为短期性能缓存，而非持久化。

## 运行时辅助

插件可通过 `api.runtime` 访问选定的核心助手。对于电话语音合成：

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

- `openclaw/plugin-sdk/core` 用于通用插件 API、提供者认证类型，以及共享助手，如路由/会话实用工具和带日志的运行时。
- `openclaw/plugin-sdk/compat` 用于需要比 `core` 更广泛共享运行时助手的捆绑/内部插件代码。
- `openclaw/plugin-sdk/telegram` 用于 Telegram 频道插件类型和共享面向频道的助手。内置 Telegram 实现内部保持私有。
- `openclaw/plugin-sdk/discord` 用于 Discord 频道插件类型和共享面向频道的助手。内置 Discord 实现内部保持私有。
- `openclaw/plugin-sdk/slack` 用于 Slack 频道插件类型和共享面向频道的助手。内置 Slack 实现内部保持私有。
- `openclaw/plugin-sdk/signal` 用于 Signal 频道插件类型和共享面向频道的助手。内置 Signal 实现内部保持私有。
- `openclaw/plugin-sdk/imessage` 用于 iMessage 频道插件类型和共享面向频道的助手。内置 iMessage 实现内部保持私有。
- `openclaw/plugin-sdk/whatsapp` 用于 WhatsApp 频道插件类型和共享面向频道的助手。内置 WhatsApp 实现内部保持私有。
- `openclaw/plugin-sdk/line` 用于 LINE 频道插件。
- `openclaw/plugin-sdk/msteams` 用于内置 Microsoft Teams 插件表面。
- 也有捆绑扩展专用子路径：
  `openclaw/plugin-sdk/acpx`、`openclaw/plugin-sdk/bluebubbles`、
  `openclaw/plugin-sdk/copilot-proxy`、`openclaw/plugin-sdk/device-pair`、
  `openclaw/plugin-sdk/diagnostics-otel`、`openclaw/plugin-sdk/diffs`、
  `openclaw/plugin-sdk/feishu`、`openclaw/plugin-sdk/googlechat`、
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

## 提供者目录

提供者插件可以定义用于推理的模型目录，方法是通过
`registerProvider({ catalog: { run(...) { ... } } })`。

`catalog.run(...)` 返回与 OpenClaw 写入 `models.providers` 相同格式：

- `{ provider }` 表示单个提供者条目
- `{ providers }` 表示多个提供者条目

当插件拥有提供者特定的模型 ID、默认基础 URL，或受认证门控的模型元数据时，使用 `catalog`。

`catalog.order` 控制插件目录与内置隐式提供者合并的时机：

- `simple`：普通 API 密钥或环境驱动的提供者
- `profile`：当存在认证配置文件时出现的提供者
- `paired`：合成多个相关提供者条目的提供者
- `late`：最后阶段，位于其他隐式提供者之后

键冲突时后加载的提供者胜出，因此插件可故意用同样的提供者 id 覆盖内置条目。

兼容性：

- `discovery` 仍作为旧别名有效
- 如果同时注册了 `catalog` 和 `discovery`，OpenClaw 会使用 `catalog`

兼容提示：

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

4. 捆绑扩展（随 OpenClaw 一起发布；混合默认开启/关闭）

- `<openclaw>/extensions/*`

许多捆绑提供者插件默认启用，以便模型目录/运行时钩子无需额外设置即可使用。其他仍需通过 `plugins.entries.<id>.enabled` 或 `openclaw plugins enable <id>` 显式启用。

默认开启的捆绑插件示例：

- `byteplus`
- `cloudflare-ai-gateway`
- `device-pair`
- `github-copilot`
- `huggingface`
- `kilocode`
- `kimi-coding`
- `minimax`
- `minimax`
- `modelstudio`
- `moonshot`
- `nvidia`
- `ollama`
- `openai`
- `openrouter`
- `phone-control`
- `qianfan`
- `qwen-portal-auth`
- `sglang`
- `synthetic`
- `talk-voice`
- `together`
- `venice`
- `vercel-ai-gateway`
- `vllm`
- `volcengine`
- `xiaomi`
- 活跃记忆槽插件（默认槽：`memory-core`）

已安装插件默认启用，也可用同样方式禁用。

安全加固提示：
Workspace 插件默认 **禁用**，除非你显式开启或加入白名单。这是有意为之：检出的仓库不应默默变成生产的 Gateway 代码。

加固注意事项：

- 当 `plugins.allow` 为空且可发现非内置插件时，OpenClaw 会在启动时记录插件 id 与来源的警告。
- 候选路径在通过发现前会进行安全检查。OpenClaw 会阻止候选路径，当：
  - 扩展入口解析出插件根目录外（包括符号链接/路径穿越）
  - 插件根目录或源码路径具有全员写权限
  - （非内置插件）路径所有权异常（POSIX 所有者既不是当前用户 uid 也不是 root）
- 加载的非内置插件若无安装/加载路径信息，会发出警告，方便用 `plugins.allow` 固定信任或 `plugins.installs` 跟踪安装。

每个原生 OpenClaw 插件根目录必须包含一个 `openclaw.plugin.json` 文件。如果路径指向文件，插件根目录为该文件所在文件夹，且该目录必须包含清单。

兼容的捆绑包可能改为提供：

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`

捆绑目录同原生插件从相同根路径发现。

若多个插件拥有相同 id，排序中第一个匹配被采纳，低优先拷贝被忽略。

这意味着：

- workspace 插件有意遮蔽同 id 的捆绑插件
- `plugins.allow: ["foo"]` 授权激活的 `foo` 插件，不论激活拷贝来自 workspace 还是捆绑扩展根
- 若需更严格的来源控制，请使用显式安装/加载路径，启用前检查解析出的插件来源

### 启用规则

启用状态在发现插件后决定：

- `plugins.enabled: false` 禁用所有插件
- `plugins.deny` 始终优先
- `plugins.entries.<id>.enabled: false` 禁用该插件
- 工作区来源插件默认禁用
- 当 `plugins.allow` 非空时，白名单限制活动插件集
- 白名单基于 **插件 id**，而非来源
- 内置插件默认禁用，除非：
  - 该内置 id 属于默认开启集合，或
  - 你显式启用，或
  - 频道配置隐式启用该内置频道插件
- 独占槽位可强制启用选定插件

当前核心中，默认开启的捆绑 id 包含上述本地/提供者助手加上活跃记忆槽插件。

### 包装包

插件目录可包含带有 `openclaw.extensions` 的 `package.json`：

```json
{
  "name": "my-pack",
  "openclaw": {
    "extensions": ["./src/safety.ts", "./src/tools.ts"],
    "setupEntry": "./src/setup-entry.ts"
  }
}
```

条目各自成为插件。若有多个扩展，插件 id 形如 `name/<fileBase>`。

请在该目录安装插件依赖，以确保 `node_modules` 可用（运行 `npm install` 或 `pnpm install`）。

安全防护：每个 `openclaw.extensions` 条目解析后必须位于插件目录内部，拒绝目录外条目。

安全提示：`openclaw plugins install` 安装依赖时，会使用 `npm install --ignore-scripts`（无生命周期脚本）。请确保依赖树仅包含“纯 JS/TS”，避免需要 `postinstall` 构建的包。

可选：`openclaw.setupEntry` 可以指向轻量的仅用于设置的模块。
当 OpenClaw 需要为禁用的频道插件或已启用但仍未配置的频道插件加载设置表面时，它会加载 `setupEntry`，而非完整插件入口。
这样，当你的主插件入口也绑定工具、钩子或其他仅运行时代码时，可减轻启动和设置负担。

可选：`openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen`
可让频道插件在网关预监听的启动阶段也走 `setupEntry` 路径，即使频道已配置。

仅当 `setupEntry` 完全包含必须在网关开始监听前存在的启动表面时才使用此功能。实际上，意味着设置入口必须注册所有启动依赖的频道拥有能力，例如：

- 频道注册本身
- 监听开始前必须可用的任何 HTTP 路由
- 监听同一时间窗口必须存在的任何网关方法、工具或服务

如果完整入口仍拥有任何必需的启动能力，请勿启用此标志。保持插件默认行为，让 OpenClaw 在启动时加载完整入口。

示例：

```json
{
  "name": "@scope/my-channel",
  "openclaw": {
    "extensions": ["./index.ts"],
    "setupEntry": "./setup-entry.ts",
    "startup": {
      "deferConfiguredChannelFullLoadUntilAfterListen": true
    }
  }
}
```

### 频道目录元数据

频道插件可以通过 `openclaw.channel` 广告设置/发现元数据，及通过 `openclaw.install` 广告安装提示。这样保持核心目录无数据。

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

或使用环境变量 `OPENCLAW_PLUGIN_CATALOG_PATHS`（或 `OPENCLAW_MPM_CATALOG_PATHS`）指向一个或多个 JSON 文件（逗号/分号/路径分隔符）。文件内容应包含 `{ "entries": [ { "name": "@scope/pkg", "openclaw": { "channel": {...}, "install": {...} } } ] }`。

## 插件 ID

默认插件 id：

- 包装包：取 `package.json` 中的 `name`
- 独立文件：用文件名（例如 `~/.../voice-call.ts` → `voice-call`）

若插件导出 `id`，OpenClaw 使用该 id，但若与配置 id 不符会输出警告。

## 配置
## 注册表模型

加载的插件不会直接修改任意核心全局变量。它们注册到一个中心插件注册表中。

该注册表跟踪：

- 插件记录（身份、来源、来源类型、状态、诊断）
- 工具
- 旧版钩子和类型化钩子
- 通道
- 提供商
- 网关 RPC 处理器
- HTTP 路由
- CLI 注册器
- 后台服务
- 插件拥有的命令

核心功能从注册表读取数据，而不是直接与插件模块交互。这保证了加载的单向性：

- 插件模块 -> 注册表注册
- 核心运行时 -> 注册表消费

这种分离对维护性很重要。意味着大多数核心界面只须一个集成点：“读取注册表”，而非“为每个插件模块特判”。

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

- 在 `entries`、`allow`、`deny` 或 `slots` 中的未知插件 id 是 **错误**。
- 除非插件清单声明该频道 id，否则未知的 `channels.<id>` 键是 **错误**。
- 原生插件配置通过嵌入在 `openclaw.plugin.json` 中的 JSON Schema (`configSchema`) 进行校验。
- 兼容的 bundle 目前不暴露原生 OpenClaw 配置 schemas。
- 如果插件被禁用，其配置会被保留并发出 **警告**。

## 插件槽（独占分类）
### 禁用 vs 缺失 vs 无效

这三种状态有意区别：

- **禁用**：插件存在，但启用规则关闭了它
- **缺失**：配置引用的插件 ID 没被发现
- **无效**：插件存在，但其配置与声明的 Schema 不匹配

OpenClaw 为禁用插件保留配置，以支持切换回开启不会破坏数据。

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

## 控制界面（Schema + 标签）

控制界面利用 `config.schema`（JSON Schema + `uiHints`）渲染更佳的表单。

OpenClaw 会基于发现的插件在运行时增强 `uiHints`：

- 为 `plugins.entries.<id>`、`.enabled`、`.config` 添加每插件标签
- 合并可选的插件提供的配置字段提示（`plugins.entries.<id>.config.<field>`）

如果想让你的插件配置字段显示友好的标签、占位符（并标记秘密为敏感字段），请在插件 manifest 中同时提供 `uiHints` 和 JSON Schema。

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
    "apiKey": { "label": "API Key", "sensitive": true },
    "region": { "label": "Region", "placeholder": "us-east-1" }
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
openclaw plugins install -l ./extensions/voice-call # 链接（不复制）用于开发
openclaw plugins install @openclaw/voice-call   # 从 npm 安装
openclaw plugins install @openclaw/voice-call --pin # 记录精确解析的名称@版本
openclaw plugins update <id>
openclaw plugins update --all
openclaw plugins enable <id>
openclaw plugins disable <id>
openclaw plugins doctor
```

`openclaw plugins list` 显示顶层格式为 `openclaw` 或 `bundle`。
详细列表/信息输出还显示 bundle 子类型（`codex` 或 `claude`）及检测到的 bundle 功能。

`plugins update` 仅对由 `plugins.installs` 跟踪的 npm 安装有效。
如果更新时存储的完整性元数据变化，OpenClaw 会发出警告并请求确认（使用全局 `--yes` 参数可跳过提示）。

插件也可注册自己的顶级命令（例如：`openclaw voicecall`）。

## 插件 API（概览）

插件可导出：

- 一个函数 `(api) => { ... }`
- 或一个对象 `{ id, name, configSchema, register(api) { ... } }`

`register(api)` 是插件挂载行为的地方。常用注册包括：

- `registerTool`
- `registerHook`
- `on(...)` 用于类型化生命周期钩子
- `registerChannel`
- `registerProvider`
- `registerHttpRoute`
- `registerCommand`
- `registerCli`
- `registerContextEngine`
- `registerService`

上下文引擎插件还能注册运行时拥有的上下文管理器：

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

插件可以注册 **模型供应商认证** 流程，用户可在 OpenClaw 内完成 OAuth 或 API Key 配置，支持在入门、模型选择界面暴露供应商设置，且贡献隐式供应商发现。

供应商插件是模型供应商设置的模块化拓展接口，不再仅仅是“OAuth 助手”。

### 供应商插件生命周期

供应商插件可以参与以下五个不同阶段：

1. **Auth**
   `auth[].run(ctx)` 负责执行 OAuth、API Key 捕获、设备码或自定义
   设置并返回认证配置文件及可选的配置补丁。
2. **非交互式设置**
   `auth[].runNonInteractive(ctx)` 处理 `openclaw onboard --non-interactive`
  （无提示）场景。用于提供商需要自定义无头设置而不仅限于内置的简单 API Key 流。
3. **向导集成**
   `wizard.setup` 向 `openclaw onboard` 添加入口。
   `wizard.modelPicker` 向模型选择器添加设置入口。
4. **隐式发现**
   `discovery.run(ctx)` 可在模型解析/列出时自动贡献提供商配置。
5. **选择后跟进**
   `onModelSelected(ctx)` 在模型选择完成后运行。用于提供商特定操作，如下载本地模型。

推荐拆分是因为这些阶段的生命周期需求各不相同：

- 认证是交互式，写入凭证/配置
- 非交互式基于标志/环境变量，无提示
- 向导元数据是静态、面向 UI 的
- 发现应快速、容错、安全，避免副作用
- 选择后钩子用于跟选定模型的副作用

### 供应商认证合同

`auth[].run(ctx)` 返回：

- `profiles`：要写入的认证配置文件
- `configPatch`：可选的 `openclaw.json` 配置修改
- `defaultModel`：可选的 `provider/model` 引用
- `notes`：可选用户面向注释

核心随后：

1. 写入返回的认证配置文件
2. 应用认证配置文件的配置链接
3. 合并配置补丁
4. 可选应用默认模型
5. 在适当时机运行提供商的 `onModelSelected` 钩子

这意味着提供商插件负责特定的设置逻辑，核心负责通用的持久化和配置合并路径。

### 供应商非交互式合同

`auth[].runNonInteractive(ctx)` 是可选的。需要时实现，用于不能通过内置通用 API Key 流表达的无头设置。

非交互上下文包含：

- 当前和基础配置
- 解析后的入门 CLI 选项
- 运行时日志/错误辅助
- agent/workspace 目录，使提供商能将认证存入与入门其余部分相同的作用域存储
- `resolveApiKey(...)` 用于读取提供商密钥（来自标志、环境变量或现有认证配置文件），同时尊重 `--secret-input-mode`
- `toApiKeyCredential(...)` 将解析出的密钥转换为含明文或密钥引用存储的认证凭据

适用典型场景：

- 自托管的 OpenAI 兼容运行时，需要 `--custom-base-url` + `--custom-model-id`
- 提供商特定的非交互式验证或配置合成

请勿在 `runNonInteractive` 里弹出提示。缺失输入应拒绝并带可操作错误。

### 供应商向导元数据

提供商认证/入门元数据可存在两层：

- 清单 `providerAuthChoices`：简单标签、分组、`--auth-choice` id 和简单 CLI 标志元数据，运行前可用
- 运行时 `wizard.setup` / `auth[].wizard`：依赖已加载的提供商代码的更丰富行为

静态标签/标志用清单元数据。若设置依赖动态认证方法、方法回退或运行时验证，使用运行时向导元数据。

`wizard.setup` 控制提供商如何出现在分组入门中：

- `choiceId`：认证选择值
- `choiceLabel`：选项标签
- `choiceHint`：简短提示
- `groupId`：组别 id
- `groupLabel`：组标签
- `groupHint`：组提示
- `methodId`：运行的认证方法
- `modelAllowlist`：可选的认证后准入白名单策略（`allowedKeys`、`initialSelections`、`message`）

`wizard.modelPicker` 控制提供商在模型选择器中作为“立即设置此供应商”入口的显示：

- `label`
- `hint`
- `methodId`

当提供商有多个认证方法时，向导可指定某个特定方法，或由 OpenClaw 合成每个方法选项。

OpenClaw 在插件注册时验证向导元数据：

- 重复或空白认证方法 ID 会被拒绝
- 没有认证方法的提供商会忽略向导元数据
- 无效的 `methodId` 绑定降为警告，回退到提供商剩余的其他认证方法

### 供应商发现合同

`discovery.run(ctx)` 返回如下之一：

- `{ provider }`
- `{ providers }`
- `null`

常用 `{ provider }` 用于插件拥有单一提供商 ID，使用 `{ providers }` 用于多提供商发现。

发现上下文包含：

- 当前配置
- 代理/工作区目录
- 进程环境变量
- 用于解析提供商 API Key 及发现安全 API Key 值的辅助

发现应：

- 快速
- 尽力而为
- 跳过失败安全
- 避免副作用

不应依赖提示或长时间设置。

### 发现顺序

供应商发现按阶段有序执行：

- `simple`
- `profile`
- `paired`
- `late`

用途：

- `simple` 用于廉价的环境变量发现
- `profile` 当发现依赖认证配置文件时使用
- `paired` 用于须与其他发现步骤协调的供应商
- `late` 用于昂贵或本地网络探测

大多数自托管供应商应使用 `late`。

### 良好的供应商插件边界

适合供应商插件的场景：

- 本地/自托管供应商，带定制设置流程
- 供应商特定的 OAuth/设备码登录
- 本地模型服务器的隐式发现
- 选择后副作用，如拉取模型

较不合适的场景：

- 区别只在环境变量、基础 URL、单个默认模型的简单 API Key 供应商

这类仍可作为插件，但核心模块化优势来自先拆分行为丰富的供应商。

通过 `api.registerProvider(...)` 注册供应商。每个供应商暴露一项或多项认证方法（OAuth、API Key、设备码等），这些方法可用来：

- `openclaw models auth login --provider <id> [--method <id>]`
- `openclaw onboard`
- model-picker “custom provider” setup entries
- implicit provider discovery during model resolution/listing

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
  wizard: {
    setup: {
      choiceId: "acme",
      choiceLabel: "AcmeAI",
      groupId: "acme",
      groupLabel: "AcmeAI",
      methodId: "oauth",
    },
    modelPicker: {
      label: "AcmeAI (custom)",
      hint: "Connect a self-hosted AcmeAI endpoint",
      methodId: "oauth",
    },
  },
  discovery: {
    order: "late",
    run: async () => ({
      provider: {
        baseUrl: "https://acme.example/v1",
        api: "openai-completions",
        apiKey: "${ACME_API_KEY}",
        models: [],
      },
    }),
  },
});
```

说明：

- `run` 接收 `ProviderAuthContext`，包含 `prompter`、`runtime`、
  `openUrl`、`oauth.createVpsAwareHandlers`、`secretInputMode` 和
  `allowSecretRefPrompt` 等辅助函数及状态。入门/配置流程可用它们来尊重 `--secret-input-mode` 或提供环境变量/文件/执行的密钥引用捕获，而 `openclaw models auth` 保持更紧凑的提示界面。
- `runNonInteractive` 接收 `ProviderAuthMethodNonInteractiveContext`，带有 `opts`、`agentDir`、`resolveApiKey` 和 `toApiKeyCredential` 辅助，用于无头入门。
- 需要时返回 `configPatch` 以添加默认模型或提供商配置。
- 返回 `defaultModel` 以供 `--set-default` 更新 agent 默认值。
- `wizard.setup` 将提供商方案加到如 `openclaw onboard` / `openclaw setup --wizard` 的入门界面。
- `wizard.setup.modelAllowlist` 允许提供商在入门/配置中缩小后续模型准入提示。
- `wizard.modelPicker` 在模型选择器增加“设置此供应商”入口。
- `deprecatedProfileIds` 允许提供商控制 `openclaw doctor` 清理废弃身份认证配置 id。
- `discovery.run` 返回 `{ provider }`（单个 ID）或 `{ providers }`（多供应商发现）。
- `discovery.order` 控制提供商执行时机，相对于内置发现阶段：`simple`、`profile`、`paired` 或 `late`。
- `onModelSelected` 是模型选择后的钩子，用于提供商特定后续操作，比如拉取本地模型。

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

### 频道设置钩子

推荐拆分：

- `plugin.setup` 负责账户 ID 规范化、校验和配置写入。
- `plugin.setupWizard` 允许宿主运行通用向导流程，频道仅提供状态、凭证、私信白名单和频道访问描述。

`plugin.setupWizard` 适合符合共享模式的频道：

- 一个账户选择器，依赖 `plugin.config.listAccountIds`
- 提示前的可选准备步骤（例如安装或引导工作）
- 可选的环境变量快捷方式示例凭证组提示（例如配对的机器人/应用令牌）
- 一步或多步凭证提示，每步要么写入 `plugin.setup.applyAccountConfig`，要么频道管理的部分补丁
- 可选的非秘密文本提示（如 CLI 路径、基础 URL、账户 id）
- 可选的频道/群组访问白名单提示，由宿主解析
- 可选的私信白名单解析（如 `@username` -> 数字 ID）
- 设置完成后的可选完成提示

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

- `setup` (校验 + 配置写入), `setupWizard` (宿主控制向导), `security` (私信策略), `status` (健康/诊断)
- `gateway` (启动/停止/登录), `mentions`, `threading`, `streaming`
- `actions` (消息动作), `commands` (本地命令行为)

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

- Plugin `package.json` must include `openclaw.extensions` with one or more entry files.
- Optional: `openclaw.setupEntry` may point at a lightweight setup-only entry for disabled or still-unconfigured channel setup.
- Optional: `openclaw.startup.deferConfiguredChannelFullLoadUntilAfterListen` may opt a channel plugin into using `setupEntry` during pre-listen gateway startup, but only when that setup entry completely covers the plugin's startup-critical surface.
- Entry files can be `.js` or `.ts` (jiti loads TS at runtime).
- `openclaw plugins install <npm-spec>` uses `npm pack`, extracts into `~/.openclaw/extensions/<id>/`, and enables it in config.
- Config key stability: scoped packages are normalized to the **unscoped** id for `plugins.entries.*`.

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

- 仅安装您信任的插件。
- 优先使用 `plugins.allow` 白名单。
- 请记住 `plugins.allow` 是基于 id 的，因此启用的工作区插件可能会故意覆盖同名的内置插件。
- 变更后请重启 Gateway。

## 插件测试

插件可以（且应当）带测例：

- 仓库内插件可在 `src/**` 下保持 Vitest 测试（示例：`src/plugins/voice-call.plugin.test.ts`）。
- 独立发布插件需运行自建 CI（lint/build/test），并确保 `openclaw.extensions` 指向构建入口（`dist/index.js`）。
