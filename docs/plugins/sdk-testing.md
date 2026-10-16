---
summary: "OpenClaw 插件的测试工具和模式"
title: "插件测试"
sidebarTitle: "测试"
read_when:
  - "你正在为插件编写测试"
  - "你需要来自插件 SDK 的测试工具"
  - "你想了解内置插件的契约测试"
---

OpenClaw 插件的测试工具、模式和静态检查约束参考。

<Tip>
  **在找测试示例吗？** 使用方法指南中包含了完整的测试示例： [渠道插件测试](/plugins/sdk-channel-plugins#step-6-test) 和 [提供商插件测试](/plugins/sdk-provider-plugins#step-6-test)。
</Tip>

## <a id="test-utilities"></a> 测试工具

这些子路径是 OpenClaw 自带插件测试的仓库本地源入口点。它们不是面向第三方插件发布的 `package.json` 导出项，并且它们可能会导入 Vitest 或其他仅限仓库内部使用的测试依赖。

```typescript
import { AUTH_PROFILE_RUNTIME_CONTRACT } from "openclaw/plugin-sdk/agent-runtime-test-contracts";
import { expectChannelInboundContextContract } from "openclaw/plugin-sdk/channel-contract-testing";
import {
  shouldAckReaction,
  removeAckReactionAfterReply,
} from "openclaw/plugin-sdk/channel-feedback";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";
import { createStartAccountContext } from "openclaw/plugin-sdk/channel-test-helpers";
import { createTestPluginApi } from "openclaw/plugin-sdk/plugin-test-api";
import { describePluginRegistrationContract } from "openclaw/plugin-sdk/plugin-test-contracts";
import { registerSingleProviderPlugin } from "openclaw/plugin-sdk/plugin-test-runtime";
import { getProviderHttpMocks } from "openclaw/plugin-sdk/provider-http-test-mocks";
import { describeOpenAIProviderRuntimeContract } from "openclaw/plugin-sdk/provider-test-contracts";
import { withEnv, withFetchPreconnect, withServer } from "openclaw/plugin-sdk/test-env";
import {
  bundledPluginRoot,
  createCliRuntimeCapture,
  runDirectImportSmoke,
  typedCases,
} from "openclaw/plugin-sdk/test-fixtures";
import { isLiveTestEnabled } from "openclaw/plugin-sdk/test-live";
import { createRequestCaptureJsonFetch } from "openclaw/plugin-sdk/test-media-understanding";
import { mockNodeBuiltinModule } from "openclaw/plugin-sdk/test-node-mocks";
import { createOpenClawTestState } from "openclaw/plugin-sdk/test-state";
```

请使用这些专用子路径进行自带插件测试。此前的 `openclaw/plugin-sdk/testing` 总入口仅供仓库本地使用，会被排除在已发布的软件包之外，现已移除。此前的 `openclaw/plugin-sdk/test-utils` 别名也已随之移除。`pnpm run lint:plugins:no-extension-test-core-imports` （`scripts/check-no-extension-test-core-imports.ts`）会确保扩展测试使用上面的专用测试子路径。

捆绑通道集成测试可以使用 `agent-runtime-test-contracts` 进行真实会话和订户固定装置，使用 `reply-payload-testing` 进行有效负载构建和交付结算，使用 `plugin-test-runtime` 进行挂钩运行程序和注册。这些帮手重用了他们的核心所有者；显式注册会话装置生命周期。当已公开所需的操作时，使用已发布的运行时子路径。

关闭保留的插件运行时句柄后，调用 `resetPluginRuntimeStateForTest()` 并等待 `plugin-test-runtime` 中的 `waitForPluginCacheRetirement(true)` 以包含借用的缓存生成。在删除夹具文件或恢复环境之前，断言其 `failures` 数组为空。被拒绝或失败的退赛必须保持赛程完好无损。

等待来自 `channel-ingress-test-runtime` 或 `plugin-state-test-runtime` 的 `listChannelIngressQueueAccountIdsForTests`。它使用共享只读工作线程并保留未创建的缺失状态。在删除设备的状态目录之前加入异步数据库清理。

对于直接工人固定装置，请将 `process-runtime` 中的 `resolveRuntimeWorkerUrl` 与 `test-env` 中的 `resolveRuntimeWorkerThreadExecArgv` 配对。这使源代码和构建的工作程序保留在运行时所有者的启动参数上。

当测试或挂钩延迟加载已编译的子进程声明时，请使用 `import "openclaw/plugin-sdk/compiled-subprocess-testing";` 在集合中预加载它。这个存储库本地的非生产子路径没有导出，并且使工作人员在测试截止日期之外进行准备，而不会在模拟或模块重置之前绑定主题。仅在已加载声明的测试中使用它。

### <a id="available-exports"></a> 可用导出项

| 导出项                                                                    | 用途                                                                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
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
| `expectDirectoryIds`                                                      | 从目录列表函数断言频道目录 ID。从 `plugin-sdk/channel-test-helpers` 导入                                  |
| `formatEnvelopeTimestamp`                                                 | 信封时间戳的格式保持一致。从 `plugin-sdk/channel-test-helpers` 导入                                                      |
| `expectPairingReplyText`                                                  | 断言频道配对回复文本并提取其中的代码。导入自 `plugin-sdk/channel-test-helpers`                                       |
| `describePluginRegistrationContract`                                      | 安装插件注册合同检查。导入自 `plugin-sdk/plugin-test-contracts`                                                 |
| `registerSingleProviderPlugin`                                            | 在加载器冒烟测试中注册单个提供商插件。导入自 `plugin-sdk/plugin-test-runtime`                                            |
| `registerProviderPlugin`                                                  | 捕获单个插件中的所有提供商类型。导入自 `plugin-sdk/plugin-test-runtime`                                                    |
| `registerProviderPlugins`                                                 | 捕获多个插件中的提供商注册信息。导入自 `plugin-sdk/plugin-test-runtime`                                        |
| `requireRegisteredProvider`                                               | 断言提供者集合包含一个 id。从 `plugin-sdk/plugin-test-runtime` 导入                                              |
| `createRuntimeEnv`                                                        | 构建模拟的 CLI/plugin 运行时环境。从 `plugin-sdk/plugin-test-runtime` 导入                                                 |
| `createPluginRuntimeMock`                                                 | 构建模拟的插件运行时接口。导入自 `plugin-sdk/plugin-test-runtime`                                                         |
| `createPluginSetupWizardStatus`                                           | 为频道插件构建设置状态辅助工具。导入自 `plugin-sdk/plugin-test-runtime`                                                |
| `createTestWizardPrompter`                                                | 构建模拟的设置向导提示器。导入自 `plugin-sdk/plugin-test-runtime`                                                          |
| `runProviderCatalog`                                                      | 使用测试依赖执行提供商目录钩子。导入自 `plugin-sdk/plugin-test-runtime`                                        |
| `resolveProviderModelPickerEntries`                                       | 在合同测试中解析提供商模型选择器条目。导入自 `plugin-sdk/plugin-test-runtime`                                       |
| `buildProviderPluginMethodChoice`                                         | 为断言构建提供者向导选择 ID。从 `plugin-sdk/plugin-test-runtime` 导入                                               |
| `setProviderWizardProvidersResolverForTest`                               | 为隔离测试注入提供商向导提供商。导入自 `plugin-sdk/plugin-test-runtime`                                           |
| `describeOpenAIProviderRuntimeContract`                                   | 安装提供商系列运行时合同检查。导入自 `plugin-sdk/provider-test-contracts`                                           |
| `expectPassthroughReplayPolicy`                                           | 断言提供商重放策略会透传提供商自有工具和元数据。导入自 `plugin-sdk/provider-test-contracts`            |
| `runRealtimeSttLiveTest`                                                  | 使用共用音频夹具运行实时实时 STT 提供商测试。导入自 `plugin-sdk/provider-test-contracts`                          |
| `normalizeTranscriptForMatch`                                             | 在模糊断言前规范化实时转录输出。导入自 `plugin-sdk/provider-test-contracts`                                  |
| `expectExplicitVideoGenerationCapabilities`                               | 断言视频提供商声明了明确的生成模式能力。导入自 `plugin-sdk/provider-test-contracts`                      |
| `expectExplicitMusicGenerationCapabilities`                               | 断言音乐提供商声明明确的 generation/edit 功能。从 `plugin-sdk/provider-test-contracts` 导入                      |
| `mockSuccessfulDashscopeVideoTask`                                        | 安装成功的 DashScope 兼容视频任务响应。导入自 `plugin-sdk/provider-test-contracts`                             |
| `getProviderHttpMocks`                                                    | 访问选择加入提供商 HTTP/auth Vitest 模拟。从 `plugin-sdk/provider-http-test-mocks` 导入                                            |
| `installProviderHttpMockCleanup`                                          | 每次测试后重置提供程序 HTTP/auth 模拟。从 `plugin-sdk/provider-http-test-mocks` 导入                                           |
| `createOpenClawTestState` / `withOpenClawTestState` / `OpenClawTestState` | 创建并清理隔离的 OpenClaw 状态、配置、工作区、环境和身份验证配置文件夹具。导入自 `plugin-sdk/test-state` |
| `installCommonResolveTargetErrorCases`                                    | 用于目标解析错误处理的共用测试用例。导入自 `plugin-sdk/channel-target-testing`                                     |
| `shouldAckReaction`                                                       | 检查频道是否应添加确认反应。导入自 `plugin-sdk/channel-feedback`                                               |
| `removeAckReactionAfterReply`                                             | 回复投递后移除确认反应。导入自 `plugin-sdk/channel-feedback`                                                         |
| `createTestRegistry`                                                      | 构建频道插件注册表夹具。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                  |
| `createEmptyPluginRegistry`                                               | 构建空的插件注册表夹具。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`                   |
| `createPluginMetadataSnapshotFixture`                                     | 使用对齐的清单和已安装插件视图构建完整的元数据快照。从 `plugin-sdk/plugin-test-runtime` 导入           |
| `setActivePluginRegistry`                                                 | 为插件运行时测试安装注册表夹具。导入自 `plugin-sdk/plugin-test-runtime` 或 `plugin-sdk/channel-test-helpers`      |
| `clearActivePluginRegistry`                                               | 清除活动注册表装置并等待停用的注册表完成清理。从 `plugin-sdk/plugin-test-runtime` 导入           |
| `waitForPluginRegistryRetirement`                                         | 观察已开始对替换注册表进行的清理，而无需清除活动装置。从 `plugin-sdk/plugin-test-runtime` 导入   |
| `createRequestCaptureJsonFetch`                                           | 在媒体辅助工具测试中捕获 JSON 获取请求。导入自 `plugin-sdk/test-media-understanding`                                        |
| `isLiveTestEnabled`                                                       | 控制是否启用选择性提供商实时测试。导入自 `plugin-sdk/test-live`                                                                         |
| `collectProviderApiKeys`                                                  | 发现提供商实时测试所需的凭据。导入自 `plugin-sdk/test-live-auth`                                                       |
| `parseProviderModelMap`                                                   | 解析 music/video 实时测试模型覆盖。从 `plugin-sdk/test-media-generation` 导入                                                 |
| `withServer`                                                              | 针对一次性本地 HTTP 服务器运行测试。导入自 `plugin-sdk/test-env`                                                         |
| `createMockIncomingRequest`                                               | 构建最小的传入 HTTP 请求对象。导入自 `plugin-sdk/test-env`                                                             |
| `withFetchPreconnect`                                                     | 在安装预连接钩子的情况下运行获取测试。导入自 `plugin-sdk/test-env`                                                          |
| `withEnv` / `withEnvAsync`                                                | 临时修改环境变量。导入自 `plugin-sdk/test-env`                                                                  |
| `createTempHomeEnv` / `withTempHome` / `withTempDir`                      | 创建隔离的文件系统测试夹具。导入自 `plugin-sdk/test-env`                                                                 |
| `createStagedInputOwnershipFixture`                                       | 创建所有者暂存的附件文件和无主的相似文件。从 `plugin-sdk/test-env` 导入                                              |
| `createMockServerResponse`                                                | 创建最小的 HTTP 服务器响应模拟。导入自 `plugin-sdk/test-env`                                                               |
| `createProviderUsageFetch`                                                | 构建提供商用量获取夹具。导入自 `plugin-sdk/test-env`                                                                      |
| `useFrozenTime` / `useRealTime`                                           | 为时间敏感型测试冻结并恢复计时器。导入自 `plugin-sdk/test-env`                                                       |
| `createCliRuntimeCapture`                                                 | 在测试中捕获 CLI 运行时输出。导入自 `plugin-sdk/test-fixtures`                                                                 |
| `findSourceImportBackedges`                                               | 异步检查存储库源静态导入闭包是否存在禁止的依赖项。从 `plugin-sdk/test-fixtures` 导入          |
| `runDirectImportSmoke`                                                    | 在隔离的 Node 进程中运行插件公共表面导入。从 `plugin-sdk/test-fixtures` 导入                                      |
| `importFreshModule`                                                       | 使用新的查询令牌导入 ESM 模块，以绕过模块缓存。导入自 `plugin-sdk/test-fixtures`                                |
| `bundledPluginRoot` / `bundledPluginFile`                                 | 解析捆绑插件源代码或 dist 夹具路径。导入自 `plugin-sdk/test-fixtures`                                                 |
| `mockNodeBuiltinModule`                                                   | 安装范围有限的 Node 内置模块 Vitest 模拟。导入自 `plugin-sdk/test-node-mocks`                                                          |
| `createSandboxTestContext`                                                | 构建沙箱测试上下文。导入自 `plugin-sdk/test-fixtures`                                                                         |
| `writeSkill`                                                              | 写入技能夹具。导入自 `plugin-sdk/test-fixtures`                                                                                |
| `makeAgentAssistantMessage`                                               | 构建代理转录消息夹具。导入自 `plugin-sdk/test-fixtures`                                                             |
| `peekSystemEvents` / `resetSystemEventsForTest`                           | 检查并重置系统事件夹具。导入自 `plugin-sdk/test-fixtures`                                                             |
| `sanitizeTerminalText`                                                    | 清理终端输出以便断言。导入自 `plugin-sdk/test-fixtures`                                                             |
| `countLines` / `hasBalancedFences`                                        | 断言分块输出结构。导入自 `plugin-sdk/test-fixtures`                                                                        |
| `typedCases`                                                              | 为表驱动测试保留字面量类型。导入自 `plugin-sdk/test-fixtures`                                                       |

自带插件合同测试套件也会使用这些 SDK 测试子路径来获取仅供测试使用的注册表、清单、公共产物和运行时夹具辅助工具。 依赖自带 OpenClaw 库存的核心专用套件则仍放在 `src/plugins/contracts` 下。

对于渠道帐户策略测试，`createAccountPolicyInheritanceCases()`从`openclaw/plugin-sdk/channel-test-helpers`每次调用时返回四个带有新对象和数组的文字继承行，保留省略的策略字段。旁边使用它`validateTestChannelConfig(channelId, channelConfig)`，它通过主机配置边界验证架构解析的通道数据。每个插件测试仍然拥有其架构解析、帐户解析器和断言，包括检查是否仍然不存在省略的帐户策略。

对于完整的零使用输入，`openclaw/plugin-sdk/test-fixtures` 中的 `createZeroUsageFixture()` 返回新的使用情况和嵌套成本对象，而无需可选的遥测字段。明确预期的使用价值。

### <a id="types"></a> 类型

重点测试子路径还重新导出测试文件中有用的类型：

```typescript
import type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
} from "openclaw/plugin-sdk/channel-contract";
import type { OpenClawConfig } from "openclaw/plugin-sdk/config-contracts";
import type { MockFn, PluginRuntime, RuntimeEnv } from "openclaw/plugin-sdk/plugin-test-runtime";
```

## <a id="testing-target-resolution"></a> 测试目标解析

使用 `installCommonResolveTargetErrorCases` 为频道目标解析添加标准错误案例：

```typescript
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/channel-target-testing";
import { describe } from "vitest";

