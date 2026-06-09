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

- **`openclaw/plugin-sdk/compat`** - 单个导入，重新导出数十个
  辅助工具。它的引入是为了在新插件架构构建期间让旧的基于 hook 的插件继续工作。
- **`openclaw/plugin-sdk/infra-runtime`** - 一个宽泛的运行时辅助工具桶，
  混合了系统事件、心跳状态、投递队列、fetch/proxy 辅助工具、
  文件辅助工具、审批类型以及不相关的实用工具。
- **`openclaw/plugin-sdk/config-runtime`** - 一个宽泛的配置兼容桶，
  在迁移窗口期间仍保留已弃用的直接加载/写入辅助工具。
- **`openclaw/extension-api`** - 一个桥接层，让插件可以直接访问
  主机侧辅助工具，例如嵌入式代理运行器。
- **`api.registerEmbeddedExtensionFactory(...)`** - 一个已移除的仅适用于 embedded-runner 的捆绑
  扩展 hook，可以观察诸如
  `tool_result` 之类的 embedded-runner 事件。

这些宽泛的导入面现在都已经**弃用**。它们在运行时仍然可用，
但新插件不得使用它们，现有插件也应在下一个大版本移除它们之前完成迁移。仅适用于 embedded-runner 的扩展工厂
注册 API 已被移除；请改用 tool-result 中间件。

OpenClaw 不会在引入替代方案的同一次变更中移除或重新解释已文档化的插件行为。任何破坏性契约变更都必须先经过兼容适配器、诊断、文档和弃用窗口。这适用于 SDK 导入、清单字段、设置 API、hook 以及运行时注册行为。

