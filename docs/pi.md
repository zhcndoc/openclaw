---
title: "Pi 集成架构"
summary: "OpenClaw 嵌入式 Pi 代理集成及会话生命周期的架构"
read_when:
  - 了解 OpenClaw 中 Pi SDK 集成设计
  - 修改 Pi 的代理会话生命周期、工具或提供者连接
---

# Pi 集成架构

本文档介绍 OpenClaw 如何与 [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) 及其同族包（`pi-ai`、`pi-agent-core`、`pi-tui`）集成，以驱动其 AI 代理功能。

## 概述

OpenClaw 使用 pi SDK 将 AI 编程代理嵌入其消息网关架构中。不同于启动 pi 作为子进程或使用 RPC 模式，OpenClaw 直接通过 `createAgentSession()` 导入并实例化 pi 的 `AgentSession`。该嵌入式方式提供：

- 完全控制会话生命周期和事件处理
- 自定义工具注入（消息、沙箱、频道特定操作）
- 每个频道/上下文的系统提示定制
- 支持分支/压缩的会话持久化
- 多账户认证配置轮换及故障切换
- 与提供者无关的模型切换

## 依赖包

```json
{
  "@mariozechner/pi-agent-core": "0.61.1",
  "@mariozechner/pi-ai": "0.61.1",
  "@mariozechner/pi-coding-agent": "0.61.1",
  "@mariozechner/pi-tui": "0.61.1"
}
```

| 包名               | 作用                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| `pi-ai`            | 核心大语言模型抽象：`Model`、`streamSimple`、消息类型、提供者 API                                 |
| `pi-agent-core`    | 代理循环、工具执行、`AgentMessage` 类型                                                          |
| `pi-coding-agent`  | 高级 SDK：`createAgentSession`、`SessionManager`、`AuthStorage`、`ModelRegistry`、内建工具       |
| `pi-tui`           | 终端 UI 组件（用于 OpenClaw 的本地 TUI 模式）                                                     |

## 文件结构

