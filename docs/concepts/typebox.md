---
summary: "将 TypeBox schema 作为网关协议的唯一事实来源"
read_when:
  - "更新协议 schema 或代码生成时"
title: "TypeBox"
---

TypeBox 是 TypeScript-first 模式库。 OpenClaw 使用它来定义 **Gateway WebSocket 协议**（握手、request/response、服务器事件）。这些架构驱动 **运行时验证**（TypeBox 编译）、**JSON 架构导出** 和 **Swift codegen** macOS 应用程序。真理的一个来源；其他一切都会生成。

关于更高层的协议上下文，请从 [网关架构](/concepts/architecture) 开始。

## <a id="mental-model-(30-seconds)"></a><a id="mental-model-30-seconds"></a> 心智模型（30 秒）

每条 Gateway WS 消息都是以下三种帧之一：

- **请求**：`{ type: "req", id, method, params }`
- **响应**：`{ type: "res", id, ok, payload | error }`
- **事件**： `{ type: "event", event, payload, seq?, stateVersion? }`

第一帧**必须** be a `connect`要求。之后，客户端调用方法（e.g. `health`， `send`， `chat.send`）并订阅事件（e.g. `presence`， `tick`， `agent`）。

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

| 类别   | 示例                                                   | 笔记                                        |
| ---------- | ---------------------------------------------------------- | -------------------------------------------- |
| 核心       | `connect`, `health`, `status`                              | `connect` 必须是第一个                      |
| 消息传递  | `send`, `agent`, `agent.wait`, `system-event`, `logs.tail` | 具有副作用的方法需要 `idempotencyKey` |
| 聊天       | `chat.history`, `chat.send`, `chat.abort`                  | WebChat 使用这些                           |
| 会话   | `sessions.list`, `sessions.patch`, `sessions.delete`       | 会话管理                                |
| 自动化 | `wake`, `cron.list`, `cron.run`, `cron.runs`               | 唤醒和 cron 控制                        |
| 节点      | `node.list`, `node.invoke`, `node.pair.*`                  | Gateway WS 以及节点操作                 |
| 事件     | `tick`, `presence`, `agent`, `chat`, `health`, `shutdown`  | 服务端推送                                  |

权威的已公布**发现**清单位于 `src/gateway/server-methods-list.ts`（`listGatewayMethods`, `GATEWAY_EVENTS`）。

## <a id="where-the-schemas-live"></a> 模式定义所在位置

- 源桶：`packages/gateway-protocol/src/schema-modules.ts`拥有共享域模块列表，而公共`schema.ts`包装器也公开`ProtocolSchemas`。
- 生成器选择：`packages/gateway-protocol/src/schema/protocol-schema-selection.ts`从共享桶的`*Schema`导出和显式`skill-library.ts`导入派生注册表名称，删除`Schema`后缀。 `EXCLUDED_SCHEMA_EXPORTS` 将具有补充注册表所有者的帮助程序和架构排除在该派生选择之外。
- Generator 注册表：`protocol-schemas.ts` 组成派生选择、`MigrationProtocolSchemas` 和 `SessionPlacementProtocolSchemas`，拒绝重复键并保留原始 TypeBox 对象。 `protocol-schema-types.ts` 保留每个成员的架构类型和公共 readonly/writable 修饰符。
- 运行时验证器：`packages/gateway-protocol/src/validator-registry.ts`，利用懒惰TypeBox编译所有者在`protocol-validator.ts`
- 公布的feature/discovery注册表：`src/gateway/server-methods-list.ts`
- 服务器握手和方法分派：`src/gateway/server-core-runtime.ts`
- Node 客户端：`src/gateway/client.ts`
- 生成的 JSON Schema：`dist/protocol.schema.json`（构建输出，不纳入版本控制）
- 生成的 Swift 模型：SwiftPM/Xcode 插件输出，或用于存储库工具的 `apps/shared/OpenClawKit/.build/protocol/GatewayModels.swift`

派生选择使用完整源导出名称 **before** 的词法顺序，并删除 `Schema` 后缀。迁移和会话放置映射按照它们自己的插入顺序跟随它。这取代了以前手动排序的注册片段； JSON 定义顺序和 Swift 声明位置可以更改，而无需更改架构数据或本机声明主体。

