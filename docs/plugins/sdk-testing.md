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

这些子路径是 OpenClaw 自带插件测试的仓库本地源入口点。它们不是面向第三方插件发布的 `package.json` 导出项，并且它们可能会导入 Vitest 或其他仅限仓库内部使用的测试依赖。

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
import { createOpenClawTestState } from "openclaw/plugin-sdk/test-state";
import { withEnv, withFetchPreconnect, withServer } from "openclaw/plugin-sdk/test-env";
import { isLiveTestEnabled } from "openclaw/plugin-sdk/test-live";
import { createRequestCaptureJsonFetch } from "openclaw/plugin-sdk/test-media-understanding";
import {
  bundledPluginRoot,
  createCliRuntimeCapture,
  typedCases,
} from "openclaw/plugin-sdk/test-fixtures";
import { mockNodeBuiltinModule } from "openclaw/plugin-sdk/test-node-mocks";
```

Use these focused subpaths for bundled plugin tests. The former
`openclaw/plugin-sdk/testing` barrel was repo-local, excluded from shipped
packages, and has been removed. The former `openclaw/plugin-sdk/test-utils`
alias was removed with it. `pnpm run lint:plugins:no-extension-test-core-imports`
(`scripts/check-no-extension-test-core-imports.ts`) keeps extension tests on
the focused test subpaths above.

### 可用导出项

| Export                                                                    | Purpose                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                                     | Build a minimal plugin API mock for direct registration unit tests. Import from `plugin-sdk/plugin-test-api`                                |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                                           | Shared auth-profile contract fixture for native agent runtime adapters. Import from `plugin-sdk/agent-runtime-test-contracts`               |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                                      | Shared delivery suppression contract fixture for native agent runtime adapters. Import from `plugin-sdk/agent-runtime-test-contracts`       |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                                       | Shared fallback-classification contract fixture for native agent runtime adapters. Import from `plugin-sdk/agent-runtime-test-contracts`    |
| `createParameterFreeTool`                                                 | Build dynamic-tool schema fixtures for native runtime contract tests. Import from `plugin-sdk/agent-runtime-test-contracts`                 |
| `expectChannelInboundContextContract`                                     | Assert channel inbound context shape. Import from `plugin-sdk/channel-contract-testing`                                                     |
| `installChannelOutboundPayloadContractSuite`                              | Install channel outbound payload contract cases. Import from `plugin-sdk/channel-contract-testing`                                          |
| `createStartAccountContext`                                               | Build channel account lifecycle contexts. Import from `plugin-sdk/channel-test-helpers`                                                     |
| `installChannelActionsContractSuite`                                      | Install generic channel message-action contract cases. Import from `plugin-sdk/channel-test-helpers`                                        |
| `installChannelSetupContractSuite`                                        | Install generic channel setup contract cases. Import from `plugin-sdk/channel-test-helpers`                                                 |
| `installChannelStatusContractSuite`                                       | Install generic channel status contract cases. Import from `plugin-sdk/channel-test-helpers`                                                |
| `expectDirectoryIds`                                                      | Assert channel directory ids from a directory-list function. Import from `plugin-sdk/channel-test-helpers`                                  |
| `assertBundledChannelEntries`                                             | Assert bundled channel entrypoints expose the expected public contract. Import from `plugin-sdk/channel-test-helpers`                       |
| `formatEnvelopeTimestamp`                                                 | Format deterministic envelope timestamps. Import from `plugin-sdk/channel-test-helpers`                                                     |
| `expectPairingReplyText`                                                  | Assert channel pairing reply text and extract its code. Import from `plugin-sdk/channel-test-helpers`                                       |
| `describePluginRegistrationContract`                                      | Install plugin registration contract checks. Import from `plugin-sdk/plugin-test-contracts`                                                 |
| `registerSingleProviderPlugin`                                            | Register one provider plugin in loader smoke tests. Import from `plugin-sdk/plugin-test-runtime`                                            |
| `registerProviderPlugin`                                                  | Capture all provider kinds from one plugin. Import from `plugin-sdk/plugin-test-runtime`                                                    |
| `registerProviderPlugins`                                                 | Capture provider registrations across multiple plugins. Import from `plugin-sdk/plugin-test-runtime`                                        |
| `requireRegisteredProvider`                                               | Assert that a provider collection contains an id. Import from `plugin-sdk/plugin-test-runtime`                                              |
| `createRuntimeEnv`                                                        | Build a mocked CLI/plugin runtime environment. Import from `plugin-sdk/plugin-test-runtime`                                                 |
| `createPluginRuntimeMock`                                                 | Build a mocked plugin runtime surface. Import from `plugin-sdk/plugin-test-runtime`                                                         |
| `createPluginSetupWizardStatus`                                           | Build setup status helpers for channel plugins. Import from `plugin-sdk/plugin-test-runtime`                                                |
| `createTestWizardPrompter`                                                | Build a mocked setup wizard prompter. Import from `plugin-sdk/plugin-test-runtime`                                                          |
| `createRuntimeTaskFlow`                                                   | Create isolated runtime task-flow state. Import from `plugin-sdk/plugin-test-runtime`                                                       |
| `runProviderCatalog`                                                      | Execute a provider catalog hook with test dependencies. Import from `plugin-sdk/plugin-test-runtime`                                        |
| `resolveProviderWizardOptions`                                            | Resolve provider setup wizard choices in contract tests. Import from `plugin-sdk/plugin-test-runtime`                                       |
| `resolveProviderModelPickerEntries`                                       | Resolve provider model-picker entries in contract tests. Import from `plugin-sdk/plugin-test-runtime`                                       |
| `buildProviderPluginMethodChoice`                                         | Build provider wizard choice ids for assertions. Import from `plugin-sdk/plugin-test-runtime`                                               |
| `setProviderWizardProvidersResolverForTest`                               | Inject provider wizard providers for isolated tests. Import from `plugin-sdk/plugin-test-runtime`                                           |
| `describeOpenAIProviderRuntimeContract`                                   | Install provider-family runtime contract checks. Import from `plugin-sdk/provider-test-contracts`                                           |
| `expectPassthroughReplayPolicy`                                           | Assert provider replay policies pass through provider-owned tools and metadata. Import from `plugin-sdk/provider-test-contracts`            |
| `runRealtimeSttLiveTest`                                                  | Run a live realtime STT provider test with shared audio fixtures. Import from `plugin-sdk/provider-test-contracts`                          |
| `normalizeTranscriptForMatch`                                             | Normalize live transcript output before fuzzy assertions. Import from `plugin-sdk/provider-test-contracts`                                  |
| `expectExplicitVideoGenerationCapabilities`                               | Assert video providers declare explicit generation mode capabilities. Import from `plugin-sdk/provider-test-contracts`                      |
| `expectExplicitMusicGenerationCapabilities`                               | Assert music providers declare explicit generation/edit capabilities. Import from `plugin-sdk/provider-test-contracts`                      |
| `mockSuccessfulDashscopeVideoTask`                                        | Install a successful DashScope-compatible video task response. Import from `plugin-sdk/provider-test-contracts`                             |
| `getProviderHttpMocks`                                                    | Access opt-in provider HTTP/auth Vitest mocks. Import from `plugin-sdk/provider-http-test-mocks`                                            |
| `installProviderHttpMockCleanup`                                          | Reset provider HTTP/auth mocks after each test. Import from `plugin-sdk/provider-http-test-mocks`                                           |
| `createOpenClawTestState` / `withOpenClawTestState` / `OpenClawTestState` | Create and clean up isolated OpenClaw state, config, workspace, environment, and auth-profile fixtures. Import from `plugin-sdk/test-state` |
| `installCommonResolveTargetErrorCases`                                    | Shared test cases for target resolution error handling. Import from `plugin-sdk/channel-target-testing`                                     |
| `shouldAckReaction`                                                       | Check whether a channel should add an ack reaction. Import from `plugin-sdk/channel-feedback`                                               |
| `removeAckReactionAfterReply`                                             | Remove ack reaction after reply delivery. Import from `plugin-sdk/channel-feedback`                                                         |
| `createTestRegistry`                                                      | Build a channel plugin registry fixture. Import from `plugin-sdk/plugin-test-runtime` or `plugin-sdk/channel-test-helpers`                  |
| `createEmptyPluginRegistry`                                               | Build an empty plugin registry fixture. Import from `plugin-sdk/plugin-test-runtime` or `plugin-sdk/channel-test-helpers`                   |
| `setActivePluginRegistry`                                                 | Install a registry fixture for plugin runtime tests. Import from `plugin-sdk/plugin-test-runtime` or `plugin-sdk/channel-test-helpers`      |
| `createRequestCaptureJsonFetch`                                           | Capture JSON fetch requests in media helper tests. Import from `plugin-sdk/test-media-understanding`                                        |
| `isLiveTestEnabled`                                                       | Gate opt-in live provider tests. Import from `plugin-sdk/test-live`                                                                         |
| `collectProviderApiKeys`                                                  | Discover credentials for live provider tests. Import from `plugin-sdk/test-live-auth`                                                       |
| `parseProviderModelMap`                                                   | Parse music/video live-test model overrides. Import from `plugin-sdk/test-media-generation`                                                 |
| `withServer`                                                              | Run tests against a disposable local HTTP server. Import from `plugin-sdk/test-env`                                                         |
| `createMockIncomingRequest`                                               | Build a minimal incoming HTTP request object. Import from `plugin-sdk/test-env`                                                             |
| `withFetchPreconnect`                                                     | Run fetch tests with preconnect hooks installed. Import from `plugin-sdk/test-env`                                                          |
| `withEnv` / `withEnvAsync`                                                | Temporarily patch environment variables. Import from `plugin-sdk/test-env`                                                                  |
| `createTempHomeEnv` / `withTempHome` / `withTempDir`                      | Create isolated filesystem test fixtures. Import from `plugin-sdk/test-env`                                                                 |
| `createMockServerResponse`                                                | Create a minimal HTTP server response mock. Import from `plugin-sdk/test-env`                                                               |
| `createProviderUsageFetch`                                                | Build provider usage fetch fixtures. Import from `plugin-sdk/test-env`                                                                      |
| `useFrozenTime` / `useRealTime`                                           | Freeze and restore timers for time-sensitive tests. Import from `plugin-sdk/test-env`                                                       |
| `createCliRuntimeCapture`                                                 | Capture CLI runtime output in tests. Import from `plugin-sdk/test-fixtures`                                                                 |
| `importFreshModule`                                                       | Import an ESM module with a fresh query token to bypass module cache. Import from `plugin-sdk/test-fixtures`                                |
| `bundledPluginRoot` / `bundledPluginFile`                                 | Resolve bundled plugin source or dist fixture paths. Import from `plugin-sdk/test-fixtures`                                                 |
| `mockNodeBuiltinModule`                                                   | Install narrow Node builtin Vitest mocks. Import from `plugin-sdk/test-node-mocks`                                                          |
| `createSandboxTestContext`                                                | Build sandbox test contexts. Import from `plugin-sdk/test-fixtures`                                                                         |
| `writeSkill`                                                              | Write skill fixtures. Import from `plugin-sdk/test-fixtures`                                                                                |
| `makeAgentAssistantMessage`                                               | Build agent transcript message fixtures. Import from `plugin-sdk/test-fixtures`                                                             |
| `peekSystemEvents` / `resetSystemEventsForTest`                           | Inspect and reset system event fixtures. Import from `plugin-sdk/test-fixtures`                                                             |
| `sanitizeTerminalText`                                                    | Sanitize terminal output for assertions. Import from `plugin-sdk/test-fixtures`                                                             |
| `countLines` / `hasBalancedFences`                                        | Assert chunking output shape. Import from `plugin-sdk/test-fixtures`                                                                        |
| `typedCases`                                                              | Preserve literal types for table-driven tests. Import from `plugin-sdk/test-fixtures`                                                       |

自带插件合同测试套件也会使用这些 SDK 测试子路径来获取仅供测试使用的注册表、清单、公共产物和运行时夹具辅助工具。
依赖自带 OpenClaw 库存的核心专用套件则仍放在 `src/plugins/contracts` 下。

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

将手写 `api` mock 传递给 `register(api)` 的单元测试，不会
触发 OpenClaw 加载器的接受门槛。对于插件所依赖的每个注册入口，
至少添加一个基于加载器的冒烟测试，尤其是 hooks 以及诸如内存之类的独占能力。

真实加载器会在缺少必需元数据，或者插件调用了它不拥有的能力 API 时，
拒绝插件注册。例如，`api.registerHook(...)` 需要提供 hook 名称，
而 `api.registerMemoryCapability(...)` 则要求插件清单或导出的入口声明
`kind: "memory"`。

### 测试运行时配置访问

Prefer the shared plugin runtime mock from
`openclaw/plugin-sdk/plugin-test-runtime`. Its runtime config helpers model the
current snapshot and mutation APIs.

### 频道插件的单元测试

```typescript
import { describe, it, expect, vi } from "vitest";

