---
summary: "网关、通道、自动化、节点和浏览器的深度故障排查运行手册"
read_when:
  - 故障排查中心将你带到这里进行更深入的诊断
  - 你需要带有精确命令的、基于症状的稳定运行手册章节
title: "故障排查"
sidebarTitle: "故障排查"
---

这是深度运行手册。请先从 [/help/troubleshooting](/help/troubleshooting) 开始，查看快速分诊流程。

## 命令阶梯

按以下顺序运行：

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe
```

健康信号：

- `openclaw gateway status` 显示 `Runtime: running`、`Connectivity probe: ok`，以及一行 `Capability: ...`。
- `openclaw doctor` 不报告任何阻塞性的配置/服务问题。
- `openclaw channels status --probe` 显示按账户划分的实时传输状态，并且在支持的情况下显示 `works` 或 `audit ok`。

## 更新后

当更新完成但 Gateway 已关闭、通道为空，或模型调用因 401 错误而失败时使用。

```bash
openclaw status --all
openclaw update status --json
openclaw gateway status --deep
openclaw doctor --fix
openclaw gateway restart
```

查看以下内容：

- `openclaw status` / `openclaw status --all` 中的 `Update restart`。待处理或失败的交接会包含下一条要运行的命令。
- Channels 下的 `plugin load failed: dependency tree corrupted; run openclaw doctor --fix`：通道配置仍然存在，但插件在通道加载之前注册失败。
- 重新认证后的 Provider 401：`openclaw doctor --fix` 会检查每个代理中是否存在过期的 OAuth 认证影子，并移除旧副本，以便所有代理解析到当前共享配置文件。

## 分裂脑安装与较新配置保护

当网关服务在更新后意外停止，或者日志显示某个 `openclaw` 二进制版本比最后写入 `openclaw.json` 的版本更旧时使用。

OpenClaw 会在配置写入时标记 `meta.lastTouchedVersion`。只读命令可以检查由较新 OpenClaw 写入的配置，但进程和服务变更若来自较旧的二进制则会被拒绝。被阻止的操作包括：网关服务启动/停止/重启/卸载、强制重装服务、以服务模式启动网关，以及 `gateway --force` 端口清理。

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

当降级或回滚后日志持续打印 `protocol mismatch` 时使用。此时运行的是较旧的 Gateway，但某个较新的本地客户端进程仍在以较旧 Gateway 无法支持的协议范围重新连接。

```bash
openclaw --version
which -a openclaw
openclaw gateway status --deep
openclaw doctor --deep
openclaw logs --follow
```

查看以下内容：

- Gateway 日志中的 `protocol mismatch ... client=... v<version> min=<n> max=<n> expected=<n>`。
- `openclaw gateway status --deep` 中的 `Established clients:`，或 `openclaw doctor --deep` 中的 `Gateway clients`：与 Gateway 端口连接的活动 TCP 客户端，在操作系统允许时会显示 PID 和命令行。
- 命令行指向你回滚前的较新 OpenClaw 安装或包装器的客户端进程。

修复方法：

1. 停止或重启 `gateway status --deep` 中显示的那个失效的 OpenClaw 客户端进程。
2. 重启嵌入 OpenClaw 的应用或包装器：本地仪表盘、编辑器、应用服务器辅助进程，或长期运行的 `openclaw logs --follow` shell。
3. 重新运行 `openclaw gateway status --deep` 或 `openclaw doctor --deep`，确认失效客户端的 PID 已消失。

不要让较旧的 Gateway 接受较新的不兼容协议。协议升级是为了保护传输契约；回滚恢复是进程/版本清理问题。

## 技能符号链接因路径逃逸而被跳过

当日志包含以下内容时使用：

```text
Skipping escaped skill path outside its configured root: ... reason=symlink-escape
```

每个技能根目录都是一个包含边界。当 `~/.agents/skills`、`<workspace>/.agents/skills`、`<workspace>/skills` 或 `~/.openclaw/skills` 下的符号链接，其真实目标解析到该根目录之外时，会被跳过，除非该目标已被显式信任。

检查该链接：

```bash
ls -l ~/.agents/skills/<name>
realpath ~/.agents/skills/<name>
openclaw config get skills.load
```

如果该目标是有意如此，请同时配置直接技能根目录和允许的符号链接目标：

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

然后启动新的会话，或等待 skills 监视器刷新。如果运行中的进程早于配置更改，则重启网关。

不要使用过于宽泛的目标，例如 `~`、`/`，或整个同步项目文件夹。请将 `allowSymlinkTargets` 的范围限制在包含受信任 `SKILL.md` 目录的真实技能根目录。

如果 Skill Workshop 的 apply 也需要通过这些受信任的、经符号链接指向的 workspace 技能路径写入，请启用 `skills.workshop.allowSymlinkTargetWrites`。对于只读的共享技能根目录，请保持其禁用。

相关：

- [技能配置](/tools/skills-config#symlinked-skill-roots)
- [配置示例](/gateway/configuration-examples#symlinked-sibling-skill-repo)。

## Anthropic 429 长上下文需要额外用量

当日志/错误中包含以下内容时使用：`HTTP 429: rate_limit_error: 长上下文请求需要额外用量`。

```bash
openclaw logs --follow
openclaw models status
openclaw config get agents.defaults.models
```

查看以下内容：

- 所选的 Anthropic 模型是支持 GA 的 100 万上下文 Claude 4.x 模型（Opus 4.6/4.7/4.8、Sonnet 4.6），或者模型配置仍然保留了旧版 `params.context1m: true`。
- 当前 Anthropic 凭据不符合长上下文使用资格。
- 请求仅在需要 100 万上下文路径的长会话/模型运行中失败。

修复选项：

<Steps>
  <Step title="使用标准上下文窗口">
    切换到标准窗口模型，或从不具备 100 万上下文 GA 能力的旧模型配置中移除旧版 `context1m`。
  </Step>
  <Step title="使用有资格的凭据">
    使用符合长上下文请求资格的 Anthropic 凭据，或切换为 Anthropic API 密钥。
  </Step>
  <Step title="配置回退模型">
    配置回退模型，以便在 Anthropic 长上下文请求被拒绝时运行仍可继续。
  </Step>
</Steps>

相关：

- [Anthropic](/providers/anthropic)
- [令牌使用与费用](/reference/token-use)
- [为什么我从 Anthropic 看到了 HTTP 429？](/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)

## 上游 403 阻止响应

当上游 LLM 提供方返回通用 `403`（例如 `Your request was blocked`）时使用。

不要假设这总是 OpenClaw 的配置问题。该响应也可能来自 OpenClaw 兼容端点前面的上游安全层，例如 CDN、WAF、机器人管理规则或反向代理。

```bash
openclaw status
openclaw gateway status
openclaw logs --follow
```

查看以下内容：

- 同一提供方下的多个模型都以相同方式失败。
- 返回的是 HTML 或通用安全文案，而不是正常的提供方 API 错误。
- 同一请求时间点在提供方侧有安全事件记录。
- 一个很小的直接 `curl` 探测成功，但正常 SDK 形式的请求失败。

如果证据指向 WAF/CDN 阻止，应优先修复提供方侧的过滤。优先为 OpenClaw 使用的 API 路径添加范围尽可能小的允许或跳过规则，并避免对整个站点禁用保护。

<Warning>
成功的最小 `curl` 并不能保证真实的 SDK 风格请求也会通过同一个上游安全层。
</Warning>

相关：

- [OpenAI 兼容端点](/gateway/configuration-reference#openai-compatible-endpoints)
- [提供方配置](/providers)
- [日志](/logging)

## 本地 OpenAI 兼容后端可通过直接探测，但代理运行失败

适用场景：

- `curl ... /v1/models` 可正常工作。
- 直接发起很小的 `/v1/chat/completions` 调用可正常工作。
- OpenClaw 模型运行仅在正常代理轮次中失败。

```bash
curl http://127.0.0.1:1234/v1/models
curl http://127.0.0.1:1234/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<id>","messages":[{"role":"user","content":"hi"}],"stream":false}'
openclaw infer model run --model <provider/model> --prompt "hi" --json
openclaw logs --follow
```

查看以下内容：

- 直接的小型调用成功，但 OpenClaw 运行仅在更大的提示词下失败。
- 即使直接 `/v1/chat/completions` 使用相同的裸模型 id 可以工作，仍然出现 `model_not_found` 或 404 错误。
- 后端报错 `messages[].content` 期望字符串。
- 使用 OpenAI 兼容的本地后端时，间歇性出现 `incomplete turn detected ... stopReason=stop payloads=0` 警告。
- 仅在更大的提示 token 数或完整代理运行提示词下才出现的后端崩溃。

<AccordionGroup>
  <Accordion title="常见特征">
    - 对于本地 MLX/vLLM 风格服务器出现 `model_not_found`：请验证 `baseUrl` 是否包含 `/v1`，`api` 是否为 `"openai-completions"`（适用于 `/v1/chat/completions` 后端），以及 `models.providers.<provider>.models[].id` 是否为提供方本地的裸 id。首次选择时带上提供方前缀，例如 `mlx/mlx-community/Qwen3-30B-A3-B-6bit`；目录条目应保持为 `mlx-community/Qwen3-30B-A3-B-6bit`。
    - `messages[...].content: invalid type: sequence, expected a string`：后端拒绝结构化的 Chat Completions 内容分片。修复方法：设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
    - `validation.keys` 或允许的消息键仅为 `["role","content"]`：后端拒绝 Chat Completions 消息中的 OpenAI 风格回放元数据。修复方法：设置 `models.providers.<provider>.models[].compat.strictMessageKeys: true`。
    - `incomplete turn detected ... stopReason=stop payloads=0`：后端已完成 Chat Completions 请求，但该轮没有返回任何用户可见的助手文本。OpenClaw 会对可回放且为空的 OpenAI 兼容轮次重试一次；持续失败通常意味着后端在输出空/非文本内容，或抑制了最终答案文本。
    - 直接的小型请求成功，但 OpenClaw 代理运行在后端/模型崩溃（例如某些 `inferrs` 构建上的 Gemma）时失败：OpenClaw 的传输层很可能已经正确；后端是在更大的代理运行时提示词形状下失败。
    - 禁用工具后失败有所减少但并未消失：工具 schema 曾增加压力，但剩余问题仍然是上游模型/服务器容量或后端缺陷。

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
- [OpenAI 兼容端点](/gateway/configuration-reference#openai-compatible-endpoints)。

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

当仪表板/控制 UI 无法连接时，请验证 URL、认证模式以及安全上下文假设。

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

如果更新后本地浏览器无法连接到 `127.0.0.1:18789`，请先恢复本地 Gateway 服务并确认它正在提供仪表板：

```bash
openclaw gateway restart
lsof -i :18789
curl http://127.0.0.1:18789
```

如果 `curl` 返回 OpenClaw HTML，说明 Gateway 正常运行，剩余问题很可能是浏览器缓存、旧的深层链接，或过期的标签页状态。请直接打开 `http://127.0.0.1:18789` 并从仪表板进入。如果重启后服务没有保持运行，请执行 `openclaw gateway start` 并重新检查 `openclaw gateway status`。

