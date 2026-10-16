---
summary: "握手身份验证路径、设备身份、配对签名和 TLS 固定"
read_when:
  - "为网关客户端选择身份验证路径"
  - "实施设备身份或签名配对"
  - "固定网关 TLS 证书"
title: "网关协议授权"
sidebarTitle: "身份验证和设备身份"
doc-schema-version: 1
---

客户端如何证明其身份：握手身份验证路径、设备身份和配对签名以及 TLS 固定。

## <a id="auth"></a> 身份验证

所有者页面：[网关身份验证](/gateway/authentication) — 身份验证模式、token/password 设置以及此电汇合同强制执行的面向运营商的策略。

- 共享秘密网关身份验证接受 `connect.params.auth.token` 或 `connect.params.auth.password` 中配置的秘密。 `gateway.auth.mode: "token"`选用`gateway.auth.token`； `"password"` 选择 `gateway.auth.password`。该模式选择配置的机密，而不是所需的线字段。
- 带有身份信息的模式，例如 Tailscale Serve（`gateway.auth.allowTailscale: true`） 或非 loopback 的 `gateway.auth.mode: "trusted-proxy"`，会通过请求标头而不是 `connect.params.auth.*` 满足 connect 身份验证检查。
- Private-ingress `gateway.auth.mode: "none"` 完全跳过共享秘密连接身份验证；不要在 public/untrusted 入口上公开该模式。
- 配对后，网关会签发一个限定于连接角色＋已批准授权的设备令牌，并在 `hello-ok.auth.deviceToken` 中返回。成功 connect 后，如果该令牌是新的或不同于已存储的令牌，客户端应将其与 `hello-ok.auth.scopes` 一起持久化。
- `hello-ok.auth.scopes` 是当前 socket 的实时权限，并与 RPC 分发所执行的 scopes 相匹配。
- 当 `hello-ok.auth.deviceToken` 与同一网关、设备、客户端和角色已存储的令牌完全匹配时，应保留该记录中存储的 scopes，而不是将其替换为更窄的实时 scope 集合。新签发或轮换后的令牌使用 `hello-ok.auth.scopes`；该令牌签发时，其已批准授权与该连接相匹配。
- 与该存储的设备令牌重新连接还应该重用为该令牌设置的存储的批准范围。这保留了已授予的 read/check/status 访问权限，并避免无提示地重新连接到更窄的隐式仅管理范围。
- 客户端连接验证组件（`packages/gateway-client/src/client.ts`中的`selectConnectAuth`）：
  - `auth.password` 设置后始终转发。任一共享秘密字段都可以携带配置的秘密；当两者都提供时，网关使用与其身份验证模式匹配的字段。
  - `auth.token` 按以下优先顺序填充：首先是显式共享令牌，然后是显式 `deviceToken`，最后是按 `deviceId`＋`role` 索引的已存储每设备令牌。
  - 仅当以上均未解决 `auth.token` 时才发送 `auth.bootstrapToken`。共享令牌或任何已解析的设备令牌都会抑制它。
  - 在一次性 `AUTH_TOKEN_MISMATCH` 重试中自动提升存储的设备令牌仅门控到可信端点：环回或具有固定 `tlsFingerprint` 的 `wss://`。没有固定的公共 `wss://` 不符合资格。
