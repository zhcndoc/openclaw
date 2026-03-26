---
summary: "网关 WebSocket 协议：握手、帧格式、版本控制"
read_when:
  - 实现或更新网关 WS 客户端时
  - 调试协议不匹配或连接失败时
  - 重新生成协议模式/模型时
title: "网关协议"
---

# 网关协议（WebSocket）

网关 WS 协议是 OpenClaw 的**唯一控制平面 + 节点传输方式**。所有客户端（CLI、Web UI、macOS 应用、iOS/Android 节点、无头节点）均通过 WebSocket 连接，并在握手时声明它们的**角色** + **权限范围**。

## 传输

- WebSocket，文本帧，负载为 JSON。
- 第一帧**必须**为 `connect` 请求。

## 握手（connect）

网关 → 客户端（连接前挑战）：

```json
{
  "type": "event",
  "event": "connect.challenge",
  "payload": { "nonce": "…", "ts": 1737264000000 }
}
```

客户端 → 网关：

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
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

网关 → 客户端：

```json
{
  "type": "res",
  "id": "…",
  "ok": true,
  "payload": {
    "type": "hello-ok",
    "protocol": 3,
    "policy": { "tickIntervalMs": 15000 }
  }
}
```

当设备令牌被签发时，`hello-ok` 还会包含：

```json
{
  "auth": {
    "deviceToken": "…",
    "role": "operator",
    "scopes": ["operator.read", "operator.write"]
  }
}
```

### 节点示例

```json
{
  "type": "req",
  "id": "…",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": {
      "id": "ios-node",
      "version": "1.2.3",
      "platform": "ios",
      "mode": "node"
    },
    "role": "node",
    "scopes": [],
    "caps": ["camera", "canvas", "screen", "location", "voice"],
    "commands": [
      "camera.snap",
      "canvas.navigate",
      "screen.record",
      "location.get"
    ],
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

## 帧格式

- **请求**：`{type:"req", id, method, params}`
- **响应**：`{type:"res", id, ok, payload|error}`
- **事件**：`{type:"event", event, payload, seq?, stateVersion?}`

有副作用的方法需要**幂等键**（详见模式）。

## 角色 + 权限范围

### 角色

- `operator` = 控制平面客户端（CLI/UI/自动化）。
- `node` = 功能主机（摄像头/屏幕/画布/系统运行）。

### 权限范围（operator）

常用权限范围：

- `operator.read`
- `operator.write`
- `operator.admin`
- `operator.approvals`
- `operator.pairing`

方法权限范围只是第一道门槛。一些通过 `chat.send` 访问的斜杠命令，在命令级别上会施加更严格的检查。例如，持久化的 `/config set` 和 `/config unset` 写操作需要 `operator.admin` 权限。

### 能力/命令/权限（node）

节点在连接时申明能力声明：

- `caps`：高级能力类别。
- `commands`：调用命令白名单。
- `permissions`：具体开关（例如 `screen.record`、`camera.capture`）。

网关将其视为**声明**，并在服务器端强制检查白名单。

## 在线状态

- `system-presence` 返回以设备身份为键的条目。
- 在线状态条目包含 `deviceId`、`roles` 和 `scopes`，UI 可以对同一设备连接的**operator** 和 **node** 显示为单行。

### 节点辅助方法

- 节点可调用 `skills.bins` 以获取当前的技能可执行文件列表，用于自动允许检查。

### 操作员辅助方法

- 操作员可调用 `tools.catalog`（`operator.read`）获取某个代理的运行时工具目录。响应包含分组工具及来源元数据：
  - `source`：`core` 或 `plugin`
  - `pluginId`：当 `source="plugin"` 时的插件所有者
  - `optional`：该插件工具是否可选
- 操作员可调用 `tools.effective`（`operator.read`）获取某个会话的运行时有效工具清单。
  - 需要 `sessionKey`。
  - 网关会从会话的服务端派生受信任的运行时上下文，而不是接受调用方提供的 auth 或投递上下文。
  - 响应以会话为作用域，并反映当前活动会话现在可用的内容，包括 core、plugin 和 channel 工具。

## 执行审批

- 当执行请求需要审批时，网关广播 `exec.approval.requested`。
- 操作客户端通过调用 `exec.approval.resolve` 来处理（需 `operator.approvals` 权限范围）。
- 对于 `host=node`，`exec.approval.request` 必须包含 `systemRunPlan`（规范的 `argv`/`cwd`/`rawCommand`/会话元数据）。缺少 `systemRunPlan` 的请求将被拒绝。

## 版本控制

- `PROTOCOL_VERSION` 定义在 `src/gateway/protocol/schema.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`；服务器拒绝不匹配的版本。
- 通过 TypeBox 定义生成模式和模型：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

## 认证

- 如果设置了 `OPENCLAW_GATEWAY_TOKEN`（或 `--token`），`connect.params.auth.token`  
  必须匹配，否则 socket 将被关闭。
- 配对后，网关会颁发一个针对连接角色 + 权限范围的**设备令牌**。该令牌会在 `hello-ok.auth.deviceToken` 中返回，客户端应持久保存以供将来连接使用。
- 设备令牌可通过 `device.token.rotate` 和 `device.token.revoke` 进行轮换/撤销（需要 `operator.pairing` 权限范围）。
- 认证失败会包含 `error.details.code` 及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`（选项：`retry_with_device_token`、`update_auth_configuration`、`update_auth_credentials`、`wait_then_retry`、`review_auth_configuration`）
- 客户端对 `AUTH_TOKEN_MISMATCH` 的行为：
  - 信任客户端可尝试用缓存的每设备令牌进行一次有限重试。
  - 若重试失败，客户端应停止自动重连循环并提示操作员采取措施。

