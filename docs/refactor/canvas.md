---
summary: "将 Canvas 从 core 移出并放入捆绑式实验插件的计划与审计清单。"
read_when:
  - 移动 Canvas 的宿主、工具、命令、文档或协议所有权时
  - 审计 Canvas 是否仍由 core 拥有时
  - 准备或审查实验性 Canvas 插件 PR 时
title: "Canvas 插件重构"
---

# Canvas 插件重构

Canvas 使用率低且处于实验阶段。请将其视为一个捆绑式插件，而不是 core 功能。Core 可以保留通用的 gateway、node、HTTP、auth、config 和 native-client 脚手架，但 Canvas 特定行为应放在 `extensions/canvas` 下。

## 目标

在保留当前成对节点行为的同时，将 Canvas 所有权迁移到 `extensions/canvas`：

- 面向 agent 的 `canvas` 工具由 Canvas 插件注册
- 仅当 Canvas 插件注册时，才允许 Canvas 节点命令
- A2UI 宿主/源文件位于 Canvas 插件下
- Canvas 文档 materialization 位于 Canvas 插件下
- CLI 命令实现位于 Canvas 插件下，或通过插件拥有的 runtime barrel 进行委派
- 文档和插件清单将 Canvas 描述为实验性且由插件支持

## 非目标

- 不要在这次重构中重新设计原生应用的 Canvas UI。
- 不要从 iOS、Android 或 macOS 中移除 Canvas 协议/客户端支持，除非有单独的产品决策说明 Canvas 应该被删除。
- 不要只为 Canvas 构建一个宽泛的插件服务框架，除非至少另一个捆绑式插件也需要相同的接口。

## 当前分支状态

已完成：

- 在 `extensions/canvas` 中添加了捆绑式插件包。
- 添加了 `extensions/canvas/openclaw.plugin.json`。
- 将面向 agent 的 `canvas` 工具从 `src/agents/tools/canvas-tool.ts` 移至 `extensions/canvas/src/tool.ts`。
- 从 `src/agents/openclaw-tools.ts` 中移除了 `createCanvasTool` 的 core 注册。
- 将 Canvas 宿主实现从 `src/canvas-host` 移至 `extensions/canvas/src/host`。
- 保留了 `extensions/canvas/runtime-api.ts` 作为插件拥有的兼容性 barrel，用于测试、打包和外部公开的 Canvas 辅助工具。
- 将 Canvas 文档 materialization 从 `src/gateway/canvas-documents.ts` 移至 `extensions/canvas/src/documents.ts`。
- 将 Canvas CLI 实现和 A2UI JSONL 辅助工具移至 `extensions/canvas/src/cli.ts`。
- 将 Canvas 宿主 URL 和作用域能力辅助工具移至 `extensions/canvas/src`。
- 将 Canvas 节点命令默认值从硬编码的 core 列表中移除，并放入插件 `nodeInvokePolicies`。
- 在 `plugins.entries.canvas.config.host` 下添加了插件拥有的 Canvas 宿主配置。
- 通过 Canvas 插件的 HTTP 路由注册，将 Canvas 和 A2UI 的 HTTP 服务移到其后。
- 为插件拥有的 HTTP 路由添加了通用插件 WebSocket 升级分发。
- 用通用的托管插件 surface 和节点能力辅助工具，替换了 Canvas 特定的 gateway 宿主 URL 和节点能力 auth。
- 添加了插件拥有的托管媒体解析器，使 Canvas 文档 URL 通过 Canvas 插件解析，而不是由 core 导入 Canvas 文档内部实现。
- 添加了 `api.registerNodeCliFeature(...)`，这样 Canvas 就可以通过插件拥有的节点功能声明 `openclaw nodes canvas`，而无需手动拼写父命令路径。
- 从生产环境的 `src/**` 中移除了对 `extensions/canvas/runtime-api.js` 的导入。
- 将 A2UI bundle 源从 `apps/shared/OpenClawKit/Tools/CanvasA2UI` 移至 `extensions/canvas/src/host/a2ui-app`。
- 将 A2UI 的构建/复制实现移至 `extensions/canvas/scripts`，并用通用的 bundled-plugin 资产挂钩替换了根级构建 wiring。
- 移除了运行时旧的顶层 `canvasHost` 配置别名。
- 保留了 Canvas doctor 迁移，因此 `openclaw doctor --fix` 会把旧的 `canvasHost` 配置重写为 `plugins.entries.canvas.config.host`。
- 在 gateway protocol v4 之后，移除了旧的 agent Canvas 协议兼容层。原生客户端和 gateway 现在仅使用 `pluginSurfaceUrls.canvas` 和 `node.pluginSurface.refresh`；弃用的 `canvasHostUrl`、`canvasCapability` 和 `node.canvas.capability.refresh` 路径在此实验性重构中被有意设为不支持。
- 更新了生成的插件清单以包含 Canvas。
- 在 `docs/plugins/reference/canvas.md` 添加了插件参考文档。

