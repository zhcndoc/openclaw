---
summary: "用于向插件系统添加功能的序列、文件清单和契约测试模式"
read_when:
  - "添加新的插件功能"
  - "您正在决定应该拥有什么核心与供应商插件"
  - "您需要文件清单和合同测试模式来实现新功能"
title: "添加新功能"
sidebarTitle: "新能力"
---

添加插件 API 尚不具备的功能的推荐顺序，加上文件清单和合同测试模式。 [插件架构内部](/plugins/architecture-internals)指南的一部分。

## <a id="adding-a-new-capability"></a> 添加新能力

当插件需要当前 API 无法满足的行为时，不要通过私有方式绕过插件系统。应当补齐缺失的能力。

推荐顺序：

1. **定义核心契约。** 决定 core 应当拥有哪些共享行为： 策略、回退、配置合并、生命周期、面向通道的语义，以及运行时辅助函数的形态。
2. **添加类型化插件registration/runtime表面。** 使用最小的有用类型化功能表面扩展`OpenClawPluginApi` and/or `api.runtime`。
3. **Wire 核心 + channel/feature 消费者。** 通道和功能插件应通过核心使用新功能，而不是直接导入供应商实现。
4. **注册厂商实现。** 然后由厂商插件围绕该能力注册它们的后端。
5. **添加契约覆盖。** 添加测试，使所有权和注册形态在长期内保持明确。

这就是 OpenClaw 保持固执己见而不硬编码到某个提供商的世界观的方式。有关具体文件清单和工作示例，请参阅 [添加功能](/plugins/adding-capabilities)。

### <a id="capability-checklist"></a> 能力检查清单

当你添加一种新能力时，实现通常应该同时涉及这些表面：

- `src/<capability>/types.ts` 中的 core 契约类型
- core runner/runtime `src/<capability>/runtime.ts` 中的帮助程序
- `src/plugins/types.ts` 中的插件 API 注册表面
- `src/plugins/registry.ts` 中的插件注册表连接线
- 当 feature/channel 插件需要使用它时，plugin 运行时会在 `src/plugins/runtime/*` 中暴露
- capture/test `src/test-utils/plugin-registration.ts` 中的助手
- ownership/contract `src/plugins/contracts/registry.ts` 中的断言
- operator/plugin `docs/` 中的文档

如果其中某个表面缺失，通常意味着该能力还没有完全集成。

### <a id="capability-template"></a> 能力模板

最小模式：

```ts
// core contract
export type VideoGenerationProviderPlugin = {
  id: string;
  label: string;
  generateVideo: (req: VideoGenerationRequest) => Promise<VideoGenerationResult>;
};

// plugin API
api.registerVideoGenerationProvider({
  id: "xai",
  label: "xAI",
  async generateVideo(req) {
    // generateXaiVideo is a placeholder for your own vendor call.
    return await generateXaiVideo(req);
  },
});

// shared runtime helper for feature/channel plugins
const clip = await api.runtime.videoGeneration.generate({
  prompt: "Show the robot walking through the lab.",
  cfg,
});
```

契约测试模式（`src/plugins/contracts/registry.ts` 暴露诸如 `providerContractPluginIds` 之类的所有权查找；测试断言某个插件的 `contracts.videoGenerationProviders` 列表与其实际注册内容一致）：

```ts
expect(pluginManifest.contracts?.videoGenerationProviders).toEqual(["xai"]);
```

这样可以让规则保持简单：

- core 负责能力契约 + 编排
- 厂商插件负责厂商实现
- feature/channel 插件使用运行时助手
- 契约测试让所有权保持明确。
