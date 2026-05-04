---
summary: "OpenClaw 插件的测试工具和模式"
title: "插件测试"
sidebarTitle: "测试"
read_when:
  - 你正在为插件编写测试
  - 你需要来自插件 SDK 的测试工具
  - 你想了解内置插件的契约测试
---

OpenClaw 插件的测试工具、模式和 lint 约束参考。

<Tip>
  **在找测试示例吗？** 使用方法指南中包含了完整的测试示例：
  [Channel 插件测试](/plugins/sdk-channel-plugins#step-6-test) 和
  [Provider 插件测试](/plugins/sdk-provider-plugins#step-6-test)。
</Tip>

## 测试工具

**插件 API mock 导入：** `openclaw/plugin-sdk/plugin-test-api`

**Agent 运行时契约导入：** `openclaw/plugin-sdk/agent-runtime-test-contracts`

**Channel 契约导入：** `openclaw/plugin-sdk/channel-contract-testing`

**Channel 测试辅助导入：** `openclaw/plugin-sdk/channel-test-helpers`

**Channel 目标测试导入：** `openclaw/plugin-sdk/channel-target-testing`

**插件契约导入：** `openclaw/plugin-sdk/plugin-test-contracts`

**插件运行时测试导入：** `openclaw/plugin-sdk/plugin-test-runtime`

**Provider 契约导入：** `openclaw/plugin-sdk/provider-test-contracts`

**Provider HTTP mock 导入：** `openclaw/plugin-sdk/provider-http-test-mocks`

**环境/网络测试导入：** `openclaw/plugin-sdk/test-env`

**通用 fixture 导入：** `openclaw/plugin-sdk/test-fixtures`

**Node 内置 mock 导入：** `openclaw/plugin-sdk/test-node-mocks`

新插件测试优先使用下面这些更聚焦的子路径。广义的
`openclaw/plugin-sdk/testing` 入口仅用于旧版兼容。
仓库守卫会拒绝来自 `plugin-sdk/testing` 和
`plugin-sdk/test-utils` 的新的真实导入；这些名称仅作为已弃用的兼容
表面保留给外部插件和兼容性记录测试。

```typescript
import {
  shouldAckReaction,
  removeAckReactionAfterReply,
} from "openclaw/plugin-sdk/channel-feedback";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";
import { AUTH_PROFILE_RUNTIME_CONTRACT } from "openclaw/plugin-sdk/agent-runtime-test-contracts";
import { createTestPluginApi } from "openclaw/plugin-sdk/plugin-test-api";
import { expectChannelInboundContextContract } from "openclaw/plugin-sdk/channel-contract-testing";
import { createStartAccountContext } from "openclaw/plugin-sdk/channel-test-helpers";
import { describePluginRegistrationContract } from "openclaw/plugin-sdk/plugin-test-contracts";
import { registerSingleProviderPlugin } from "openclaw/plugin-sdk/plugin-test-runtime";
import { describeOpenAIProviderRuntimeContract } from "openclaw/plugin-sdk/provider-test-contracts";
import { getProviderHttpMocks } from "openclaw/plugin-sdk/provider-http-test-mocks";
import { withEnv, withFetchPreconnect, withServer } from "openclaw/plugin-sdk/test-env";
import {
  bundledPluginRoot,
  createCliRuntimeCapture,
  typedCases,
} from "openclaw/plugin-sdk/test-fixtures";
import { mockNodeBuiltinModule } from "openclaw/plugin-sdk/test-node-mocks";
```

### 可用导出

| 导出                                                 | 用途                                                                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                | 为直接注册的单元测试构建一个最小插件 API mock。导入自 `plugin-sdk/plugin-test-api`                                                      |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | 供原生 agent 运行时适配器使用的共享 auth-profile 契约 fixture。导入自 `plugin-sdk/agent-runtime-test-contracts`                         |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | 供原生 agent 运行时适配器使用的共享“抑制投递回复”契约 fixture。导入自 `plugin-sdk/agent-runtime-test-contracts`                          |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | 供原生 agent 运行时适配器使用的共享回退分类契约 fixture。导入自 `plugin-sdk/agent-runtime-test-contracts`                               |
| `createParameterFreeTool`                            | 为原生运行时契约测试构建动态工具 schema fixture。导入自 `plugin-sdk/agent-runtime-test-contracts`                                       |
| `expectChannelInboundContextContract`                | 断言 channel 入站上下文形状。导入自 `plugin-sdk/channel-contract-testing`                                                                |
| `installChannelOutboundPayloadContractSuite`         | 安装 channel 出站 payload 契约用例。导入自 `plugin-sdk/channel-contract-testing`                                                         |
| `createStartAccountContext`                          | 构建 channel 账户生命周期上下文。导入自 `plugin-sdk/channel-test-helpers`                                                                |
| `installChannelActionsContractSuite`                 | 安装通用的 channel 消息动作契约用例。导入自 `plugin-sdk/channel-test-helpers`                                                            |
| `installChannelSetupContractSuite`                   | 安装通用的 channel 设置契约用例。导入自 `plugin-sdk/channel-test-helpers`                                                                 |
| `installChannelStatusContractSuite`                  | 安装通用的 channel 状态契约用例。导入自 `plugin-sdk/channel-test-helpers`                                                                 |
| `expectDirectoryIds`                                 | 断言来自目录列表函数的 channel 目录 id。导入自 `plugin-sdk/channel-test-helpers`                                                        |
| `assertBundledChannelEntries`                        | 断言打包后的 channel 入口暴露出预期的公开契约。导入自 `plugin-sdk/channel-test-helpers`                                                  |
| `formatEnvelopeTimestamp`                            | 格式化确定性的封装时间戳。导入自 `plugin-sdk/channel-test-helpers`                                                                       |
| `expectPairingReplyText`                             | 断言 channel 配对回复文本并提取其代码。导入自 `plugin-sdk/channel-test-helpers`                                                         |
| `describePluginRegistrationContract`                 | 安装插件注册契约检查。导入自 `plugin-sdk/plugin-test-contracts`                                                                           |
| `registerSingleProviderPlugin`                       | 在加载器 smoke 测试中注册一个 provider 插件。导入自 `plugin-sdk/plugin-test-runtime`                                                    |
| `registerProviderPlugin`                             | 从一个插件中捕获所有 provider 类型。导入自 `plugin-sdk/plugin-test-runtime`                                                             |
| `registerProviderPlugins`                            | 跨多个插件捕获 provider 注册。导入自 `plugin-sdk/plugin-test-runtime`                                                                    |
| `requireRegisteredProvider`                          | 断言 provider 集合包含某个 id。导入自 `plugin-sdk/plugin-test-runtime`                                                                   |
| `createRuntimeEnv`                                   | 构建一个 mock 的 CLI/plugin 运行时环境。导入自 `plugin-sdk/plugin-test-runtime`                                                          |
| `createPluginSetupWizardStatus`                      | 为 channel 插件构建设置状态辅助工具。导入自 `plugin-sdk/plugin-test-runtime`                                                             |
| `describeOpenAIProviderRuntimeContract`              | 安装 provider 家族运行时契约检查。导入自 `plugin-sdk/provider-test-contracts`                                                            |
| `expectPassthroughReplayPolicy`                      | 断言 provider 回放策略会透传 provider 拥有的工具和元数据。导入自 `plugin-sdk/provider-test-contracts`                                      |
| `runRealtimeSttLiveTest`                             | 使用共享音频 fixture 运行一个实时语音转文字（STT）provider 测试。导入自 `plugin-sdk/provider-test-contracts`                               |
| `normalizeTranscriptForMatch`                        | 在进行模糊断言前规范化实时转写输出。导入自 `plugin-sdk/provider-test-contracts`                                                            |
| `expectExplicitVideoGenerationCapabilities`          | 断言视频 provider 声明了明确的生成模式能力。导入自 `plugin-sdk/provider-test-contracts`                                                   |
| `expectExplicitMusicGenerationCapabilities`          | 断言音乐 provider 声明了明确的生成/编辑能力。导入自 `plugin-sdk/provider-test-contracts`                                                  |
| `mockSuccessfulDashscopeVideoTask`                   | 安装一个成功的 DashScope 兼容视频任务响应。导入自 `plugin-sdk/provider-test-contracts`                                                   |
| `getProviderHttpMocks`                               | 访问可选启用的 provider HTTP/auth Vitest mocks。导入自 `plugin-sdk/provider-http-test-mocks`                                            |
| `installProviderHttpMockCleanup`                     | 在每个测试后重置 provider HTTP/auth mocks。导入自 `plugin-sdk/provider-http-test-mocks`                                                  |
| `installCommonResolveTargetErrorCases`               | 用于目标解析错误处理的共享测试用例。导入自 `plugin-sdk/channel-target-testing`                                                          |
| `shouldAckReaction`                                  | 检查 channel 是否应添加 ack reaction。导入自 `plugin-sdk/channel-feedback`                                                              |
| `removeAckReactionAfterReply`                        | 在回复投递后移除 ack reaction。导入自 `plugin-sdk/channel-feedback`                                                                      |
| `createTestRegistry`                                 | 构建 channel 插件 registry fixture。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                         |
| `createEmptyPluginRegistry`                          | 构建一个空的插件 registry fixture。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                          |
| `setActivePluginRegistry`                            | 为插件运行时测试安装一个 registry fixture。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                   |
| `createRequestCaptureJsonFetch`                      | 在媒体辅助测试中捕获 JSON fetch 请求。导入自 `plugin-sdk/test-env`                                                                       |
| `withServer`                                         | 针对一个可销毁的本地 HTTP 服务器运行测试。导入自 `plugin-sdk/test-env`                                                                   |
| `createMockIncomingRequest`                          | 构建一个最小的传入 HTTP 请求对象。导入自 `plugin-sdk/test-env`                                                                           |
| `withFetchPreconnect`                                | 在安装了 preconnect 钩子的情况下运行 fetch 测试。导入自 `plugin-sdk/test-env`                                                           |
| `withEnv` / `withEnvAsync`                           | 临时修改环境变量。导入自 `plugin-sdk/test-env`                                                                                           |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | 创建隔离的文件系统测试 fixture。导入自 `plugin-sdk/test-env`                                                                             |
| `createMockServerResponse`                           | 创建一个最小的 HTTP server response mock。导入自 `plugin-sdk/test-env`                                                                    |
| `createCliRuntimeCapture`                            | 在测试中捕获 CLI 运行时输出。导入自 `plugin-sdk/test-fixtures`                                                                           |
| `importFreshModule`                                  | 使用新的查询 token 导入一个 ESM 模块，以绕过模块缓存。导入自 `plugin-sdk/test-fixtures`                                                  |
| `bundledPluginRoot` / `bundledPluginFile`            | 解析内置插件源码或 dist fixture 路径。导入自 `plugin-sdk/test-fixtures`                                                                   |
| `mockNodeBuiltinModule`                              | 安装窄范围的 Node 内置 Vitest mocks。导入自 `plugin-sdk/test-node-mocks`                                                                 |
| `createSandboxTestContext`                           | 构建沙箱测试上下文。导入自 `plugin-sdk/test-fixtures`                                                                                     |
| `writeSkill`                                         | 写入 skill fixture。导入自 `plugin-sdk/test-fixtures`                                                                                     |
| `makeAgentAssistantMessage`                          | 构建 agent 转写消息 fixture。导入自 `plugin-sdk/test-fixtures`                                                                             |
| `peekSystemEvents` / `resetSystemEventsForTest`      | 检查并重置系统事件 fixture。导入自 `plugin-sdk/test-fixtures`                                                                             |
| `sanitizeTerminalText`                               | 为断言净化终端输出。导入自 `plugin-sdk/test-fixtures`                                                                                     |
| `countLines` / `hasBalancedFences`                   | 断言分块输出形状。导入自 `plugin-sdk/test-fixtures`                                                                                        |
| `runProviderCatalog`                                 | 使用测试依赖执行 provider catalog hook                                                                                                   |
| `resolveProviderWizardOptions`                       | 在契约测试中解析 provider 设置向导选项                                                                                                    |
| `resolveProviderModelPickerEntries`                  | 在契约测试中解析 provider 模型选择器条目                                                                                                   |
| `buildProviderPluginMethodChoice`                    | 为断言构建 provider 向导 choice id                                                                                                        |
| `setProviderWizardProvidersResolverForTest`          | 为隔离测试注入 provider 向导 providers                                                                                                    |
| `createProviderUsageFetch`                           | 构建 provider 使用情况 fetch fixture                                                                                                       |
| `useFrozenTime` / `useRealTime`                      | 为对时间敏感的测试冻结和恢复计时器。导入自 `plugin-sdk/test-env`                                                                           |
| `createTestWizardPrompter`                           | 构建一个 mock 的设置向导提示器                                                                                                            |
| `createRuntimeTaskFlow`                              | 创建隔离的运行时任务流状态                                                                                                                |
| `typedCases`                                         | 为表驱动测试保留字面量类型。导入自 `plugin-sdk/test-fixtures`                                                                              |

内置插件契约套件也会为仅测试用的 registry、manifest、public-artifact 和运行时
fixture 辅助工具使用 SDK 测试子路径。依赖于内置 OpenClaw 清单的仅核心套件保留在
`src/plugins/contracts` 下。新的扩展测试请保持在已文档化的、聚焦的 SDK 子路径上，例如
`plugin-sdk/plugin-test-api`、`plugin-sdk/channel-contract-testing`、
`plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/channel-test-helpers`、
`plugin-sdk/plugin-test-contracts`、`plugin-sdk/plugin-test-runtime`、
`plugin-sdk/provider-test-contracts`、`plugin-sdk/provider-http-test-mocks`、
`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures`，而不要直接导入广义的
`plugin-sdk/testing` 兼容入口、仓库 `src/**` 文件或仓库 `test/helpers/*` 桥接。

### 类型

聚焦的测试子路径也会重新导出在测试文件中很有用的类型：

```typescript
import type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
} from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-types";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## 测试目标解析

使用 `installCommonResolveTargetErrorCases` 为频道目标解析添加标准错误案例：

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";

describe("my-channel target resolution", () => {
  installCommonResolveTargetErrorCases({
    resolveTarget: ({ to, mode, allowFrom }) => {
      // 你的频道目标解析逻辑
      return myChannelResolveTarget({ to, mode, allowFrom });
    },
    implicitAllowFrom: ["user1", "user2"],
  });

  // 添加频道特定的测试案例
  it("should resolve @username targets", () => {
    // ...
  });
});
```

## 测试模式

### 测试注册契约

将手写的 `api` mock 传给 `register(api)` 的单元测试并不会覆盖 OpenClaw 加载器的接受门控。请为插件依赖的每个注册入口至少添加一个由 loader 驱动的冒烟测试，尤其是 hooks 和诸如 memory 这类独占能力。

真实加载器会在缺少必需元数据，或者插件调用了它不拥有的能力 API 时失败。例如，`api.registerHook(...)` 需要提供 hook 名称，而 `api.registerMemoryCapability(...)` 需要插件清单或导出的入口声明 `kind: "memory"`。

### 测试运行时配置访问

在测试打包后的频道插件时，优先使用来自 `openclaw/plugin-sdk/channel-test-helpers` 的共享插件运行时 mock。其已弃用的 `runtime.config.loadConfig()` 和 `runtime.config.writeConfigFile(...)` mock 默认会抛出错误，因此测试可以捕获对兼容性 API 的新用法。只有当测试明确覆盖旧版兼容行为时，才应覆盖这些 mock。

### 频道插件的单元测试

```typescript
import { describe, it, expect, vi } from "vitest";

describe("my-channel plugin", () => {
  it("should resolve account from config", () => {
    const cfg = {
      channels: {
        "my-channel": {
          token: "test-token",
          allowFrom: ["user1"],
        },
      },
    };

    const account = myPlugin.setup.resolveAccount(cfg, undefined);
    expect(account.token).toBe("test-token");
  });

  it("should inspect account without materializing secrets", () => {
    const cfg = {
      channels: {
        "my-channel": { token: "test-token" },
      },
    };

    const inspection = myPlugin.setup.inspectAccount(cfg, undefined);
    expect(inspection.configured).toBe(true);
    expect(inspection.tokenStatus).toBe("available");
    // 不暴露 token 值
    expect(inspection).not.toHaveProperty("token");
  });
});
```

### 提供者插件的单元测试

```typescript
import { describe, it, expect } from "vitest";

describe("my-provider plugin", () => {
  it("should resolve dynamic models", () => {
    const model = myProvider.resolveDynamicModel({
      modelId: "custom-model-v2",
      // ... 上下文
    });

    expect(model.id).toBe("custom-model-v2");
    expect(model.provider).toBe("my-provider");
    expect(model.api).toBe("openai-completions");
  });

  it("should return catalog when API key is available", async () => {
    const result = await myProvider.catalog.run({
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
      // ... 上下文
    });

    expect(result?.provider?.models).toHaveLength(2);
  });
});
```

### 模拟插件运行时

对于使用 `createPluginRuntimeStore` 的代码，请在测试中 mock 运行时：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "test-plugin",
  errorMessage: "测试运行时未设置",
});

