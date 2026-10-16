---
summary: "查询正在运行的网关：运行状况、使用成本、稳定性、诊断导出、状态、连接检查、调用、挂起和恢复"
read_when:
  - "检查网关是否健康、就绪或可达"
  - "导出网关诊断或支持包"
  - "调用网关RPC方法或暂停网关"
title: "查询正在运行的网关"
sidebarTitle: "询问"
---

WebSocket RPC 查询子命令及其共享选项。 [`openclaw gateway`](/cli/gateway) 参考的一部分。

## <a id="query-a-running-gateway"></a> 查询正在运行的网关

所有查询命令都使用 WebSocket RPC。

通过令牌、密码或 `none` 身份验证，对配置的本地环回网关的普通 RPC 调用不会打开共享状态数据库以进行设备身份验证。显式 URL 目标和配对远程连接保留其设备身份验证规则。通过 SQLite 读取现有身份，无需复制共享数据库或进入其写入器生命周期。这些读取可以创建 SQLite 协调文件 （WAL/SHM），但不会更改存储的身份、令牌或架构。

如果无法读取设备身份存储，呼叫将在连接之前停止并报告恢复指导。如果没有选定的设备身份，它不会静默连接；检查状态目录访问并在重试之前运行 `openclaw doctor --fix`。

<Tabs>
  <Tab id="output-modes" title="输出方式">
    - 默认：人类可读（TTY 中带颜色）。
    - `--json`：机器可读的JSON（无styling/spinner）。
    - `--no-color`（或 `NO_COLOR=1`）：禁用 ANSI，同时保留人类布局。

  </Tab>
  <Tab id="shared-options" title="共享选项">
    - `--url <url>`：网关 WebSocket URL。
    - `--token <token>`：网关令牌。
    - `--password <password>`：网关密码。
    - `--timeout <ms>`：timeout/budget（默认值因命令而异；请参阅下面的每个命令）。
    - `--expect-final`：等待“final”响应（代理调用）。

  </Tab>
</Tabs>

<Note>
当你设置 `--url` 时，CLI 不会回退到配置或环境凭据。请显式传入 `--token` 或 `--password`。缺少显式凭据会报错。
</Note>

WebSocket 打开握手超时报告 `ETIMEDOUT` 的网关传输错误，包括目标和状态检查提示。 JSON 错误输出使用 `error.type: "gateway_transport_error"`，与其他连接失败一样。

### `gateway health`

```bash
openclaw gateway health --url ws://127.0.0.1:18789
openclaw gateway health --port 18789
```

`/healthz` 是活性检查：一旦服务器可以应答 HTTP，它就会返回。 `/readyz` 更严格并保持红色，而启动插件边车、通道或配置的挂钩仍在稳定中。本地或经过身份验证的详细 `/readyz` 响应包括 `eventLoop` 诊断块（延迟、利用率、CPU- 核心比率、`degraded` 标志）。

<a id="param-port"></a>

<ParamField path="--port <port>" 类型 = "数字">
  目标是此端口上的本地回环网关。此调用会覆盖 `OPENCLAW_GATEWAY_URL` 和 `OPENCLAW_GATEWAY_PORT`。
</ParamField>

### `gateway usage-cost`

从会话日志中获取使用成本摘要。

```bash
openclaw gateway usage-cost
openclaw gateway usage-cost --days 7
openclaw gateway usage-cost --agent work --json
openclaw gateway usage-cost --all-agents
openclaw gateway usage-cost --json
```

人类可读的输出警告当使用缓存正在刷新、部分或陈旧时，总数可能不完整。该命令返回来自一个请求的可用快照；稍后再次运行以检查刷新的总数。 JSON 输出保留 `cacheStatus` 对象，以便脚本可以检查相同的状态。

<a id="param-days"></a>

<ParamField path="--days <days>" type="number" 默认="30">
  要包含的天数。
</ParamField>
<a id="param-agent"></a>

<ParamField path="--agent <id>" 类型 = "字符串">
  将摘要限定到某个已配置的代理 id。
</ParamField>
<a id="param-all-agents"></a>