- 内置设置码 bootstrap 会返回主节点的 `hello-ok.auth.deviceToken`，以及一个用于受信任移动端交接的有界 operator 令牌，并在 `hello-ok.auth.deviceTokens` 中返回。该 operator 令牌包含用于原生 Talk 配置读取的 `operator.talk.secrets`，但排除配对变更 scopes 和 `operator.admin`。
- `hello-ok.auth.deviceTokens` 仅包含额外的 bootstrap 交接令牌。不要将其用作主要 `deviceToken` 重连记录的元数据。
- A 仅节点引导重试重新使用已批准的节点配对，无需请求操作员切换或更改节点的配对生成。
- 当非 baseline 设置码 bootstrap 等待批准时， `PAIRING_REQUIRED` 详情会包含 `recommendedNextStep: "wait_then_retry"`、 `retryable: true` 和 `pauseReconnect: false`。使用相同的 bootstrap 令牌持续重新连接，直到请求获批或令牌失效。
- 仅当连接在可信传输（例如 `wss://` 或 loopback/local 配对）上使用引导程序身份验证时，才保留 `hello-ok.auth.deviceTokens`。
- 如果客户端提供了显式 `deviceToken` 或显式 `scopes`，则调用方请求的 scope 集合在实时连接中保持权威，并在 `hello-ok.auth.scopes` 中报告；仅当客户端复用已存储的每设备令牌时，才会复用缓存的令牌授权 scopes。
- 设备令牌可以通过 `device.token.rotate` 和 `device.token.revoke` 为 rotated/revoked（需要 `operator.pairing`）。轮换或撤销节点或其他非操作员角色也需要 `operator.admin`。
- `device.token.rotate` 返回旋转元数据。它仅针对已使用该设备令牌进行身份验证的同一设备调用回显替换承载令牌，因此仅令牌客户端可以在重新连接之前保留其替换。 Shared/admin 旋转不回显不记名令牌。
- 令牌签发、轮换和撤销始终受限于该设备配对条目中记录的已批准角色集合；令牌变更不能扩展到或针对配对批准从未授予的设备角色。
- 对于已配对设备令牌会话，设备管理的范围限定于自身，除非调用方还具有 `operator.admin`：非管理员调用方只能管理其自身设备条目的 operator 令牌。Node 和其他非 operator 令牌的管理仅限管理员，即使是针对调用方自己的设备也一样。
- `device.token.rotate` 和 `device.token.revoke` 还会根据调用方当前会话 scopes 检查目标 operator 令牌的 scope 集合。 非管理员调用方不能轮换或撤销 scope 范围比其自身已持有权限更广的 operator 令牌。
- 身份验证失败会包含 `error.details.code` 以及恢复提示：
  - `error.details.canRetryWithDeviceToken`（布尔值）
  - `error.details.recommendedNextStep`：以下值之一：`retry_with_device_token`、 `update_auth_configuration`、`update_auth_credentials`、 `wait_then_retry`、`review_auth_configuration` （`packages/gateway-protocol/src/connect-error-details.ts`）。
- `AUTH_TOKEN_MISMATCH` 的客户端行为：
  - Native Apple 客户端在使用可信端点上缓存的每设备令牌进行一次有界重试之前需要 `canRetryWithDeviceToken=true`。错误或丢失标志会暂停自动重试，并使存储的设备令牌不参与以后的共享令牌连接。
  - 如果该重试失败，则停止自动重连循环，并向操作员显示操作指引。
- `AUTH_SCOPE_MISMATCH` 表示设备令牌已被识别，但不涵盖所请求的 role/scopes. 不要将其视为错误令牌；提示操作员重新配对或批准narrower/broader范围合同。
- `OPERATOR_ACCESS_DENIED` 表示已通过身份验证的人员，但网关的操作员访问策略（例如，绑定到 `accessPolicyPlugin` 的角色）当前不授予访问权限。这不是凭证问题。通过退避保持重新连接，以便无需用户操作即可应用新授予的访问权限，并显示管理员指导以分配角色或授予访问权限。

## <a id="device-identity-and-pairing"></a> 设备身份与配对

所有者页面：[网关配对](/gateway/pairing) — 审批流程、设备记录以及这些字段背后的 CLI 表面。

