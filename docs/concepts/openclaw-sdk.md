---
summary: "面向外部应用、脚本、仪表板、CI 作业和 IDE 扩展的公开 OpenClaw App SDK"
title: "OpenClaw App SDK"
sidebarTitle: "App SDK"
read_when:
  - 你正在构建一个与 OpenClaw 通信的外部应用、脚本、仪表板、CI 作业或 IDE 扩展
  - 你正在在 App SDK 和 Plugin SDK 之间做选择
  - 你正在集成 Gateway agent 运行、会话、事件、审批、模型或工具
---

**OpenClaw App SDK** 是面向 OpenClaw 进程外应用的公共客户端 API。当脚本、仪表板、CI 作业、IDE 扩展或其他外部应用需要连接 Gateway、启动 agent 运行、流式接收事件、等待结果、取消工作或检查 Gateway 资源时，请使用 `@openclaw/sdk`。

<Note>
  App SDK 与 [Plugin SDK](/plugins/sdk-overview) 不同。
  `@openclaw/sdk` 从 OpenClaw 外部与 Gateway 通信。
  `openclaw/plugin-sdk/*` 仅供运行在 OpenClaw 内部、并注册 provider、channel、tool、hook 或受信任运行时的插件使用。
</Note>

## 目前已发布内容

`@openclaw/sdk` 提供以下内容：

| Surface                   | 状态   | 功能说明                                                                |
| ------------------------- | ------ | -------------------------------------------------------------------------- |
| `OpenClaw`                | 已就绪 | 主客户端入口。负责传输、连接、请求和事件。 |
| `GatewayClientTransport`  | 已就绪 | 由 Gateway 客户端支持的 WebSocket 传输。                          |
| `oc.agents`               | 已就绪 | 列出、创建、更新、删除并获取 agent 句柄。                  |
| `Agent.run()`             | 已就绪 | 启动一个 Gateway `agent` 运行并返回一个 `Run`。                          |
| `oc.runs`                 | 已就绪 | 创建、获取、等待、取消并流式获取运行。                       |
| `Run.events()`            | 已就绪 | 流式输出按运行归一化的事件，并为快速完成的运行提供回放。               |
| `Run.wait()`              | 已就绪 | 调用 `agent.wait` 并返回稳定的 `RunResult`。                       |
| `Run.cancel()`            | 已就绪 | 按运行 id 调用 `sessions.abort`，在可用时带上 session key。         |
| `oc.sessions`             | 已就绪 | 创建、解析、发送、补丁更新、压缩并获取 session 句柄。  |
| `Session.send()`          | 已就绪 | 调用 `sessions.send` 并返回一个 `Run`。                                 |
| `oc.models`               | 已就绪 | 调用 `models.list` 和当前的 `models.authStatus` 状态 RPC。        |
| `oc.tools`                | 已就绪 | 通过策略流水线列出、限定范围并调用 Gateway 工具。              |
| `oc.artifacts`            | 已就绪 | 列出、获取并下载 Gateway 转录制品。                   |
| `oc.approvals`            | 已就绪 | 通过 Gateway 审批 RPC 列出并处理 exec 审批。           |
| `oc.rawEvents()`          | 已就绪 | 为高级使用者暴露原始 Gateway 事件。                         |
| `normalizeGatewayEvent()` | 已就绪 | 将原始 Gateway 事件转换为稳定的 SDK 事件形状。               |

该 SDK 还导出了这些 Surface 所使用的核心类型：
`AgentRunParams`、`RunResult`、`RunStatus`、`OpenClawEvent`、
`OpenClawEventType`、`GatewayEvent`、`OpenClawTransport`、
`GatewayRequestOptions`、`SessionCreateParams`、`SessionSendParams`、
`ArtifactSummary`、`ArtifactQuery`、`ArtifactsListResult`、
`ArtifactsGetResult`、`ArtifactsDownloadResult`、`RuntimeSelection`、
`EnvironmentSelection`、`WorkspaceSelection`、`ApprovalMode` 以及相关
结果类型。

## 连接到 Gateway

创建客户端时显式指定 Gateway URL，或为测试和嵌入式应用运行时注入自定义传输层。