describe("my-channel plugin", () => {
  it("应该从配置中解析账户", () => {
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

  it("应该在不具体化密钥的情况下检查账户", () => {
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
  it("应该解析动态模型", () => {
    const model = myProvider.resolveDynamicModel({
      modelId: "custom-model-v2",
      // ... 上下文
    });

    expect(model.id).toBe("custom-model-v2");
    expect(model.provider).toBe("my-provider");
    expect(model.api).toBe("openai-completions");
  });

  it("在 API key 可用时应返回目录", async () => {
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

## 合同测试（仓库内插件）

捆绑的内置插件包含合同测试，用于验证注册归属：

```bash
pnpm test src/plugins/contracts/
```

这些测试会断言：

- 哪些插件注册了哪些提供者
- 哪些插件注册了哪些语音提供者
- 注册结构是否正确
- 运行时契约是否满足要求

### 为特定范围运行测试

对于特定插件：

```bash
pnpm test <bundled-plugin-root>/my-channel/
```

仅运行合同测试：

```bash
pnpm test src/plugins/contracts/shape.contract.test.ts
pnpm test src/plugins/contracts/auth-choice.contract.test.ts
pnpm test src/plugins/contracts/runtime-seams.contract.test.ts
```

## Lint 强制规则（仓库内插件）

`scripts/run-additional-boundary-checks.mjs` 会在 CI 中运行一组 `lint:plugins:*`
import 边界检查；每一项也可以在本地单独运行：

| Command                                                        | Enforces                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm run lint:plugins:no-monolithic-plugin-sdk-entry-imports` | Bundled plugins cannot import the monolithic `openclaw/plugin-sdk` root barrel.              |
| `pnpm run lint:plugins:no-extension-src-imports`               | Production extension files cannot import the repo `src/**` tree directly (`../../src/...`).  |
| `pnpm run lint:plugins:no-extension-test-core-imports`         | Extension test files cannot import removed SDK test aliases or other core-only test helpers. |

外部插件不受这些 lint 规则约束，但仍建议遵循相同模式。

## 测试配置

OpenClaw 使用带有信息性 V8 覆盖率报告的 Vitest 4。对于插件测试：

```bash
# 运行所有测试
pnpm test

# 运行特定插件测试
pnpm test <bundled-plugin-root>/my-channel/src/channel.test.ts

# 使用特定测试名称过滤器运行
pnpm test <bundled-plugin-root>/my-channel/ -t "resolves account"

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
