---
summary: "Gateway 服务、生命周期和运维手册"
read_when:
  - "运行或调试网关进程"
title: "Gateway 手册"
---

使用此页面一天 -1启动和日-2网关服务的操作。

<CardGroup cols={2}>
  <Card title="深度故障排除" icon="siren" href="/gateway/troubleshooting">
    以症状为先的诊断，包含精确的命令梯子和日志特征。
  </Card>
  <Card title="配置" icon="sliders" href="/gateway/configuration">
    面向任务的设置指南 + 完整配置参考。
  </Card>
  <Card title="密钥管理" icon="key-round" href="/gateway/secrets">
    SecretRef 合约、运行时快照行为和 migrate/reload 操作。
  </Card>
  <Card title="秘密计划合同" icon="shield-check" href="/gateway/secrets-plan-contract">
    确切的 `secrets apply` target/path 规则和仅引用身份验证配置文件行为。
  </Card>
</CardGroup>

## <a id="5-minute-local-startup"></a> 5 分钟本地启动

<Steps>
  <Step id="start-the-gateway" title="启动网关">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step id="verify-service-health" title="验证服务健康状况">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

健康基线：`Runtime: running`、成功的连接检查以及符合您预期的 `Capability` 线路。使用 `openclaw gateway status --require-rpc` 进行读取范围 RPC 证明，而不仅仅是可达性。

  </Step>

  <Step id="validate-channel-readiness" title="验证渠道准备情况">

```bash
openclaw channels status --probe
```

通过可访问的网关，可以实时运行每个帐户的通道检查和可选的审核。如果网关无法访问，CLI 将回退到仅配置通道摘要。

  </Step>
</Steps>

<Note>
网关配置重载会监视当前活动配置文件路径（从 profile/state 默认值解析而来，或在设置了 `OPENCLAW_CONFIG_PATH` 时使用该路径）。默认模式是 `gateway.reload.mode="hybrid"`。在首次成功加载后，运行中的进程会提供当前的内存中配置快照；一次成功的重载会原子性地替换该快照。
</Note>

## <a id="runtime-model"></a> 运行时模型

- 一个始终运行的进程，用于路由、控制平面和通道连接。
- 单一复用端口用于：
  - WebSocket control/RPC
  - HTTP API（`/v1/models`、`/v1/embeddings`、`/v1/chat/completions`、`/v1/responses`、[`/tools/invoke`](/gateway/tools-invoke-http-api)）
  - 插件 HTTP 路由，例如可选的 `/api/v1/admin/rpc`
  - Control UI 和挂钩
- 默认绑定模式：`loopback`。在检测到容器环境时，实际默认值为 `auto`（会解析为 `0.0.0.0`，用于端口转发），除非 Tailscale serve/funnel 处于活动状态，此时始终强制为 `loopback`。
- 默认需要认证。共享密钥配置使用 `gateway.auth.token` / `gateway.auth.password`（或 `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`），非 loopback 的反向代理配置可以使用 `gateway.auth.mode: "trusted-proxy"`。

### <a id="module-compile-cache"></a> 模块编译缓存

网关主线程在没有 Node 的磁盘模块编译缓存的情况下运行。 Node 同步刷新缓存的字节码，这可能会在启动或关闭期间停止事件循环。这将主线程缓存重用换成了响应式生命周期处理。网关工作进程和子进程保留缓存并在自己的线程上刷新其启动和新加载的数据库操作模块。

缓存条目位于发布目录之外，默认情况下位于操作系统的临时目录下。将 `NODE_COMPILE_CACHE` 设置为可写持久根，以在主机重新启动时保留工作缓存。 OpenClaw 命名空间，按包版本和构建标识进行根划分；每个新构建都以自己的缓存开始。 `NODE_DISABLE_COMPILE_CACHE=1` 禁用网关及其工作线程的缓存。不可用的缓存会产生诊断并继续启动。

