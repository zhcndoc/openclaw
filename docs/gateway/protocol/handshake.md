---
summary: "连接框架、hello-ok 有效负载、客户端功能、角色和范围"
read_when:
  - "为新客户端编写连接帧"
  - "调试被拒绝或降级的握手"
  - "选择客户应要求的角色和范围"
title: "网关协议握手"
sidebarTitle: "握手和角色"
doc-schema-version: 1
---

第一帧和返回的内容：连接请求、`hello-ok` 有效负载、辅助角色、客户端功能以及角色和范围模型。

## <a id="handshake"></a> 握手

Gateway 发送预连接挑战：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

设备认证客户端将挑战中的 `ts` 用作 `connect.params.device.signedAt`。 对于 WebSocket 挑战，`ts` 必须是非负整数。明确支持 `connect.challenge` 尚不存在的旧版 Gateway 的客户端，仅在未收到挑战时才能使用本地时间；如果收到的挑战缺少 `ts` 或其格式错误，则该挑战无效。

客户端使用 `connect` 回复：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
    "maxProtocol": 4,
    "client": {
      "id": "cli",
      "version": "1.2.3",
      "platform": "macos",
      "mode": "operator"
    },
    "role": "operator",
    "scopes": ["operator.read", "operator.write"],
    "caps": [],
    "commands": [],
    "permissions": {},
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-cli/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

Gateway 使用 `hello-ok` 响应：

默认连接截止时间为 30 秒，允许在繁忙或速度较慢的主机上完成身份验证和配置文件准备。这是一个总期限，而不是空闲超时：进度不会延长期限。客户端连接看门狗和服务器预身份验证超时共享此默认值。运营商可以使用`OPENCLAW_HANDSHAKE_TIMEOUT_MS`来覆盖服务器预算；配置具有相同预算的连接客户端。

