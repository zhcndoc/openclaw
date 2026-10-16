---
summary: "运行时配置：工作树存储、容量和加速、模型路由、发现、更新、ACP 和向导"
read_when:
  - "选择代理工作树所在的位置"
  - "设置模型路由或发现默认值"
  - "审核更新、ACP 或向导配置"
title: "配置——运行时基础知识"
---

顶级运行时密钥：`worktreeRoot`、`worktreeAcceleration`、`worktreeMaxCount`、`models.*`、`discovery.*`、`update.*`、`acp.*` 和 `wizard.*`。

完整密钥索引和其他顶级配置域，请参见[配置参考](/gateway/configuration-reference)。

## `worktreeRoot`

[ 管理的工作树](/concepts/managed-worktrees) 结账的可选全局根目录。默认为 `<openclaw-state-dir>/worktrees`。

```json5
{
  worktreeRoot: "/mnt/workspaces/openclaw-worktrees",
}
```

使用绝对网关主机路径，`~` 表示网关用户的主目录，或 `~/` 后跟其中的文件夹；相对路径被拒绝。 OpenClaw 在 `<worktreeRoot>/<repo-fingerprint>/<name>` 创建结账。此设置适用于所有代理和所有托管工作树所有者，没有每个代理覆盖。共享状态数据库和分配限制保留在现有状态目录下。

更改仅影响新的分配。注册的工作树保留其原始路径以供重用、清理和快照恢复；现有的结帐不会自动移动。在仍然需要这些记录时，保持原始存储可用。

## `worktreeAcceleration`