// 在测试设置中
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... 其他 mock
  },
  config: {
    current: vi.fn(() => ({}) as const),
    mutateConfigFile: vi.fn(),
    replaceConfigFile: vi.fn(),
  },
  // ... 其他命名空间
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// 测试结束后
store.clearRuntime();
```

### 使用按实例 stub 进行测试

优先使用按实例 stub，而不是修改原型：

```typescript
// 推荐：按实例 stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// 避免：修改原型
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 契约测试（仓库内插件）

打包内置插件具有契约测试，用于验证注册所有权：

```bash
pnpm test -- src/plugins/contracts/
```

这些测试会断言：

- 哪些插件注册了哪些 providers
- 哪些插件注册了哪些 speech providers
- 注册形状是否正确
- 运行时契约是否符合要求

### 运行指定范围的测试

对于特定插件：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

仅运行契约测试：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth-choice.contract.test.ts
pnpm test -- src/plugins/contracts/runtime-seams.contract.test.ts
```

## Lint 强制规则（仓库内插件）

`pnpm check` 会对仓库内插件强制执行三条规则：

1. **禁止单体根导入** -- 拒绝使用 `openclaw/plugin-sdk` 根入口导出
2. **禁止直接导入 `src/`** -- 插件不能直接导入 `../../src/`
3. **禁止自我导入** -- 插件不能导入它自己的 `plugin-sdk/<name>` 子路径

外部插件不受这些 lint 规则约束，但仍建议遵循相同模式。

## 测试配置

OpenClaw 使用带有 V8 覆盖率阈值的 Vitest。对于插件测试：

```bash
# 运行所有测试
pnpm test

# 运行特定插件测试
pnpm test -- <bundled-plugin-root>/my-channel/src/channel.test.ts

# 使用特定测试名称过滤器运行
pnpm test -- <bundled-plugin-root>/my-channel/ -t "resolves account"

# 运行覆盖率
pnpm test:coverage
```

如果本地运行导致内存压力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## 相关内容

- [SDK 概览](/plugins/sdk-overview) -- 导入约定
- [SDK 频道插件](/plugins/sdk-channel-plugins) -- 频道插件接口
- [SDK 提供者插件](/plugins/sdk-provider-plugins) -- 提供者插件钩子
- [构建插件](/plugins/building-plugins) -- 入门指南