当网关已经拥有指定的规范所有者及其本地所有者绑定时，初始连接和重新连接将重用这些配置文件事实。提交的配置文件写入更新保留的目录；创建所有者、采用缺失的名称或恢复缺失的绑定仍然使用配置文件编写器。合并或错误绑定的所有者在重新连接之前需要 `openclaw doctor --fix`。每个连接都会保留其身份验证、设备授权、角色和可见性检查。

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 4,
    "server": { "version": "…", "connId": "…" },
    "features": { "methods": ["…"], "events": ["…"] },
    "snapshot": { "…": "…" },
    "auth": {
      "role": "operator",
      "scopes": ["operator.read", "operator.write"]
    },
    "policy": {
      "maxPayload": 26214400,
      "maxBufferedBytes": 52428800,
      "tickIntervalMs": 15000,
      "attachments": { "maxBytes": 20971520, "maxImageBytes": 6291456 }
    }
  }
}
```

`server`、`features`、`snapshot`、`policy` 和 `auth` 均是 `HelloOkSchema` （`packages/gateway-protocol/src/schema/frames.ts`） 所必需的。即使没有颁发设备令牌（如上形状），`auth` 也会报告协商的角色和当前套接字的有效授权范围。 `deviceToken`（如果存在）是同一设备和角色的主要可重复使用凭证。 `controlUiUrl` 可选择通告网关配置的公共 Control UI 源和可共享链接的基本路径，独立于客户端的隧道或开发服务器地址。当 `gateway.publicOrigin` 未设置或 Control UI 禁用时，它被省略。它不包含任何凭据，也不授予任何访问权限。 `policy.attachments` 是可选的（旧网关忽略它），并在 `chat.send`、`sessions.send` 和会话创建初始回合上通告聊天附件的解码大小上限：

| 字段           | 含义                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `maxBytes`      | 单个附件可接受的最大解码后大小（`agents.defaults.mediaMaxMb`，默认 20 MB） |
| `maxImageBytes` | 单个图像可接受的最大解码后大小：`min(maxBytes, 6 MB agent-hydration cap)`         |

发送前进行验证：

1. 检查每个文件的解码后大小：图像对照 `maxImageBytes`，其他内容对照 `maxBytes`。
2. 序列化整个请求，并检查其编码后大小是否不超过 `policy.maxPayload`。 `policy.attachments` 是每个附件的上限，绝不意味着整个帧一定能够容纳该附件： 附件会以 base64 传输，因此一个 20 MB 的文件在线上传输时约为 26.7 MB， 单独就会超过默认的 25 MiB 帧上限。
3. 其他所有事项以服务器为准。可接受的 MIME 类型和每条消息的处理方式不会被主动公布， 因为它们取决于入口点、解析后的模型和载荷嗅探。Gateway 可以返回类型化拒绝； 而纯文本模型运行可能会在达到其卸载上限后省略额外图像，但仍然完成请求。
4. 每次重新连接时重新读取这些值。它们是连接时快照，因此对正在运行的 `mediaMaxMb` 编辑，只有在重新连接后才会传达到现有连接。

`pluginSurfaceUrls` 是可选的，它将插件表面名称 （e.g. `canvas`） 映射到范围内的托管 URL；它可能会过期，因此节点通过 `{ "surface": "canvas" }` 调用 `node.pluginSurface.refresh` 来获取新条目。仅当 hello 的授予范围满足 `operator.read`（包括 `operator.write` 和 `operator.admin`）时，Control UI 才使用 `plugin.surface.refresh`。 `FORBIDDEN` 响应停止当前租约的自动续订重试；重新连接会评估新的 hello 的授予。不支持已弃用的 `canvasHostUrl` / `canvasCapability` / `node.canvas.capability.refresh` 路径；使用插件表面。删除了`sessions.observer.ask`方法；使用 `sessions.companion.ask`。快照的可选 `appliedConfigHash` 是活动网关运行时接受的已解析源配置修订版。客户端可以将其与 `config.get.configRevisionHash` 进行比较，以确定较新保存的配置是否仍需要重新启动。 `config.get.hash` 是配置写入冲突防护使用的不透明创作修订版。它涵盖根文件字节以及捕获的包含文件的标识和内容。

当快照的可选 `controlUiIdentityUrl` 使用可信代理或 Tailscale 服务身份时，它会通告活动网关的 HTTPS 仪表板 URL。运营商客户端可以打开此 URL 进行个人浏览器登录，而不是转发共享设备凭据。 URL 包括 Control UI 基本路径；客户端必须使用普通的 HTTPS 信任而不是本机 TLS 引脚，并且不得向其发送本机连接令牌或密码。从每个经过身份验证的 hello 快照中重新读取它，并在该连接关闭时丢弃它。如果托管的Serve路由退出或被替换，则网关关闭收到其身份为URL且代码为`1012`的连接；重新连接以发现当前路线。

`openclaw.setup.verify` 在实时推理检查之前和之后还会检查网关的当前应用程序和重新启动状态。当保存的设置未激活、仍重新启动工作或检查期间验证的运行时发生更改时，它会返回 `{ ok: false, status: "unavailable", error }`。客户端应保留所选模型，并在应用程序或重新启动完成后重试。独立 CLI 验证仍会测试保存的配置，而不需要正在运行的网关。

当网关仍在完成启动 sidecar 时，`connect` 可以使用 `details.reason: "startup-sidecars"` 和 `retryAfterMs` 返回可重试的 `UNAVAILABLE` 错误。在连接预算范围内重试，而不是将其视为终端握手失败。

签发设备令牌时，`hello-ok.auth` 会添加该令牌：

```json validate=false
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read"]
  }
}
```

内置QR/setup-code引导程序是移动切换路径。成功的基线设置代码连接会返回一个主节点令牌以及一个有界操作员令牌：

```json validate=false
{
  "auth": {
    "deviceToken": "…",
    "role": "node",
    "scopes": [],
    "deviceTokens": [
      {
        "deviceToken": "…",
        "role": "operator",
        "scopes": ["operator.approvals", "operator.read", "operator.talk.secrets", "operator.write"]
      }
    ]
  }
}
```

此操作员切换是有目的的：足以启动移动操作员循环和本机设置，`operator.write` 满足 Talk 会话，`operator.talk.secrets` 覆盖 Talk 配置读取，但没有配对突变范围，也没有 `operator.admin`。更广泛的 pairing/admin 访问需要单独批准的配对或令牌流。仅当引导程序身份验证通过可信传输（`wss://` 或 loopback/local 配对）运行时，才保留 `hello-ok.auth.deviceTokens`。

当使用共享网关 token/password. 进行身份验证时，受信任的本地后端客户端（`client.id: "gateway-client"`、`client.mode: "backend"`）可能会在直接环回连接上省略 `device` 该路径为内部控制平面 RPC（e.g. 子代理会话更新）保留，并避免过时的 CLI/device 配对阻止本地后端工作的基线。当后端提供签名的设备身份时，该例外也适用：它不会创建配对记录，因此未配对的身份不会收到设备令牌。远程、浏览器源、节点和非后端客户端遵循正常的配对和范围升级策略。在出现任何本地后端配对异常之前，设备令牌身份验证仍会验证现有令牌的角色和范围。

