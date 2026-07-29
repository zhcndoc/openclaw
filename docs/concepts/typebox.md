---
summary: "将 TypeBox schema 作为网关协议的唯一事实来源"
read_when:
  - 更新协议 schema 或代码生成时
title: "TypeBox"
---

TypeBox 是一个以 TypeScript 为先的 schema 库。OpenClaw 使用它来定义 **Gateway WebSocket 协议**（握手、请求/响应、服务器事件）。这些 schema 驱动 **运行时验证**（AJV）、**JSON Schema 导出**，以及用于 macOS 应用的 **Swift 代码生成**。一个事实来源；其他一切都由此生成。

关于更高层的协议上下文，请从 [网关架构](/concepts/architecture) 开始。

## 心智模型（30 秒）

每条 Gateway WS 消息都是以下三种帧之一：

- **请求**：`{"type": "req", "id", "method", "params"}`
- **响应**：`{"type": "res", "id", "ok", "payload | error"}`
- **事件**：`{"type": "event", "event", "payload", "seq?", "stateVersion?"}`

第一帧**必须**是 `connect` 请求。之后，客户端调用方法（例如 `health`、`send`、`chat.send`）并订阅事件（例如 `presence`、`tick`、`agent`）。

连接流程（最小示例）：

```text
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

常见方法和事件：

| Category   | Examples                                                   | Notes                                        |
| ---------- | ---------------------------------------------------------- | -------------------------------------------- |
| Core       | `connect`, `health`, `status`                              | `connect` 必须是第一个                      |
| Messaging  | `send`, `agent`, `agent.wait`, `system-event`, `logs.tail` | 具有副作用的方法需要 `idempotencyKey`       |
| Chat       | `chat.history`, `chat.send`, `chat.abort`                  | WebChat 使用这些                            |
| Sessions   | `sessions.list`, `sessions.patch`, `sessions.delete`       | 会话管理                                     |
| Automation | `wake`, `cron.list`, `cron.run`, `cron.runs`               | 唤醒和 cron 控制                             |
| Nodes      | `node.list`, `node.invoke`, `node.pair.*`                  | Gateway WS 以及节点操作                     |
| Events     | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown`  | 服务端推送                                   |

权威的已公布 **discovery** 清单位于 `src/gateway/server-methods-list.ts`（`listGatewayMethods`, `GATEWAY_EVENTS`）。

## 模式定义所在位置

