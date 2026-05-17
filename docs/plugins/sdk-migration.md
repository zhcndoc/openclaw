---
summary: "从旧版向后兼容层迁移到现代插件 SDK"
title: "插件 SDK 迁移"
sidebarTitle: "迁移到 SDK"
read_when:
  - 你看到 OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED 警告
  - 你看到 OPENCLAW_EXTENSION_API_DEPRECATED 警告
  - 你在 OpenClaw 2026.4.25 之前使用过 api.registerEmbeddedExtensionFactory
  - 你正在将插件更新到现代插件架构
  - 你维护一个外部 OpenClaw 插件
---

OpenClaw 已经从一个广泛的向后兼容层迁移到了现代插件架构，采用了聚焦且有文档说明的导入方式。如果你的插件是在新架构之前构建的，本指南将帮助你完成迁移。

## 正在发生的变化

旧的插件系统提供了两个开放面，让插件可以从单一入口导入所需的任何内容：

- **`openclaw/plugin-sdk/compat`** - 单一导入，重新导出了数十个
  辅助工具。它的引入是为了在新插件架构构建期间，让更早的基于 hook 的插件继续工作。
- **`openclaw/plugin-sdk/infra-runtime`** - 一个宽泛的运行时辅助工具总入口，
  混合了系统事件、心跳状态、投递队列、fetch/proxy 辅助工具、
  文件辅助工具、审批类型以及无关的实用工具。
- **`openclaw/plugin-sdk/config-runtime`** - 一个宽泛的配置兼容总入口，
  在迁移窗口期间仍然保留已弃用的直接加载/写入辅助工具。
- **`openclaw/extension-api`** - 一个桥接层，让插件可以直接访问
  主机侧辅助工具，例如嵌入式代理运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一个已移除的仅 Pi 打包
  扩展 hook，可观察嵌入式运行器事件，例如
  `tool_result`。

这些广泛的导入面现在都已**弃用**。它们在运行时仍然可用，但新插件不得使用它们，现有插件应在下一个大版本移除它们之前完成迁移。仅 Pi 的嵌入式扩展工厂注册 API 已经被移除；请改用 tool-result 中间件。

OpenClaw 不会在引入替代方案的同一次变更中移除或重新解释已文档化的插件行为。任何破坏性契约变更都必须先经过兼容适配器、诊断、文档和弃用窗口。这适用于 SDK 导入、清单字段、设置 API、hook 以及运行时注册行为。

<Warning>
  这层向后兼容机制将在未来的大版本中移除。仍然从这些面导入的插件在那时会失效。
  仅 Pi 的嵌入式扩展工厂注册现在已经不会再加载。
</Warning>

## 为什么会这样改

旧方案带来了这些问题：

- **启动缓慢** - 导入一个辅助工具会加载数十个无关模块
- **循环依赖** - 宽泛的重新导出很容易创建导入环
- **API 面不清晰** - 无法判断哪些导出是稳定的，哪些是内部的

现代插件 SDK 解决了这些问题：每个导入路径（`openclaw/plugin-sdk/\<subpath\>`）都是一个小型、自包含的模块，具有明确用途和文档化契约。

捆绑通道的旧 provider 便利接缝也已经移除。带通道品牌的辅助接缝是私有的单仓库快捷方式，不是稳定的插件契约。请改用更窄的通用 SDK 子路径。在捆绑插件工作区内部，将 provider 自有的辅助工具保留在该插件自己的 `api.ts` 或 `runtime-api.ts` 中。

当前的捆绑 provider 示例：

- Anthropic 将 Claude 专用流式辅助工具保留在自己的 `api.ts` / `contract-api.ts` 接缝中
- OpenAI 将 provider 构建器、默认模型辅助工具以及实时 provider 构建器保留在自己的 `api.ts` 中
- OpenRouter 将 provider 构建器以及 onboarding/config 辅助工具保留在自己的 `api.ts` 中

## Talk 和实时语音迁移计划

实时语音、电话、会议和浏览器 Talk 代码正在从
表面局部的轮次记账迁移到由 `openclaw/plugin-sdk/realtime-voice` 导出的共享 Talk 会话控制器。新的控制器负责通用 Talk 事件封装、当前轮次状态、捕获状态、输出音频状态、最近事件历史以及过期轮次拒绝。provider 插件应继续负责各自供应商的实时会话；表面插件应继续负责捕获、播放、电话和会议的特定差异。

这次 Talk 迁移是有意进行的“干净破坏”：

1. 将共享控制器/运行时原语保留在
   `plugin-sdk/realtime-voice` 中。
2. 将捆绑表面迁移到共享控制器上：浏览器中继、
   托管房间交接、语音通话实时、语音通话流式 STT、Google
   Meet 实时，以及原生按住说话。
3. 将旧的 Talk RPC 家族替换为最终的 `talk.session.*` 和
   `talk.client.*` API。
4. 在 Gateway 的
   `hello-ok.features.events` 中宣布一个在线 Talk 事件通道：`talk.event`。
5. 删除旧的实时 HTTP 端点以及任何请求时指令
   覆盖路径。

新代码不应直接调用 `createTalkEventSequencer(...)`，除非它正在实现低层适配器或测试夹具。请优先使用共享控制器，这样就不能在没有轮次 id 的情况下发出轮次范围内的事件，过期的 `turnEnd` /
`turnCancel` 调用也不能清除更新的当前轮次，并且输出音频生命周期事件能在电话、会议、浏览器中继、托管房间交接和原生 Talk 客户端之间保持一致。

目标公共 API 形态如下：

```typescript
// 由 Gateway 拥有的 Talk 会话 API。
await gateway.request("talk.session.create", {
  mode: "realtime",
  transport: "gateway-relay",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.session.appendAudio", { sessionId, audioBase64 });
await gateway.request("talk.session.cancelOutput", { sessionId, reason: "barge-in" });
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "working" },
  options: { willContinue: true },
});
await gateway.request("talk.session.submitToolResult", {
  sessionId,
  callId,
  result: { status: "already_delivered" },
  options: { suppressResponse: true },
});
await gateway.request("talk.session.submitToolResult", { sessionId, callId, result });
await gateway.request("talk.session.close", { sessionId });

// 由客户端拥有的 provider 会话 API。
await gateway.request("talk.client.create", {
  mode: "realtime",
  transport: "webrtc",
  brain: "agent-consult",
  sessionKey: "main",
});
await gateway.request("talk.client.toolCall", { sessionKey, callId, name, args });
```

浏览器拥有的 WebRTC/provider-websocket 会话使用 `talk.client.create`，
因为浏览器负责 provider 协商和媒体传输，而 Gateway 负责凭据、指令和工具策略。`talk.session.*` 是用于 gateway-relay 实时、gateway-relay 转写以及 managed-room 原生 STT/TTS 会话的通用 Gateway 托管表面。

