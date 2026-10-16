---
summary: "Node 能力批准：节点如何在设备配对后获得命令暴露"
read_when:
  - "在不使用 macOS UI 的情况下实现节点配对审批"
  - "为批准远程节点添加 CLI 流程"
  - "扩展网关协议以支持节点管理"
title: "Node 配对"
---

Node 配对有两层，均存储在网关 SQLite 状态数据库中的配对设备记录中：

- **设备配对**（角色 `node`）限制 `connect` 握手。参见 [受信任 CIDR 设备自动批准](#trusted-cidr-device-auto-approval) 下文以及 [通道配对](/channels/pairing)。
- **Node 能力批准** （`node.pair.*`） 声明 capabilities/commands 连接节点可能会暴露的门。门户是真理的源泉； UI（macOS 应用程序、Control UI）是批准或拒绝待处理请求的前端。

以前的独立节点配对存储（带有每个节点令牌的 `nodes/paired.json`，于 2026 年 1 月从连接路径中退出）已消失：`openclaw doctor --fix` 将剩余行折叠到设备记录中，并使用 `.migrated` 后缀归档旧文件。旧版 TCP 桥接支持已被删除。

## <a id="how-capability-approval-works"></a> 能力审批如何工作

1. 节点连接到 Gateway WS（设备配对会对这一步进行门控）。
2. 网关将申报的capability/command表面与批准的表面进行比较；新的或加宽的表面在设备记录上存储 **待处理请求** 并发出 `node.pair.requested`。
3. 你批准或拒绝该请求（CLI 或 UI）。
4. 在批准之前，节点命令会保持过滤状态；批准后会暴露声明的表面，但仍受正常命令策略约束。

待处理的 **节点功能** 请求不会仅仅因为时间流逝而过期。它们在节点断开连接和网关重新启动后仍然存在，并保持待定状态，直到获得批准、拒绝、被更改的表面取代或被节点生命周期清除，例如删除节点角色或成功重新连接而不再需要该批准。

待处理的功能请求不会授予访问权限。批准仍然需要所请求命令的操作员范围。在更新实时连接之前，网关会根据持久批准检查其配对身份和生成，并限制对连接声明的功能和命令的访问。

初始未经批准的表面没有有效命令。当稍后的扩展等待时，先前批准的命令仅在节点仍然声明它们并且网关命令策略允许它们的情况下才保持有效。

**5 分钟到期** 仍然适用于 **设备配对** 请求，不适用于已配对设备上的功能批准。

### <a id="upgrades-and-older-writers"></a> 升级和老作家

将网关和任何直接写入相同状态数据库的 CLI 一起升级。仅通过 RPC 调用网关的旧应用程序或 CLI 不是直接数据库编写器； the Gateway handles those requests。

能力请求存储格式不变。较旧的网关或直接 CLI 编写者仍然应用以前的五分钟到期时间，并且可以持久删除过期的请求，包括在不相关的配对更新期间。因此，降级可以恢复旧的过期行为；当旧版本写入数据库时​​，无法保证生命周期保留。

升级时，旧版本仅在其输出中隐藏的老化请求如果仍被存储，则可以再次变得可见。 It still requires explicit approval.升级无法恢复已删除的请求：节点必须提交新的功能请求供运营商审核。现有设备配对和先前批准的功能与待处理的请求是分开的。

## <a id="one-paste-node-pairing"></a> 一键粘贴节点配对

在 Control UI 的 Devices 页面中打开配对对话框，选择 **Node host**， 然后将生成的命令复制到设备上：

```bash
openclaw node run --pair "oc-pair://<setup-code>"
```

设置链接包含 Gateway 端点、短期有效的一次性引导令牌，以及当 Gateway 直接提供可固定的叶证书时使用的 TLS 证书固定值。引导令牌会在 10 分钟后过期。显式的 `--host`、`--port`、`--context-path`、`--tls`/`--no-tls` 和 `--tls-fingerprint` 标志会覆盖 `--pair` 中的值。

引导令牌和生成的设备凭证是分开的，就像短期的 Tailscale 身份验证密钥和它承认的持久设备身份一样。撤销或使设置链接过期并不会撤销已配对的设备； remove the device separately when needed.管理员创建的引导程序注册批准设备及其第一个声明的命令表面，包括声明时的 `system.run`，例如 [SSH- 验证的设备自动批准](#ssh-verified-device-auto-approval-default)。以后的命令、能力或权限扩展仍然需要批准。网关命令策略和 [ 节点本地执行批准](/tools/exec-approvals) 仍然是单独的门。本地执行批准默认为 `full` 和 `ask: "off"`；如果访问范围太广，请在使用链接之前配置它们。

## <a id="cli-workflow-(headless-friendly)"></a><a id="cli-workflow-headless-friendly"></a> CLI 工作流（适合无界面环境）

对于手动设备准入，首先在网关上运行：

```bash
openclaw devices list
openclaw devices approve <deviceRequestId>
```

在设备审批待决期间，无头节点主机会不断重新连接，指数退避时间上限为 30 秒。批准后，下一次重新连接将创建单独的命令界面请求：

```bash
openclaw nodes pending
openclaw nodes approve <nodeRequestId>
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
```

如果较旧的客户端已报告重新连接已暂停，请使用 `openclaw node restart` 重新启动已安装的节点，或停止并重新运行其前台命令一次。

设备和节点请求 ID 是不同的。要拒绝表面请求或管理现有节点：

```bash
openclaw nodes reject <nodeRequestId>
openclaw nodes remove --node <id|name|ip>
openclaw nodes rename --node <id|name|ip> --name "Living Room iPad"
```

`nodes status` 显示了 paired/connected 节点及其功能。

## <a id="api-surface-(gateway-protocol)"></a><a id="api-surface-gateway-protocol"></a> API 表面（gateway 协议）

事件：

- `node.pair.requested` - 在创建新的待处理请求时发出。
- `node.pair.resolved` - 当节点生命周期批准、拒绝或清除请求时发出。

方法：

- `node.pair.list` - 列出待处理和已配对的节点（`operator.pairing`）。
- `node.pair.approve` - 批准待处理请求。
- `node.pair.reject` - 拒绝待处理请求。
- `node.pair.remove` - 删除配对节点。这将撤销设备在配对设备存储中的 `node` 角色，删除已批准的节点表面以及该设备的节点角色会话 invalidates/disconnects。 **混合角色**设备（例如还拥有`operator`的设备）保留其行，仅失去`node`角色；仅节点设备行被删除。 Authz：`operator.pairing` 可以删除非操作员节点行；设备令牌调用者在混合角色设备上撤销其 **own** 节点角色还需要 `operator.admin`。
- `node.rename` - 重命名已配对节点面向 operator 显示的名称。

已在 2026.7 中移除：`node.pair.request` 和 `node.pair.verify`。待处理请求由 Gateway 在节点连接时自行创建，而它们曾经服务的独立按节点令牌已不再存在；node 认证现在是设备配对令牌。

注意：

- 表面未发生变化的重新连接会复用待处理请求；重复请求会刷新存储的节点元数据以及最新的、列入允许列表的声明命令快照，供 operator 查看。
- operator 作用域级别和批准时检查的摘要，请参阅 [Operator 作用域](/gateway/operator-scopes)。
- `node.pair.approve` 使用待处理请求声明的命令来强制执行额外的批准作用域：
  - 无命令请求：`operator.pairing`
  - 普通命令请求：`operator.pairing` + `operator.write`
  - 包含 `system.run`、`system.run.prepare`、 `system.which`、`browser.proxy`、`browser.proxy.upload.v1`、`fs.listDir`、 或 `system.execApprovals.get/set` 的管理员敏感请求：`operator.pairing` + `operator.admin`

这里，`fs.listDir` 是通过 `node.invoke` 中继的节点命令。顶级网关 `fs.listDir` RPC 需要 `operator.write` 进行工作区包含的主机浏览，并在 `nodeId` 存在时需要 `operator.admin`。

<Warning>
Node 表面认可记录了耐用的 command/capability 天花板。它不会授予节点稍后添加或不再声明的命令。

- Live 命令必须同时声明和批准，然后传递网关的命令策略（`gateway.nodes.commands.allow` 和 `gateway.nodes.commands.deny`）。
- Shell 将 `system.run` 列入白名单并询问策略，位于节点的 [execapprovals](/tools/exec-approvals) 中，而不是在配对记录中。

</Warning>

## <a id="node-command-gating-(2026.3.31%2B)"></a><a id="node-command-gating-2026-3-31+"></a> Node 命令门控 （2026.3.31+）

<Warning>
**重大变更：** 从 `2026.3.31` 开始，在节点配对获得批准之前，节点命令将被禁用。仅完成设备配对已不再足以暴露已声明的节点命令。
</Warning>

当节点首次连接时，会自动请求配对。 在该请求获得批准之前，该节点发出的所有待处理节点命令都会被过滤，不会执行。一旦配对获得批准，该节点声明的命令将可用，并受常规命令策略约束。

这意味着：

- 之前仅依赖设备配对即可暴露命令的节点，现在还必须完成节点配对。
- 在配对批准之前排队的命令会被丢弃，而不是延后执行。

## <a id="node-event-trust-boundaries-(2026.3.31%2B)"></a><a id="node-event-trust-boundaries-2026-3-31+"></a> Node 事件信任边界 （2026.3.31+）

<Warning>
**重大变更：** 由节点发起的运行现在将保持在一个缩减的受信表面上。
</Warning>

Node- 发起的摘要和相关会话事件仅限于预期的可信表面。以前依赖于更广泛的主机或会话工具访问的通知驱动或节点触发的流程可能需要调整。这种强化可以防止节点事件升级为超出节点信任边界允许的主机级工具访问。

持久节点存在更新遵循相同的身份边界：仅从经过身份验证的节点设备会话接受 `node.presence.alive` 事件，并且仅当 device/node 身份已配对时才更新配对元数据。自声明的 `client.id` 值不足以写入上次看到的状态。

## <a id="silent-local-pairing"></a> 静默本地配对

Gateway 将环回源地址视为本地地址。这包括客户端通过 SSH 端口转发连接到远程的仅环回 Gateway：SSH 服务器在 Gateway 主机上终止连接，因此 Gateway 将转发的连接视为环回连接。这是有意为之，因为普通的 SSH 访问本身已经意味着本地信任，包括读取共享 Gateway 令牌的能力。

默认情况下，受信任的本地连接会默默地批准首次设备配对以及角色和范围升级。这使得正常的同主机和SSH隧道重新连接变得方便。已配对为操作员的本机应用程序可以添加具有相同设备标识的第一个节点角色，而无需设备批准提示，包括重试标记为修复的待处理请求。 This preserves its operator token.网关还直接批准静默配对的非浏览器本地设备的初始节点功能表面，包括使用远程模式连接到同一计算机上的网关的本机应用程序。不需要应用程序端 SSH 检查或批准面板。

这使用同一机器、同一用户的信任边界。网关命令拒绝，节点本地 OS 权限和执行批准仍然适用。后续的能力表面升级和明确撤销的节点令牌仍然需要批准。远程、受信任的 CIDR、浏览器和代理连接不会从设备早期的静默配对中获得本地批准。

使用无 shell、仅端口转发 SSH 密钥或多用户 Mac 的操作员可能需要对每个设备进行明确批准：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveLocal: false,
      },
    },
  },
}
```

通过此设置，即使连接是本地的，新的配对请求、角色升级、范围升级和初始节点功能请求也会使用正常的审批流程。重新启用本地自动批准允许在重新连接时批准未批准的初始表面，包括之前拒绝的表面。仅元数据重新连接刷新保持自动，因此常规客户端或 OS 元数据更改不会造成审批流失。

## <a id="ssh-verified-device-auto-approval-(default)"></a><a id="ssh-verified-device-auto-approval-default"></a> SSH-已验证设备自动批准（默认）

当网关可以通过 **证明 SSH** 的机器所有权时，会自动批准来自 private/CGNAT 地址的首次 `role: node` 设备配对：它连接回配对主机（`BatchMode`、`StrictHostKeyChecking=yes`），运行`openclaw node identity --json` 存在，并且仅当远程设备 ID 和公钥与待处理请求完全匹配时才批准。关键的匹配是确保安全的原因：仅可达性永远不会批准，因此 NAT 共同租户、共享主机上的其他用户以及 LAN 欺骗都会陷入正常提示。

默认启用。触发条件如下：

- 网关进程用户（或`sshVerify.user`）可以以非交互方式SSH到节点主机（keys/agent；Tailscale SSH也可以），并且主机密钥已经可信。
- `openclaw` 在远​​程 `PATH` 上解析为非交互式 `sh -lc`。
- 连接 IP 是直接的（非代理、非回环）私有地址、ULA、链路本地地址或 CGNAT 地址，或者在设置了 `sshVerify.cidrs` 时与其匹配。
- 与受信任 CIDR 批准相同的准入门槛：仅限新的、无作用域的节点配对；升级、浏览器、Control UI 和 WebChat 始终会提示。

当设备审批待决时，节点客户端被告知继续重试 （`wait_then_retry`），包括在运行 SSH 检查时。如果检查失败，请求仍可供手动批准，并且节点会不断重试。失败的 SSH 目标会获得短暂的冷却时间（按键不匹配后 5 分钟）。

配对设置热应用，无需重新启动网关。自动批准会在授予访问权限之前立即重新检查当前策略，即使策略更改时 SSH 检查或存储锁定已处于挂起状态。对 SSH 验证设置的更改使用新的检查，并且不会继承之前策略的冷却时间。已配对的设备保持配对状态。

已批准的设备会记录 `approvedVia: "ssh-verified"`，并且它们首次声明的能力面也会在同一步中获批——因为密钥匹配已经证明该节点在其所有者拥有的机器上、并以操作者的账户运行，这与手动能力批准所断言的内容相同。后续的能力面升级仍然会提示。

加固或禁用：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        // Disable entirely:
        sshVerify: false,
        // ...or scope/tune the check:
        // sshVerify: { user: "me", identity: "~/.ssh/check", timeoutMs: 7000, cidrs: ["10.0.0.0/8"] },
      },
    },
  },
}
```

