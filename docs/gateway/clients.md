---
summary: "为 Gateway WebSocket 协议构建第三方操作端或 WebChat 客户端"
read_when:
  - "在 OpenClaw 仓库之外构建操作端、仪表板或 WebChat 客户端"
  - "实现 Gateway 重连、历史记录、审批或设备配对"
  - "为新的 Gateway wire 版本更新第三方客户端"
title: "构建 Gateway 客户端"
---

使用已发布的 Gateway 软件包来构建操作端仪表板、WebChat 客户端及其他第三方应用。本指南介绍围绕 wire 合约的客户端生命周期：身份验证、能力、重连恢复、历史记录、订阅和版本升级。

有关帧结构、握手、错误以及完整的方法列表，请阅读
[Gateway 协议规范](https://docs.openclaw.ai/gateway/protocol)。

## 安装软件包

```bash
npm install @openclaw/gateway-client @openclaw/gateway-protocol
```

<Note>
这些软件包随 OpenClaw 发布版本一起提供。在首次发布阶段，直到首个包含软件包的 OpenClaw 版本发布之前，npm
可能会返回 `E404`；只有在下方的 registry 页面可以正常访问后，才安装这些软件包。
</Note>

- [`@openclaw/gateway-protocol`](https://www.npmjs.com/package/@openclaw/gateway-protocol)
  提供架构、运行时验证器、TypeScript 类型、客户端身份与能力注册表、结构化错误读取器以及协议版本常量。
  其 npm 压缩包还包含生成的
  [`protocol.schema.json`](https://unpkg.com/@openclaw/gateway-protocol@beta/protocol.schema.json)
  机器可读协议契约。
- [`@openclaw/gateway-client`](https://www.npmjs.com/package/@openclaw/gateway-client)
  是参考连接实现。对于 Node 客户端，请导入包根路径；对于浏览器安全的协议、设备认证和重新连接辅助工具，请导入
  `@openclaw/gateway-client/browser`。

Node 入口负责其 WebSocket 传输。浏览器宿主需要提供 WebSocket 适配器，以及用于设备身份和设备令牌的持久化存储与签名回调。

## 选择作用域并配对设备

完整的交互式聊天客户端如果还要呈现审批提示，应请求
`role: "operator"` 以及以下作用域：

| 作用域               | 用途                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------- |
| `operator.read`      | `chat.history`、`sessions.list`、`sessions.subscribe`、模型状态以及只读事件             |
| `operator.write`     | `chat.send` 和普通会话变更                                                              |
| `operator.approvals` | 列出、显示和处理 exec 或插件审批                                                        |

仅当客户端处理交互式问题时才添加 `operator.questions`，
仅当客户端管理已配对的设备或节点时才添加 `operator.pairing`，仅针对
`config.patch` 等管理操作添加 `operator.admin`。
[operator 作用域参考](https://docs.openclaw.ai/gateway/operator-scopes)
定义了完整的方法和审批时规则。

不要通过手动编辑 `openclaw.json` 来创建每个客户端的 bearer token。使用
`openclaw configure --section
gateway` 或 `openclaw onboard --gateway-auth ...` 选项配置
Gateway 的共享引导身份验证，然后让设备配对生成客户端 token：

1. 在客户端中持久化一个 Ed25519 设备身份。
2. 等待 `connect.challenge`，使用其 `ts` 作为设备证明的
   `signedAt`，对绑定挑战的设备载荷进行签名，并发送 `connect`，其中包含请求的
   operator 角色、作用域，以及用于引导身份验证的共享 Gateway token 或密码。收到的
   WebSocket 挑战如果没有非负整数 `ts`，则无效。明确支持早于
   `connect.challenge` 的 Gateway 的客户端，只能在其无挑战路径上使用本地时间。
3. 如果 Gateway 返回结构化的 `PAIRING_REQUIRED` 详细信息，则显示请求
   ID，并根据 `error.details.recommendedNextStep` 暂停或重试。
4. 在 Gateway 主机上，使用 `openclaw devices list` 查看请求，然后使用
   `openclaw devices approve <requestId>` 批准该确切的当前请求。
5. 重新连接，并将 `hello-ok.auth.deviceToken` 与协商出的角色和
   作用域一同持久化。后续连接使用该设备 token。

作用域或角色升级会创建新的待处理配对请求。Token 轮换无法扩大已批准的配对契约。请参阅
[Devices CLI](https://docs.openclaw.ai/cli/devices)，了解审批、轮换和
撤销命令。

## 广告客户端能力

`connect.params.caps` 描述客户端能够使用的可选行为。
它不会授予授权。请从 `GATEWAY_CLIENT_CAPS` 导入名称，而不是重复使用字符串字面量：

```ts
import { GATEWAY_CLIENT_CAPS } from "@openclaw/gateway-protocol/client-info";

const caps = [GATEWAY_CLIENT_CAPS.TOOL_EVENTS];
```

当前注册表包含 `approvals`、`exec-approvals`、`inline-widgets`、
`run-tool-bindings`、`session-scoped-events`、`plugin-approvals`、
`task-suggestions`、`terminal-offset-seq`、`tool-events` 和 `ui-commands`。
仅声明客户端实际实现的能力。

<Warning>
`tool-events` 控制实时工具执行流。网关仅将声明了此能力的连接注册为某次运行结构化工具事件的接收方。没有此能力时，连接不会收到实时工具事件，且握手不会报告错误。
</Warning>

能力控制的代理工具是同一声明的另一种用途。如果某个代理工具需要客户端能力，除非发起请求的客户端声明了所有必需的能力，否则网关会省略该工具。

## 发送前验证附件

附件限制可由运营方调整，因此不要将其硬编码。读取
`hello-ok.policy.attachments`，并在上传前进行本地验证：

```ts
const attachments = hello.policy.attachments;
if (attachments) {
  const ceiling = isImage ? attachments.maxImageBytes : attachments.maxBytes;
  if (file.byteLength > ceiling) rejectLocally();
}
```

这两个值都是按单个附件计算的上限。仍需检查序列化后的
请求是否符合 `policy.maxPayload`：附件会以 base64 形式传输，因此接近
`maxBytes` 的文件可能单独就超过帧大小限制。较旧的网关会省略
`policy.attachments`；如果该字段不存在，则发送请求并处理服务器返回的结果。
由于接受的 MIME 类型和每条消息的处理方式取决于入口点及最终解析出的模型，
因此不会对外公布。网关可以返回带类型的拒绝结果，而仅支持文本的模型运行在
达到其额外卸载上限后，可能会省略附加图片，但仍能完成请求。这些值是连接建立时的
快照，因此每次重新连接时都要重新读取。

## 重连后恢复状态

将每次成功重连视为基于持久化历史和当前内存运行状态的新投影：

1. 重新建立 `sessions.subscribe` 以及所选会话的
   `sessions.messages.subscribe` 订阅。
2. 针对所选的 `sessionKey` 调用 `chat.history`，并使用返回的
   `messages` 投影替换本地持久化行。
3. 如果存在 `inFlightRun`，则采用其 `runId`、缓冲的 `text` 和可选的
   `plan`。即使 `text` 为空，也要采用该运行。
4. 读取 `sessionInfo.hasActiveRun` 和 `sessionInfo.activeRunIds`。在判断保留的运行是否仍拥有流式 UI 时，优先依据
   `activeRunIds` 中的精确成员关系。如果 `hasActiveRun` 为 true 但没有列出的 ID，可能表示另一个活动运行时投影。
5. 根据 `payload.runId` 和 `payload.seq` 对后续的 `agent` 事件进行协调。
   为每个运行独立维护已接受的最高序列号，忽略已经见过的序列号或更低的序列号，并将向前跳跃的间隙视为重新加载权威历史的理由。

外层事件帧还包含一个可选的 `seq`，用于对当前 WebSocket 连接上的事件排序。建立新连接时，该序列号会重置。`agent` 事件负载中的 `seq` 按运行分配，用于对该运行的生命周期、助手、计划、工具及其他流事件进行排序。

## 渲染生成的图像工件

助手生成的图像以规范的 `type: "image"` 内容块形式到达。
受管理的内容块包含稳定的 `artifactId`、相对于 Gateway 的 `url`、MIME
类型、尺寸、大小以及可访问的替代文本。请将该引用保留在会话记录缓存中；不要持久化下载的字节数据或临时下载 URL。

通过经过身份验证的 WebSocket 连接解析图像：

1. 使用当前的 `sessionKey`、可选的 `agentId` 以及内容块的 `artifactId` 调用 `artifacts.download`。
2. 在 `expiresAt` 之前使用返回的短时有效 `url`。该 URL 仅限于对应的会话记录工件，不包含可重复使用的 Gateway 或设备凭据。
3. 使用与当前连接相同的 TLS 固定和反向代理标头，从 Gateway 源获取该 URL。将响应验证为图像，并限制源文件大小不超过 12 MiB，同时限制解码后的缩略图大小。
4. 如果 URL 过期，再次调用一次 `artifacts.download`。重新连接或路由变更会取消旧的加载操作，而不是将其重新指向另一个 Gateway。

不含 `artifactId` 的旧版图像块仍可由现有 Control UI 客户端显示，但原生客户端应显示易于阅读的附件回退内容，而不是转发共享的所有者凭据。

## 使用历史元数据和稳定锚点

`chat.history` 返回的行可能带有 `__openclaw` 元数据封装：

- `id` 是转录条目的标识。将其用于带锚点的历史记录请求，
  但不要将其作为唯一的显示行键。
- `seq` 是正数转录记录序列号。一条存储记录可能会映射为多个显示行，
  因此应将具有相同 `id` 和序列号的同级行放在一起。
- `kind` 用于标识合成行。压缩边界使用
  `kind: "compaction"`，并且当匹配的检查点记录了这些指标时，可能会包含
  `tokensBefore` 和 `tokensAfter`。

会话重置边界使用 `kind: "reset"`。它没有检查点令牌指标。

根据响应中的 `hasMore` 和 `nextOffset` 值向前翻页。数字偏移量描述的是当前转录投影，因此不要将其作为跨重置或压缩长期持久化的书签。请改为持久化 `__openclaw.id`。
要在已知行附近恢复，请使用返回该行的 `sessionId`，并将 `messageId` 传递给 `chat.history`。Gateway 可以从重置归档历史记录中解析该锚点；带锚点的响应会有意省略数字分页元数据。

## 订阅而不是轮询用量

使用 `sessions.list` 加载初始目录，然后为每个连接调用一次
`sessions.subscribe`。按 `sessionKey` 合并 `sessions.changed` 事件。会话变更
负载可能包含实时的 `inputTokens`、`outputTokens`、`totalTokens`、
`totalTokensFresh`、`contextTokens`、`estimatedCostUsd`、响应用量设置
以及活动运行状态。

某些变更通知仅是失效信号。如果事件中缺少视图所需的行字段，请刷新
`sessions.list`。不要轮询 `usage.cost` 或 `sessions.usage` 来保持实时会话列表
更新；将这些方法保留用于按需的聚合报告或详细报告。

## 回填执行审批

具有 `operator.approvals` 的客户端应在 `hello-ok` 完成后立即安装其事件监听器，然后调用 `exec.approval.list`，以回填连接建立之前产生的请求。根据审批 ID 对列表以及实时的
`exec.approval.requested` / `exec.approval.resolved` 事件进行协调，以确保在列表请求期间发生的状态转换既不会丢失，也不会被重新恢复。

## 跟踪协议版本

当前线协议版本为 `4`。通用操作员和 WebChat 客户端必须通过
`minProtocol: 4` 和 `maxProtocol: 4` 协商当前的确切版本。
只有经过身份验证的节点客户端和轻量级探针具有 N-1 接受窗口，目前为协议
`3` 至 `4`。

协议变更首先采用增量方式。`protocol.schema.json` 包含 `since`
发布版本元数据以及核心方法所需的作用域元数据，但线协议版本的提升对于第三方客户端而言仍然是明确的破坏性事件。固定你所测试的软件包版本，在协议版本发生变化时同时升级客户端和 Gateway，并在每次升级前查阅
[OpenClaw 更新日志](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)。

## 相关内容

- [网关协议](https://docs.openclaw.ai/gateway/protocol)
- [嵌入 OpenClaw](https://docs.openclaw.ai/gateway/embedding)
- [网关 RPC 参考](https://docs.openclaw.ai/reference/rpc)
- [面向外部应用的网关集成](https://docs.openclaw.ai/gateway/external-apps)。