- 节点应包含稳定的设备身份（`device.id`），该身份由密钥对指纹派生。
- 网关按设备和角色签发令牌。
- 配对自动批准以直接本地回环连接为中心。
- Control UI运营商客户可以保持其预批准套接字打开。一个`NOT_PAIRED`连接响应`details.code: "PAIRING_REQUIRED"`和`details.waitForResolution: true`将等待绑定到`details.requestId`和`details.deviceId`。这不是已承认的会话：没有可用的 RPC、订阅或其他客户端的配对事件。网关发送现有的`device.pair.resolved`事件仅针对该确切事件request/device， 和`decision`设置为`approved`， `rejected`， or `expired`，然后关闭套接字。被取代的请求仅关闭其等待套接字，而不报告批准或拒绝。批准或被取代的请求关闭会提示新的经过身份验证的连接；事件本身永远不会授予访问权限。拒绝和过期会停止自动重新连接，直到明确的用户操作为止。浏览器将这些终端结果公开为`PAIRING_REJECTED`和`PAIRING_EXPIRED`错误详细代码。服务员是连接本地的，并在断开连接时被删除；没有否认历史被保留。不办理的客户`waitForResolution`连接响应失败后仍然可以关闭。这些是附加细节和事件语义，而不是协议版本更改。
- 如果批准与重新连接重叠，网关会在完成握手之前检查当前配对的设备。批准的密钥、角色、范围和固定的客户端元数据必须授权该连接；仅消耗的请求不会授予访问权限。
- 配对自动批准以直接本地环回连接为中心。
- OpenClaw 还具有用于可信共享秘密帮助程序流的狭窄 backend/container-local 自连接路径。
- 同主机 tailnet 或 LAN 连接在配对时仍被视为远程连接，并且需要批准。
- WS 客户端通常在 `connect`（运营商 + 节点）期间包含 `device` 身份。唯一的无设备操作员例外是显式信任路径：
  - 成功通过 `gateway.auth.mode: "trusted-proxy"` 进行操作员 Control UI 身份验证。
  - direct-loopback `gateway-client` 保留内部帮助器路径上的后端 RPC。
- 省略设备身份会产生范围影响。当无设备身份的操作员连接通过明确的信任路径获准时，除非该路径具有具名的范围保留例外，OpenClaw 仍会将自行声明的范围清除为空集。随后，受范围限制的方法会失败，并返回 `missing scope`。
- 保留的直接环回`gateway-client`后端辅助路径仅保留内部本地控制平面RPC的范围；自定义后端 ID 不会收到此异常。
- 所有连接都必须对服务器提供的 `connect.challenge` nonce 进行签名。

### <a id="device-auth-migration-diagnostics"></a> 设备认证迁移诊断

对于仍然使用预挑战签名行为的旧客户端，`connect` 在 `error.details.code` 下返回 `DEVICE_AUTH_*` 详细代码，并具有稳定的 `error.details.reason`。

常见迁移失败：

| 消息                     | details.code                     | details.reason           | 含义                                            |
| --------------------------- | -------------------------------- | ------------------------ | -------------------------------------------------- |
| `device nonce required`     | `DEVICE_AUTH_NONCE_REQUIRED`     | `device-nonce-missing`   | 客户端省略了 `device.nonce`（或传入空值）。     |
| `device nonce mismatch`     | `DEVICE_AUTH_NONCE_MISMATCH`     | `device-nonce-mismatch`  | 客户端使用 stale/wrong 随机数进行签名。            |
| `device signature invalid`  | `DEVICE_AUTH_SIGNATURE_INVALID`  | `device-signature`       | 签名负载与 v2 负载不匹配。       |
| `device signature expired`  | `DEVICE_AUTH_SIGNATURE_EXPIRED`  | `device-signature-stale` | 签名时间戳超出了允许的时钟偏差。          |
| `device identity mismatch`  | `DEVICE_AUTH_DEVICE_ID_MISMATCH` | `device-id-mismatch`     | `device.id` 与公钥指纹不匹配。 |
| `device public key invalid` | `DEVICE_AUTH_PUBLIC_KEY_INVALID` | `device-public-key`      | 公钥格式或规范化失败。         |

迁移目标：

- 始终等待 `connect.challenge`。
- 使用 `connect.challenge.payload.ts` 作为 `connect.params.device.signedAt`。
- 对包含服务器 nonce 的 v2 负载进行签名。
- 在 `connect.params.device.nonce` 中发送相同的 nonce。
- 首选签名负载是`v3`（`packages/gateway-client/src/device-auth.ts`中的`buildDeviceAuthPayloadV3`），除了device/client/role/scopes/token/nonce字段之外，它还绑定`platform`和`deviceFamily`。
- 为保持兼容性，仍接受旧版 `v2` 签名，但重新连接时，配对设备元数据固定仍会控制命令策略。

## <a id="tls-and-pinning"></a> TLS 与固定

所有者页面：[远程访问](/gateway/remote) — 配置`gateway.tls`并获取指纹客户端PIN。

- WS 连接支持 TLS（`gateway.tls` 配置）。
- 客户端可以选择通过 `gateway.remote.tlsFingerprint` 或 CLI `--tls-fingerprint` 固定网关证书指纹。
