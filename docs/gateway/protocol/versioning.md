---
summary: "协议版本常量、N-1 节点窗口和客户端默认值"
read_when:
  - "调试协议版本不匹配"
  - "在客户端中设置 minProtocol 和 maxProtocol"
  - "检查客户端超时、重试或缓冲区默认值"
  - "跨 CLI 和网关版本路由本地管理命令"
title: "网关协议版本控制"
sidebarTitle: "版本控制"
doc-schema-version: 1
---

客户端可以协商哪些协议版本，以及参考客户端附带的常量。

## <a id="versioning"></a> 版本管理

- `PROTOCOL_VERSION`、`MIN_CLIENT_PROTOCOL_VERSION`、 `MIN_NODE_PROTOCOL_VERSION` 和 `MIN_PROBE_PROTOCOL_VERSION` 位于 `packages/gateway-protocol/src/version.ts`。
- 客户端发送 `minProtocol` + `maxProtocol`。Operator 和 UI 客户端必须将当前协议包含在该范围内；当前客户端和服务器运行协议 v4。
- 具有 `role: "node"` 和 `client.mode: "node"` 的经过身份验证的客户端可以使用 N-1 节点协议 （v3）。轻量级重启检查使用相同的 N-1 窗口。此兼容性窗口不会更改设备身份验证、配对、范围、命令策略和执行批准。插件拥有的节点功能和命令将被保留，直到节点升级到当前协议，因为它们的托管表面不是 N-1 合约的一部分。
- Schema 和模型由 TypeBox 定义生成：
  - `pnpm protocol:gen`
  - `pnpm protocol:gen:swift`
  - `pnpm protocol:check`

### <a id="client-constants"></a> 客户端常量

参考客户端实现位于 `packages/gateway-client/src/` （OpenClaw 通过轻量的 `src/gateway/client.ts` facade 对其进行封装）。这些默认值在协议 v4 中保持稳定，是第三方客户端应采用的预期基线。