## <a id="manual-approval-(macos-app)"></a><a id="manual-approval-macos-app"></a> 手动审批（macOS app）

macOS 应用程序在一个 OpenClaw 审批面板中显示节点和设备请求。每个请求都会保留名称、平台、源地址和所有请求的访问权限。系统命令执行和设备管理访问会突出显示。网关分类为需要管理员批准的 Node 请求还会显示整个请求的警告。展开 **Details** 以获取完整身份、app/core 版本和请求元数据。

**Approve Node** 批准节点声明的能力；它不会轮换设备的访问令牌。 **Command-Return** 仅批准单个显示的请求。单独退货不认可。 **现在不**或**Escape**隐藏面板而不解析请求。设备配对请求保留其正常有效期；节点功能请求将保持待处理状态，直到其生命周期解决为止。

对于多个请求，**Approve All** 和 **Reject All** 仅适用于显示的请求。该视图显示后到达的请求不包含在决策中。

## <a id="auto-approval-(macos-app)"></a><a id="auto-approval-macos-app"></a> 自动批准（macOS 应用）

当满足以下条件时，macOS 应用可以尝试对节点能力请求进行**静默批准**：

- 请求被标记为 `silent`（当设备配对以非交互方式获批时，网关会将第一个能力界面标记为静默），并且
- 应用能够使用相同用户验证到网关主机的 SSH 连接。

