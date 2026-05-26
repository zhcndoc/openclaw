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

## 更新后

当更新完成但网关已关闭、通道为空，或模型调用开始因 401 失败时，请使用此项。

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

查看以下内容：

- 在 `openclaw status` / `openclaw status --all` 中出现 `Update restart`。待处理或失败的交接会包含下一条要运行的命令。
- 在 Channels 下出现 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`。这表示通道配置仍然存在，但插件注册在通道加载之前就失败了。
- 重新认证后出现提供方 401。`openclaw doctor --fix` 会检查过期的按代理 OAuth 认证影子副本，并删除旧副本，从而让所有代理解析到当前共享配置文件。

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

## 回滚后协议不匹配

当你降级或回滚 OpenClaw 后，日志持续打印 `protocol mismatch` 时使用此项。这意味着较旧的 Gateway 正在运行，但较新的本地客户端进程仍在尝试以较旧 Gateway 无法理解的协议范围重新连接。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

查看以下内容：

- Gateway 日志中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:`，或 `openclaw doctor --deep` 中的 `Gateway clients`。这会列出连接到 Gateway 端口的活动 TCP 客户端，包括操作系统允许时的 PID 和命令行。
- 命令行指向你回滚前所用的较新 OpenClaw 安装或包装器的客户端进程。

修复方法：

1. 停止或重启 `gateway status --deep` 中显示的陈旧 OpenClaw 客户端进程。
2. 重启嵌入 OpenClaw 的应用或包装器，例如本地仪表板、编辑器、应用服务器辅助进程，或长时间运行的 `openclaw logs --follow` shell。
3. 重新运行 `openclaw gateway status --deep` 或 `openclaw doctor --deep`，确认陈旧客户端 PID 已消失。

不要让较旧的 Gateway 接受较新的不兼容协议。协议升级是为了保护传输契约；回滚恢复是进程/版本清理问题。

## 技能符号链接因路径逃逸而被跳过

当日志包含以下内容时使用此项：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

