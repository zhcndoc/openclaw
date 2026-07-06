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
import { withEnv, withFetchPreconnect, withServer } from "openclaw/plugin-sdk/test-env";
import {
  bundledPluginRoot,
  createCliRuntimeCapture,
  typedCases,
} from "openclaw/plugin-sdk/test-fixtures";
import { mockNodeBuiltinModule } from "openclaw/plugin-sdk/test-node-mocks";
```

新的自带插件测试请优先使用这些聚焦的子路径。较宽泛的
`openclaw/plugin-sdk/testing` 入口和 `openclaw/plugin-sdk/test-utils` 别名
仅用于旧版兼容：`pnpm run lint:plugins:no-extension-test-core-imports`
（`scripts/check-no-extension-test-core-imports.ts`）会拒绝扩展测试文件中新引入这两者中的任意一个，而且二者目前仅为了
兼容性记录测试而保留。

### 可用导出项

| 导出项                                               | 用途                                                                                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                | 为直接注册的单元测试构建一个最小插件 API Mock。请从 `plugin-sdk/plugin-test-api` 导入                             |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                      | 原生代理运行时适配器共享的 auth-profile 合同夹具。请从 `plugin-sdk/agent-runtime-test-contracts` 导入            |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                 | 原生代理运行时适配器共享的禁止回复投递合同夹具。请从 `plugin-sdk/agent-runtime-test-contracts` 导入    |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                  | 原生代理运行时适配器共享的回退分类合同夹具。请从 `plugin-sdk/agent-runtime-test-contracts` 导入 |
| `createParameterFreeTool`                            | 为原生运行时合同测试构建动态工具 schema 夹具。请从 `plugin-sdk/agent-runtime-test-contracts` 导入              |
| `expectChannelInboundContextContract`                | 断言 channel 入站上下文形状。请从 `plugin-sdk/channel-contract-testing` 导入                                                  |
| `installChannelOutboundPayloadContractSuite`         | 安装 channel 出站负载合同测试用例。请从 `plugin-sdk/channel-contract-testing` 导入                                       |
| `createStartAccountContext`                          | 构建 channel 账户生命周期上下文。请从 `plugin-sdk/channel-test-helpers` 导入                                                  |
| `installChannelActionsContractSuite`                 | 安装通用 channel 消息动作合同测试用例。请从 `plugin-sdk/channel-test-helpers` 导入                                     |
| `installChannelSetupContractSuite`                   | 安装通用 channel 设置合同测试用例。请从 `plugin-sdk/channel-test-helpers` 导入                                              |
| `installChannelStatusContractSuite`                  | 安装通用 channel 状态合同测试用例。请从 `plugin-sdk/channel-test-helpers` 导入                                             |
| `expectDirectoryIds`                                 | 断言目录列表函数返回的 channel 目录 id。请从 `plugin-sdk/channel-test-helpers` 导入                               |
| `assertBundledChannelEntries`                        | 断言自带的 channel 入口暴露出预期的公共合同。请从 `plugin-sdk/channel-test-helpers` 导入                    |
| `formatEnvelopeTimestamp`                            | 格式化确定性的 envelope 时间戳。请从 `plugin-sdk/channel-test-helpers` 导入                                                  |
| `expectPairingReplyText`                             | 断言 channel 配对回复文本并提取其代码。请从 `plugin-sdk/channel-test-helpers` 导入                                    |
| `describePluginRegistrationContract`                 | 安装插件注册合同检查。请从 `plugin-sdk/plugin-test-contracts` 导入                                              |
| `registerSingleProviderPlugin`                       | 在加载器冒烟测试中注册一个 provider 插件。请从 `plugin-sdk/plugin-test-runtime` 导入                                         |
| `registerProviderPlugin`                             | 捕获一个插件中的所有 provider 类型。请从 `plugin-sdk/plugin-test-runtime` 导入                                                 |
| `registerProviderPlugins`                            | 跨多个插件捕获 provider 注册。请从 `plugin-sdk/plugin-test-runtime` 导入                                     |
| `requireRegisteredProvider`                          | 断言 provider 集合包含某个 id。请从 `plugin-sdk/plugin-test-runtime` 导入                                           |
| `createRuntimeEnv`                                   | 构建一个 mock 的 CLI/插件运行时环境。请从 `plugin-sdk/plugin-test-runtime` 导入                                              |
| `createPluginRuntimeMock`                            | 构建一个 mock 的插件运行时表面。请从 `plugin-sdk/plugin-test-runtime` 导入                                                      |
| `createPluginSetupWizardStatus`                      | 为 channel 插件构建设置状态辅助工具。请从 `plugin-sdk/plugin-test-runtime` 导入                                             |
| `createTestWizardPrompter`                           | 构建一个 mock 的设置向导提示器。请从 `plugin-sdk/plugin-test-runtime` 导入                                                       |
| `createRuntimeTaskFlow`                              | 创建隔离的运行时任务流状态。请从 `plugin-sdk/plugin-test-runtime` 导入                                                    |
| `runProviderCatalog`                                 | 使用测试依赖执行一个 provider catalog 钩子。请从 `plugin-sdk/plugin-test-runtime` 导入                                     |
| `resolveProviderWizardOptions`                       | 在合同测试中解析 provider 设置向导选项。请从 `plugin-sdk/plugin-test-runtime` 导入                                    |
| `resolveProviderModelPickerEntries`                  | 在合同测试中解析 provider 模型选择器条目。请从 `plugin-sdk/plugin-test-runtime` 导入                                    |
| `buildProviderPluginMethodChoice`                    | 为断言构建 provider 向导选项 id。请从 `plugin-sdk/plugin-test-runtime` 导入                                            |
| `setProviderWizardProvidersResolverForTest`          | 为隔离测试注入 provider 向导提供者。请从 `plugin-sdk/plugin-test-runtime` 导入                                        |
| `describeOpenAIProviderRuntimeContract`              | 安装 provider 家族运行时合同检查。请从 `plugin-sdk/provider-test-contracts` 导入                                        |
| `expectPassthroughReplayPolicy`                      | 断言 provider 回放策略会透传 provider 自有工具和元数据。请从 `plugin-sdk/provider-test-contracts` 导入         |
| `runRealtimeSttLiveTest`                             | 使用共享音频夹具运行实时语音转文字 provider 活测。请从 `plugin-sdk/provider-test-contracts` 导入                       |
| `normalizeTranscriptForMatch`                        | 在模糊断言前规范化实时转写输出。请从 `plugin-sdk/provider-test-contracts` 导入                               |
| `expectExplicitVideoGenerationCapabilities`          | 断言视频 provider 声明明确的生成模式能力。请从 `plugin-sdk/provider-test-contracts` 导入                   |
| `expectExplicitMusicGenerationCapabilities`          | 断言音乐 provider 声明明确的生成/编辑能力。请从 `plugin-sdk/provider-test-contracts` 导入                   |
| `mockSuccessfulDashscopeVideoTask`                   | 安装一个成功的 DashScope 兼容视频任务响应。请从 `plugin-sdk/provider-test-contracts` 导入                          |
| `getProviderHttpMocks`                               | 访问可选启用的 provider HTTP/auth Vitest mocks。请从 `plugin-sdk/provider-http-test-mocks` 导入                                         |
| `installProviderHttpMockCleanup`                     | 在每个测试后重置 provider HTTP/auth mocks。请从 `plugin-sdk/provider-http-test-mocks` 导入                                        |
| `installCommonResolveTargetErrorCases`               | 用于目标解析错误处理的共享测试用例。请从 `plugin-sdk/channel-target-testing` 导入                                  |
| `shouldAckReaction`                                  | 检查某个 channel 是否应添加确认表情反应。请从 `plugin-sdk/channel-feedback` 导入                                            |
| `removeAckReactionAfterReply`                        | 在回复投递后移除确认表情反应。请从 `plugin-sdk/channel-feedback` 导入                                                      |
| `createTestRegistry`                                 | 构建一个 channel 插件注册表示例。请从 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 导入               |
| `createEmptyPluginRegistry`                          | 构建一个空的插件注册表示例。请从 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 导入                |
| `setActivePluginRegistry`                            | 为插件运行时测试安装一个注册表夹具。请从 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers` 导入   |
| `createRequestCaptureJsonFetch`                      | 在媒体辅助测试中捕获 JSON fetch 请求。请从 `plugin-sdk/test-env` 导入                                                     |
| `withServer`                                         | 在一个可丢弃的本地 HTTP 服务器上运行测试。请从 `plugin-sdk/test-env` 导入                                                      |
| `createMockIncomingRequest`                          | 构建一个最小的传入 HTTP 请求对象。请从 `plugin-sdk/test-env` 导入                                                          |
| `withFetchPreconnect`                                | 在已安装 preconnect 钩子的情况下运行 fetch 测试。请从 `plugin-sdk/test-env` 导入                                                       |
| `withEnv` / `withEnvAsync`                           | 临时修改环境变量。请从 `plugin-sdk/test-env` 导入                                                               |
| `createTempHomeEnv` / `withTempHome` / `withTempDir` | 创建隔离的文件系统测试夹具。请从 `plugin-sdk/test-env` 导入                                                              |
| `createMockServerResponse`                           | 创建一个最小的 HTTP 服务器响应 mock。请从 `plugin-sdk/test-env` 导入                                                            |
| `createProviderUsageFetch`                           | 构建 provider usage fetch 夹具。请从 `plugin-sdk/test-env` 导入                                                                   |
| `useFrozenTime` / `useRealTime`                      | 为对时间敏感的测试冻结并恢复定时器。请从 `plugin-sdk/test-env` 导入                                                    |
| `createCliRuntimeCapture`                            | 在测试中捕获 CLI 运行时输出。请从 `plugin-sdk/test-fixtures` 导入                                                              |
| `importFreshModule`                                  | 使用新的查询令牌导入 ESM 模块以绕过模块缓存。请从 `plugin-sdk/test-fixtures` 导入                             |
| `bundledPluginRoot` / `bundledPluginFile`            | 解析自带插件源代码或 dist 夹具路径。请从 `plugin-sdk/test-fixtures` 导入                                              |
| `mockNodeBuiltinModule`                              | 安装窄范围的 Node 内置 Vitest mocks。请从 `plugin-sdk/test-node-mocks` 导入                                                       |
| `createSandboxTestContext`                           | 构建沙箱测试上下文。请从 `plugin-sdk/test-fixtures` 导入                                                                      |
| `writeSkill`                                         | 写入 skill 夹具。请从 `plugin-sdk/test-fixtures` 导入                                                                             |
| `makeAgentAssistantMessage`                          | 构建代理转写消息夹具。请从 `plugin-sdk/test-fixtures` 导入                                                          |
| `peekSystemEvents` / `resetSystemEventsForTest`      | 检查并重置系统事件夹具。请从 `plugin-sdk/test-fixtures` 导入                                                          |
| `sanitizeTerminalText`                               | 对终端输出进行清理以便断言。请从 `plugin-sdk/test-fixtures` 导入                                                          |
| `countLines` / `hasBalancedFences`                   | 断言分块输出形状。请从 `plugin-sdk/test-fixtures` 导入                                                                     |
| `typedCases`                                         | 为表驱动测试保留字面量类型。请从 `plugin-sdk/test-fixtures` 导入                                                    |

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

