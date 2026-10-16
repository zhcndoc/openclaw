---
summary: "存储错误、缺少回复以及仪表板或 Control UI 连接和授权代码"
title: "代理回复和 Control UI"
sidebarTitle: "代理回复和 Control UI"
read_when:
  - "代理运行因存储错误而失败"
  - "消息已到达但没有回复"
  - "仪表板或 Control UI 将无法连接，您需要身份验证详细代码"
---

## <a id="agent-run-failed-with-a-storage-error"></a> Agent 运行因存储错误而失败

命名 **Gateway 状态数据库** 的错误标识了运行期间观察到的存储故障。聊天横幅、记录的助手错误和 `embedded_run_agent_end` 日志显示相同的诊断。提供商响应机构仍然经过编辑。

| SQLite 消息                                     | 下一步                                                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `database is locked` or `database table is locked` | 重试。如果重复，请检查网关日志和并发存储维护。                                   |
| `database or disk is full`                         | 释放网关主机上的磁盘空间，然后重试。                                                               |
| `attempt to write a readonly database`             | 检查网关服务用户的存储权限和文件系统挂载模式。                                |
| `disk I/O error`                                   | 在重试之前检查存储运行状况和文件系统访问。仅此消息并不能证明磁盘已耗尽。 |

记录写入者所有权错误意味着运行丢失了其会话写入声明。在当前会话中重试并检查网关日志（如果再次出现）。存储故障不会触发提供程序凭证轮换或运行的自动重播。