<ParamField path="--all-agents" type="boolean">
  汇总所有已配置的代理。不能与 `--agent` 同时使用。
</ParamField>

### `gateway stability`

从正在运行的网关获取最近的诊断稳定性记录器。

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --bundle latest
openclaw gateway stability --bundle latest --export
openclaw gateway stability --json
```

<a id="param-limit"></a>

<ParamField path="--limit <limit>" type="number" 默认="25">
  包含的最近事件最大数量（最大 `1000`）。
</ParamField>
<a id="param-type"></a>

<ParamField path="--type <type>" 类型 = "字符串">
  按诊断事件类型 e.g. `payload.large` 或 `diagnostic.memory.pressure` 进行筛选。
</ParamField>
<a id="param-since-seq"></a>

<ParamField path="--since-seq <seq>" 类型 = "数字">
  仅包含某个诊断序号之后的事件。
</ParamField>
<a id="param-bundle-path"></a>

<ParamField path="--bundle [path]" type="string">
  读取已持久化的稳定性 bundle，而不是调用正在运行的网关。`--bundle latest`（或直接使用裸 `--bundle`）会选择状态目录下最新的 bundle；你也可以直接传入 bundle JSON 路径。
</ParamField>
<a id="param-export"></a>

<ParamField path="--export" type="boolean">
  写出一个可共享的支持诊断 zip，而不是打印稳定性细节。
</ParamField>
<ParamField path="--output <path>" 类型 = "字符串">
  `--export` 的输出路径。
</ParamField>

<AccordionGroup>
  <Accordion id="privacy-and-bundle-behavior" title="隐私和捆绑行为">
    - Records 保留操作元数据：事件名称、计数、字节大小、内存读数、queue/session 状态、批准 ID、channel/plugin 名称和编辑的会话摘要。它们不包括聊天文本、webhook 主体、工具输出、原始 request/response 主体、令牌、cookie、秘密值、主机名和原始会话 ID。设置 `diagnostics.enabled: false` 以完全禁用记录器。
    - 致命网关退出、关闭超时和重新启动启动失败将诊断快照写入 `~/.openclaw/logs/stability/openclaw-stability-*.json`，即使记录器没有事件也是如此。当错误有堆栈时，`error.stack` 会保留它并编辑秘密并限制 8,000 个 UTF-16 代码单元。使用 `openclaw gateway stability --bundle latest` 检查最新的捆绑包； `--limit`、`--type` 和 `--since-seq` 也适用于捆绑输出。
    - 失败的关闭步骤包括 `evidence.shutdown`：步骤和经过编辑的错误名称、消息、代码和堆栈，包括嵌套原因和聚合错误。使用 `openclaw gateway stability --bundle latest --json` 检查这些详细信息。每个堆栈的捕获限制为 32 个错误和 8,000 个 UTF-16 代码单元。 `gateway.restart_close_failed` 标识抛出关闭失败； `gateway.restart_shutdown_timeout` 确定总体关闭期限。超时还会保留已观察到的任何关闭错误。重新启动和停止失败会在退出之前在其关闭预算内刷新现有文件记录器。

  </Accordion>
</AccordionGroup>

### `gateway diagnostics export`

编写专为错误报​​告设计的本地诊断 zip。有关隐私模型和捆绑包内容，请参阅 [Diagnostics Export](/gateway/diagnostics)。

```bash
openclaw gateway diagnostics export
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
openclaw gateway diagnostics export --json
```

<ParamField path="--output <path>" 类型 = "字符串">
  输出 zip 路径。默认为状态目录中的支持导出文件。
</ParamField>
<a id="param-log-lines"></a>

<ParamField path="--log-lines <count>" type="number" 默认="5000">
  要包含的最大清理日志行数。
</ParamField>
<a id="param-log-bytes"></a>

<ParamField path="--log-bytes <bytes>" type="number" 默认="1000000">
  要检查的最大日志字节数。
</ParamField>
<a id="param-url"></a>

<ParamField path="--url <url>" 类型 = "字符串">
  用于健康状态快照的网关 WebSocket URL。
</ParamField>
<a id="param-token"></a>

<ParamField path="--token <token>" 类型 = "字符串">
  用于健康状态快照的网关令牌。
</ParamField>
<a id="param-password"></a>

<ParamField path="--password <password>" 类型 = "字符串">
  用于健康状态快照的网关密码。
</ParamField>
<a id="param-timeout"></a>

<ParamField path="--timeout <ms>" type="number" 默认="3000">
  Status/health 快照超时。
</ParamField>
<a id="param-no-stability-bundle"></a>

<ParamField path="--no-stability-bundle" type="boolean">
  跳过持久稳定性包查找。
</ParamField>
<a id="param-json"></a>

<ParamField path="--json" type="boolean">
  以 JSON 格式输出写入路径、大小和清单。
</ParamField>

导出捆绑包：`manifest.json`（文件清单）、`summary.md`（Markdown 摘要）、`diagnostics.json`（顶级 config/logs/discovery/stability/status/health 摘要）、`config/sanitized.json`、`status/gateway-status.json`、`health/gateway-health.json`、 `logs/openclaw-sanitized.jsonl` 和 `stability/latest.json`（当捆绑包存在时）。

它被设计为共享。它保留对调试有用的操作详细信息（安全日志字段、子系统名称、状态代码、持续时间、配置模式、端口、plugin/provider id、非秘密功能设置和编辑操作日志消息），并省略或编辑聊天文本、webhook 正文、工具输出、凭证、cookie、account/message 标识符、prompt/instruction 文本、主机名和秘密值。当日志消息类似于 user/chat/tool 有效负载文本（e.g.“用户说”、“聊天文本”、“工具输出”、“webhook 正文”）时，导出仅保留消息被省略的事实及其字节数。

### `gateway status`

显示网关服务 （launchd/systemd/schtasks） 以及可选的 connectivity/auth 检查。

```bash
openclaw gateway status
openclaw gateway status --json
openclaw gateway status --require-rpc
openclaw gateway status --port 19001
```

从源检查来看，当记录的输入字节仍然匹配时，`pnpm openclaw gateway status` 会重用当前准备的运行时工件，即使 Git 将这些输入标记为脏。更改的输入或丢失的输出仍然需要刷新；状态不会绕过实时网关的工件发布保护措施。

<a id="param-url-1"></a>

<ParamField path="--url <url>" 类型 = "字符串">
  检查此显式 WebSocket URL 而不是服务派生的目标。不能与 `--port` 结合。
</ParamField>
<a id="param-port-1"></a>

<ParamField path="--port <port>" 类型 = "数字">
  使用调用 CLI 配置进行身份验证和 TLS 选择本地网关端口。接受 `gateway --port 19001 status` 和 `gateway status --port 19001`；显式状态端口获胜。本机服务详细信息作为诊断仍然可见，但不选择检查目标。
</ParamField>
<a id="param-token-1"></a>

<ParamField path="--token <token>" 类型 = "字符串">
  用于检查的令牌身份验证。
</ParamField>
<a id="param-password-1"></a>

<ParamField path="--password <password>" 类型 = "字符串">
  用于检查的密码验证。
</ParamField>
<a id="param-timeout-1"></a>

<ParamField path="--timeout <ms>" type="number" 默认="10000">
  检查超时。如果没有显式值，RPC 检查将使用 10 秒，Windows 任务计划程序状态和注册检查允许 60 秒进行冷启动。只读注册查询将此限额用于其总运行时间和无输出的时间。显式值也适用于本机服务检查。每个操作都有自己的预算；这不是总体指挥期限。
</ParamField>
<a id="param-no-probe"></a>

<ParamField path="--no-probe" type="boolean">
  跳过连接检查（仅服务视图）。
</ParamField>
<a id="param-deep"></a>

<ParamField path="--deep" type="boolean">
  也扫描系统级服务。
</ParamField>
<a id="param-runtime-intent-only"></a>

<ParamField path="--runtime-intent-only" type="boolean">
  仅输出本地 CLI 和服务运行时意图为 JSON。此检查读取守护程序拥有的本地存储和本机服务定义，无需共享状态诊断或 RPC，包括当网关或 PostgreSQL 不可用时。不能与 `--require-rpc` 结合。
</ParamField>
<a id="param-require-rpc"></a>

<ParamField path="--require-rpc" type="boolean">
  将连接检查升级为读取检查，如果失败则以非零值退出。不能与 `--no-probe` 结合。
</ParamField>

<AccordionGroup>
  <Accordion id="status-semantics" title="状态语义">
    - 即使本地 CLI 配置丢失或无效， 仍可用于诊断。配置问题是 `openclaw doctor --fix` 指导的警告；有效的连接设置和记录的服务标识仍然可用。
    - 如果服务发现无法检查所需的文件（例如只能由 root 读取的 systemd 环境文件），则状态会将本机服务报告为未知，并继续使用调用者的网关目标和凭据。观察到的服务所有权拒绝仍然是错误； status 不会更改文件权限或放松生命周期检查。
    - 默认输出证明服务状态、WebSocket 连接以及握手时可见的身份验证功能 — 而不是 read/write/admin 操作。
    - Checks 对于首次设备身份验证是不可变的：它们会重用现有的缓存设备令牌（如果存在），但绝不会仅为了检查状态而创建新的 CLI 设备标识或只读配对记录。
    - 解析配置的身份验证 SecretRefs 以在可能的情况下检查身份验证。如果所需的SecretRef未解析，则当检查connectivity/auth失败时，`--json`报告`rpc.authWarning`；显式传递 `--token`/`--password` 或修复秘密源。检查成功后，未解决的身份验证警告将被抑制。
    - 当正在运行的网关报告 JSON 时，输出包括 `gateway.version`；如果握手检查无法提供版本元数据，`--require-rpc` 可以回退到 `status.runtimeVersion` RPC 有效负载。
    - 默认情况下，退出0表示诊断已完成，而不是表示网关正常。缺少侦听器或 auth/connectivity 检查失败仍然可以退出 0；阻止诊断完成的错误退出非零。 `--json` 更改输出格式，而不是此退出行为。
    - 使用`openclaw gateway status --deep --require-rpc`作为维修验收检查或在需要工作读取范围RPC的scripts/automation中。如果读取检查失败，它会以非零值退出，但不证明插件或通道准备就绪；检查相关诊断并重现原始症状。状态永远不会启动或重新启动网关。
    - `--deep` 会扫描额外的 launchd/systemd/schtasks 安装；当发现多个类似 gateway 的服务时，人工输出会打印清理提示（通常建议每台机器只运行一个 gateway），并在相关时报告最近一次 supervisor 重启接力。
    - `--deep` 在建议修复官方插件版本漂移之前确认了确切的 npm 目标。未发布的版本或注册表失败会在没有更新命令的情况下报告；注册表访问或发布队列恢复后重试深度状态。普通状态和准备情况检查不会查询 npm 进行漂移修复。
    - `--deep` 还在插件感知模式 （`pluginValidation: "full"`） 下运行配置验证并显示插件清单警告（e.g. 缺少通道配置元数据）。默认 `gateway status` 保留跳过插件验证的快速只读路径。
    - 在Linux上，状态报告systemd当前加载的有效服务，包括加载的drop-ins。如果磁盘上的单元或插入项发生更改，`Systemd reload: pending` 意味着您必须运行 `systemctl --user daemon-reload`（或 `sudo systemctl daemon-reload` 对于系统服务）才能使这些更改生效。
    - Human 输出包括已解析的文件日志路径以及 CLI-vs-service 配置 paths/validity，以帮助诊断配置文件或状态目录漂移。
    - 如果网关报告没有版本，人工输出在可读时仍会显示本地检查的服务包版本和路径。版本不匹配建议仅当该服务是检查目标时才重新安装；安装限制显示为现有的拒绝消息。
    - 当 A 缺少本机服务仅用于诊断时，例如使用非默认状态目录的网关，则该服务仅供参考。连接检查仍会报告所选网关的结果。
    - 安装和重新安装指导遵循调用shell的安装规则，而不是存储的服务环境或检查目标。 Nix 模式、外部监督、意外的安装标识和 Linux sudo/user-manager 不匹配显示安装拒绝而不是不可用的命令。仅用于诊断的目标本身并不意味着拒绝。 Nix 模式会阻止安装，而不启动现有服务。
    - Human 输出包括带有配置的服务堆控制的 `Gateway heap:` 以及基于 CLI 可见内存的单独安装时建议。 JSON 输出公开与 `service.gatewayHeap` 相同的报告。也不是对正在运行的网关的 V8 堆上限的测量；为此使用运行时内存诊断。

  </Accordion>
  <Accordion id="linux-systemd-auth-drift-checks" title="Linux systemd 授权漂移检查">
    - Service 身份验证漂移检查从设备读取 `Environment=` 和 `EnvironmentFile=`。 `Environment=` 作业可以被引用。每个 `EnvironmentFile=` 指令使用一个不带引号的绝对路径，包括带空格的路径；支持多个指令和可选的 `-` 文件。 `%h` 扩展到服务主目录，`%%` 代表字面百分号。
    - 使用合并的运行时 env 解析 `gateway.auth.token` SecretRefs（首先服务命令 env，然后处理 env 回退）。
    - 当令牌认证并未实际启用时，令牌漂移检查会跳过配置中的令牌解析（`gateway.auth.mode` 明确为 `password`/`none`/`trusted-proxy`，或模式未设置且密码可能生效、同时没有可生效的令牌候选）。

  </Accordion>
</AccordionGroup>

### `gateway probe`

“调试一切”命令。它总是检查：

- 你配置的远程网关（如果已设置），以及
- localhost（回环），**即使已配置远程网关**。

传入 `--url` 会在这两者之前添加该显式目标。人类可读输出会将目标标记为 `URL (explicit)`、`Remote (configured)` / `Remote (configured, inactive)`，以及 `Local loopback`。

<Note>
如果可以到达多个检查目标，则打印所有目标。 SSH隧道、TLS/proxy、URL和配置的远程URL可以指向同一个网关，即使传输端口不同； `multiple_gateways` 保留用于不同或身份模糊的可达网关。隔离配置文件支持运行多个网关（e.g. 救援机器人），但大多数安装运行单个网关。
</Note>

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --port 18789
```