OpenClaw 将每个技能根视为一个封闭边界。`~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符号链接，如果其真实目标解析到该根之外，则会被跳过，除非该目标被显式信任。

检查该链接：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果目标是有意为之，请同时配置直接技能根和允许的符号链接目标：

```json5
{
  skills: {
    load: {
      extraDirs: ["~/Projects/manager/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
  },
}
```

然后启动新会话，或等待技能监视器刷新。如果当前运行进程早于配置更改，请重启网关。

不要使用过于宽泛的目标，例如 `~`、`/`，或整个同步项目文件夹。请将 `allowSymlinkTargets` 的范围限制在包含受信任 `SKILL.md` 目录的真实技能根。

相关：

- [技能配置](/tools/skills-config#symlinked-sibling-repos)
- [配置示例](/gateway/configuration-examples#symlinked-sibling-skill-repo)

## Anthropic 429 长上下文需要额外用量

当日志/错误包含 `HTTP 429: rate_limit_error: Extra usage is required for long context requests` 时使用此项。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查看以下内容：

- 所选 Anthropic 模型是支持 GA 的 1M Claude 4.x 模型，或者该模型具有旧版 `params.context1m: true`。
- 当前 Anthropic 凭据不具备长上下文用量资格。
- 请求只在需要 1M 上下文路径的长会话/模型运行中失败。

修复选项：

<Steps>
  <Step title="使用标准上下文窗口">
    切换到标准窗口模型，或从不具备 1M 上下文 GA 能力的旧模型配置中移除旧版 `context1m`。
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

## 上游 403 阻止响应

当上游 LLM 提供方返回通用 `403`，例如
`Your request was blocked` 时使用此项。

不要假设这总是 OpenClaw 配置问题。该响应也可能来自上游安全层，例如位于 OpenAI 兼容端点前的 CDN、WAF、机器人管理规则或反向代理。

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

查看以下内容：

- 同一提供方下多个模型以相同方式失败
- 普通提供方 API 错误之外的 HTML 或通用安全文本
- 相同请求时间点的提供方侧安全事件
- 一个很小的直接 `curl` 探测成功，而正常 SDK 形态请求失败

当证据指向 WAF/CDN 阻断时，先修复提供方侧过滤。优先为 OpenClaw 使用的 API 路径设置范围很窄的允许或跳过规则，并避免对整个站点禁用保护。

<Warning>
成功的最小 `curl` 并不保证真实的 SDK 风格请求也能通过同一个上游安全层。
</Warning>

相关：

- [OpenAI 兼容端点](/gateway/configuration-reference#openai-compatible-endpoints)
- [提供方配置](/providers)
- [日志](/logging)

## 本地 OpenAI 兼容后端可通过直接探测，但代理运行失败

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
    - 带有本地 MLX/vLLM 风格服务器的 `model_not_found` → 验证 `baseUrl` 包含 `/v1`，对于 `/v1/chat/completions` 后端，`api` 应为 `"openai-completions"`，并且 `models.providers.<provider>.models[].id` 是裸的 provider 本地 id。首次选择时使用 provider 前缀，例如 `mlx/mlx-community/Qwen3-30B-A3-B-6bit`；目录条目仍保留为 `mlx-community/Qwen3-30B-A3-B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string` → 后端拒绝结构化的 Chat Completions 内容片段。修复：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允许的消息键如 `["role","content"]` → 后端拒绝 Chat Completions 消息上的 OpenAI 风格重放元数据。修复：设置 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0` → 后端完成了 Chat Completions 请求，但该轮没有返回任何用户可见的助手文本。OpenClaw 会对可重放的空 OpenAI 兼容轮次重试一次；持续失败通常意味着后端正在输出空/非文本内容，或抑制了最终答案文本。
    - 直接的小请求成功，但 OpenClaw 代理运行在后端/模型崩溃时失败（例如某些 `inferrs` 构建上的 Gemma）→ OpenClaw 传输层大概率已经正确；后端正在更大的代理运行时提示词形状上失败。
    - 禁用工具后失败缩小但并未消失 → 工具 schema 是压力来源的一部分，但剩余问题仍然是上游模型/服务器容量或后端 bug。

  </Accordion>
  <Accordion title="修复选项">
    1. 为仅接受字符串的 Chat Completions 后端设置 `compat.requiresStringContent: true`。
    2. 为只接受每条消息中 `role` 和 `content` 的严格 Chat Completions 后端设置 `compat.strictMessageKeys: true`。
    3. 为无法稳定处理 OpenClaw 工具模式面的模型/后端设置 `compat.supportsTools: false`。
    4. 尽可能降低提示词压力：更小的工作区启动内容、更短的会话历史、更轻量的本地模型，或使用更强的长上下文支持后端。
    5. 如果小型直接请求持续通过，而 OpenClaw 代理轮次仍然在后端内部崩溃，则应将其视为上游服务器/模型限制，并用被接受的载荷形状向上游提交复现问题。
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

如果更新后本地浏览器无法连接到 `127.0.0.1:18789`，请先恢复本地 Gateway 服务，并确认它正在提供仪表板：

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

如果 `curl` 返回 OpenClaw HTML，则说明 Gateway 正常运行，剩余问题很可能是浏览器缓存、旧的深链接，或陈旧的标签页状态。请直接打开 `http://127.0.0.1:18789`，然后从仪表板继续导航。如果重启后服务没有保持运行，请运行 `openclaw gateway start` 并重新检查 `openclaw gateway status`。

<AccordionGroup>
  <Accordion title="连接 / 认证特征">
    - `device identity required` → 非安全上下文或缺少设备认证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者你正从非回环浏览器来源连接，但没有显式允许列表）。
    - `device nonce required` / `device nonce mismatch` → 客户端没有完成基于挑战的设备认证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的载荷（或过期时间戳）。
    - `AUTH_TOKEN_MISMATCH` with `canRetryWithDeviceToken=true` → 客户端可以使用缓存的设备 token 进行一次受信任重试。
    - 该缓存 token 重试会重用与已配对设备 token 一起存储的缓存作用域集合。显式 `deviceToken` / 显式 `scopes` 调用方则会保留其请求的作用域集合。
    - `AUTH_SCOPE_MISMATCH` → 已识别设备 token，但其已批准作用域不涵盖此次连接请求；请重新配对或批准请求的作用域契约，而不是轮换共享网关 token。
    - 在该重试路径之外，连接认证优先级依次为：显式共享 token/password、显式 `deviceToken`、已存储设备 token、引导 token。
    - 在异步 Tailscale Serve Control UI 路径上，同一 `{scope, ip}` 的失败尝试会在限速器记录失败之前被串行化。因此，同一客户端的两个错误并发重试可能会在第二次尝试中表现为 `retry later`，而不是两个普通的不匹配。
    - 来自浏览器来源回环客户端的 `too many failed authentication attempts (retry later)` → 来自同一规范化 `Origin` 的重复失败会被临时锁定；另一个 localhost 来源会使用单独的桶。
    - 在该重试之后仍反复 `unauthorized` → 共享 token/设备 token 漂移；刷新 token 配置，必要时重新批准/轮换设备 token。
    - `gateway connect failed:` → 主机/端口/url 目标错误。

  </Accordion>
</AccordionGroup>

### 认证详情代码速查表

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详情代码                     | 含义                                                                                                                                                                                        | 建议操作                                                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享 token。                                                                                                                                                               | 在客户端粘贴/设置 token，然后重试。对于仪表板路径：先运行 `openclaw config get gateway.auth.token`，然后粘贴到 Control UI 设置中。                                                                                                                                                        |
| `AUTH_TOKEN_MISMATCH`        | 共享 token 与网关认证 token 不匹配。                                                                                                                                                         | 如果 `canRetryWithDeviceToken=true`，允许一次受信任重试。缓存 token 重试会复用已存储的已批准作用域；显式 `deviceToken` / `scopes` 调用方保留请求的作用域。如果仍然失败，请运行 [令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。                                            |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 按设备缓存的 token 已过期或被撤销。                                                                                                                                                           | 使用 [设备 CLI](/cli/devices) 轮换/重新批准设备 token，然后重新连接。                                                                                                                                                                                                                  |
| `AUTH_SCOPE_MISMATCH`        | 设备 token 有效，但其已批准的角色/作用域不覆盖此次连接请求。                                                                                                                                  | 重新配对设备，或批准所请求的作用域契约；不要将其视为共享 token 漂移。                                                                                                                                                                                                                   |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason` 是否为 `not-paired`、`scope-upgrade`、`role-upgrade` 或 `metadata-upgrade`，并在可用时使用 `requestId` / `remediationHint`。 | 批准待处理请求：`openclaw devices list` 然后 `openclaw devices approve <requestId>`。在审阅所请求的访问后，作用域/角色升级使用相同流程。                                                                                                                                                |

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

## Gateway 服务未运行

当服务已安装但进程无法保持运行时使用此项。

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
openclaw doctor
openclaw gateway status --deep   # 也会扫描系统级服务
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

## Gateway 在高内存使用时退出

当 Gateway 在负载下消失、监督程序报告 OOM 风格的重启，或日志中提到 `critical memory pressure bundle written` 时使用此项。

```bash
openclaw gateway status --deep
openclaw logs --follow
openclaw gateway stability --bundle latest
openclaw gateway diagnostics export
```

查看以下内容：

- 最新稳定性包中的 `Reason: diagnostic.memory.pressure.critical`。
- `Memory pressure:`，以及 `critical/rss_threshold`、`critical/heap_threshold` 或 `critical/rss_growth`。
- 接近堆上限的 `V8 heap:` 数值。
- `Largest session files:` 条目，例如 `agents/<agent>/sessions/<session>.jsonl` 或 `sessions/<session>.jsonl`。
- 当 gateway 在容器或内存受限服务中运行时，Linux cgroup 内存计数器。

常见特征：

- `critical memory pressure bundle written` 出现在重启前不久 → OpenClaw 捕获了一个 OOM 前的稳定性包。使用 `openclaw gateway stability --bundle latest` 检查它。
- gateway 日志中出现 `memory pressure: level=critical ... memoryPressureSnapshot=disabled` → OpenClaw 检测到严重内存压力，但 OOM 前的稳定性快照未开启。
- `Largest session files:` 指向一个非常大的脱敏转录路径 → 在重启前减少保留的会话历史、检查会话增长，或将旧转录移出活动存储。
- `V8 heap:` 已用字节接近堆上限 → 降低提示/会话压力、减少并发工作，或仅在确认工作负载确实如此之后再提高 Node 堆限制。
- `Memory pressure: critical/rss_growth` → 内存在一个采样窗口内快速增长。检查最新日志中是否有大导入、失控的工具输出、重复重试，或一批排队的 agent 工作。
- 日志中出现严重内存压力，但没有 bundle → 这是默认行为。将 `diagnostics.memoryPressureSnapshot: true` 设为开启，以便在未来严重内存压力事件中捕获 OOM 前稳定性包。

稳定性包不包含有效载荷。它只包含运行中的内存证据和脱敏后的相对文件路径，不包含消息文本、webhook 正文、凭据、token、cookie 或原始 session id。请将诊断导出附加到 bug 报告中，而不是复制原始日志。

相关：

- [Gateway 健康状况](/gateway/health)
- [诊断导出](/gateway/diagnostics)
- [会话](/cli/sessions)

## Gateway 拒绝了无效配置

当 Gateway 启动失败并显示 `Invalid config`，或者热重载日志显示它跳过了无效编辑时使用此项。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查看以下内容：

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- 活动配置旁边带时间戳的 `openclaw.json.rejected.*` 文件
- 如果 `doctor --fix` 修复了一个损坏的直接编辑，则会出现带时间戳的 `openclaw.json.clobbered.*` 文件
- OpenClaw 为每个配置路径保留最新的 32 个 `.clobbered.*` 文件，并轮转更旧的文件

<AccordionGroup>
  <Accordion title="发生了什么">
    - 配置在启动、热重载或由 OpenClaw 管理的写入过程中未能通过验证。
    - Gateway 启动时会失败关闭，而不会重写 `openclaw.json`。
    - 热重载会跳过无效的外部编辑，并保持当前运行时配置生效。
    - 由 OpenClaw 管理的写入会在提交前拒绝无效/破坏性负载，并保存 `.rejected.*`。
    - `openclaw doctor --fix` 负责修复。它可以移除非 JSON 前缀，或恢复最后已知良好的副本，同时将被拒绝的负载保留为 `.clobbered.*`。
    - 当同一个配置路径发生多次修复时，OpenClaw 会轮转较旧的 `.clobbered.*` 文件，以便最新修复后的负载仍然可用。

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
  <Accordion title="常见签名">
    - `.clobbered.*` 存在 → doctor 在修复活动配置时保留了一个损坏的外部编辑。
    - `.rejected.*` 存在 → 一个 OpenClaw 所有的配置写入在提交前因 schema 或 clobber 检查失败。
    - `Config write rejected:` → 该写入试图删除必需结构、显著缩小文件，或持久化无效配置。
    - `config reload skipped (invalid config):` → 一次直接编辑未通过验证，被正在运行的 Gateway 忽略。
    - `Invalid config at ...` → Gateway 服务启动前就已失败。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → 一个 OpenClaw 所有的写入因相较于最后已知良好备份丢失了字段或体积而被拒绝。
    - `Config last-known-good promotion skipped` → 候选配置包含被脱敏的秘密占位符，例如 `***`。

  </Accordion>
  <Accordion title="修复选项">
    1. 运行 `openclaw doctor --fix`，让 doctor 修复带前缀/被 clobber 的配置，或恢复最后已知良好版本。
    2. 只从 `.clobbered.*` 或 `.rejected.*` 中复制你想保留的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 重启前先运行 `openclaw config validate`。
    4. 如果你手动编辑，请保留完整的 JSON5 配置，而不是只保留你想修改的部分对象。
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
    - `unknown command "browser"` 或 `unknown command 'browser'` → bundled browser plugin 被 `plugins.allow` 排除了。
    - 在 `browser.enabled=true` 时浏览器工具缺失 / 不可用 → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的 scheme，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口不正确或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前 gateway 安装缺少核心浏览器运行时依赖；请重新安装或更新 OpenClaw，然后重启 gateway。ARIA 快照和基础页面截图仍可正常工作，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出将不可用。

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

## 如果你在升级后突然遇到故障

大多数升级期间的故障都是由配置漂移或现在启用了更严格的默认值引起的。

<AccordionGroup>
  <Accordion title="1. 认证和 URL 覆盖行为已更改">
    ```bash
    openclaw gateway status
    openclaw config get gateway.mode
    openclaw config get gateway.remote.url
    openclaw config get gateway.auth.mode
    ```

    需要检查的内容：

    - 如果 `gateway.mode=remote`，CLI 调用可能指向远程端，而你的本地服务实际上是正常的。
    - 显式的 `--url` 调用不会回退到已保存的凭据。

    常见特征：

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

    需要检查的内容：

    - 非 loopback 绑定（`lan`、`tailnet`、`custom`）需要有效的 gateway 认证路径：共享令牌/密码认证，或者经过正确配置的非 loopback `trusted-proxy` 部署。
    - 较旧的键，例如 `gateway.token`，不能替代 `gateway.auth.token`。

    常见特征：

    - `refusing to bind gateway ... without auth` → 非 loopback 绑定，但没有有效的 gateway 认证路径。
    - `Connectivity probe: failed` 且运行时正在运行 → gateway 已启动，但在当前认证/URL 下不可达。

  </Accordion>
  <Accordion title="3. 配对和设备身份状态已更改">
    ```bash
    openclaw devices list
    openclaw pairing list --channel <channel> [--account <id>]
    openclaw logs --follow
    openclaw doctor
    ```

    需要检查的内容：

    - 仪表盘/节点是否有待处理的设备批准。
    - 在策略或身份变更后，是否存在待处理的 DM 配对批准。

    常见特征：

    - `device identity required` → 设备认证不满足。
    - `pairing required` → 发送方/设备必须先获得批准。

  </Accordion>
</AccordionGroup>

如果检查后，服务配置和运行时仍然不一致，请从同一个配置文件/状态目录重新安装服务元数据：

```bash
openclaw gateway install --force
openclaw gateway restart
```

相关：

- [认证](/gateway/authentication)
- [后台执行和进程工具](/gateway/background-process)
- [Gateway 拥有的配对](/gateway/pairing)

## 相关

- [诊断](/gateway/doctor)
- [常见问题](/help/faq)
- [Gateway 运行手册](/gateway)