继承的活动缓存需要启动重生以使主线程不被缓存；具有 `execve` 的平台保留服务 PID。 Node 的权限模型保留了已经活动的调用者缓存，因为它可能会禁止进程替换。一次性命令通过 `NODE_COMPILE_CACHE` 保持缓存选择加入；显式释放预热仍会填充缓存。请参阅 [ 编译缓存环境策略](/help/environment#temporary-compile-cache)。

部署系统可以在切换之前通过使用隔离状态、环回端口、运行时用户和相同的缓存根来启动和干净地停止候选者的工作缓存，从而预热候选者的工作缓存。在其最终释放路径上对其进行加热：在加热后移动释放可以防止 Node 重复使用其条目。最近的构建缓存共存，包括服务版本和准备好的候选版本。分离清理的目标是组合缓存中的 512 个 MiB 和 4,096 个文件，使超过 7 天的字节码过期，并在短命令退出后继续。大量的积压工作在有界通道上被修剪；参见[维护政策](/help/environment#temporary-compile-cache)。

## <a id="openai-compatible-endpoints"></a> OpenAI- 兼容端点

OpenClaw 支持这些广泛使用的 API 端点：

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

这个集合的重要性在于：

- Most Open WebUI、LobeChat 和 LibreChat 集成首先检查 `/v1/models`。
- 许多 RAG 和 memory 流水线期望有 `/v1/embeddings`。
- 原生 agent 客户端越来越倾向于 `/v1/responses`。

`/v1/models` 采用 agent 优先模式：它会为每个已配置的 agent 返回 `openclaw`、`openclaw/default` 和 `openclaw/<agentId>`。`openclaw/default` 是稳定别名，始终映射到已配置的默认 agent。需要后端 provider/model 覆盖时，请发送 `x-openclaw-model`；否则，所选 agent 的常规模型和 embedding 配置将保持控制权。

所有这些端点都运行在主 Gateway 端口上，并使用与 Gateway 其余 HTTP API 相同的受信操作员认证边界。

Admin HTTP RPC (`POST /api/v1/admin/rpc`) 是一个独立的、默认关闭的插件路由，供无法使用 WebSocket RPC 的主机工具使用。请参见 [Admin HTTP RPC](/plugins/admin-http-rpc)。

### <a id="port-and-bind-precedence"></a> 端口和绑定优先级

| 设置      | 解析顺序                                                     |
| ------------ | -------------------------------------------------------------------- |
| Gateway 端口 | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789`        |
| 绑定模式    | CLI/override → `gateway.bind` → `loopback`（容器中为 `auto`） |

已安装的 gateway 服务会在 supervisor 元数据中记录解析后的 `--port`。更改 `gateway.port` 后，请运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，以便 launchd/systemd/schtasks 在新端口上启动进程。

当网关启动为非环回绑定播种本地 Control UI 源时，使用相同的有效端口和绑定。例如，在运行时验证运行之前，`--bind lan --port 3000` 播种 `http://localhost:3000` 和 `http://127.0.0.1:3000`。将任何远程浏览器源（例如 HTTPS 代理 URL）显式添加到 `gateway.controlUi.allowedOrigins`。

### <a id="hot-reload-modes"></a> 热重载模式

| `gateway.reload.mode` | 行为                                   |
| --------------------- | ------------------------------------------ |
| `off`                 | 不重新加载配置                           |
| `hybrid` (默认)    | 安全时热应用，需要时重启 |

早期的 `hot` 和 `restart` 模式在 `v2026.7.2-beta.4` 中退役，从 `v2026.8.1` 开始稳定。 [`openclaw doctor --fix`](/cli/doctor) 都映射到 `hybrid`。

## <a id="operator-command-set"></a> 操作员命令集

```bash
openclaw gateway status
openclaw gateway status --deep   # adds a system-level service scan
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` 用于额外的服务发现（LaunchDaemons/systemd 系统 units/schtasks），而不是更深层次的 RPC 运行状况检查。

## <a id="multiple-gateways-(same-host)"></a><a id="multiple-gateways-same-host"></a> 多个 gateway（同一主机）

大多数安装应当每台机器只运行一个 gateway。单个 gateway 可以承载多个 agent 和 channel。只有在你有意需要隔离，或者需要一个救援 bot 时，才需要多个 gateway。

有用的检查：

```bash
openclaw gateway status --deep
openclaw gateway probe
```

预期结果：

- `gateway status --deep` 可以报告 `Other gateway-like services detected (best effort)`，并在仍存在陈旧的 launchd/systemd/schtasks 安装时打印清理提示。
- `gateway probe` 在检测到不同的 gateway 响应，或者 OpenClaw 无法证明可达目标是同一个 gateway 时，可能会警告 `multiple reachable gateway identities`。SSH 隧道、代理 URL，或指向同一个 gateway 的已配置远程 URL，即使传输端口不同，也仍然算作一个 gateway 的多种传输方式。
- 如果这是故意的，请隔离每个网关的端口、config/state 和工作区根。

每个实例的检查清单：

- 唯一的 `gateway.port`
- 唯一的 `OPENCLAW_CONFIG_PATH`
- 唯一的 `OPENCLAW_STATE_DIR`
- 唯一的 `agents.defaults.workspace`

示例：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

详细设置：[/gateway/multiple-gateways](/gateway/multiple-gateways).

## <a id="remote-access"></a> 远程访问

首选：Tailscale/VPN. 后备：SSH 隧道。

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

然后在本地将客户端连接到 `ws://127.0.0.1:18789`。

<Warning>
SSH 隧道不会绕过 gateway 认证。对于共享密钥认证，即使通过隧道，客户端仍然必须发送 `token`/`password`。对于带身份的模式，请求仍然必须满足该认证路径。
</Warning>

参见：[远程 Gateway](/gateway/remote)、[认证](/gateway/authentication)、[Tailscale](/gateway/tailscale)。

## <a id="supervision-and-service-lifecycle"></a> 监督与服务生命周期

本机服务控制命令仅接收可执行查找、帐户标识、区域设置和服务管理器路由所需的操作系统环境。它们不继承应用程序凭据或任意 shell 变量。网关有效负载及其安装的服务定义保留其单独配置的环境。

生产级可靠性请使用受监督运行。

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

使用 `openclaw gateway restart` 进行重启。不要将 `openclaw gateway stop` 和 `openclaw gateway start` 串联起来代替重启。

在 macOS 上，`gateway stop` 使用 `launchctl bootout` 并验证 LaunchAgent 已卸载且其进程已退出，然后报告成功。这将从当前启动会话中删除 LaunchAgent，而不会持续禁用，因此 KeepAlive 自动恢复在意外崩溃后仍然有效，并且 `gateway start` 可以干净地重新启用。要在重新启动后持续抑制自动重生，请传递 `--disable`： `openclaw gateway stop --disable`。

如果无法验证关闭，则该命令将失败，并从服务所有者登录的 macOS 会话中的外部终端运行确切的 `launchctl bootout gui/<uid>/<label>` 命令。仅空闲网关端口并不能证明服务已停止。

LaunchAgent 标签为 `ai.openclaw.gateway`（默认）或 `ai.openclaw.<profile>`（命名 profile）。`openclaw doctor` 会审计并修复服务配置漂移。

在 macOS 上，服务重新启动会保留多行环境值，包括 PEM 键、嵌入式引号和尾随换行符。如果旧的重新启动已经截断了生成的服务环境中的值，则另一次重新启动无法重建它。恢复其编写的配置或环境中的完整值，并使用 `openclaw gateway install --force` 重新安装。

### <a id="existing-system-launchdaemons"></a> 现有系统 LaunchDaemons

OpenClaw 安装并管理每用户 LaunchAgent。它不安装或管理系统 LaunchDaemons。如果自定义 LaunchDaemon 已使用相同的网关标签，则 OpenClaw 拒绝写入、启动、重新启动或修复用户 LaunchAgent，因为两个 `KeepAlive` 管理器可以重复重新启动同一网关。

所有权检查显示`launchctl print system/<label>`并检查已安装的 plists`/Library/LaunchDaemons`。当无法验证系统所有权时，它会拒绝操作，并且`--force`不绕过它。`openclaw gateway status`报告已加载的同标签系统作业；添加`--deep`扫描已安装的系统服务文件。

运行时和独立更新程序使用本机解析器解析捕获的 plist 字节。如果端点保护在分离重新启动期间拒绝路径名解析，则其所有权扫描会尝试有界读取并解析捕获的字节。实际的权限拒绝读取会被跳过，而格式错误的数据和其他读取失败仍然会阻止激活。加载的同标签作业保持阻塞状态；无法检测到因读取拒绝而隐藏的已卸载的相同标签 plist。分离重启回退使用macOS的`/usr/bin/perl`；如果该读取器不可用，扫描仍会拒绝无法验证的激活。这不会更改端点保护策略或抑制其警报。

在重试前，请选择一个生命周期所有者：

- 若要保留自定义系统 LaunchDaemon，请移除任何冲突的用户 LaunchAgent，并在运行 Doctor 时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`，使其在服务生命周期方面仅执行诊断。
- 若要恢复到受支持的用户 LaunchAgent，请使用 `sudo launchctl bootout system/<label>` 卸载系统任务，移除或迁移其实际 plist，以目标用户身份登录 macOS 桌面，然后运行 `openclaw gateway install`。

对于默认 profile，`<label>` 为 `ai.openclaw.gateway`。命名 profile 使用 `ai.openclaw.<profile>`。

  </Tab>

  <Tab id="linux-systemd-user" title="Linux（systemd用户）">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

若要在注销后仍保持运行，请启用 lingering：

```bash
sudo loginctl enable-linger $(whoami)
```

在没有桌面会话的无头服务器上，还要确保在重试 `systemctl --user` 命令之前设置 `XDG_RUNTIME_DIR` （`export XDG_RUNTIME_DIR=/run/user/$(id -u)`）。

服务检查保留到达用户管理器的显式 `DBUS_SESSION_BUS_ADDRESS`。否则，它会尝试 `$XDG_RUNTIME_DIR/bus`，然后使用私有管理器套接字进行检查。安装、状态和更新准入重用所选路由； `gateway status --deep` 显示它。更新准入会重新检查早期发现期间超时的路由。套接字的存在本身并不能取代工作的自定义总线。如果没有路由到达管理器，请检查`XDG_RUNTIME_DIR`，登录一次或启用延迟，并验证`systemctl --user status`。在Debian/Ubuntu上，`dbus-user-session`提供用户总线；如果需要，请使用 `systemctl --user start dbus.socket` 启动它。缺席的装置可以安全安装；不可读的现有定义必须首先由其所有者修复。

需要自定义安装路径时，可参考手动 user-unit 示例：

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target
StartLimitBurst=10
StartLimitIntervalSec=300

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
RestartPreventExitStatus=78
TimeoutStopSec=330
TimeoutStartSec=30
SuccessExitStatus=0 143
OOMPolicy=continue
KillMode=mixed

[Install]
WantedBy=default.target
```

`TimeoutStopSec=330` 涵盖网关的最长 315 秒停止排水时间以及 15 秒清理和退出裕量。网关将其排水管钳位至已安装单元的有效停止超时；请参阅 [Systemd 停止期限 ](/gateway/restart-recovery#systemd-stop-deadlines)。要检查当前受管单元主体，请运行 `systemctl --user cat openclaw-gateway.service`（或对于命名配置文件运行 `systemctl --user cat openclaw-gateway-<profile>.service`）。

  </Tab>

  <Tab id="windows-native" title="Windows（本地）">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

Windows 原生托管启动使用名为 `OpenClaw Gateway` 的计划任务 （命名 profile 则为 `OpenClaw Gateway (<profile>)`）。如果拒绝创建计划任务， OpenClaw 会回退到每用户 Startup 文件夹启动器， 该启动器指向状态目录中的 `gateway.cmd`。

  </Tab>

  <Tab id="linux-system-service" title="Linux（系统服务）">

将一个系统单元用于多个 user/always-on 主机。

从用户单元示例开始，将其安装在 `/etc/systemd/system/openclaw-gateway[-<profile>].service` 下，如果您的 `openclaw` 二进制文件位于其他位置，则调整 `ExecStart=`，并将 `User=` 添加到其 `[Service]` 部分：

```ini
[Service]
User=<user>
```

将 `<user>` 替换为拥有 OpenClaw 状态和配置的非 root 帐户。没有 `User=` 的系统单元以 root 身份运行。以 root 身份运行网关及其代理命令是不安全的，并且此设置不支持。

当省略 `Group=` 时，systemd 使用所选账户的主要组。默认情况下，`User=` 还提供该帐户的 `HOME`，OpenClaw 将其用于正常状态和配置查找。对于有意的自定义位置，请在单元环境中设置 `OPENCLAW_STATE_DIR` 和 `OPENCLAW_CONFIG_PATH`。作为解决方法，请勿将配置复制到 root 的主目录中。在单用户主机上，上面带有 `loginctl enable-linger` 的用户单元是支持在没有登录会话的情况下保持网关运行的方式。

不要让 `openclaw doctor --fix` 为同一个 profile/port. 安装用户级网关服务 Doctor 在发现系统级 OpenClaw 网关服务时拒绝自动安装；当系统单元拥有生命周期时，使用 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

`openclaw gateway status --deep` 检查已安装的系统单元并报告 `systemd system`。从具有相同状态和配置路径的非根 `User=` 帐户运行 Doctor。对于离线修复，首先通过其系统服务所有者停止设备，运行 `openclaw doctor --fix`，然后通过该所有者启动设备。医生可以验证停止的系统单元，而无需重写其定义或创建竞争的用户服务。不可用的管理员或未经验证的服务帐户仍然会阻止维护。

写入单元后，重新加载systemd并启用它：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

无效配置错误退出，代码为 `78`。 Linux systemd 单元使用 `RestartPreventExitStatus=78` 停止重新启动，直到配置修复。 launchd 和 Windows 任务计划程序没有等效的每退出代码停止规则，因此网关还会保留快速不干净的启动历史记录，并在重复启动失败后抑制 channel/provider 帐户自动启动。在该安全模式下，控制平面仍然启动进行检查和修复，主会话重新启动恢复暂停，直到完全断路器窗口耗尽，然后在同一过程中自动恢复，配置热重载和 `secrets.reload` 拒绝自动通道重新启动，并且显式操作员 `channels.start` 请求可以覆盖抑制。逐步恢复位于[重新启动恢复](/gateway/restart-recovery#safety-valves-and-observability)中。

## <a id="dev-profile-quick-path"></a> 开发者配置快速路径

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

默认值包括隔离 state/config 和基本网关端口 `19001`。

## <a id="protocol-quick-reference-(operator-view)"></a><a id="protocol-quick-reference-operator-view"></a> 协议快速参考（操作员视图）

- 首个客户端帧必须是 `connect`。
- Gateway 返回 `hello-ok` 帧，其中包含 `snapshot`（`presence`、`health`、`stateVersion`、`uptimeMs`）加上 `policy` 限制（`maxPayload`、 `maxBufferedBytes`、`tickIntervalMs`）。
- `hello-ok.features.methods` / `events` 是保守的发现列表，不是所有可调用辅助路由的生成式转储。
- 请求：`req(method, params)` → `res(ok/payload|error)`。
- 常见事件包括 `connect.challenge`、`agent`、`chat`、`session.message`、`session.operation`、`session.tool`、选择加入 `session.approval`、`sessions.changed`、 `presence`、`tick`、`health`、`heartbeat`、pairing/approval 生命周期事件和 `shutdown`。

代理运行分为两个阶段：

1. 立即返回已接受确认（`status:"accepted"`）
2. 最终完成响应（`status:"ok"|"error"`），中间会有流式的 `agent` 事件。

请参阅完整协议文档：[Gateway Protocol](/gateway/protocol)。

## <a id="operational-checks"></a> 运行检查

### <a id="liveness"></a> 存活性

- 打开 WS 并发送 `connect`。
- 期望返回带快照的 `hello-ok` 响应。

### <a id="readiness"></a> 就绪性

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### <a id="gap-recovery"></a> 间隙恢复

事件不会重放。出现序列间隙时，在继续之前先刷新状态（`health`、`system-presence`）。

## <a id="common-failure-signatures"></a> 常见失败特征

| 特征                                                      | 可能的问题                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | 非回环地址绑定，但没有有效的网关认证路径                           |
| `another gateway instance is already listening` / `EADDRINUSE` | 端口冲突                                                                 |
| `Gateway start blocked: set gateway.mode=local`                | 配置被设为远程模式，或损坏的配置中缺少 `gateway.mode` |
| 连接期间 `unauthorized`                                  | 客户端与网关之间的认证不匹配                                      |

对于完整诊断梯形图，请使用 [Gateway Troubleshooting](/gateway/troubleshooting)。

## <a id="safety-guarantees"></a> 安全保障

- 当 Gateway 不可用时，Gateway 协议客户端会快速失败（不隐式回退到 direct-channel）。
- Invalid/non-connect 第一帧被拒绝并关闭。
- 优雅关闭会在 socket 关闭前发出 `shutdown` 事件。

## <a id="related"></a> 相关内容

- [配置](/gateway/configuration)
- [网关故障排查](/gateway/troubleshooting)
- [后台执行和处理工具](/gateway/background-process) — 面向代理的执行和处理工具，不是网关服务控制
- [健康状态](/gateway/health)
- [诊断工具](/gateway/doctor)
- [认证](/gateway/authentication)
- [远程访问](/gateway/remote)
- [密钥管理](/gateway/secrets)
- [CLI 后端](/gateway/cli-backends) — 运行外部 CLI 代理作为网关后端