<AccordionGroup>
  <Accordion title="连接 / 认证签名">
    - `device identity required` → 非安全上下文或缺少设备认证。
    - `origin not allowed` → 浏览器 `Origin` 不在 `gateway.controlUi.allowedOrigins` 中（或者你是从非回环浏览器 origin 连接，但没有显式允许列表）。
    - `device nonce required` / `device nonce mismatch` → 客户端没有完成基于挑战的设备认证流程（`connect.challenge` + `device.nonce`）。
    - `device signature invalid` / `device signature expired` → 客户端为当前握手签署了错误的载荷（或时间戳已过期）。
    - `AUTH_TOKEN_MISMATCH` with `canRetryWithDeviceToken=true` → 客户端可以使用缓存的 device token 进行一次受信任重试。
    - 该缓存 token 重试会复用与已配对 device token 一起存储的缓存作用域集。显式 `deviceToken` / 显式 `scopes` 调用方则保留其请求的作用域集。
    - `AUTH_SCOPE_MISMATCH` → 已识别设备 token，但其已批准的作用域不覆盖此次连接请求；应重新配对或批准所请求的作用域契约，而不是轮换共享 gateway token。
    - 在该重试路径之外，connect 认证优先级依次为：显式共享 token/password，其次显式 `deviceToken`，然后是已存储的 device token，最后是 bootstrap token。
    - 在异步的 Tailscale Serve Control UI 路径上，相同 `{scope, ip}` 的失败尝试会在限流器记录失败前进行串行化。因此，同一客户端发起的两个并发错误重试，第二次可能会显示 `retry later`，而不是两个普通的不匹配错误。
    - 来自浏览器 origin 的 loopback 客户端出现 `too many failed authentication attempts (retry later)` → 同一归一化 `Origin` 的重复失败会被临时锁定；另一个 localhost origin 使用独立的桶。
    - 在该重试之后仍然重复出现 `unauthorized` → 共享 token/device token 漂移；刷新 token 配置，并在需要时重新批准/轮换 device token。
    - `gateway connect failed:` → 主机/端口/url 目标错误。

  </Accordion>
