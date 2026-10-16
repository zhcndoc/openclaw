---
summary: "插件和通道合约测试命令、类别以及何时运行它们"
title: "合同测试"
read_when:
  - "您更改了频道、提供商或插件 SDK 表面"
---

## <a id="contract-tests-(plugin-and-channel-shape)"></a><a id="contract-tests-plugin-and-channel-shape"></a> 契约测试（插件和通道形状）

契约测试验证每个注册的插件和通道是否符合其接口契约。他们迭代所有发现的插件并运行一套形状和行为断言。默认的 `pnpm test` 单元通道故意跳过这些共享边界和烟雾文件；当您触摸共享通道或提供者界面时显式运行合约命令。

### <a id="commands"></a> 命令

- 所有契约：`pnpm test:contracts`
- 仅通道契约：`pnpm test:contracts:channels`
- 仅提供方契约：`pnpm test:contracts:plugins`

### <a id="channel-contracts"></a> 通道契约

位于 `src/channels/plugins/contracts/*.contract.test.ts`。当前的顶层类别包括：

- **频道目录** - bundled/registry 频道目录条目元数据
- **plugin**（基于注册表，分片执行） - 基本插件注册形状
- **surfaces-only**（基于注册表，分片执行） - 针对 `actions`、`setup`、`status`、`outbound`、`messaging`、`threading`、`directory` 和 `gateway` 各接口的形状检查
- **session-binding**（基于注册表） - 会话绑定行为
- **outbound-payload** - 消息负载结构和规范化
- **group-policy**（回退） - 每个通道的默认群组策略强制执行
- **threading**（注册表支持，分片） - 线程 ID 处理
- **directory**（注册表支持，分片）- directory/roster API
- **registry** 和 **plugins-core.\*** - 通道插件注册表、加载器和配置写入授权内部逻辑

这些套件使用的入站调度捕获和出站有效负载harness助手通过 `src/plugin-sdk/channel-contract-testing.ts` 在内部公开（npm- 除外，不是公共 SDK 子路径）；此目录中没有独立的 `inbound.contract.test.ts` 文件。

### <a id="provider-contracts"></a> 提供方契约

位于 `src/plugins/contracts/*.contract.test.ts`。当前类别包括：

- **shape** - 插件清单、API 和运行时导出形状
- **plugin-registration**（+ 并行） - 清单注册用例
- **package-manifest** - 包清单要求
- **loader** - 插件加载器 setup/teardown 行为
- **registry** - 插件契约注册表内容和查找
- **providers** - 内置提供方之间的共享提供方行为，以及 Web 搜索提供方
- **auth-choice** - 身份验证选项元数据和设置行为
- **provider-catalog-deprecation** - 已弃用的提供方目录元数据
- **wizard.choice-resolution**、**wizard.model-picker**、**wizard.setup-options** - 提供方设置向导契约
- **embedding-provider**、**memory-embedding-provider**、**web-fetch-provider**、**tts** - 特定能力的提供方契约
- **session-actions**、**session-attachments**、**session-entry-projection** - 插件自有的会话状态契约
- **scheduled-turns** - 插件计划回合元数据和时间戳范围
- **主机挂钩**、**运行上下文生命周期**、**运行时导入副作用**、 **runtime-seams** - 插件 host/runtime 生命周期和导入边界合约
- **extension-runtime-dependencies** - 扩展的运行时依赖放置

### <a id="when-to-run"></a> 何时运行

- 在更改 plugin-sdk 导出或子路径之后
- 在添加或修改通道或提供方插件之后
- 在重构插件注册或发现逻辑之后

契约测试在 CI 中运行，不需要真实 API key。