<a id="param-port-2"></a>

<ParamField path="--port <port>" 类型 = "数字">
  该端口用于本地环回检查目标和 SSH 隧道远程端口。如果没有 `--url`，则仅选择本地环回目标，而不选择已配置的网关环境 URL、环境端口或远程目标。
</ParamField>

<AccordionGroup>
  <Accordion id="interpretation" title="解释">
    - `Reachable: yes` 表示至少有一个目标接受了 WebSocket 连接。
    - `Capability: read-only|write-capable|admin-capable|pairing-pending|connect-only` 报告检查可以证明的有关身份验证的内容，与可达性分开。
    - A 成功的读取检查意味着读取范围详细信息 RPC 调用 （`health`/`status`/`system-presence`/`config.get`） 也成功。
    - A 读取检查因缺少 `operator.read` 范围而受到限制，意味着连接成功，但读取范围 RPC 受到限制。报告为 **degraded** 可达性，而不是完全故障。
    - A 在 `Connect: ok` 之后读取检查失败意味着 WebSocket 已连接，但后续读取诊断超时或失败 - 也是 **degraded**，并非无法访问。
    - 与 `gateway status` 类似，此命令重用现有的缓存设备身份验证，但不会创建首次设备标识或配对状态。
    - 仅当没有可到达的已检查目标时，Exit 代码才为非零。

  </Accordion>
  <Accordion id="json-output" title="JSON 输出">
    顶层：

    - `ok`: 至少有一个目标可达。
    - `degraded`: 至少有一个目标接受了连接，但未完成完整的详细 RPC 诊断。
    - `capability`: 在所有可达目标中看到的最佳能力（`read_only`、`write_capable`、`admin_capable`、`pairing_pending`、`connected_no_operator_scope` 或 `unknown`）。
    - `primaryTargetId`: 应视为活动胜者的最佳目标，优先级顺序：显式 URL、SSH 隧道、已配置远程、本地回环。
    - `warnings[]`: 尽力而为的警告记录，包含 `code`、`message`，以及可选的 `targetIds`。
    - `network`：本地 loopback/tailnet URL 提示源自当前配置和主机网络。
    - `discovery.timeoutMs` / `discovery.count`：用​​于此检查传递的实际发现 budget/result 计数。

    每个目标（`targets[].connect`）：`ok`（可达性 + 降级分类）、`rpcOk`（完整详细 RPC 成功）、`scopeLimited`（详细 RPC 因缺少 operator scope 而失败）。

    每个目标 （`targets[].auth`）：`hello-ok` 中报告的 `role` 和 `scopes`（如果可用），以及表面的 `capability` 分类。

  </Accordion>
  <Accordion id="common-warning-codes" title="常见警告代码">
    - `ssh_tunnel_failed`：SSH隧道建立失败；该命令退回到直接检查。
    - `multiple_gateways`: 探测到了不同的网关身份，或者 OpenClaw 无法证明可达目标是同一个网关。指向同一网关的 SSH 隧道、代理 URL 或已配置远程 URL 不会触发此项。
    - `auth_secretref_unresolved`: 无法为失败目标解析已配置的 auth SecretRef。
    - `probe_scope_limited`：WebSocket 连接成功，但读取检查因缺少 `operator.read` 而受到限制。
    - `local_tls_runtime_unavailable`: 本地 Gateway TLS 已启用，但 OpenClaw 无法加载本地证书指纹。

  </Accordion>