</AccordionGroup>

### 认证详情代码速查表

使用失败的 `connect` 响应中的 `error.details.code` 来选择下一步操作：

| 详情代码                     | 含义                                                                                                                                                                                        | 建议操作                                                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_TOKEN_MISSING`         | 客户端未发送所需的共享 token。                                                                                                                                                                | 在 Gateway 主机上，在交互式终端中运行 `openclaw gateway auth-token --show`，将输出粘贴到客户端中，然后重试。                                                                                                                                                |
| `AUTH_TOKEN_MISMATCH`        | 共享 token 与 gateway auth token 不匹配。                                                                                                                                                     | 如果 `canRetryWithDeviceToken=true`，允许进行一次受信任的重试。缓存 token 重试会复用已存储的已批准作用域；显式 `deviceToken` / `scopes` 调用方保留请求的作用域。如果仍然失败，请执行[令牌漂移恢复检查清单](/cli/devices#token-drift-recovery-checklist)。 |
| `AUTH_DEVICE_TOKEN_MISMATCH` | 每个设备的缓存 token 已过期或被撤销。                                                                                                                                                         | 使用[设备 CLI](/cli/devices)轮换/重新批准设备 token，然后重新连接。                                                                                                                                                                                                        |
| `AUTH_SCOPE_MISMATCH`        | 设备 token 有效，但其已批准的角色/作用域不涵盖此次连接请求。                                                                                                                                    | 重新配对设备或批准所请求的作用域契约；不要将其视为共享 token 漂移。                                                                                                                                                                                     |
| `PAIRING_REQUIRED`           | 设备身份需要批准。检查 `error.details.reason`，确认是 `not-paired`、`scope-upgrade`、`role-upgrade` 还是 `metadata-upgrade`，并在存在时使用 `requestId` / `remediationHint`。 | 批准待处理请求：`openclaw devices list`，然后执行 `openclaw devices approve <requestId>`。作用域/角色升级在审核所请求的访问权限后使用相同流程。                                                                                                               |

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

- 已配对设备 token 会话只能管理它们**自己的**设备，除非调用方还具有 `operator.admin`。
- `openclaw devices rotate --scope ...` 只能请求调用方会话已经持有的运营者作用域。

相关：

- [配置](/gateway/configuration)（网关认证模式）
- [Control UI](/web/control-ui)
- [设备](/cli/devices)
- [远程访问](/gateway/remote)
- [受信任代理认证](/gateway/trusted-proxy-auth)。

## Gateway 服务未运行

当服务已安装但进程无法持续运行时使用。

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
- [Doctor](/gateway/doctor)。

## macOS 网关静默停止响应，然后在你触碰控制面板时恢复

当 macOS 主机上的各个通道（Telegram、WhatsApp 等）会在数分钟到数小时内突然沉寂，而你一打开 Control UI、SSH 登录，或以其他方式与主机交互，网关又立刻恢复时，使用此项。通常在 `openclaw status` 中不会有明显症状，因为等你查看时网关已经再次存活。

```bash
ls ~/.openclaw/logs/stability/ | tail -5
openclaw gateway stability --bundle latest
pmset -g log | grep -iE "sleep|wake|maintenance" | tail -50
launchctl print gui/$UID/ai.openclaw.gateway | grep -E "state|last exit|runs"
```

查看以下内容：

- `~/.openclaw/logs/stability/` 下存在一个或多个 `*-uncaught_exception.json` bundle，且 `error.code` 被设置为诸如 `ENETDOWN`、`ENETUNREACH`、`EHOSTUNREACH` 或 `ECONNREFUSED` 之类的瞬态网络错误码。
- `pmset -g log` 中有类似 `Entering Sleep state due to 'Maintenance Sleep'` 或 `en0 driver is slow (msg: WillChangeState to 0)` 的行，并且与崩溃时间戳对齐。Power Nap / Maintenance Sleep 会短暂将 Wi-Fi 驱动置于 state 0；在该窗口内发生的任何出站 `connect()` 都可能返回 `ENETDOWN`，即使主机其他方面具有完整的网络连接。
- `launchctl print` 输出显示 `state = not running`，并且有多次最近的 `runs` 和一个退出码，尤其是在崩溃与下一次启动之间的间隔大约是一小时而不是几秒钟时。macOS launchd 在一轮崩溃风暴后会应用一个未公开的 respawn-protection 门控，在外部触发（例如交互式登录、控制面板连接或 `launchctl kickstart`）重新激活之前，可能不再响应 `KeepAlive=true`。

常见特征：

- 一个 `error.code` 为 `ENETDOWN` 或同类代码的稳定性包，调用栈指向 Node `net` 的 `lookupAndConnect` / `Socket.connect`。OpenClaw `2026.5.26` 及更新版本会将这些视为良性的瞬态网络错误，因此不再将其传播到顶层未捕获处理器；如果你使用的是更早版本，请先升级。
- 漫长的静默期在你连接 Control UI 或通过 SSH 登录主机的瞬间结束：用户可见的活动是在重新为 launchd 的 respawn 门控上弦，而不是控制面板对网关做了什么。
- `runs` 计数在一天内不断增加，但 `~/Library/Logs/openclaw/gateway.log` 中没有对应的 `received SIG*; shutting down` 行：正常关闭会记录 signal；瞬态崩溃不会。

处理方法：

1. **如果你运行的是 `2026.5.26` 之前的版本，请升级网关**。升级后，未来的 `ENETDOWN` 错误会以 warning 的形式记录，而不会终止进程。
2. **降低面向始终在线服务器的 Mac mini / 桌面主机上的维护性睡眠活动**：

   ```bash
   sudo pmset -a sleep 0 disksleep 0 standby 0 powernap 0
   ```

   这会显著降低底层驱动抖动，但不能完全消除。系统仍可能为了 TCP keepalive 和 mDNS 维护而执行某些维护性睡眠，无论这些标志如何设置。

3. **添加一个存活监控**，以便在未来由 launchd 暂停的崩溃风暴能被迅速捕获：

   ```bash
   # 示例：感知 launchd 的存活检查，适合 5 分钟 cron 或 LaunchAgent
   state=$(launchctl print gui/$UID/ai.openclaw.gateway 2>/dev/null | awk -F'= ' '/state =/ {print $2; exit}')
   if [ "$state" != "running" ]; then
     launchctl kickstart -k gui/$UID/ai.openclaw.gateway
   fi
   ```

   关键在于从外部重新为 respawn 门控上弦；仅靠 `KeepAlive=true` 在 macOS 崩溃风暴后并不充分。

相关：

- [macOS 平台说明](/platforms/macos)
- [日志](/logging)
- [Doctor](/gateway/doctor)

## macOS launchd 监督循环，重复的 gateway/node LaunchAgents

当 macOS 安装每隔几秒就不断重启、`openclaw` 健康检查在 healthy 和 unavailable 之间来回波动，并且即使服务看起来正在运行，channel 分发仍然停滞时，请使用此方法。

这通常见于较旧的安装，其中 `ai.openclaw.gateway` 和 `ai.openclaw.node` 两个 LaunchAgents 同时处于活跃状态，并且都注入了 `OPENCLAW_LAUNCHD_LABEL`。在这种状态下，OpenClaw 可能会检测到 launchd 监督，尝试把重启交回给 launchd，然后陷入快速的 `EADDRINUSE`/respawn 循环，而不是稳定运行一个 gateway 进程。

```bash
for i in 1 2 3 4; do
  ps aux | grep 'openclaw.*index.js' | grep -v grep | awk '{print $2}'
  sleep 10
