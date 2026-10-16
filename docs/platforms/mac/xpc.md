---
summary: "macOS OpenClaw 应用程序、网关节点传输和 PeekabooBridge 的 IPC 架构"
read_when:
  - "编辑 IPC 合约或菜单栏应用 IPC"
title: "macOS IPC"
---

# <a id="openclaw-macos-ipc-architecture"></a> OpenClaw macOS IPC 架构

本地 Unix 套接字将节点主机服务连接到 macOS 应用程序以获取执行批准和 `system.run`。捆绑的 `openclaw-mac` CLI 使用单独的本地控制套接字来检查和配置主要和保存的网关连接。代理操作仍然流经网关 WebSocket 和 `node.invoke`。节点支持的 `computer.act` 路径在进程内运行嵌入式 Peekaboo 自动化。独立 Peekaboo 客户端使用 PeekabooBridge。

## <a id="goals"></a> 目标

- 单个 GUI 应用程序实例，拥有所有面向 TCC- 的工作（通知、屏幕录制、麦克风、语音、AppleScript）。
- 一个用于自动化的小表面：Gateway + 节点命令、进程内 `computer.act`，以及面向独立 UI 自动化客户端的 PeekabooBridge。
- 可预测的权限：始终使用相同的已签名 bundle ID，由 launchd 启动，因此 TCC 授权会保持有效。

## <a id="how-it-works"></a> 工作原理

### <a id="gateway-%2B-node-transport"></a><a id="gateway-+-node-transport"></a> Gateway + 节点传输

- 应用运行 Gateway（本地模式），并作为节点连接到它。
- Agent 操作通过 `node.invoke` （e.g. `system.run`、`system.notify`、`canvas.present`） 执行。
- Node 命令包括 `canvas.present`、`canvas.hide`、`canvas.navigate`、`camera.list`、`camera.snap`、`camera.clip`、`camera.ptz.status`、 `camera.ptz.control`、`screen.snapshot`、`screen.record`、`computer.act`、`system.run` 和 `system.notify`。
- 节点上报`permissions`地图。代理使用它来查看屏幕、摄像头、麦克风、语音、自动化或辅助访问是否可用。

### <a id="node-service-%2B-app-ipc"></a><a id="node-service-+-app-ipc"></a> Node 服务 + 应用 IPC

- 一个无头的节点宿主服务连接到 Gateway WebSocket。
- `system.run` 请求会通过本地 Unix 套接字（`ExecApprovalsSocket.swift`）转发到 macOS 应用。
- 应用在 UI 上下文中执行该命令，必要时提示用户，并返回输出。
- 套接字拥有请求生存期。 Node 取消或套接字截止时间关闭响应读取器，取消本机提示或命令及其进程组。停止应用程序的执行服务器还会在释放其套接字租约之前取消并耗尽活动请求。
- Clients 在发送一个 JSONL 请求后仍然半关闭其 **write** 端。该正常请求 EOF 不会取消执行。响应读取器保持打开状态，直到结果到达。

执行响应截止时间包括请求的命令 `timeoutMs`、同伴的 15 秒批准窗口和 5 秒的传输开销。省略超时保留 20 秒默认值； `timeoutMs: 0` 禁用响应截止日期，同时保留取消。提交后，回复截止日期会报告 `TIMEOUT`，丢失或过大的回复会报告 `UNKNOWN`。两者都意味着执行结果未知；该命令永远不会在本地重播。 `COMPANION_APP_UNAVAILABLE` 保留用于无法提交给同伴的请求。

图示（SCI）：

```text
Agent -> Gateway -> Node Service (WS)
                      |  IPC (UDS + token + HMAC + TTL)
                      v
                  Mac App (UI + TCC + system.run)
```

### <a id="app-control-socket"></a> App控制插座

`openclaw-mac` 对每个 Unix 域连接发送一个 JSONL 请求并接收一个 JSONL 响应。正在运行的应用程序使用其 exec-approvals 生命周期所有者启动和停止此侦听器。共享侦听器拥有套接字路径租用、受保护的文件系统清理、连接框架和关闭排水。它仅公开这些操作：

| 手术           | 结果及效果                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `status`            | 主连接、保存的网关和应用程序 version/build/profile.                                                                  |
| `primary.set`       | 设置本地模式、SSH 传输或通过应用程序的本机连接所有者直接传输；返回结果的主要状态。 |
| `primary.clear`     | 将主连接恢复到未配置状态；返回主要状态。                                                     |
| `gateway.list`      | 列出已保存的网关及其连接状态。                                                                                    |
| `gateway.add`       | 通过“网关”选项卡的登录协调器进行验证和连接；返回保存的网关和身份（如果存在）。            |
| `gateway.remove`    | 解析 ID/name 并使用配置文件存储的删除路径，包括凭据和仪表板数据清理。                        |
| `gateway.reconnect` | 重复浏览器登录以获取浏览器配置文件或重新连接已保存的 token/password 连接。                                       |