describe("my-channel target resolution", () => {
  installCommonResolveTargetErrorCases({
    resolveTarget: ({ to, mode, allowFrom }) => {
      // Your channel's target resolution logic
      return myChannelResolveTarget({ to, mode, allowFrom });
    },
    implicitAllowFrom: ["user1", "user2"],
  });

  // Add channel-specific test cases
  it("should resolve @username targets", () => {
    // ...
  });
});
```

## <a id="testing-patterns"></a> 测试模式

### <a id="testing-registration-contracts"></a> 测试注册契约

将手写 `api` mock 传递给 `register(api)` 的单元测试，不会触发 OpenClaw 加载器的接受门槛。对于插件所依赖的每个注册入口， 至少添加一个基于加载器的冒烟测试，尤其是 hooks 以及诸如内存之类的独占能力。

真实加载器会在缺少必需元数据，或者插件调用了它不拥有的能力 API 时， 拒绝插件注册。例如，`api.registerHook(...)` 需要提供 hook 名称， 而 `api.registerMemoryCapability(...)` 则要求插件清单或导出的入口声明 `kind: "memory"`。

### <a id="testing-runtime-config-access"></a> 测试运行时配置访问

更喜欢 `openclaw/plugin-sdk/plugin-test-runtime` 的共享插件运行时模拟。它的运行时配置助手对当前快照和突变 API 进行建模。

### <a id="unit-testing-a-channel-plugin"></a> 频道插件的单元测试

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
    // No token value exposed
    expect(inspection).not.toHaveProperty("token");
  });
});
```