## 设备身份 + 配对

- 节点应包含一个稳定的设备身份（`device.id`），该身份源自密钥对指纹。
- 网关为每个设备 + 角色颁发令牌。
- 新设备 ID 需要配对审批，除非启用了本地自动审批。
- **本地**连接包括回环地址和网关主机自身的 tailnet 地址（因此同一主机的 tailnet 绑定仍可自动审批）。
- 所有 WS 客户端在 `connect` 时必须包含 `device` 身份（operator + node）。
  控制 UI 仅在以下模式中可省略：
  - `gateway.controlUi.allowInsecureAuth=true`，仅限 localhost 不安全 HTTP 兼容。
  - `gateway.controlUi.dangerouslyDisableDeviceAuth=true`（破窗操作，严重的安全降级）。
- 所有连接必须签署服务器提供的 `connect.challenge` nonce。

### 设备认证迁移诊断

对于仍使用旧版预挑战签名行为的遗留客户端，`connect` 现在会返回  
位于 `error.details.code` 中的 `DEVICE_AUTH_*` 详细代码及稳定的 `error.details.reason`。

常见迁移失败：

| 消息                       | details.code                     | details.reason           | 含义                                               |
| -------------------------- | -------------------------------- | ------------------------ | -------------------------------------------------- |
| `device nonce required`    | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端未提供 `device.nonce`（或发送空值）。       |
| `device nonce mismatch`    | `DEVICE_AUTH_NONCE_MISMATCH`    | `device-nonce-mismatch`  | 客户端用过期或错误的 nonce 签名。                  |
| `device signature invalid` | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。                         |
| `device signature expired` | `DEVICE_AUTH_SIGNATURE_EXPIRED` | `device-signature-stale` | 签名时间戳超出允许偏差范围。                       |
| `device identity mismatch` | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。                      |
| `device public key invalid`| `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式或规范化失败。                             |

迁移目标：

- 始终等待 `connect.challenge`。
- 签名包含服务器 nonce 的 v2 负载。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 推荐的签名负载为 `v3`，除设备/客户端/角色/权限/令牌/nonce 字段外，还绑定位于 `platform` 和 `deviceFamily`。
- 为保证兼容，旧的 `v2` 签名仍被接受，但配对设备元数据绑定用于控制重连时命令策略。

## TLS + 绑定

- WS 连接支持 TLS。
- 客户端可选择绑定网关证书指纹（见 `gateway.tls` 配置及 `gateway.remote.tlsFingerprint` 或 CLI 的 `--tls-fingerprint` 参数）。

## 范围

此协议暴露了**完整的网关 API**（状态、频道、模型、聊天、代理、会话、节点、审批等）。具体接口由 `src/gateway/protocol/schema.ts` 中的 TypeBox 模式定义。