```
src/agents/
├── pi-embedded-runner.ts          # 重新导出 pi-embedded-runner/
├── pi-embedded-runner/
│   ├── run.ts                     # 主入口：runEmbeddedPiAgent()
│   ├── run/
│   │   ├── attempt.ts             # 单次尝试逻辑及会话设置
│   │   ├── params.ts              # RunEmbeddedPiAgentParams 类型
│   │   ├── payloads.ts            # 从运行结果构建响应负载
│   │   ├── images.ts              # 视觉模型图像注入
│   │   └── types.ts               # EmbeddedRunAttemptResult
│   ├── abort.ts                   # 中止错误检测
│   ├── cache-ttl.ts               # 上下文修剪用缓存 TTL 跟踪
│   ├── compact.ts                 # 手动/自动压缩逻辑
│   ├── extensions.ts              # 加载 pi 扩展用于嵌入式运行
│   ├── extra-params.ts            # 提供者特定流参数
│   ├── google.ts                  # Google/Gemini 轮次排序修复
│   ├── history.ts                 # 历史限制（私聊 vs 群聊）
│   ├── lanes.ts                   # 会话/全局命令通道
│   ├── logger.ts                  # 子系统日志
│   ├── model.ts                   # 通过 ModelRegistry 解析模型
│   ├── runs.ts                   # 活动运行跟踪、中止、队列
│   ├── sandbox-info.ts            # 系统提示用沙箱信息
│   ├── session-manager-cache.ts   # SessionManager 实例缓存
│   ├── session-manager-init.ts    # 会话文件初始化
│   ├── system-prompt.ts           # 系统提示构建器
│   ├── tool-split.ts              # 将工具拆分为内建 vs 自定义
│   ├── types.ts                   # EmbeddedPiAgentMeta、EmbeddedPiRunResult
│   └── utils.ts                   # ThinkLevel 映射、错误描述
├── pi-embedded-subscribe.ts       # 会话事件订阅/派发
├── pi-embedded-subscribe.types.ts # SubscribeEmbeddedPiSessionParams
├── pi-embedded-subscribe.handlers.ts # 事件处理工厂
├── pi-embedded-subscribe.handlers.lifecycle.ts
├── pi-embedded-subscribe.handlers.types.ts
├── pi-embedded-block-chunker.ts   # 流式块回复切分
├── pi-embedded-messaging.ts       # 消息工具发送跟踪
├── pi-embedded-helpers.ts         # 错误分类、轮次验证
├── pi-embedded-helpers/           # 辅助模块
├── pi-embedded-utils.ts           # 格式化工具
├── pi-tools.ts                    # createOpenClawCodingTools()
├── pi-tools.abort.ts              # 工具的 AbortSignal 包装
├── pi-tools.policy.ts             # 工具白名单/黑名单策略
├── pi-tools.read.ts               # 读取工具定制化
├── pi-tools.schema.ts             # 工具 schema 规范化
├── pi-tools.types.ts              # AnyAgentTool 类型别名
├── pi-tool-definition-adapter.ts  # AgentTool -> ToolDefinition 适配器
├── pi-settings.ts                 # 设置覆盖
├── pi-extensions/                 # 自定义 pi 扩展
│   ├── compaction-safeguard.ts    # 压缩保护扩展
│   ├── compaction-safeguard-runtime.ts
│   ├── context-pruning.ts         # 缓存 TTL 上下文修剪扩展
│   └── context-pruning/
├── model-auth.ts                  # 认证配置解析
├── auth-profiles.ts               # 配置存储、冷却、故障切换
├── model-selection.ts             # 默认模型解析
├── models-config.ts               # models.json 生成
├── model-catalog.ts               # 模型目录缓存
├── context-window-guard.ts        # 上下文窗口验证
├── failover-error.ts              # FailoverError 类
├── defaults.ts                    # DEFAULT_PROVIDER、DEFAULT_MODEL
├── system-prompt.ts               # buildAgentSystemPrompt()
├── system-prompt-params.ts        # 系统提示参数解析
├── system-prompt-report.ts        # 调试报告生成
├── tool-summaries.ts              # 工具描述摘要
├── tool-policy.ts                 # 工具策略解析
├── transcript-policy.ts           # 转录文本校验策略
├── skills.ts                      # 技能快照/提示构建
├── skills/                        # 技能子系统
├── sandbox.ts                     # 沙箱上下文解析
├── sandbox/                       # 沙箱子系统
├── channel-tools.ts               # 频道特定工具注入
├── openclaw-tools.ts              # OpenClaw 专有工具
├── bash-tools.ts                  # exec/process 工具
├── apply-patch.ts                 # apply_patch 工具（OpenAI）
├── tools/                         # 单独工具实现
│   ├── browser-tool.ts
│   ├── canvas-tool.ts
│   ├── cron-tool.ts
│   ├── gateway-tool.ts
│   ├── image-tool.ts
│   ├── message-tool.ts
│   ├── nodes-tool.ts
│   ├── session*.ts
│   ├── web-*.ts
│   └── ...
└── ...
```

Channel-specific message action runtimes now live in the plugin-owned extension
directories instead of under `src/agents/tools`, for example:

- `extensions/discord/src/actions/runtime*.ts`
- `extensions/slack/src/action-runtime.ts`
- `extensions/telegram/src/action-runtime.ts`
- `extensions/whatsapp/src/action-runtime.ts`

## Core Integration Flow

### 1. 运行嵌入式代理

主入口是 `pi-embedded-runner/run.ts` 中的 `runEmbeddedPiAgent()`：

```typescript
import { runEmbeddedPiAgent } from "./agents/pi-embedded-runner.js";

const result = await runEmbeddedPiAgent({
  sessionId: "user-123",
  sessionKey: "main:whatsapp:+1234567890",
  sessionFile: "/path/to/session.jsonl",
  workspaceDir: "/path/to/workspace",
  config: openclawConfig,
  prompt: "Hello, how are you?",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  timeoutMs: 120_000,
  runId: "run-abc",
  onBlockReply: async (payload) => {
    await sendToChannel(payload.text, payload.mediaUrls);
  },
});
```

### 2. 会话创建

在 `runEmbeddedAttempt()`（由 `runEmbeddedPiAgent()` 调用）中，使用 pi SDK：