优先使用来自 `openclaw/plugin-sdk/plugin-test-runtime` 的共享插件运行时 mock。
其 `runtime.config.loadConfig()` 和 `runtime.config.writeConfigFile(...)`
mock 默认会抛出异常，以便测试捕获对已废弃兼容性 API 的新使用。
只有当测试明确覆盖旧版兼容行为时，才覆盖这些 mock。

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

## Contract Tests (In-repo Plugins)

Bundled built-in plugins include contract tests to verify registration ownership:

```bash
pnpm test src/plugins/contracts/
```

These tests assert:

- Which plugins register which providers
- Which plugins register which speech providers
- Whether the registration shape is correct
- Whether the runtime contract meets requirements

### Running Tests for a Specific Scope

For a specific plugin:

```bash
pnpm test <bundled-plugin-root>/my-channel/
```

Run only contract tests:

```bash
pnpm test src/plugins/contracts/shape.contract.test.ts
pnpm test src/plugins/contracts/auth-choice.contract.test.ts
pnpm test src/plugins/contracts/runtime-seams.contract.test.ts
```

## Lint 强制规则（仓库内插件）

`scripts/run-additional-boundary-checks.mjs` 会在 CI 中运行一组 `lint:plugins:*`
import 边界检查；每一项也可以在本地单独运行：

| Command                                                        | Enforces                                                                                                                    |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm run lint:plugins:no-monolithic-plugin-sdk-entry-imports` | 打包后的插件不能导入单体的 `openclaw/plugin-sdk` 根 barrel。                                             |
| `pnpm run lint:plugins:no-extension-src-imports`               | 生产环境的扩展文件不能直接导入仓库的 `src/**` 树（`../../src/...`）。                                 |
| `pnpm run lint:plugins:no-extension-test-core-imports`         | 扩展测试文件不能导入 `openclaw/plugin-sdk/testing`、`plugin-sdk/test-utils`，或其他仅供核心使用的测试辅助工具。 |

外部插件不受这些 lint 规则约束，但仍建议遵循相同模式。

## 测试配置

OpenClaw 使用 Vitest 4 和 V8 覆盖率阈值。对于插件测试：

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
