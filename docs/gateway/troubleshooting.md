---
summary: "网关、通道、自动化、节点和浏览器的深度故障排查运行手册"
read_when:
  - 故障排查中心将你带到这里进行更深入的诊断
  - 你需要带有精确命令的、基于症状的稳定运行手册章节
title: "故障排查"
sidebarTitle: "故障排查"
---

本页是深度运行手册。如果你想先看快速分流流程，请从 [/help/troubleshooting](/help/troubleshooting) 开始。

## 命令阶梯

首先按以下顺序运行：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

预期的健康信号：

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok`，以及一行 `Capability: ...`。
- `openclaw doctor` 报告没有阻塞性的配置/服务问题。
- `openclaw channels status --probe` 显示每个账户的实时传输状态，并在支持时显示探测/审计结果，例如 `works` 或 `audit ok`。

## 分裂脑安装与较新配置保护

当网关服务在更新后意外停止，或者日志显示某个 `openclaw` 二进制版本比最后写入 `openclaw.json` 的版本更旧时，使用此项。

OpenClaw 会用 `meta.lastTouchedVersion` 给配置写入打上标记。只读命令仍然可以检查由较新 OpenClaw 写入的配置，但进程和服务变更会拒绝从较旧的二进制继续执行。被阻止的操作包括网关服务的启动、停止、重启、卸载、强制服务重装、服务模式网关启动，以及 `gateway --force` 端口清理。

```bash
which openclaw
openclaw --version
openclaw gateway status --deep
openclaw config get meta.lastTouchedVersion
```

<Steps>
  <Step title="修复 PATH">
    修复 `PATH`，让 `openclaw` 指向较新的安装，然后重新运行该操作。
  </Step>
  <Step title="重新安装网关服务">
    从较新的安装中重新安装预期的网关服务：

    ```bash
    openclaw gateway install --force
    openclaw gateway restart
    ```

  </Step>
  <Step title="移除旧的包装器">
    移除仍然指向旧 `openclaw` 二进制的过期系统包或旧包装器条目。
  </Step>
</Steps>

<Warning>
仅在有意降级或紧急恢复时，为单个命令设置 `OPENCLAW_ALLOW_OLDER_BINARY_DESTRUCTIVE_ACTIONS=1`。正常运行时请保持其未设置。
</Warning>

## Anthropic 429 长上下文需要额外使用量

当日志/错误包含 `HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用此项。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查看以下内容：

- 选中的 Anthropic Opus/Sonnet 模型具有 `params.context1m: true`。
- 当前 Anthropic 凭据不具备长上下文使用资格。
- 只有在需要 1M beta 路径的长会话/模型运行中请求才会失败。

修复选项：

<Steps>
  <Step title="禁用 context1m">
    为该模型禁用 `context1m`，以回退到正常的上下文窗口。
  </Step>
  <Step title="使用有资格的凭据">
    使用符合长上下文请求资格的 Anthropic 凭据，或切换为 Anthropic API key。
  </Step>
  <Step title="配置回退模型">
    配置回退模型，以便在 Anthropic 长上下文请求被拒绝时运行仍可继续。
  </Step>
</Steps>

相关：