### <a id="worker-role-and-closed-protocol"></a> Worker 角色与封闭协议

Gateway 拥有的启动器通过 [`openclaw worker`](/cli/worker) 启动工作进程；它不是手动注册命令。工作人员通过主 TLS 端点上的公共 `/__openclaw__/worker` WebSocket 路径或通过网关拥有的、主机密钥固定的 SSH 隧道到达的专用环回入口使用封闭协议。该路由在读取帧之前选择工作模式，因此它从不调度常规身份验证、节点事件、操作员 RPC 或插件方法。公共准入共享主要的每个客户端预认证预算和认证速率限制器；其线路错误将凭证和环境详细信息折叠为 `admission-rejected`，而可信网关诊断则保留内部原因。严格的 `connect` 验证静态散列、绑定到环境的短期凭证、捆绑散列、所有者纪元、RPC-set 版本、到期日和一个可为 null 的会话；它分别检查当前版本和功能集。成功返回最小值`worker-hello-ok`；功能协商独立于通用协议版本。帧保持在 64 KiB 以下，但协商的 `worker.inference.start` 帧可能最多为 25 MiB。关闭的白名单包含 `worker.heartbeat`、`worker.transcript.commit`、`worker.live-event`、`worker.inference.start` 和 `worker.inference.cancel`。

`worker.transcript.commit`中的助理消息可以携带直播事件的`itemId`。网关将其绑定到其生成的提交密钥，在存储之前将其删除，并仅在行提交后发布相关性。它不是提供商重播数据。这个仅限工作人员的字段在上述捆绑包、版本和功能检查所允许的确切构建之间移动。

对于身份审核的附加运行，实时转向功能可以将凭证、构建、所有者时代和放置检查记录为一张强制准入收据。收据不包含任何凭证、构建哈希、令牌、环境 ID 或会话 ID。 Worker操作行和放置状态仍然是其权威所有者；成功连接并不是操作成功的收据。

成绩单提交使用所有者纪元防护、网关拥有的会话绑定、基叶比较和交换以及持久序列重放；网关通过普通会话编写器生成记录条目和父 ID。对每个 RPC 重新检查所有权和到期时间。

### <a id="client-capabilities"></a> 客户端能力

Operator 客户端可以在 `connect.params.caps` 中公布可选能力：

- `tool-events`：接受结构化的工具生命周期事件。
- `inline-widgets`：能够渲染托管的内联 widget 工具结果。
- `ultrafast`：接受会话元数据中的显式 `"ultrafast"` 快速模式值。如果没有它，对于仅接受布尔值和 `"auto"` 的已发布本机解码器，会话响应和事件会将该值呈现为 Fast （`true`）。这是针对每个连接的演示：存储的选择和执行位于 `"ultrafast"`。升级后的客户端宣传此功能以保留显式选择；仅当不再支持这些已发布的客户端时才删除旧投影。
- `chat-only-assistant-text`：渲染来自 `chat` 的辅助文本，并省略冗余的辅助文本 `agent` 流。请参阅 [ 事件系列](/gateway/protocol/rpc-bootstrap-and-events#common-event-families)。

客户端能力描述的是已连接的客户端，而不是授权。Agent 工具可以声明所需能力； 只有当发起客户端的 `caps` 中包含每项要求时，Gateway 才会提供这些工具。由 Channel 发起的运行没有 Gateway 客户端能力，因此即使工具策略明确允许，受能力限制的工具仍然不可用。

### <a id="node-connect-example"></a> Node 连接示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 4,
    "maxProtocol": 4,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": ["camera.snap", "canvas.navigate", "screen.record", "location.get"],
    "permissions": { "camera.capture": true, "screen.record": false },
    "auth": { "token": "…" },
    "locale": "en-US",
    "userAgent": "openclaw-ios/1.2.3",
    "device": {
      "id": "device_fingerprint",
      "publicKey": "…",
      "signature": "…",
      "signedAt": 1737264000000,
      "nonce": "…"
    }
  }
}
```

节点在连接时声明能力声明：

- `caps`：高级类别，例如 `camera`、`canvas`、`screen`、 `location`、`voice`、`talk`。
- `commands`：用于 invoke 的命令允许列表。
- `permissions`：颗粒状开关（e.g. `screen.record`、`camera.capture`）。

Gateway 将这些内容视为声明，并在服务器端强制执行允许列表。

## <a id="roles-and-scopes"></a> 角色和作用域

有关完整的 operator scope 模型、审批时检查以及共享密钥语义，请参见 [Operator scopes](/gateway/operator-scopes)。

角色：

- `operator`：控制平面客户端（CLI/UI/automation）。
- `node`：能力主机（camera/screen/canvas/system.run）。
- `worker`：在专用、封闭的 worker protocol 上运行的云执行主机。

Operator scopes（`src/gateway/operator-scopes.ts`），完整的封闭集合：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.questions`
- `operator.pairing`
- `operator.talk`
- `operator.talk.secrets`

