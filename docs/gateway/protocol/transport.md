---
summary: "网关 WS 传输：包、帧形状、限制和 WebRTC 通话控制"
read_when:
  - "选择要安装的网关协议或客户端包"
  - "调整框架大小、有效负载限制或压缩行为"
  - "实现网关控制的WebRTC Talk"
title: "网关协议传输"
sidebarTitle: "运输和装框"
doc-schema-version: 1
---

在任何方法调用之前，线路是什么样的：已发布的包、框架形状、有效负载限制和网关控制的 WebRTC Talk 合约。

## <a id="npm-packages"></a> npm 软件包

按照 [ 安装软件包 ](/gateway/clients#install-the-packages) 以获得经过验证的稳定版本、确切版本命令和兼容性指南。软件包发行版与有线协议版本和根 `openclaw` CLI 发行版是分开的。

- [`@openclaw/gateway-protocol`](https://www.npmjs.com/package/@openclaw/gateway-protocol) 发布模式、验证器、TypeScript 类型、轻量级框架和错误帮助程序以及版本常量。其 tarball 包含生成的 [`protocol.schema.json`](https://unpkg.com/@openclaw/gateway-protocol@2026.8.1/protocol.schema.json) 机器可读合约作为可下载文件，而不是导出的导入子路径。
- [`@openclaw/gateway-client`](https://www.npmjs.com/package/@openclaw/gateway-client) 发布参考 Node 客户端，以及浏览器安全入口 `@openclaw/gateway-client/browser`。

有关应用程序生命周期指南，请参阅 [构建网关客户端](/gateway/clients)。对于将网关作为子进程进行监管的应用程序，请参阅 [Embedding OpenClaw](/gateway/embedding)。

## <a id="transport-and-framing"></a> 传输与帧

- WebSocket、文本帧、JSON 载荷。
- 第一帧**必须**是 `connect` 请求。
- 默认预算允许每个已解析客户端 IP 有 128 个未完成的未经身份验证的连接。成功的身份验证或关闭会释放该插槽。有关共享 NAT 行为和环境覆盖，请参阅 [ 预身份验证连接限制 ](/gateway/security/rate-limiting#unauthenticated-websocket-connections)。
- 连接建立前的帧上限为 64 KiB（`MAX_PREAUTH_PAYLOAD_BYTES`）。握手完成后，遵循 `hello-ok.policy.maxPayload` 和 `hello-ok.policy.maxBufferedBytes`。启用诊断后，超大的入站帧和缓慢的出站缓冲区会在网关关闭或丢弃帧之前发出 `payload.large` 事件。这些事件包含 `surface`、字节大小、限制和安全原因代码，绝不包含消息正文、附件内容、原始帧字节、令牌、Cookie 或密钥。
- 网关不协商`permessage-deflate`。启用扩展后，浏览器甚至可以压缩很小的请求；然后，串行解压缩会在处理程序调度之前延迟繁忙事件循环后面的每个请求。未压缩的帧保留了响应请求突发，但代价是大量历史记录和名册需要更多​​带宽。有效负载限制不变。

帧结构：

- 请求：`{type:"req", id, method, params, traceparent?, expectedProfileId?}`
- 响应：`{type:"res", id, ok, payload|error}`
- 事件：`{type:"event", event, payload, seq?, stateVersion?, recipientProfileId?}`

处理程序失败会为受影响的请求返回类型化的 `UNAVAILABLE` 响应，并保持健康的套接字打开。这包括连接准备失败；连接失败的客户端在使用该连接作为已建立的会话之前仍必须完成成功的握手。即使 hello 快照失败，已承认的操作员连接也可以继续为恢复 RPC 提供服务。记录 hello 传递后的失败，而不发送第二个连接响应。格式错误的 JSON 关闭，代码为 `1007`，原因为 `invalid JSON`；握手和身份验证策略违规使用其显式策略关闭代码和原因。失败的 hello 传输写入以 `1011` 关闭，原因为 `gateway hello delivery failed`。

实时文本在初始收件人快照之后使用附加增量。 `chat.history` 字段 `inFlightRun.text` 仅恢复当前运行的非持久辅助尾部。无声回复抑制使用完整的可用源；尾巴保持现有指令和媒体正常化，而不会再次被归类为无声回复。如果上限驱逐了源上下文，则保留的尾部文本保守地保持可见。当所有权未知时，恢复由实时缓冲区上限逐出的文本的累积快照或替换可能会重新显示已提交的文本，从而保留未保存的输出。当持久历史记录或键控评论项目获得实时文本的所有权时，网关会在后续追加增量之前发送现有的 `replace: true` 帧。最终结果快照将其完整结果保留在 `message.content` 中。支持缓冲区的终端还可以提供现有的 `message.openclawDisplayContent` 投影：最终确定用于显示的相同非持久尾部，包括显式空的尾部和任何 Canvas 块。 Control UI 在存储实时视图之前应用该投影；交付消费者保留完整的内容。外部事件序列间隙意味着客户端可能丢失了该基线的一部分：在应用更多增量之前退出连接并重新连接。如果显示间隙的帧是 `chat` 最终、中止或错误事件，请在间隙回调退出连接之前提供其权威的终端结果并提供完整的快照。即使不再有实时文本可重播，这也可以让已完成的运行稳定下来。重新连接后续订会话订阅；网关为每个观察到的运行发送带有下一个文本帧的完整快照。本地运行的有效负载序列可以跳过数字，因为文本是有节奏和合并的；它们不是外部连接顺序。

具有 `stream: "item"` 和 `data.kind: "preamble"` 的规范 `agent` 事件包括可选的 `preamble` 元数据。当该项目替换实时预览时，`preamble.retainedText` 提供制作者的剩余答案投影，包括当没有剩余答案前缀时的空字符串。空的 `preamble` 对象意味着此事件不包含新的退休预测。早期的预览信用仍然可以覆盖后来的项目 ID 和完成回显。仅附加客户端可以保留他们已经交付的预览，在这些身份之间保留其信用，并重新确定其最终答案状态。聊天和原始助手框架是独立调整的；它们的到达顺序和有效负载序列号不是重分类标识。较老的客户端可以忽略此附加元数据。 ACP 注释协调需要更新的网关和网桥。

退休使用助理出现身份，从不文本前缀匹配。生产者将实时事件与提交的转录本幂等性密钥或主机的确切源收据相关联。保留仍在流传输的项目的一部分的本机harness保留其文本合并 `itemId`，并使用 `occurrenceId` 单独标识每个捕获的间隔。未识别的文本保留在实时尾部中，直到获得带有身份的提交或运行终止；仅靠同等持久的文字无法隐藏它。

在多个视图之间共享一个连接的客户端必须与其本地流所有者保持重建。在线路快照传递到另一个视图后，新的本地侦听器可能会加入。从该所有者的当前状态为其播种，或提供重建的本地快照，并在其连接或运行退出时清除该状态。持久历史本身并不是有序的实时文本基线。

身份验证后，客户端可以在每个请求帧中包含 W3C `traceparent` 字符串。网关会将有效值作为该请求的子追踪上下文继续传递。缺失或语法格式错误的值（在 128 个字符的字段限制内）会保持默认的新请求追踪，并且不会导致 RPC 失败；更长的值会使请求帧无效。初始的 `connect` 请求不会为后续帧建立追踪上下文。在长连接上，为每个逻辑请求使用单独的 `traceparent`；不要将 WebSocket 本身视为一条追踪。

响应错误使用 `{ code, message, details?, retryable?, retryAfterMs? }`。经过身份验证的操作员请求共享用于启动 RPC 处理程序的有界队列。普通请求具有聚合等待限制和每个连接等待限制，因此并发 Control UI 设置可以排队，而无需为一个连接提供整个请求限额。聚合序列化字节限制仍然适用。没有批准重播的小型 `sessions.messages.subscribe` 请求和 `sessions.messages.unsubscribe` 请求具有单独的有界等待容量，包括每个连接的限制。所有请求共享相同的收益预算。名册订阅、目录读取和带有批准重播的消息订阅共享四个准备槽。插槽保持占用状态，直到其请求解决，并且每次启动都会让出就绪套接字 I/O. 当符合条件的请求启动时，等待准备插槽的请求将保留在有界队列中：`chat.history` 和 `sessions.list` 读取可以通过等待准备，其他连接上的普通请求也可以。其他启动保留每个连接内的 FIFO 顺序，包括订阅及其后来的取消订阅请求。 WebSocket 握手绕过请求队列，因此重新连接选项卡无法在其他客户端握手之前启动无限重放波。当等待容量耗尽时，网关在方法运行之前返回可重试的`UNAVAILABLE`；在请求的预算范围内重试。 30秒后开始仍然等待，还返回可重试的`UNAVAILABLE`，带有`details.reason: "request-start-timeout"`。当事件循环下次可以取得进展时，截止时间就会运行；它不会中断已经启动的处理程序。网关 RPC 队列等待诊断包括整个等待，包括准备容量和超时启动。启动的请求会同时完成，因此响应可能会无序到达。

在协作挂起期间，身份读取 （`agent.identity.get`） 在共享 browser/CLI 客户端中等待阶段为 `accepting` 的 `gateway.suspension`。具有 `details.reason: "gateway-suspending"` 的可重试 `UNAVAILABLE` 也会暂停读取，如果错过恢复事件，则使用 `retryAfterMs`（60 秒）作为后备。原来的请求截止日期和取消仍然适用。断开连接通常会解决挂起的读取并使用现有的重新连接退避。此身份读取策略既不会暂停也不会重放写入。

普通的 UI/SDK 请求可能会比套接字断开连接更长久，但无法在即将退休的网关实例中启动处理程序。关闭会隔离新的请求条目，并在释放其运行时之前加入挂起的处理程序加载和授权。已经启动的方法保留它们自己的关闭行为； shutdown 不会等待每个 RPC 完成。在节点清理期间，确切的待处理节点进度和结果回复仍然可用，直到传输关闭密封条目。

客户应在 `code` 和 `details.code` 上分支； `message` 仍然是人类可读的，并且可以更改，除非兼容性说明另有说明。方法级授权失败使用具有结构化缺失范围详细信息的顶级 `code: "FORBIDDEN"`：

- 缺失范围：`{ code: "MISSING_SCOPE", missingScope, requiredScopes }`。 `requiredScopes` 是请求操作的完整已知范围集合。 为兼容旧客户端，保留旧版 `missing scope: <scope>` 消息。

客户端应首先读取 `details`，仅将旧版消息作为兼容性回退。`readMissingScopeError` 和 `readMissingScopeErrorDetails` 从 `@openclaw/gateway-protocol/gateway-error-details` 导出；浏览器安全的网关客户端从 `@openclaw/gateway-client/browser` 重新导出它们。

架构从 `@openclaw/gateway-protocol/schema` 导出为 `GatewayErrorDetailsSchema`、`MissingScopeErrorDetailsSchema`。 HTTP 范围故障镜像 `error.details` 下的 `MISSING_SCOPE` 对象，并使用 HTTP 状态 `403`。

产生副作用的方法需要幂等键（请参阅架构）。

### <a id="profile-binding"></a> 配置文件绑定

仅当 `hello-ok.features.capabilities` 包含 `profile-binding-v1` 时才使用配置文件绑定。当功能不存在时，需要此合同的客户端必须将其报告为不可用，而不是默默地发送未绑定的操作。省略 `expectedProfileId` 的请求保留现有行为。

`expectedProfileId` 是经过身份验证的请求帧上的可选不透明字符串，长度为 1 到 128 个字符。网关将其与经过身份验证的主体的当前主要配置文件 ID 进行精确比较。它不会根据预期值修剪、折叠大小写或遵循合并别名。从`users.self`中获取ID；网关 URL、帐户标签、代理 ID 或会话密钥不是配置文件 ID。缺少经过身份验证的配置文件无法满足先决条件。

通告该功能的服务器在返回响应有效负载之前检查 RPC 条目的先决条件。提交时重新验证是特定于方法的；该功能不保证任意方法或插件内的原子性。异步工作之后的条目检查本身并不是提交保证。

结构化错误将 `error.details.reason` 设置为 `EXPECTED_PROFILE_MISMATCH`，并在 `error.details.execution` 中进行每次尝试分类：

- `not_started`：此尝试未启动任何执行。
- `may_have_executed`：该方法可能在检测到不匹配之前已经运行；该错误不是回滚的证据。

这两种分类都不会消除早期尝试的不确定性，也不会覆盖已知的确认 （ACK）。在重试不确定的工作之前，保留原始幂等性密钥并协调早期结果。普通套接字断开连接不会取消已接受的工作。

在经过身份验证的运营商广播中，可选的 `recipientProfileId` 在发布时标识接收者的主要配置文件。它是每个接收者的框架事实，而不是事件的起源、运行所有者身份或授权授予。现有的活动权限和订阅仍然控制着交付。将消费者绑定到其物理网关连接和选定的配置文件；如果收件人字段丢失或不同，请停止将事件应用于该绑定视图或操作并显示绑定失败。

本合同不涵盖预身份验证事件、节点事件传递、APN 通知或进程内发布。它不会撤销提供商直接媒体或已颁发的 WebRTC 凭证，也不承诺立即撤销保留的会话。

## <a id="connection-keepalives"></a> 连接保持活动

经过身份验证的控制连接使用 WebSocket ping/pong keepalive。这些与 [ 预定的代理心跳 ](/gateway/heartbeat) 是分开的；禁用代理心跳不会禁用连接监控。

排队在传出数据后面的 ping 受传输不活动状态的控制，包括部分写入进度和传入流量。一旦写入完成，对等方将获得完整的 25 秒 pong 窗口；不相关的传入消息不会扩展该窗口。定期检查会关闭过期的连接并释放其所有者。传输不活动不是独立的只写截止时间：发送流量的对等方可以保持排队的写入活动。现有的慢速消费者缓冲区限制仍然适用。流传输保留其流所有者生命周期策略。

## <a id="gateway-controlled-webrtc-talk"></a> Gateway 控制的 WebRTC 对话

`talk.client.create` 接受附加功能 `gateway-control-v1`。发布的browser/Gateway-owned WebRTC路由首先尝试OAuth，然后回退到平台API-key身份验证。直接后端套接字和未列出或私有实时路由需要平台 API-key 身份验证。成功结果包括 `clientControl: { owner: "gateway" }`、`clientSecret` 中的 60 秒一次性网关经纪代币以及相关的 `offerUrl: "/plugins/openai/realtime/calls"`。

客户端仅向该路由发送 `application/sdp`，并携带 broker token。客户端不得创建 provider control data channel。Gateway 会创建通话，在返回 answer SDP 之前附加 provider sideband，并负责工具、 转录、引导、取消和关闭生命周期。省略该能力的客户端将保留现有的浏览器会话行为。无法提供所请求所有者的 Gateway 或已配置的身份验证路径将返回 `UNAVAILABLE`；它绝不会将请求降级为由客户端拥有的控制。

如果网关连接丢失或当前 `voiceSessionId` 的 `talk.event` 包含 `talkEvent.type: "session.closed"`，则客户端必须关闭其本地媒体对等点。忽略其他调用的终端事件；单独的可恢复 `session.error` 并不是关闭通知。