已知仍由 core 拥有的 Canvas surface：

- `apps/` 下的原生应用 Canvas handlers 仍然有意消费 Canvas 插件 surface
- `apps/` 下的原生应用 Canvas 协议/客户端 handlers
- 已发布制品输出仍使用 `dist/canvas-host/a2ui` 进行向后兼容的运行时查找，但复制步骤现在由插件拥有

## 目标形态

`extensions/canvas` 应拥有：

- 插件 manifest 和包元数据
- agent 工具注册
- 节点 invoke 命令策略
- Canvas 宿主和 A2UI 运行时
- Canvas A2UI bundle 源及资产构建/复制脚本
- Canvas 文档创建和资产解析
- Canvas CLI 实现
- Canvas 文档页面和插件清单条目

Core 应仅拥有通用接口：

- 插件发现和注册
- 通用 agent 工具注册表
- 通用节点 invoke 策略注册表
- 通用 gateway HTTP/auth 和 WebSocket 升级分发
- 通用托管插件 surface URL 解析
- 通用托管媒体解析器注册
- 通用节点能力传输
- 通用配置脚手架
- 通用 bundled-plugin 资产挂钩发现

原生应用可以保留 Canvas 命令 handlers 作为协议客户端。它们不是插件运行时拥有者。

## 迁移步骤

1. 将 `plugins.entries.canvas.config.host` 视为插件拥有的配置 surface。
2. 更新文档，使 Canvas 被描述为实验性的捆绑式插件。
3. 运行受影响的、聚焦 Canvas 的测试、插件清单检查、插件 SDK API 检查，以及构建/类型门禁。

## 审计清单

在确认重构完成之前：

- `rg "src/canvas-host|../canvas-host"` 不返回任何活跃的源代码导入。
- `rg "canvas-tool|createCanvasTool" src` 找不到 core 拥有的 Canvas 工具实现。
- `rg "canvas.present|canvas.snapshot|canvas.a2ui" src/gateway` 找不到 generic plugin policy tests 之外的硬编码 allowlist 默认值。
- `rg "extensions/canvas/runtime-api" src --glob '!**/*.test.ts'` 为空。
- `rg "canvas-documents" src` 为空。
- `rg "registerNodesCanvasCommands|nodes-canvas" src` 为空；Canvas 插件通过嵌套插件 CLI 元数据注册 `openclaw nodes canvas`。
- `rg "createCanvasHostHandler|handleA2uiHttpRequest" src/gateway` 不再返回 gateway 运行时所有权。
- `rg "apps/shared/OpenClawKit/Tools/CanvasA2UI|canvas-a2ui-copy|extensions/canvas/src/host/a2ui" scripts .github package.json` 只找到兼容性封装或插件拥有路径。
- `pnpm plugins:inventory:check` 通过。
- `pnpm plugin-sdk:api:check` 通过，或者已故意更新并审查生成的 API 基线。
- 目标 Canvas 测试通过。
- Canvas 宿主/A2UI 路径的 changed-lanes 测试通过。
- PR 正文明确说明 Canvas 是实验性的且由插件支持。

## 验证命令

迭代时使用有针对性的本地检查：

```sh
pnpm test extensions/canvas/src/host/server.test.ts extensions/canvas/src/host/server.state-dir.test.ts extensions/canvas/src/host/file-resolver.test.ts
pnpm test src/gateway/server.plugin-node-capability-auth.test.ts src/gateway/server-import-boundary.test.ts
pnpm test extensions/canvas/src/config-migration.test.ts src/commands/doctor-legacy-config.migrations.test.ts
pnpm test test/scripts/changed-lanes.test.ts test/scripts/build-all.test.ts extensions/canvas/scripts/bundle-a2ui.test.ts test/scripts/bundled-plugin-assets.test.ts extensions/canvas/scripts/copy-a2ui.test.ts src/infra/run-node.test.ts
pnpm tsgo:extensions
pnpm plugins:inventory:check
pnpm plugin-sdk:api:check
```

如果 runtime barrel、lazy import、打包或已发布插件 surface 发生变化，请在推送前运行 `pnpm build`。
