---
summary: "`openclaw node` 的 CLI 参考（无头节点主机）"
read_when:
  - "运行无头节点主机"
  - "为 system.run 配对非 macOS 节点"
title: "Node"
---

# `openclaw node`

运行 **无头节点主机**，该主机连接到网关 WebSocket 并默认在此计算机上公开 `system.run` / `system.which`。使用 `--commands` 限制通告的表面，例如只读会话共享。

在 macOS 上，菜单栏应用已经将此节点主机运行时嵌入到其自身的节点连接中，并添加了原生 Mac 能力。仅当你有意想要一个不带应用的无头节点时， 才在 Mac 上使用 `openclaw node run`。同时运行两者会为同一台机器创建两个节点身份。

## <a id="why-use-a-node-host%3F"></a><a id="why-use-a-node-host"></a> 为什么使用节点主机？

当你希望代理在**其他机器上运行命令**，而无需在那里安装完整的 macOS 配套应用时， 就可以使用节点主机。

常见用例：

- 在远程 Linux/Windows 机器上运行命令（构建服务器、实验室机器、NAS）。
- 将 exec **限制在 Gateway 的沙箱中**，但把已批准的运行委派给其他主机。
- 为自动化或 CI 节点提供轻量级、无头的执行目标。

执行仍受 **exec 批准** 和节点主机上每个代理的允许列表保护， 因此你可以保持命令访问范围明确且受控。

`openclaw node run` 连接后可以发布插件或 MCP- 支持的工具。默认情况下，网关信任来自配对节点的描述符，同时要求每个描述符的命令保留在节点批准的命令表面中。代理将每个接受的描述符视为正常的插件工具，但执行仍然通过 `node.invoke`，因此断开节点会从新代理运行中删除该工具。网关操作员可以使用 `gateway.nodes.pluginTools.enabled: false` 禁用发布。