现在，合格的源导出的成员资格可以选择退出：共享桶中的新 `*Schema` 导出将进入生成器注册表，除非明确排除。检查每个新导出的预期生成协议成员资格，并将仅帮助程序导出添加到 `EXCLUDED_SCHEMA_EXPORTS`。注册表警卫检查选择一致性、原始对象、排除和组成；它无法独立确定新导出的模式是否属于公共生成的协议。

## <a id="current-pipeline"></a> 当前流水线

- `pnpm protocol:gen` 将 JSON Schema（draft-07）写入 `dist/protocol.schema.json`。
- `pnpm install`和`pnpm build`自动准备本机协议模型。 SwiftPM/Xcode 和 Gradle 还生成自己的构建拥有的源代码并跳过未更改的生成。新的完整存储库源档案使用这些相同的入口点。
- `pnpm protocol:gen:swift` 在共享包的忽略的 `.build/protocol` 目录中生成 Swift 模型。
- `pnpm protocol:gen:kotlin` 在 `apps/android/app/build/generated/openclaw-protocol` 下生成 Android 模型和常数。
- `pnpm protocol:check:swift`和`pnpm protocol:check:kotlin`绕过缓存，检查schema/version合约，并生成两次以验证确定性。
- `pnpm protocol:check` 检查注册表结构和所有生成的工件。输出被忽略构建工件，而不是提交的基线。 JSON 架构验证检查所需的帧定义、帧排序、`type` 鉴别器映射和非空方法元数据。本机验证根据模式注册表检查协议版本和 Swift model/enum 成员资格；本机兼容性测试保护解码和初始化合约。

一起提交模式和生成器更改；本机输出永远不会被提交。 `scripts/native-protocol-inputs.json` 拥有存储库工具和两个本机构建系统共享的源输入。 Generation 根据该清单检查其导入图，因此未声明的依赖项会失败，而不是留下陈旧的模型。稳定的解码行为属于重点 `GatewayModelsCompatibilityTests.swift` 回归，而不是手写模型副本。

## <a id="how-the-schemas-are-used-at-runtime"></a> 架构在运行时的使用方式

- **服务器端**：每个入站帧都通过TypeBox编译进行验证。握手仅接受参数与 `ConnectParams` 匹配的 `connect` 请求。
- **客户端**：JS 客户端会在使用事件帧和响应帧之前对其进行验证。
- **特征发现**：网关从`listGatewayMethods()`和`GATEWAY_EVENTS`发送`hello-ok`中的保守`features.methods`和`features.events`列表。
- 该发现列表不是 `coreGatewayHandlers` 中每个可调用帮助程序的生成转储；一些辅助 RPC 在 `src/gateway/server-methods/*.ts` 中实现，但未在公布的功能列表中枚举。

## <a id="example-frames"></a> 示例帧

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

## <a id="minimal-client-(node.js)"></a><a id="minimal-client-node-js"></a> 最小客户端（Node.js）

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

## <a id="worked-example%3A-add-a-method-end-to-end"></a><a id="worked-example-add-a-method-end-to-end"></a> 实际示例：端到端添加一个方法

示例：添加一个新的 `system.echo` 请求，返回 `{ ok: true, text }`。

1. **模式（唯一真相来源）**

添加到 `packages/gateway-protocol/src/schema/system-info.ts`（或最接近的匹配功能模块）：

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

`system-info.ts` 已由 `packages/gateway-protocol/src/schema-modules.ts` 导出，因此两个模式都会自动输入 `ProtocolSchemas` 作为 `SystemEchoParams` 和 `SystemEchoResult`。对于新的所有者模块，将其导出添加到该共享桶中。查看它引入的任何其他 `*Schema` 导出并排除 `protocol-schema-selection.ts` 中的仅帮助程序模式。将迁移或会话放置映射所拥有的架构保留在这些映射中，并从派生选择中排除。

从所有者模块中导出相应的静态类型：

```ts
export type SystemEchoParams = Static<typeof SystemEchoParamsSchema>;
export type SystemEchoResult = Static<typeof SystemEchoResultSchema>;
```

