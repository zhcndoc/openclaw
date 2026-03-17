---
summary: "计划：一个统一的插件 SDK 和运行时，支持所有消息连接器"
read_when:
  - 定义或重构插件架构时
  - 将频道连接器迁移到插件 SDK/运行时时
title: "插件 SDK 重构"
---

# 插件 SDK + 运行时重构计划

目标：每个消息连接器都是一个插件（捆绑或外部），使用统一稳定的 API。  
禁止插件直接从 `src/**` 导入，所有依赖必须通过 SDK 或运行时访问。

## 为什么现在需要

- 目前连接器混用了多种模式：直接导入核心、仅分发桥接、以及自定义辅助工具。  
- 这导致升级脆弱，且阻碍了干净的外部插件接口设计。

## 目标架构（两层）

### 1) 插件 SDK（编译时，稳定，可发布）

范围：类型、辅助函数和配置工具。无运行时状态，无副作用。

内容示例：

- Types: `ChannelPlugin`, adapters, `ChannelMeta`, `ChannelCapabilities`, `ChannelDirectoryEntry`.  
- 配置辅助工具：`buildChannelConfigSchema`、`setAccountEnabledInConfigSection`、`deleteAccountFromConfigSection`、  
  `applyAccountNameToChannelSection`。  
- 配对辅助工具：`PAIRING_APPROVED_MESSAGE`、`formatPairingApproveHint`。  
- 设置入口：host 拥有的 `setup` + `setupWizard`；避免开放宽泛的公共入门助手。  
- 工具参数助手：`createActionGate`、`readStringParam`、`readNumberParam`、`readReactionParams`、`jsonResult`。  
- 文档链接助手：`formatDocsLink`。

交付方式：

- 作为 `openclaw/plugin-sdk` 发布（或由核心导出，路径为 `openclaw/plugin-sdk`）。  
- 使用语义版本控制，提供明确的稳定性保证。

### 2) 插件运行时（执行接口，注入）

范围：所有涉及核心运行时行为的功能。  
通过 `OpenClawPluginApi.runtime` 访问，插件绝不直接导入 `src/**`。

建议接口（简洁且完整）：

```ts
export type PluginRuntime = {
  channel: {
    text: {
      chunkMarkdownText(text: string, limit: number): string[];
      resolveTextChunkLimit(cfg: OpenClawConfig, channel: string, accountId?: string): number;
      hasControlCommand(text: string, cfg: OpenClawConfig): boolean;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher(params: {
        ctx: unknown;
        cfg: unknown;
        dispatcherOptions: {
          deliver: (payload: {
            text?: string;
            mediaUrls?: string[];
            mediaUrl?: string;
          }) => void | Promise<void>;
          onError?: (err: unknown, info: { kind: string }) => void;
        };
      }): Promise<void>;
      createReplyDispatcherWithTyping?: unknown; // 适配 Teams 风格流程
    };
    routing: {
      resolveAgentRoute(params: {
        cfg: unknown;
        channel: string;
        accountId: string;
        peer: { kind: RoutePeerKind; id: string };
      }): { sessionKey: string; accountId: string };
    };
    pairing: {
      buildPairingReply(params: { channel: string; idLine: string; code: string }): string;
      readAllowFromStore(channel: string): Promise<string[]>;
      upsertPairingRequest(params: {
        channel: string;
        id: string;
        meta?: { name?: string };
      }): Promise<{ code: string; created: boolean }>;
    };
    media: {
      fetchRemoteMedia(params: { url: string }): Promise<{ buffer: Buffer; contentType?: string }>;
      saveMediaBuffer(
        buffer: Uint8Array,
        contentType: string | undefined,
        direction: "inbound" | "outbound",
        maxBytes: number,
      ): Promise<{ path: string; contentType?: string }>;
    };
    mentions: {
      buildMentionRegexes(cfg: OpenClawConfig, agentId?: string): RegExp[];
      matchesMentionPatterns(text: string, regexes: RegExp[]): boolean;
    };
    groups: {
      resolveGroupPolicy(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
      ): {
        allowlistEnabled: boolean;
        allowed: boolean;
        groupConfig?: unknown;
        defaultConfig?: unknown;
      };
      resolveRequireMention(
        cfg: OpenClawConfig,
        channel: string,
        accountId: string,
        groupId: string,
        override?: boolean,
      ): boolean;
    };
    debounce: {
      createInboundDebouncer<T>(opts: {
        debounceMs: number;
        buildKey: (v: T) => string | null;
        shouldDebounce: (v: T) => boolean;
        onFlush: (entries: T[]) => Promise<void>;
        onError?: (err: unknown) => void;
      }): { push: (v: T) => void; flush: () => Promise<void> };
      resolveInboundDebounceMs(cfg: OpenClawConfig, channel: string): number;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers(params: {
        useAccessGroups: boolean;
        authorizers: Array<{ configured: boolean; allowed: boolean }>;
      }): boolean;
    };
  };
  logging: {
    shouldLogVerbose(): boolean;
    getChildLogger(name: string): PluginLogger;
  };
  state: {
    resolveStateDir(cfg: OpenClawConfig): string;
  };
};
```