```typescript
import {
  createAgentSession,
  DefaultResourceLoader,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";

const resourceLoader = new DefaultResourceLoader({
  cwd: resolvedWorkspace,
  agentDir,
  settingsManager,
  additionalExtensionPaths,
});
await resourceLoader.reload();

const { session } = await createAgentSession({
  cwd: resolvedWorkspace,
  agentDir,
  authStorage: params.authStorage,
  modelRegistry: params.modelRegistry,
  model: params.model,
  thinkingLevel: mapThinkingLevel(params.thinkLevel),
  tools: builtInTools,
  customTools: allCustomTools,
  sessionManager,
  settingsManager,
  resourceLoader,
});

applySystemPromptOverrideToSession(session, systemPromptOverride);
```

### 3. 事件订阅

`subscribeEmbeddedPiSession()` 订阅 pi 的 `AgentSession` 事件：

```typescript
const subscription = subscribeEmbeddedPiSession({
  session: activeSession,
  runId: params.runId,
  verboseLevel: params.verboseLevel,
  reasoningMode: params.reasoningLevel,
  toolResultFormat: params.toolResultFormat,
  onToolResult: params.onToolResult,
  onReasoningStream: params.onReasoningStream,
  onBlockReply: params.onBlockReply,
  onPartialReply: params.onPartialReply,
  onAgentEvent: params.onAgentEvent,
});
```

处理的事件包括：

- `message_start` / `message_end` / `message_update`（流式文本/思考）
- `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
- `turn_start` / `turn_end`
- `agent_start` / `agent_end`
- `auto_compaction_start` / `auto_compaction_end`

### 4. 发送提示

设置完成后，调用：

```typescript
await session.prompt(effectivePrompt, { images: imageResult.images });
```

SDK 负责完整代理循环：发送给 LLM，执行工具调用，流式响应。

图像注入局限于当前提示：OpenClaw 从当前提示加载图像引用，仅为本轮传入 `images`，不会重新扫描旧的历史轮次插入图像负载。

## 工具架构

### 工具流水线

1. **基础工具**：pi 的 `codingTools`（read、bash、edit、write）
2. **定制替换**：OpenClaw 以 `exec`/`process` 替换 bash，定制 read/edit/write 以支持沙箱
3. **OpenClaw 工具**：消息、浏览器、画布、会话、定时、网关等
4. **频道工具**：Discord/Telegram/Slack/WhatsApp 特定行动工具
5. **策略过滤**：基于配置、提供者、代理、组、沙箱策略过滤工具
6. **schema 规范化**：修正 Gemini/OpenAI 的 schema 异常
7. **AbortSignal 包装**：工具支持中止信号

### 工具定义适配器

pi-agent-core 的 `AgentTool` 的 `execute` 签名与 pi-coding-agent 的 `ToolDefinition` 不同，`pi-tool-definition-adapter.ts` 中适配：

```typescript
export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.label ?? name,
    description: tool.description ?? "",
    parameters: tool.parameters,
    execute: async (toolCallId, params, onUpdate, _ctx, signal) => {
      // pi-coding-agent 签名与 pi-agent-core 不同
      return await tool.execute(toolCallId, params, signal, onUpdate);
    },
  }));
}
```

### 工具拆分策略

`splitSdkTools()` 将所有工具通过 `customTools` 传递：

```typescript
export function splitSdkTools(options: { tools: AnyAgentTool[]; sandboxEnabled: boolean }) {
  return {
    builtInTools: [], // 置空，替代全部
    customTools: toToolDefinitions(options.tools),
  };
}
```

确保 OpenClaw 的策略过滤、沙箱集成及扩展工具在各提供者间一致。

## 系统提示构建

系统提示由 `buildAgentSystemPrompt()` (`system-prompt.ts`) 构建。它组装完整提示，包括工具、工具调用风格、安全防护、OpenClaw CLI 参考、技能、文档、工作区、沙箱、消息、回复标签、语音、静音回复、心跳、运行时元数据，以及启用时的内存和反应，还有可选的上下文文件和额外系统提示内容。子代理会使用的最简提示模式会裁剪部分内容。

提示在会话创建后通过 `applySystemPromptOverrideToSession()` 应用：

```typescript
const systemPromptOverride = createSystemPromptOverride(appendPrompt);
applySystemPromptOverrideToSession(session, systemPromptOverride);
```

## 会话管理

### 会话文件

会话是带树结构（通过 id/parentId 关联）的 JSONL 文件。Pi 使用 `SessionManager` 处理持久化：

```typescript
const sessionManager = SessionManager.open(params.sessionFile);
```

OpenClaw 用 `guardSessionManager()` 包裹以提升工具结果安全。

### 会话缓存

`session-manager-cache.ts` 缓存 `SessionManager` 实例，避免多次文件解析：

```typescript
await prewarmSessionFile(params.sessionFile);
sessionManager = SessionManager.open(params.sessionFile);
trackSessionManagerAccess(params.sessionFile);
```

### 历史限制

`limitHistoryTurns()` 按频道类型（私聊 vs 群聊）裁剪会话历史。

### 压缩

当上下文溢出时触发自动压缩，手动压缩调用：

```typescript
const compactResult = await compactEmbeddedPiSessionDirect({
  sessionId, sessionFile, provider, model, ...
});
```

## 认证与模型解析

### 认证配置

OpenClaw 维护多 API Key 提供者的认证配置库：

```typescript
const authStore = ensureAuthProfileStore(agentDir, { allowKeychainPrompt: false });
const profileOrder = resolveAuthProfileOrder({ cfg, store: authStore, provider, preferredProfile });
```

失败时轮换配置，并跟踪冷却：

```typescript
await markAuthProfileFailure({ store, profileId, reason, cfg, agentDir });
const rotated = await advanceAuthProfile();
```

### 模型解析

```typescript
import { resolveModel } from "./pi-embedded-runner/model.js";