### <a id="unit-testing-a-provider-plugin"></a> 提供者插件的单元测试

对于解析提供程序端点功能的捆绑目录测试，请在文件或套件范围内从 `openclaw/plugin-sdk/plugin-test-runtime` 调用 `useProviderCatalogMetadata(new URL(".", import.meta.url))`。它会准备一次插件的清单元数据，安装并清除每个测试周围的快照，并在断言期间拒绝 Jiti 加载。这使得冷运行时发现超出了目录测试截止日期，而无需改变提供程序的行为。

当案例执行另一个提供商的端点时，传递额外的清单根，例如 `useProviderCatalogMetadata(new URL(".", import.meta.url), new URL("../google/", import.meta.url))`。在特定于路由的情况下断言端点类，以便丢失的元数据无法将提供者路由转变为意外的自定义端点情况。

```typescript
import { describe, it, expect } from "vitest";

describe("my-provider plugin", () => {
  it("should resolve dynamic models", () => {
    const model = myProvider.resolveDynamicModel({
      modelId: "custom-model-v2",
      // ... context
    });

    expect(model.id).toBe("custom-model-v2");
    expect(model.provider).toBe("my-provider");
    expect(model.api).toBe("openai-completions");
  });

  it("should return catalog when API key is available", async () => {
    const result = await myProvider.catalog.run({
      resolveProviderApiKey: () => ({ apiKey: "test-key" }),
      // ... context
    });

    expect(result?.provider?.models).toHaveLength(2);
  });
});
```

