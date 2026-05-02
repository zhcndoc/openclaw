---
summary: "公开 OpenClaw App SDK API、事件分类、制品、审批和包结构的参考设计"
title: "OpenClaw App SDK API 设计"
sidebarTitle: "App SDK API 设计"
read_when:
  - 你正在实现提议中的公开 OpenClaw 应用 SDK
  - 你需要应用 SDK 的草案命名空间、事件、结果、制品、审批或安全契约
  - 你正在比较 Gateway 协议资源与高级别的 OpenClaw App SDK 包装器
---

本页是公开的 [OpenClaw App SDK](/concepts/openclaw-sdk) 的详细 API 参考设计。它有意与 [Plugin SDK](/plugins/sdk-overview) 分开。

<Note>
  `@openclaw/sdk` 是用于与 Gateway 通信的外部应用/客户端包。`openclaw/plugin-sdk/*` 是进程内插件编写契约。不要从只需要运行 agents 的应用中导入 Plugin SDK 的子路径。
</Note>

公开应用 SDK 应该分为两层构建：

1. 底层生成的 Gateway 客户端。
2. 高层的易用包装器，包含 `OpenClaw`、`Agent`、`Session`、`Run`、
   `Task`、`Artifact`、`Approval` 和 `Environment` 对象。

## 命名空间设计

底层命名空间应尽量紧跟 Gateway 资源：

```typescript
oc.agents.list();
oc.agents.get("main");
oc.agents.create(...);
oc.agents.update(...);

oc.sessions.list();
oc.sessions.create(...);
oc.sessions.resolve(...);
oc.sessions.send(...);
oc.sessions.messages(...);
oc.sessions.fork(...);
oc.sessions.compact(...);
oc.sessions.abort(...);

oc.runs.create(...);
oc.runs.get(runId);
oc.runs.events(runId, { after });
oc.runs.wait(runId);
oc.runs.cancel(runId);

oc.tasks.list(); // 未来 API：当前 SDK 会抛出不支持
oc.tasks.get(taskId); // 未来 API：当前 SDK 会抛出不支持
oc.tasks.cancel(taskId); // 未来 API：当前 SDK 会抛出不支持
oc.tasks.events(taskId, { after }); // 未来 API

oc.models.list();
oc.models.status(); // Gateway models.authStatus

oc.tools.list();
oc.tools.invoke(...); // 未来 API：当前 SDK 会抛出不支持

oc.artifacts.list({ runId }); // 未来 API：当前 SDK 会抛出不支持
oc.artifacts.get(artifactId); // 未来 API：当前 SDK 会抛出不支持
oc.artifacts.download(artifactId); // 未来 API：当前 SDK 会抛出不支持

oc.approvals.list();
oc.approvals.respond(approvalId, ...);

oc.environments.list(); // 未来 API：当前 SDK 会抛出不支持
oc.environments.create(...); // 未来 API：当前 SDK 会抛出不支持
oc.environments.status(environmentId); // 未来 API：当前 SDK 会抛出不支持
oc.environments.delete(environmentId); // 未来 API：当前 SDK 会抛出不支持
```

高层包装器应返回对象，让常见流程更加顺畅：

```typescript
const run = await agent.run(inputOrParams);
await run.cancel();
await run.wait();

for await (const event of run.events()) {
  // 规范化事件流
}

const artifacts = await run.artifacts.list();
const session = await run.session();
```

## 事件契约