为兼容现有客户端，`operator.write` 仍然满足 `operator.talk`。语音设备设置可以签发更窄的 Talk 授权，而无需常规的 Gateway 写入权限。

`talk.config` 搭配 `includeSecrets: true` 时，需要 `operator.talk.secrets`（或 `operator.admin`）。包含密钥时，请从 `talk.resolved.config.apiKey` 读取当前生效的 Talk 提供商凭据；`talk.providers.<id>.apiKey` 保持源形态，可能是 SecretRef 对象或已脱敏字符串。

插件注册的 Gateway RPC 方法可以请求自己的 operator scope，但以下保留的核心前缀始终解析为 `operator.admin`（`src/shared/gateway-method-policy.ts`）：`config.*`、`exec.approvals.*`、 `wizard.*`、`update.*`。

方法 scope 只是第一道关卡。某些通过 `chat.send` 到达的斜杠命令会应用更严格的命令级检查：持久化的 `/config set` 和 `/config unset` 写入操作，即使对于已经持有较低 operator scope 的 Gateway 客户端，也需要 `operator.admin`。

`node.pair.approve` 在基础方法 scope（`operator.pairing`）之上，还会在审批时根据待处理请求声明的 `commands`（`src/infra/node-pairing-authz.ts`）进行额外的 scope 检查：

| 声明的命令                                                                                                                                        | 所需作用域                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 无                                                                                                                                                     | `operator.pairing`                    |
| 普通命令                                                                                                                                        | `operator.pairing` + `operator.write` |
| 包含 `system.run`、`system.run.prepare`、`system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir` 或 `system.execApprovals.get/set` | `operator.pairing` + `operator.admin` |

在此表中，`fs.listDir` 是通过 `node.invoke` 中继的节点命令。顶级网关 `fs.listDir` RPC 需要 `operator.write` 进行工作区包含的主机浏览，并在 `nodeId` 存在时需要 `operator.admin`。传递与 `fs.listDir` 返回的完全相同的目录路径：目录名称中的空格（包括尾随空格）很重要。

### <a id="caps%2Fcommands%2Fpermissions-(node)"></a><a id="caps/commands/permissions-node"></a> Caps/commands/permissions（节点）

节点在连接时声明能力声明：

- `caps`：高层能力类别，例如 `camera`、`canvas`、`screen`、 `location`、`voice` 和 `talk`。
- `commands`：用于 invoke 的命令允许列表。
- `permissions`：颗粒状开关（e.g. `screen.record`、`camera.capture`）。

Gateway 将这些视为**声明**，并在服务器端强制执行允许列表。 已连接的节点可以在成功连接或重新连接后，通过 `node.pluginTools.update` 发布可选的 agent 可见插件或 MCP 工具描述符。无头节点主机会重启，以应用声明式 MCP 清单变更。此更新方法是唯一的发布路径；插件工具描述符不接受在 `connect` 参数中传入。每个描述符必须使用对提供商安全的工具 `name`，并指定节点当前命令允许列表中的一个 `command`。Gateway 信任已配对节点提供的描述符元数据，过滤掉超出已批准命令范围的描述符，在节点断开连接时移除它们，并拒绝 operator 试图修改其他节点目录的操作。设置 `gateway.nodes.pluginTools.enabled: false` 可忽略节点发布的描述符。

已连接的节点主机会通过 `node.skills.update` 发布其完整的技能替换目录。此 node 角色方法是唯一的节点技能发布路径；技能不接受在 `connect` 参数中传入。每个描述符都包含安全名称、描述以及有界的 `SKILL.md` 内容。Gateway 使用常规技能加载器解析该内容，在节点连接期间将其包含在 agent 技能快照中，并在断开连接时将其移除。设置 `gateway.nodes.allowSkills: false` 可忽略节点发布的技能。