### <a id="mocking-the-plugin-runtime"></a> 模拟插件运行时

对于使用 `createPluginRuntimeStore` 的代码，请在测试中 mock 运行时：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "test-plugin",
  errorMessage: "test runtime not set",
});

// In test setup
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... other mocks
  },
  config: {
    current: vi.fn(() => ({}) as const),
    mutateConfigFile: vi.fn(),
    replaceConfigFile: vi.fn(),
  },
  // ... other namespaces
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// After tests
store.clearRuntime();
```

### <a id="testing-with-per-instance-stubs"></a> 使用按实例 stub 进行测试

优先使用按实例 stub，而不是修改原型：

```typescript
// Preferred: per-instance stub
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// Avoid: prototype mutation
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## <a id="contract-tests-(in-repo-plugins)"></a><a id="contract-tests-in-repo-plugins"></a> 合同测试（仓库内插件）

捆绑的内置插件包含合同测试，用于验证注册归属：

```bash
pnpm test src/plugins/contracts/
```

这些测试会断言：

- 哪些插件注册了哪些提供者
- 哪些插件注册了哪些语音提供者
- 注册结构是否正确
- 运行时契约是否满足要求

### <a id="running-scoped-tests"></a> 为特定范围运行测试

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

## <a id="lint-enforcement-(in-repo-plugins)"></a><a id="lint-enforcement-in-repo-plugins"></a> Lint 强制规则（仓库内插件）