公开 SDK 应暴露版本化、可重放、已规范化的事件。

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
  raw?: unknown;
};
```

`id` 是一个重放游标。消费者应能够使用 `events({ after: id })` 重新连接，并在保留期限允许时接收遗漏的事件。

推荐的规范化事件族：

| 事件                 | 含义                                                     |
| -------------------- | -------------------------------------------------------- |
| `run.created`         | Run 已被接受。                                           |
| `run.queued`          | Run 正在等待会话通道、运行时或环境。                      |
| `run.started`         | 运行时已开始执行。                                        |
| `run.completed`       | Run 已成功完成。                                          |
| `run.failed`          | Run 以错误结束。                                          |
| `run.cancelled`       | Run 已被取消。                                            |
| `run.timed_out`       | Run 超过了其超时时间。                                    |
| `assistant.delta`     | Assistant 文本增量。                                     |
| `assistant.message`   | 完整的 assistant 消息或替换。                             |
| `thinking.delta`      | 推理或计划增量，在策略允许公开时可见。                    |
| `tool.call.started`   | 工具调用开始。                                            |
| `tool.call.delta`     | 工具调用流式进度或部分输出。                              |
| `tool.call.completed` | 工具调用成功返回。                                        |
| `tool.call.failed`    | 工具调用失败。                                            |
| `approval.requested`  | Run 或工具需要审批。                                      |
| `approval.resolved`   | 审批已被授予、拒绝、过期或取消。                           |
| `question.requested`  | 运行时向用户或宿主应用请求输入。                           |
| `question.answered`   | 宿主应用提供了答案。                                       |
| `artifact.created`    | 新制品可用。                                              |
| `artifact.updated`    | 现有制品已变更。                                          |
| `session.created`     | 会话已创建。                                              |
| `session.updated`     | 会话元数据已变更。                                        |
| `session.compacted`   | 会话已压缩。                                              |
| `task.updated`        | 后台任务状态已变更。                                      |
| `git.branch`          | 运行时观察到或更改了分支状态。                            |
| `git.diff`            | 运行时产生或更改了 diff。                                 |
| `git.pr`              | 运行时打开、更新或关联了一个 pull request。               |

运行时原生载荷应可通过 `raw` 获取，但应用在正常 UI 中不应需要解析 `raw`。

## 结果契约

`Run.wait()` 应返回一个稳定的结果封装：

```typescript
type RunResult = {
  runId: string;
  status: "accepted" | "completed" | "failed" | "cancelled" | "timed_out";
  sessionId?: string;
  sessionKey?: string;
  taskId?: string;
  startedAt?: string | number;
  endedAt?: string | number;
  output?: {
    text?: string;
    messages?: SDKMessage[];
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    costUsd?: number;
  };
  artifacts?: ArtifactSummary[];
  error?: SDKError;
};
```

结果应当朴素且稳定。时间戳值保留 Gateway 的形状，因此当前基于生命周期的运行通常报告 epoch 毫秒数字，而适配器仍可能暴露 ISO 字符串。丰富 UI、工具追踪和运行时原生细节应放在事件和制品中。

`accepted` 是一个非终态等待结果：它表示 Gateway 的等待截止时间在运行产生生命周期结束/错误之前已过期。它不能被视为 `timed_out`；`timed_out` 仅保留给超出其自身运行时超时时间的运行。

## 审批和问题

审批必须是一等公民，因为编码代理会不断跨越安全边界。

```typescript
run.onApproval(async (request) => {
  if (request.kind === "tool" && request.toolName === "exec") {
    return request.approveOnce({ reason: "CI 命令已由策略允许" });
  }

  return request.askUser();
});
```

审批事件应包含：

- 审批 id
- run id 和 session id
- 请求类型
- 请求的操作摘要
- 工具名称或环境操作
- 风险级别
- 可用决策
- 过期时间
- 该决策是否可复用

问题与审批是分开的。问题是向用户或宿主应用询问信息。审批是请求执行某个操作的许可。

## ToolSpace 模型

应用需要理解工具表面，而不导入插件内部实现。

```typescript
const tools = await run.toolSpace();