</AccordionGroup>

#### <a id="remote-over-ssh-(mac-app-parity)"></a><a id="remote-over-ssh-mac-app-parity"></a> 通过 SSH 进行远程（Mac 应用程序奇偶校验）

macOS 应用的“通过 SSH 远程”模式会使用本地端口转发，因此仅能通过回环访问的远程网关会变为可通过 `ws://127.0.0.1:<port>` 访问。

CLI 等效项：

```bash
openclaw gateway probe --ssh user@gateway-host
```

<a id="param-ssh"></a>

<ParamField path="--ssh <target>" 类型 = "字符串">
  `user@host` 或 `user@host:port`（端口默认为 `22`）。
</ParamField>

OpenClaw 仅启动在 OS- 受管系统目录中找到的 SSH 客户端。在本机Windows上，安装**OpenSSH Client**可选功能； Windows 将其置于 `%SystemRoot%\System32\OpenSSH` 下。

<ParamField path="--ssh-identity <path>" 类型 = "字符串">
  身份文件。
</ParamField>
<a id="param-ssh-auto"></a>

<ParamField path="--ssh-auto" type="boolean">
  从解析出的发现端点（`local.` 加上已配置的广域域名，如有）中选择发现到的第一个 gateway 主机作为 SSH 目标。TXT-only 提示会被忽略。
