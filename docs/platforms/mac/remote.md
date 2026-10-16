---
summary: "用于控制远程 OpenClaw 网关的 macOS 应用程序流程"
read_when:
  - "设置或调试远程 Mac 控制"
  - "从 Mac 应用程序登录网关或从网站打开网关"
title: "远程控制"
---

此流程让 macOS 应用程序充当在另一台主机 （desktop/server） 上运行的 OpenClaw 网关的完全远程控制。该应用程序直接连接到受信任的 LAN/Tailnet 网关 URL，或在远程网关仅环回时管理 SSH 隧道。运行状况检查、语音唤醒转发和 WebChat 重复使用本机 **Connection** 窗口中的相同远程配置。

## <a id="connect-with-your-browser"></a> 与您的浏览器连接

添加已保存的网关以使用其仪表板和与您的个人帐户的本机聊天。此连接与拥有 Mac 节点功能和通话模式的主网关保持独立。

1. 首次启动时，选择 **连接到现有网关**。在已配置的应用程序中，打开 **Connection… → 网关 → 添加网关**。
2. 输入网关的地址，例如`gateway.example.com`或`https://gateway.example.com/operator/`。主机名默认为 HTTPS；当网关托管在网关下时，包括完整的基本路径。 **Name** 是可选的。
3. 单击**连接**。对于受 Cloudflare Access 保护的网关，该应用程序会打开您的默认浏览器。继续使用您用于该网关的帐户并完成那里的所有登录提示。如果没有出现浏览器，请在待登录中选择**打开浏览器**。这将恢复相同的登录尝试；它不会启动另一项。恢复操作正常启动您的默认浏览器，允许浏览器选择其配置文件，而不是重复使用不可见的自动化过程。在批准登录之前，请检查浏览器中显示的帐户。
4. 返回OpenClaw。保存的网关仪表板打开；检查侧边栏页脚中的帐户名称。您可以从 **File → New Gateway Window…** 或 **Gateways** 菜单打开更多窗口。该应用程序在重新启动后重新打开您选择的网关，包括当单独的主网关提供 Mac 功能时。

