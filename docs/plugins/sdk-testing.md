---
summary: "OpenClaw 插件的测试工具和模式"
title: "插件测试"
sidebarTitle: "测试"
read_when:
  - 您正在为插件编写测试
  - 您需要插件 SDK 中的测试工具
  - 您想了解捆绑插件的契约测试
---

OpenClaw 插件的测试工具、模式和 lint 强制执行参考。

<Tip>
  **寻找测试示例？** 操作指南包含完整的测试示例：
  [频道插件测试](/plugins/sdk-channel-plugins#step-6-test) 和
  [提供者插件测试](/plugins/sdk-provider-plugins#step-6-test)。
</Tip>

## 测试工具

**导入：** `openclaw/plugin-sdk/testing`

testing 子路径导出了一组专为插件作者设计的辅助工具：

```typescript
import {
  installCommonResolveTargetErrorCases,
  shouldAckReaction,
  removeAckReactionAfterReply,
} from "openclaw/plugin-sdk/testing";
```

### 可用导出

| 导出                                 | 用途                                                |
| -------------------------------------- | ---------------------------------------------- |
| `installCommonResolveTargetErrorCases` | 目标解析错误处理的共享测试用例 |
| `shouldAckReaction`                    | 检查频道是否应添加确认反应     |
| `removeAckReactionAfterReply`          | 回复交付后移除确认反应               |

### 类型

testing 子路径还重新导出了测试文件中有用的类型：

```typescript
import type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
  OpenClawConfig,
  PluginRuntime,
  RuntimeEnv,
  MockFn,
} from "openclaw/plugin-sdk/testing";
```

## 测试目标解析

使用 `installCommonResolveTargetErrorCases` 为频道目标解析添加标准错误用例：

```typescript
import { describe } from "vitest";
import { installCommonResolveTargetErrorCases } from "openclaw/plugin-sdk/testing";

describe("my-channel target resolution", () => {
  installCommonResolveTargetErrorCases({
    resolveTarget: ({ to, mode, allowFrom }) => {
      // 您的频道的目标解析逻辑
      return myChannelResolveTarget({ to, mode, allowFrom });
    },
    implicitAllowFrom: ["user1", "user2"],
  });

  // 添加频道特定的测试用例
  it("should resolve @username targets", () => {
    // ...
  });
});
```

## 测试模式

### 单元测试频道插件

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
    // 不暴露令牌值
    expect(inspection).not.toHaveProperty("token");
  });
});
```

### 单元测试提供者插件

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

对于使用 `createPluginRuntimeStore` 的代码，在测试中模拟运行时：

```typescript
import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
import type { PluginRuntime } from "openclaw/plugin-sdk/runtime-store";

const store = createPluginRuntimeStore<PluginRuntime>({
  pluginId: "test-plugin",
  errorMessage: "test runtime not set",
});

// 在测试设置中
const mockRuntime = {
  agent: {
    resolveAgentDir: vi.fn().mockReturnValue("/tmp/agent"),
    // ... 其他模拟
  },
  config: {
    loadConfig: vi.fn(),
    writeConfigFile: vi.fn(),
  },
  // ... 其他命名空间
} as unknown as PluginRuntime;

store.setRuntime(mockRuntime);

// 测试后
store.clearRuntime();
```

### 使用每实例存根进行测试

优先使用每实例存根而不是原型突变：

```typescript
// 首选：每实例存根
const client = new MyChannelClient();
client.sendMessage = vi.fn().mockResolvedValue({ id: "msg-1" });

// 避免：原型突变
// MyChannelClient.prototype.sendMessage = vi.fn();
```

## 契约测试（仓库内插件）

捆绑插件具有验证注册所有权的契约测试：

```bash
pnpm test -- src/plugins/contracts/
```

这些测试断言：

- 哪些插件注册了哪些提供者
- 哪些插件注册了哪些语音提供者
- 注册结构的正确性
- 运行时契约合规性

### 运行范围测试

对于特定插件：

```bash
pnpm test -- <bundled-plugin-root>/my-channel/
```

仅针对契约测试：

```bash
pnpm test -- src/plugins/contracts/shape.contract.test.ts
pnpm test -- src/plugins/contracts/auth.contract.test.ts
pnpm test -- src/plugins/contracts/runtime.contract.test.ts
```

## Lint 强制执行（仓库内插件）

`pnpm check` 对仓库内插件强制执行三条规则：

1. **禁止单体根导入** -- `openclaw/plugin-sdk` 根导出文件被拒绝
2. **禁止直接 `src/` 导入** -- 插件不能直接导入 `../../src/`
3. **禁止自导入** -- 插件不能导入自己的 `plugin-sdk/<name>` 子路径

外部插件不受这些 lint 规则的约束，但建议遵循相同的模式。

## 测试配置

OpenClaw 使用带有 V8 覆盖率阈值的 Vitest。对于插件测试：

```bash
# 运行所有测试
pnpm test

# 运行特定插件测试
pnpm test -- <bundled-plugin-root>/my-channel/src/channel.test.ts

# 运行带有特定测试名称过滤器
pnpm test -- <bundled-plugin-root>/my-channel/ -t "resolves account"

# 运行覆盖率
pnpm test:coverage
```

如果本地运行导致内存压力：

```bash
OPENCLAW_VITEST_MAX_WORKERS=1 pnpm test
```

## 相关内容

- [SDK 概述](/plugins/sdk-overview) -- 导入约定
- [SDK 频道插件](/plugins/sdk-channel-plugins) -- 频道插件接口
- [SDK 提供者插件](/plugins/sdk-provider-plugins) -- 提供者插件钩子
- [构建插件](/plugins/building-plugins) -- 入门指南