| 常量                                  | 默认值                                               | 来源                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PROTOCOL_VERSION`                        | `4`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| `MIN_CLIENT_PROTOCOL_VERSION`             | `4`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| `MIN_NODE_PROTOCOL_VERSION`               | `3`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| `MIN_PROBE_PROTOCOL_VERSION`              | `3`                                                   | `packages/gateway-protocol/src/version.ts`                                                                                |
| 请求超时（每个 RPC）                 | `30_000` ms                                           | `packages/gateway-client/src/client.ts` (`requestTimeoutMs`)                                                              |
| 预认证/连接挑战超时       | `30_000` ms                                           | `packages/gateway-client/src/timeouts.ts`（`OPENCLAW_HANDSHAKE_TIMEOUT_MS` env 可以提高配对的 server/client 预算） |
| 初始重连退避                 | `1_000` ms                                            | `packages/gateway-client/src/client.ts` (`GATEWAY_RECONNECT_POLICY`)                                                      |
| 最大重连退避                     | `30_000` ms                                           | `packages/gateway-client/src/client.ts` (`GATEWAY_RECONNECT_POLICY`)                                                      |
| 设备令牌关闭后的快速重试限制 | `250` ms                                              | `packages/gateway-client/src/client.ts`                                                                                   |
| `terminate()` 前的强制停止宽限时间     | `250` ms                                              | `FORCE_STOP_TERMINATE_GRACE_MS`                                                                                           |
| `stopAndWait()` 默认超时           | `1_000` ms                                            | `STOP_AND_WAIT_TIMEOUT_MS`                                                                                                |
| 默认 tick 间隔（`hello-ok` 之前）    | `30_000` ms                                           | `packages/gateway-client/src/client.ts`                                                                                   |
| 滴答超时关闭                        | 当静音超过 `tickIntervalMs * 2` 时代码 `4000` | `packages/gateway-client/src/client.ts`                                                                                   |
| `MAX_PAYLOAD_BYTES`                       | `25 * 1024 * 1024` (25 MB)                            | `src/gateway/server-constants.ts`                                                                                         |
| 聊天附件上限                   | `agents.defaults.mediaMaxMb`，默认解码后 20 MB   | `src/gateway/chat-attachment-policy.ts`                                                                                   |
| 聊天附件图片天花板             | `min(attachment ceiling, 6 MB)`                       | `src/gateway/chat-attachment-policy.ts`, `packages/media-core/src/constants.ts`                                           |

服务器在`hello-ok`中通告有效的`policy.tickIntervalMs`、`policy.maxPayload`、`policy.maxBufferedBytes`、`policy.attachments`；客户端应该尊重这些值，而不是握手前的默认值或硬编码的附件大小。

当每个挂起的请求都有一个时限时，参考客户端让有限的请求拥有其配置的截止时间。没有有限 `timeoutMs` 的 `expectFinal` 请求、任何带有 `timeoutMs: null` 的请求或有限请求和无界请求的混合都会使滴答看门狗保持活动状态。如果入站事件和响应在超过滴答超时阈值后保持静默，则客户端将使用代码 `4000` 关闭套接字，拒绝每个挂起的请求，然后重新连接。重新连接后不会重播被拒绝的请求。

## <a id="local-state-owner-routing"></a> 本地状态所有者路由

支持的本地管理命令在打开支持突变的状态之前发现拥有其所选物理状态目录的进程。实时所有者在其记录的本地端口上接收经过身份验证的 RPC；配置的远程网关或 URL 覆盖不会重定向这些本地目标。由于没有所有者，CLI 获得专有的生命周期所有权并保留它，直到接受工作和清理解决。无法访问、无法检查或仍在启动的所有者并不能证明该目录已脱机。

这些路由需要 `hello-ok.features.capabilities` 中的 `operator.admin` 和 `local-state-owner-routing-v1`。仅存在方法是不够的。除了原始能力涵盖的创建之外，每个操作还需要自己的能力：

| 本地操作                                              | RPC                        | 附加功能                |
| ------------------------------------------------------------ | -------------------------- | ------------------------------------ |
| `worktrees create`                                           | `worktrees.create`         | 无                                 |
| `worktrees remove`，包括无损和精确状态模式 | `worktrees.remove`         | `worktrees-remove-owner-v1`          |
| `worktrees restore`，包括精确状态恢复          | `worktrees.restore`        | `worktrees-restore-owner-v1`         |
| `worktrees gc`                                               | `worktrees.gc`             | `worktrees-gc-owner-v1`              |
| `worktrees recover-removal`                                  | `worktrees.recoverRemoval` | `worktrees-recover-removal-owner-v1` |
| `worktrees retire-snapshot`                                  | `worktrees.retireSnapshot` | `worktrees-retire-snapshot-owner-v1` |
| `pairing list`                                               | `channels.pairing.list`    | `channels-pairing-list-owner-v1`     |
| `pairing approve`                                            | `channels.pairing.approve` | `channels-pairing-approve-owner-v1`  |
| 默认`approvals get`                                      | `exec.approvals.get`       | `exec-approvals-get-owner-v1`        |
| 默认 `approvals set` 和白名单编辑                  | `exec.approvals.set`       | `exec-approvals-set-owner-v1`        |

CLI发送发现的`expectedOwnerId`；服务器在生效之前检查当前所有者和请求者。工作树创建还携带 `expectedRepoIdentity` 作为捕获的存储库目录的 `device:inode`。这些字段标识了预期的所有者和目标；他们没有给予许可。请参阅 [ 工作树请求和结果合同](/concepts/managed-worktrees#gateway-methods)、[ 渠道配对](/gateway/protocol/rpc-system-and-channels#channel-dm-pairing) 和[ 审批快照](/gateway/protocol/rpc-devices-nodes-and-approvals#approval-families)。

### <a id="refusals-and-uncertain-outcomes"></a> 拒绝和不确定的结果

CLI区分`OWNER_UNAVAILABLE`（无法建立所有权）、`OWNER_REFUSED`（未发生调度或突变前服务器明确拒绝）和`OUTCOME_UNKNOWN`（调度操作可能已生效）。 `details.mutationAccepted: false` 的服务器错误标识了显式的突变前拒绝；发送后的其他错误不证明回滚。

这些状态都不会触发本地回退或自动重播。对于较旧的网关、缺少功能或身份验证被拒绝，请更新网关或修复身份验证。要脱机工作，请通过其服务所有者停止网关，等待所有权释放，然后重新运行确切的命令。在收到不确定的答复后，请检查目标及其特定于操作的状态或恢复输出，然后再决定是否重试。本地路线最多允许现有业主操作十分钟；超时不会转移所有权。

### <a id="mixed-versions-and-retained-boundaries"></a> 混合版本和保留边界

即使旧网关宣传相同的方法，新客户端也需要完整的操作能力。他们永远不会放弃选择器或守卫来满足旧的请求。现有的 RPC 客户端可以省略早于路由的方法上的附加所有者字段，并保留其现有的响应合同。新的 `worktrees.recoverRemoval` 和 `worktrees.retireSnapshot` 方法需要 `expectedOwnerId`。

较旧的 CLI 和 SDK 二进制文件保留其现有的直接写入行为。路由不会拦截这些写入、任意受信任的 SQL 或共享外部数据库的另一个状态根。匹配 CLI、网关和 SDK 版本。所有写入者必须通过网关或在网关停止时获得独占所有权；不支持在另一个进程运行时直接写入。运行时缓存使用进程内写入收据，而不是外部提交新鲜度检查。路由涵盖了上面指定的操作；它无法使年长的直接写入者安全地与网关一起运行。有关所有权合同，请参阅 [ 数据库模式](/reference/database-schemas)。

以下边界保留其现有所有者和合同：

| 边界                       | 保留的行为                                                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 设备引导程序               | 隐式环回设备配对恢复、QR/setup-code 发行和 SDK 设备令牌仍由引导程序所有者保留，因此获取 RPC 凭证不需要首先需要这些凭证。                                                            |
| 配置和代理设置  | 代理身份、绑定和配置编辑保留文件 authoring/reload 行为。交互式代理创建和加入仍在本地进行身份验证、插件、工作区和配置；他们的权威承诺还没有转移到这条路线上。            |
| 执行策略同步    | `exec-policy preset` 和 `exec-policy set` 保留其现有的本地 config/policy 所有者。路由 `approvals` 命令不会更改这些操作或执行授权。                                                                  |
| 凭据                    | 模型身份验证 keys/order 和 SDK 身份验证写入、MCP OAuth、秘密存储编辑和通道身份验证保留其现有的锁定、失效和生命周期所有者。                                                                                    |
| 客户偏好             | TUI 记住的会话仍然是客户端偏好写入，而不是会话权限。                                                                                                                                                                |
| 插件和交付状态      | 插件键控存储和重复数据删除保留插件所有权；交付队列操作保留出站所有者许可。                                                                                                                                         |
| 会话和工作区 SDK     | 会话进入、维护、catalog/import/link、transcript/callback 和 workspace/worktree API 保留其现有合约。此路由合约不涵盖会话清理、代理删除和外部 SDK workspace/worktree 突变。 |
| 原始存储 API               | 原始 cron 替换和低级 SQLite SDK/native 访问不由 CLI 路由独占。首选域 RPC（如果可用）；不同工序的工人仍然是外国作家。                                                          |
| 离线及维护业主 | `sandbox recreate` 需要独家离线所有权。嵌入式执行、reset/uninstall、启动准入、迁移、Doctor 和更新保留其现有的生命周期所有者。                                                                       |

更新不需要新的路由 RPC 来安装提供它的版本。安装的更新程序和候选 Doctor 保留其停止、排空、备份、维护和最终确定合同。此路由不添加协议版本、架构、配置、保留或持久性更改。