- 源 barrel：`packages/gateway-protocol/src/schema-modules.ts` 维护规范的领域模块列表，而公共的 `schema.ts` 包装器也会导出 `ProtocolSchemas`。
- 生成器注册表：按顺序排列的 `protocol-schema-fragment-*.ts` 文件将稳定名称映射到其所属模块中的规范 TypeBox 对象。`protocol-schemas.ts` 按固定顺序组合这些片段，并拒绝重复键。
- 运行时校验器（AJV）：`packages/gateway-protocol/src/index.ts`
- 对外声明的功能/发现注册表：`src/gateway/server-methods-list.ts`
- 服务器握手和方法分发：`src/gateway/server.impl.ts`
- Node 客户端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`（构建产物，不提交）
- 生成的 Swift 模型：`apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift`

## 当前流水线

- `pnpm protocol:gen` 将 JSON Schema（draft-07）写入 `dist/protocol.schema.json`。
- `pnpm protocol:gen:swift` 生成 Swift 网关模型。
- `pnpm protocol:gen:kotlin` 生成 Android 协议模型和常量。
- `pnpm protocol:check` 检查注册表结构，运行所有三个生成器，并验证已提交的 Swift 和 Kotlin 输出（JSON Schema 输出是一个被 git 忽略的构建产物）。

## 这些 schema 在运行时如何使用

- **服务端**：每个传入的帧都会使用 AJV 进行验证。握手只接受其参数与 `ConnectParams` 匹配的 `connect` 请求。
- **客户端**：JS 客户端会在使用事件帧和响应帧之前对其进行验证。
- **功能发现**：Gateway 会在 `hello-ok` 中发送一个保守的 `features.methods` 和 `features.events` 列表，这些列表来自 `listGatewayMethods()` 和 `GATEWAY_EVENTS`。
- 该发现列表并不是 `coreGatewayHandlers` 中每个可调用辅助方法的生成式导出；某些辅助 RPC 实现在 `src/gateway/server-methods/*.ts` 中，但并未列入对外公布的功能列表。

## 示例帧

连接（第一条消息）：

```json
{
  "type": "req",
  "id": "c1",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 4,
    "client": {
      "id": "openclaw-macos",
      "displayName": "macos",
      "version": "1.0.0",
      "platform": "macos 15.1",
      "mode": "ui",
      "instanceId": "A1B2"
    }
  }
}
```

Hello-ok 响应：

```json
{
  "type": "res",
  "id": "c1",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 4,
    "server": { "version": "dev", "connId": "ws-1" },
    "features": { "methods": ["health"], "events": ["tick"] },
    "snapshot": {
      "presence": [],
      "health": {},
      "stateVersion": { "presence": 0, "health": 0 },
      "uptimeMs": 0
    },
    "auth": { "role": "operator", "scopes": ["operator.read"] },
    "policy": { "maxPayload": 1048576, "maxBufferedBytes": 1048576, "tickIntervalMs": 30000 }
  }
}
```

请求和响应：

```json
{ "type": "req", "id": "r1", "method": "health" }
```

```json
{ "type": "res", "id": "r1", "ok": true, "payload": { "ok": true } }
```

事件：

```json
{ "type": "event", "event": "tick", "payload": { "ts": 1730000000 }, "seq": 12 }
```

## 最小客户端（Node.js）

最小可用流程：连接 + 健康检查。

```ts
import { WebSocket } from "ws";

const ws = new WebSocket("ws://127.0.0.1:18789");

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      type: "req",
      id: "c1",
      method: "connect",
      params: {
        minProtocol: 4,
        maxProtocol: 4,
        client: {
          id: "cli",
          displayName: "示例",
          version: "dev",
          platform: "node",
          mode: "cli",
        },
      },
    }),
  );
});

ws.on("message", (data) => {
  const msg = JSON.parse(String(data));
  if (msg.type === "res" && msg.id === "c1" && msg.ok) {
    ws.send(JSON.stringify({ type: "req", id: "h1", method: "health" }));
  }
  if (msg.type === "res" && msg.id === "h1") {
    console.log("健康状态：", msg.payload);
    ws.close();
  }
});
```

## 实际示例：端到端添加一个方法

示例：添加一个新的 `system.echo` 请求，返回 `{ ok: true, text }`。

1. **Schema（唯一真相来源）**

添加到 `packages/gateway-protocol/src/schema/system.ts`（或最接近的功能模块）：

```ts
export const SystemEchoParamsSchema = Type.Object(
  { text: NonEmptyString },
  { additionalProperties: false },
);

export const SystemEchoResultSchema = Type.Object(
  { ok: Type.Boolean(), text: NonEmptyString },
  { additionalProperties: false },
);
```

将这两个条目添加到最接近其语义的 `packages/gateway-protocol/src/schema/protocol-schema-fragment-*.ts` 文件中。如果该片段尚未使用所有者模块，请将其作为命名空间导入，然后将稳定的注册表名称映射到规范的 Schema 对象：

```ts
import * as system from "./system.js";

export const OperationsProtocolSchemas = {
  // 现有条目保持当前顺序。
  // ...
  SystemEchoParams: system.SystemEchoParamsSchema,
  SystemEchoResult: system.SystemEchoResultSchema,
} as const;
```

不要对片段键进行排序，也不要移动现有条目：原生代码生成会遵循注册表的插入顺序。`protocol-schemas.ts` 负责维护片段的明确顺序，只有在引入新的语义片段时才应修改它。

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **校验**

在 `packages/gateway-protocol/src/index.ts` 中，导出一个 AJV 校验器：

```ts
export const validateSystemEchoParams = ajv.compile<SystemEchoParams>(SystemEchoParamsSchema);
```

3. **服务端行为**

在 `src/gateway/server-methods/system.ts` 中添加一个处理器：

```ts
export const systemHandlers: GatewayRequestHandlers = {
  "system.echo": ({ params, respond }) => {
    const text = String(params.text ?? "");
    respond(true, { ok: true, text });
  },
};
```

将其注册到 `src/gateway/server-methods.ts` 中（该文件已经合并了 `systemHandlers`），然后把 `"system.echo"` 添加到 `src/gateway/server-methods-list.ts` 里的 `listGatewayMethods` 输入中。

如果该方法可被 operator 或 node 客户端调用，还需要在 `src/gateway/method-scopes.ts` 中对其分类，这样作用域强制校验和 `hello-ok` 特性通告才能保持一致。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **测试和文档**

在 `src/gateway/server.*.test.ts` 中添加一个服务端测试，并为该方法编写文档。

## Swift 代码生成行为

Swift 生成器会输出：

- 一个包含 `req`、`res`、`event` 和 `unknown` 情况的 `GatewayFrame` 枚举
- 强类型的负载结构体/枚举
- `ErrorCode` 值、`GATEWAY_PROTOCOL_VERSION` 和 `GATEWAY_MIN_PROTOCOL_VERSION`

未知的帧类型会以原始负载的形式保留，以保持向前兼容性。

## 版本与兼容性

- `PROTOCOL_VERSION` 位于 `packages/gateway-protocol/src/version.ts`（当前值：`4`）。
- 客户端发送 `minProtocol` 和 `maxProtocol`；服务器会拒绝不包含其当前协议版本的范围。
- Swift 模型会保留未知的帧类型，以避免破坏较旧的客户端。

## Schema 模式和约定

- 大多数对象使用 `additionalProperties: false` 来实现严格的负载。
- `NonEmptyString`（`Type.String({ minLength: 1 })`）是 ID 以及方法/事件名称的默认类型。
- 顶层的 `GatewayFrame` 在 `type` 上使用 **discriminator**。
- 带有副作用的方法通常需要在 params 中提供 `idempotencyKey`（例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可选的 `internalEvents`，用于运行时生成的编排上下文（例如子代理/cron 任务完成交接）；请将其视为内部 API 接口面。

## 实时 schema JSON

生成的 JSON Schema 是构建产物，不会提交到仓库。在包发布期间，当前的 beta schema 可在以下位置获取：

- [`protocol.schema.json`](https://unpkg.com/@openclaw/gateway-protocol@beta/protocol.schema.json)

## 当你更改 schema 时

1. 在所属的 `packages/gateway-protocol/src/schema/*.ts` 模块中更新 TypeBox schemas，并将它们注册到最近的 `protocol-schema-fragment-*.ts` 文件中，且不要重新排序现有键。
2. 在 `src/gateway/server-methods-list.ts` 中注册该 method/event。
3. 当新的 RPC 需要 operator 或 node scope 分类时，更新 `src/gateway/method-scopes.ts`。
4. 运行 `pnpm protocol:check`。
5. 提交重新生成的 Swift models。

## 相关

- [富输出协议](/reference/rich-output-protocol)
- [RPC 适配器](/reference/rpc)