`scripts/run-additional-boundary-checks.mts` 会在 CI 中运行一组 `lint:plugins:*` 导入边界检查；每项检查也可以在本地单独运行：

| 命令                                                        | 强制要求                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm run lint:plugins:no-monolithic-plugin-sdk-entry-imports` | 捆绑插件不能导入单体的 `openclaw/plugin-sdk` 根入口文件。              |
| `pnpm run lint:plugins:no-extension-src-imports`               | 生产扩展文件不能直接导入仓库的 `src/**` 目录树（`../../src/...`）。  |
| `pnpm run lint:plugins:no-extension-test-core-imports`         | 扩展测试文件不能导入已移除的 SDK 测试别名或其他仅供核心使用的测试辅助工具。 |

外部插件不受这些 lint 规则约束，但仍建议遵循相同模式。

## <a id="test-configuration"></a> 测试配置

OpenClaw 使用 Vitest 5 和信息性 V8 覆盖率报告。对于插件测试：

```bash
# Run all tests
pnpm test

# Run specific plugin tests
pnpm test <bundled-plugin-root>/my-channel/src/channel.test.ts

# Run with a specific test name filter
pnpm test <bundled-plugin-root>/my-channel/ -t "resolves account"

# Run with coverage
pnpm test:coverage
```

如果本地运行导致内存压力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## <a id="related"></a> 相关内容

- [SDK Overview](/plugins/sdk-overview) -- 导入约定
- [SDK Channel Plugins](/plugins/sdk-channel-plugins) -- 通道插件接口
- [SDK 提供者 Plugins](/plugins/sdk-provider-plugins) -- 提供者插件挂钩
- [Building Plugins](/plugins/building-plugins) -- 入门指南