备注：

- 运行时是访问核心行为的唯一途径。  
- SDK 有意设计得轻量且稳定。  
- 每个运行时方法均映射到核心已有实现（无重复代码）。

## 迁移计划（分阶段，安全）

### 第 0 阶段：搭建框架

- 引入 `openclaw/plugin-sdk`。  
- 在 `OpenClawPluginApi` 添加 `api.runtime`，接口如上所示。  
- 在过渡期内保持旧导入（并添加废弃警告）。

### 第 1 阶段：桥接清理（低风险）

- 用 `api.runtime` 替换各扩展的 `core-bridge.ts`。  
- 先迁移 BlueBubbles、Zalo、Zalo Personal（已接近完成）。  
- 删除重复的桥接代码。

### 第 2 阶段：轻量化直接导入插件

- 迁移 Matrix 至 SDK + 运行时。  
- 验证入门、目录和群提及逻辑。

### 第 3 阶段：重量级直接导入插件

- 迁移 MS Teams（最大的运行时助手集）。  
- 确保回复/输入状态语义与当前行为一致。

### 第 4 阶段：iMessage 插件化

- 将 iMessage 移动至 `extensions/imessage`。  
- 用 `api.runtime` 替代直接核心调用。  
- 保持配置键、CLI 行为和文档不变。

### 第 5 阶段：强制执行

- 添加 lint 规则/CI 检查：禁止 `extensions/**` 直接导入 `src/**`。  
- 添加插件 SDK/版本兼容性检查（运行时 + SDK 语义版本控制）。

## 兼容性和版本控制

- SDK：语义版本控制，发布，有文档说明变更。  
- 运行时：随核心版本同步版本号，添加 `api.runtime.version`。  
- 插件注明所需运行时版本范围（如 `openclawRuntime: ">=2026.2.0"`）。

## 测试策略

- 适配器层单元测试（运行时方法调用真实核心实现）。  
- 每个插件的金丝雀测试：确保路由、配对、白名单、提及限制等功能无回归。  
- CI 内使用单个端到端插件样例（安装+运行+冒烟测试）。

## 待解决问题

- SDK 类型放在哪里：单独包还是核心导出？  
- 运行时类型分发：放在 SDK（仅类型）还是核心？  
- 如何为捆绑和外部插件暴露文档链接？  
- 过渡期间是否允许仓内插件有限度直接导入核心代码？

## 成功标准

- 所有频道连接器均为使用 SDK + 运行时的插件。  
- 无 `extensions/**` 直接导入 `src/**`。  
- 新连接器模板仅依赖 SDK + 运行时。  
- 外部插件可在无核心源码访问的情况下开发和更新。

Related docs: [Plugins](/tools/plugin), [Channels](/channels/index), [Configuration](/gateway/configuration).

## Implemented channel-owned seams

Recent refactor work widened the channel plugin contract so core can stop owning  
channel-specific UX and routing behavior:

- `messaging.buildCrossContextComponents`: channel-owned cross-context UI markers  
  (for example Discord components v2 containers)  
- `messaging.enableInteractiveReplies`: channel-owned reply normalization toggles  
  (for example Slack interactive replies)  
- `messaging.resolveOutboundSessionRoute`: channel-owned outbound session routing  
- `status.formatCapabilitiesProbe` / `status.buildCapabilitiesDiagnostics`: channel-owned  
  `/channels capabilities` probe display and extra audits/scopes  
- `threading.resolveAutoThreadId`: channel-owned same-conversation auto-threading  
- `threading.resolveReplyTransport`: channel-owned reply-vs-thread delivery mapping  
- `actions.requiresTrustedRequesterSender`: channel-owned privileged action trust gates  
- `execApprovals.*`: channel-owned exec approval surface state, forwarding suppression,  
  pending payload UX, and pre-delivery hooks  
- `lifecycle.onAccountConfigChanged` / `lifecycle.onAccountRemoved`: channel-owned cleanup on  
  config mutation/removal  
- `allowlist.supportsScope`: channel-owned allowlist scope advertisement

These hooks should be preferred over new `channel === "discord"` / `telegram`  
branches in shared core flows.