2. **校验**

在 `packages/gateway-protocol/src/validator-registry.ts` 中，使用现有的惰性编译器导出验证器：

```ts
export const validateSystemEchoParams = compile(S.SystemEchoParamsSchema);
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

将其注册到`src/gateway/server-methods.ts`中（已经合并`systemHandlers`），然后将`"system.echo"`添加到`src/gateway/server-methods-list.ts`中的`listGatewayMethods`输入中。

如果该方法可被操作员或节点客户端调用，还需要在 `src/gateway/method-scopes.ts` 中对其分类，这样作用域强制校验和 `hello-ok` 特性通告才能保持一致。

4. **重新生成**

```bash
pnpm protocol:check
```

5. **测试和文档**

在 `src/gateway/server.*.test.ts` 中添加一个服务端测试，并为该方法编写文档。

## <a id="swift-codegen-behavior"></a> Swift 代码生成行为

Swift 生成器会输出：

- a `GatewayFrame` 枚举，包含 `req`、`res`、`event` 和 `unknown` 案例
- 强类型负载 structs/enums
- `ErrorCode` 值、`GATEWAY_PROTOCOL_VERSION` 和 `GATEWAY_MIN_PROTOCOL_VERSION`

未知的帧类型会以原始负载的形式保留，以保持向前兼容性。

某些注册表名称为相同的底层架构对象起了别名。当注册表枚举更改时，`scripts/protocol-gen-swift.ts` 中的显式主要别名首选项会保留现有的公共 Swift 类型名称。检查生成的声明主体，包括字段类型、初始值设定项和 encoding/decoding 行为；移动声明不得默默地选择不同的名义类型。

已发布的 JSON Schema 的 `oneOf` 帧顺序是一个单独的合约：`req`、`res`、然后是 `event`，以及匹配的 `type` 鉴别器映射。 `scripts/lib/protocol-schema-document.mts` 独立于注册表定义顺序拥有并检查该顺序。

## <a id="versioning-and-compatibility"></a> 版本与兼容性

- `PROTOCOL_VERSION` 位于 `packages/gateway-protocol/src/version.ts`（当前值：`4`）。
- 客户端发送 `minProtocol` 和 `maxProtocol`；服务器会拒绝不包含其当前协议版本的范围。
- Swift 模型会保留未知的帧类型，以避免破坏较旧的客户端。

## <a id="schema-patterns-and-conventions"></a> Schema 模式和约定

- 大多数对象使用 `additionalProperties: false` 来实现严格的负载。
- `NonEmptyString` （`Type.String({ minLength: 1 })`） 是 ID 和 method/event 名称的默认值。
- 顶层的 `GatewayFrame` 在 `type` 上使用 **discriminator**。
- 带有副作用的方法通常需要在 params 中提供 `idempotencyKey`（例如：`send`、`poll`、`agent`、`chat.send`）。
- `agent` 接受可选的 `internalEvents` 用于运行时生成的编排上下文（例如 subagent/cron 任务完成切换）；将此视为内部 API 表面。

## <a id="live-schema-json"></a> 实时 schema JSON

生成的 JSON Schema 是构建产物，不会提交到仓库。在包发布期间，当前的 beta schema 可在以下位置获取：

- [`protocol.schema.json`](https://unpkg.com/@openclaw/gateway-protocol@beta/protocol.schema.json)

## <a id="when-you-change-schemas"></a> 当你更改 schema 时

1. 更新所属 `packages/gateway-protocol/src/schema/*.ts` 模块中的 TypeBox 架构。检查 `schema-modules.ts` 是否导出了新模块，检查其自动 `*Schema` 成员资格，并根据需要更新助手排除或现有补充所有者映射。
2. 在 `src/gateway/server-methods-list.ts` 中注册该 method/event。
3. 当新的 RPC 需要 operator 或 node scope 分类时，更新 `src/gateway/method-scopes.ts`。
4. 运行 `pnpm protocol:check`。
5. 提交重新生成的 Swift models。

## <a id="related"></a> 相关内容

- [富输出协议](/reference/rich-output-protocol)
- [RPC 适配器](/reference/rpc)