- [Anthropic](/providers/anthropic)
- [Token 使用与费用](/reference/token-use)
- [为什么我从 Anthropic 看到了 HTTP 429？](/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 本地 OpenAI 兼容后端通过直接探测但代理运行失败

当以下情况出现时使用此项：

- `curl ... /v1/models` 可用
- 很小的直接 `/v1/chat/completions` 调用可用
- OpenClaw 模型运行只在正常代理轮次中失败

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查看以下内容：

- 直接的小请求成功，但 OpenClaw 运行只在更大的提示词上失败
- 即使直接 `/v1/chat/completions` 使用相同的裸 model id 也可工作，仍出现 `model_not_found` 或 404 错误
- 后端关于 `messages[].content` 期望字符串的错误
- 带有 OpenAI 兼容本地后端时，偶发的 `incomplete turn detected ... stopReason=stop payloads=0` 警告
- 仅在更大的提示词 token 数或完整代理运行时提示词下才出现的后端崩溃

<AccordionGroup>
  <Accordion title="常见特征">
    - 使用本地 MLX/vLLM 风格服务器时出现 `model_not_found` → 确认 `baseUrl` 包含 `/v1`，`api` 对于 `/v1/chat/completions` 后端应为 `"openai-completions"`，并且 `models.providers.<provider>.models[].id` 是裸的 provider 本地 id。先带 provider 前缀选择一次，例如 `mlx/mlx-community/Qwen3-30B-A3B-6bit`；目录条目保持为 `mlx-community/Qwen3-30B-A3B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化 Chat Completions 内容部分。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 后端完成了 Chat Completions 请求，但该轮没有返回用户可见的助手文本。OpenClaw 会对可重放的空 OpenAI 兼容轮次重试一次；持续失败通常意味着后端正在发出空的/非文本内容，或抑制了最终回答文本。
    - 直接的小请求成功，但 OpenClaw 代理运行在后端内部失败（例如某些 `inferrs` 构建上的 Gemma）→ OpenClaw 传输大概率已经正确；后端在更大的代理运行时提示词形状上失败。
    - 关闭工具后失败有所减少但没有消失 → 工具 schema 造成了一部分压力，但剩余问题仍然是上游模型/服务器容量或后端 bug。

  </Accordion>
  <Accordion title="修复选项">
    1. 对仅支持字符串的 Chat Completions 后端设置 `compat.requiresStringContent: true`。
    2. 对无法可靠处理 OpenClaw 工具 schema 表面的模型/后端设置 `compat.supportsTools: false`。
    3. 在可能的情况下降低提示词压力：更小的工作区引导、更短的会话历史、更轻量的本地模型，或使用对长上下文支持更强的后端。
    4. 如果小的直接请求持续通过，而 OpenClaw 代理轮次仍在后端内部崩溃，则应将其视为上游服务器/模型限制，并在可接受的 payload 形状基础上向对方提交复现问题。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/gateway/configuration)
- [本地模型](/gateway/local-models)
- [OpenAI 兼容端点](/gateway/configuration-reference#openai-compatible-endpoints)

## 没有回复

如果通道已启动但没有任何回应，请先检查路由和策略，再去重连任何东西。

```bash
openclaw status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw config get channels
openclaw logs --follow
```

查看以下内容：

- DM 发送者处于待配对状态。
- 群组提及门控（`requireMention`、`mentionPatterns`）。
- 通道/群组允许列表不匹配。

常见特征：

- `drop guild message (mention required` → 群组消息在被提及之前会被忽略。
- `pairing request` → 发送者需要审批。
- `blocked` / `allowlist` → 发送者/通道被策略过滤。

相关：

- [通道故障排查](/channels/troubleshooting)
- [群组](/channels/groups)
- [配对](/channels/pairing)

## 仪表板控制 UI 连接

当仪表板/控制 UI 无法连接时，请验证 URL、认证模式和安全上下文假设。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --json
```

查看以下内容：

- 正确的探测 URL 和仪表板 URL。
- 客户端与网关之间的认证模式/令牌不匹配。
- 需要设备身份时却使用了 HTTP。

<AccordionGroup>
  <Accordion title="连接 / 认证特征">
    - `device identity required` → 非安全上下文或缺少设备认证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者你正在从非 loopback 浏览器 origin 连接，但没有显式允许列表）。
    - `device nonce required` / `device nonce mismatch` → 客户端没有完成基于挑战的设备认证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的载荷（或使用了过期时间戳）。
    - `AUTH_TOKEN_MISMATCH` 且 `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备 token 进行一次受信任重试。
    - 该缓存 token 重试会复用与配对设备 token 一起存储的缓存作用域集合。显式 `deviceToken` / 显式 `scopes` 调用方则保持其请求的作用域集合。
    - 在该重试路径之外，连接认证优先级依次是：显式共享 token/password、显式 `deviceToken`、存储的设备 token、引导 token。
    - 在异步 Tailscale Serve Control UI 路径上，对于同一 `{scope, ip}` 的失败尝试会在限流器记录失败之前串行化。因此，同一客户端的两个并发错误重试，第二次可能会显示 `retry later`，而不是两个普通的不匹配错误。
    - 来自浏览器源 loopback 客户端的 `too many failed authentication attempts (retry later)` → 来自同一规范化 `Origin` 的重复失败会被临时锁定；另一个 localhost origin 使用单独的桶。
    - 随后再次出现的 `unauthorized` → 共享 token/设备 token 漂移；刷新 token 配置，并在需要时重新批准/轮换设备 token。
    - `gateway connect failed:` → 目标主机/端口/URL 错误。

  </Accordion>
</AccordionGroup>

### 认证详情代码速查表

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详情代码                     | 含义                                                                                                                                                                                        | 建议操作                                                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端没有发送必需的共享 token。                                                                                                                                                            | 在客户端中粘贴/设置 token，然后重试。对于仪表板路径：先运行 `openclaw config get gateway.auth.token`，然后将其粘贴到 Control UI 设置中。                                                                                                                                                 |
| `AUTH_TOKEN_MISMATCH`        | 共享 token 与网关认证 token 不匹配。                                                                                                                                                        | 如果 `canRetryWithDeviceToken=true`，允许进行一次受信任重试。缓存 token 重试会复用已存储的已批准作用域；显式 `deviceToken` / `scopes` 调用方保留其请求的作用域。如果仍然失败，请运行 [token 漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。                                 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 缓存的每设备 token 已过期或已撤销。                                                                                                                                                         | 使用 [devices CLI](/cli/devices) 轮换/重新批准设备 token，然后重新连接。                                                                                                                                                                                                                |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 是否为 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理请求：先 `openclaw devices list`，然后 `openclaw devices approve <requestId>`。作用域/角色升级在你查看所请求访问后使用相同流程。                                                                                                                                               |

<Note>
使用共享网关 token/password 进行认证的直接 loopback 后端 RPC 不应依赖 CLI 的已配对设备作用域基线。如果子代理或其他内部调用仍然以 `scope-upgrade` 失败，请确认调用方使用的是 `client.id: "gateway-client"` 和 `client.mode: "backend"`，并且没有强制显式 `deviceIdentity` 或设备 token。
</Note>

设备认证 v2 迁移检查：

```bash
openclaw --version
openclaw doctor
openclaw gateway status
```

如果日志显示 nonce/签名错误，请更新连接客户端并验证它：

<Steps>
  <Step title="等待 connect.challenge">
    客户端等待网关发出的 `connect.challenge`。
  </Step>
  <Step title="签署载荷">
    客户端签署与 challenge 绑定的载荷。
  </Step>
  <Step title="发送设备 nonce">
    客户端发送 `connect.params.device.nonce`，并使用相同的 challenge nonce。
  </Step>
</Steps>

如果 `openclaw devices rotate` / `revoke` / `remove` 被意外拒绝：

- 已配对设备 token 会话只能管理 **它们自己的** 设备，除非调用方还具有 `operator.admin`
- `openclaw devices rotate --scope ...` 只能请求调用方会话已经持有的操作员作用域

相关：

- [配置](/gateway/configuration)（网关认证模式）
- [Control UI](/web/control-ui)
- [设备](/cli/devices)
- [远程访问](/gateway/remote)
- [受信任代理认证](/gateway/trusted-proxy-auth)

## Gateway service not running

当服务已安装但进程无法保持运行时使用此项。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # 也扫描系统级服务
```

查看以下内容：

- `Runtime: stopped` 并带有退出提示。
- 服务配置不匹配（`Config (cli)` vs `Config (service)`）。
- 端口/监听冲突。
- 使用 `--deep` 时额外的 launchd/systemd/schtasks 安装。
- `Other gateway-like services detected (best effort)` 的清理提示。

<AccordionGroup>
  <Accordion title="常见特征">
    - `Gateway start blocked: set gateway.mode=local` 或 `existing config is missing gateway.mode` → 未启用本地 gateway 模式，或者配置文件被覆盖并丢失了 `gateway.mode`。修复方法：在配置中设置 `gateway.mode="local"`，或者重新运行 `openclaw onboard --mode local` / `openclaw setup` 以重新写入预期的本地模式配置。如果你通过 Podman 运行 OpenClaw，默认配置路径是 `~/.openclaw/openclaw.json`。
    - `refusing to bind gateway ... without auth` → 在没有有效 gateway 认证路径（token/password，或已配置的 trusted-proxy）的情况下进行非 loopback 绑定。
    - `another gateway instance is already listening` / `EADDRINUSE` → 端口冲突。
    - `Other gateway-like services detected (best effort)` → 存在陈旧或并行的 launchd/systemd/schtasks 单元。大多数部署应保持每台机器仅一个 gateway；如果确实需要多个，请隔离端口 + 配置/状态/工作区。参见 [/gateway#multiple-gateways-same-host](/gateway#multiple-gateways-same-host)。
    - 来自 doctor 的 `System-level OpenClaw gateway service detected` → 存在系统级 systemd 单元，而用户级服务缺失。请在允许 doctor 安装用户服务之前移除或禁用重复项，或者如果系统单元才是预期的监管者，则设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。
    - `Gateway service port does not match current gateway config` → 已安装的监督进程仍然固定在旧的 `--port`。运行 `openclaw doctor --fix` 或 `openclaw gateway install --force`，然后重启 gateway 服务。

  </Accordion>
</AccordionGroup>

相关：

- [后台执行和进程工具](/gateway/background-process)
- [配置](/gateway/configuration)
- [Doctor](/gateway/doctor)

## Gateway 恢复了最后已知良好配置

当 Gateway 可以启动，但日志显示它恢复了 `openclaw.json` 时使用此项。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查看以下内容：

- `Config auto-restored from last-known-good`
- `gateway: invalid config was restored from last-known-good backup`
- `config reload restored last-known-good config after invalid-config`
- 活动配置旁边带时间戳的 `openclaw.json.clobbered.*` 文件
- 以 `Config recovery warning` 开头的主代理系统事件

<AccordionGroup>
  <Accordion title="发生了什么">
    - 被拒绝的配置在启动或热重载期间未通过验证。
    - OpenClaw 将被拒绝的载荷保存为 `.clobbered.*`。
    - 活动配置已从上一次已验证的 last-known-good 副本恢复。
    - 下一次主代理轮次会收到警告，不要盲目重写被拒绝的配置。
    - 如果所有验证问题都位于 `plugins.entries.<id>...` 下，OpenClaw 不会恢复整个文件。插件本地失败会保持明显可见，而无关的用户设置仍保留在活动配置中。

  </Accordion>
  <Accordion title="检查并修复">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion title="常见特征">
    - `.clobbered.*` 存在 → 外部直接编辑或启动时读取的内容已被恢复。
    - `.rejected.*` 存在 → OpenClaw 管理的配置写入在提交前因 schema 或 clobber 检查失败。
    - `Config write rejected:` → 写入尝试删除必需结构、显著缩小文件，或持久化无效配置。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good`，或 `size-drop-vs-last-good:*` → 启动将当前文件视为被覆盖，因为与 last-known-good 备份相比它丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选项包含已脱敏的密钥占位符，例如 `***`。

  </Accordion>
  <Accordion title="修复选项">
    1. 如果恢复后的活动配置是正确的，就保留它。
    2. 只从 `.clobbered.*` 或 `.rejected.*` 中复制需要的键，然后使用 `openclaw config set` 或 `config.patch` 应用。
    3. 在重启前运行 `openclaw config validate`。
    4. 如果手动编辑，请保留完整的 JSON5 配置，而不是只保留你想修改的部分对象。
  </Accordion>
</AccordionGroup>

相关：

- [配置](/cli/config)
- [配置：热重载](/gateway/configuration#config-hot-reload)
- [配置：严格验证](/gateway/configuration#strict-validation)
- [Doctor](/gateway/doctor)

## Gateway 探测警告

当 `openclaw gateway probe` 能连到某个目标，但仍然输出警告块时使用此项。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查看以下内容：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否与 SSH 回退、多 gateway、缺失 scopes，或未解析的 auth 引用有关。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试直接探测已配置/loopback 目标。
- `multiple reachable gateways detected` → 有多个目标响应。这通常意味着有意配置了多 gateway，或者存在陈旧/重复监听器。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接成功，但详细 RPC 受 scope 限制；请配对设备身份或使用包含 `operator.read` 的凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 连接成功，但完整的诊断 RPC 集超时或失败。将其视为可达但诊断降级的 Gateway；在 `--json` 输出中对比 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → gateway 已响应，但此客户端在获得正常操作员访问权限前仍需配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此次命令路径中，失败目标的认证材料不可用。

相关：

- [Gateway](/cli/gateway)
- [同一主机上的多个 gateway](/gateway#multiple-gateways-same-host)
- [远程访问](/gateway/remote)

## 通道已连接，但消息未流动

如果通道状态显示已连接但消息流停滞，请重点检查策略、权限和通道特定的投递规则。

```bash
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw status --deep
openclaw logs --follow
openclaw config get channels
```

查看以下内容：

- DM 策略（`pairing`、`allowlist`、`open`、`disabled`）。
- 群组 allowlist 和提及要求。
- 缺失的通道 API 权限/scopes。

常见特征：

- `mention required` → 消息因群组提及策略而被忽略。
- `pairing` / 待批准跟踪信息 → 发送方未获批准。
- `missing_scope`、`not_in_channel`、`Forbidden`、`401/403` → 通道认证/权限问题。

相关：

- [通道故障排查](/channels/troubleshooting)
- [Discord](/channels/discord)
- [Telegram](/channels/telegram)
- [WhatsApp](/channels/whatsapp)

## Cron 和 heartbeat 投递

如果 cron 或 heartbeat 未运行或未投递，先验证调度器状态，再检查投递目标。

```bash
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw system heartbeat last
openclaw logs --follow
```

查看以下内容：

- 已启用 cron 且存在下一次唤醒。
- 作业运行历史状态（`ok`、`skipped`、`error`）。
- Heartbeat 跳过原因（`quiet-hours`、`requests-in-flight`、`cron-in-progress`、`lanes-busy`、`alerts-disabled`、`empty-heartbeat-file`、`no-tasks-due`）。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度器 tick 失败；检查文件/日志/运行时错误。
    - `heartbeat skipped` 且 `reason=quiet-hours` → 不在活跃时段窗口内。
    - `heartbeat skipped` 且 `reason=empty-heartbeat-file` → `HEARTBEAT.md` 存在，但只包含空行 / markdown 标题，因此 OpenClaw 会跳过模型调用。
    - `heartbeat skipped` 且 `reason=no-tasks-due` → `HEARTBEAT.md` 包含 `tasks:` 区块，但此刻没有任何任务到期。
    - `heartbeat: unknown accountId` → 用于 heartbeat 投递目标的 account id 无效。
    - `heartbeat skipped` 且 `reason=dm-blocked` → heartbeat 目标被解析为 DM 风格目的地，而 `agents.defaults.heartbeat.directPolicy`（或按 agent 的覆盖项）设置为 `block`。

  </Accordion>
</AccordionGroup>

相关：

- [Heartbeat](/gateway/heartbeat)
- [计划任务](/automation/cron-jobs)
- [计划任务：故障排查](/automation/cron-jobs#troubleshooting)

## 节点已配对，但工具失败

如果节点已配对但工具失败，请分别检查前台、权限和批准状态。

```bash
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow
openclaw status
```

查看以下内容：

- 节点在线且具备预期能力。
- 摄像头/麦克风/位置/屏幕的操作系统权限授予。
- 执行批准和 allowlist 状态。

常见特征：

- `NODE_BACKGROUND_UNAVAILABLE` → 节点应用必须在前台运行。
- `*_PERMISSION_REQUIRED` / `LOCATION_PERMISSION_REQUIRED` → 缺少操作系统权限。
- `SYSTEM_RUN_DENIED: approval required` → 执行批准待处理。
- `SYSTEM_RUN_DENIED: allowlist miss` → 命令被 allowlist 阻止。

相关：

- [执行批准](/tools/exec-approvals)
- [节点故障排查](/nodes/troubleshooting)
- [节点](/nodes/index)

## 浏览器工具失败

当浏览器工具动作失败，而网关本身仍然正常时使用此项。

```bash
openclaw browser status
openclaw browser start --browser-profile openclaw
openclaw browser profiles
openclaw logs --follow
openclaw doctor
```

请注意：

- `plugins.allow` 是否已设置并包含 `browser`。
- 浏览器可执行文件路径是否有效。
- CDP 配置文件是否可达。
- `existing-session` / `user` 配置文件的本地 Chrome 是否可用。

<AccordionGroup>
  <Accordion title="插件 / 可执行文件签名">
    - `unknown command "browser"` 或 `unknown command 'browser'` → 内置浏览器插件被 `plugins.allow` 排除了。
    - browser tool missing / unavailable while `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不受支持的协议，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口错误或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少内置浏览器插件的 `playwright-core` 运行时依赖；请运行 `openclaw doctor --fix`，然后重启网关。ARIA 快照和基础页面截图仍然可用，但导航、AI 快照、CSS 选择器元素截图以及 PDF 导出仍不可用。

  </Accordion>
  <Accordion title="Chrome MCP / existing-session 签名">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session 还无法附加到所选的浏览器数据目录。打开浏览器检查页面，启用远程调试，保持浏览器开启，确认首次附加提示，然后重试。如果不需要登录状态，优先使用受管理的 `openclaw` 配置文件。
    - `No Chrome tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点从网关主机无法访问。
    - `Browser attachOnly is enabled ... not reachable` 或 `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可达目标，或者 HTTP 端点已响应，但 CDP WebSocket 仍无法打开。

  </Accordion>
  <Accordion title="元素 / 截图 / 上传签名">
    - `fullPage is not supported for element screenshots` → 截图请求将 `--full-page` 与 `--ref` 或 `--element` 混用了。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，不能使用 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上每次调用只发送一个上传文件。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
    - `existing-session type does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP existing-session 配置文件上为 `act:type` 省略 `timeoutMs`，或者在需要自定义超时时使用受管理/CDP 浏览器配置文件。
    - `existing-session evaluate does not support timeoutMs overrides.` → 在 `profile="user"` / Chrome MCP existing-session 配置文件上为 `act:evaluate` 省略 `timeoutMs`，或者在需要自定义超时时使用受管理/CDP 浏览器配置文件。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理浏览器或原始 CDP 配置文件。
    - attach-only 或远程 CDP 配置文件上的陈旧视口 / 深色模式 / 区域设置 / 离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 关闭当前控制会话，并释放 Playwright/CDP 模拟状态，而无需重启整个网关。

  </Accordion>
</AccordionGroup>

相关：

- [浏览器（OpenClaw 托管）](/tools/browser)
- [浏览器故障排查](/tools/browser-linux-troubleshooting)

## 如果你升级后某些内容突然坏了

大多数升级后的故障都是配置漂移或更严格的默认值现在开始被强制执行所致。

<AccordionGroup>
  <Accordion title="1. 认证和 URL 覆盖行为已更改">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    需要检查什么：

    - 如果 `gateway.mode=remote`，CLI 调用可能会指向远程，而你的本地服务其实是正常的。
    - 显式的 `--url` 调用不会回退到已保存的凭据。

    常见签名：

    - `gateway connect failed:` → 目标 URL 错误。
    - `unauthorized` → 端点可达，但认证错误。

  </Accordion>
  <Accordion title="2. 绑定和认证防护现在更严格了">
    ```bash
    openclaw config get gateway.bind
    openclaw config get gateway.auth.mode
    openclaw config get gateway.auth.token
    openclaw gateway status
    openclaw logs --follow
    ```

    需要检查什么：

    - 非回环绑定（`lan`、`tailnet`、`custom`）需要有效的网关认证路径：共享令牌/密码认证，或正确配置的非回环 `trusted-proxy` 部署。
    - 旧键如 `gateway.token` 不能替代 `gateway.auth.token`。

    常见签名：

    - `refusing to bind gateway ... without auth` → 非回环绑定，但没有有效的网关认证路径。
    - `Connectivity probe: failed` 且运行时正在运行 → 网关在线，但使用当前认证/URL 无法访问。

  </Accordion>
  <Accordion title="3. 配对和设备身份状态已更改">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    需要检查什么：

    - 仪表板/节点是否有待处理的设备批准。
    - 在策略或身份变更后，是否有待处理的 DM 配对批准。

    常见签名：

    - `device identity required` → 设备认证未满足。
    - `pairing required` → 发送方/设备必须先获批。

  </Accordion>
</AccordionGroup>

如果在检查后服务配置和运行时仍然不一致，请从同一个配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [认证](/gateway/authentication)
- [后台执行和进程工具](/gateway/background-process)
- [网关拥有的配对](/gateway/pairing)

## 相关

- [诊断](/gateway/doctor)
- [常见问题](/help/faq)
- [网关运行手册](/gateway)
