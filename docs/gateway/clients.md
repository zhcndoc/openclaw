---
summary: "为网关WebSocket协议构建第三方运营商或WebChat客户端"
read_when:
  - "在 OpenClaw 存储库之外构建操作员、仪表板或 WebChat 客户端"
  - "实现 Gateway 重连、历史记录、审批或设备配对"
  - "为新的 Gateway wire 版本更新第三方客户端"
title: "构建 Gateway 客户端"
doc-schema-version: 1
---

使用已发布的 Gateway 软件包来构建操作端仪表板、WebChat 客户端及其他第三方应用。本指南介绍围绕 wire 合约的客户端生命周期：身份验证、能力、重连恢复、历史记录、订阅和版本升级。

有关帧形状、握手、错误和完整方法表面，请阅读 [ 网关协议规范 ](/gateway/protocol)。

## <a id="install-the-packages"></a> 安装软件包

安装经过验证的稳定版本 `2026.8.1`，并具有准确的版本引脚：

```bash
npm install --save-exact @openclaw/gateway-client@2026.8.1 @openclaw/gateway-protocol@2026.8.1
```

如果现有的锁定文件仍将任一包固定到保留的 `0.0.0` 工件，请重新运行上面的命令以替换它。这些保留的工件没有可运行的入口点或 TypeScript 声明。

