---
summary: "启动无头或服务节点主机，将其配对并使用其系统命令"
read_when:
  - "在网关主机以外的计算机上运行命令"
  - "将节点主机安装为服务或通过 SSH 隧道安装"
  - "检查节点主机身份状态或系统命令行为"
title: "运行节点主机"
sidebarTitle: "Node主机"
---

## <a id="remote-node-host-(system.run)"></a><a id="remote-node-host-system-run"></a> 远程节点主机（system.run）

当您的网关在一台计算机上运行并且您希望命令在另一台计算机上执行时，请使用 **节点主机**。该模型仍然与 **gateway** 通信；当选择 `host=node` 时，网关将 `exec` 呼叫转发到 **节点主机**。

| 角色         | 责任                                                                           |
| ------------ | ---------------------------------------------------------------------------------------- |
| 网关主机 | 接收消息、运行模型、路由工具调用。                                    |
| Node主机    | 在 node 机器上执行 `system.run`/`system.which`。                                |
| 批准    | 通过 node host 上的 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config` 强制执行。 |

批准说明：

- Approval 支持的节点运行绑定确切的请求上下文。 exec路径在批准前准备一个`systemRunPlan`；一旦授予，网关将转发该存储的计划，而不是任何后来调用者编辑的 command/cwd/session 字段，并在运行之前重新验证工作目录。
- 对于直接 shell/runtime 文件执行，OpenClaw 还会尽力绑定一个具体的本地文件操作数，并在执行前如果该文件发生更改则拒绝运行。
- 如果 OpenClaw 无法准确识别 interpreter/runtime 命令的一个具体本地文件，则批准支持的执行将被拒绝，而不是假装完整的运行时覆盖。使用沙箱、单独的主机或显式可信的 allowlist/full 工作流程来实现更广泛的解释器语义。

### <a id="gateway-deployments-that-cannot-host-nodes"></a> 无法托管节点的 Gateway 部署

当节点托管不可用时，网关可以为浏览器用户保持健康。在加入节点之前在网关上运行 `openclaw doctor`，并检查以下先决条件：

- **机器身份验证：** Tailscale 身份标头不对节点角色连接进行身份验证。在 `gateway.auth.mode: "trusted-proxy"` 中，新节点也无法提供代理的用户身份标头。要使用共享令牌，请切换到令牌模式并使用 SecretRef 配置 `gateway.auth.token`；可信代理模式拒绝混合令牌配置。可信代理网关只能将 `gateway.auth.password` 用于干净的 loopback/direct 呼叫者。请参阅 [ 可信代理混合令牌配置](/gateway/trusted-proxy-auth#mixed-token-configuration)。
- **Node 加入 URL：** 仅使用默认 `gateway.bind: "loopback"` 并且没有通告的端点，`openclaw devices join-code` 报告网关仅绑定到环回并建议 `gateway.publicOrigin` 作为主要修复。对于公共 HTTPS 入口，将其设置为代理的可到达源。现有的 Tailscale 服务、`gateway.remote.url`、绑定派生地址和特定于配对的 `plugins.entries.device-pair.config.publicUrl` 覆盖保留其优先级； `publicOrigin` 提供环回回退。远程加入 URL 需要 TLS；单独启用 LAN 绑定不会启用纯文本远程加入 URL。显式配置的环回端点可以生成 HTTP 加入 URL，但加入计算机必须能够到达该环回端点，例如通过本地隧道。明文LAN配对可以直接使用设置码。
- **Node 加入支持：** 加入代码创建和 `/j` 兑换是核心网关操作。它们不需要启用 `device-pair` 插件，即使其保留的 `publicUrl` 配置字段可以提供端点。有关打印的 `npx -y openclaw connect <url> --service --session-host` 命令和仅命令替代方案，请参阅 [ 连接代码 ](/cli/devices#openclaw-devices-join-code)。
- **设备会话运行时：** 配对设备运行器支持嵌入式 OpenClaw 运行时和显式授权的 Codex `remote-exec`； ACPX 路由无法调度到配对设备。 Codex 需要 `gateway.nodes.commands.allow` 中的 `codex.exec-server.stdio.v1` 及其正常配对和调用批准。运行时策略属于 provider/model 路由，而不是忽略的整个代理运行时密钥。多智能体列表还必须设置 `agents.ownership: "explicit"`。请参阅 [Codex 配对设备放置 ](/plugins/codex-harness/placement#run-codex-on-a-paired-device) 和 [ 运行时策略 ](/gateway/config-agents/runtime-and-cli-backends#runtime-policy)。
- **边缘路由：** 当反向代理或访问边缘位于网关前面时，节点必须满足加入请求、其主网关 WebSocket 和工作线程 WebSocket 上的边缘身份验证。保持 `/__openclaw__/worker` 启用 WebSocket 升级。您可以改为从边缘身份验证中免除 `/j/*` 和 `/__openclaw__/worker`，因为这两个路由都强制执行自己的短期凭据。请参阅 [worker 协议 ](/gateway/protocol/handshake#worker-role-and-closed-protocol)。

对于 Cloudflare 前置网关：

1. 在 Cloudflare 零信任中，创建访问服务令牌。当 Cloudflare 显示时，复制其 Client ID 和 Client Secret。
2. 添加 **Service Auth** 策略，该策略接受保护网关的访问应用程序上的令牌。如果 `/j/*` 和 `/__openclaw__/worker` 是单独的 Access 应用程序，请为两者添加相同的策略。
3. 节点上，提供常规环境回退并连接：

   ```bash
   export CF_ACCESS_CLIENT_ID="<client-id>"
   export CF_ACCESS_CLIENT_SECRET="<client-secret>"
   openclaw connect https://gateway.example/j/<code> --service
   ```

节点连接密钥为`gateway.cloudflareAccess.clientId`和`gateway.cloudflareAccess.clientSecret`；两者都接受 SecretInput 值。上面的环境回退将这些密钥保留为 env SecretRefs，而不是复制明文。对于已安装的节点，OpenClaw 将环境值存储在托管服务环境文件中，而不是内嵌在 launchd、systemd 或任务计划程序定义中。解析值绑定到配置的网关源，并且不会跨重定向遵循。 OpenClaw 在解析明文 `http://` 或 `ws://` 路由之前拒绝该对；无凭证环回和专用网络明文行为保持不变。

### <a id="start-a-node-host-(foreground)"></a><a id="start-a-node-host-foreground"></a> 启动 node 主机（前台）

在 node 机器上：

```bash
openclaw node run --host <gateway-host> --port 18789 --display-name "Build Node"
```

对于一次性粘贴设置，请从 Control UI 设备页面创建 **Node 主机** 设置链接，然后在节点计算机上运行其可复制命令：

```bash
openclaw node run --pair "oc-pair://<setup-code>"
```

该链接是一次性的，并在 10 分钟后过期。它提供端点、引导令牌、TLS 模式和证书引脚（如果可用）。显式网关标志覆盖相应的 `--pair` 值。管理员创建的引导注册会批准设备及其第一个声明的命令表面，包括声明时的 `system.run` 和 `system.which`。稍后的命令、能力或权限扩展仍会创建批准请求。网关命令策略和节点主机的 [exec 批准](/tools/exec-approvals) 仍然适用。本地执行批准默认为 `full` 和 `ask: "off"`；如果访问范围太广，请在使用链接之前配置它们。请参见 [ 节点配对 ](/gateway/pairing#one-paste-node-pairing)。

`node run` 还接受 `--pair`、`--context-path`（Gateway WS 上下文路径）、`--tls`、`--tls-fingerprint <sha256>` 和 `--node-id`（覆盖旧版客户端实例 ID；不会重置配对）。在 macOS 上，传递 `--share-installed-apps` 可公布 `device.apps`；默认不共享。使用 `--no-share-installed-apps` 可禁用之前保存的选择加入设置。

传递 `--session-host` 以启用此前台进程的工作托管，而无需更改保存的首选项。自动重新启动会保留此选择。

### <a id="remote-gateway-via-ssh-tunnel-(loopback-bind)"></a><a id="remote-gateway-via-ssh-tunnel-loopback-bind"></a> 通过 SSH 隧道连接远程 gateway（回环绑定）

如果 Gateway 绑定到回环地址（`gateway.bind=loopback`，本地模式下默认如此），远程 node 主机将无法直接连接。请创建 SSH 隧道，并将 node 主机指向隧道的本地端。

示例（node 主机 -> gateway 主机）：

```bash
# Terminal A (keep running): forward local 18790 -> gateway 127.0.0.1:18789
ssh -N -L 18790:127.0.0.1:18789 user@gateway-host

# Terminal B: export the gateway token and connect through the tunnel
export OPENCLAW_GATEWAY_TOKEN="<gateway-token>"
openclaw node run --host 127.0.0.1 --port 18790 --display-name "Build Node" --auth-from-env
```

注意：

- 重新连接到已保存的网关端点时使用配对的设备令牌，而不是来自另一个网关的环境凭据。
- `--auth-from-env` 显式选择 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`，包括存在配对令牌时。使用与 `openclaw node install` 相同的标志来为服务保留此选择。
- 如果没有配对，正常的 environment/config 身份验证仍然可用。有关优先级和 SecretRef 行为，请参阅 [ 节点主机身份验证](/cli/node#gateway-auth-for-node-host)。

### <a id="restrict-the-node-command-surface"></a> 限制节点命令面

将 `--commands <ids>` 传递到 `openclaw node run`、`openclaw node install` 或 `openclaw connect` 以仅通告精确命令 ID 的显式逗号分隔列表。例如，[Session Share](/plugins/session-share) 节点可以在不暴露执行或其他机器功能的情况下发布会话：

```bash
openclaw connect <join-url> --service \
  --commands openclaw.sessions.list.v1,openclaw.sessions.read.v1
```

该标志是可重复的。允许列表保存在节点的持久机器状态中，包括已安装的服务；在稍后启动时省略它会保留已保存的列表。该节点仅通告可用且列入白名单的命令以及其所需的功能。如果没有可用的请求命令，则启动失败。网关配对批准准确显示声明的命令；网关命令策略仍然适用于调用。

明确的白名单还会禁用计算机使用、技能扫描和发布、插件工具发布、MCP 服务器和工作人员托管。允许列表不会启用已禁用的插件或使不可用的命令可用。

在前台使用 `openclaw node run --all-commands` 或已安装服务的 `openclaw node install --force --all-commands` 恢复完整的默认表面。使用 `openclaw connect` 注册时，添加 `--all-commands` 和可选的 `--service`。这将永久删除已保存的允许列表并替换服务的 `--commands` 参数。请勿将 `--all-commands` 与 `--commands` 组合使用。

### <a id="start-a-node-host-(service)"></a><a id="start-a-node-host-service"></a> 启动 node 主机（服务）

```bash
openclaw node install --host <gateway-host> --port 18789 --display-name "Build Node"
openclaw node start
openclaw node restart
```

`node install` 还接受 `--context-path`、`--tls`、`--tls-fingerprint`、`--node-id`（仅限旧客户端实例 ID）、`--share-installed-apps` / `--no-share-installed-apps`、`--runtime <node|bun>`（默认值： `node`） 和 `--force` 重新安装。 Bun 需要具有 WAL- 重置安全 `node:sqlite` 的版本 1.4.3+，并且是明确的选择加入； Node 仍然推荐。还提供 `node status`、`node stop` 和 `node uninstall`。

对于 `npx openclaw node install` 或 `npx openclaw connect <join-url> --service`，OpenClaw 在写入服务之前将所选版本安装到 `<state-dir>/npm` 中。状态目录尊重 `OPENCLAW_STATE_DIR` 和配置文件。 launchd 和 systemd 在 npm 清除其 `_npx` 缓存后都运行持久包。安装会打印软件包版本、选择的运行时、服务命令和节点更新命令：

```bash
npx -y openclaw@latest node install --force
```

使用相同的配置文件和状态目录设置。将 `latest` 替换为 `beta` 或需要时的确切版本。这将安装到相同的托管前缀中，重写服务，并重用保存的配对。重新安装相同版本可修复丢失的包文件。它不会为每个版本累积一个目录。下面的自动节点运行时更新仍然独立于该 CLI 软件包。

Node 关闭等待插件可用性观察程序和活动计算机执行完成清理，并报告这些清理操作的失败。如果命令报告 `Node disconnect cleanup failed`，请重新连接节点以重试断开连接清理，然后再发送另一个命令。

### <a id="session-host-workspace-permissions"></a> 会话主机工作区权限

以 `--session-host` 启动的节点在公布会话容量之前检查工作区暂存。在 Unix 上，状态目录（`OPENCLAW_STATE_DIR` 或 `~/.openclaw`）及其解析的祖先必须满足文件系统所有者的检查。即使 `node-host` 目录本身是私有的，没有粘性保护的组或世界可写祖先也会阻止会话托管。

节点日志和 `environments.list` 确定有问题的目录和修复方法：在节点上运行 `chmod go-w '<reported-path>'`，然后重新启动节点主机。在更改共享目录权限之前检查它们；或者，将节点状态移动到私有目录下。 OpenClaw 不会更改祖先权限或绕过暂存检查。仍然支持受信任的粘性系统临时目录。

会话主机故障不会断开节点连接或禁用其桌面和其他可用命令。 `environments.list` 保持连接的节点可用，报告 `sessionHost: false` 和托管诊断，并拒绝会话放置，直到修复托管问题。

仅当网关通告 `node-worker-host-diagnostics-v1` 时才会发布禁用主机原因。较旧的网关仍然接收禁用的托管；节点日志保留原因。如果启动后权限发生更改，工作区传输也会报告相同的补救措施。

### <a id="automatic-node-updates"></a> 自动节点更新

打包的无头节点默认每小时在前台和服务模式下检查更新。他们准备一个单独的运行时，等待所有节点工作空闲，然后重新启动并使用相同的身份、配对和启动选项重新连接。节点更新不会替换全局 CLI 包或共置网关。自动激活间隔至少 12 小时，工作繁忙可能会无限期推迟更新。

在节点上设置 `nodeHost.autoUpdate.enabled: false` 以选择退出。共享的 `update.checkOnStart: false` 和 `OPENCLAW_NO_AUTO_UPDATE=1` 选择退出也适用。源签出、本机应用程序节点、私人工作人员、`dev` 和 `extended-stable` 安装不会自动应用。需要数据库迁移的版本遵循正常的更新工作流程。有关空闲工作规则和配置，请参阅 [ 无头节点更新 ](/install/updating/automatic-updates#headless-node-updates)。

### <a id="pair-%2B-name"></a><a id="pair-+-name"></a> 配对 + 命名

在网关主机上，批准设备请求：

```bash
openclaw devices list
openclaw devices approve <deviceRequestId>
```

如果节点使用更改后的认证详细信息重试，请重新运行 `openclaw devices list` 并批准当前的 `requestId`。

在设备审批等待期间，节点会不断重新连接，指数退避时间上限为 30 秒。批准后，其下一次重新连接会创建单独的命令面请求。在网关上：

```bash
openclaw nodes pending
openclaw nodes approve <nodeRequestId>
openclaw nodes describe --node <id|name|ip>
```

如果较旧的客户端已报告重新连接已暂停，请使用 `openclaw node restart` 重新启动已安装的节点，或停止并重新运行其前台 `openclaw node run` 命令一次。

设备和节点请求 ID 是不同的。初始未经批准的表面没有有效命令。 SSH-verified和bootstrap注册可以自动批准第一个表面；仅受信任网络设备批准并不能。以后的扩展需要批准，而先前批准的仍然声明和允许的命令仍然可以运行。 [Gateway 命令策略](/nodes/command-policy) 和节点本地执行批准仍然是单独的门。

命名选项：

- `openclaw node run` / `openclaw node install` 上的 `--display-name`（与客户端实例 ID 和网关连接元数据一起保留在共享 `nodeHost.config` SQLite 机器状态值中）。
- `openclaw nodes rename --node <id|name|ip> --name "Build Node"`（网关覆盖）。

### <a id="headless-identity-state"></a> 无头身份状态

无头节点在共享 SQLite 中保留三条独立的状态记录：

- `~/.openclaw/state/openclaw.sqlite`（`config_machine_state`，密钥 `nodeHost.config`）：客户端实例 ID、显示名称和网关连接元数据。
- `~/.openclaw/state/openclaw.sqlite`（`device_identities`，键 `primary`）：已签名的设备密钥对以及派生出的加密设备 ID。
- `~/.openclaw/state/openclaw.sqlite`（`device_auth_tokens`）：按加密设备 ID 和角色键控的已配对设备认证令牌。

对于已签名节点，Gateway 使用加密设备 ID 进行配对和节点路由。客户端实例 ID 仅是连接元数据。因此，更改 `--node-id` 或迁移已退役的 `node.json` 不会重置配对。有关受支持的撤销并重新配对流程以及升级说明，请参见[身份和配对状态](/cli/node#identity-and-pairing-state)。

已退役的 `identity/device.json` 和 `identity/device-auth.json` 文件是由 Doctor 管理的迁移输入。停止节点主机并运行 `openclaw doctor --fix`；Doctor 会在删除旧文件之前，将它们的行导入并验证到 SQLite 中。

无头节点和 macOS 应用程序工作线程在准备功能之前检查此状态。待处理的设备身份验证、执行批准或丢失的已存储身份以及已停用的身份数据需要 Doctor；启动会保留输入，并且不会创建替换密钥或导入执行策略。有效的存储身份优先于过时的 `identity/device.json` 数据。

## <a id="system-commands-(node-host-%2F-mac-node)"></a><a id="system-commands-node-host-/-mac-node"></a> 系统命令（node host / mac node）

macOS 节点和无头节点主机均公开 `system.run.prepare`、`system.run`、`system.which` 和 `system.execApprovals.get/set`； macOS 节点还公开 `system.notify`。

示例：

```bash
openclaw nodes notify --node <idOrNameOrIp> --title "Ping" --body "Gateway ready"
openclaw nodes invoke --node <idOrNameOrIp> --command system.which --params '{"bins":["git"]}'
```

注意：

- `system.run` 在有效负载中返回 stdout/stderr/exit 代码。
- Shell执行通过`exec`工具和`host=node`；单独的 `nodes.run` 执行路径已在 2026.3.31. 中删除，`nodes` 仍然是显式节点命令的直接 RPC 表面。
- `nodes invoke` 不会公开 `system.run` 或 `system.run.prepare`；它们仅保留在 exec 路径上。
- exec路径读取节点策略并准备`systemRunPlan`。 Full/off 执行可解析工作目录别名，而无需添加仅批准脚本检查。当调用者或节点策略需要批准绑定时，更严格的路径和脚本检查仍然存在。一旦获得批准，网关就会转发该存储的计划，而不是任何后来调用者编辑的 command/cwd/session 字段。
- `system.notify` 会遵循 macOS 应用中的通知权限状态；支持 `--priority <passive|active|timeSensitive>` 和 `--delivery <system|overlay|auto>`。
- 未识别的节点 `platform` / `deviceFamily` 元数据会使用保守的默认允许列表，其中排除 `system.run` 和 `system.which`。如果确实需要在未知平台上使用这些命令，请通过 `gateway.nodes.commands.allow` 显式添加。
- `system.run` 请求支持 `cwd`、`env` 映射、`timeoutMs` 和 `needsScreenRecording` —— 这些是由 exec 路径传递的请求负载字段（见上文），而不是 `nodes invoke` CLI 标志。
- 对于 Shell 包装器（`bash|sh|zsh ... -c/-lc`），请求作用域内的 `env` 值会被缩减为显式允许列表（`TERM`、`LANG`、`LC_*`、`COLORTERM`、`NO_COLOR`、`FORCE_COLOR`）。
- 对于允许列表模式下的始终允许决策，已知的分发包装器（`env`、`flock`、`nice`、`nohup`、`stdbuf`、`timeout`）会持久化内部可执行文件路径，而不是包装器路径。如果解除包装不安全，则不会自动持久化允许列表条目。
- 在处于允许列表模式的 Windows 节点主机上，通过 `cmd.exe /c` 运行 Shell 包装器需要审批（仅允许列表条目不会自动允许该包装器形式）。
- Node 主机忽略 `env` 对象中的 `PATH` 覆盖，并剥离大量维护的 interpreter/shell 启动变量（例如 `NODE_OPTIONS`、`PYTHONPATH`、`BASH_ENV`、 `DYLD_*`、`LD_*`）在运行命令之前。如果您需要额外的PATH条目，请配置节点主机服务环境（或在标准位置安装工具），而不是通过`env`传递`PATH`。
- 在 macOS 节点模式下，`system.run` 受 macOS 应用中的 exec 审批控制（设置 → Exec approvals）。Ask/allowlist/full 的行为与无头节点主机相同；被拒绝的提示会返回 `SYSTEM_RUN_DENIED`。
- 在无头节点主机上，`system.run` 受本地 SQLite exec approvals 行控制；具体 macOS 情况请参阅下方[无头节点主机](#headless-node-host-cross-platform)中的 exec 主机路由环境变量。

## <a id="headless-node-host-(cross-platform)"></a><a id="headless-node-host-cross-platform"></a> 无界面节点宿主（跨平台）

OpenClaw 可以运行一个 **无界面节点宿主**（无 UI），它连接到 Gateway WebSocket 并暴露 `system.run` / `system.which`。这在 Linux/Windows 上很有用，或者可用于在服务器旁运行一个最小节点。

启动它：

```bash
openclaw node run --host <gateway-host> --port 18789
```

注意：

- 仍需要设备配对和命令界面批准；按照 [Pair + name](/nodes/node-host#pair-+-name) 完成这两个阶段。
- 客户端实例元数据、已签名的设备身份以及配对认证使用独立的状态记录；请参见 [无界面身份状态](#headless-identity-state)。
- 执行审批会在本地强制执行，位于 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config`（参见 [执行审批](/tools/exec-approvals)）。
- 在macOS上，无头节点主机默认在本地执行`system.run`。将 `OPENCLAW_NODE_EXEC_HOST=app` 设置为需要配套应用程序执行主机，没有本地回退。 `OPENCLAW_NODE_EXEC_FALLBACK` 不改变当前路由。
- 当 Gateway WS 使用 TLS 时，添加 `--tls` / `--tls-fingerprint`。

## <a id="mac-node-mode"></a> Mac 节点模式

- macOS 菜单栏应用作为节点连接到 Gateway WS 服务器（因此 `openclaw nodes …` 可以作用于这台 Mac）。
- 在远​​程模式下，应用程序为网关端口打开 SSH 隧道并连接到 `localhost`。

## <a id="existing-folder-session-consent"></a> 现有文件夹会话同意

`nodeHost.workerRuns.folders` 是现有目录根的节点本地数组。未设置时，允许任何现有目录，但文件系统根目录和与私有工作存储重叠的目录除外。非空列表限制对这些根及其后代的访问； `[]` 显式禁用现有文件夹会话和功能广告，即使 `nodeHost.workerRuns.enabled` 为 true 时也是如此。在设备上配置限制，而不是在网关上：

```json5
{
  nodeHost: {
    workerRuns: {
      enabled: true,
      folders: ["~/src/tries"],
    },
  },
}
```

根目录和选定的文件夹接受绝对路径或前导 `~`。节点在每个操作上都通过 realpath 解析两者。设置限制时，所选目录必须保留在配置的根目录内；符号链接无法转义该根。文件、丢失的目录、文件系统根目录以及与 OpenClaw 的专用工作存储重叠的目录在每种模式下都会被拒绝。限制访问时，优先选择窄根目录而不是主目录。更改其本地配置后重新启动前台节点进程，以便其通告更新后的同意。

无限制的默认设置不会扩展现有会话主机 exec 信任边界：操作员已经可以在此设备上使用 exec 运行代理。此列表是网关会话请求的文件夹选择护栏，而不是执行沙箱或针对受损网关的边界。

现有文件夹会话保持固定到该设备。 OpenClaw 不会复制、协调、重置或删除选定的文件夹。 Worker HOME 和元数据使用私有节点存储。请参阅 [Session Hosting](/nodes/session-hosting) 了解运行时支持和新会话流程。
