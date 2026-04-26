---
summary: "网关、渠道、自动化、节点和浏览器的深度故障排除运行手册"
read_when:
  - 故障排除中心指引您到此进行更深层次的诊断
  - 您需要基于症状的稳定运行手册部分以及精确命令
title: "故障排除"
---

# 网关故障排除

本页面为详细运行手册。  
如果您想先进行快速分类流程，请访问 [/help/troubleshooting](/help/troubleshooting)。

## 命令阶梯

先按此顺序运行这些命令：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

预期健康信号：

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok`，以及一行 `Capability: ...`。
- `openclaw doctor` 报告没有阻塞性的配置/服务问题。
- `openclaw channels status --probe` 显示每个账户的实时传输状态，并且在支持时显示探测/审计结果，例如 `works` 或 `audit ok`。

## Anthropic 429 需要额外使用量以支持长上下文

当日志/错误中包含：  
`HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

检查：

- 选择的 Anthropic Opus/Sonnet 模型含有 `params.context1m: true`。  
- 当前 Anthropic 凭证不具备长上下文使用资格。  
- 请求仅在需要 1M 测试路径的长会话/模型运行中失败。

解决方案：

1. 禁用该模型的 `context1m` 以回退到正常上下文窗口。
2. 使用有资格进行长上下文请求的 Anthropic 凭证，或切换到 Anthropic API 密钥。
3. 配置回退模型，以便在 Anthropic 长上下文请求被拒绝时运行继续。

相关：