如果静默批准失败，则会退回到正常的 Approve/Reject 提示。

## <a id="trusted-cidr-device-auto-approval"></a> 基于受信任 CIDR 的设备自动批准

默认情况下，`role: node` 的 WS 设备配对保持手动。对于网关已经信任网络路径的私有节点网络，运营商可以选择使用显式 CIDR 或确切 IP：

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

安全边界：

- 当 `gateway.nodes.pairing.autoApproveCidrs` 未设置时，将禁用。
- 不存在毯子LAN或专网自动批准模式； SSH- 验证的自动批准（上文）需要加密设备密钥匹配，而不仅仅是网络位置。
- 只有没有请求任何作用域的全新 `role: node` 设备配对请求才具备资格。
- 这仅批准该设备。它的第一个命令面仍然需要`openclaw nodes pending`和`openclaw nodes approve <nodeRequestId>`。
- 运维人员、浏览器、Control UI 和 WebChat 客户端仍然需要手动处理。
- 角色、作用域、元数据和公钥升级仍然需要手动处理。
- 同主机回环的受信任代理头路径不具备资格，因为该路径可能被本地调用者伪造。

## <a id="silent-pairing-supersede-cleanup"></a> 静默配对替代清理

非交互式批准将其来源记录在配对设备行上：同主机本地策略批准为 `silent`，可信 CIDR 节点批准为 `trusted-cidr`，SSH- 已验证节点批准为 `ssh-verified`。状态目录为临时目录（临时主目录、容器、每次运行的沙箱）的客户端每次运行都会生成一个新的设备密钥对，并且每次运行都会默默地重新配对为全新设备 - 无需清理，每次运行配对列表都会增加一个过时的行。