用于 [ 托管工作树文件系统加速的可选全局布尔值 ](/concepts/managed-worktrees#filesystem-acceleration)。默认为 `true`，它自动选择可用的文件系统后端，否则使用正常的 Git 签出。

```json5
{
  worktreeAcceleration: false,
}
```

设置 `false` 以对新工作树使用正常的 Git 签出和文件复制。此选项适用于代理和托管工作树所有者；现有的结账方式不变。支持的后端是 Linux 上的 Btrfs 快照、macOS 上的 APFS 目录克隆以及 Windows 上的 ReFS 块克隆。存储库设置和依赖关系保留在每个工作树中。

## `worktreeMaxCount`

可选正整数限制同一 OpenClaw 状态目录中所有代理、存储库和所有者的实时 [ 托管工作树](/concepts/managed-worktrees#capacity-and-eviction)。默认为 `4096`。使用保留的恢复快照删除的签出不计入此限制。

```json5
{
  worktreeMaxCount: 4096,
}
```

强制执行上限：清理首先清除合并或压缩的分支，然后按上次使用的年龄空闲工作树，包括手动签出和未保存的数据。快照捕获是在 cap 驱逐期间尽最大努力；失败的快照不会阻止清除。因此，降低上限可以消除现有的结帐。实时运行仍然受到保护；如果没有其他结帐可以被驱逐，则创建会失败，并出现上限和实时所有者错误。提高 `worktreeMaxCount` 或让这些运行完成后再重试。

后台维护和创建使用同一个驱逐所有者。并发创建不能每个都声明最后的槽位。即使配置的计数留有空间，磁盘空间准入仍然是一个单独的保护。

## <a id="models"></a> 模型

提供程序定义、模型允许列表和自定义提供程序设置位于 [Configuration - 工具和自定义提供程序](/gateway/config-tools#custom-providers-and-base-urls) 中。 `models` 根还拥有全局模型目录行为。

```json5
{
  models: {
    // Optional. Hosted catalog updates default on.
    catalogRefresh: {
      enabled: true,
      // url: "https://catalog.example.com/openclaw/catalog.json",
    },
  },
}
```

- `models.mode`：提供商目录行为（`merge` 或 `replace`）。
- `models.providers`：按 provider id 键入的自定义 provider 映射。
- `models.providers.*.localService`：本地模型服务器的可选按需流程管理器。 OpenClaw 检查配置的运行状况端点，在需要时启动绝对 `command`，等待就绪，然后发送模型请求。请参阅 [ 本地模型服务](/gateway/local-model-services)。
- `models.catalogRefresh.enabled`：控制托管模型目录刷新（默认值：`true`）。将其设置为`false`以阻止所有远程目录请求；模型元数据和定价将保持在已安装版本中提供的值或在 `models.providers.*.models[].cost` 下声明的值。
- `models.catalogRefresh.url`：可选的 HTTPS 镜像覆盖（仅在显式本地主机测试中接受普通 HTTP）。默认值为 `https://catalog.openclaw.ai/models/v2/catalog.json`。镜像可以服务v1或v2。网关在启动时和每六个小时检查一次后台。兼容的下载已准备好并作为一代模型和定价发布，无需重新启动网关。读者保留当前一代，直到准备成功；捆绑目录较新的版本总是获胜。

未知的输入模式将从各个远程模型行中删除，并带有命名该行的警告。格式错误的模型行将被跳过，而不拒绝其他模型；必需的捆绑包和提供商字段仍然经过严格验证。如果没有保留有效的模型行，则下载将被拒绝，并且先前的目录保持活动状态。仍支持不带模型提供程序的仅定价 v1 目录。两种托管目录格式均保留已发布客户端接受的 `text`、`image` 和 `document` 输入模式。捆绑的模型元数据可以包括更新的模式。仅包含不支持的输入模式的行将被省略，而不是作为文本模型公开；默认值和建议不引用省略的托管行。

V2 包括每个模型行中的定价。未知或不可用的定价并不意味着模型是免费的。目录之外的模型（例如较旧的模型 ID 或通过网关路由的模型）在同一文件中使用独立费率：向供应商收取价格的网关会读取该供应商的费率一次，而不需要每个网关的副本。显式模型成本仍然优先。

定价更新与模型元数据位于同一托管目录文件中。已退役的 `models.pricing` 开关由 `openclaw doctor --fix` 自动删除；当 OpenClaw 必须避免所有托管目录流量时，请使用 `models.catalogRefresh.enabled: false`。

## <a id="discovery"></a> 发现

### <a id="mdns-(bonjour)"></a><a id="mdns-bonjour"></a> mDNS（卓悦）

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal`（默认）：从 TXT 记录中省略 `cliPath` + `sshPort`。
- `full`：包括`cliPath` + `sshPort`； LAN 多播广告仍需要启用捆绑的 `bonjour` 插件。
- `off`：抑制 LAN 多播广告而不更改插件启用。
- 捆绑的 `bonjour` 插件会在 macOS 主机上自动启动，在 Linux、Windows 和容器化 Gateway 部署中则需要选择启用。
- 当系统主机名是有效的 DNS 标签时，默认使用该主机名，否则回退为 `openclaw`。可通过 `OPENCLAW_MDNS_HOSTNAME` 覆盖。
- `OPENCLAW_DISABLE_BONJOUR=1` 将直接禁用 mDNS 广播，并覆盖 `discovery.mdns.mode`。

### <a id="wide-area-(dns-sd)"></a><a id="wide-area-dns-sd"></a> 广域（DNS-SD）

```json5
{
  discovery: {
    wideArea: { domain: "openclaw.internal" },
  },
}
```

设置 `discovery.wideArea.domain` 可启用广域发现，并在 `~/.openclaw/dns/` 下写入单播 DNS-SD 区域。要进行跨网络发现，请搭配 DNS 服务器（推荐使用 CoreDNS）和 Tailscale split DNS。

设置：`openclaw dns setup --apply`。

---

## <a id="update"></a> 更新

```json5
{
  update: {
    channel: "stable", // stable | extended-stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
    },
  },
}
```

- `channel`：发布渠道——`"stable"`、`"extended-stable"`、`"beta"` 或 `"dev"`。扩展稳定版仅适用于软件包：前台命令负责安装，而网关可以发出只读更新提示。
- `checkOnStart`：网关启动时通过 `https://telemetry.openclaw.ai/api/latest-version` 检查更新，此后最多每 24 小时检查一次（默认：`true`）。默认请求仅共享其`User-Agent`中的OpenClaw版本和平台信息；仅当 `telemetry.enabled` 为 `true` 时，才会包含匿名特征统计信息。将其设置为 `false` 或设置 `OPENCLAW_NO_AUTO_UPDATE=1` 会阻止所有自动更新请求、功能统计和更新通知，即使 `auto.enabled` 为 `true` 时也是如此。存储的扩展稳定选择使用相同的只读提示和 24 小时提示计划。
- `auto.enabled`：当 `checkOnStart` 也启用时，为稳定版和 Beta 版软件包安装以及开发 git 安装启用后台自动更新活动（默认值：`false`）。扩展稳定永远不会自动应用。

无头节点具有单独的默认开启 `nodeHost.autoUpdate.enabled` 策略，具有每小时检查和仅空闲激活功能。 `update.checkOnStart: false` 和 `OPENCLAW_NO_AUTO_UPDATE=1` 也禁用该策略。请参阅 [ 无头节点更新 ](/install/updating/automatic-updates#headless-node-updates)。

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    fallbacks: ["acpx-secondary"],
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    stream: {
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
    },
  },
}
```

- `enabled`：全局 ACP 功能开关（默认值：`true`；设置为 `false` 可隐藏 ACP 调度和生成入口）。
- `dispatch.enabled`：ACP 会话轮次调度的独立开关（默认值：`true`）。设置为 `false` 可保留 ACP 命令，同时阻止执行。
- `backend`：默认 ACP 运行时后端 ID（必须与注册的 ACP 运行时插件匹配）。首先安装后端插件，如果设置了 `plugins.allow`，请包含后端插件 ID（例如 `acpx`），否则 ACP 后端将不会加载。
- `fallbacks`：当主后端在产生任何输出之前因暂时性错误（不可用、速率受限、配额耗尽或过载）而早期失败时，会尝试回退 ACP 后端 id 的有序列表。每个条目必须与注册的 ACP 运行时插件后端匹配。
- `defaultAgent`：当生成未指定显式目标时，后备 ACP 目标代理 ID。
- `allowedAgents`：ACP 运行时会话允许的代理 ID 白名单；空表示没有附加限制。
- `stream.repeatSuppression`：抑制每圈重复的 status/tool 线（默认值：`true`）。
- `stream.deliveryMode`：`"live"` 逐步流式传输；`"final_only"` 缓冲内容，直到轮次终止事件发生。
- `stream.tagVisibility`：流式事件中各标签名称对应布尔可见性覆盖设置的记录。
- `runtime.installCommand`：可选的安装命令，用于在引导 ACP 运行时环境时执行。

---

## <a id="wizard"></a> 向导

CLI 引导式设置流程（`onboard`、`configure`、`doctor`）的行为和元数据：

```json5
{
  wizard: {
    accessMode: "full",
    appRecommendations: true,
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
    securityAcknowledgedAt: "2026-01-01T00:00:00.000Z",
  },
}
```

- `wizard.accessMode`：在引导式入门开始时选择的发现授权。`"full"`（推荐）允许设置流程自动查找 AI 应用、密钥和本地运行时；`"guarded"` 会让设置流程在查找周边信息前先询问一次，并提供手动配置选项。

- `wizard.appRecommendations` 默认为 `true`。将其设置为 `false`，可在引导式或经典入门过程中禁用已安装应用推荐，并阻止 Gateway 访问 `device.apps`。Node 主机仍需启用单独的、默认关闭的已安装应用共享标志，之后才会发布该命令。

---

## <a id="bridge-(legacy%2C-removed)"></a><a id="bridge-legacy-removed"></a> 桥接（旧版，已移除）

当前版本不再包含 TCP 桥接。节点现在通过网关 WebSocket 连接。`bridge.*` 键不再属于配置模式（在移除之前校验会失败；`openclaw doctor --fix` 可清除未知键）。

<Accordion id="legacy-bridge-config-historical-reference" title="旧版桥接配置（历史参考）">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---