done

openclaw gateway status --deep
openclaw node status
launchctl print gui/$UID/ai.openclaw.gateway | grep -E 'state|last exit|runs'
tail -n 80 ~/Library/Logs/openclaw/gateway.log
```

重点关注：

- 在 30 秒采样期间出现多个 gateway PID，而不是一个稳定的进程。
- `gateway.log` 中出现 `EADDRINUSE`、`another gateway instance is already listening`，或者重复的 restart/handoff 日志行。
- 在一台本应只运行一个受管 gateway 服务的主机上，`~/Library/LaunchAgents/ai.openclaw.gateway.plist` 和 `~/Library/LaunchAgents/ai.openclaw.node.plist` 两者同时被加载。

要做什么：

1. 如果这台主机只应该运行 Gateway 服务，请通过 OpenClaw 移除受管的 node 服务。**如果你确实依赖 node 服务提供远程 node 功能，请跳过此步骤**；卸载它会停止这台主机上的这些功能：

   ```bash
   openclaw node uninstall
   ```

2. 安装一个持久的 Gateway 包装器，在启动 OpenClaw 之前清除继承的 launchd 标记。请使用受支持的 `--wrapper` 选项；不要编辑 `~/.openclaw/service-env/` 下生成的文件，因为服务重装、更新和 doctor 修复都会重新生成该文件：

   ```bash
   mkdir -p ~/.local/bin
   cat >~/.local/bin/openclaw-launchd-workaround <<'EOF'
   #!/bin/sh
   set -eu
   unset OPENCLAW_LAUNCHD_LABEL LAUNCH_JOB_LABEL LAUNCH_JOB_NAME XPC_SERVICE_NAME || true
   exec openclaw "$@"
   EOF
   chmod 700 ~/.local/bin/openclaw-launchd-workaround

   openclaw gateway install \
     --wrapper ~/.local/bin/openclaw-launchd-workaround \
     --force
   ```

   `gateway install` 会在强制重装、更新和 doctor 修复之间保留 wrapper 路径。

3. 验证 Gateway 是否稳定并且正在提供 RPC，而不仅仅是在监听：

   ```bash
   openclaw gateway status --deep --require-rpc

   for i in 1 2 3 4; do
     ps aux | grep 'openclaw.*index.js' | grep -v grep | awk '{print $2}'
     sleep 10
   done
   ```

   PID 采样应显示一个稳定的进程，而不是轮换的一组 PID，并且入站 channel 分发应该恢复。

4. 在升级到修复了底层双 LaunchAgent 循环的版本后，移除该 workaround，并重新安装正常的受管服务：

   ```bash
   OPENCLAW_WRAPPER= openclaw gateway install --force
   rm ~/.local/bin/openclaw-launchd-workaround
   ```

相关内容：

- [macOS 平台说明](/platforms/mac/bundled-gateway)
- [Doctor](/gateway/doctor)
- [Gateway CLI](/cli/gateway)

## Gateway 在高内存使用期间退出

当 Gateway 在负载下消失、supervisor 报告类似 OOM 的重启，或日志中提到 `critical memory pressure bundle written` 时使用。

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

- `critical memory pressure bundle written` 在重启前不久出现 → OpenClaw 捕获了 OOM 发生前的稳定性包。使用 `openclaw gateway stability --bundle latest` 检查它。
- `memory pressure: level=critical` 出现在 gateway 日志中 → OpenClaw 检测到严重内存压力，并记录了进程内可用的内存信息。
- `Largest session files:` 指向一个非常大的脱敏转录路径 → 减少保留的会话历史记录，检查会话增长情况，或在重启前将旧转录移出活动存储。
- `V8 heap:` 的已使用字节数接近堆限制 → 首先降低提示词/会话压力，或减少并发工作。对于托管服务，检查 `openclaw gateway status` 中的 `Gateway heap:`；如果显示 `not set`，请使用 `openclaw gateway install --force` 重新生成旧的服务元数据。环境 shell 中的 `NODE_OPTIONS` 会被有意忽略。只有在确认持续工作负载后，才使用明确的 supervisor 级堆覆盖设置，并为原生内存留出足够余量。
- `Memory pressure: critical/rss_growth` → 内存在一个采样窗口内快速增长。检查最新日志中是否存在大规模导入、失控的工具输出、重复重试或一批排队的 agent 工作。
- 日志中出现严重内存压力，但没有生成稳定性包 → 在事件发生后执行 `openclaw gateway diagnostics export`，以获取可用的运行证据。

稳定性包不包含有效载荷。它只包含运行中的内存证据和脱敏后的相对文件路径，不包含消息文本、webhook 正文、凭据、token、cookie 或原始 session id。请将诊断导出附加到 bug 报告中，而不是复制原始日志。

相关：

- [Gateway 健康状况](/gateway/health)
- [诊断导出](/gateway/diagnostics)
- [会话](/cli/sessions)

## Gateway 拒绝了无效配置

当 Gateway 启动失败并提示 `Invalid config`，或者热重载日志显示它跳过了一次无效编辑时使用。

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
- 活动配置旁边带有时间戳的 `openclaw.json.rejected.*` 文件。
- 如果 `doctor --fix` 修复了一个损坏的直接编辑，则会生成带有时间戳的 `openclaw.json.clobbered.*` 文件。
- 对于每个配置路径，OpenClaw 会保留最新的 32 个 `.clobbered.*` 文件，并轮转更旧的文件。

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
- [Doctor](/gateway/doctor)。

## 网关探测警告

当 `openclaw gateway probe` 已经探测到某些内容，但仍然打印警告块时使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查看以下内容：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否与 SSH 回退、多网关、缺失的 scope，或未解析的身份验证引用有关。

常见特征：

- `SSH tunnel failed to start; falling back to direct probes.` → SSH 设置失败，但命令仍尝试了直接配置的/回环的目标。
- `multiple reachable gateway identities detected` → 不同的网关有响应，或者 OpenClaw 无法证明可达目标是同一个网关。SSH 隧道、代理 URL，或配置为指向同一个网关的远程 URL，会被视为一个具有多种传输方式的网关，即使传输端口不同也是如此。
- `Read-probe diagnostics are limited by gateway scopes (missing operator.read)` → 连接成功，但详细 RPC 受 scope 限制；请配对设备身份，或使用包含 `operator.read` 的凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 连接成功，但完整的诊断 RPC 集超时或失败。将其视为一个可达但诊断受限的网关；在 `--json` 输出中对比 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → 网关已响应，但此客户端在获得正常 operator 访问权限前仍需要配对/批准。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此次命令路径中，失败目标的身份验证材料不可用。

相关：

- [网关](/cli/gateway)
- [同一主机上的多个网关](/gateway#multiple-gateways-same-host)
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

- Cron 是否已启用，以及是否存在下一次唤醒时间。
- 任务运行历史状态（`ok`、`skipped`、`error`）。
- Heartbeat 跳过原因（`quiet-hours`、`requests-in-flight`、`cron-in-progress`、`lanes-busy`、`alerts-disabled`、`empty-heartbeat-file`）。

<AccordionGroup>
  <Accordion title="常见特征">
    - `cron: scheduler disabled; jobs will not run automatically` → cron 已禁用。
    - `cron: timer tick failed` → 调度器计时器触发失败；检查文件、日志和运行时错误。
    - `heartbeat skipped`，且 `reason=quiet-hours` → 当前处于活动时间窗口之外。
    - `heartbeat skipped`，且 `reason=empty-heartbeat-file` → heartbeat 监控暂存文件仅包含空白、注释、标题、代码围栏或空检查清单脚手架，因此 OpenClaw 跳过模型调用。
    - `heartbeat: unknown accountId` → heartbeat 投递目标的账户 ID 无效。
    - `heartbeat skipped`，且 `reason=dm-blocked` → heartbeat 目标解析为 DM 类型的目标，而 `agents.defaults.heartbeat.directPolicy`（或单个代理的覆盖设置）被设为 `block`。

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
- 摄像头/麦克风/位置/屏幕的操作系统权限已授予。
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

当浏览器工具操作失败，但网关本身正常时使用。

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
    - `unknown command "browser"` or `unknown command 'browser'` → 捆绑的浏览器插件被 `plugins.allow` 排除了。
    - Browser tool missing / unavailable while `browser.enabled=true` → `plugins.allow` 排除了 `browser`，因此插件从未加载。
    - `Failed to start Chrome CDP on port` → 浏览器进程启动失败。
    - `browser.executablePath not found` → 配置的路径无效。
    - `browser.cdpUrl must be http(s) or ws(s)` → 配置的 CDP URL 使用了不支持的协议，例如 `file:` 或 `ftp:`。
    - `browser.cdpUrl has invalid port` → 配置的 CDP URL 端口无效或超出范围。
    - `Playwright is not available in this gateway build; '<feature>' is unsupported.` → 当前网关安装缺少核心浏览器运行时依赖；重新安装或更新 OpenClaw，然后重启网关。ARIA 快照和基础页面截图仍然可用，但导航、AI 快照、CSS 选择器元素截图和 PDF 导出仍不可用。

  </Accordion>
  <Accordion title="Chrome MCP / existing-session 签名">
    - `Could not find DevToolsActivePort for chrome` → Chrome MCP existing-session 还无法附加到所选的浏览器数据目录。打开浏览器 inspect 页面，启用远程调试，保持浏览器打开，批准第一次附加提示，然后重试。如果不需要登录状态，优先使用受管理的 `openclaw` 配置文件。
    - `No browser tabs found for profile="user"` → Chrome MCP 附加配置文件没有打开的本地 Chrome 标签页。
    - `Remote CDP for profile "<name>" is not reachable` → 配置的远程 CDP 端点从网关主机无法访问。
    - `Browser attachOnly is enabled ... not reachable` or `Browser attachOnly is enabled and CDP websocket ... is not reachable` → 仅附加配置文件没有可访问的目标，或者 HTTP 端点已响应，但 CDP WebSocket 仍无法打开。

  </Accordion>
  <Accordion title="元素 / 截图 / 上传签名">
    - `fullPage is not supported for element screenshots` → 截图请求将 `--full-page` 与 `--ref` 或 `--element` 混合使用了。
    - `element screenshots are not supported for existing-session profiles; use ref from snapshot.` → Chrome MCP / `existing-session` 截图调用必须使用页面捕获或快照 `--ref`，而不是 CSS `--element`。
    - `existing-session file uploads do not support element selectors; use ref/inputRef.` → Chrome MCP 上传钩子需要快照引用，而不是 CSS 选择器。
    - `existing-session file uploads currently support one file at a time.` → 在 Chrome MCP 配置文件上，每次调用只能上传一个文件。
    - `existing-session dialog handling does not support timeoutMs.` → Chrome MCP 配置文件上的对话框钩子不支持超时覆盖。
    - `existing-session type does not support timeoutMs overrides.` → 对 `profile="user"` / Chrome MCP existing-session 配置文件的 `act:type` 请省略 `timeoutMs`，或者在需要自定义超时时使用受管理的/CDP 浏览器配置文件。
    - `response body is not supported for existing-session profiles yet.` → `responsebody` 仍然需要受管理浏览器或原始 CDP 配置文件。
    - 连接附加模式或远程 CDP 配置文件上出现过期的视口 / 深色模式 / 语言环境 / 离线覆盖 → 运行 `openclaw browser stop --browser-profile <name>` 关闭当前控制会话，并释放 Playwright/CDP 模拟状态，而无需重启整个网关。

  </Accordion>
</AccordionGroup>

相关：

- [浏览器（OpenClaw 托管）](/tools/browser)
- [浏览器故障排查](/tools/browser-linux-troubleshooting)。

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

- [Authentication](/gateway/authentication)
- [Background exec and process tool](/gateway/background-process)
- [Node pairing](/gateway/pairing)

## 相关

- [诊断](/gateway/doctor)
- [常见问题](/help/faq)
- [Gateway 运行手册](/gateway)