const { model, error, authStorage, modelRegistry } = resolveModel(
  provider,
  modelId,
  agentDir,
  config,
);

// 使用 pi 的 ModelRegistry 与 AuthStorage
authStorage.setRuntimeApiKey(model.provider, apiKeyInfo.apiKey);
```

### 故障切换

当配置了故障切换时遇到错误触发：

```typescript
if (fallbackConfigured && isFailoverErrorMessage(errorText)) {
  throw new FailoverError(errorText, {
    reason: promptFailoverReason ?? "unknown",
    provider,
    model: modelId,
    profileId,
    status: resolveFailoverStatus(promptFailoverReason),
  });
}
```

## Pi 扩展

OpenClaw 加载自定义 pi 扩展以实现特殊行为：

### 压缩保护

`src/agents/pi-extensions/compaction-safeguard.ts` 为压缩加护栏，包括自适应令牌预算、工具失败和文件操作摘要：

```typescript
if (resolveCompactionMode(params.cfg) === "safeguard") {
  setCompactionSafeguardRuntime(params.sessionManager, { maxHistoryShare });
  paths.push(resolvePiExtensionPath("compaction-safeguard"));
}
```

### 上下文修剪

`src/agents/pi-extensions/context-pruning.ts` 实现基于缓存 TTL 的上下文修剪：

```typescript
if (cfg?.agents?.defaults?.contextPruning?.mode === "cache-ttl") {
  setContextPruningRuntime(params.sessionManager, {
    settings,
    contextWindowTokens,
    isToolPrunable,
    lastCacheTouchAt,
  });
  paths.push(resolvePiExtensionPath("context-pruning"));
}
```

## 流式与块回复

### 块切分

`EmbeddedBlockChunker` 管理流式文本分割成离散回复块：

```typescript
const blockChunker = blockChunking ? new EmbeddedBlockChunker(blockChunking) : null;
```

### 思考/最终标签剥离

流式输出会被处理，剥离 `<think>`/`<thinking>` 块，同时提取 `<final>` 内容：

```typescript
const stripBlockTags = (text: string, state: { thinking: boolean; final: boolean }) => {
  // 剥离 <think>...</think> 内容
  // 若 enforceFinalTag，仅返回 <final>...</final> 内容
};
```

### 回复指令

解析并提取回复指令如 `[[media:url]]`, `[[voice]]`, `[[reply:id]]`：

```typescript
const { text: cleanedText, mediaUrls, audioAsVoice, replyToId } = consumeReplyDirectives(chunk);
```

## 错误处理

### 错误分类

`pi-embedded-helpers.ts` 对错误进行分类以便恰当处理：

```typescript
isContextOverflowError(errorText)     // 上下文过大
isCompactionFailureError(errorText)   // 压缩失败
isAuthAssistantError(lastAssistant)   // 认证失败
isRateLimitAssistantError(...)        // 被限流
isFailoverAssistantError(...)         // 需要故障切换
classifyFailoverReason(errorText)     // "auth" | "rate_limit" | "quota" | "timeout" | ...
```

### 思考层级降级

若思考层级不受支持，自动降级：

```typescript
const fallbackThinking = pickFallbackThinkingLevel({
  message: errorText,
  attempted: attemptedThinking,
});
if (fallbackThinking) {
  thinkLevel = fallbackThinking;
  continue;
}
```

## 沙箱集成

启用沙箱模式时限制工具和路径：

```typescript
const sandbox = await resolveSandboxContext({
  config: params.config,
  sessionKey: sandboxSessionKey,
  workspaceDir: resolvedWorkspace,
});