```typescript
import { OpenClaw } from "@openclaw/sdk";

const oc = new OpenClaw({
  url: "ws://127.0.0.1:14565",
  token: process.env.OPENCLAW_GATEWAY_TOKEN,
  requestTimeoutMs: 30_000,
});

await oc.connect();
```

`new OpenClaw({ gateway: "ws://..." })` 等同于 `url`。构造函数接受
`gateway: "auto"` 选项，但自动发现 Gateway 目前还不是独立的 SDK 功能；当应用本身不知道如何发现 Gateway 时，请传入 `url`。

对于测试，请传入实现了 `OpenClawTransport` 的对象：

```typescript
const oc = new OpenClaw({
  transport: {
    async request(method, params) {
      return { method, params };
    },
    async *events() {},
  },
});
```

## 运行一个 Agent

当应用需要一个 agent 句柄时，使用 `oc.agents.get(id)`，然后调用
`agent.run()`。

```typescript
const agent = await oc.agents.get("main");

const run = await agent.run({
  input: "Review this pull request and suggest the smallest safe fix.",
  model: "openai/gpt-5.5",
  sessionKey: "main",
  timeoutMs: 30_000,
});

for await (const event of run.events()) {
  const data = event.data as { delta?: unknown };
  if (event.type === "assistant.delta" && typeof data.delta === "string") {
    process.stdout.write(data.delta);
  }
}

const result = await run.wait({ timeoutMs: 120_000 });
console.log(result.status);
```

带 provider 前缀的模型引用，例如 `openai/gpt-5.5`，会被拆分为 Gateway 的
`provider` 和 `model` 覆盖项。`timeoutMs` 在 SDK 中仍以毫秒为单位，
并会在 `agent` RPC 中转换为 Gateway 的超时秒数。

`run.wait()` 使用 Gateway 的 `agent.wait` RPC。若等待截止时间到期时运行仍处于活动状态，则返回 `status: "accepted"`，而不是假装运行本身已超时。运行时超时、已中止运行和已取消运行会被归一化为 `timed_out` 或 `cancelled`。

## 创建并复用 Session

当应用需要持久化的转录状态时，请使用 session。

```typescript
const session = await oc.sessions.create({
  agentId: "main",
  label: "release-review",
});

const run = await session.send("Prepare release notes from the current diff.");
await run.wait();
```

`Session.send()` 调用 `sessions.send` 并返回一个 `Run`。Session 句柄还支持：

```typescript
await session.abort(run.id);
await session.patch({ label: "renamed-session" });
await session.compact({ maxLines: 200 });
```

## 流式接收事件

SDK 会将原始 Gateway 事件归一化为稳定的 `OpenClawEvent` 信封：

```typescript
type OpenClawEvent = {
  version: 1;
  id: string;
  ts: number;
  type: OpenClawEventType;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  agentId?: string;
  data: unknown;
  raw?: GatewayEvent;
};
```

常见事件类型包括：

| Event type            | 来源 Gateway 事件                        |
| --------------------- | ------------------------------------------- |
| `run.started`         | `agent` 生命周期开始                     |
| `run.completed`       | `agent` 生命周期结束                       |
| `run.failed`          | `agent` 生命周期错误                     |
| `run.cancelled`       | 已中止/已取消的生命周期结束             |
| `run.timed_out`       | 超时生命周期结束                       |
| `assistant.delta`     | Assistant 流式 delta                   |
| `assistant.message`   | Assistant 消息                           |
| `thinking.delta`      | Thinking 或 plan 流                     |
| `tool.call.started`   | 工具/item/命令开始                     |
| `tool.call.delta`     | 工具/item/命令更新                    |
| `tool.call.completed` | 工具/item/命令完成                |
| `tool.call.failed`    | 工具/item/命令失败或被阻止状态 |
| `approval.requested`  | Exec 或 plugin 审批请求             |
| `approval.resolved`   | Exec 或 plugin 审批结果          |
| `session.created`     | `sessions.changed` 创建                   |
| `session.updated`     | `sessions.changed` 更新                   |
| `session.compacted`   | `sessions.changed` 压缩               |
| `task.updated`        | 任务更新事件                          |
| `artifact.updated`    | 补丁流事件                     |
| `raw`                 | 目前尚无稳定 SDK 映射的任何事件  |