请求使用 `operation` 字符串标识操作。主要 SSH 设置包括 `sshTarget`、可选端口、`identityPath` 和 `hostKeyPolicy`（`strict` 或 `openssh`）。直接设置包括 `url` 和可选的 `tlsFingerprint`。凭证承载操作接受经过身份验证的请求内的 `token` 或 `password`。 CLI 从文件或标准输入中读取这些内容。已保存网关请求使用 `name`、`url` 和 `browser` 或 `idOrName` 进行 removal/reconnection. 匹配首先尝试精确的 ID，然后使用唯一的不区分大小写的名称。模糊性是候选 names/IDs. 的错误

默认配置文件使用 `~/.openclaw/mac-control.sock` 和 `~/.openclaw/mac-control.token`。命名配置文件使用相应的 `~/.openclaw-<name>/` 目录。这些路径遵循 `AppProfile.stateDirectoryURL`，独立于 config/state 环境覆盖。该应用程序拥有令牌创建。令牌必须是模式为 `0600` 的常规、用户拥有的文件。缺少或不安全的凭据会拒绝请求。客户端必须具有应用程序的对等 UID （`getpeereid`）。 JSON 信封携带随机数、毫秒时间戳、编码请求以及随机数、时间戳和精确请求字节上的 HMAC-SHA256。请求有一个 15 秒的身份验证 TTL。成功通过身份验证的浏览器登录可能会在协调器的 300 秒有限操作期间保持打开状态。

套接字响应使用 `{ok:true,result:...}` 或 `{ok:false,error:{code,message}}`。 CLI 的 `--json` 成功输出将打开 `result`。 `status` 包含：

- `primary`：模式、可空传输、URL、可选 SSH target/remote 端口、隧道 state/local 端口和连接 state/version/error.
- `gateways`：ID，名称，URL，认证类型（`token`，`password`或`browser`），可选Cloudflare访问身份subject/expiry，和连接 state/error.
- `app`：版本、内部版本和配置文件。

响应从不包含令牌、密码、浏览器会话凭据或钥匙串内容。 Saved-Gateway 突变在签名的应用程序内执行，其中配置文件存储拥有钥匙串访问、连接停用、仪表板 cookie 和设备令牌清理。 CLI 从不写入保存的网关注册表。

有关 shell 示例、配置文件选择、安全凭据输入和后台应用程序启动，请参阅 [ 远程控制](/platforms/mac/remote#macos-app-setup)。

### <a id="peekaboobridge-(ui-automation)"></a><a id="peekaboobridge-ui-automation"></a> PeekabooBridge（UI 自动化）

- 内置 Agent 的 `computer` 工具**不**使用这个套接字。配对的 macOS 节点会在应用进程中借助嵌入式 Peekaboo 服务来实现 `computer.act`。
- UI 自动化使用单独的 UNIX 套接字（`~/Library/Application Support/OpenClaw/<socket>`）以及 PeekabooBridge JSON 协议。
- 主机优先级顺序（客户端侧）：Peekaboo.app -> Claude.app -> OpenClaw.app -> 本地执行。
- Security：桥接主机需要精确签名的 Peekaboo 客户端捆绑标识符和 Peekaboo 的官方 current/legacy 发布签名者集。 `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1` 守卫着与 DEBUG- 相同的 UID 逃生舱口（躲猫猫惯例）。
- 参见：[PeekabooBridge 使用](/platforms/mac/peekaboo) 了解详情。

## <a id="operational-flows"></a> 运行流程

- Restart/rebuild：`scripts/restart-mac.sh` 杀死现有实例，通过 Swift 重建、重新打包并重新启动。它自动检测可用的签名身份。如果找不到身份，则返回到 `--no-sign`。传递 `--sign` 来要求签名，如果没有可用密钥，则签名失败。通过 `--no-sign` 强制使用无符号路径。包装保留了明确的 `SIGN_IDENTITY`。否则 `scripts/codesign-mac-app.sh` 自动检测证书。
- 单个实例：应用程序检查 `NSWorkspace.runningApplications` 是否有重复的捆绑包 ID。如果发现多个实例（`MenuBar.swift` 中的 `isDuplicateInstance()`），它将退出。

## <a id="hardening-notes"></a> 加固说明

- 优先要求所有特权表面都匹配 TeamID。
- PeekabooBridge：`PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`（仅限 DEBUG-）可能允许相同 UID 调用者进行本地开发。
- 所有通信仍仅限本地。没有暴露网络套接字。
- TCC 提示仅源自 GUI 应用程序包。在重建过程中保持签名包 ID 的稳定性。
- Exec批准套接字强化：文件模式`0600`，共享令牌存储在`state/openclaw.sqlite`的`exec_approvals_config`行中，对等UID检查（`getpeereid`），HMAC-SHA256 challenge/response和短根据要求 TTL。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [macOS IPC 流程（Exec 审批）](/tools/exec-approvals-advanced#macos-ipc-flow)。