<Warning>
  向后兼容层将在未来的一个大版本中移除。
  仍然从这些表面导入的插件在那时会失效。
  旧的嵌入式扩展工厂注册已经不会再加载。
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
await gateway.request("talk.client.steer", { sessionKey, text, mode: "steer" });
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
| `talk.session.appendAudio`      | `realtime/gateway-relay`, `transcription/gateway-relay` | 向同一 Gateway 连接所拥有的 provider 会话追加一个 base64 PCM 音频块。                                                                                            |
| `talk.session.startTurn`        | `stt-tts/managed-room`                                  | 开始一个 managed-room 用户轮次。                                                                                                                                                          |
| `talk.session.endTurn`          | `stt-tts/managed-room`                                  | 在过期轮次验证之后结束当前活动轮次。                                                                                                                                         |
| `talk.session.cancelTurn`       | all Gateway-owned sessions                              | 取消某个轮次正在进行的捕获/provider/agent/TTS 工作。                                                                                                                                |
| `talk.session.cancelOutput`     | `realtime/gateway-relay`                                | 停止助手音频输出，不一定结束用户轮次。                                                                                                                    |
| `talk.session.submitToolResult` | `realtime/gateway-relay`                                | 完成由中继发出的 provider 工具调用；若要临时输出，请传入 `options.willContinue`，或传入 `options.suppressResponse` 以在不需要另一条助手回复的情况下满足该调用。 |
| `talk.session.steer`            | agent-backed Talk sessions                              | 向从 Talk 会话解析得到的当前嵌入式运行发送口头的 `status`、`steer`、`cancel` 或 `followup` 控制。                                                                |
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
    这样即使某个工具是在配置写入之前创建的，也仍然能够看到刷新后的运行时配置。

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

  <Step title="Migrate embedded tool-result extensions to middleware">
    Bundled plugins must replace embedded-runner-only
    `api.registerEmbeddedExtensionFactory(...)` tool-result handlers with
    runtime-neutral middleware.

    ```typescript
    // OpenClaw 和 Codex 运行时动态工具
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["openclaw", "codex"],
    });
    ```

    同时更新插件清单：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["openclaw", "codex"]
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
    // Before (deprecated extension-api bridge)
    import { runEmbeddedAgent } from "openclaw/extension-api";
    const result = await runEmbeddedAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedAgent({ sessionId, prompt });
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
    | `comparableChannelTargetsMatch(...)` | `channelRouteTargetsMatchExact(...)` |
    | `comparableChannelTargetsShareRoute(...)` | `channelRouteTargetsShareConversation(...)` |

    现代路由辅助工具会在原生审批、回复抑制、入站去重、
    cron 投递和会话路由中一致地规范化 `{ channel, to, accountId, threadId }`。

    不要新增对 `ChannelMessagingAdapter.parseExplicitTarget` 的使用，也不要新增对
    基于解析器的已加载路由辅助工具（`parseExplicitTargetForLoadedChannel`
    或 `resolveRouteTargetForLoadedChannel`）或
    `resolveChannelRouteTargetWithParser(...)`（来自 `plugin-sdk/channel-route`）的使用。
    这些 hook 已弃用，仅在迁移窗口期间为旧插件保留。新的通道插件应使用
    `messaging.targetResolver.resolveTarget(...)` 进行目标 ID 规范化
    和目录缺失回退，使用 `messaging.inferTargetChatType(...)` 来在核心
    需要尽早判断对端类型时使用，并使用 `messaging.resolveOutboundSessionRoute(...)`
    获取 provider 原生的会话和线程标识。

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
  | `plugin-sdk/plugin-entry` | Canonical plugin entry helper | `definePluginEntry` |
  | `plugin-sdk/core` | Legacy umbrella re-export for channel entry definitions/builders | `defineChannelPluginEntry`, `createChatChannelPlugin` |
  | `plugin-sdk/config-schema` | Root config schema export | `OpenClawSchema` |
  | `plugin-sdk/provider-entry` | Single-provider entry helper | `defineSingleProviderPluginEntry` |
  | `plugin-sdk/channel-core` | Focused channel entry definitions and builders | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
  | `plugin-sdk/setup` | Shared setup wizard helpers | Setup translator, allowlist prompts, setup status builders |
  | `plugin-sdk/setup-runtime` | Setup-time runtime helpers | `createSetupTranslator`, import-safe setup patch adapters, lookup-note helpers, `promptResolvedAllowFrom`, `splitSetupEntries`, delegated setup proxies |
  | `plugin-sdk/setup-adapter-runtime` | Deprecated setup adapter alias | Use `plugin-sdk/setup-runtime` |
  | `plugin-sdk/setup-tools` | Setup tooling helpers | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
  | `plugin-sdk/account-core` | Multi-account helpers | Account list/config/action-gate helpers |
  | `plugin-sdk/account-id` | Account-id helpers | `DEFAULT_ACCOUNT_ID`, account-id normalization |
  | `plugin-sdk/account-resolution` | Account lookup helpers | Account lookup + default-fallback helpers |
  | `plugin-sdk/account-helpers` | Narrow account helpers | Account list/account-action helpers |
  | `plugin-sdk/channel-setup` | Setup wizard adapters | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, plus `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
  | `plugin-sdk/channel-pairing` | DM pairing primitives | `createChannelPairingController` |
  | `plugin-sdk/channel-reply-pipeline` | Reply prefix, typing, and source-delivery wiring | `createChannelReplyPipeline`, `resolveChannelSourceReplyDeliveryMode` |
  | `plugin-sdk/channel-config-helpers` | Config adapter factories and DM access helpers | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
  | `plugin-sdk/channel-config-schema` | Config schema builders | Shared channel config schema primitives and the generic builder only |
  | `plugin-sdk/bundled-channel-config-schema` | Bundled config schemas | OpenClaw-maintained bundled plugins only; new plugins must define plugin-local schemas |
  | `plugin-sdk/channel-config-schema-legacy` | Deprecated bundled config schemas | Compatibility alias only; use `plugin-sdk/bundled-channel-config-schema` for maintained bundled plugins |
  | `plugin-sdk/telegram-command-config` | Telegram command config helpers | Command-name normalization, description trimming, duplicate/conflict validation |
  | `plugin-sdk/channel-policy` | Group/DM policy resolution | `resolveChannelGroupRequireMention` |
  | `plugin-sdk/channel-lifecycle` | Deprecated compatibility facade | Use `plugin-sdk/channel-outbound` |
  | `plugin-sdk/inbound-envelope` | Inbound envelope helpers | Shared route + envelope builder helpers |
  | `plugin-sdk/channel-inbound` | Inbound receive helpers | Context building, formatting, roots, runners, prepared reply dispatch, and dispatch predicates |
  | `plugin-sdk/messaging-targets` | Deprecated target parsing import path | Use `plugin-sdk/channel-targets` for generic target parsing helpers, `plugin-sdk/channel-route` for route comparison, and plugin-owned `messaging.targetResolver` / `messaging.resolveOutboundSessionRoute` for provider-specific target resolution |
  | `plugin-sdk/outbound-media` | Outbound media helpers | Shared outbound media loading |
  | `plugin-sdk/outbound-send-deps` | Deprecated compatibility facade | Use `plugin-sdk/channel-outbound` |
  | `plugin-sdk/channel-outbound` | Outbound message lifecycle helpers | Message adapters, receipts, durable send helpers, live preview/streaming helpers, reply options, lifecycle helpers, outbound identity, and payload planning |
  | `plugin-sdk/channel-streaming` | Deprecated compatibility facade | Use `plugin-sdk/channel-outbound` |
  | `plugin-sdk/outbound-runtime` | Deprecated compatibility facade | Use `plugin-sdk/channel-outbound` |
  | `plugin-sdk/thread-bindings-runtime` | Thread-binding helpers | Thread-binding lifecycle and adapter helpers |
  | `plugin-sdk/agent-media-payload` | Legacy media payload helpers | Agent media payload builder for legacy field layouts |
  | `plugin-sdk/channel-runtime` | Deprecated compatibility shim | Legacy channel runtime utilities only |
  | `plugin-sdk/channel-send-result` | Send result types | Reply result types |
  | `plugin-sdk/runtime-store` | Persistent plugin storage | `createPluginRuntimeStore` |
  | `plugin-sdk/runtime` | Broad runtime helpers | Runtime/logging/backup/plugin-install helpers |
  | `plugin-sdk/runtime-env` | Narrow runtime env helpers | Logger/runtime env, timeout, retry, and backoff helpers |
  | `plugin-sdk/plugin-runtime` | Shared plugin runtime helpers | Plugin commands/hooks/http/interactive helpers |
  | `plugin-sdk/hook-runtime` | Hook pipeline helpers | Shared webhook/internal hook pipeline helpers |
  | `plugin-sdk/lazy-runtime` | Lazy runtime helpers | `createLazyRuntimeModule`, `createLazyRuntimeMethod`, `createLazyRuntimeMethodBinder`, `createLazyRuntimeNamedExport`, `createLazyRuntimeSurface` |
  | `plugin-sdk/process-runtime` | Process helpers | Shared exec helpers |
  | `plugin-sdk/cli-runtime` | CLI runtime helpers | Command formatting, waits, version helpers |
  | `plugin-sdk/gateway-runtime` | Gateway helpers | Gateway client, event-loop-ready start helper, and channel-status patch helpers |
  | `plugin-sdk/config-runtime` | Deprecated config compatibility shim | Prefer `config-contracts`, `plugin-config-runtime`, `runtime-config-snapshot`, and `config-mutation` |
  | `plugin-sdk/telegram-command-config` | Telegram command helpers | Fallback-stable Telegram command validation helpers when the bundled Telegram contract surface is unavailable |
  | `plugin-sdk/approval-runtime` | Approval prompt helpers | Exec/plugin approval payload, approval capability/profile helpers, native approval routing/runtime helpers, and structured approval display path formatting |
  | `plugin-sdk/approval-auth-runtime` | Approval auth helpers | Approver resolution, same-chat action auth |
  | `plugin-sdk/approval-client-runtime` | Approval client helpers | Native exec approval profile/filter helpers |
  | `plugin-sdk/approval-delivery-runtime` | Approval delivery helpers | Native approval capability/delivery adapters |
  | `plugin-sdk/approval-gateway-runtime` | Approval gateway helpers | Shared approval gateway-resolution helper |
  | `plugin-sdk/approval-handler-adapter-runtime` | Approval adapter helpers | Lightweight native approval adapter loading helpers for hot channel entrypoints |
  | `plugin-sdk/approval-handler-runtime` | Approval handler helpers | Broader approval handler runtime helpers; prefer the narrower adapter/gateway seams when they are enough |
  | `plugin-sdk/approval-native-runtime` | Approval target helpers | Native approval target/account binding helpers |
  | `plugin-sdk/approval-reply-runtime` | Approval reply helpers | Exec/plugin approval reply payload helpers |
  | `plugin-sdk/channel-runtime-context` | Channel runtime-context helpers | Generic channel runtime-context register/get/watch helpers |
  | `plugin-sdk/security-runtime` | Security helpers | Shared trust, DM gating, root-bounded file/path helpers, external-content, and secret-collection helpers |
  | `plugin-sdk/ssrf-policy` | SSRF policy helpers | Host allowlist and private-network policy helpers |
  | `plugin-sdk/ssrf-runtime` | SSRF runtime helpers | Pinned-dispatcher, guarded fetch, SSRF policy helpers |
  | `plugin-sdk/system-event-runtime` | System event helpers | `enqueueSystemEvent`, `peekSystemEventEntries` |
  | `plugin-sdk/heartbeat-runtime` | Heartbeat helpers | Heartbeat wake, event, and visibility helpers |
  | `plugin-sdk/delivery-queue-runtime` | Delivery queue helpers | `drainPendingDeliveries` |
  | `plugin-sdk/channel-activity-runtime` | Channel activity helpers | `recordChannelActivity` |
  | `plugin-sdk/dedupe-runtime` | Dedupe helpers | In-memory dedupe caches |
  | `plugin-sdk/file-access-runtime` | File access helpers | Safe local-file/media path helpers |
  | `plugin-sdk/transport-ready-runtime` | Transport readiness helpers | `waitForTransportReady` |
  | `plugin-sdk/exec-approvals-runtime` | Exec approval policy helpers | `loadExecApprovals`, `resolveExecApprovalsFromFile`, `ExecApprovalsFile` |
  | `plugin-sdk/collection-runtime` | Bounded cache helpers | `pruneMapToMaxSize` |
  | `plugin-sdk/diagnostic-runtime` | Diagnostic gating helpers | `isDiagnosticFlagEnabled`, `isDiagnosticsEnabled` |
  | `plugin-sdk/error-runtime` | Error formatting helpers | `formatUncaughtError`, `isApprovalNotFoundError`, error graph helpers |
  | `plugin-sdk/fetch-runtime` | Wrapped fetch/proxy helpers | `resolveFetch`, proxy helpers, EnvHttpProxyAgent option helpers |
  | `plugin-sdk/host-runtime` | Host normalization helpers | `normalizeHostname`, `normalizeScpRemoteHost` |
  | `plugin-sdk/retry-runtime` | Retry helpers | `RetryConfig`, `retryAsync`, policy runners |
  | `plugin-sdk/allow-from` | Allowlist formatting and input mapping | `formatAllowFromLowercase`, `mapAllowlistResolutionInputs` |
  | `plugin-sdk/command-auth` | Command gating and command-surface helpers | `resolveControlCommandGate`, sender-authorization helpers, command registry helpers including dynamic argument menu formatting |
  | `plugin-sdk/command-status` | Command status/help renderers | `buildCommandsMessage`, `buildCommandsMessagePaginated`, `buildHelpMessage` |
  | `plugin-sdk/secret-input` | Secret input parsing | Secret input helpers |
  | `plugin-sdk/webhook-ingress` | Webhook request helpers | Webhook target utilities |
  | `plugin-sdk/webhook-request-guards` | Webhook body guard helpers | Request body read/limit helpers |
  | `plugin-sdk/reply-runtime` | Shared reply runtime | Inbound dispatch, heartbeat, reply planner, chunking |
  | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch helpers | Finalize, provider dispatch, and conversation-label helpers |
  | `plugin-sdk/reply-history` | Reply-history helpers | `createChannelHistoryWindow`; deprecated map-helper compatibility exports such as `buildPendingHistoryContextFromMap`, `recordPendingHistoryEntry`, and `clearHistoryEntriesIfEnabled` |
  | `plugin-sdk/reply-reference` | Reply reference planning | `createReplyReferencePlanner` |
  | `plugin-sdk/reply-chunking` | Reply chunk helpers | Text/markdown chunking helpers |
  | `plugin-sdk/session-store-runtime` | Session store helpers | Store path + updated-at helpers |
  | `plugin-sdk/state-paths` | State path helpers | State and OAuth dir helpers |
  | `plugin-sdk/routing` | Routing/session-key helpers | `resolveAgentRoute`, `buildAgentSessionKey`, `resolveDefaultAgentBoundAccountId`, session-key normalization helpers |
  | `plugin-sdk/status-helpers` | Channel status helpers | Channel/account status summary builders, runtime-state defaults, issue metadata helpers |
  | `plugin-sdk/target-resolver-runtime` | Target resolver helpers | Shared target resolver helpers |
  | `plugin-sdk/string-normalization-runtime` | String normalization helpers | Slug/string normalization helpers |
  | `plugin-sdk/request-url` | Request URL helpers | Extract string URLs from request-like inputs |
  | `plugin-sdk/run-command` | Timed command helpers | Timed command runner with normalized stdout/stderr |
  | `plugin-sdk/param-readers` | Param readers | Common tool/CLI param readers |
  | `plugin-sdk/tool-payload` | Tool payload extraction | Extract normalized payloads from tool result objects |
  | `plugin-sdk/tool-send` | Tool send extraction | Extract canonical send target fields from tool args |
  | `plugin-sdk/temp-path` | Temp path helpers | Shared temp-download path helpers |
  | `plugin-sdk/logging-core` | Logging helpers | Subsystem logger and redaction helpers |
  | `plugin-sdk/markdown-table-runtime` | Markdown-table helpers | Markdown table mode helpers |
  | `plugin-sdk/reply-payload` | Message reply types | Reply payload types |
  | `plugin-sdk/provider-setup` | Curated local/self-hosted provider setup helpers | Self-hosted provider discovery/config helpers |
  | `plugin-sdk/self-hosted-provider-setup` | Focused OpenAI-compatible self-hosted provider setup helpers | Same self-hosted provider discovery/config helpers |
  | `plugin-sdk/provider-auth-runtime` | Provider runtime auth helpers | Runtime API-key resolution helpers |
  | `plugin-sdk/provider-auth-api-key` | Provider API-key setup helpers | API-key onboarding/profile-write helpers |
  | `plugin-sdk/provider-auth-result` | Provider auth-result helpers | Standard OAuth auth-result builder |
  | `plugin-sdk/provider-selection-runtime` | Provider selection helpers | Configured-or-auto provider selection and raw provider config merging |
  | `plugin-sdk/provider-env-vars` | Provider env-var helpers | Provider auth env-var lookup helpers |
  | `plugin-sdk/provider-model-shared` | Shared provider model/replay helpers | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, shared replay-policy builders, provider-endpoint helpers, and model-id normalization helpers |
  | `plugin-sdk/provider-catalog-shared` | Shared provider catalog helpers | `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `buildManifestModelProviderConfig`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` |
  | `plugin-sdk/provider-onboard` | Provider onboarding patches | Onboarding config helpers |
  | `plugin-sdk/provider-http` | Provider HTTP helpers | Generic provider HTTP/endpoint capability helpers, including audio transcription multipart form helpers |
  | `plugin-sdk/provider-web-fetch` | Provider web-fetch helpers | Web-fetch provider registration/cache helpers |
  | `plugin-sdk/provider-web-search-config-contract` | Provider web-search config helpers | Narrow web-search config/credential helpers for providers that do not need plugin-enable wiring |
  | `plugin-sdk/provider-web-search-contract` | Provider web-search contract helpers | Narrow web-search config/credential contract helpers such as `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, and scoped credential setters/getters |
  | `plugin-sdk/provider-web-search` | Provider web-search helpers | Web-search provider registration/cache/runtime helpers |
  | `plugin-sdk/provider-tools` | Provider tool/schema compat helpers | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, and DeepSeek/Gemini/OpenAI schema cleanup + diagnostics |
  | `plugin-sdk/provider-usage` | Provider usage helpers | `fetchClaudeUsage`, `fetchGeminiUsage`, `fetchGithubCopilotUsage`, and other provider usage helpers |
  | `plugin-sdk/provider-stream` | Provider stream wrapper helpers | `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, stream wrapper types, and shared Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper helpers |
  | `plugin-sdk/provider-transport-runtime` | Provider transport helpers | Native provider transport helpers such as guarded fetch, transport message transforms, and writable transport event streams |
  | `plugin-sdk/keyed-async-queue` | Ordered async queue | `KeyedAsyncQueue` |
  | `plugin-sdk/media-runtime` | Shared media helpers | Media fetch/transform/store helpers, ffprobe-backed video dimension probing, and media payload builders |
  | `plugin-sdk/media-generation-runtime` | Shared media-generation helpers | Shared failover helpers, candidate selection, and missing-model messaging for image/video/music generation |
  | `plugin-sdk/media-understanding` | Media-understanding helpers | Media understanding provider types plus provider-facing image/audio helper exports |
  | `plugin-sdk/text-runtime` | Deprecated broad text compatibility export | Use `string-coerce-runtime`, `text-chunking`, `text-utility-runtime`, and `logging-core` |
  | `plugin-sdk/text-chunking` | Text chunking helpers | Outbound text chunking helper |
  | `plugin-sdk/speech` | Speech helpers | Speech provider types plus provider-facing directive, registry, validation helpers, and OpenAI-compatible TTS builder |
  | `plugin-sdk/speech-core` | Shared speech core | Speech provider types, registry, directives, normalization |
  | `plugin-sdk/realtime-transcription` | Realtime transcription helpers | Provider types, registry helpers, and shared WebSocket session helper |
  | `plugin-sdk/realtime-voice` | Realtime voice helpers | Provider types, registry/resolution helpers, bridge session helpers, shared agent talk-back queues, active-run voice control, transcript/event health, echo suppression, consult question matching, forced-consult coordination, turn-context tracking, output activity tracking, and fast context consult helpers |
  | `plugin-sdk/image-generation` | Image-generation helpers | Image generation provider types plus image asset/data URL helpers and the OpenAI-compatible image provider builder |
  | `plugin-sdk/image-generation-core` | Shared image-generation core | Image-generation types, failover, auth, and registry helpers |
  | `plugin-sdk/music-generation` | Music-generation helpers | Music-generation provider/request/result types |
  | `plugin-sdk/music-generation-core` | Shared music-generation core | Music-generation types, failover helpers, provider lookup, and model-ref parsing |
  | `plugin-sdk/video-generation` | Video-generation helpers | Video-generation provider/request/result types |
  | `plugin-sdk/video-generation-core` | Shared video-generation core | Video-generation types, failover helpers, provider lookup, and model-ref parsing |
  | `plugin-sdk/interactive-runtime` | Interactive reply helpers | Interactive reply payload normalization/reduction |
  | `plugin-sdk/channel-config-primitives` | Channel config primitives | Narrow channel config-schema primitives |
  | `plugin-sdk/channel-config-writes` | Channel config-write helpers | Channel config-write authorization helpers |
  | `plugin-sdk/channel-plugin-common` | Shared channel prelude | Shared channel plugin prelude exports |
  | `plugin-sdk/channel-status` | Channel status helpers | Shared channel status snapshot/summary helpers |
  | `plugin-sdk/allowlist-config-edit` | Allowlist config helpers | Allowlist config edit/read helpers |
  | `plugin-sdk/group-access` | Group access helpers | Shared group-access decision helpers |
  | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | Deprecated compatibility facades | Use `plugin-sdk/channel-inbound` |
  | `plugin-sdk/direct-dm-guard-policy` | Direct-DM guard helpers | Narrow pre-crypto guard policy helpers |
  | `plugin-sdk/extension-shared` | Shared extension helpers | Passive-channel/status and ambient proxy helper primitives |
  | `plugin-sdk/webhook-targets` | Webhook target helpers | Webhook target registry and route-install helpers |
  | `plugin-sdk/webhook-path` | Deprecated webhook path alias | Use `plugin-sdk/webhook-ingress` |
  | `plugin-sdk/web-media` | Shared web media helpers | Remote/local media loading helpers |
  | `plugin-sdk/zod` | Deprecated Zod compatibility re-export | Import `zod` from `zod` directly |
  | `plugin-sdk/memory-core` | Bundled memory-core helpers | Memory manager/config/file/CLI helper surface |
  | `plugin-sdk/memory-core-engine-runtime` | Memory engine runtime facade | Memory index/search runtime facade |
  | `plugin-sdk/memory-core-host-embedding-registry` | Memory embedding registry | Lightweight memory embedding provider registry helpers |
  | `plugin-sdk/memory-core-host-engine-foundation` | Memory host foundation engine | Memory host foundation engine exports |
  | `plugin-sdk/memory-core-host-engine-embeddings` | Memory host embedding engine | Memory embedding contracts, registry access, local provider, and generic batch/remote helpers; concrete remote providers live in their owning plugins |
  | `plugin-sdk/memory-core-host-engine-qmd` | Memory host QMD engine | Memory host QMD engine exports |
  | `plugin-sdk/memory-core-host-engine-storage` | Memory host storage engine | Memory host storage engine exports |
  | `plugin-sdk/memory-core-host-multimodal` | Memory host multimodal helpers | Memory host multimodal helpers |
  | `plugin-sdk/memory-core-host-query` | Memory host query helpers | Memory host query helpers |
  | `plugin-sdk/memory-core-host-secret` | Memory host secret helpers | Memory host secret helpers |
  | `plugin-sdk/memory-core-host-events` | Deprecated memory event alias | Use `plugin-sdk/memory-host-events` |
  | `plugin-sdk/memory-core-host-status` | Memory host status helpers | Memory host status helpers |
  | `plugin-sdk/memory-core-host-runtime-cli` | Memory host CLI runtime | Memory host CLI runtime helpers |
  | `plugin-sdk/memory-core-host-runtime-core` | Memory host core runtime | Memory host core runtime helpers |
  | `plugin-sdk/memory-core-host-runtime-files` | Memory host file/runtime helpers | Memory host file/runtime helpers |
  | `plugin-sdk/memory-host-core` | Memory host core runtime alias | Vendor-neutral alias for memory host core runtime helpers |
  | `plugin-sdk/memory-host-events` | Memory host event journal alias | Vendor-neutral alias for memory host event journal helpers |
  | `plugin-sdk/memory-host-files` | Deprecated memory file/runtime alias | Use `plugin-sdk/memory-core-host-runtime-files` |
  | `plugin-sdk/memory-host-markdown` | Managed markdown helpers | Shared managed-markdown helpers for memory-adjacent plugins |
  | `plugin-sdk/memory-host-search` | Active memory search facade | Lazy active-memory search-manager runtime facade |
  | `plugin-sdk/memory-host-status` | Deprecated memory host status alias | Use `plugin-sdk/memory-core-host-status` |
  | `plugin-sdk/testing` | Test utilities | Repo-local deprecated compatibility barrel; use focused repo-local test subpaths such as `plugin-sdk/plugin-test-runtime`, `plugin-sdk/channel-test-helpers`, `plugin-sdk/channel-target-testing`, `plugin-sdk/test-env`, and `plugin-sdk/test-fixtures` |
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
    **旧**：`api.on("deactivate", handler)`。

    **新**：`api.on("gateway_stop", handler)`。事件和上下文是相同的
    关闭清理契约；只更改 hook 名称。

    ```typescript
    // 之前
    api.on("deactivate", async (event, ctx) => {
      await stopPluginService(ctx);
    });

    // 之后
    api.on("gateway_stop", async (event, ctx) => {
      await stopPluginService(ctx);
    });
    ```

    `deactivate` 仍会作为已弃用的兼容别名接线，直到 2026-08-16 之后。

  </Accordion>

  <Accordion title="subagent_spawning hook → core thread binding">
    **Old**: `api.on("subagent_spawning", handler)` returning
    `threadBindingReady` or `deliveryOrigin`.

    **New**: let core prepare `thread: true` subagent bindings through the
    channel session-binding adapter. Use `api.on("subagent_spawned", handler)`
    only for post-launch observation.

    ```typescript
    // Before
    api.on("subagent_spawning", async () => ({
      status: "ok",
      threadBindingReady: true,
      deliveryOrigin: { channel: "discord", to: "channel:123", threadId: "456" },
    }));

    // After
    api.on("subagent_spawned", async (event) => {
      await observeSubagentLaunch(event);
    });
    ```

    `subagent_spawning`, `PluginHookSubagentSpawningEvent`,
    `PluginHookSubagentSpawningResult`, and
    `SubagentLifecycleHookRunner.runSubagentSpawning(...)` remain only as
    deprecated compatibility surfaces while external plugins migrate.

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

    The context includes `provider`, `modelId`, optional merged `reasoning`,
    and optional merged model `compat` facts. Provider plugins can use those
    catalog facts to expose a model-specific profile only when the configured
    request contract supports it.

    Implement one hook instead of three. The legacy hooks keep working during
    the deprecation window but are not composed with the profile result.

  </Accordion>

  <Accordion title="External auth providers → contracts.externalAuthProviders">
    **Old**: implementing external auth hooks without declaring the provider
    in the plugin manifest.

    **New**: declare `contracts.externalAuthProviders` in the plugin manifest
    **and** implement `resolveExternalAuthProfiles(...)`.

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

    Same slots, single registration call. Additive prompt and corpus helpers
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`) are
    not affected.

  </Accordion>

  <Accordion title="Memory embedding provider API">
    **Old**: `api.registerMemoryEmbeddingProvider(...)` plus
    `contracts.memoryEmbeddingProviders`.

    **New**: `api.registerEmbeddingProvider(...)` plus
    `contracts.embeddingProviders`.

    The generic embedding provider contract is reusable outside memory and is
    the supported path for new providers. The memory-specific registration API
    remains wired as deprecated compatibility while existing providers migrate.
    Plugin inspection reports non-bundled usage as compatibility debt.

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

  <Accordion title="Embedded extension factories → agent tool-result middleware">
    上文“如何迁移 → 迁移嵌入式 tool-result 扩展到中间件”中已说明。此处仅为完整性列出：已移除的仅限嵌入式运行器的
    `api.registerEmbeddedExtensionFactory(...)` 路径，已替换为
    `api.registerAgentToolResultMiddleware(...)`，并在 `contracts.agentToolResultMiddleware` 中显式声明运行时列表。
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
