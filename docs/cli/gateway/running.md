---
summary: "`openclaw gateway` 运行选项、启动行为以及显示配置的令牌"
read_when:
  - "从 CLI 运行网关（开发或服务器）"
  - "调试网关身份验证、绑定模式和连接性"
  - "读取网关主机上配置的共享令牌"
title: "运行网关"
sidebarTitle: "跑步"
---

启动网关进程并读取其配置的令牌。 [`openclaw gateway`](/cli/gateway) 参考的一部分。

## <a id="run-the-gateway"></a> 运行 Gateway

```bash
openclaw gateway
openclaw gateway run   # equivalent, explicit form
```

<AccordionGroup>
  <Accordion id="startup-behavior" title="启动行为">
    - 意外启动失败会打印经过编辑的 `[openclaw] Reason:`，无需调试模式，包括在托管服务日志中。使用 `--debug` 或 `OPENCLAW_DEBUG=1` 包含堆栈跟踪。
    - Agent 请求等待当前启动模型运行时发布，包括当启动仍在准备身份验证时配置刷新替换初始发布。
    - Deferred 代理数据库准备在允许会话之前重试重叠配置或机密刷新。数据库打开和迁移运行一次；重复的取代或真正的数据库故障会保留启动拒绝。
    - 除非在 `~/.openclaw/openclaw.json` 中设置了 `gateway.mode=local`，否则拒绝启动。使用 `--allow-unconfigured` 进行 ad-hoc/dev 运行；它绕过防护，无需编写或修复配置。
    - Startup 自动将基于规则的、无提示的旧密钥迁移应用于符合条件的无效单文件配置，包括在非交互式服务运行中。它仅在完全验证（包括插件）之后才写入，并将先前的配置保留在 `.bak` 环中。使用 `$include` 的配置、Nix 管理的配置以及由较新版本编写的配置均被排除。请参阅 [ 旧版配置密钥迁移](/gateway/doctor#detailed-behavior-and-rationale)。
    - 如果自动迁移无法使配置生效，交互式终端可以提议运行`openclaw doctor --fix`并在同意后重试启动一次。非交互式运行改为打印命令。如果修复后的配置仍然无效，启动仍会停止。
    - 配置读取失败，包括 SQLite 检查期间存储不可用，停止启动并退出代码 `1`，以便服务监管可以重试。它们不会触发配置修复。无效配置和所需的离线迁移保留退出代码 `78`，这可以防止 systemd 重启循环；在重新启动之前解决报告的问题。
    - 在读取其共享状态快照之前，启动会等待最多五分钟，以便另一个 OpenClaw 进程中的临时架构所有者完成。显式脱机维护仍然会阻止访问，并且耗尽争用仍然是读取失败，退出代码为 `1`。
    - Startup 不会加载插件 Doctor 模块，只是为了收集有效配置的建议修复规则。无效配置仍然包含插件修复指导；即使配置有效，`openclaw doctor` 也会检查修复规则。
    - Config 恢复、共享状态准备情况和挂起的插件迁移读取共享当前准入快照。注册表刷新会重新检查准入，同时保留迁移和插件生命周期租约，然后验证持久替换。修复仍会比较写入前的当前状态。这不会更改更新迁移或存储的数据。
    - `openclaw onboard --mode local` 和 `openclaw setup` 写入 `gateway.mode=local`。如果配置文件存在但缺少 `gateway.mode`，则会被视为 damaged/clobbered 配置，并且网关拒绝为您猜测 `local` — 重新运行载入、手动设置密钥或传递 `--allow-unconfigured`。
    - 未经认证而绑定到 loopback 之外的地址会被阻止。
    - `--bind` 值 `lan`、`tailnet` 和 `custom` 通过 IPv4-only 路径进行解析； IPv6-仅自带主机设置需要在网关前面有 IPv4 sidecar 或代理。
    - `SIGUSR2`获得授权后触发进程内重新启动。`commands.restart`（默认：启用）外部发送的门`SIGUSR2`；将其设置为`false`阻止手动OS-信号重新启动。面向代理`gateway`工具是只读的；代理请求重新启动通过`openclaw`授权工具。有效的完全访问权限，包括默认（完全访问权限），无需批准提示即可授权允许的委派更改；限制运行需要人工批准。看[委托设置和维修](/gateway/permission-modes#delegated-setup-and-repair)。
    - `SIGUSR1` 是为 Node 的检查器保留的，因此附加调试器不会重新启动网关。优先选择 `openclaw gateway restart` 进行重启；更新手动重启脚本以发送 `SIGUSR2`。
    - `SIGINT`/`SIGTERM` 会停止进程，但不会恢复自定义终端状态——如果你把 CLI 包装在 TUI 或原始模式输入中，请在退出前自行恢复终端。

  </Accordion>
</AccordionGroup>

### <a id="options"></a> 选项

<a id="param-port"></a>

<ParamField path="--port <port>" 类型 = "数字">
  WebSocket 端口（默认来自 config/env；通常为 `18789`）。
</ParamField>
<a id="param-bind"></a>

<ParamField path="--bind <mode>" 类型 = "字符串">
  绑定模式：`loopback`（默认）、`lan`、`tailnet`、`auto`、`custom`。
</ParamField>
<a id="param-token"></a>

<ParamField path="--token <token>" 类型 = "字符串">
  `connect.params.auth.token` 的共享令牌。若已设置，默认为 `OPENCLAW_GATEWAY_TOKEN`。
</ParamField>
<a id="param-auth"></a>

<ParamField path="--auth <mode>" 类型 = "字符串">
  认证模式：`none`、`token`、`password`、`trusted-proxy`。
</ParamField>
<a id="param-password"></a>

<ParamField path="--password <password>" 类型 = "字符串">
  `--auth password` 的密码。
</ParamField>
<ParamField path="--password-file <path>" 类型 = "字符串">
  从文件中读取 Gateway 密码。
</ParamField>
<a id="param-tailscale"></a>

<ParamField path="--tailscale <mode>" 类型 = "字符串">
  Tailscale 暴露方式：`off`、`serve`、`funnel`。
</ParamField>
<a id="param-allow-unconfigured"></a>

<ParamField path="--allow-unconfigured" type="boolean">
  开始时不强制执行 `gateway.mode=local`。 Ad-hoc/dev 仅引导程序；不保留或修复配置。
</ParamField>
<a id="param-dev"></a>

<ParamField path="--dev" type="boolean">
  如果缺失，则创建开发配置和工作区（跳过 `BOOTSTRAP.md`）。
</ParamField>
<a id="param-ambient-channels"></a>

<ParamField path="--ambient-channels" type="boolean">
  允许网关为此过程从周围环境变量自动配置通道，包括配置重新加载。默认情况下，前台、开发和服务网关需要显式 `channels.<id>` 配置，例如 `channels.discord.enabled=true`。配置的通道仍然可以从环境变量中读取凭据。对于托管服务，添加通道配置块；服务安装不会保留此标志。
</ParamField>
<a id="param-dev-ambient-channels"></a>

<ParamField path="--dev-ambient-channels" type="boolean">
  已弃用 `--ambient-channels` 的别名。
</ParamField>
<a id="param-reset"></a>

<ParamField path="--reset" type="boolean">
  重置开发配置、凭据、会话和工作区。需要 `--dev`。
</ParamField>
<a id="param-force"></a>

<ParamField path="--force" type="boolean">
  在启动前终止目标端口上任何已存在的监听。在非交互式 shell 中，这会拒绝终止已验证的 Gateway 监听；请改用 `--dev` 或使用空闲端口的隔离 `--profile`。
</ParamField>
<a id="param-verbose"></a>

<ParamField path="--verbose" type="boolean">
  详细记录到 stdout/stderr.
</ParamField>
<a id="param-cli-backend-logs"></a>

<ParamField path="--cli-backend-logs" type="boolean">
  仅在控制台显示 CLI 后端日志（同时也会启用 stdout/stderr）。
</ParamField>
<a id="param-ws-log"></a>

<ParamField path="--ws-log <style>" type="string" 默认="自动">
  WebSocket 日志样式：`auto`、`full`、`compact`。
</ParamField>
<a id="param-compact"></a>

<ParamField path="--compact" type="boolean">
  `--ws-log compact` 的别名。
</ParamField>
<a id="param-raw-stream"></a>

<ParamField path="--raw-stream" type="boolean">
  将原始模型流事件记录为 JSONL。
</ParamField>
<ParamField path="--raw-stream-path <path>" 类型 = "字符串">
  原始流 JSONL 路径。
</ParamField>

`--claude-cli-logs` 是 `--cli-backend-logs` 的已弃用别名。

对于 `--bind custom`，将 `gateway.customBindHost` 设置为 IPv4 地址。对于同一主机客户端，除 `127.0.0.1` 或 `0.0.0.0` 之外的任何地址也需要在同一端口上使用 `127.0.0.1`；如果任一侦听器无法绑定，则启动失败。通配符 `0.0.0.0` 不添加单独的必需别名。 IPv6- 仅自带主机设置需要在网关前面有 IPv4 sidecar 或代理。

## <a id="reveal-the-configured-token"></a> 显示已配置的令牌

当客户端需要已配置的共享令牌时，在 Gateway 主机上运行：

```bash
openclaw gateway auth-token --show
```

该命令会解析 `gateway.auth.token`、`OPENCLAW_GATEWAY_TOKEN` 和已配置的 SecretRefs，然后仅输出令牌。它要求使用交互式终端，并拒绝重定向或管道输出，以避免凭据无意中进入命令日志。请将终端输出视为机密信息。

如果未配置持久令牌，请运行 `openclaw doctor --generate-gateway-token`，重启 Gateway，然后重新运行该命令。通用的 `openclaw config get` 输出仍会被脱敏，包括使用 `--json` 时也是如此。