if (sandboxRoot) {
  // 使用沙箱化的 read/edit/write 工具
  // Exec 在容器内执行
  // 浏览器使用桥接 URL
}
```

## 提供者特定处理

### Anthropic

- 去除拒绝魔法字符串
- 连续角色轮次验证
- Claude Code 参数兼容性

### Google/Gemini

- 轮次排序修复（`applyGoogleTurnOrderingFix`）
- 工具 schema 清理（`sanitizeToolsForGoogle`）
- 会话历史清理（`sanitizeSessionHistory`）

### OpenAI

- Codex 模型的 `apply_patch` 工具
- 思考层级降级处理

## TUI 集成

OpenClaw 还具有本地 TUI 模式，直接使用 pi-tui 组件：

```typescript
// src/tui/tui.ts
import { ... } from "@mariozechner/pi-tui";
```

提供与 pi 原生模式类似的交互式终端体验。

## 与 Pi CLI 的关键差异

| 比较项        | Pi CLI                       | OpenClaw 嵌入式                                                                          |
| ------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| 调用方式      | `pi` 命令 / RPC              | 通过 SDK 的 `createAgentSession()`                                                       |
| 工具          | 默认编码工具                 | 自定义 OpenClaw 工具套件                                                                 |
| 系统提示      | AGENTS.md + 提示文件          | 按频道/上下文动态定制                                                                    |
| 会话存储      | `~/.pi/agent/sessions/`      | `~/.openclaw/agents/<agentId>/sessions/`（或 `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`） |
| 认证          | 单一凭据                     | 多配置轮换                                                                              |
| 扩展          | 从磁盘加载                   | 程序化加载 + 磁盘路径                                                                    |
| 事件处理      | TUI 渲染                    | 基于回调（如 onBlockReply）                                                              |

## 未来考虑

待改进领域：

1. **工具签名统一**：目前在 pi-agent-core 和 pi-coding-agent 签名间适配
2. **会话管理包装**：`guardSessionManager` 提升安全但增复杂度
3. **扩展加载**：可更直接使用 pi 的 `ResourceLoader`
4. **流式处理复杂度**：`subscribeEmbeddedPiSession` 代码膨胀
5. **提供者特征处理**：大量提供者特定代码，pi 可能自行处理

## 测试

Pi 集成覆盖以下测试套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-auth-json.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-embedded-helpers*.test.ts`
- `src/agents/pi-embedded-runner*.test.ts`
- `src/agents/pi-embedded-runner/**/*.test.ts`
- `src/agents/pi-embedded-subscribe*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-tool-definition-adapter*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-extensions/**/*.test.ts`

实时/可选：

- `src/agents/pi-embedded-runner-extraparams.live.test.ts`（启用需设置 `OPENCLAW_LIVE_TEST=1`）

当前运行命令见[Pi 开发工作流](/pi-dev)。