Cloudflare Access 通过其 [ 浏览器到客户端登录流程 ](https://developers.cloudflare.com/cloudflare-one/tutorials/cli/) 发出个人应用程序会话。 Mac 应用程序将该会话存储在钥匙串中，并将其用于保存的网关的本机连接和嵌入式仪表板。其有效性遵循 Access 管理员配置的会话持续时间。无需从网站复制共享网关令牌。

当 HTTPS 上嵌入的仪表板应用程序使用与网关相同的 Cloudflare 访问团队和帐户时，也可以登录。根据 WebKit 的规则，嵌入式应用程序还必须与网关位于同一站点上，因为 WebKit 会在框架内阻止其他站点的 cookie。其他网站会退回到该选项卡自己的登录链接。 OpenClaw 为每个应用打开相同的浏览器登录流程；现有的浏览器会话可以自动完成该往返。每个应用程序都会收到自己的应用程序 cookie。 Cookie 仅限于网关的确切来源和 HTTPS 端口 443 上经过验证的嵌入式应用程序来源。嵌入式会话在应用程序重新启动时持续存在，直到它们过期并在您注销或更改帐户时被删除。

浏览器登录目前支持Cloudflare访问。对于使用共享令牌或密码的网关，请展开 **Token 或密码** 并提供管理员提供的凭据。此流程不支持其他浏览器登录提供商。通过此编辑器，现有专用网络 `ws://` 和安全 `wss://` 连接仍然可用。

已登录的本地运营商设备可能仍需要网关上的一次性批准。网关现有的 [ 自动设备批准策略 ](/gateway/trusted-proxy-auth#automatic-device-approval) 确定经过验证的代理身份是否可以自动注册。

当 OpenClaw 处于活动状态并且您在场时，它会自动更新会话生命周期最后四分之一（至少 15 分钟，最多 7 天）内使用的已保存网关的浏览器登录；失败的尝试在该窗口的一半后重试，最多每天一次。可能会打开默认浏览器以完成登录。更新同一帐户会悄悄地重新连接本机连接并保持当前仪表板不变；失败的自动尝试会使现有会话可用，直到其过期。

当浏览器会话过期时，打开保存的网关会显示登录页面并开始在浏览器中登录。启动时恢复的窗口等待您选择 **再次登录**。您还可以在 **Connection… → Gateways** 中为已保存的网关选择 **Reconnect**，然后选择 **Connect**。会话生命周期是由 Access 管理员配置的 Cloudflare Access 应用程序的会话持续时间。续订同一帐户会保留其本机聊天缓存和排队消息。使用其他帐户登录会关闭先前帐户的本机聊天窗口并使用该帐户自己的缓存和队列。之前排队的消息仍保留在其原始帐户中；重新登录该帐户以访问它们。

**打开浏览器** 操作仅在其登录处于活动状态时可用。取消、关闭登录或更改已保存的网关会使其失效。超时后，重新开始登录。命令行登录还会在本机窗口中呈现此恢复操作；关闭该窗口将取消挂起的命令。

要在 Mac 应用程序中注销该网关，请将其从 **Connection… → Gateways** 中删除，然后确认 **Remove**。这将删除其保存的凭据和仪表板浏览器数据。使用身份提供商的会话控制来更广泛地撤销帐户访问权限。

如果您拒绝或取消钥匙串访问请求，自动网关刷新将停止请求访问该应用程序会话的其余部分。保存的凭据保留在钥匙串中。选择**Connect**或**Reconnect**重试；重新启动应用程序也允许新的请求。

### <a id="open-the-mac-app-from-a-website"></a> 从网站打开 Mac 应用程序

在浏览器仪表板中，打开 **从帐户菜单中获取应用程序**，然后选择 **在 macOS 卡上的 Mac 应用程序中打开**。该链接使用所连接网关的 HTTPS 地址。 OpenClaw 显示 **Add Gateway** 并填写该地址；查看它并单击 **Connect** 以完成相同的登录流程。

网站可以使用注册的 `openclaw` URL 方案启动此编辑器：

```text
openclaw://gateway/add?url=https%3A%2F%2Fgateway.example.com%2Foperator%2F&name=Research
```

`url` 是必需的，包含百分比编码的完整 HTTPS 网关基础 URL，包括需要时的端口和基础路径。 `name` 是可选的显示标签。该链接仅携带连接意图：它不接受令牌、密码、URL 用户信息、查询或网关地址中的片段，并且不授权访问。凭据在登录过程中单独获取。

现有的 `openclaw://gateway?host=…` 设置路由保留其主网关设置行为。使用 `openclaw://gateway/add` 添加已保存的网关，而无需替换主连接。

## <a id="modes"></a> 模式

- **本地（这台 Mac）**：所有内容都在笔记本上运行；不涉及 SSH。
- **通过 SSH 进行远程（默认）**：OpenClaw 命令在远程主机上运行。该应用程序打开与 `-o BatchMode`、您选择的 identity/key 和本地端口转发的 SSH 连接。
- **远程直连（ws/wss）**：无SSH隧道；该应用程序直接连接到网关 URL（LAN、Tailscale、Tailscale 服务或公共 HTTPS 反向代理）。

## <a id="remote-transports"></a> 远程传输

- **SSHtunnel**：使用`ssh -N -L ...`将网关端口转发到本地主机。网关将节点的 IP 视为 `127.0.0.1`，因为隧道是环回的。
- **Direct （ws/wss）**：直接连接到网关 URL。网关看到真实客户端 IP。

应用会为其自身的 SSH 进程禁用 SSH 连接复用和认证后的后台运行，这样即使所选别名启用了 `ControlMaster` 或 `ForkAfterAuthentication`，它也能监控并重启确切的进程。

默认情况下，SSH 主机密钥验证很严格，因为网关凭据通过此隧道传输。要选择托管 SSH 别名自己的信任行为，请通过 `openclaw-mac primary set` 设置 `--ssh-host-key-policy openssh`，或直接将 `gateway.remote.sshHostKeyPolicy` 设置为 `"openssh"`。选择加入之前，请检查别名和任何匹配的 `Host *` 或系统配置。更改 SSH 目标（在应用程序中或通过 `openclaw-mac`）会将策略重置回 `strict`，除非您再次明确选择加入新目标。

在 SSH 隧道模式下，您配置的 SSH 目标保存为 `gateway.remote.sshTarget`。该应用程序将 `gateway.remote.url` 保留在本地隧道端点（例如 `ws://127.0.0.1:18789`）上，因此 CLI、WebChat 和本地节点主机服务都使用相同的环回传输。当您希望配置的目标跟随地址更改时，请使用受信任的 Tailscale、MagicDNS 或 LAN 主机名。 Discovery 不会替换该目标或提供其 SSH 端口或 CLI 路径。 `gateway.remote.url`中的端口属于SSH隧道； `gateway.port` 仅控制在此 Mac 上运行的网关。如果本地隧道端口与远程网关端口不同，请将`gateway.remote.remotePort`设置为远程主机上的端口。

Mac 应用程序的节点将本机功能与来自其捆绑的私人工作人员的系统、浏览器、插件、技能和 MCP 命令相结合。将应用程序连接到远程网关不需要在此 Mac 上安装外部 CLI 或单独的节点服务。已安装的无头节点服务保持独立：应用程序保留其 start/stop 和托管 update/recovery 行为。可选的 [cookiesync](/platforms/macos#sync-cookies-to-a-remote-computer) 仍使用外部 CLI，并在缺少时报告特定于功能的错误。

## <a id="run-a-local-gateway-alongside-a-remote-primary"></a> 在远程主网关旁边运行本地网关

在 **Connection… → Connection** 中，选择 **Remote**，打开 **，同时在此 Mac** 上运行网关。该应用程序通过其常用的 launchd 代理启动并监督本地网关。托管网关的启动代理管理始终在此 Mac 上运行，即使主网关使用 SSH 也是如此。 **此Mac**出现在网关菜单、仪表板网关选择器、**文件→新网关窗口**和`openclaw-mac gateway list`中的主窗口之后。在任一网关上打开仪表板和聊天窗口。托管的本地条目无法成为目录中的主要条目。

主连接、SSH 隧道、菜单栏状态、该 Mac 的节点功能和通话模式持续跟踪远程网关。暂停会停止本地托管；该切换是设备本地首选项，并且不添加 `openclaw.json` 密钥。 `openclaw-mac status --json` 报告本地托管状态、端口和进程状态。

`gateway.port` 是本地网关的绑定端口。 `gateway.remote.url`中的环回端口是SSH隧道的本地端口，`gateway.remote.remotePort`选择远程主机上的目的端口。没有显式远程端口设置的旧版 SSH 配置将保留其共享端口默认值，直到启用托管为止。托管修复首先在远程设置中记录隧道和目标端口，然后分离冲突的本地绑定端口并清除冲突的旧端口首选项。它使用默认本地端口（18789 或配置文件默认端口），或者当该默认端口也是隧道端口时使用相邻端口。连接窗口报告此一次性修复；远程连接保留其现有端口。已保留旧端口的命名配置文件必须重新启动才能启用托管。如果选择的本地端口被其他监听占用，则解决显示的冲突；该应用程序不会选择随机的本地网关端口。

`openclaw` CLI（包括由托管网关启动的 shell 中的命令）继续以远程主网关为目标。要显式访问本地网关，请使用其自己的凭据和连接中显示的端口：

```bash
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789 \
OPENCLAW_GATEWAY_TOKEN="<local-gateway-token>" \
openclaw health
```

当启用本地网关 TLS 时，使用 `wss://`。该应用程序通过现有的网关安装程序设置缺少本地身份验证；它不会将该凭证导出到代理 shell 环境中。

## <a id="prereqs-on-the-remote-host"></a> 远程主机前置条件

1. 使用`npm install -g openclaw@latest --allow-scripts=openclaw`安装打包的OpenClaw CLI（在npm 11.15及更早版本上省略`--allow-scripts=openclaw`）。
2. 将 `openclaw` 放在 PATH 上以获得非交互式 shell（如果需要，符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`）。
3. 对于 SSH 传输：设置基于密钥的 SSH 身份验证。建议使用 Tailscale IP，以实现 LAN 之外的稳定可达性。

## <a id="macos-app-setup"></a> macOS 应用设置

使用捆绑的 `openclaw-mac` 命令从终端或通过 SSH 检查或更改正在运行的应用程序的连接。该应用程序的 CLI 安装程序将其链接到其配置文件管理的 `openclaw` 命令旁边。您也可以直接拨打`/Applications/OpenClaw.app/Contents/MacOS/openclaw-mac`。

检查主连接、保存的网关和应用程序版本：

```bash
openclaw-mac status --json
openclaw-mac primary show
openclaw-mac gateway list
```

通过 SSH 配置主网关：

```bash
openclaw-mac primary set \
  --ssh-target user@gateway-host \
  --local-port 18789 \
  --remote-port 18789 \
  --token-file /path/to/gateway-token
```

或者直接连接到受信任的 LAN 或 Tailnet 端点：

```bash
openclaw-mac primary set \
  --direct-url ws://192.168.0.202:18789 \
  --token-file /path/to/gateway-token
```

应用程序应用更改并根据需要重新启动其主连接和 SSH 隧道。更改目标会清除之前的 SSH 身份、远程项目根目录和远程 CLI 路径；为新目标上的 SSH 身份提供 `--identity /path/to/key`。主机密钥验证默认为`strict`；仅将 `--ssh-host-key-policy openssh` 用于您接受其 OpenSSH 信任策略的别名。使用 `primary set --local` 作为此 Mac 上的网关，或使用 `primary clear` 将主连接返回到其未配置状态。保存的网关与此主连接保持分离。

### <a id="add-and-manage-saved-gateways"></a> 添加和管理已保存的网关

对于受 Cloudflare Access 保护的网关：

```bash
openclaw-mac gateway add Research \
  --url https://gateway.example.com/operator/ \
  --browser
```

该命令将 `Complete sign-in in your browser…` 打印到 stderr 并等待应用程序运行其捆绑的浏览器登录帮助程序。在 Mac 的默认浏览器中完成身份验证。该请求将保持打开状态，直到登录成功、失败或达到帮助程序的 300 秒限制。成功后，该命令会报告已保存的网关及其身份主题和到期时间。 SSH 会话可以启动此流程，但浏览器交互仍然发生在 Mac 上。

对于使用共享令牌的网关，将 `--browser` 替换为 `--token-file /path/to/gateway-token`；密码使用 `--password-file /path/to/gateway-password`。与网关选项卡相同的 URL 验证适用，包括公共主机的安全 `wss://`。 Token/password 添加等待请求超时内的连接尝试；如果失败，配置文件将保持保存状态，并且命令退出并显示代码 `0`，报告 `disconnected` 并显示已清理的错误。

```bash
openclaw-mac gateway reconnect Research
openclaw-mac gateway remove Research --yes
```

重新连接更新浏览器配置文件的浏览器身份验证并重新连接 token/password 配置文件。删除注销并删除应用程序保存的凭据和仪表板浏览器数据。命令接受精确的网关 ID 或唯一的不区分大小写的名称；不明确的名称会产生列出候选者的错误。如果没有`--yes`，则在交互式终端中删除询问一次；非交互式删除需要 `--yes`。

### <a id="secrets%2C-profiles%2C-and-app-launch"></a><a id="secrets-profiles-and-app-launch"></a> 秘密、配置文件和应用程序启动

在 `primary set` 和 `gateway add` 上，仅使用 `--token-file`、`--token-stdin`、`--password-file` 或 `--password-stdin` 传递机密。 File/stdin 输入被读取一次，并删除尾随换行符。将凭证文件保密。新命令拒绝 `--token` 和 `--password` 以保密进程参数。状态和保存的网关输出从不包含凭据。

每个命令（包括离线 `configure-remote` 和旧版 `connect`/`wizard`）首先使用 `--profile <name>`，然后是 `OPENCLAW_PROFILE`，最后是默认配置文件。使用 `--profile default` 覆盖命名环境配置文件。配置文件名称遵循应用程序的验证规则。例如：

```bash
openclaw-mac --profile research status --json
openclaw-mac --no-launch status --json
```

CLI 在需要时在后台启动其包含的应用程序包，然后回退到 `/Applications/OpenClaw.app`。使用 `--no-launch` 来要求已运行的应用程序。 `--timeout <ms>` 边界等待应用程序和操作。默认值为 15 秒，对于 `gateway add` 和 `gateway reconnect` 为 310 秒，以便完成浏览器登录。全局标志可以出现在命令之前或之后； `--profile` 优先于环境。控制套接字遵循应用程序配置文件：`~/.openclaw/mac-control.sock` 表示默认配置文件，`~/.openclaw-<name>/mac-control.sock` 表示命名配置文件。 `OPENCLAW_STATE_DIR`和`OPENCLAW_CONFIG_PATH`不重新定位它。

使用 `--json`，成功的命令将请求的结果打印到标准输出。失败将 `{ "ok": false, "error": { "code": "…", "message": "…" } }` 打印到 stderr。退出代码为 `0` 表示成功，`1` 表示使用错误，`2` 表示应用程序无法访问，`3` 表示操作失败。

### <a id="offline-preconfiguration"></a> 离线预配置

保留 `configure-remote`，以便在应用程序启动之前准备主要连接。它直接写入配置和应用程序默认值；它无法管理已保存的网关或重新启动正在运行的应用程序的连接。应用程序运行时首选 `primary set`。

```bash
openclaw-mac configure-remote \
  --ssh-target user@gateway-host \
  --local-port 18789 \
  --remote-port 18789 \
  --token-file /path/to/gateway-token
```

旧版 `connect`、`wizard` 和 `configure-remote` 命令按以下顺序解析配置：`OPENCLAW_CONFIG_PATH`，然后是 `$OPENCLAW_STATE_DIR/openclaw.json`，然后是所选配置文件的配置：`~/.openclaw-<name>/openclaw.json`（对于命名配置文件）或 `~/.openclaw/openclaw.json`（对于默认配置文件）。显式 config/state 路径会覆盖配置文件的配置位置，但不会更改其应用程序默认套件。使用命名配置文件，`configure-remote` 仅写入 `ai.openclaw.mac.profile.<name>`，由发布和调试应用程序包共享。默认配置文件保留 `ai.openclaw.mac` 和 `ai.openclaw.mac.debug` 套件。例如，`openclaw-mac configure-remote --profile research --direct-url wss://gateway.example.com` 仅预配置研究配置文件，除非设置了显式 config/state 路径。 `configure-remote` 支持 SSH 和 `--direct-url` 传输，标记载入完成，并让应用程序在下次启动时使用选定的传输。其端口默认为 `18789`。其他选项包括 `--identity`、`--ssh-host-key-policy`、`--project-root`、`--cli-path` 和 `--json`。使用 `--token-file PATH` 或 `--token-stdin` 以及 `--password-file PATH` 或 `--password-stdin` 传递凭据。输入被读取一次并删除尾随换行符；标准输入只能提供一个秘密。将凭证文件保密。其遗留的 `--token`/`--password` 参数仍然受 stderr 上的弃用警告支持，因为它们通过进程参数公开凭据。每个秘密选择一个来源；将其旧参数与 file/stdin 输入相结合将被拒绝。运行 `configure-remote --help` 以获得完整参考。

### <a id="configure-in-the-app"></a> 在应用程序中配置

也可以通过 UI 进行配置：

1. 从菜单栏中选择**Connection…**，然后选择**Connection**选项卡。
2. 在**OpenClaw下运行**，选择**远程（另一台主机）**打开**连接到网关**。如果您已使用远程网关，请选择 **更改连接…**。选择 **Nearby Gateways** 行将打开相同的编辑器。该列表只是一个提示：它不会填写广告地址、SSH 目标或证书 pin，也不会更改您保存的连接。
3. 通过您信任的来源从网关所有者处选择连接并提供详细信息：
   - **网关地址或设置代码**：将可信的URL（例如`wss://gateway.example.ts.net`）或设置代码粘贴到**地址或设置代码**中。 Local/LAN `ws://` URL 仍受支持。
   - **SSH 隧道**：输入 **SSH 目标** 作为 `user@host`（可选 `:port`）和**远程主机上的网关端口**。在**SSH详细信息**下，可以设置**身份文件**、**项目根**和**CLI路径**。 Discovery 不提供这些值。
4. 根据需要输入目标的 **网关令牌** 或 **网关密码**。更改目标会清除表单保存的凭据。仅当该路由已具有设备配对、不需要共享凭据或设置代码包含普通网关凭据时，才将这两个字段保留为空。
5. 选择**保存连接**以应用连接。 **Cancel** 保持已保存的连接不变。保存失败会使编辑器保持打开状态并显示错误。
6. 选择**Test**检查保存的连接。应用程序在适用时检查 SSH 的可达性，然后进行身份验证并调用网关运行状况 RPC。连接、身份验证和配对错误出现在此处；此检查不需要此 Mac 上的 CLI。运行状况检查和 WebChat 自动使用保存的传输。

设置代码会自动导入其地址和任何提供的 TLS 证书密码；普通设置不需要您输入证书指纹。此编辑器不会兑换安装代码的一次性引导令牌。对于令牌或密码身份验证，请使用普通网关凭据。如果较旧的代码缺少自签名证书所需的 PIN，请向所有者请求带有 PIN 的新代码，使用受信任的 HTTPS 端点（例如 Tailscale Serve），或使用 SSH。附近的列表无法提供缺失的信任。

现有配置的连接在升级时保持不变。此设置流程不需要 Mac 应用程序和网关具有相同的发行版本；他们的网关协议和您使用的功能必须仍然兼容。应用程序启动环境中的显式 `OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD` 值继续覆盖表单的凭据。在连接到不同的网关之前更新该环境。

直接连接不再使用发现的 SSH 详细信息进行静默节点配对批准；使用现有的审批面板。这不会撤销现有的配对。配置的 SSH 连接和应用程序自己的本地节点保留其现有的批准策略。

<a id="web-chat" />

## WebChat

- **SSH隧道**：通过转发的WebSocket控制端口（默认18789）连接到网关。
- **Direct （ws/wss）**：直接连接到配置的网关 URL。
- 没有单独的WebChat HTTP服务器。

## <a id="debug-connection-actions"></a> 调试连接操作

启用开发人员工具后，**Reset SSHtunnel** 仅适用于使用 SSH 的远程主节点。它停用现有隧道，解析当前主端点，并重新连接控制通道。直接 ws/wss 连接不使用 SSH 隧道。在重置过程中更改主连接会取消剩余的重置步骤。 **Restart Gateway** 仅当主网关在此 Mac 上本地运行时才可用。

**检查网关端口** 检查本地侦听器：使用时的 SSH 隧道以及应用程序托管的任何本地网关。对于正在运行的 SSH 隧道，诊断会检查其分配的端口，包括首选端口何时被占用以及 SSH 使用另一个本地端口。如果没有正在运行的隧道，诊断程序将检查配置的端口。直接远程主节点不需要本地侦听器，并且不会生成丢失本地端口警告。

## <a id="permissions"></a> 权限

- 远程主机需要与本地相同的 TCC 授权（Automation、Accessibility、屏幕录制、麦克风、语音识别、通知）。请在该机器上运行一次 onboarding 以授予这些权限。
- 节点通过 `node.list` / `node.describe` 公布其权限状态，以便代理了解可用内容。

## <a id="security-notes"></a> 安全说明

- 优先在远程主机上使用 loopback 绑定，并通过 SSH、Tailscale Serve 或受信任的 Tailnet/LAN 直连 URL 进行连接。
- 默认情况下，SSH 隧道要求目标主机密钥已经被信任。请先信任该主机密钥（将其添加到已配置的 known-hosts 文件中），或者为你接受其 OpenSSH 信任策略的受管别名显式设置 `gateway.remote.sshHostKeyPolicy: "openssh"`。
- 如果将 Gateway 绑定到非 loopback 接口，则需要有效的 Gateway 身份验证：token、密码，或使用 `gateway.auth.mode: "trusted-proxy"` 的具备身份感知能力的反向代理。
- Direct `wss://` 连接将一项证书策略应用于 operator/control 流量和 Mac 伴随节点。将 `gateway.remote.tlsFingerprint` 设置为显式引脚。如果没有，应用程序仅在正常 macOS 信任成功后才会记录首次使用 PIN。当替换证书通过同一主机和端口的 macOS 信任和主机名验证时，学习的引脚会自动更新。这包括自定义 CA- 受信任主机名和 Tailscale 服务、打开或切换到已保存的网关，以及网关重新启动或网络丢失后自动重新连接。拒绝的续订记录在通知级别，并在子系统 `ai.openclaw`、类别 `gateway.tls-repair` 下检查失败。
- 现有学习的钥匙串引脚（包括迁移的旧条目）使用此续订策略，无需选择加入或手动清理。 macOS 信任包括管理员安装的根；当您故意需要更窄的固定证书标识时，请配置 `gateway.remote.tlsFingerprint`。配置的引脚永远不会自动更新。不可信、过期或错误的主机替换将被拒绝，并且自签名端点仍然需要显式信任或配置的 pin。
- 参见 [安全](/gateway/security) 和 [Tailscale](/gateway/tailscale)。

## <a id="whatsapp-login-flow-(remote)"></a><a id="whatsapp-login-flow-remote"></a> WhatsApp 登录流程（远程）

- 在远程主机**上运行`openclaw channels login --channel whatsapp --verbose`**。使用手机上的 WhatsApp 扫描 QR。
- 如果认证过期，请在该主机上重新运行登录。健康检查会显示链接问题。

## <a id="troubleshooting"></a> 故障排查

仪表板错误页面显示尝试的地址，但没有嵌入凭据。对不可用的网关进行故障排除时，请检查主机、端口和路径。从菜单栏中选择 **Connection Settings...**，或 **Connection...**，以在不加载仪表板的情况下修复连接。

在登录、加载、启动恢复、注销和连接错误屏幕上，拖动空白背景以移动窗口。双击该背景可缩放窗口。状态文本和卡片内容保持可选状态，按钮保持正常操作。

| 症状                                          | 原因/修复                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exit 127` / 未找到                           | 对于非登录 shell，`openclaw` 不在 PATH 上。将其添加到 `/etc/paths`、您的 shell rc，或符号链接到 `/usr/local/bin`/`/opt/homebrew/bin`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 健康检查失败                              | 检查 SSH 可达性、PATH 以及 WhatsApp 通道是否已登录 （`openclaw status --json`）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| WebChat 卡住                                    | 确认网关正在远程主机上运行，​​并且转发的端口与网关WS端口匹配； UI 需要健康的 WS 连接。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Node IP 显示 `127.0.0.1`                        | 预计与 SSH 隧道一起使用。选择**更改连接…**，然后选择**网关地址或设置代码**，如果您希望网关看到真实客户端IP，请保存受信任的直接URL。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 仪表板可以工作，但 Mac 功能处于离线状态 | operator/control 连接正常，但伴随节点连接未连接或缺少其命令表面。打开菜单栏设备部分，检查Mac是否为`paired · disconnected`。直接 `wss://` 操作员和节点连接使用相同的配置或存储的证书策略。对于任何具有主机名有效、macOS- 可信替换证书的 `wss://` 端点，过时的学习叶引脚将在证书轮换后替换并自动重试。配置的引脚永远不会自动旋转；检查新证书后更新 `gateway.remote.tlsFingerprint`，或通过 SSH**切换到**Remote。 |
| 语音唤醒                                       | 触发短语在远程模式下会自动转发；不需要单独的转发器。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## <a id="notification-sounds"></a> 通知声音

使用 `openclaw nodes notify` 从脚本中为每条通知选择声音，例如：

```bash
openclaw nodes notify --node <id> --title "Ping" --body "Remote gateway ready" --sound Glass
```

应用中没有全局默认声音开关；调用方需要为每次请求单独选择声音（或不选择）。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [远程访问](/gateway/remote)