使用 `openclaw logs --follow` 将运行与存储活动关联起来。 SQLite 可以在一个网关进程中的连接或工作线程之间进行竞争；仅看到一个进程打开数据库并不能排除争用。请参见[数据库并发注释](/reference/database-schemas#integrity-checks)。当运行处于活动状态时，避免完全数据库压缩。

## <a id="provider-rejected-the-request"></a> Provider 拒绝了请求

以 `LLM request rejected:` 开头的回复包含提供者的请求验证消息。 OpenClaw 编辑凭据、限制诊断并将其显示为文字文本，而不是公开完整的响应正文。已知的上下文、令牌限制和存储故障保留其特定的恢复指导。

对于 `Invalid service_tier argument`，检查所选模型和速度设置。支持快速或超快的提供商或帐户并不意味着每个模型都支持该层。使用标准 （`/fast off`） 重试或选择支持所请求层的模型。仅此错误并不意味着对话已损坏。请参见 [OpenAI 快速模式](/providers/openai/advanced#fast-mode)。

## <a id="connection-to-the-ai-service-failed"></a> 连接到AI服务失败

如果回复显示 OpenClaw 无法连接到 AI 服务，请检查提供商连接。对于本地模型，请确认其服务器正在运行并且可以在配置的 URL 处进行访问。在轮流中停止的服务器可以在对话中留下已完成的工作；在重试之前检查这些结果。使用 `openclaw logs --follow` 进行连接诊断。

## <a id="unreadable-conversation-history"></a> 不可读的对话历史记录

如果回复显示 OpenClaw 无法读取对话历史记录，请要求网关操作员在拥有该会话的主机和配置文件上尝试 `openclaw doctor --fix`。当允许无声回复时，对于未提及的组轮流也会出现此通知。

当存储的成绩单条目已使用支持的格式时，Doctor 可以恢复丢失的标头。它不会修复所有格式错误或不受支持的历史记录。如果错误仍然存​​在，请保留状态并通过网关日志联系支持人员；历史记录可能需要从备份迁移或恢复。重复的 `/new` 或 `/compact` 命令不会修复无法加载的转录本。

请参阅 [Doctor 的会话修复 ](/gateway/doctor/state-and-sessions) 和 [ 运行 Doctor](/gateway/doctor/running)。

## <a id="no-replies"></a> 没有回复

如果通道已启动但没有任何回应，请先检查路由和策略，再去重连任何东西。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查看以下内容：

- DM 发送者处于待配对状态。
- 群组提及门控（`requireMention`、`mentionPatterns`）。
- Channel/group 允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息在被提及之前会被忽略。
- `pairing request` → 发送者需要审批。
- `blocked` / `allowlist` → sender/channel 已按策略过滤。

`Session delivery: entry <id> was dead-lettered and moved to failed` 警告表示排队会话交付已完成终端清理，并且不会重播。使用队列条目 ID 关联较早的日志，然后在重试之前检查对话：中断的传送可能已经产生了副作用。批量恢复将最终的条目包含在其失败计数中。

相关：

- [通道故障排除](/channels/troubleshooting)
- [群组](/channels/groups)
- [配对](/channels/pairing)

如果共享模型目录工作器退出并且其自动运行时替换失败，则打开模型选择器、准备聊天或发送新消息可以再次检查失败的运行时，而无需重新启动网关。选择器在检查时显示 **Loading models...**，然后如果准备仍然失败，则返回到 **Models unavailable**。反复进行前台检查的冷却时间很短。 Cron 和 Heartbeat 每次失败都会进行一次检查；稍后计划的运行不会继续重建仍然不可用的运行时。不会重播现有消息和任务。

此次复苏仍需等待前期准备工作的落实。永远无法完成的准备工作、不相关的配置错误以及网关关闭都需要自己进行诊断；模型检查不会绕过这些生命周期边界。

## <a id="dashboard-control-ui-connectivity"></a> 仪表板控制 UI 连接

当 dashboard/control UI 无法连接时，验证其 URL、身份验证和设备身份。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

查看以下内容：

- 正确检查URL和仪表板URL。
- Auth mode/token 客户端和网关之间不匹配。
- 在没有所需设备标识的情况下进行连接的客户端。当前的Control UI可以在普通HTTP上创建和签名身份；请参阅 [ 不安全 HTTP](/web/control-ui#insecure-http)。

如果更新后本地浏览器无法连接到 `127.0.0.1:18789`，请先恢复本地 Gateway 服务并确认它正在提供仪表板：

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

如果 `curl` 返回 OpenClaw HTML，说明 Gateway 正常运行，剩余问题很可能是浏览器缓存、旧的深层链接，或过期的标签页状态。请直接打开 `http://127.0.0.1:18789` 并从仪表板进入。如果重启后服务没有保持运行，请执行 `openclaw gateway start` 并重新检查 `openclaw gateway status`。

<AccordionGroup>
  <Accordion id="connect-auth-signatures" title="连接/验证签名">
    - `device identity required` → 客户端未提供其角色和身份验证策略所需的身份。单纯的 HTTP 本身并不是原因。在token/password模式下，Control UI仍然需要浏览器设备标识；共享秘密不会取代它。
    - `origin not allowed` → 浏览器`Origin`是不允许的，不是私有的同源负载。私有同源负载（包括私有 LAN/Tailscale 地址和 `.local` 或 `.ts.net` 主机）不需要白名单条目。公共或跨源浏览器部署需要 `gateway.controlUi.allowedOrigins` 中的条目。
    - `device nonce required` / `device nonce mismatch` → 客户端没有完成基于挑战的设备认证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的载荷（或时间戳已过期）。
    - `AUTH_TOKEN_MISMATCH` with `canRetryWithDeviceToken=true` → 客户端可以使用缓存的 device token 进行一次受信任重试。
    - 该缓存 token 重试会复用与已配对 device token 一起存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用方则保留其请求的作用域集。
    - `AUTH_SCOPE_MISMATCH` → 已识别设备 token，但其已批准的作用域不覆盖此次连接请求；应重新配对或批准所请求的作用域契约，而不是轮换共享 gateway token。
    - 在该重试路径之外，connect 认证优先级依次为：显式共享 token/password，其次显式 `deviceToken`，然后是已存储的 device token，最后是 bootstrap token。
    - 在异步的 Tailscale Serve Control UI 路径上，相同 `{scope, ip}` 的失败尝试会在限流器记录失败前进行串行化。因此，同一客户端发起的两个并发错误重试，第二次可能会显示 `retry later`，而不是两个普通的不匹配错误。
    - 来自浏览器 origin 的 loopback 客户端出现 `too many failed authentication attempts (retry later)` → 同一归一化 `Origin` 的重复失败会被临时锁定；另一个 localhost origin 使用独立的桶。
    - 重试后重复 `unauthorized` → 共享 token/device 代币漂移；如果需要，请刷新令牌配置并重新设置 approve/rotate 设备令牌。
    - `gateway connect failed:` → host/port/url 目标错误。

  </Accordion>
</AccordionGroup>

### <a id="auth-detail-codes-quick-map"></a> 认证详情代码速查表

使用失败的 `connect` 响应中的 `error.details.code` 选择下一步操作：

| 详情代码                  | 含义                                                                                                                                                                                      | 建议操作                                                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享 token。                                                                                                                                                 | 在 Gateway 主机上，在交互式终端中运行 `openclaw gateway auth-token --show`，将输出粘贴到客户端中，然后重试。                                                                                                                                                   |
| `AUTH_TOKEN_MISMATCH`        | 共享 token 与 gateway auth token 不匹配。                                                                                                                                               | 如果 `canRetryWithDeviceToken=true`，允许进行一次受信任的重试。缓存 token 重试会复用已存储的已批准作用域；显式 `deviceToken` / `scopes` 调用方保留请求的作用域。如果仍然失败，请执行[令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备令牌已过时或已撤销。                                                                                                                                                 | Rotate/re-approve 设备令牌使用 [ 设备 CLI](/cli/devices)，然后重新连接。                                                                                                                                                                                                        |
| `AUTH_SCOPE_MISMATCH`        | 设备令牌有效，但其批准的 role/scopes 不涵盖此连接请求。                                                                                                       | 重新配对设备或批准所请求的范围合同；不要将此视为共享令牌漂移。                                                                                                                                                                                     |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 中的 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理请求：`openclaw devices list`，然后 `openclaw devices approve <requestId>`。在您检查请求的访问权限后，Scope/role 升级将使用相同的流程。                                                                                                               |

<Note>
使用共享网关 token/password 进行身份验证的直接环回后端 RPC 不应依赖于 CLI 的配对设备范围基线。如果子代理或其他内部调用仍然因 `scope-upgrade` 而失败，请验证调用者是否使用 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且没有强制使用显式 `deviceIdentity` 或设备令牌。
</Note>

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/signature 错误，请更新连接客户端并验证它：

<Steps>
  <Step id="wait-for-connect-challenge" title="等待connect.challenge">
    客户端等待网关发出的 `connect.challenge`。
  </Step>
  <Step id="sign-the-payload" title="签署有效负载">
    客户端签署与 challenge 绑定的载荷。
  </Step>
  <Step id="send-the-device-nonce" title="发送设备随机数">
    客户端发送 `connect.params.device.nonce`，并使用相同的 challenge nonce。
  </Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 被意外拒绝：

- 已配对设备 token 会话只能管理它们**自己的**设备，除非调用方还具有 `operator.admin`。
- `openclaw devices rotate --scope ...` 只能请求调用方会话已经持有的运营者作用域。

相关：

- [配置](/gateway/configuration)（网关认证模式）
- [控制 UI](/web/control-ui)
- [Gateway 协议 auth](/gateway/protocol/auth) — `AUTH_TOKEN_MISMATCH` 和 `AUTH_SCOPE_MISMATCH` 背后的电汇合约
- [设备](/cli/devices)
- [远程访问](/gateway/remote)
- [可信代理授权](/gateway/trusted-proxy-auth)