- [/providers/anthropic](/providers/anthropic)
- [/reference/token-use](/reference/token-use)
- [/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic](/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过直接探测但代理运行失败

使用此部分当：

- `curl ... /v1/models` 正常工作
- 微小的直接 `/v1/chat/completions` 调用正常工作
- OpenClaw 模型运行仅在正常代理回合中失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

检查：

- 直接微小调用成功，但 OpenClaw 运行仅在较大提示词上失败
- 后端关于 `messages[].content` 期望字符串的错误
- 后端崩溃仅出现在较大提示词令牌数或完整代理运行时提示词上

常见表现：

- `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化聊天补全内容部分。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- 直接微小请求成功，但 OpenClaw 代理运行因后端/模型崩溃失败（例如某些 `inferrs` 构建上的 Gemma）→ OpenClaw 传输可能已正确；后端在较大代理运行时提示词形状上失败。
- 禁用工具后失败缩小但不消失 → 工具模式是压力的一部分，但剩余问题仍是上游模型/服务器容量或后端错误。

修复选项：

1. 为仅字符串聊天补全后端设置 `compat.requiresStringContent: true`。
2. 为无法可靠处理 OpenClaw 工具模式表面的模型/后端设置 `compat.supportsTools: false`。
3. 尽可能降低提示词压力：更小的工作区引导、更短的会话历史、更轻的本地模型，或具有更强长上下文支持的后端。
4. 如果微小直接请求持续通过而 OpenClaw 代理回合仍在内后端崩溃，将其视为上游服务器/模型限制并在接受的载荷形状上在那里提交复现。

相关：

- [/gateway/local-models](/gateway/local-models)
- [/gateway/configuration](/gateway/configuration)
- [/gateway/configuration-reference#openai-compatible-endpoints](/gateway/configuration-reference#openai-compatible-endpoints)

## 无回复

如果渠道连接正常但无响应，重连前请检查路由和策略。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

检查：

- DM 发送方的配对是否待处理。  
- 群组提及限制（`requireMention`，`mentionPatterns`）。  
- 渠道/群组白名单不匹配。

常见表现：

- `drop guild message (mention required` → 群消息被忽略直到被提及。  
- `pairing request` → 发送方需审批。  
- `blocked` / `allowlist` → 发送方/渠道被策略过滤。

相关：

- [渠道故障排除](/channels/troubleshooting)  
- [渠道配对](/channels/pairing)  
- [渠道群组](/channels/groups)

## 仪表盘控制界面连接问题

仪表盘/控制界面无法连接时，验证 URL、认证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

检查：

- 探测 URL 和仪表盘 URL 是否正确。  
- 客户端与网关认证模式/令牌是否匹配。  
- 是否在需要设备身份时使用了 HTTP。

常见表现：

- `device identity required` → 非安全上下文或缺少设备认证。
- `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者您正在从非环回浏览器源连接且没有明确的白名单）。
- `device nonce required` / `device nonce mismatch` → 客户端未完成基于挑战的设备认证流程（`connect.challenge` + `device.nonce`）。
- `device signature invalid` / `device signature expired` → 客户端为当前握手签名了错误的载荷（或过时的时间戳）。
- `AUTH_TOKEN_MISMATCH` 且 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备令牌进行一次受信任的重试。
- 该缓存令牌重试会复用与配对设备令牌一起存储的缓存范围集。显式 `deviceToken` / 显式 `scopes` 调用者则保留其请求的范围集。
- 在该重试路径之外，连接认证优先级依次为：显式共享令牌/密码，然后是显式 `deviceToken`，然后是存储的设备令牌，最后是引导令牌。
- 在异步 Tailscale Serve 控制界面路径上，相同 `{scope, ip}` 的失败尝试在限制器记录失败之前会被序列化。因此，来自同一客户端的两次不良并发重试可能在第二次尝试时显示 `retry later`，而不是两次简单的不匹配。
- 来自浏览器源环回客户端的 `too many failed authentication attempts (retry later)` → 来自同一标准化 `Origin` 的重复失败会被暂时锁定；另一个 localhost 源使用单独的桶。
- 重试后重复出现 `unauthorized` → 共享令牌/设备令牌漂移；刷新令牌配置并在需要时重新批准/轮换设备令牌。
- `gateway connect failed:` → 主机/端口/URL 目标错误。

### 认证详细代码快速映射

使用失败 `connect` 响应中的 `error.details.code` 选择下一步动作：

| Detail code                  | 含义                                                                                                                                                                                      | 推荐操作                                                                                                                                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享令牌。                                                                                                                                                 | 在客户端粘贴/设置令牌并重试。对于仪表盘路径：先运行 `openclaw config get gateway.auth.token`，然后粘贴到 Control UI 设置中。                                                                                                                                              |
| `AUTH_TOKEN_MISMATCH`        | 共享令牌与网关认证令牌不匹配。                                                                                                                                               | 如果 `canRetryWithDeviceToken=true`，允许一次受信任的重试。缓存令牌重试会复用已存储的批准范围；显式 `deviceToken` / `scopes` 调用者会保留请求的范围。如果仍然失败，请运行 [令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 按设备缓存的令牌已过期或已撤销。                                                                                                                                                 | 使用 [devices CLI](/cli/devices) 轮换/重新批准设备令牌，然后重新连接。                                                                                                                                                                                                        |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 是否为 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理请求：先执行 `openclaw devices list`，然后执行 `openclaw devices approve <requestId>`。范围/角色升级在您审查所请求访问后使用相同流程。                                                                                                               |

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志出现 nonce/signature 错误，请更新连接客户端并确认：

1. 等待 `connect.challenge`  
2. 对绑定于挑战的载荷进行签名  
3. 发送带有相同挑战 nonce 的 `connect.params.device.nonce`

如果 `openclaw devices rotate` / `revoke` / `remove` 意外被拒绝：

- 配对设备令牌会话只能管理 **它们自己的** 设备，除非调用者还拥有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用者会话已持有的操作员范围

相关：

- [Web 控制界面](/web/control-ui)
- [网关配置](/gateway/configuration) (网关认证模式)
- [网关可信代理认证](/gateway/trusted-proxy-auth)
- [网关远程](/gateway/remote)
- [CLI 设备](/cli/devices)

## 网关服务未运行

当服务已安装但进程无法保持运行时使用。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # 也扫描系统级服务
```

检查：

- `Runtime: stopped` 带有退出提示。
- 服务配置不匹配（`Config (cli)` 与 `Config (service)`）。
- 端口/监听器冲突。
- 当使用 `--deep` 时额外的 launchd/systemd/schtasks 安装。
- `` `Other gateway-like services detected (best effort)` 清理提示。``

常见表现：

- `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 本地网关模式未启用，或配置文件被覆盖并丢失了 `gateway.mode`。修复：在配置中设置 `gateway.mode="local"`，或重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新标记预期的本地模式配置。如果您通过 Podman 运行 OpenClaw，默认配置路径为 `~/.openclaw/openclaw.json`。
- `refusing to bind gateway ... without auth` → 非环回绑定且没有有效的网关认证路径（令牌/密码，或配置的可信代理）。
- `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
- `Other gateway-like services detected (best effort)` → 存在过时或并行的 launchd/systemd/schtasks 单元。大多数设置应在每台机器上保留一个网关；如果您确实需要多个，请隔离端口 + 配置/状态/工作区。参见 [网关#同一主机上的多个网关](/gateway#multiple-gateways-same-host)。

相关：

- [网关后台进程](/gateway/background-process)  
- [网关配置](/gateway/configuration)  
- [网关诊断](/gateway/doctor)

## 网关恢复了上一次已知良好的配置

当网关启动，但日志显示它恢复了 `openclaw.json` 时使用。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查看：

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- 活动配置旁边带时间戳的 `openclaw.json.clobbered.*` 文件
- 以 `Config recovery warning` 开头的主代理系统事件

发生了什么：

- 被拒绝的配置在启动或热重载期间未通过验证。
- OpenClaw 将被拒绝的载荷保留为 `.clobbered.*`。
- 活动配置已从最后一次验证通过的 last-known-good 副本恢复。
- 下一个主代理回合会收到警告，不要盲目重写被拒绝的配置。

检查并修复：

```bash
CONFIG="$(openclaw config file)"
ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
openclaw config validate
openclaw doctor
```

常见特征：

- `.clobbered.*` 存在 → 恢复了外部直接编辑或启动时读取的内容。
- `.rejected.*` 存在 → OpenClaw 所有的配置写入在提交前未通过 schema 或 clobber 检查。
- `Config write rejected:` → 写入试图删除所需结构、显著缩小文件，或持久化无效配置。
- `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → 启动时将当前文件视为已损坏，因为与最后一次已知良好的备份相比，它丢失了字段或大小。
- `Config last-known-good promotion skipped` → 候选项包含了被脱敏的秘密占位符，例如 `***`。

修复选项：

1. 如果恢复后的活动配置正确，则保留它。
2. 仅从 `.clobbered.*` 或 `.rejected.*` 中复制预期的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
3. 在重启前运行 `openclaw config validate`。
4. 如果您手动编辑，请保留完整的 JSON5 配置，而不只是您想修改的部分对象。

相关：

- [/gateway/configuration#strict-validation](/gateway/configuration#strict-validation)
- [/gateway/configuration#config-hot-reload](/gateway/configuration#config-hot-reload)
- [/cli/config](/cli/config)
- [/gateway/doctor](/gateway/doctor)

## 网关探测警告

当 `openclaw gateway probe` 到达某处但仍打印警告块时使用此部分。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查找：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否关于 SSH 回退、多个网关、缺少范围或未解决的认证引用。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试了直接配置的/回环目标。
- `multiple reachable gateways detected` → 有多个目标响应。通常这意味着有意的多网关设置，或存在陈旧/重复的监听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接成功，但详细 RPC 受作用域限制；请配对设备身份，或使用包含 `operator.read` 的凭据。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → 网关已响应，但此客户端在正常操作员访问前仍需要配对/审批。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此命令路径中，失败目标不可用认证材料。

相关：

- [CLI 网关](/cli/gateway)
- [网关#同一主机上的多个网关](/gateway#multiple-gateways-same-host)
- [网关远程](/gateway/remote)

## 渠道已连接但消息未流动

如果渠道状态为已连接但消息流停滞，重点检查策略、权限和渠道特定的发送规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

检查：

- DM 策略（`pairing`、`allowlist`、`open`、`disabled`）。  
- 群组白名单和提及要求。  
- 缺少渠道 API 权限/作用域。

常见表现：

- `mention required` → 消息因群组提及策略被忽略。  
- `pairing` / 待审批痕迹 → 发送方未获批准。  
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 渠道认证/权限问题。

相关：

- [故障排除](/channels/troubleshooting)  
- [WhatsApp](/channels/whatsapp)  
- [Telegram](/channels/telegram)  
- [Discord](/channels/discord)

## 定时任务和心跳投递

若定时任务或心跳未运行或未投递，先验证调度器状态，再检查投递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

检查：

- Cron 已启用且存在下次唤醒时间。
- 任务运行历史状态（`ok`, `skipped`, `error`）。
- 心跳跳过原因（`quiet-hours`, `requests-in-flight`, `alerts-disabled`, `empty-heartbeat-file`, `no-tasks-due`）。

常见表现：

- `cron: scheduler disabled; jobs will not run automatically` → Cron 已禁用。
- `cron: timer tick failed` → 调度器 tick 失败；检查文件/日志/运行时错误。
- `heartbeat skipped` 且 `reason=quiet-hours` → 处于活跃时间窗口之外。
- `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在但仅包含空行/Markdown 标题，因此 OpenClaw 跳过模型调用。
- `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 块，但此次 tick 没有任务到期。
- `heartbeat: unknown accountId` → 心跳投递目标的账户 ID 无效。
- `heartbeat skipped` 且 `reason=dm-blocked` → 心跳目标解析为 DM 风格目的地，但 `agents.defaults.heartbeat.directPolicy`（或每代理覆盖）设置为 `block`。

相关：

- [定时任务故障排除](/automation/cron-jobs#troubleshooting)
- [定时任务](/automation/cron-jobs)
- [心跳](/gateway/heartbeat)

## 节点配对工具失败

节点已配对但工具失败时，隔离前台、权限及审批状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

检查：

- 节点在线且具预期能力。  
- OS 权限授权（摄像头/麦克风/定位/屏幕）。  
- 执行审批和白名单状态。

常见表现：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台运行。  
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少系统权限。  
- `SYSTEM_RUN_DENIED: approval required` → 执行审批待处理。  
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被白名单阻止。

相关：

- [节点故障排除](/nodes/troubleshooting)  
- [节点索引](/nodes/index)  
- [执行审批](/tools/exec-approvals)

## 浏览器工具失败

当浏览器工具动作失败但网关本身健康时使用。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

检查：

- 检查是否设置了 `plugins.allow` 且包含 `browser`。
- 有效的浏览器可执行文件路径。
- CDP 配置文件可达性。
- `existing-session` / `user` 配置文件的本地 Chrome 可用性。

常见表现：

- `unknown command "browser"` or `unknown command 'browser'` → 随附的浏览器插件被 `plugins.allow` 排除。
- browser tool missing / unavailable while `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
- `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
- `browser.executablePath not found` → 配置的路径无效。
- `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不受支持的 scheme，例如 `file:` 或 `ftp:`。
- `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口无效或超出范围。
- `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session 尚无法附加到所选浏览器数据目录。打开浏览器 inspect 页面，启用远程调试，保持浏览器打开，批准首次附加提示，然后重试。如果不需要登录状态，优先使用受管理的 `openclaw` 配置文件。
- `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
- `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点从网关主机不可达。
- `Browser attachOnly is enabled ... not reachable` or `Browser attachOnly is enabled and CDP websocket ... is not reachable` → attach-only 配置文件没有可达目标，或者 HTTP 端点已响应但仍无法打开 CDP WebSocket。
- `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少随附浏览器插件的 `playwright-core` 运行时依赖；运行 `openclaw doctor --fix`，然后重启网关。ARIA 快照和基础页面截图仍可工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出仍不可用。
- `fullPage is not supported for element screenshots` → 截图请求将 `--full-page` 与 `--ref` 或 `--element` 混用。
- `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，不能使用 CSS `--element`。
- `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
- `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用仅发送一个上传文件。
- `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持 timeout 覆盖。
- `existing-session type does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP existing-session 配置文件上省略 `act:type` 的 `timeoutMs`，或者在需要自定义超时时使用受管理/CDP 浏览器配置文件。
- `existing-session evaluate does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP existing-session 配置文件上省略 `act:evaluate` 的 `timeoutMs`，或者在需要自定义超时时使用受管理/CDP 浏览器配置文件。
- `response body is not supported for existing-session profiles yet.` → `responsebody` 仍需要受管理浏览器或原始 CDP 配置文件。
- attach-only 或远程 CDP 配置文件上的旧视口 / 深色模式 / 区域设置 / 离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 关闭当前控制会话，并释放 Playwright/CDP 仿真状态，而无需重启整个网关。

相关：

- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)  
- [浏览器工具](/tools/browser)

## 升级后突然出错

升级后大多数故障是配置漂移或新增更严格默认项导致。

### 1) 认证和 URL 覆盖行为变化

```bash
openclaw gateway status
openclaw config get gateway.mode
openclaw config get gateway.remote.url
openclaw config get gateway.auth.mode
```

检查：

- 若 `gateway.mode=remote`，CLI 调用可能指向远程端，而本地服务正常。  
- 显式 `--url` 调用不会回退到存储的凭证。

常见表现：

- `gateway connect failed:` → 错误的 URL 目标。  
- `unauthorized` → 端点可达但认证错误。

### 2) 绑定和认证的保护措施更严格

```bash
openclaw config get gateway.bind
openclaw config get gateway.auth.mode
openclaw config get gateway.auth.token
openclaw gateway status
openclaw logs --follow
```

检查：

- 非回环绑定（`lan`, `tailnet`, `custom`）需要有效的网关认证路径：共享令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。
- 旧密钥如 `gateway.token` 不会替代 `gateway.auth.token`。

常见表现：

- `refusing to bind gateway ... without auth` → 没有有效网关认证路径的非回环绑定。
- `Connectivity probe: failed` while runtime is running → 运行时仍在，但使用当前认证/URL 无法访问网关。

### 3) 配对和设备身份状态变化

```bash
openclaw devices list
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow
openclaw doctor
```

检查：

- 仪表盘/节点待审批设备。  
- 策略或身份变更后 DM 配对审批待处理。

常见表现：

- `device identity required` → 设备认证未满足。  
- `pairing required` → 发送方/设备需审批。

如果服务配置与运行时状态仍不一致，请从相同的配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [/gateway/pairing](/gateway/pairing)
- [/gateway/authentication](/gateway/authentication)
- [/gateway/background-process](/gateway/background-process)

## 相关

- [Gateway runbook](/gateway)
- [Doctor](/gateway/doctor)
- [FAQ](/help/faq)