当网关以静默方式批准 **local** 设备配对时，它会废弃属于同一客户端集群（匹配 `clientId`、`clientMode` 和显示名称）且当前未连接的旧 `silent`- 批准记录。本地客户端在网关主机本身上运行，因此集群密钥无法匹配不同的机器。退休的行立即失去其令牌；任何匹配的旧节点配对条目都将被清除，并广播 `node.pair.resolved` 删除事件。

边界条件：

- 仅最新批准为同一主机本地 （`silent`） 的记录才有资格作为触发器和目标。 Trusted-CIDR 和 SSH-verified 配对跨主机，其中显示元数据不是计算机身份，因此它们永远不会自动删除 - 使用 Control UI 清理或 `openclaw nodes remove` 进行清除。
- Owner 批准的和 QR/setup-code（引导程序）配对永远不会自动删除。即使在稍后对同一设备 ID 进行静默重新批准后，在出处存在之前批准的记录仍会受到保护。
- 当前已连接的设备会被跳过，因此使用独立状态目录的并发本地会话在在线期间会保留各自的令牌。最近一分钟内批准的记录也会被跳过，因此同时进行的配对握手不会在连接注册之前互相清理。
- 受影响的客户端从结构上就是本地客户端，因此它们会在下次连接时静默重新配对。