对于声明性 MCP 工具，请在节点计算机上的 `openclaw.json` 中的 `nodeHost.mcp.servers` 下添加正常的 MCP 服务器形状，然后重新启动节点主机。节点声明经过批准的`mcp.tools.call.v1`命令族，并在连接后发布列出的工具；稍后更改服务器列表不需要重新配对。请参阅 [ 节点托管的 MCP 服务器](/nodes/mcp-and-skills#node-hosted-mcp-servers)。

## <a id="browser-proxy-(zero-config)"></a><a id="browser-proxy-zero-config"></a> 浏览器代理（零配置）

如果节点上未禁用 `browser.enabled`，则 Node 主机会自动通告浏览器代理。这允许代理在该节点上使用浏览器自动化，而无需额外配置。

默认情况下，代理公开节点的正常浏览器配置文件表面。如果设置 `nodeHost.browserProxy.allowProfiles`，代理将受到限制：非允许的配置文件定位将被拒绝，并且永久配置文件 create/delete 路由将通过代理被阻止。

如有需要，可在节点上将其禁用：

```json5
{
  nodeHost: {
    browserProxy: {
      enabled: false,
    },
  },
}
```

## <a id="run-(foreground)"></a><a id="run-foreground"></a> 运行（前台）

如需一键完成引导，请使用 [`openclaw connect`](/cli/connect)。它接受一次性加入 URL 或与 `--pair` 相同的设置代码形式，然后运行此节点主机运行时。

```bash
openclaw node run --host <gateway-host> --port 18789
```

或者粘贴 Control UI 设备页面中的短期节点设置链接：

```bash
openclaw node run --pair "oc-pair://<setup-code>"
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--pair <code-or-url>`：从设置代码或 `oc-pair://` URL 读取 Gateway 端点、引导令牌、TLS 模式以及可选的证书固定值。显式的 Gateway 标志会覆盖 `--pair` 中的值。
- `--pair-if-needed <code-or-url>`：使用与 `--pair` 相同的端点选项，但更喜欢保存的设备令牌（如果存在）。主管可以在配对后重新启动相同的命令。不能与 `--pair` 组合使用。
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--context-path <path>`：网关 WebSocket 上下文路径 （e.g. `/openclaw-gw`）。附加到WebSocket URL。
- `--tls`：使用 TLS 进行网关连接
- `--no-tls`：即使本地 Gateway 配置启用了 TLS，也强制使用明文 Gateway 连接
- `--tls-fingerprint <sha256>`：期望的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖存储在共享 SQLite 状态中的客户端实例 ID（不会重置配对）
- `--display-name <name>`：覆盖节点显示名称
- `--session-host`：为此前台进程托管工作会话，而不更改已保存的工作托管首选项
- `--auth-from-env`：显式使用环境网关凭据而不是保存的配对凭据
- `--commands <ids>`：保留精确的逗号分隔命令白名单（可重复）；仅公布可用的匹配项及其所需的功能。禁用计算机使用、技能、插件工具、MCP 服务器和工作人员托管。省略该标志将保留已保存的列表。
- `--all-commands`：公布完整的默认命令界面并忘记任何已保存的 `--commands` 白名单。不能与 `--commands` 组合使用。
- `--share-installed-apps`：在 macOS 上，通过 `device.apps` 公布已安装的应用程序
- `--no-share-installed-apps`：禁用已安装的应用程序共享

## <a id="gateway-auth-for-node-host"></a> 节点主机的 Gateway 认证

`--pair` 首次连接使用 10 分钟一次性引导令牌。配对后，使用持久设备凭据重新连接。管理员创建的引导注册会批准设备及其第一个声明的命令表面，包括声明时的 `system.run`。后续的命令、能力或权限扩展仍然需要`openclaw nodes approve`。网关命令策略和节点主机的 [exec 批准](/tools/exec-approvals) 保持单独的门。本地执行批准默认为 `full` 和 `ask: "off"`；如果访问范围太广，请在使用设置链接之前配置它们。 `node install --pair` 故意不可用，因为短期承载设置链接不得保留在服务参数中。

对于托管前台进程，`--pair-if-needed` 在重新启动时重用本机设备令牌存储；它不保留单独的注册标记。保留节点状态目录。设置代码过期后，当其保存的身份和节点令牌存在并且每个选定的网关端点与保存的网关范围匹配时，节点仍然可以重新连接。过期的引导令牌永远不会发送。过期的设置代码无法注册新的状态目录或替换已撤销的设备令牌；需要时提供新代码。显式 `--pair` 仍拒绝过期的设置代码。

重新连接到保存的网关端点时，`openclaw node run` 和 `openclaw node install` 使用配对的设备凭据。来自 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`、配置 `env.vars`、状态目录 `.env` 或共置网关的 `gateway.auth.*` 的环境凭据不会覆盖该配对。配对服务安装不会将这些环境网关凭据保存在其服务环境中。

对于有意共享令牌或密码连接，请使用 `--auth-from-env`：

```bash
openclaw node run --auth-from-env
openclaw node install --auth-from-env --force
```

在运行这些命令之前，请为目标网关设置 `OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。安装命令保存选定的环境凭据和重新启动的显式标志。如果您想保留此覆盖，请在重新安装时重新应用该标志。当这替换可用的配对凭据时，启动会在警告中命名选定的环境变量，而不打印其值。

如果所选端点没有现有配对，则正常的 config/env 分辨率仍然可用（没有 `--token`/`--password` 标志）：

- 首先检查 `OPENCLAW_GATEWAY_TOKEN`／`OPENCLAW_GATEWAY_PASSWORD`。
- 否则，本地配置回退适用：`gateway.auth.token` / `gateway.auth.password`。
- 在本地模式下，节点主机不会故意继承 `gateway.remote.token`／`gateway.remote.password`。
- 如果配置回退选择未解析的 `gateway.auth.token` / `gateway.auth.password` SecretRef，则节点身份验证将停止，而不会回退到远程凭据。
- 在 `gateway.mode=remote` 中，远程客户端字段（`gateway.remote.token`／`gateway.remote.password`）也会根据远程优先级规则具备资格。
- Node 主机身份验证解析仅支持 `OPENCLAW_GATEWAY_*` 环境变量。
- A CWD `.env` 无法提供 `OPENCLAW_*` 变量；这些被工作区 dotenv 策略阻止。

保存的端点包括其主机、端口、TLS 模式和上下文路径。更改其中任何一个都会恢复正常的 config/env 身份验证分辨率。因此，节点可以在重新连接到不同的配对网关时与本地网关共享其状态目录，而无需在重新启动时发送本地网关的密码。

对于 Cloudflare Access 后面的网关，请在 `openclaw connect`、`openclaw node run` 或 `openclaw node install` 之前一起设置 `CF_ACCESS_CLIENT_ID` 和 `CF_ACCESS_CLIENT_SECRET`。该节点将 env SecretRefs 存储在其当前的 `gateway.cloudflareAccess.clientId` 和 `clientSecret` 连接键下。已安装的服务将值保留在托管服务环境文件中，而不是保留在服务参数或内联管理程序定义中。访问凭证需要HTTPS/WSS；明文 HTTP/WS 在 SecretRef 解析之前失败，而无凭证明文节点路由保持不变。请参阅无法托管节点的 [ 网关部署](/nodes/node-host#gateway-deployments-that-cannot-host-nodes)。

对于连接到明文 `ws://` 网关的节点，接受环回、私有 IP 文字、`.local` 和 Tailnet `*.ts.net` 主机。对于其他可信私有-DNS名称，设置`OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`；如果没有它，节点启动将停止并要求您使用 `wss://`、SSH 隧道或 Tailscale。这是进程环境选择加入，而不是 `openclaw.json` 配置密钥。当 `openclaw node install` 存在于安装命令环境中时，它会将其持久保存到受监督节点服务中。

## <a id="service-(background)"></a><a id="service-background"></a> 服务（后台）

将无头节点主机安装为用户服务（macOS 上的 launchd、Linux 上的 systemd、Windows 上的 Windows 任务计划程序）。

```bash
openclaw node install --host <gateway-host> --port 18789
```

选项：

- `--host <host>`：Gateway WebSocket 主机（默认：`127.0.0.1`）
- `--port <port>`：Gateway WebSocket 端口（默认：`18789`）
- `--context-path <path>`：网关 WebSocket 上下文路径 （e.g. `/openclaw-gw`）。附加到WebSocket URL。
- `--tls`：使用 TLS 进行网关连接
- `--no-tls`：即使本地 Gateway 配置启用了 TLS，也强制使用明文 Gateway 连接
- `--tls-fingerprint <sha256>`：期望的 TLS 证书指纹（sha256）
- `--node-id <id>`：覆盖存储在共享 SQLite 状态中的客户端实例 ID（不会重置配对）
- `--display-name <name>`：覆盖节点显示名称
- `--commands <ids>`：保留已安装服务的命令白名单（可重复），与 `node run` 具有相同的限制。
- `--all-commands`：公布完整的默认命令界面并忘记任何已保存的 `--commands` 白名单。不能与 `--commands` 组合使用。
- `--share-installed-apps`：在 macOS 上，通过 `device.apps` 公布已安装的应用程序
- `--no-share-installed-apps`：禁用已安装的应用程序共享
- `--runtime <node|bun>`：服务运行时（默认值：`node`）。 Bun 1.4.3+ 和 WAL- 重置安全 `node:sqlite` 是明确的选择加入； Node 仍然推荐。
- `--runtime-path <path>`：固定通过运行时功能检查的绝对 Node/Bun 可执行文件。
- `--auth-from-env`：保留环境网关凭据并在服务重新启动时显式选择它们
- `--force`：Reinstall/overwrite（如果已安装）

显式 pin 保存在机器状态元数据中，并在重新启动和强制重新安装时保留。更换为另一个`--runtime-path`，或使用`openclaw node install --runtime node --force`而不使用`--runtime-path`返回自动选择。不可用或不受支持的引脚会失败，而不是默默地选择另一个运行时。引用包含空格的路径。

将 `OPENCLAW_WRAPPER` 设置为可执行包装文件以使用它来代替选定的运行时和 CLI 入口点。包装器接收 `node run` 和连接参数；它必须启动 OpenClaw 并转发这些参数。

如果安装报告运行时检查失败，请检查错误中指定的可执行文件和工作目录。例如，用`runuser`切换用户时，首先切换到目标用户可以读取的目录。检查失败并不意味着安装的Node版本不受支持；升级建议是为缺少或不受支持的运行时保留的。

> **Linux（systemd用户服务）：**后运行`sudo loginctl enable-linger <user>`
> 安装。 `systemd --user` 毫不犹豫地在以下情况下拆除节点服务：
> 您的最后一个SSH会话结束，因此节点在注销后静默离线。
> 当检测到 linger 已禁用时，`openclaw node install` 会打印此警告。
> 已禁用。

管理服务：

```bash
openclaw node status
openclaw node start
openclaw node stop
openclaw node restart
openclaw node uninstall
```

使用 `openclaw node run` 作为前台节点主机（无服务）。要删除已保存的命令白名单，请在前台运行 `openclaw node run --all-commands`，或使用 `openclaw node install --force --all-commands` 重新安装服务。复位持久；替换服务参数不再带有 `--commands`。

服务命令接受 `--json` 以获得机器可读的输出。当未安装受管节点服务时，`node start` 和 `node restart` 打印安装提示并以非零值退出；首先运行 `openclaw node install`。停止缺失的服务仍然是一个成功的空操作。

节点主机重试网关重新启动并且网络在进程中关闭。如果网关报告终端 token/password/bootstrap 身份验证暂停，节点主机会记录关闭详细信息并以非零值退出，以便 launchd/systemd/Task 调度程序可以使用新的配置和凭据重新启动它。当设备配对等待期间，节点会以上限为 30 秒的指数退避保持重新连接，并在批准后自动连接。

## <a id="automatic-updates"></a> 自动更新

默认情况下，长时间运行的打包 `node run` 进程和已安装的节点服务每小时检查一次更新。新版本在单独的节点运行时中准备，保留全局 CLI 包和共置网关。激活会等到命令、终端、工作人员、插件工作、挂起的输出和清理空闲为止。然后，节点将以其现有身份、配对、设置和启动选项重新启动。自动激活间隔至少 12 小时；没有截止日期会打断繁忙的工作。

在节点机器上禁用此功能：

```bash
openclaw config set nodeHost.autoUpdate.enabled false
```

`update.checkOnStart: false` 和 `OPENCLAW_NO_AUTO_UPDATE=1` 还禁用节点自动更新。网关的 `update.auto.enabled` 首选项是单独的。源签出、本机应用程序节点、私人工作人员、`dev` 和 `extended-stable` 安装不会自动应用。需要数据库迁移的版本遵循正常的更新工作流程。请参阅 [ 无头节点更新 ](/install/updating/automatic-updates#headless-node-updates)。

## <a id="pairing"></a> 配对

第一次连接会在 Gateway 上创建一个待处理的设备配对请求（`role: node`）。

当网关主机可以通过 SSH 非交互方式连接到节点主机（同一用户、受信任的主机密钥）时，挂起的请求会自动批准：网关通过 SSH 在节点主机上运行 `openclaw node identity --json`，并在设备密钥完全匹配时批准。默认情况下此功能处于启用状态；请参阅 [SSH- 已验证设备自动批准 ](/gateway/pairing#ssh-verified-device-auto-approval-default) 了解要求以及如何禁用它 （`gateway.nodes.pairing.sshVerify: false`）。

否则，请通过以下方式手动批准：

```bash
openclaw devices list
openclaw devices approve <deviceRequestId>
```

设备批准允许连接；命令面需要单独批准。在设备审批等待期间，节点会不断重新连接，指数退避时间上限为 30 秒。批准后，其下一次重新连接会在网关上创建单独的命令面请求：

```bash
openclaw nodes pending
openclaw nodes approve <nodeRequestId>
openclaw nodes describe --node <idOrNameOrIp>
```

如果较旧的客户端已报告重新连接已暂停，请使用 `openclaw node restart` 重新启动已安装的节点，或停止并重新运行其前台 `openclaw node run` 命令一次。

设备和节点请求 ID 是不同的。初始未经批准的表面没有有效命令。 SSH-verified和bootstrap注册可以自动批准第一个表面；以后的扩建需要批准。在扩展等待期间，先前批准的仍然声明和允许的命令仍然有效。

查看 Gateway 用于验证的本地节点身份：

```bash
openclaw node identity --json
```

它从 `state/openclaw.sqlite` 中的 `primary` 行打印设备 ID 和公钥，并且从不创建数据库或新身份。

在严格控制的节点网络上，网关操作员可以明确选择自动批准来自可信 CIDR 的首次节点配对：

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

默认情况下这是禁用的（未设置 `autoApproveCidrs`）。它仅适用于来自 Gateway 信任的客户端 IP、且没有请求任何 scope 的全新 `role: node` 配对。Operator/browser 客户端、Control UI、WebChat，以及 role、scope、metadata 或 public-key 升级仍然需要手动批准。

可信网络设备批准并不批准节点的命令面。检查 `openclaw nodes pending` 并批准单独的表面请求。

如果节点在重试配对时认证细节发生变化（role/scopes/public key），先前的待处理请求会被取代，并创建新的 `requestId`。 在批准之前请再次运行 `openclaw devices list`。

### <a id="identity-and-pairing-state"></a> 身份和配对状态

无头节点将其客户端实例 ID 与 Gateway 用于配对和路由的已签名设备身份分开管理。这些状态保存在 OpenClaw 状态目录中（默认是 `~/.openclaw`，或者在设置了 `$OPENCLAW_STATE_DIR` 时使用该目录）：

| 状态                                                                   | 用途                                                                                                                          |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `state/openclaw.sqlite`（`config_machine_state`，密钥`nodeHost.config`） | 客户端实例 ID、显示名称以及 Gateway 连接元数据。客户端将此 ID 作为 `instanceId` 发送。                     |
| `state/openclaw.sqlite` (`device_identities`, `primary`)                | 已签名的 Ed25519 密钥对和派生的设备 ID。对于已签名连接，此设备 ID 即为路由中的节点 ID 和配对身份。 |
| `state/openclaw.sqlite` (`device_auth_tokens`)                          | 已配对的设备令牌，按加密设备 ID 和角色键入。                                                                 |

`node.list` 和 `node.describe` 中的 `gatewayLocal` 标记与网关状态目录中的主设备标识完全匹配。覆盖 `--node-id` 不会改变它。具有自己的状态目录和密钥的节点是独立的，即使在同一台机器上也是如此。列出或描述节点不会创建身份凭证。

`--node-id` 仅更改处于共享 SQLite 状态的客户端实例 ID。它不会更改加密设备 ID 或清除配对身份验证。将已退役的 `node.json` 迁移到 `openclaw doctor --fix` 同样不会重置配对。要撤销并重新配对节点：

1. 在 Gateway 上运行 `openclaw nodes remove --node <id|name|ip>`。
2. 在节点上，使用 `openclaw node restart` 重启已安装的服务，或者停止后重新运行前台的 `openclaw node run` 命令。这会启动设备配对流程。如果 `openclaw devices list` 没有显示请求，且节点报告 `AUTH_DEVICE_TOKEN_MISMATCH`，请再重启或重新运行一次。被拒绝的尝试会清除已被撤销的本地令牌；下一次尝试可以请求配对。
3. 在 Gateway 上运行 `openclaw devices list`，然后运行 `openclaw devices approve <deviceRequestId>`。
4. 等待节点自动重新连接，这将创建单独的命令面请求。如果旧客户端已暂停配对，请重新启动或重新运行一次。
5. 在 Gateway 上运行 `openclaw nodes pending`，然后运行 `openclaw nodes approve <nodeRequestId>`。

这两个请求 ID 不同。适用的可信 CIDR 策略可以自动批准首次设备配对步骤；命令面批准仍然是一项单独的检查。

较旧的 OpenClaw 释放 `node.json` 中存储的节点主机状态、`identity/device.json` 中的签名身份以及 `identity/device-auth.json` 中的配对身份验证。停止节点主机，运行一次`openclaw doctor --fix`； Doctor 验证已停用的输入，导入并验证其存储的 SQLite 行，然后删除旧文件。 Node 初创公司（包括 macOS 应用程序的工作人员）将这些输入留给 Doctor。待处理的设备身份验证或执行批准会在功能准备好之前停止启动。丢失的存储身份加上已停用的身份数据或中断的导入声明也会在创建新密钥之前停止启动。当旧版本重新创建 `identity/device.json` 时，现有的有效存储身份仍然具有权威性；医生负责清理陈旧文件。将 `state/openclaw.sqlite` 保密；它包含设备密钥对和身份验证令牌。

## <a id="exec-approvals"></a> Exec 批准

`system.run` 受本地 exec 批准控制：

- `$OPENCLAW_STATE_DIR/state/openclaw.sqlite#exec_approvals_config`, 或未设置该变量时使用 `~/.openclaw/state/openclaw.sqlite#exec_approvals_config`
- [执行批准](/tools/exec-approvals)
- 从网关检查 `openclaw approvals get --node <id|name|ip>` 或更换为 `openclaw approvals set --node <id|name|ip> --file <path>`；请参阅 [ 批准 CLI](/cli/approvals)。

对于批准的异步节点执行，OpenClaw 在提示之前准备 `systemRunPlan`。后来批准的 `system.run` 转发重用该存储的计划，因此在创建批准请求后对 command/cwd/session 字段的编辑将被拒绝，而不是更改节点执行的内容。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [连接机器](/cli/connect)
- [节点](/nodes)