软件包版本遵循 OpenClaw 发行系列，并且与有线协议版本分开。 `2026.8.1`封装出口线材版本`4`；这并不能保证与每个网关版本的兼容性。根 `openclaw` CLI 有自己的软件包版本和 dist 标签。一起固定并测试客户端和网关版本，并在升级之前检查 [ 线路版本规则](/gateway/clients#track-protocol-versions)。 `2026.8.1` 客户端引脚协议封装与 `2026.8.1` 完全相同。

- [`@openclaw/gateway-protocol`](https://www.npmjs.com/package/@openclaw/gateway-protocol) 提供模式、运行时验证器、TypeScript 类型、客户端身份和功能注册表、结构化错误读取器和协议版本常量。其 npm tarball 还包含生成的 [`protocol.schema.json`](https://unpkg.com/@openclaw/gateway-protocol@2026.8.1/protocol.schema.json) 机器可读合约。将其下载为文件；它不是导出的包导入子路径。
- [`@openclaw/gateway-client`](https://www.npmjs.com/package/@openclaw/gateway-client) 是参考连接实现。对于 Node 客户端，请导入包根路径；对于浏览器安全的协议、设备认证和重新连接辅助工具，请导入 `@openclaw/gateway-client/browser`。

这些软件包版本声明为 Node.js `>=22.19.0`。 Node 条目包括 `ws` 传输；设备身份、签名和设备令牌存储通过 `GatewayClientHostDeps` 仍由主机拥有。浏览器主机提供 WebSocket 适配器以及设备标识和设备令牌的持久存储和签名回调。

## <a id="choose-scopes-and-pair-the-device"></a> 选择作用域并配对设备

完整的交互式聊天客户端如果还要呈现审批提示，应请求 `role: "operator"` 以及以下作用域：

| 范围                | 用途                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `operator.read`      | `chat.history`、`sessions.list`、`sessions.subscribe`、模型状态以及只读事件 |
| `operator.write`     | `chat.send` 和普通会话变更                                                |
| `operator.approvals` | 列出、显示和处理 exec 或插件审批                               |

添加`operator.questions`仅当客户处理交互式问题时，`operator.pairing`仅当它管理配对设备或节点时，并且`operator.admin`仅用于行政操作，例如`config.patch`。这[运算符作用域参考](/gateway/operator-scopes)定义完整的方法和批准时间规则。

不要通过手动编辑 `openclaw.json` 来创建每个客户端的 bearer token。使用 `openclaw configure --section gateway` 或 `openclaw onboard --gateway-auth ...` 选项配置 Gateway 的共享引导身份验证，然后让设备配对生成客户端 token：

1. 在客户端中持久化一个 Ed25519 设备身份。
2. 等待 `connect.challenge`，使用其 `ts` 作为设备证明的 `signedAt`，对绑定挑战的设备载荷进行签名，并发送 `connect`，其中包含请求的 operator 角色、作用域，以及用于引导身份验证的共享 Gateway token 或密码。收到的 WebSocket 挑战如果没有非负整数 `ts`，则无效。明确支持早于 `connect.challenge` 的 Gateway 的客户端，只能在其无挑战路径上使用本地时间。
3. 如果 Gateway 返回结构化的 `PAIRING_REQUIRED` 详细信息，则显示请求 ID，并根据 `error.details.recommendedNextStep` 暂停或重试。
4. 在 Gateway 主机上，使用 `openclaw devices list` 查看请求，然后使用 `openclaw devices approve <requestId>` 批准该确切的当前请求。
5. 重新连接，并将 `hello-ok.auth.deviceToken` 与协商出的角色和作用域一同持久化。后续连接使用该设备 token。

范围或角色升级会创建新的待处理配对请求。代币轮换不能扩大已批准的配对合约。有关批准、轮换和撤销命令，请参阅 [ 设备 CLI](/cli/devices)。

## <a id="advertise-client-capabilities"></a> 广告客户端能力

`connect.params.caps` 描述客户端能够使用的可选行为。 它不会授予授权。请从 `GATEWAY_CLIENT_CAPS` 导入名称，而不是重复使用字符串字面量：

```ts
import { GATEWAY_CLIENT_CAPS } from "@openclaw/gateway-protocol/client-info";

const caps = [GATEWAY_CLIENT_CAPS.TOOL_EVENTS];
```

当前注册表包含`agent-kind`、`approvals`、`exec-approvals`、`inline-widgets`、`plugin-approvals`、`run-tool-bindings`、`session-scoped-events`、`task-suggestions`、`terminal-offset-seq`、 `tool-events`、`ui-commands` 和 `usage-refreshing`。仅公布客户端实际实现的功能。

`usage-refreshing` 允许冷 `usage.status` 请求立即返回 `refreshing: true` 和空的提供商列表。广播它的客户端必须保持有效负载冷缓存并在短期有限的时间表内重新获取。其他客户端保留阻塞冷读。

<Warning>
`tool-events` 控制实时工具执行流。网关仅将声明了此能力的连接注册为某次运行结构化工具事件的接收方。没有此能力时，连接不会收到实时工具事件，且握手不会报告错误。
</Warning>

能力控制的代理工具是同一声明的另一种用途。如果某个代理工具需要客户端能力，除非发起请求的客户端声明了所有必需的能力，否则网关会省略该工具。

## <a id="validate-attachments-before-sending"></a> 发送前验证附件

附件限制可由运营方调整，因此不要将其硬编码。读取 `hello-ok.policy.attachments`，并在上传前进行本地验证：

```ts
const attachments = hello.policy.attachments;
if (attachments) {
  const ceiling = isImage ? attachments.maxImageBytes : attachments.maxBytes;
  if (file.byteLength > ceiling) rejectLocally();
}
```

这两个值都是按单个附件计算的上限。仍需检查序列化后的请求是否符合 `policy.maxPayload`：附件会以 base64 形式传输，因此接近 `maxBytes` 的文件可能单独就超过帧大小限制。较旧的网关会省略 `policy.attachments`；如果该字段不存在，则发送请求并处理服务器返回的结果。 由于接受的 MIME 类型和每条消息的处理方式取决于入口点及最终解析出的模型， 因此不会对外公布。网关可以返回带类型的拒绝结果，而仅支持文本的模型运行在达到其额外卸载上限后，可能会省略附加图片，但仍能完成请求。这些值是连接建立时的快照，因此每次重新连接时都要重新读取。

## <a id="recover-state-after-reconnect"></a> 重连后恢复状态

将每次成功重连视为基于持久化历史和当前内存运行状态的新投影：

1. 使用您的列表参数重新建立 `sessions.subscribe`，以在同一响应中接收当前名册，如下面的 [](/gateway/clients#subscribe-instead-of-polling-usage) 中所述。同时重新建立所选会话的 `sessions.messages.subscribe` 订阅。
2. 为选定的 `sessionKey` 调用 `chat.history`，并用返回的 `messages` 投影替换本地保留的行。
3. 如果存在 `inFlightRun`，则采用其 `runId`、缓冲的 `text` 和可选的 `plan`。即使 `text` 为空，也要采用该运行。
4. 将 `sessionInfo.hasActiveRun` 视为聚合直接会话活动。 `activeRunIds`（如果存在）是完整的精确活动集；因此，空数组证明会话空闲。当 `hasActiveRun` 为 true 并且省略 `activeRunIds` 时，另一个运行时所有者处于活动状态，但其确切的运行标识不可用。在增量合并事件中，省略意味着没有变化，`null` 是仅事件逻辑删除，可将缓存的确切 ID 清除为不可用，并且阵列替换缓存（包括用于证明空闲的 `[]`）。仅关联客户端在本地拥有的或从请求、历史响应或事件接收到的运行 ID，并且切勿选择第一个列表条目作为所有者。
5. 仅当观察者摘要的确切 `runId` 出现在 `activeRunIds` 中时才显示观察者标题或运行检查器链接。单独的聚集活性不会产生保留的消化电流。
6. 协调 `payload.runId` 和 `payload.seq` 的后续 `agent` 事件。为每次运行独立维护最高可接受的序列，忽略已经看到的或较低的序列，并将前向间隙视为重新加载权威历史记录的原因。

### <a id="active-run-cache-matrix"></a> 主动运行缓存矩阵

应用`activeRunIds`之前对来源进行分类；同样的遗漏在完整快照和增量增量中具有不同的含义。

| 客户端缓存             | 读取路径                                                  | 班级    | 所需行为                                                                                  |
| ------------------------ | ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| 网络会话名册       | `sessions.list`，重新连接水合                       | 快照 | 更换行；遗漏会将缓存的确切 ID 清除为不可用。                                  |
| 网络选择的会话     | `chat.history.sessionInfo`                                 | 快照 | 替换行投影；省略会清除缓存的确切 ID。                                      |
| 网络会话事件       | `sessions.changed`、`session.message`、生命周期快照 | 差值    | 遗漏是惰性的； `null` 清零；数组替换。                                               |
| Android 会话名册   | `sessions.list`，重新连接水合                       | 快照 | 替换列表行；省略会清除缓存的确切 ID。                                           |
| Android 选定的会话 | `chat.history.sessionInfo`，重连恢复             | 快照 | 即使其他部分历史字段合并，也替换 `activeRunIds`。                              |
| Android 会话事件   | `sessions.changed`、`session.message`、生命周期快照 | 差值    | 现场控制更换； `null` 清零，遗漏惰性。                          |
| Apple 会话名册     | `sessions.list`，重新连接水合                       | 快照 | 替换活动行；离线缓存会删除瞬时的活动运行事实。                            |
| Apple 选定的会话   | `chat.history.sessionInfo`，重连恢复             | 快照 | 替换当前行及其 run-ID 投影；省略则清除两者。                      |
| Apple 会话事件     | `sessions.changed`、`session.message`、生命周期快照 | 差值    | 通过解码保留现场存在感；遗漏是惰性的，`null` 清除，并由数组替换。 |

外部事件框架还有一个可选的 `seq`，它对当前 WebSocket 连接上的事件进行排序。它会使用新连接进行重置。 `agent` 事件有效负载内的 `seq` 是按运行的生命周期、助手、计划、工具和其他流事件的运行和命令分配的。

## <a id="render-generated-image-artifacts"></a> Render 生成的图像伪影

助理生成的图像作为标准 `type: "image"` 内容块到达。托管块包括稳定的 `artifactId`、网关相关的 `url`、MIME 类型、尺寸、大小和可访问的替代文本。将该引用保留在成绩单缓存中；不要保留下载的字节或临时下载 URL。

通过经过身份验证的 WebSocket 连接解析图像：

1. 使用当前的 `sessionKey`、可选的 `agentId` 和块的 `artifactId` 来调用 `artifacts.download`。
2. 使用`expiresAt`之前返回的短命`url`。 URL 的范围仅限于该精确的转录支持工件，并且不包含可重用的网关或设备凭证。
3. 使用与活动连接相同的 TLS 引脚和反向代理标头从网关源获取它。将响应验证为图像，并强制执行 12 MiB 源限制以及有界解码缩略图。
4. 如果 URL 过期，再次调用一次 `artifacts.download`。重新连接或路由变更会取消旧的加载操作，而不是将其重新指向另一个 Gateway。

不含 `artifactId` 的旧版图像块仍可由现有 Control UI 客户端显示，但原生客户端应显示易于阅读的附件回退内容，而不是转发共享的所有者凭据。

## <a id="download-inline-artifacts-over-https"></a> 通过 HTTPS 下载内联工件

对于嵌入在转录本中的工件，`artifacts.download` 通常通过现有连接返回 `encoding: "base64"` 和 `data`。可以到达网关的 HTTPS 路由的客户端可以通过 `transport: "http"` 来接收网关相关的 `url` 和 `expiresAt`，然后使用 `GET` 获取原始字节。该路由还支持 `HEAD` 和单字节范围。托管媒体保留其现有的 URL 下载路径。

将 `?variant=thumbnail` 附加到内联 HTTPS 下载 URL 以获得尽力而为的 PNG 预览，其最长边限制为 1200 像素，无需升级。仅识别出的静态 PNG、JPEG 和 WebP 图像符合条件。 GIF、APNG、动画 WebP、其他格式、未知变体和编码失败会保留原始字节，不小于源的 PNG 预览也是如此。检查响应 MIME 类型：即使工件使用其他图像格式，缩略图也是 `image/png`。省略全尺寸下载的查询； RPC 架构和 WebSocket base64 响应不变。

使用活动网关的 HTTPS 源和配置的 Control UI 基本路径。 TLS 可以在网关或其反向代理处终止；代理必须转发 `/api/artifacts/download/` 以及 WebSocket 升级。单独的 `wss://` 端点无法建立 HTTP 可达性。 WebSocket-only 客户应省略 `transport`； HTTP 路由不可用的客户端可以在没有 `transport` 的情况下重复相同的 RPC，从而保留每个会话、运行、任务和角色过滤器。

内联下载链接在五分钟后过期，属于发布的实时连接和确切的工件。读取重新检查访问权限、转录成员资格、会话生成和内容身份。过期、断开连接、撤销或替换会使链接不可用。重新连接并请求重新下载，而不是保留跨连接的链接。这些链接不包含可重复使用的网关凭据，并且响应会禁用缓存和活动文档执行。

当从活动网关的 HTTPS 源提供服务时，Control UI 选择图像和文本预览。如果 HTTP 获取失败，它将通过同一连接上的内联 RPC 重试。其他连接保留其现有的传输行为。二进制工件预览保留下载操作而不是过期链接。每次点击都请求新的下载权限；更改连接或关闭预览会取消正在进行的下载。

## <a id="use-history-metadata-and-stable-anchors"></a> 使用历史元数据和稳定锚点

`chat.history` 返回的行可能带有 `__openclaw` 元数据封装：

- `id` 是转录条目的标识。将其用于带锚点的历史记录请求， 但不要将其作为唯一的显示行键。
- `seq` 是正数转录记录序列号。一条存储记录可能会映射为多个显示行， 因此应将具有相同 `id` 和序列号的同级行放在一起。
- `kind` 用于标识合成行。压缩边界使用 `kind: "compaction"`，并且当匹配的检查点记录了这些指标时，可能会包含 `tokensBefore` 和 `tokensAfter`。

  会话重置边界使用 `kind: "reset"`。它没有检查点令牌指标。

使用响应的 `hasMore` 和 `nextOffset` 值向后翻页。数字偏移量描述当前的转录本投影，因此不要将它们作为重置或压缩期间的长期书签保留。改为坚持 `__openclaw.id`。要恢复已知行，请使用 `messageId` 和返回该行的 `sessionId` 调用 `chat.history`。网关可以从重置存档历史记录中解析该锚点；锚定响应有意省略数字寻呼元数据。

## <a id="subscribe-instead-of-polling-usage"></a> 订阅而不是轮询用量

安装 `sessions.changed` 侦听器，然后使用 `sessions.list` 参数（例如 `{ limit: 60, ownerFirst: true }`）在每次连接时调用一次 `sessions.subscribe`。响应是 `{ subscribed: true, list }`，其中 `list` 是正常的 `SessionsListResult` 快照。传递 `{}` 会激活订阅，但仅返回 `{ subscribed: true }`，没有列表。

网关在读取快照之前激活订阅。因此，事件可以在响应之前到达。跟踪引导期间收到的更改，并在需要时使用 `sessions.list` 刷新来跟踪响应；不要让快照默默地覆盖较新的事件。每次重新连接后重新建立此流。

`ownerFirst: true` 将最多 60 个由经过身份验证的查看者拥有的匹配会话添加到正常首页，从而删除该响应中的重复项。仅当 `offset` 为零或省略时才适用。网关从经过身份验证的连接中获取查看者身份，而不是客户端提供的身份。共享页面的分页元数据未更改，因此在加载另一个页面时使用 `nextOffset`，而不是返回的行数，并通过会话密钥合并行。请参阅 [ 会话列表 bootstrap](/gateway/protocol/rpc-methods#session-list-bootstrap)。

使用代理、会话密钥和会话 ID 将后续键控 `sessions.changed` 事件从嵌套的 `session` 行合并在一起，以避免将旧的生命周期应用于其替换。为接收连接提供快照，并携带当前行元数据、使用情况和活动​​运行状态。

将快照应用于本地现有名册成员。当行丢失或通知是广泛的无键失效时，刷新 `sessions.list`。删除事件保留已删除的会话 ID 并且不携带替换行。同一会话的别名的通知共享发布顺序。快速替换可以合并中间通知；精简更新后会进行广泛的失效，以便客户刷新权威名册。当无法准备行元数据时，会发送相同的刷新通知。不要轮询 `usage.cost` 或 `sessions.usage` 以使实时会话列表保持最新；保留这些方法用于按需汇总或详细报告。

## <a id="backfill-exec-approvals"></a> 回填执行审批

具有 `operator.approvals` 的客户端应在 `hello-ok` 完成后立即安装其事件监听器，然后调用 `exec.approval.list`，以回填连接建立之前产生的请求。根据审批 ID 对列表以及实时的 `exec.approval.requested` / `exec.approval.resolved` 事件进行协调，以确保在列表请求期间发生的状态转换既不会丢失，也不会被重新恢复。

## <a id="track-protocol-versions"></a> 跟踪协议版本

当前的线材版本是`4`。一般运营商和WebChat客户端必须与`minProtocol: 4`和`maxProtocol: 4`协商确切的当前版本。只有经过身份验证的节点客户端和轻量级检查才有 N-1 接受窗口，当前协议为 `3` 到 `4`。

协议变更首先采用增量方式。`protocol.schema.json` 包含 `since` 发布版本元数据以及核心方法所需的作用域元数据，但线协议版本的提升对于第三方客户端而言仍然是明确的破坏性事件。固定你所测试的软件包版本，在协议版本发生变化时同时升级客户端和 Gateway，并在每次升级前查阅 [OpenClaw 更新日志](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)。

## <a id="related"></a> 相关内容

- [网关协议](/gateway/protocol)
- [嵌入 OpenClaw](/gateway/embedding)
- [Gateway RPC 参考](/reference/rpc)
- [外部应用程序的网关集成](/gateway/external-apps)