## <a id="metadata-upgrade-auto-approval"></a> 元数据升级自动批准

当已配对的设备仅通过非敏感元数据更改（例如显示名称或客户端平台提示）重新连接时，OpenClaw 会将其视为 `metadata-upgrade`。静默自动批准的范围很窄：它仅适用于已证明拥有本地或共享凭据的受信任的非浏览器本地重新连接，包括 OS 版本元数据更改后的同主机本机应用程序重新连接。 Browser/Control UI 客户端和远程客户端仍然使用显式重新批准流程。范围升级（读取为 write/admin）和公钥更改是 **不符合元数据升级自动批准条件的**；他们保留明确的重新批准请求。

网关在启动期间加载一次配对设备。重新连接使用那些已提交的、进程拥有的记录来进行配对查找。配对写入会在下一次授权检查之前发布更新的记录。访问元数据在 hello 响应之后记录，并在同一设备的选项卡之间合并；可能会跳过一分钟内仅最后查看的刷新。此簿记从不授予访问权限，也无法更新更换批准。

## <a id="qr-pairing-helpers"></a> QR 配对辅助

`/pair qr` 会将配对载荷渲染为结构化媒体，以便移动端和浏览器客户端可以直接扫码。

在 Control UI 中，QR 图像在聊天记录刷新期间保留在配对详细信息旁边，直至过期。设置密码不会保存在脚本或浏览器的磁盘缓存中。重新加载、重新连接或更改身份验证会丢弃实时 QR；再次运行 `/pair qr` 以获得新代码。旧版本保存的浏览器快照也会在恢复时丢弃 QR 凭据；剩余的历史记录将被保留，清理后的快照将替换旧的缓存条目。

删除设备时也会清除该设备 id 的所有已过期待处理配对请求，因此在撤销后 `nodes pending` 不会显示孤立行。

## <a id="locality-and-forwarded-headers"></a> 本地性与转发头

Gateway 配对仅在原始套接字和任何上游代理证据都一致时，才将连接视为回环连接。如果请求到达回环地址，但携带 `Forwarded`、任何 `X-Forwarded-*` 或 `X-Real-IP` 头部证据，则这些转发头证据会使回环本地性声明失效，并且配对路径需要显式批准，而不是静默地将该请求视为同主机连接。关于运维者认证中的等价规则，请参见 [Trusted Proxy Auth](/gateway/trusted-proxy-auth)。

## <a id="storage-(local%2C-private)"></a><a id="storage-local-private"></a> 存储（本地，私有）

配对状态存储在共享 SQLite 状态数据库中的已配对设备记录里，位于 Gateway 状态目录下（默认 `~/.openclaw`）：

- `~/.openclaw/state/openclaw.sqlite`（包含带设备认证的已配对设备、已批准的节点表面、待处理的表面请求、待处理的设备配对请求以及引导令牌）

如果您覆盖 `OPENCLAW_STATE_DIR`，数据库也会随之移动。停止网关并运行 `openclaw doctor --fix` 以从旧版本导入存储。医生留下了`devices/*.json.migrated`和`nodes/*.json.migrated`档案。它在折叠节点功能之前导入设备批准；现有的 SQLite 批准优先。正常网关启动会报告待处理的遗留存储，而不对其进行更改。

安全说明：

- 设备令牌是机密信息；请将状态数据库视为敏感数据。
- 轮换设备令牌时使用 `openclaw devices rotate` / `device.token.rotate`。

## <a id="transport-behavior"></a> 传输行为

- 该传输是**无状态**的；它不存储成员关系。
- 如果 Gateway 离线或已禁用配对，则节点无法进行配对。
- 在远程模式下，配对会针对远程 Gateway 的存储进行。

## <a id="related"></a> 相关内容

- [通道配对](/channels/pairing)
- [Gateway 协议 auth](/gateway/protocol/auth) — 设备身份、配对签名和设备令牌的电汇合约
- [节点 CLI](/cli/nodes)
- [设备 CLI](/cli/devices)
