---
summary: "将 TypeBox 模式作为网关协议的唯一真实来源"
read_when:
  - 更新协议模式或代码生成
title: "TypeBox"
---

TypeBox 是一个以 TypeScript 为首的模式库。我们用它来定义 **Gateway
WebSocket 协议**（握手、请求/响应、服务端事件）。这些模式驱动着
**运行时校验**、**JSON Schema 导出**，以及 macOS 应用的
**Swift 代码生成**。单一真实来源；其他一切都由此生成。

如果你想了解更高层的协议上下文，请从 [Gateway 架构](/concepts/architecture) 开始。

## 心智模型（30 秒）

每个 Gateway WS 消息都属于三种帧之一：

- **请求**：`{ type: "req", id, method, params }`
- **响应**：`{ type: "res", id, ok, payload | error }`
- **事件**：`{ type: "event", event, payload, seq?, stateVersion? }`

第一帧 **必须** 是 `connect` 请求。之后，客户端可以调用方法（例如 `health`、`send`、`chat.send`）并订阅事件（例如 `presence`、`tick`、`agent`）。

连接流程（最小示例）：

```
Client                    Gateway
  |---- req:connect -------->|
  |<---- res:hello-ok --------|
  |<---- event:tick ----------|
  |---- req:health ---------->|
  |<---- res:health ----------|
```

常见方法 + 事件：

| Category   | Examples                                                   | Notes                              |
| ---------- | ---------------------------------------------------------- | ---------------------------------- |
| Core       | `connect`, `health`, `status`                              | `connect` 必须是第一个             |
| Messaging  | `send`, `agent`, `agent.wait`, `system-event`, `logs.tail` | 副作用需要 `idempotencyKey`        |
| Chat       | `chat.history`, `chat.send`, `chat.abort`                  | WebChat 使用这些                   |
| Sessions   | `sessions.list`, `sessions.patch`, `sessions.delete`       | 会话管理                           |
| Automation | `wake`, `cron.list`, `cron.run`, `cron.runs`               | 唤醒 + 定时任务控制                |
| Nodes      | `node.list`, `node.invoke`, `node.pair.*`                  | Gateway WS + 节点操作              |
| Events     | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown`  | 服务端推送                         |

权威的已发布 **发现** 清单位于 `src/gateway/server-methods-list.ts`（`listGatewayMethods`、`GATEWAY_EVENTS`）。

## 模式位于何处

- 源文件：`src/gateway/protocol/schema.ts`
- 运行时校验器（AJV）：`src/gateway/protocol/index.ts`
- 已发布功能/发现注册表：`src/gateway/server-methods-list.ts`
- 服务端握手 + 方法分发：`src/gateway/server.impl.ts`
- Node 客户端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`
- 生成的 Swift 模型：`apps/macos/Sources/OpenClawProtocol/GatewayModels.swift`

## 当前流水线

- `pnpm protocol:gen`
  - 写入 JSON Schema（draft-07）到 `dist/protocol.schema.json`
- `pnpm protocol:gen:swift`
  - 生成 Swift 网关模型
- `pnpm protocol:check`
  - 运行两个生成器并验证输出已提交

## 运行时如何使用这些模式

- **服务端**：每个传入帧都会用 AJV 校验。握手只接受参数与 `ConnectParams` 匹配的 `connect` 请求。
- **客户端**：JS 客户端会在使用事件和响应帧之前先进行校验。
- **功能发现**：Gateway 会在 `hello-ok` 中从 `listGatewayMethods()` 和 `GATEWAY_EVENTS` 发送一个保守的 `features.methods` 和 `features.events` 列表。
- 该发现列表并不是 `coreGatewayHandlers` 中所有可调用辅助函数的生成性转储；某些辅助 RPC 实现在 `src/gateway/server-methods/*.ts` 中，但不会被列入已发布的功能列表。

## 示例帧

Connect（第一条消息）：

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
    "policy": { "maxPayload": 1048576, "maxBufferedBytes": 1048576, "tickIntervalMs": 30000 }
  }
}
```

请求 + 响应：

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

最小可用流程：连接 + health。

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
          displayName: "example",
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
    console.log("health:", msg.payload);
    ws.close();
  }
});
```

## 实战示例：端到端添加一个方法

示例：添加一个新的 `system.echo` 请求，返回 `{ ok: true, text }`。

1. **模式（唯一真实来源）**

在 `src/gateway/protocol/schema.ts` 中添加：

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

将两者加入 `ProtocolSchemas` 并导出类型：

```ts
  SystemEchoParams: SystemEchoParamsSchema,
  SystemEchoResult: SystemEchoResultSchema,
```

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **校验**

在 `src/gateway/protocol/index.ts` 中导出一个 AJV 校验器：

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

将其注册到 `src/gateway/server-methods.ts`（它已经合并了 `systemHandlers`），然后把 `"system.echo"` 添加到 `src/gateway/server-methods-list.ts` 中的 `listGatewayMethods` 输入里。

如果该方法可供操作员或节点客户端调用，也要在 `src/gateway/method-scopes.ts` 中对其分类，这样作用域强制和 `hello-ok` 功能发布就能保持一致。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **测试 + 文档**

在 `src/gateway/server.*.test.ts` 中添加服务端测试，并在文档中说明该方法。

## Swift 代码生成行为

Swift 生成器会输出：

- `GatewayFrame` 枚举，包含 `req`、`res`、`event` 和 `unknown` 分支
- 强类型的负载结构体/枚举
- `ErrorCode` 值、`GATEWAY_PROTOCOL_VERSION` 和 `GATEWAY_MIN_PROTOCOL_VERSION`

未知帧类型会以原始负载形式保留，以保证向前兼容。

## 版本控制 + 兼容性

- `PROTOCOL_VERSION` 位于 `src/gateway/protocol/version.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务端会拒绝不包含其当前协议版本的范围。
- Swift 模型会保留未知帧类型，以避免破坏旧客户端。

## 模式模式与约定

- 大多数对象都使用 `additionalProperties: false`，以保证负载严格。
- `NonEmptyString` 是 ID 以及方法/事件名称的默认选择。
- 顶层 `GatewayFrame` 在 `type` 上使用 **discriminator**。
- 带副作用的方法通常需要在参数中提供 `idempotencyKey`
  （例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可选的 `internalEvents`，用于运行时生成的编排上下文
  （例如子代理/cron 任务完成交接）；请将其视为内部 API 面。

## 线上模式 JSON

生成的 JSON Schema 位于仓库中的 `dist/protocol.schema.json`。发布的原始文件通常可在以下地址获取：

- [https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json](https://raw.githubusercontent.com/openclaw/openclaw/main/dist/protocol.schema.json)

## 当你修改模式时

1. 更新 TypeBox 模式。
2. 在 `src/gateway/server-methods-list.ts` 中注册该方法/事件。
3. 当新的 RPC 需要操作员或节点作用域分类时，更新 `src/gateway/method-scopes.ts`。
4. 运行 `pnpm protocol:check`。
5. 提交重新生成的 schema + Swift 模型。

## 相关内容

- [富输出协议](/reference/rich-output-protocol)
- [RPC 适配器](/reference/rpc)