</ParamField>

配置默认值（可选）：`gateway.remote.sshTarget`、`gateway.remote.sshIdentity`。

### `gateway call <method>`

底层 RPC 帮助工具。

此命令仅加载选择和验证网关连接所需的配置。它不会验证不相关的设置或预加载插件运行时；使用 `openclaw config validate` 检查完整配置。

使用 `--expect-url <url>` 将呼叫绑定到之前观察到的网关端点，而无需更改 URL 选择或身份验证。 CLI 在连接之前会比较精确解析的 URL，如果目标发生更改，则会失败。 Automation可以从`openclaw status --json`中的`gateway.url`获取端点；编辑后的 ​​URL 不能用作确切的端点断言。

```bash
openclaw gateway call status
openclaw gateway call health --port 18999
openclaw gateway call logs.tail --params '{"limit": 200}'
```

要将现有结账添加到 Control UI 的地点选择器，请使用 [ 项目注册和列表示例 ](/web/control-ui/sessions-and-sidebar#register-an-existing-repository)。

对于 `sessions.send` 和 `chat.send`、JSON `timeoutMs` 是接收代理的执行预算，而不是确认超时。普通协调时可省略； `--timeout` 独立限制 CLI 等待的时间：

```bash
openclaw gateway call sessions.send --params '{"key":"<session-key>","message":"Status update"}' --timeout 10000
```

`started` 响应确认接受，而不是完整的回复。这些 CLI 方法适用于操作员和外部自动化。代理使用他们公开的 [`sessions_send` 工具 ](/concepts/session-tool#sending-cross-session-messages)，而不是 shell 或直接的 RPC 替代品。不可用的消息传递工具不允许使用 CLI。子代理通过其接受的任务完成路径返回结果；家长与其他会话进行必要的协调。

在代理的 `exec` 子进程 （`OPENCLAW_SHELL=exec`） 中，消息 RPC 在连接之前被拒绝，因此工作人员报告无法显示为新的人工输入。普通操作员终端和非消息网关诊断不变。

<a id="param-params"></a>

<ParamField path="--params <json>" type="string" 默认="{}">
  用于参数的 JSON 对象字符串。
</ParamField>
<a id="param-url-2"></a>

<ParamField path="--url <url>" 类型 = "字符串">
  网关 WebSocket URL。
</ParamField>
<a id="param-port-3"></a>

<ParamField path="--port <port>" 类型 = "数字">
  以此端口定位本地回环 Gateway。对于本次调用，它会覆盖 `OPENCLAW_GATEWAY_URL` 和 `OPENCLAW_GATEWAY_PORT`。不能与 `--url` 组合使用。
</ParamField>
<a id="param-token-2"></a>

<ParamField path="--token <token>" 类型 = "字符串">
  网关令牌。
</ParamField>
<a id="param-password-2"></a>

<ParamField path="--password <password>" 类型 = "字符串">
  网关密码。
</ParamField>
<a id="param-timeout-2"></a>

<ParamField path="--timeout <ms>" type="number" 默认="10000">
  超时时间预算。
</ParamField>
<a id="param-expect-final"></a>

<ParamField path="--expect-final" type="boolean">
  主要用于在最终负载之前传输中间事件的代理式 RPC。
</ParamField>
<a id="param-json-1"></a>

<ParamField path="--json" type="boolean">
  机器可读 JSON 输出。
</ParamField>

`openclaw.setup.detect` 使用 40 秒默认值，以便网关可以完成其有界 AI-access 扫描。显式的 `--timeout` 仍然优先。

<Note>
`--params` 必须是有效的 JSON，并且每个方法都会验证其自己的参数形状（extra/misnamed 字段将被拒绝）。使用 `--port` 作为自定义端口本地网关；显式 `--url` 目标仍然需要显式凭据。
</Note>

### `gateway suspend`

为协作主机冻结或快照准备一个空闲网关。如果没有 `--wait`，活动工作将返回带有阻止程序详细信息的非零退出。对于 `--wait`，CLI 使用一个稳定请求 ID 重试，直到有限的截止时间。该值必须是非负数秒；空值会被拒绝。使用 `--wait 0` 进行单次尝试，无需轮询。

```bash
openclaw gateway suspend
openclaw gateway suspend --request-id snapshot-2026-08-11 --wait 30
openclaw gateway suspend --port 18999 --json
```

就绪输出包括暂停 ID、租约到期时间以及匹配的恢复命令。支持常见的 RPC 选项，例如 `--url`、`--token`、`--password`、`--timeout`、`--json` 和 `--port`。

挂起阻止程序消息命名活动根请求，并包括聊天运行和挂起终端写入的运行 ID 和会话密钥。每个类别最多列出八位持有者，其余的则省略。 `gateway.suspend.status` 在排空时返回相同的详细信息，并且每次排空观察都会将一行 `DRAINING` 写入网关日志。即使聊天客户端断开连接，待定的最终写入仍会受到保护，直到其持久性所有者解决为止。

### `gateway resume <suspensionId>`

在解冻后，或主机操作被放弃时，释放已准备好的暂停。

```bash
openclaw gateway resume <suspensionId>
openclaw gateway resume <suspensionId> --port 18999 --json
```

已经过期或恢复的租约是成功的空操作。不同的主动悬架 ID 被拒绝。一旦关闭提交，即使对于原始所有者来说，恢复也会被拒绝； `gateway.suspend.status` 报告所有者的关闭进度，直到服务器拆卸关闭 RPC 访问。
