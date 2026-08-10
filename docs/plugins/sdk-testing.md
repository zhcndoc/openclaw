---
summary: "OpenClaw 插件的测试工具和模式"
title: "插件测试"
sidebarTitle: "测试"
read_when:
  - 你正在为插件编写测试
  - 你需要来自插件 SDK 的测试工具
  - 你想了解内置插件的契约测试
---

OpenClaw 插件的测试工具、模式和静态检查约束参考。

<Tip>
  **在找测试示例吗？** 使用方法指南中包含了完整的测试示例：
  [渠道插件测试](/plugins/sdk-channel-plugins#step-6-test) 和
  [提供商插件测试](/plugins/sdk-provider-plugins#step-6-test)。
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

请使用这些专用子路径进行自带插件测试。此前的
`openclaw/plugin-sdk/testing` 总入口仅供仓库本地使用，会被排除在已发布的
软件包之外，现已移除。此前的 `openclaw/plugin-sdk/test-utils`
别名也已随之移除。`pnpm run lint:plugins:no-extension-test-core-imports`
（`scripts/check-no-extension-test-core-imports.ts`）会确保扩展测试使用上面的
专用测试子路径。

### 可用导出项

| 导出项                                                                    | 用途                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `createTestPluginApi`                                                     | 构建用于直接注册单元测试的最小插件 API 模拟。导入自 `plugin-sdk/plugin-test-api`                                |
| `AUTH_PROFILE_RUNTIME_CONTRACT`                                           | 原生代理运行时适配器共用的身份验证配置文件合同夹具。导入自 `plugin-sdk/agent-runtime-test-contracts`               |
| `DELIVERY_NO_REPLY_RUNTIME_CONTRACT`                                      | 原生代理运行时适配器共用的消息投递抑制合同夹具。导入自 `plugin-sdk/agent-runtime-test-contracts`       |
| `OUTCOME_FALLBACK_RUNTIME_CONTRACT`                                       | 原生代理运行时适配器共用的回退分类合同夹具。导入自 `plugin-sdk/agent-runtime-test-contracts`    |
| `createParameterFreeTool`                                                 | 为原生运行时合同测试构建动态工具架构夹具。导入自 `plugin-sdk/agent-runtime-test-contracts`                 |
| `expectChannelInboundContextContract`                                     | 断言频道入站上下文结构。导入自 `plugin-sdk/channel-contract-testing`                                                     |
| `installChannelOutboundPayloadContractSuite`                              | 安装频道出站负载合同测试用例。导入自 `plugin-sdk/channel-contract-testing`                                          |
| `createStartAccountContext`                                               | 构建频道账户生命周期上下文。导入自 `plugin-sdk/channel-test-helpers`                                                     |
| `installChannelActionsContractSuite`                                      | 安装通用频道消息操作合同测试用例。导入自 `plugin-sdk/channel-test-helpers`                                        |
| `installChannelSetupContractSuite`                                        | 安装通用频道设置合同测试用例。导入自 `plugin-sdk/channel-test-helpers`                                                 |
| `installChannelStatusContractSuite`                                       | 安装通用频道状态合同测试用例。导入自 `plugin-sdk/channel-test-helpers`                                                |
| `expectDirectoryIds`                                                      | 断言目录列表函数返回的频道目录 ID。导入自 `plugin-sdk/channel-test-helpers`                                  |
| `formatEnvelopeTimestamp`                                                 | 格式化确定性的信封时间戳。导入自 `plugin-sdk/channel-test-helpers`                                                     |
| `expectPairingReplyText`                                                  | 断言频道配对回复文本并提取其中的代码。导入自 `plugin-sdk/channel-test-helpers`                                       |
| `describePluginRegistrationContract`                                      | 安装插件注册合同检查。导入自 `plugin-sdk/plugin-test-contracts`                                                 |
| `registerSingleProviderPlugin`                                            | 在加载器冒烟测试中注册单个提供商插件。导入自 `plugin-sdk/plugin-test-runtime`                                            |
| `registerProviderPlugin`                                                  | 捕获单个插件中的所有提供商类型。导入自 `plugin-sdk/plugin-test-runtime`                                                    |
| `registerProviderPlugins`                                                 | 捕获多个插件中的提供商注册信息。导入自 `plugin-sdk/plugin-test-runtime`                                        |
| `requireRegisteredProvider`                                               | 断言提供商集合包含指定 ID。导入自 `plugin-sdk/plugin-test-runtime`                                              |
| `createRuntimeEnv`                                                        | 构建模拟的 CLI/插件运行时环境。导入自 `plugin-sdk/plugin-test-runtime`                                                 |
| `createPluginRuntimeMock`                                                 | 构建模拟的插件运行时接口。导入自 `plugin-sdk/plugin-test-runtime`                                                         |
| `createPluginSetupWizardStatus`                                           | 为频道插件构建设置状态辅助工具。导入自 `plugin-sdk/plugin-test-runtime`                                                |
| `createTestWizardPrompter`                                                | 构建模拟的设置向导提示器。导入自 `plugin-sdk/plugin-test-runtime`                                                          |
| `createRuntimeTaskFlow`                                                   | 创建隔离的运行时任务流状态。导入自 `plugin-sdk/plugin-test-runtime`                                                       |
| `runProviderCatalog`                                                      | 使用测试依赖执行提供商目录钩子。导入自 `plugin-sdk/plugin-test-runtime`                                        |
| `resolveProviderWizardOptions`                                            | 在合同测试中解析提供商设置向导选项。导入自 `plugin-sdk/plugin-test-runtime`                                       |
| `resolveProviderModelPickerEntries`                                       | 在合同测试中解析提供商模型选择器条目。导入自 `plugin-sdk/plugin-test-runtime`                                  |
| `buildProviderPluginMethodChoice`                                         | 构建用于断言的提供商向导选项 ID。导入自 `plugin-sdk/plugin-test-runtime`                                               |
| `setProviderWizardProvidersResolverForTest`                               | 为隔离测试注入提供商向导提供商。导入自 `plugin-sdk/plugin-test-runtime`                                           |
| `describeOpenAIProviderRuntimeContract`                                   | 安装提供商系列运行时合同检查。导入自 `plugin-sdk/provider-test-contracts`                                           |
| `expectPassthroughReplayPolicy`                                           | 断言提供商重放策略会透传提供商自有工具和元数据。导入自 `plugin-sdk/provider-test-contracts`            |
| `runRealtimeSttLiveTest`                                                  | 使用共用音频夹具运行实时实时 STT 提供商测试。导入自 `plugin-sdk/provider-test-contracts`                          |
| `normalizeTranscriptForMatch`                                             | 在模糊断言前规范化实时转录输出。导入自 `plugin-sdk/provider-test-contracts`                                  |
| `expectExplicitVideoGenerationCapabilities`                               | 断言视频提供商声明了明确的生成模式能力。导入自 `plugin-sdk/provider-test-contracts`                      |
| `expectExplicitMusicGenerationCapabilities`                               | 断言音乐提供商声明了明确的生成/编辑能力。导入自 `plugin-sdk/provider-test-contracts`                      |
| `mockSuccessfulDashscopeVideoTask`                                        | 安装成功的 DashScope 兼容视频任务响应。导入自 `plugin-sdk/provider-test-contracts`                             |
| `getProviderHttpMocks`                                                    | 访问选择性启用的提供商 HTTP/身份验证 Vitest 模拟。导入自 `plugin-sdk/provider-http-test-mocks`                                            |
| `installProviderHttpMockCleanup`                                          | 在每个测试后重置提供商 HTTP/身份验证模拟。导入自 `plugin-sdk/provider-http-test-mocks`                                           |
| `createOpenClawTestState` / `withOpenClawTestState` / `OpenClawTestState` | 创建并清理隔离的 OpenClaw 状态、配置、工作区、环境和身份验证配置文件夹具。导入自 `plugin-sdk/test-state` |
| `installCommonResolveTargetErrorCases`                                    | 用于目标解析错误处理的共用测试用例。导入自 `plugin-sdk/channel-target-testing`                                     |
| `shouldAckReaction`                                                       | 检查频道是否应添加确认反应。导入自 `plugin-sdk/channel-feedback`                                               |
| `removeAckReactionAfterReply`                                             | 回复投递后移除确认反应。导入自 `plugin-sdk/channel-feedback`                                                         |
| `createTestRegistry`                                                      | 构建频道插件注册表夹具。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                  |
| `createEmptyPluginRegistry`                                               | 构建空的插件注册表夹具。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                   |
| `setActivePluginRegistry`                                                 | 为插件运行时测试安装注册表夹具。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`      |
| `createRequestCaptureJsonFetch`                                           | 在媒体辅助工具测试中捕获 JSON 获取请求。导入自 `plugin-sdk/test-media-understanding`                                        |
| `isLiveTestEnabled`                                                       | 控制是否启用选择性提供商实时测试。导入自 `plugin-sdk/test-live`                                                                         |
| `collectProviderApiKeys`                                                  | 发现提供商实时测试所需的凭据。导入自 `plugin-sdk/test-live-auth`                                                       |
| `parseProviderModelMap`                                                   | 解析音乐/视频实时测试的模型覆盖配置。导入自 `plugin-sdk/test-media-generation`                                                 |
| `withServer`                                                              | 针对一次性本地 HTTP 服务器运行测试。导入自 `plugin-sdk/test-env`                                                         |
| `createMockIncomingRequest`                                               | 构建最小的传入 HTTP 请求对象。导入自 `plugin-sdk/test-env`                                                             |
| `withFetchPreconnect`                                                     | 在安装预连接钩子的情况下运行获取测试。导入自 `plugin-sdk/test-env`                                                          |
| `withEnv` / `withEnvAsync`                                                | 临时修改环境变量。导入自 `plugin-sdk/test-env`                                                                  |
| `createTempHomeEnv` / `withTempHome` / `withTempDir`                      | 创建隔离的文件系统测试夹具。导入自 `plugin-sdk/test-env`                                                                 |
| `createMockServerResponse`                                                | 创建最小的 HTTP 服务器响应模拟。导入自 `plugin-sdk/test-env`                                                               |
| `createProviderUsageFetch`                                               | 构建提供商用量获取夹具。导入自 `plugin-sdk/test-env`                                                                      |
| `useFrozenTime` / `useRealTime`                                           | 为时间敏感型测试冻结并恢复计时器。导入自 `plugin-sdk/test-env`                                                       |
| `createCliRuntimeCapture`                                                 | 在测试中捕获 CLI 运行时输出。导入自 `plugin-sdk/test-fixtures`                                                                 |
| `importFreshModule`                                                       | 使用新的查询令牌导入 ESM 模块，以绕过模块缓存。导入自 `plugin-sdk/test-fixtures`                                |
| `bundledPluginRoot` / `bundledPluginFile`                                 | 解析捆绑插件源代码或 dist 夹具路径。导入自 `plugin-sdk/test-fixtures`                                                 |
| `mockNodeBuiltinModule`                                                   | 安装范围有限的 Node 内置模块 Vitest 模拟。导入自 `plugin-sdk/test-node-mocks`                                                          |
| `createSandboxTestContext`                                                | 构建沙箱测试上下文。导入自 `plugin-sdk/test-fixtures`                                                                         |
| `writeSkill`                                                              | 写入技能夹具。导入自 `plugin-sdk/test-fixtures`                                                                                |
| `makeAgentAssistantMessage`                                               | 构建代理转录消息夹具。导入自 `plugin-sdk/test-fixtures`                                                             |
| `peekSystemEvents` / `resetSystemEventsForTest`                           | 检查并重置系统事件夹具。导入自 `plugin-sdk/test-fixtures`                           |
| `sanitizeTerminalText`                                                    | 清理终端输出以便断言。导入自 `plugin-sdk/test-fixtures`                                                             |
| `countLines` / `hasBalancedFences`                                        | 断言分块输出结构。导入自 `plugin-sdk/test-fixtures`                                                                        |
| `typedCases`                                                              | 为表驱动测试保留字面量类型。导入自 `plugin-sdk/test-fixtures`                                                       |

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

优先使用来自 `openclaw/plugin-sdk/plugin-test-runtime` 的共享插件运行时 mock。其运行时配置辅助函数模拟当前的快照和变更 API。

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

`scripts/run-additional-boundary-checks.mts` 会在 CI 中运行一组
`lint:plugins:*` 导入边界检查；每项检查也可以在本地单独运行：

| 命令                                                        | 强制要求                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm run lint:plugins:no-monolithic-plugin-sdk-entry-imports` | 捆绑插件不能导入单体的 `openclaw/plugin-sdk` 根入口文件。              |
| `pnpm run lint:plugins:no-extension-src-imports`               | 生产扩展文件不能直接导入仓库的 `src/**` 目录树（`../../src/...`）。  |
| `pnpm run lint:plugins:no-extension-test-core-imports`         | 扩展测试文件不能导入已移除的 SDK 测试别名或其他仅供核心使用的测试辅助工具。 |

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
- [构建插件](/plugins/building-plugins) -- 入门指南。