`Run.events()` 会将事件过滤为单个 run id，并为快速完成的运行回放已见过的事件。也就是说，下面的流程是安全的：

```typescript
const run = await agent.run("Summarize the latest session.");

for await (const event of run.events()) {
  if (event.type === "run.completed") {
    break;
  }
}
```

对于应用级流，请使用 `oc.events()`。对于原始 Gateway 帧，请使用
`oc.rawEvents()`。

## 模型、工具、制品与审批

模型辅助方法映射到当前 Gateway 方法：

```typescript
await oc.models.list();
await oc.models.status({ probe: false }); // 调用 models.authStatus
```

工具辅助方法暴露 Gateway 目录、有效工具视图以及直接的
Gateway 工具调用。`oc.tools.invoke()` 返回一个类型化信封，而不会因为策略或审批拒绝而抛出异常。

```typescript
await oc.tools.list();
await oc.tools.effective({ sessionKey: "main" });
await oc.tools.invoke("tool-name", {
  args: { input: "value" },
  sessionKey: "main",
  confirm: false,
  idempotencyKey: "tool-call-1",
});
```

制品辅助方法暴露用于 session、run 或 task 上下文的 Gateway 制品投影。每次调用都需要一个明确的 `sessionKey`、`runId` 或
`taskId` 作用域：

```typescript
const { artifacts } = await oc.artifacts.list({ sessionKey: "main" });
const first = artifacts[0];

if (first) {
  const { artifact } = await oc.artifacts.get(first.id, { sessionKey: "main" });
  const download = await oc.artifacts.download(artifact.id, { sessionKey: "main" });
  console.log(download.encoding, download.url);
}
```

审批辅助方法使用 exec 审批 RPC：

```typescript
const approvals = await oc.approvals.list();
await oc.approvals.respond("approval-id", { decision: "approve" });
```

## 目前明确不支持的内容

该 SDK 包含我们希望实现的产品模型的名称，但不会假装 Gateway RPC 以静默方式存在。以下调用目前会抛出明确的“不支持”错误：

```typescript
await oc.tasks.list();
await oc.tasks.get("task-id");
await oc.tasks.cancel("task-id");

await oc.environments.list();
await oc.environments.create({});
await oc.environments.status("environment-id");
await oc.environments.delete("environment-id");
```

按运行级别的 `workspace`、`runtime`、`environment` 和 `approvals` 字段被类型定义为未来形态，但当前 Gateway 不支持在 `agent` RPC 上使用这些覆盖项。如果调用方传入这些字段，SDK 会在提交运行前抛出错误，这样工作就不会意外使用默认的 workspace、runtime、environment 或审批行为来执行。

## App SDK 与 Plugin SDK

当代码运行在 OpenClaw 之外时，使用 App SDK：

- 启动或观察 agent 运行的 Node 脚本
- 调用 Gateway 的 CI 作业
- 仪表板和管理面板
- IDE 扩展
- 不需要成为 channel 插件的外部桥接
- 使用假的或真实的 Gateway 传输进行的集成测试

当代码运行在 OpenClaw 内部时，使用 Plugin SDK：

- provider 插件
- channel 插件
- 工具或生命周期钩子
- agent harness 插件
- 受信任的运行时辅助工具

App SDK 代码应从 `@openclaw/sdk` 导入。Plugin 代码应从文档中记录的 `openclaw/plugin-sdk/*` 子路径导入。不要混用这两种契约。

## 相关文档

- [OpenClaw App SDK API 设计](/reference/openclaw-sdk-api-design)
- [Gateway RPC 参考](/reference/rpc)
- [Agent 循环](/concepts/agent-loop)
- [Agent 运行时](/concepts/agent-runtimes)
- [会话](/concepts/session)
- [后台任务](/automation/tasks)
- [ACP agents](/tools/acp-agents)
- [Plugin SDK 概览](/plugins/sdk-overview)