把实时选择器放在 `talk.provider` /
`talk.providers` 旁边的旧配置应使用 `openclaw doctor --fix` 修复；运行时 Talk 不会把语音/TTS provider 配置重新解释为实时 provider 配置。

支持的 `talk.session.create` 组合有意保持很小：

| 模式              | 传输            | 大脑            | 所有者               | 说明                                                                                                               |
| --------------- | --------------- | --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `realtime`      | `gateway-relay` | `agent-consult` | Gateway            | 通过 Gateway 桥接的全双工 provider 音频；工具调用通过 agent-consult 工具路由。      |
| `transcription` | `gateway-relay` | `none`          | Gateway            | 仅流式 STT；调用方发送输入音频并接收转写事件。                                        |
| `stt-tts`       | `managed-room`  | `agent-consult` | 原生/客户端房间      | 按住说话和对讲机风格的房间，由客户端负责捕获/播放，Gateway 负责轮次状态。 |
| `stt-tts`       | `managed-room`  | `direct-tools`  | 原生/客户端房间      | 仅管理员可用的房间模式，供可信的一方表面直接执行 Gateway 工具操作。                  |

已移除的方法映射：

| 旧接口                              | 新接口                                                      |
| -------------------------------- | -------------------------------------------------------- |
| `talk.realtime.session`          | `talk.client.create`                                     |
| `talk.realtime.toolCall`         | `talk.client.toolCall`                                   |
| `talk.realtime.relayAudio`       | `talk.session.appendAudio`                               |
| `talk.realtime.relayCancel`      | `talk.session.cancelOutput` or `talk.session.cancelTurn` |
| `talk.realtime.relayToolResult`  | `talk.session.submitToolResult`                          |
| `talk.realtime.relayStop`        | `talk.session.close`                                     |
| `talk.transcription.session`     | `talk.session.create({ mode: "transcription" })`         |
| `talk.transcription.relayAudio`  | `talk.session.appendAudio`                               |
| `talk.transcription.relayCancel` | `talk.session.cancelTurn`                                |
| `talk.transcription.relayStop`   | `talk.session.close`                                     |
| `talk.handoff.create`            | `talk.session.create({ transport: "managed-room" })`     |
| `talk.handoff.join`              | `talk.session.join`                                      |
| `talk.handoff.revoke`            | `talk.session.close`                                     |

统一的控制词汇也刻意保持狭窄：

| 方法                          | 适用范围                                              | 契约                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | 将 base64 PCM 音频块追加到同一 Gateway 连接拥有的 provider 会话。                                                                                            |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 开始一个 managed-room 用户轮次。                                                                                                                                                          |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在通过过期轮次校验后结束当前轮次。                                                                                                                                         |
| `talk.session.cancelTurn`       | all Gateway-owned sessions                              | 取消某个轮次的当前捕获/provider/agent/TTS 工作。                                                                                                                                |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助手音频输出，但不一定结束用户轮次。                                                                                                                    |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成由中继发出的 provider 工具调用；对于中间输出传入 `options.willContinue`，或传入 `options.suppressResponse` 以在不触发另一条 assistant 回复的情况下满足该调用。 |
| `talk.session.close`            | all unified sessions                                    | 停止中继会话或撤销 managed-room 状态，然后忘记统一会话 id。                                                                                                    |

不要在 core 中引入 provider 或平台特殊分支来实现这一点。
Core 负责 Talk 会话语义。Provider 插件负责供应商会话初始化。
语音通话和 Google Meet 负责电话/会议适配器。浏览器和原生
应用负责设备捕获/播放体验。

## 兼容性政策

对于外部插件，兼容性工作遵循以下顺序：

1. 添加新的契约
2. 通过兼容适配器继续保持旧行为
3. 发出诊断或警告，说明旧路径和替代路径
4. 在测试中覆盖两条路径
5. 记录弃用和迁移路径
6. 仅在公布的迁移窗口之后才移除，通常是在某个大版本中

维护者可以使用 `pnpm plugins:boundary-report` 审核当前迁移队列。使用 `pnpm plugins:boundary-report:summary` 获取简要计数，使用 `--owner <id>` 查看单个插件或兼容性负责人，使用 `pnpm plugins:boundary-report:ci` 让 CI 在存在待处理兼容记录、跨负责人保留的 SDK 导入或未使用的保留 SDK 子路径时失败。该报告会按移除日期分组已弃用的兼容记录，统计本地代码/文档引用，展示跨负责人保留的 SDK 导入，并汇总私有内存主机 SDK 桥接，以便兼容性清理保持明确，而不是依赖临时搜索。保留的 SDK 子路径必须具有已追踪的负责人使用情况；未使用的保留辅助导出应从公共 SDK 中移除。

如果某个清单字段仍被接受，插件作者可以继续使用它，直到文档和诊断另有说明。新代码应优先使用文档化的替代方案，但现有插件在常规次版本发布期间不应被破坏。

## 如何迁移