for (const tool of tools.list()) {
  console.log(tool.name, tool.source, tool.requiresApproval);
}
```

SDK 应暴露：

- 规范化的工具元数据
- source：OpenClaw、MCP、plugin、channel、runtime 或 app
- schema 摘要
- 审批策略
- 运行时兼容性
- 工具是否隐藏、只读、可写或宿主可用

通过 SDK 调用工具应当是显式且有作用域限制的。大多数应用应该运行 agents，而不是直接调用任意工具。

## 制品模型

制品应覆盖的不只是文件。

```typescript
type ArtifactSummary = {
  id: string;
  runId?: string;
  sessionId?: string;
  type:
    | "file"
    | "patch"
    | "diff"
    | "log"
    | "media"
    | "screenshot"
    | "trajectory"
    | "pull_request"
    | "workspace";
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt?: string;
};
```

常见示例：

- 文件编辑和生成文件
- patch 包
- VCS diff
- 截图和媒体输出
- 日志和追踪包
- pull request 链接
- 运行轨迹
- 托管环境工作区快照

制品访问应支持脱敏、保留策略和下载 URL，而不假设每个制品都是普通的本地文件。

## 安全模型

应用 SDK 必须明确说明权限。

推荐的 token scope：

| Scope               | 允许                                                 |
| ------------------- | ---------------------------------------------------- |
| `agent.read`        | 列出并检查 agents。                                  |
| `agent.run`         | 启动 runs。                                          |
| `session.read`      | 读取会话元数据和消息。                               |
| `session.write`     | 创建、发送到、分叉、压缩和中止 sessions。            |
| `task.read`         | 读取后台任务状态。                                   |
| `task.write`        | 取消或修改任务通知策略。                             |
| `approval.respond`  | 批准或拒绝请求。                                     |
| `tools.invoke`      | 直接调用暴露的工具。                                 |
| `artifacts.read`    | 列出并下载制品。                                     |
| `environment.write` | 创建或销毁托管环境。                                 |
| `admin`             | 管理操作。                                           |

默认值：

- 默认不转发 secret
- 不进行不受限制的环境变量透传
- 使用 secret 引用而不是 secret 值
- 明确的沙箱和网络策略
- 明确的远程环境保留策略
- 除非策略证明另有其事，否则宿主执行需要审批
- 原始运行时事件在离开 Gateway 前会被脱敏，除非调用方具有更强的诊断 scope

## 托管环境提供者

托管代理应实现为环境提供者。

```typescript
type EnvironmentProvider = {
  id: string;
  capabilities: {
    checkout?: boolean;
    sandbox?: boolean;
    networkPolicy?: boolean;
    secrets?: boolean;
    artifacts?: boolean;
    logs?: boolean;
    pullRequests?: boolean;
    longRunning?: boolean;
  };
};
```

第一版实现不需要是托管的 SaaS。它可以面向现有的 node 主机、临时工作区、CI 风格的运行器，或 Testbox 风格的环境。关键契约是：

1. 准备工作区
2. 绑定安全环境和密钥
3. 启动运行
4. 流式传输事件
5. 收集制品
6. 按策略清理或保留

一旦这一点稳定，托管云服务就可以实现相同的提供者契约。

## 包结构

推荐的包：

| 包                    | 用途                                                       |
| --------------------- | ---------------------------------------------------------- |
| `@openclaw/sdk`       | 面向公众的高层 SDK，以及生成的低层 Gateway 客户端。 |
| `@openclaw/sdk-react` | 面向仪表盘和应用构建器的可选 React hooks。         |
| `@openclaw/sdk-testing` | 用于应用集成测试的测试辅助工具和虚拟 Gateway 服务器。    |

仓库中已经有用于插件的 `openclaw/plugin-sdk/*`。请保持该命名空间独立，以免让插件作者与应用开发者混淆。

## 生成式客户端策略

低层客户端应根据版本化的 Gateway 协议模式生成，然后再由手写的易用类进行封装。

分层如下：

1. Gateway 模式作为唯一事实来源。
2. 生成的低层 TypeScript 客户端。
3. 用于外部输入和事件载荷的运行时校验器。
4. 高层的 `OpenClaw`、`Agent`、`Session`、`Run`、`Task` 和 `Artifact`
   封装器。
5. 食谱示例和集成测试。

收益：

- 协议漂移可见
- 测试可以比较生成的方法与 Gateway 导出内容
- App SDK 保持独立于 Plugin SDK 内部实现
- 低层使用者仍然拥有完整的协议访问能力
- 高层使用者获得更精简的产品 API

## 相关文档

- [OpenClaw App SDK](/concepts/openclaw-sdk)
- [Gateway RPC 参考](/reference/rpc)
- [Agent 循环](/concepts/agent-loop)
- [Agent 运行时](/concepts/agent-runtimes)
- [后台任务](/automation/tasks)
- [ACP agents](/tools/acp-agents)
- [Plugin SDK 概览](/plugins/sdk-overview)