<Steps>
  <Step title="迁移运行时配置的加载/写入辅助工具">
    捆绑插件应停止直接调用 `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。优先使用已经传入当前调用路径的配置。
    需要当前进程快照的长生命周期处理器可以使用 `api.runtime.config.current()`。
    长生命周期 agent 工具应在 `execute` 中使用工具上下文的 `ctx.getRuntimeConfig()`，
    这样即使某个工具是在配置写入之前创建的，也仍然能看到刷新后的运行时配置。

    配置写入必须通过事务型辅助工具，并选择写后策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    当调用方知道该变更需要一次干净的 gateway 重启时，请使用 `afterWrite: { mode: "restart", reason: "..." }`，
    只有当调用方负责后续流程并且有意抑制重载规划器时，才使用
    `afterWrite: { mode: "none", reason: "..." }`。
    变更结果会包含一个用于测试和日志记录的类型化 `followUp` 摘要；
    gateway 仍然负责应用或调度重启。
    在迁移窗口期间，`loadConfig` 和 `writeConfigFile` 仍作为已弃用的兼容
    辅助工具供外部插件使用，并会通过
    `runtime-config-load-write` 兼容代码只警告一次。捆绑插件和仓库
    运行时代码受到 `pnpm check:deprecated-api-usage` 和
    `pnpm check:no-runtime-action-load-config` 的扫描防护：新的生产插件
    用法会直接失败，直接配置写入会失败，gateway 服务端方法必须使用请求时运行时快照，
    运行时 channel send/action/client 辅助工具必须从其边界接收配置，
    且长生命周期运行时模块不允许存在任何环境中的 `loadConfig()` 调用。

    新的插件代码还应避免导入宽泛的 `openclaw/plugin-sdk/config-runtime` 兼容总入口。请使用与任务匹配的窄 SDK 子路径：

    | 需求 | 导入 |
    | --- | --- |
    | 配置类型，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-contracts` |
    | 已加载配置断言和插件入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 当前运行时快照读取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置写入 | `openclaw/plugin-sdk/config-mutation` |
    | 会话存储辅助工具 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 组策略运行时辅助工具 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 密钥输入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/会话覆盖 | `openclaw/plugin-sdk/model-session-runtime` |

    捆绑插件及其测试受扫描防护限制，不允许使用这个宽泛的总入口，因此导入和 mock 都保持在所需行为的本地范围内。这个宽泛总入口仍为外部兼容性而存在，但新代码不应依赖它。

  </Step>

  <Step title="将 Pi 的 tool-result 扩展迁移到中间件">
    捆绑插件必须用运行时中立的中间件替换仅 Pi 可用的
    `api.registerEmbeddedExtensionFactory(...)` tool-result 处理器。

    ```typescript
    // Pi 和 Codex 运行时动态工具
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部插件不能注册 tool-result 中间件，因为它可以在模型看到之前重写高信任度的工具输出。

  </Step>

  <Step title="将基于审批的处理器迁移到能力事实">
    具备审批能力的通道插件现在通过 `approvalCapability.nativeRuntime` 以及共享的运行时上下文注册表暴露原生审批行为。

    关键变化：

    - 将 `approvalCapability.handler.loadRuntime(...)` 替换为 `approvalCapability.nativeRuntime`
    - 将审批特定的认证/投递逻辑从旧的 `plugin.auth` / `plugin.approvals` 绑定中移出，并迁移到 `approvalCapability`
    - `ChannelPlugin.approvals` 已从公共 channel-plugin 契约中移除；请将 delivery/native/render 字段迁移到 `approvalCapability` 上
    - `plugin.auth` 仍仅用于通道登录/登出流程；其中的审批认证 hook 不再被核心读取
    - 通过 `openclaw/plugin-sdk/channel-runtime-context` 注册通道拥有的运行时对象，例如客户端、token 或 Bolt 应用
    - 不要从原生审批处理器发送插件拥有的 reroute 通知；核心现在从实际投递结果中负责“转到其他位置”的通知
    - 在将 `channelRuntime` 传入 `createChannelManager(...)` 时，请提供真实的 `createPluginRuntime().channel` 面。部分 stub 会被拒绝

    请参阅 `/plugins/sdk-channel-plugins` 获取当前审批能力布局。

  </Step>

  <Step title="审计 Windows wrapper 回退行为">
    如果你的插件使用 `openclaw/plugin-sdk/windows-spawn`，那么未解析的 Windows
    `.cmd`/`.bat` wrapper 现在会默认失败关闭，除非你显式传入 `allowShellFallback: true`。

    ```typescript
    // 之前
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // 之后
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // 仅当可信的兼容性调用方明确接受经由 shell 的回退时才设置此项。
      allowShellFallback: true,
    });
    ```

    如果你的调用方并不刻意依赖 shell 回退，不要设置 `allowShellFallback`，而应改为处理抛出的错误。

  </Step>

  <Step title="查找已弃用导入">
    在你的插件中搜索来自任一已弃用面导入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/infra-runtime" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替换为聚焦导入">
    旧面中的每个导出都对应一个具体的现代导入路径：

    ```typescript
    // 之前（已弃用的向后兼容层）
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // 之后（现代的聚焦导入）
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    对于宿主侧辅助工具，请使用注入的插件运行时，而不是直接导入：

    ```typescript
    // 之前（已弃用的 extension-api 桥接）
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // 之后（注入的运行时）
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    同样的模式也适用于其他旧的桥接辅助工具：

    | 旧导入 | 现代等价项 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | 会话存储辅助工具 | `api.runtime.agent.session.*` |

  </Step>

  <Step title="替换宽泛的 infra-runtime 导入">
    `openclaw/plugin-sdk/infra-runtime` 仍为外部兼容性而存在，但新代码应导入它实际需要的聚焦辅助工具面：

    | 需求 | 导入 |
    | --- | --- |
    | 系统事件队列辅助工具 | `openclaw/plugin-sdk/system-event-runtime` |
    | 心跳唤醒、事件和可见性辅助工具 | `openclaw/plugin-sdk/heartbeat-runtime` |
    | 待投递队列清空 | `openclaw/plugin-sdk/delivery-queue-runtime` |
    | 通道活动遥测 | `openclaw/plugin-sdk/channel-activity-runtime` |
    | 内存去重缓存 | `openclaw/plugin-sdk/dedupe-runtime` |
    | 安全的本地文件/媒体路径辅助工具 | `openclaw/plugin-sdk/file-access-runtime` |
    | 具备调度器感知的 fetch | `openclaw/plugin-sdk/runtime-fetch` |
    | 代理和受保护的 fetch 辅助工具 | `openclaw/plugin-sdk/fetch-runtime` |
    | SSRF 调度器策略类型 | `openclaw/plugin-sdk/ssrf-dispatcher` |
    | 审批请求/解析类型 | `openclaw/plugin-sdk/approval-runtime` |
    | 审批回复负载和命令辅助工具 | `openclaw/plugin-sdk/approval-reply-runtime` |
    | 错误格式化辅助工具 | `openclaw/plugin-sdk/error-runtime` |
    | 传输就绪等待 | `openclaw/plugin-sdk/transport-ready-runtime` |
    | 安全令牌辅助工具 | `openclaw/plugin-sdk/secure-random-runtime` |
    | 有界异步任务并发 | `openclaw/plugin-sdk/concurrency-runtime` |
    | 数值强制转换 | `openclaw/plugin-sdk/number-runtime` |
    | 进程本地异步锁 | `openclaw/plugin-sdk/async-lock-runtime` |
    | 文件锁 | `openclaw/plugin-sdk/file-lock` |

    捆绑插件受 `infra-runtime` 扫描防护限制，因此仓库代码不能退回到这个宽泛总入口。

  </Step>

  <Step title="迁移通道 route 辅助工具">
    新的通道路由代码应使用 `openclaw/plugin-sdk/channel-route`。
    较旧的 route-key 和可比较目标名称在迁移窗口期间仍保留为兼容别名，但新插件应使用能直接描述行为的 route 名称：

    | 旧辅助工具 | 现代辅助工具 |
    | --- | --- |
    | `channelRouteIdentityKey(...)` | `channelRouteDedupeKey(...)` |
    | `channelRouteKey(...)` | `channelRouteCompactKey(...)` |
    | `ComparableChannelTarget` | `ChannelRouteParsedTarget` |
    | `resolveComparableTargetForChannel(...)` | `resolveRouteTargetForChannel(...)` |
    | `resolveComparableTargetForLoadedChannel(...)` | `resolveRouteTargetForLoadedChannel(...)` |
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    现代 route 辅助工具会在原生审批、回复抑制、入站去重、cron 投递和会话路由中一致地规范化 `{ channel, to, accountId, threadId }`。如果你的插件拥有自定义 target 语法，请使用 `resolveChannelRouteTargetWithParser(...)` 将该解析器适配到相同的 route target 契约中。

  </Step>

  <Step title="构建并测试">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 导入路径参考

<Accordion title="常见导入路径表">
  | 导入路径 | 用途 | 关键导出 |
  | --- | --- | --- |
  | `plugin-sdk/plugin-entry` | 规范插件入口辅助工具 | `definePluginEntry` |
  | `plugin-sdk/core` | 用于通道入口定义/构建器的旧式大一统重导出 | `defineChannelPluginEntry`, `createChatChannelPlugin` |
  | `plugin-sdk/config-schema` | 根配置 schema 导出 | `OpenClawSchema` |
  | `plugin-sdk/provider-entry` | 单 provider 入口辅助工具 | `defineSingleProviderPluginEntry` |
  | `plugin-sdk/channel-core` | 聚焦的通道入口定义和构建器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
  | `plugin-sdk/setup` | 共享设置向导辅助工具 | 设置翻译器、allowlist 提示、设置状态构建器 |
  | `plugin-sdk/setup-runtime` | 设置时运行时辅助工具 | `createSetupTranslator`, 导入安全的设置补丁适配器、查找注释辅助工具、`promptResolvedAllowFrom`, `splitSetupEntries`, 代理式设置 proxy |
  | `plugin-sdk/setup-adapter-runtime` | 已弃用的设置适配器别名 | 使用 `plugin-sdk/setup-runtime` |
  | `plugin-sdk/setup-tools` | 设置工具辅助工具 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
  | `plugin-sdk/account-core` | 多账户辅助工具 | 账户列表/配置/操作门控辅助工具 |
  | `plugin-sdk/account-id` | 账户 id 辅助工具 | `DEFAULT_ACCOUNT_ID`, 账户 id 规范化 |
  | `plugin-sdk/account-resolution` | 账户查找辅助工具 | 账户查找 + 默认回退辅助工具 |
  | `plugin-sdk/account-helpers` | 窄范围账户辅助工具 | 账户列表/账户操作辅助工具 |
  | `plugin-sdk/channel-setup` | 设置向导适配器 | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
  | `plugin-sdk/channel-pairing` | DM 配对原语 | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | 回复前缀、typing 和来源投递 wiring | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` |
  | `plugin-sdk/channel-config-helpers` | 配置适配器工厂和 DM 访问辅助工具 | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
  | `plugin-sdk/channel-config-schema` | 配置 schema 构建器 | 共享的通道配置 schema 原语以及通用构建器 |
  | `plugin-sdk/bundled-channel-config-schema` | 捆绑配置 schema | 仅 OpenClaw 维护的捆绑插件可用；新插件必须定义插件本地 schema |
  | `plugin-sdk/channel-config-schema-legacy` | 已弃用的捆绑配置 schema | 仅兼容别名；受维护的捆绑插件请使用 `plugin-sdk/bundled-channel-config-schema` |
  | `plugin-sdk/telegram-command-config` | Telegram 命令配置辅助工具 | 命令名规范化、描述截断、重复/冲突校验 |
  | `plugin-sdk/channel-policy` | 组/DM 策略解析 | `resolveChannelGroupRequireMention` |
  | `plugin-sdk/channel-lifecycle` | 账户状态和草稿流生命周期辅助工具 | `createAccountStatusSink`, 草稿预览完成辅助工具 |
  | `plugin-sdk/inbound-envelope` | 入站信封辅助工具 | 共享 route + 信封构建器辅助工具 |
  | `plugin-sdk/inbound-reply-dispatch` | 入站回复辅助工具 | 共享记录并分发辅助工具 |
  | `plugin-sdk/messaging-targets` | 消息目标解析 | 目标解析/匹配辅助工具 |
  | `plugin-sdk/outbound-media` | 出站媒体辅助工具 | 共享出站媒体加载 |
  | `plugin-sdk/outbound-send-deps` | 出站发送依赖辅助工具 | 轻量级 `resolveOutboundSendDep` 查找，无需导入完整的 outbound runtime |
  | `plugin-sdk/outbound-runtime` | 出站运行时辅助工具 | 出站投递、identity/send delegate、会话、格式化和负载规划辅助工具 |
  | `plugin-sdk/thread-bindings-runtime` | 线程绑定辅助工具 | 线程绑定生命周期和适配器辅助工具 |
  | `plugin-sdk/agent-media-payload` | 旧版媒体负载辅助工具 | 面向旧字段布局的 agent 媒体负载构建器 |
  | `plugin-sdk/channel-runtime` | 已弃用的兼容 shim | 仅旧版通道运行时实用工具 |
  | `plugin-sdk/channel-send-result` | 发送结果类型 | 回复结果类型 |
  | `plugin-sdk/runtime-store` | 持久化插件存储 | `createPluginRuntimeStore` |
  | `plugin-sdk/runtime` | 宽泛运行时辅助工具 | 运行时/日志/备份/插件安装辅助工具 |
  | `plugin-sdk/runtime-env` | 窄范围运行时 env 辅助工具 | logger/runtime env、timeout、retry 和 backoff 辅助工具 |
  | `plugin-sdk/plugin-runtime` | 共享插件运行时辅助工具 | 插件 commands/hooks/http/interactive 辅助工具 |
  | `plugin-sdk/hook-runtime` | hook pipeline 辅助工具 | 共享 webhook/internal hook pipeline 辅助工具 |
  | `plugin-sdk/lazy-runtime` | 懒加载运行时辅助工具 | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` |
  | `plugin-sdk/process-runtime` | 进程辅助工具 | 共享 exec 辅助工具 |
  | `plugin-sdk/cli-runtime` | CLI 运行时辅助工具 | 命令格式化、等待、版本辅助工具 |
  | `plugin-sdk/gateway-runtime` | Gateway 辅助工具 | Gateway client、event-loop-ready start 辅助工具和 channel-status patch 辅助工具 |
  | `plugin-sdk/config-runtime` | 已弃用的配置兼容 shim | 优先使用 `config-contracts`、`plugin-config-runtime`、`runtime-config-snapshot` 和 `config-mutation` |
  | `plugin-sdk/telegram-command-config` | Telegram 命令辅助工具 | 当捆绑的 Telegram contract surface 不可用时，使用回退稳定的 Telegram 命令校验辅助工具 |
  | `plugin-sdk/approval-runtime` | 审批提示辅助工具 | exec/plugin 审批负载、审批能力/profile 辅助工具、原生审批路由/runtime 辅助工具，以及结构化审批展示路径格式化 |
  | `plugin-sdk/approval-auth-runtime` | 审批认证辅助工具 | 审批人解析、same-chat action auth |
  | `plugin-sdk/approval-client-runtime` | 审批客户端辅助工具 | 原生 exec 审批 profile/filter 辅助工具 |
  | `plugin-sdk/approval-delivery-runtime` | 审批投递辅助工具 | 原生审批能力/投递适配器 |
  | `plugin-sdk/approval-gateway-runtime` | 审批 gateway 辅助工具 | 共享审批 gateway-resolution 辅助工具 |
  | `plugin-sdk/approval-handler-adapter-runtime` | 审批适配器辅助工具 | 热通道入口的轻量原生审批适配器加载辅助工具 |
  | `plugin-sdk/approval-handler-runtime` | 审批处理器辅助工具 | 更广泛的审批处理器运行时辅助工具；当更窄的 adapter/gateway 接缝足够时优先使用它们 |
  | `plugin-sdk/approval-native-runtime` | 审批目标辅助工具 | 原生审批目标/账户绑定辅助工具 |
  | `plugin-sdk/approval-reply-runtime` | 审批回复辅助工具 | exec/plugin 审批回复负载辅助工具 |
  | `plugin-sdk/channel-runtime-context` | 通道 runtime 上下文辅助工具 | 通用通道 runtime 上下文 register/get/watch 辅助工具 |
  | `plugin-sdk/security-runtime` | 安全辅助工具 | 共享 trust、DM gating、root-bounded 文件/路径辅助工具、外部内容和 secret-collection 辅助工具 |
  | `plugin-sdk/ssrf-policy` | SSRF 策略辅助工具 | host allowlist 和私有网络策略辅助工具 |
  | `plugin-sdk/ssrf-runtime` | SSRF 运行时辅助工具 | pinned-dispatcher、guarded fetch、SSRF 策略辅助工具 |
  | `plugin-sdk/system-event-runtime` | 系统事件辅助工具 | `enqueueSystemEvent`, `peekSystemEventEntries` |
  | `plugin-sdk/heartbeat-runtime` | 心跳辅助工具 | 心跳唤醒、事件和可见性辅助工具 |
  | `plugin-sdk/delivery-queue-runtime` | 投递队列辅助工具 | `drainPendingDeliveries` |
  | `plugin-sdk/channel-activity-runtime` | 通道活动辅助工具 | `recordChannelActivity` |
  | `plugin-sdk/dedupe-runtime` | 去重辅助工具 | 内存去重缓存 |
  | `plugin-sdk/file-access-runtime` | 文件访问辅助工具 | 安全的本地文件/媒体路径辅助工具 |
  | `plugin-sdk/transport-ready-runtime` | 传输就绪辅助工具 | `waitForTransportReady` |
  | `plugin-sdk/collection-runtime` | 有界缓存辅助工具 | `pruneMapToMaxSize` |
  | `plugin-sdk/diagnostic-runtime` | 诊断门控辅助工具 | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` |
  | `plugin-sdk/error-runtime` | 错误格式化辅助工具 | `formatUncaughtError`, `isApprovalNotFoundError`, 错误图辅助工具 |
  | `plugin-sdk/fetch-runtime` | 包装的 fetch/proxy 辅助工具 | `resolveFetch`, proxy 辅助工具, EnvHttpProxyAgent 选项辅助工具 |
  | `plugin-sdk/host-runtime` | host 规范化辅助工具 | `normalizeHostname`, `normalizeScpRemoteHost` |
  | `plugin-sdk/retry-runtime` | 重试辅助工具 | `RetryConfig`, `retryAsync`, policy runners |
  | `plugin-sdk/allow-from` | allowlist 格式化 | `formatAllowFromLowercase` |
  | `plugin-sdk/allowlist-resolution` | allowlist 输入映射 | `mapAllowlistResolutionInputs` |
  | `plugin-sdk/command-auth` | 命令门控和命令表面辅助工具 | `resolveControlCommandGate`, sender-authorization 辅助工具, 包括动态参数菜单格式化的命令注册表辅助工具 |
  | `plugin-sdk/command-status` | 命令状态/help 渲染器 | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` |
  | `plugin-sdk/secret-input` | 密钥输入解析 | 密钥输入辅助工具 |
  | `plugin-sdk/webhook-ingress` | webhook 请求辅助工具 | webhook target 实用工具 |
  | `plugin-sdk/webhook-request-guards` | webhook 请求体守卫辅助工具 | 请求体读取/限制辅助工具 |
  | `plugin-sdk/reply-runtime` | 共享回复运行时 | 入站分发、heartbeat、reply planner、chunking |
  | `plugin-sdk/reply-dispatch-runtime` | 窄范围回复分发辅助工具 | finalize、provider dispatch 和 conversation-label 辅助工具 |
  | `plugin-sdk/reply-history` | 回复历史辅助工具 | `createChannelHistoryWindow`; 已弃用的 map-helper 兼容导出，如 `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, 和 `clearHistoryEntriesIfEnabled` |
  | `plugin-sdk/reply-reference` | 回复引用规划 | `createReplyReferencePlanner` |
  | `plugin-sdk/reply-chunking` | 回复分块辅助工具 | 文本/markdown 分块辅助工具 |
  | `plugin-sdk/session-store-runtime` | 会话存储辅助工具 | 存储路径 + updated-at 辅助工具 |
  | `plugin-sdk/state-paths` | 状态路径辅助工具 | state 和 OAuth dir 辅助工具 |
  | `plugin-sdk/routing` | 路由/session-key 辅助工具 | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, session-key 规范化辅助工具 |
  | `plugin-sdk/status-helpers` | 通道状态辅助工具 | 通道/账户状态摘要构建器、runtime-state 默认值、问题元数据辅助工具 |
  | `plugin-sdk/target-resolver-runtime` | 目标解析器辅助工具 | 共享目标解析器辅助工具 |
  | `plugin-sdk/string-normalization-runtime` | 字符串规范化辅助工具 | slug/string 规范化辅助工具 |
  | `plugin-sdk/request-url` | 请求 URL 辅助工具 | 从类似请求的输入中提取字符串 URL |
  | `plugin-sdk/run-command` | 定时命令辅助工具 | 带规范化 stdout/stderr 的定时命令运行器 |
  | `plugin-sdk/param-readers` | 参数读取器 | 常见工具/CLI 参数读取器 |
  | `plugin-sdk/tool-payload` | 工具负载提取 | 从 tool result 对象中提取规范化负载 |
  | `plugin-sdk/tool-send` | 工具发送提取 | 从 tool args 中提取规范化发送目标字段 |
  | `plugin-sdk/temp-path` | 临时路径辅助工具 | 共享临时下载路径辅助工具 |
  | `plugin-sdk/logging-core` | 日志辅助工具 | 子系统 logger 和脱敏辅助工具 |
  | `plugin-sdk/markdown-table-runtime` | Markdown 表格辅助工具 | Markdown 表格模式辅助工具 |
  | `plugin-sdk/reply-payload` | 消息回复类型 | 回复负载类型 |
  | `plugin-sdk/provider-setup` | 经过筛选的本地/自托管 provider 设置辅助工具 | 自托管 provider 发现/配置辅助工具 |
  | `plugin-sdk/self-hosted-provider-setup` | 聚焦的 OpenAI-compatible 自托管 provider 设置辅助工具 | 相同的自托管 provider 发现/配置辅助工具 |
  | `plugin-sdk/provider-auth-runtime` | provider 运行时认证辅助工具 | 运行时 API key 解析辅助工具 |
  | `plugin-sdk/provider-auth-api-key` | provider API key 设置辅助工具 | API key onboarding/profile-write 辅助工具 |
  | `plugin-sdk/provider-auth-result` | provider 认证结果辅助工具 | 标准 OAuth auth-result 构建器 |
  | `plugin-sdk/provider-selection-runtime` | provider 选择辅助工具 | 已配置或自动 provider 选择和原始 provider 配置合并 |
  | `plugin-sdk/provider-env-vars` | provider 环境变量辅助工具 | provider 认证环境变量查找辅助工具 |
  | `plugin-sdk/provider-model-shared` | 共享 provider model/replay 辅助工具 | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, 共享 replay-policy 构建器、provider-endpoint 辅助工具和 model-id 规范化辅助工具 |
  | `plugin-sdk/provider-catalog-shared` | 共享 provider catalog 辅助工具 | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` |
  | `plugin-sdk/provider-onboard` | provider onboarding 补丁 | onboarding 配置辅助工具 |
  | `plugin-sdk/provider-http` | provider HTTP 辅助工具 | 通用 provider HTTP/endpoint 能力辅助工具，包括音频转写 multipart form 辅助工具 |
  | `plugin-sdk/provider-web-fetch` | provider web-fetch 辅助工具 | web-fetch provider 注册/cache 辅助工具 |
  | `plugin-sdk/provider-web-search-config-contract` | provider web-search 配置辅助工具 | 不需要插件启用 wiring 的 provider 的窄范围 web-search 配置/凭据辅助工具 |
  | `plugin-sdk/provider-web-search-contract` | provider web-search 契约辅助工具 | 窄范围 web-search 配置/凭据契约辅助工具，如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, 以及作用域凭据 setter/getter |
  | `plugin-sdk/provider-web-search` | provider web-search 辅助工具 | web-search provider 注册/cache/runtime 辅助工具 |
  | `plugin-sdk/provider-tools` | provider 工具/schema 兼容辅助工具 | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, 以及 Gemini schema 清理 + 诊断 |
  | `plugin-sdk/provider-usage` | provider 使用情况辅助工具 | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, 以及其他 provider 使用情况辅助工具 |
  | `plugin-sdk/provider-stream` | provider 流包装辅助工具 | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, stream wrapper 类型，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper 辅助工具 |
  | `plugin-sdk/provider-transport-runtime` | provider 传输辅助工具 | 原生 provider 传输辅助工具，如 guarded fetch、transport message transforms 和 writable transport event streams |
  | `plugin-sdk/keyed-async-queue` | 有序异步队列 | `KeyedAsyncQueue` |
  | `plugin-sdk/media-runtime` | 共享媒体辅助工具 | 媒体 fetch/transform/store 辅助工具、基于 ffprobe 的视频尺寸探测，以及媒体负载构建器 |
  | `plugin-sdk/media-generation-runtime` | 共享媒体生成辅助工具 | 共享 failover 辅助工具、候选选择，以及图像/视频/音乐生成的缺失模型消息 |
  | `plugin-sdk/media-understanding` | 媒体理解辅助工具 | 媒体理解 provider 类型以及面向 provider 的图像/音频辅助工具导出 |
  | `plugin-sdk/text-runtime` | 已弃用的宽泛文本兼容导出 | 使用 `string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core` |
  | `plugin-sdk/text-chunking` | 文本分块辅助工具 | 出站文本分块辅助工具 |
  | `plugin-sdk/speech` | 语音辅助工具 | 语音 provider 类型以及面向 provider 的指令、注册表、校验辅助工具和 OpenAI-compatible TTS 构建器 |
  | `plugin-sdk/speech-core` | 共享语音 core | 语音 provider 类型、注册表、指令、规范化 |
  | `plugin-sdk/realtime-transcription` | 实时转写辅助工具 | provider 类型、注册表辅助工具，以及共享 WebSocket 会话辅助工具 |
  | `plugin-sdk/realtime-voice` | 实时语音辅助工具 | provider 类型、注册/解析辅助工具、桥接会话辅助工具、共享 agent talk-back 队列、转写/事件健康、回声抑制，以及 fast context consult 辅助工具 |
  | `plugin-sdk/image-generation` | 图像生成辅助工具 | 图像生成 provider 类型以及 image asset/data URL 辅助工具和 OpenAI-compatible image provider 构建器 |
  | `plugin-sdk/image-generation-core` | 共享图像生成 core | 图像生成类型、failover、认证和注册表辅助工具 |
  | `plugin-sdk/music-generation` | 音乐生成辅助工具 | 音乐生成 provider/request/result 类型 |
  | `plugin-sdk/music-generation-core` | 共享音乐生成 core | 音乐生成类型、failover 辅助工具、provider 查找和 model-ref 解析 |
  | `plugin-sdk/video-generation` | 视频生成辅助工具 | 视频生成 provider/request/result 类型 |
  | `plugin-sdk/video-generation-core` | 共享视频生成 core | 视频生成类型、failover 辅助工具、provider 查找和 model-ref 解析 |
  | `plugin-sdk/interactive-runtime` | 交互式回复辅助工具 | 交互式回复负载规范化/归约 |
  | `plugin-sdk/channel-config-primitives` | 通道配置原语 | 窄范围通道 config-schema 原语 |
  | `plugin-sdk/channel-config-writes` | 通道配置写入辅助工具 | 通道配置写入授权辅助工具 |
  | `plugin-sdk/channel-plugin-common` | 共享通道前导 | 共享通道插件前导导出 |
  | `plugin-sdk/channel-status` | 通道状态辅助工具 | 共享通道状态快照/摘要辅助工具 |
  | `plugin-sdk/allowlist-config-edit` | allowlist 配置辅助工具 | allowlist 配置编辑/读取辅助工具 |
  | `plugin-sdk/group-access` | 组访问辅助工具 | 共享组访问决策辅助工具 |
  | `plugin-sdk/direct-dm` | 直接 DM 辅助工具 | 共享 direct-DM 认证/守卫辅助工具 |
  | `plugin-sdk/extension-shared` | 共享扩展辅助工具 | 被动通道/状态和 ambient proxy 辅助工具原语 |
  | `plugin-sdk/webhook-targets` | webhook target 辅助工具 | webhook target 注册表和 route-install 辅助工具 |
  | `plugin-sdk/webhook-path` | 已弃用的 webhook path 别名 | 使用 `plugin-sdk/webhook-ingress` |
  | `plugin-sdk/web-media` | 共享 web media 辅助工具 | 远程/本地媒体加载辅助工具 |
  | `plugin-sdk/zod` | 已弃用的 Zod 兼容重导出 | 直接从 `zod` 导入 `zod` |
  | `plugin-sdk/memory-core` | 捆绑 memory-core 辅助工具 | Memory manager/config/file/CLI 辅助工具表面 |
  | `plugin-sdk/memory-core-engine-runtime` | Memory engine runtime facade | Memory index/search runtime facade |
  | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine | Memory host foundation engine 导出 |
  | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding engine | Memory embedding contracts、registry access、local provider，以及通用 batch/remote 辅助工具；具体 remote provider 位于其所属插件中 |
  | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD engine | Memory host QMD engine 导出 |
  | `plugin-sdk/memory-core-host-engine-storage` | Memory host storage engine | Memory host storage engine 导出 |
  | `plugin-sdk/memory-core-host-multimodal` | Memory host multimodal 辅助工具 | Memory host multimodal 辅助工具 |
  | `plugin-sdk/memory-core-host-query` | Memory host query 辅助工具 | Memory host query 辅助工具 |
  | `plugin-sdk/memory-core-host-secret` | Memory host secret 辅助工具 | Memory host secret 辅助工具 |
  | `plugin-sdk/memory-core-host-events` | 已弃用的 memory event 别名 | 使用 `plugin-sdk/memory-host-events` |
  | `plugin-sdk/memory-core-host-status` | Memory host status 辅助工具 | Memory host status 辅助工具 |
  | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI runtime | Memory host CLI runtime 辅助工具 |
  | `plugin-sdk/memory-core-host-runtime-core` | Memory host core runtime | Memory host core runtime 辅助工具 |
  | `plugin-sdk/memory-core-host-runtime-files` | Memory host file/runtime 辅助工具 | Memory host file/runtime 辅助工具 |
  | `plugin-sdk/memory-host-core` | Memory host core runtime 别名 | 内存主机 core runtime 辅助工具的厂商中立别名 |
  | `plugin-sdk/memory-host-events` | Memory host event journal 别名 | 内存主机 event journal 辅助工具的厂商中立别名 |
  | `plugin-sdk/memory-host-files` | 已弃用的 memory file/runtime 别名 | 使用 `plugin-sdk/memory-core-host-runtime-files` |
  | `plugin-sdk/memory-host-markdown` | 托管 markdown 辅助工具 | 面向 memory-adjacent 插件的共享 managed-markdown 辅助工具 |
  | `plugin-sdk/memory-host-search` | 活跃 memory search facade | 懒加载 active-memory search-manager runtime facade |
  | `plugin-sdk/memory-host-status` | 已弃用的 memory host status 别名 | 使用 `plugin-sdk/memory-core-host-status` |
  | `plugin-sdk/testing` | 测试实用工具 | 仓库本地的已弃用兼容总入口；请使用聚焦的仓库本地测试子路径，例如 `plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/channel-target-testing`、`plugin-sdk/test-env` 和 `plugin-sdk/test-fixtures` |
</Accordion>

这个表格有意只包含常见迁移子集，而不是完整 SDK
表面。编译器入口清单位于
`scripts/lib/plugin-sdk-entrypoints.json`；包导出由
公共子集生成。

已保留的捆绑插件辅助接缝已从公共 SDK 导出映射中移除，除了明确文档化的兼容外观，例如为已发布的 `@openclaw/discord@2026.3.13` 包保留的已弃用 `plugin-sdk/discord` shim。特定 owner 的辅助工具保留在所属插件包内部；共享宿主行为应通过通用 SDK 契约迁移，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

请使用最符合任务的最窄导入。如果找不到某个导出，请检查 `src/plugin-sdk/` 下的源代码，或者询问维护者它应该归属哪个通用契约。

## 当前弃用项

下面这些更窄的弃用项适用于整个 plugin SDK、provider 契约、运行时面和清单。它们现在仍然可用，但会在未来的大版本中移除。每一项下面的条目都会把旧 API 映射到其标准替代项。

<AccordionGroup>
  <Accordion title="command-auth 帮助构建器 → command-status">
    **旧（`openclaw/plugin-sdk/command-auth`）**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新（`openclaw/plugin-sdk/command-status`）**：相同签名、相同导出——只是从更窄的子路径导入。`command-auth`
    仍以兼容 stub 的形式重新导出它们。

    ```typescript
    // 之前
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // 之后
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="提及门控辅助工具 → resolveInboundMentionDecision">
    **旧**：来自 `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating` 的
    `resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)`。

    **新**：`resolveInboundMentionDecision({ facts, policy })` - 返回一个
    单一决策对象，而不是两个拆分调用。

    下游通道插件（Slack、Discord、Matrix、MS Teams）已经切换完成。

  </Accordion>

  <Accordion title="Channel runtime shim 和 channel actions 辅助工具">
    `openclaw/plugin-sdk/channel-runtime` 是为旧通道插件提供的兼容 shim。不要在新代码中导入它；请使用
    `openclaw/plugin-sdk/channel-runtime-context` 来注册运行时对象。

    `openclaw/plugin-sdk/channel-actions` 中的 `channelActions*` 辅助工具
    已与原始 “actions” 通道导出一并弃用。请通过语义化的 `presentation`
    面暴露能力——通道插件声明它们渲染什么（卡片、按钮、下拉选择），而不是它们接受哪些原始动作名称。

  </Accordion>

  <Accordion title="Web search provider tool() 辅助工具 → 插件上的 createTool()">
    **旧**：来自 `openclaw/plugin-sdk/provider-web-search` 的 `tool()` 工厂。

    **新**：直接在 provider 插件上实现 `createTool(...)`。
    OpenClaw 不再需要 SDK 辅助工具来注册工具包装器。

  </Accordion>

  <Accordion title="纯文本通道信封 → BodyForAgent">
    **旧**：`formatInboundEnvelope(...)`（以及
    `ChannelMessageForAgent.channelEnvelope`），用于从入站通道消息构建扁平的纯文本 prompt 信封。

    **新**：`BodyForAgent` 加上结构化的用户上下文块。通道插件将路由元数据（线程、主题、回复对象、反应）作为带类型的字段附加，而不是把它们拼接进 prompt 字符串。`formatAgentEnvelope(...)` 辅助工具仍支持为生成的面向 assistant 的信封使用，但入站纯文本信封正在退出。

    受影响的区域：`inbound_claim`、`message_received`，以及任何对 `channelEnvelope` 文本进行后处理的自定义通道插件。

  </Accordion>

  <Accordion title="deactivate hook → gateway_stop">
    **Old**: `api.on("deactivate", handler)`.

    **New**: `api.on("gateway_stop", handler)`. The event and context are the
    same shutdown cleanup contract; only the hook name changes.

    ```typescript
    // Before
    api.on("deactivate", async (event, ctx) => {
      await stopPluginService(ctx);
    });

    // After
    api.on("gateway_stop", async (event, ctx) => {
      await stopPluginService(ctx);
    });
    ```

    `deactivate` remains wired as a deprecated compatibility alias until after
    2026-08-16.

  </Accordion>

  <Accordion title="Provider discovery types → provider catalog types">
    Four discovery type aliases are now thin wrappers over the
    catalog-era types:

    | 旧别名                 | 新类型                  |
    | ---------------------- | ----------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    以及旧的 `ProviderCapabilities` 静态集合——provider 插件应使用显式的 provider hook，例如 `buildReplayPolicy`、
    `normalizeToolSchemas` 和 `wrapStreamFn`，而不是静态对象。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **旧**（`ProviderThinkingPolicy` 上的三个独立 hook）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新**：单个 `resolveThinkingProfile(ctx)`，返回一个带有标准 `id`、可选 `label` 和分级 level 列表的 `ProviderThinkingProfile`。OpenClaw 会根据 profile 等级自动降级陈旧的存储值。

    请实现一个 hook，而不是三个。旧 hook 在弃用窗口期间仍可工作，但不会与 profile 结果组合。

  </Accordion>

  <Accordion title="外部 OAuth provider 回退 → contracts.externalAuthProviders">
    **旧**：在没有在插件清单中声明该 provider 的情况下实现 `resolveExternalOAuthProfiles(...)`。

    **新**：在插件清单中声明 `contracts.externalAuthProviders`
    **并且**实现 `resolveExternalAuthProfiles(...)`。旧的“auth 回退”路径会在运行时发出警告，并将在以后移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider 环境变量查找 → setup.providers[].envVars">
    **旧** 清单字段：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新**：将同样的环境变量查找映射到清单中的 `setup.providers[].envVars`。
    这样可以将 setup/status 的环境元数据集中在一个地方，并避免仅为回答环境变量查找而启动插件运行时。

    在弃用窗口结束之前，`providerAuthEnvVars` 仍通过兼容适配器受支持。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **旧**：三次独立调用：
    `api.registerMemoryPromptSection(...)`、
    `api.registerMemoryFlushPlan(...)`、
    `api.registerMemoryRuntime(...)`。

    **新**：在 memory-state API 上一次调用：
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    位置相同，注册调用变为单次。增量 memory 辅助工具
    (`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`、
    `registerMemoryEmbeddingProvider`) 不受影响。

  </Accordion>

  <Accordion title="子 agent 会话消息类型重命名">
    `src/plugins/runtime/types.ts` 仍导出两个旧类型别名：

    | 旧                           | 新                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    运行时方法 `readSession` 已弃用，建议改用 `getSessionMessages`。签名相同；旧方法会转调新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.managedFlows">
    **旧**：`runtime.tasks.flow`（单数）返回一个活动 task-flow 访问器。

    **新**：`runtime.tasks.managedFlows` 为创建、更新、取消或运行子任务的插件保留受管理的 TaskFlow 变更运行时。仅当插件只需要基于 DTO 的读取时，请使用 `runtime.tasks.flows`。

    ```typescript
    // 之前
    const flow = api.runtime.tasks.flow.fromToolContext(ctx);
    // 之后
    const flow = api.runtime.tasks.managedFlows.fromToolContext(ctx);
    ```

  </Accordion>

  <Accordion title="嵌入式扩展工厂 → agent tool-result 中间件">
    见上文“如何迁移 → 将 Pi 的 tool-result 扩展迁移到中间件”。此处仅为完整性重复说明：
    已移除的仅 Pi 可用的 `api.registerEmbeddedExtensionFactory(...)` 路径，已由
    `api.registerAgentToolResultMiddleware(...)` 替代，并在 `contracts.agentToolResultMiddleware`
    中显式列出 runtime。

  </Accordion>

  <Accordion title="OpenClawSchemaType 别名 → OpenClawConfig">
    从 `openclaw/plugin-sdk` 重导出的 `OpenClawSchemaType` 现在只是 `OpenClawConfig` 的一行别名。请优先使用标准名称。

    ```typescript
    // 之前
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // 之后
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>
扩展级弃用项（位于 `extensions/` 下捆绑通道/provider 插件内部）会在它们自己的 `api.ts` 和 `runtime-api.ts`
总入口中跟踪。它们不影响第三方插件契约，也不会在这里列出。如果你直接消费某个捆绑插件的本地总入口，请先阅读该总入口中的弃用注释再升级。
</Note>

## 移除时间线

| 时间                   | 会发生什么                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| **现在**              | 已弃用的面会发出运行时警告                                               |
| **下一个大版本**      | 已弃用的面将被移除；仍在使用它们的插件会失败                             |

所有核心插件都已经迁移完成。外部插件应在下一个大版本之前完成迁移。

## 临时抑制警告

在迁移期间设置以下环境变量：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

这只是临时逃生通道，不是永久解决方案。

## 相关

- [入门指南](/plugins/building-plugins) - 构建你的第一个插件
- [SDK 概览](/plugins/sdk-overview) - 完整的子路径导入参考
- [频道插件](/plugins/sdk-channel-plugins) - 构建频道插件
- [提供商插件](/plugins/sdk-provider-plugins) - 构建提供商插件
- [插件内部机制](/plugins/architecture) - 架构深度解析
- [插件清单](/plugins/manifest) - 清单模式参考
