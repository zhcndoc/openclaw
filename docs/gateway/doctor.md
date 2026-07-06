---
summary: "Doctor 命令：健康检查、配置迁移和修复步骤"
read_when:
  - 添加或修改 doctor 迁移
  - 引入破坏性的配置变更
title: "Doctor"
sidebarTitle: "Doctor"
---

`openclaw doctor` is the repair and migration tool for OpenClaw. It fixes stale config/state, checks health, and provides actionable repair steps.

## 快速开始

```bash
openclaw doctor
```

### 无头和自动化模式

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    在不提示的情况下接受默认值（如适用，包括重启/服务/沙箱修复步骤）。

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    Apply recommended repairs without prompting (`--repair` is an alias).

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    Run structured health checks for CI or preflight automation. Read-only: no
    prompts, repairs, migrations, restarts, or state writes.

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    也应用激进修复（覆盖自定义的 supervisor 配置）。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    Run without prompts, applying only safe migrations (config normalization +
    on-disk state moves). Skips restart/service/sandbox actions that need human
    confirmation. Legacy state migrations still run automatically when detected.

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以查找额外的 gateway 安装（launchd/systemd/schtasks）。

  </Tab>
</Tabs>

To review changes before writing, open the config file first:

```bash
cat ~/.openclaw/openclaw.json
```

## 只读 lint 模式

`openclaw doctor --lint` is the automation-friendly sibling of `openclaw doctor --fix`. Both run the same health checks; only the posture differs:

| 模式                     | 提示      | 写入配置/状态            | 输出                   | 适用场景                        |
| ------------------------ | --------- | ------------------------ | ---------------------- | ------------------------------- |
| `openclaw doctor`        | 是        | 否                       | 友好的健康报告         | 人工检查状态                    |
| `openclaw doctor --fix`  | 有时      | 是，按修复策略写入       | 友好的修复日志         | 应用已批准的修复                |
| `openclaw doctor --lint` | 否        | 否                       | 结构化结果             | CI、预检和审查门禁              |

Health checks may provide an optional `repair()` implementation; `doctor --fix` applies it when present and falls back to the legacy doctor repair flow otherwise. The contract separates `detect()` (reports findings) from `repair()` (reports changes/diffs/side effects), which keeps a path open for a future `doctor --fix --dry-run` without turning lint checks into mutation planners.

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --all
openclaw doctor --lint --only core/doctor/gateway-config --json
```

JSON output fields:

- `ok`: whether any finding met the selected severity threshold
- `checksRun` / `checksSkipped`: counts (skipped by profile, `--only`, or `--skip`)
- `findings`: structured diagnostics with `checkId`, `severity`, `message`, and optional `path`, `line`, `column`, `ocPath`, `source`, `target`, `requirement`, `fixHint`

退出码：

| Code | Meaning                                                  |
| ---- | -------------------------------------------------------- |
| `0`  | no findings at or above the selected threshold           |
| `1`  | one or more findings met the selected threshold          |
| `2`  | command/runtime failure before findings could be emitted |

Flags:

- `--severity-min info|warning|error` (default `warning`): controls both what prints and what causes a non-zero exit.
- `--all`: runs every registered check, including opt-in checks excluded from the default automation set.
- `--only <id>` (repeatable): run only the named check id(s); an unknown id is reported as an error finding.
- `--skip <id>` (repeatable): exclude a check while keeping the rest of the run active.
- `--json`, `--severity-min`, `--all`, `--only`, and `--skip` require `--lint`; plain `openclaw doctor` and `--fix` runs reject them.

## 它做什么（摘要）

<AccordionGroup>
  <Accordion title="健康、UI 和更新">
    - 可选的 git 安装预检更新（仅交互模式）。
    - UI 协议新鲜度检查（当协议 schema 更新时会重建 Control UI）。
    - 健康检查 + 重启提示。
    - Skills 状态摘要（符合条件/缺失/被阻止）和插件状态。

  </Accordion>
  <Accordion title="Config and migrations">
    - Config normalization for legacy value shapes.
    - Talk config migration from legacy flat `talk.*` fields into `talk.provider` + `talk.providers.<provider>`.
    - Browser migration checks for legacy Chrome extension configs and Chrome MCP readiness.
    - OpenCode provider override warnings (`models.providers.opencode` / `opencode-zen` / `opencode-go`).
    - Legacy OpenAI Codex provider/profile migration (`openai-codex` → `openai`) and shadowing warnings for stale `models.providers.openai-codex`.
    - OAuth TLS prerequisites check for OpenAI Codex OAuth profiles.
    - Plugin/tool allowlist warnings when `plugins.allow` is restrictive but tool policy still asks for wildcard or plugin-owned tools.
    - Legacy on-disk state migration (sessions/agent dir/WhatsApp auth).
    - Legacy plugin manifest contract key migration (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders` → `contracts`).
    - Legacy cron store migration (`jobId`, `schedule.cron`, top-level delivery/payload fields, payload `provider`, `notify: true` webhook fallback jobs).
    - Codex CLI runtime pin repair (`agentRuntime.id: "codex-cli"` → `"codex"`) across `agents.defaults`, `agents.list[]`, and `models.providers.*` (including per-model entries).
    - Stale plugin config cleanup when plugins are enabled; when `plugins.enabled=false`, stale plugin references are preserved as inert containment config.

  </Accordion>
  <Accordion title="State and integrity">
    - Session lock file inspection and stale lock cleanup.
    - Session transcript repair for duplicated prompt-rewrite branches created by affected 2026.4.24 builds.
    - Wedged subagent restart-recovery tombstone detection, with `--fix` support for clearing stale aborted recovery flags so startup does not keep treating the child as restart-aborted.
    - State integrity and permissions checks (sessions, transcripts, state dir).
    - Config file permission checks (chmod 600) when running locally.
    - Model auth health: checks OAuth expiry, can refresh expiring tokens, and reports auth-profile cooldown/disabled states.

  </Accordion>
  <Accordion title="Gateway, services, and supervisors">
    - 沙箱镜像修复，当沙箱化已启用时。
    - 旧服务迁移和额外 gateway 检测。
    - Matrix 频道旧状态迁移（在 `--fix` / `--repair` 模式下）。
    - Gateway 运行时检查（服务已安装但未运行；缓存的 launchd 标签）。
    - 频道状态警告（从运行中的 gateway 探测）。
    - 频道特定权限检查位于 `openclaw channels capabilities` 下；例如，可用 `openclaw channels capabilities --channel discord --target channel:<channel-id>` 审计 Discord 语音频道权限。
    - 当本地 TUI 客户端仍在运行且 Gateway 事件循环健康状况降级时，执行 WhatsApp 响应性检查；`--fix` 只会停止已验证的本地 TUI 客户端。
    - 对旧的 `openai-codex/*` 模型引用进行 Codex 路由修复，覆盖主模型、回退、图像/视频生成模型、heartbeat/subagent/compaction 覆盖、hooks、频道模型覆盖以及会话路由固定；`--fix` 会将它们重写为 `openai/*`，将 `openai-codex:*` 认证配置文件/顺序迁移到 `openai:*`，移除陈旧的会话/整 agent 运行时固定，并将规范化的 OpenAI agent 引用保留在默认 Codex harness 上。
    - supervisor 配置审计（launchd/systemd/schtasks），并支持可选修复。
    - gateway 服务在安装或更新期间捕获 shell `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` 值时的嵌入式代理环境清理。
    - Gateway 运行时最佳实践检查（Node vs Bun、版本管理器路径）。
    - Gateway 端口冲突诊断（默认 `18789`）。

  </Accordion>
  <Accordion title="认证、安全和配对">
    - 开放 DM 策略的安全警告。
    - 本地 token 模式的 Gateway 认证检查（当不存在 token 来源时提供生成 token；不会覆盖 token SecretRef 配置）。
    - 设备配对问题检测（待处理的首次配对请求、待处理的角色/范围升级、陈旧的本地 device-token 缓存漂移，以及已配对记录的认证漂移）。

  </Accordion>
  <Accordion title="工作区和 shell">
    - Linux 上的 systemd linger 检查。
    - 工作区 bootstrap 文件大小检查（上下文文件的截断/接近上限警告）。
    - 默认 agent 的 Skills 就绪性检查；报告允许的 skills 中缺少 bin、env、config 或 OS 要求的项，且 `--fix` 可以在 `skills.entries` 中禁用不可用的 skills。
    - Shell 补全状态检查和自动安装/升级。
    - 记忆搜索 embedding provider 就绪性检查（本地模型、远程 API key 或 QMD 二进制）。
    - 源码安装检查（pnpm 工作区不匹配、缺少 UI 资源、缺少 tsx 二进制）。
    - 写入更新后的配置 + 向导元数据。

  </Accordion>
</AccordionGroup>

## Dreams UI 回填和重置

The Control UI Dreams scene includes **Backfill**, **Reset**, and **Clear Grounded** actions for the grounded dreaming workflow. These use gateway doctor-style RPC methods but are **not** part of `openclaw doctor` CLI repair/migration.

| Action         | What it does                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backfill       | Scans historical `memory/YYYY-MM-DD.md` files in the active workspace, runs the grounded REM diary pass, and writes reversible backfill entries into `DREAMS.md`. |
| Reset          | Removes only the marked backfill diary entries from `DREAMS.md`.                                                                                                  |
| Clear Grounded | Removes only staged grounded-only short-term entries from historical replay that have not accumulated live recall or daily support yet.                           |

None of these edit `MEMORY.md`, run full doctor migrations, or stage grounded candidates into the live short-term promotion store on their own. To feed grounded historical replay into the normal deep promotion lane, use the CLI flow instead:

```bash
openclaw memory rem-backfill --path ./memory --stage-short-term
```

That stages grounded durable candidates into the short-term dreaming store while `DREAMS.md` stays the review surface.

## 详细行为和原理

<AccordionGroup>
  <Accordion title="0. 可选更新（git 安装）">
    如果这是一个 git checkout，并且 doctor 以交互方式运行，它会在执行 doctor 前提供更新（fetch/rebase/build）的选项。
  </Accordion>
  <Accordion title="1. Config normalization">
    Doctor normalizes legacy value shapes into the current schema. Current Talk speech config is `talk.provider` + `talk.providers.<provider>`, with realtime voice config under `talk.realtime.*`. Doctor rewrites old `talk.voiceId` / `talk.voiceAliases` / `talk.modelId` / `talk.outputFormat` / `talk.apiKey` shapes into the provider map, and rewrites legacy top-level realtime selectors (`talk.mode`, `talk.transport`, `talk.brain`, `talk.model`, `talk.voice`) into `talk.realtime`.

    Doctor also warns when `plugins.allow` is non-empty and tool policy uses wildcard or plugin-owned tool entries. `tools.allow: ["*"]` only matches tools from plugins that actually load; it does not bypass the exclusive plugin allowlist.

  </Accordion>
  <Accordion title="2. Legacy config key migrations">
    When the config contains a deprecated key with an active migration, other commands refuse to run and ask you to run `openclaw doctor`. Doctor explains which legacy keys were found, shows the migration it applied, and rewrites `~/.openclaw/openclaw.json` with the updated schema. Gateway startup refuses legacy config formats and asks you to run `openclaw doctor --fix`; it does not rewrite `openclaw.json` on startup. Cron job store migrations are also handled by `openclaw doctor --fix`.

    <Note>
      Doctor only carries automatic migrations for roughly two months after a
      key is retired. Older legacy keys (for example the original
      `routing.queue`, `routing.bindings`, `routing.agents`/`defaultAgentId`,
      `routing.transcribeAudio`, top-level `agent.*`, or top-level `identity`
      from the pre-multi-agent config shape) no longer have a migration path;
      config using them now fails validation instead of being rewritten. Fix
      those keys by hand against the current config reference before doctor
      can proceed.
    </Note>

    Active migrations:

    | Legacy key                                                                                    | Current key                                                                 |
    | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
    | `routing.allowFrom`                                                                              | `channels.whatsapp.allowFrom`                                                |
    | `routing.groupChat.requireMention`                                                               | `channels.whatsapp/telegram/imessage.groups."*".requireMention`             |
    | `routing.groupChat.historyLimit`                                                                 | `messages.groupChat.historyLimit`                                            |
    | `routing.groupChat.mentionPatterns`                                                              | `messages.groupChat.mentionPatterns`                                         |
    | `channels.telegram.requireMention`                                                               | `channels.telegram.groups."*".requireMention`                               |
    | `channels.webchat`, `gateway.webchat`                                                            | removed (WebChat is retired)                                                 |
    | `channels.feishu.accounts.<accountId>.botName`                                                   | `channels.feishu.accounts.<accountId>.name`                                 |
    | `session.threadBindings.ttlHours`, `channels.<id>.threadBindings.ttlHours` (and per-account)      | `...threadBindings.idleHours`                                               |
    | legacy `talk.voiceId`/`talk.voiceAliases`/`talk.modelId`/`talk.outputFormat`/`talk.apiKey`        | `talk.provider` + `talk.providers.<provider>`                               |
    | legacy top-level realtime Talk selectors (`talk.mode`/`talk.transport`/`talk.brain`/`talk.model`/`talk.voice`) | `talk.realtime`                                                              |
    | `messages.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`)                             | `messages.tts.providers.<provider>`                                          |
    | `messages.tts.provider: "edge"` / `messages.tts.providers.edge`                                  | `messages.tts.provider: "microsoft"` / `messages.tts.providers.microsoft`   |
    | TTS speaker fields `voice`/`voiceName`/`voiceId`                                                 | `speakerVoice`/`speakerVoiceId`                                              |
    | `channels.<id>.tts.<provider>` / `channels.<id>.accounts.<accountId>.tts.<provider>` (all channels except Discord)                                          | `...tts.providers.<provider>`                                                |
    | `channels.<id>.voice.tts.<provider>` / `channels.<id>.accounts.<accountId>.voice.tts.<provider>` (all channels, including Discord)                          | `...voice.tts.providers.<provider>`                                          |
    | `plugins.entries.voice-call.config.tts.<provider>` (`openai`/`elevenlabs`/`microsoft`/`edge`)     | `plugins.entries.voice-call.config.tts.providers.<provider>`                |
    | `plugins.entries.voice-call.config.tts.provider: "edge"` / `...tts.providers.edge`                | `provider: "microsoft"` / `...tts.providers.microsoft`                      |
    | `plugins.entries.voice-call.config.provider: "log"`                                              | `"mock"`                                                                      |
    | `plugins.entries.voice-call.config.twilio.from`                                                  | `plugins.entries.voice-call.config.fromNumber`                              |
    | `plugins.entries.voice-call.config.streaming.sttProvider`                                        | `plugins.entries.voice-call.config.streaming.provider`                      |
    | `plugins.entries.voice-call.config.streaming.openaiApiKey`/`sttModel`/`silenceDurationMs`/`vadThreshold` | `plugins.entries.voice-call.config.streaming.providers.openai.*`             |
    | `models.providers.*.api: "openai"`                                                               | `"openai-completions"` (gateway startup also skips providers whose `api` is a future/unknown enum value rather than failing closed) |
    | `browser.ssrfPolicy.allowPrivateNetwork`                                                         | `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`                          |
    | `browser.profiles.*.driver: "extension"`                                                         | `"existing-session"`                                                          |
    | `browser.relayBindHost`                                                                          | removed (legacy Chrome extension relay setting)                             |
    | `mcp.servers.*.type` (CLI-native aliases)                                                        | `mcp.servers.*.transport`                                                    |
    | `plugins.entries.codex.config.codexDynamicToolsProfile`                                          | removed (Codex app-server always keeps Codex-native workspace tools native) |
    | `commands.modelsWrite`                                                                           | removed (`/models add` is deprecated)                                       |
    | `agents.defaults/list[].silentReplyRewrite`, `surfaces.*.silentReplyRewrite`                     | removed (exact `NO_REPLY` is no longer rewritten to visible fallback text)  |
    | `agents.defaults/list[].systemPromptOverride`                                                    | removed (OpenClaw owns the generated system prompt)                        |
    | `agents.defaults/list[].embeddedPi`                                                              | `embeddedAgent`                                                              |
    | `agents.defaults/list[].sandbox.perSession`                                                      | `sandbox.scope`                                                              |
    | `agents.defaults.llm`                                                                             | removed (use `models.providers.<id>.timeoutSeconds` for slow model/provider timeouts, kept below the agent/run timeout ceiling) |
    | top-level `memorySearch`                                                                         | `agents.defaults.memorySearch`                                              |
    | `memorySearch.provider: "auto"`                                                                  | `"openai"`                                                                    |
    | `memorySearch.store.path` (any level)                                                            | removed (memory indexes live in each agent database)                       |
    | top-level `heartbeat`                                                                            | `agents.defaults.heartbeat` / `channels.defaults.heartbeat`                 |
    | `plugins.openai-codex` policy ids                                                                | `plugins.openai`                                                             |
    | `tools.web.x_search.apiKey`                                                                      | `plugins.entries.xai.config.webSearch.apiKey`                               |
    | `session.maintenance.rotateBytes`, `session.parentForkMaxTokens`                                 | removed (deprecated)                                                        |
    | `diagnostics.memoryPressureBundle`                                                               | `diagnostics.memoryPressureSnapshot`                                        |

    <Note>
      The `plugins.entries.voice-call.config.*` rows above are normalized by
      the Voice Call plugin itself on every config load, not by `openclaw
      doctor`. The plugin also logs a startup warning pointing at `openclaw
      doctor --fix`, but doctor does not currently rewrite
      `openclaw.json` for these keys; the plugin's own normalization is what
      applies the change at runtime.
    </Note>

    Account-default guidance for multi-account channels:

    - 如果配置了两个或更多 `channels.<channel>.accounts` 条目，但没有 `channels.<channel>.defaultAccount` 或 `accounts.default`，doctor 会警告回退路由可能选择到意外的账号。
    - 如果 `channels.<channel>.defaultAccount` 被设置为未知的账号 ID，doctor 会警告并列出已配置的账号 ID。

  </Accordion>
  <Accordion title="2b. OpenCode provider overrides">
    If you have added `models.providers.opencode`, `opencode-zen`, or `opencode-go` manually, it overrides the built-in OpenCode catalog from `openclaw/plugin-sdk/llm`. That can force models onto the wrong API or zero out costs. Doctor warns so you can remove the override and restore per-model API routing + costs.
  </Accordion>
  <Accordion title="2c. Browser migration and Chrome MCP readiness">
    If your browser config still points at the removed Chrome extension path, doctor normalizes it to the current host-local Chrome MCP attach model (`browser.profiles.*.driver: "extension"` → `"existing-session"`; `browser.relayBindHost` removed).

    当你使用 `defaultProfile: "user"` 或配置了 `existing-session` 配置文件时，doctor 还会审计主机本地的 Chrome MCP 路径：

    - 检查默认自动连接配置下，Google Chrome 是否安装在同一台主机上
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒你在浏览器 inspect 页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor cannot enable the Chrome-side setting for you. Host-local Chrome MCP still requires a Chromium-based browser 144+ on the gateway/node host, running locally, with remote debugging enabled and the first attach consent prompt approved in the browser.

    Readiness here only covers local attach prerequisites. Existing-session keeps the current Chrome MCP route limits; advanced routes like `responsebody`, PDF export, download interception, and batch actions still require a managed browser or raw CDP profile. This check does not apply to Docker, sandbox, remote-browser, or other headless flows, which continue to use raw CDP.

  </Accordion>
  <Accordion title="2d. OAuth TLS 前置条件">
    当配置了 OpenAI Codex OAuth 配置文件时，doctor 会探测 OpenAI 授权端点，以验证本地 Node/OpenSSL TLS 栈能否验证证书链。如果探测因证书错误失败（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、证书过期或自签名证书），doctor 会打印平台特定的修复指导。在使用 Homebrew Node 的 macOS 上，通常的修复方式是 `brew postinstall ca-certificates`。使用 `--deep` 时，即使 gateway 健康，探测也会运行。
  </Accordion>
  <Accordion title="2e. Codex OAuth provider 覆盖">
    如果你之前在 `models.providers.openai-codex` 下添加了旧的 OpenAI 传输设置，它们可能会遮蔽新版发布自动使用的内置 Codex OAuth provider 路径。Doctor 在看到这些旧传输设置与 Codex OAuth 同时存在时会发出警告，方便你移除或重写过时的传输覆盖，并恢复内置的路由/回退行为。自定义代理和仅头部覆盖仍受支持，不会触发此警告。
  </Accordion>
  <Accordion title="2f. Codex route repair">
    Doctor 检查旧的 `openai-codex/*` 模型引用。原生 Codex harness 路由使用规范化的 `openai/*` 模型引用；OpenAI agent 回合会通过 Codex app-server harness，而不是走 OpenClaw 的 OpenAI provider 路径。

    在 `--fix` / `--repair` 模式下，doctor 会重写受影响的默认 agent 和按 agent 引用，包括主模型、回退、图像/视频生成模型、heartbeat/subagent/compaction 覆盖、hooks、频道模型覆盖以及陈旧的持久化会话路由状态：

    - `openai-codex/gpt-*` becomes `openai/gpt-*`.
    - Codex intent moves to provider/model-scoped `agentRuntime.id: "codex"` entries for repaired agent model refs.
    - Stale whole-agent runtime config and persisted session runtime pins are removed because runtime selection is provider/model-scoped.
    - Existing provider/model runtime policy is preserved unless the repaired legacy model ref needs Codex routing to keep the old auth path.
    - Existing model fallback lists are preserved with their legacy entries rewritten; copied per-model settings move from the legacy key to the canonical `openai/*` key.
    - Persisted session `modelProvider`/`providerOverride`, `model`/`modelOverride`, fallback notices, and auth-profile pins are repaired across all discovered agent session stores.
    - Doctor separately repairs stale `agentRuntime.id: "codex-cli"` pins (a distinct legacy runtime id) to `"codex"` across `agents.defaults`, `agents.list[]`, and `models.providers.*` model entries.
    - `/codex ...` means "control or bind a native Codex conversation from chat."
    - `/acp ...` or `runtime: "acp"` means "use the external ACP/acpx adapter."

  </Accordion>
  <Accordion title="2g. 会话 route 清理">
    当你把已配置模型或运行时从某个插件拥有的 route（例如 Codex）迁移走后，Doctor 还会扫描已发现的 agent 会话存储中的陈旧自动创建 route 状态。

    `openclaw doctor --fix` 可以清除自动创建的陈旧状态，例如 `modelOverrideSource: "auto"` 模型 pin、运行时模型元数据、固定的 harness id、CLI 会话绑定，以及在其所属 route 不再配置时的自动 auth-profile 覆盖。显式用户选择或旧的会话模型选择会被报告出来供人工审查，并保持不变；如果该 route 不再被需要，可通过 `/model ...`、`/new` 切换，或重置会话。

  </Accordion>
  <Accordion title="3. 旧状态迁移（磁盘布局）">
    Doctor 可以将旧的磁盘布局迁移到当前结构：

    - Sessions store + transcripts: from `~/.openclaw/sessions/` to `~/.openclaw/agents/<agentId>/sessions/`
    - Agent dir: from `~/.openclaw/agent/` to `~/.openclaw/agents/<agentId>/agent/`
    - WhatsApp auth state (Baileys): from legacy `~/.openclaw/credentials/*.json` (except `oauth.json`) to `~/.openclaw/credentials/whatsapp/<accountId>/...` (default account id: `default`)

    These migrations are best-effort and idempotent; doctor emits warnings when it leaves any legacy folders behind as backups. The Gateway/CLI also auto-migrates the legacy sessions + agent dir on startup so history/auth/models land in the per-agent path without a manual doctor run. WhatsApp auth is intentionally only migrated via `openclaw doctor`. Talk provider/provider-map normalization compares by structural equality, so key-order-only diffs no longer trigger repeat no-op `doctor --fix` changes.

  </Accordion>
  <Accordion title="3a. Legacy plugin manifest migrations">
    Doctor scans all installed plugin manifests for deprecated top-level capability keys (`speechProviders`, `realtimeTranscriptionProviders`, `realtimeVoiceProviders`, `mediaUnderstandingProviders`, `imageGenerationProviders`, `videoGenerationProviders`, `webFetchProviders`, `webSearchProviders`). When found, it offers to move them into the `contracts` object and rewrite the manifest file in-place. This migration is idempotent; if `contracts` already has the same values, the legacy key is removed without duplicating data.
  </Accordion>
  <Accordion title="3b. 旧 cron 存储迁移">
    Doctor 还会检查 cron 任务存储（默认 `~/.openclaw/cron/jobs.json`，或在覆盖时使用 `cron.store`）中 scheduler 仍为兼容性接受的旧任务结构。

    当前 cron 清理包括：

    - `jobId` → `id`
    - `schedule.cron` → `schedule.expr`
    - top-level payload fields (`message`, `model`, `thinking`, ...) → `payload`
    - top-level delivery fields (`deliver`, `channel`, `to`, `provider`, ...) → `delivery`
    - payload `provider` delivery aliases → explicit `delivery.channel`
    - legacy `notify: true` webhook fallback jobs → explicit webhook delivery from `cron.webhook` when set; announce jobs keep their chat delivery and get `delivery.completionDestination`. When `cron.webhook` is unset, the inert top-level `notify` marker is removed for no-target jobs (existing delivery, including announce, is preserved) since runtime delivery never reads it.

    The Gateway also sanitizes malformed cron rows at load time so valid jobs keep running. Raw malformed rows are copied to `jobs-quarantine.json` next to the active store before removal from `jobs.json`; doctor reports quarantined rows so you can review or repair them manually.

    Gateway startup normalizes the runtime projection and ignores the top-level `notify` marker, but leaves the persisted cron config for doctor repair. When `cron.webhook` is unset, doctor removes the inert marker for jobs with no migration target (`delivery.mode` none/absent, an unusable webhook target, or existing announce/chat delivery), leaving existing delivery untouched, so repeated `doctor --fix` runs no longer re-warn about the same job. If `cron.webhook` is set but not a valid HTTP(S) URL, doctor still warns and leaves the marker so you can fix the URL.

    在 Linux 上，doctor 还会在用户的 crontab 仍调用旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时发出警告。这个宿主机本地脚本不受当前 OpenClaw 维护，而且当 cron 无法访问 systemd 用户总线时，可能会向 `~/.openclaw/logs/whatsapp-health.log` 写入虚假的 `Gateway inactive` 消息。请使用 `crontab -e` 删除过时的 crontab 条目；当前健康检查请使用 `openclaw channels status --probe`、`openclaw doctor` 和 `openclaw gateway status`。

  </Accordion>
  <Accordion title="3c. Session lock cleanup">
    Doctor scans every agent session directory for stale write-lock files left behind when a session exited abnormally. For each lock file found it reports: the path, PID, whether the PID is still alive, lock age, and whether it is considered stale (dead PID, malformed owner metadata, older than 30 minutes, or a live PID proven to belong to a non-OpenClaw process). In `--fix` / `--repair` mode it removes locks with dead, orphaned, recycled, malformed-old, or non-OpenClaw owners automatically. Old locks still owned by a live OpenClaw process are reported but left in place so doctor does not cut off an active transcript writer.
  </Accordion>
  <Accordion title="3d. 会话转写分支修复">
    Doctor 会扫描 agent 会话 JSONL 文件，查找由 2026.4.24 prompt transcript rewrite bug 造成的重复分支结构：一个带有 OpenClaw 内部运行时上下文的已放弃 user turn，以及一个包含相同可见用户提示的活动同级分支。在 `--fix` / `--repair` 模式下，doctor 会在原文件旁边为每个受影响文件创建备份，并将转写重写为活动分支，这样 gateway 历史和 memory 读取器就不再会看到重复 turn。
  </Accordion>
  <Accordion title="4. State integrity checks (session persistence, routing, and safety)">
    The state directory is the operational brainstem. If it vanishes, you lose sessions, credentials, logs, and config unless you have backups elsewhere.

    Doctor 会检查：

    - **State dir missing**: warns about catastrophic state loss, prompts to recreate the directory, and reminds you that it cannot recover missing data.
    - **State dir permissions**: verifies writability; offers to repair permissions (and emits a `chown` hint when owner/group mismatch is detected).
    - **macOS cloud-synced state dir**: warns when state resolves under iCloud Drive (`~/Library/Mobile Documents/com~apple~CloudDocs/...`) or `~/Library/CloudStorage/...`, because sync-backed paths can cause slower I/O and lock/sync races.
    - **Linux SD or eMMC state dir**: warns when state resolves to an `mmcblk*` mount source, because SD/eMMC-backed random I/O can be slower and wear faster under session and credential writes.
    - **Linux volatile state dir**: warns when state resolves to `tmpfs` or `ramfs`, because sessions, credentials, config, and SQLite state (with WAL/journal sidecars) disappear on reboot. Docker `overlay` mounts are intentionally not flagged because their writable layers persist across host reboots while the container remains.
    - **Session dirs missing**: `sessions/` and the session store directory are required to persist history and avoid `ENOENT` crashes.
    - **Transcript mismatch**: warns when recent session entries have missing transcript files.
    - **Main session "1-line JSONL"**: flags when the main transcript has only one line (history is not accumulating).
    - **Multiple state dirs**: warns when multiple `~/.openclaw` folders exist across home directories, or when `OPENCLAW_STATE_DIR` points elsewhere (history can split between installs).
    - **Remote mode reminder**: if `gateway.mode=remote`, doctor reminds you to run it on the remote host (the state lives there).
    - **Config file permissions**: warns if `~/.openclaw/openclaw.json` is group/world readable and offers to tighten to `600`.

  </Accordion>
  <Accordion title="5. 模型认证健康（OAuth 过期）">
    Doctor 会检查认证存储中的 OAuth 配置文件，警告 token 即将过期/已过期的情况，并在安全时刷新它们。如果 Anthropic OAuth/token 配置文件过期，它会建议使用 Anthropic API key 或 Anthropic setup-token 路径。刷新提示只会在交互式运行（TTY）时出现；`--non-interactive` 会跳过刷新尝试。

    当 OAuth 刷新永久失败时（例如 `refresh_token_reused`、`invalid_grant`，或 provider 提示你重新登录），doctor 会报告需要重新认证，并打印要运行的确切 `openclaw models auth login --provider ...` 命令。

    Doctor also reports auth profiles that are temporarily unusable due to short cooldowns (rate limits/timeouts/auth failures) or longer disables (billing/credit failures).

    Legacy Codex OAuth profiles whose tokens live in macOS Keychain (older onboarding before the file-based sidecar layout) are repaired only by doctor. Run `openclaw doctor --fix` once from an interactive terminal to migrate Keychain-backed legacy tokens inline into `auth-profiles.json`; after that, embedded turns (Telegram, cron, sub-agent dispatch) resolve them as canonical OpenAI OAuth profiles.

  </Accordion>
  <Accordion title="6. Hooks model validation">
    If `hooks.gmail.model` is set, doctor validates the model reference against the catalog and allowlist and warns when it will not resolve or is disallowed.
  </Accordion>
  <Accordion title="7. 沙箱镜像修复">
    启用沙箱时，doctor 会检查 Docker 镜像，并在当前镜像缺失时提供构建或切换到旧名称的选项。
  </Accordion>
  <Accordion title="7b. Plugin install cleanup">
    Doctor removes legacy OpenClaw-generated plugin dependency staging state in `openclaw doctor --fix` / `openclaw doctor --repair` mode: stale generated dependency roots, old install-stage directories, package-local debris from earlier bundled-plugin dependency repair code, and orphaned or recovered managed npm copies of bundled `@openclaw/*` plugins that can shadow the current bundled manifest. Doctor also relinks the host `openclaw` package into managed npm plugins that declare `peerDependencies.openclaw`, so package-local runtime imports such as `openclaw/plugin-sdk/*` keep resolving after updates or npm repairs.

    Doctor can also reinstall missing downloadable plugins when config references them but the local plugin registry cannot find them (material `plugins.entries`, configured channel/provider/search settings, configured agent runtimes). During package updates, doctor avoids running package-manager plugin repair while the core package is being swapped; run `openclaw doctor --fix` again after the update if a configured plugin still needs recovery. Gateway startup and config reload do not run package managers; plugin installs remain explicit doctor/install/update work.

  </Accordion>
  <Accordion title="8. Gateway 服务迁移和清理提示">
    Doctor 会检测旧的 gateway 服务（launchd/systemd/schtasks），并提供移除它们并使用当前 gateway 端口安装 OpenClaw 服务的选项。它还可以扫描额外的、类似 gateway 的服务并打印清理提示。带有 profile 名称的 OpenClaw gateway 服务被视为一等公民，不会被标记为“额外”。

    在 Linux 上，如果用户级 gateway 服务缺失但系统级 OpenClaw gateway 服务存在，doctor 不会自动安装第二个用户级服务。请使用 `openclaw gateway status --deep` 或 `openclaw doctor --deep` 检查，然后移除重复项，或者当系统 supervisor 承担 gateway 生命周期时设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。

  </Accordion>
  <Accordion title="8b. 启动时 Matrix 迁移">
    当 Matrix 频道账号存在待处理或可操作的旧状态迁移时，doctor（在 `--fix` / `--repair` 模式下）会创建迁移前快照，然后运行尽力而为的迁移步骤：旧 Matrix 状态迁移和旧加密状态准备。这两个步骤都不会致命；错误会被记录下来，启动会继续。在只读模式（不带 `--fix` 的 `openclaw doctor`）下，这项检查会被完全跳过。
  </Accordion>
  <Accordion title="8c. Device pairing and auth drift">
    Doctor inspects device-pairing state as part of the normal health pass, reporting:

    - pending first-time pairing requests
    - pending role or scope upgrades for already-paired devices
    - public-key mismatch repairs where the device id still matches but the device identity no longer matches the approved record
    - paired records missing an active token for an approved role
    - paired tokens whose scopes drift outside the approved pairing baseline
    - local cached device-token entries for the current machine that predate a gateway-side token rotation or carry stale scope metadata

    Doctor does not auto-approve pair requests or auto-rotate device tokens. It prints the exact next steps:

    - 使用 `openclaw devices list` 检查待处理请求
    - 使用 `openclaw devices approve <requestId>` 批准具体请求
    - 使用 `openclaw devices rotate --device <deviceId> --role <role>` 轮换新 token
    - 使用 `openclaw devices remove <deviceId>` 移除并重新批准过时记录

    This distinguishes first-time pairing from pending role/scope upgrades and from stale token/device-identity drift, closing the common "already paired but still getting pairing required" hole.

  </Accordion>
  <Accordion title="9. 安全警告">
    当 provider 可以在没有允许列表的情况下接受 DM，或者策略配置方式存在危险时，doctor 会发出警告。
  </Accordion>
  <Accordion title="10. systemd linger（Linux）">
    如果作为 systemd 用户服务运行，doctor 会确保启用 lingering，以便 gateway 在退出登录后仍保持存活。
  </Accordion>
  <Accordion title="11. Workspace status (skills, plugins, and TaskFlows)">
    Doctor 会打印默认 agent 的工作区状态摘要：

    - **Skills 状态**：统计符合条件、缺少要求、被 allowlist 阻止的 skills。
    - **插件状态**：统计已启用/已禁用/出错的插件；列出任何错误的插件 ID；报告 bundled 插件能力。
    - **插件兼容性警告**：标记与当前运行时存在兼容性问题的插件。
    - **插件诊断**：显示插件注册表在加载时发出的任何警告或错误。
    - **TaskFlow 恢复**：显示需要人工检查或取消的可疑受管 TaskFlow。

  </Accordion>
  <Accordion title="11b. Bootstrap 文件大小">
    Doctor 会检查工作区 bootstrap 文件（例如 `AGENTS.md`、`CLAUDE.md` 或其他注入的上下文文件）是否接近或超出配置的字符预算。它会按文件报告原始字符数与注入后字符数、截断百分比、截断原因（`max/file` 或 `max/total`），以及注入字符总数占总预算的比例。当文件被截断或接近上限时，doctor 会打印针对 `agents.defaults.bootstrapMaxChars` 和 `agents.defaults.bootstrapTotalMaxChars` 的调优建议。
  </Accordion>
  <Accordion title="11c. Shell completion">
    Doctor checks whether tab completion is installed for the current shell (zsh, bash, fish, or PowerShell):

    - 如果 shell profile 使用的是较慢的动态补全模式（`source <(openclaw completion ...)`），doctor 会将其升级为更快的缓存文件变体。
    - 如果 profile 中已配置补全但缓存文件缺失，doctor 会自动重新生成缓存。
    - 如果完全没有配置补全，doctor 会提示安装它（仅交互模式；`--non-interactive` 会跳过）。

    运行 `openclaw completion --write-state` 可手动重新生成缓存。

  </Accordion>
  <Accordion title="11d. Stale channel plugin cleanup">
    When `openclaw doctor --fix` removes a missing channel plugin, it also removes the dangling channel-scoped config that referenced that plugin: `channels.<id>` entries, heartbeat targets that named the channel, and `agents.*.models["<channel>/*"]` overrides. This prevents Gateway boot loops where the channel runtime is gone but config still asks the gateway to bind to it.
  </Accordion>
  <Accordion title="12. Gateway auth checks (local token)">
    Doctor checks local gateway token auth readiness.

    - 如果 token 模式需要 token 且不存在 token 来源，doctor 会提供生成 token 的选项。
    - 如果 `gateway.auth.token` 由 SecretRef 管理但不可用，doctor 会发出警告且不会用明文覆盖它。
    - `openclaw doctor --generate-gateway-token` 仅在没有配置 token SecretRef 时强制生成。

  </Accordion>
  <Accordion title="12b. 只读、感知 SecretRef 的修复">
    某些修复流程需要在不削弱运行时 fail-fast 行为的前提下检查已配置的凭据。

    - `openclaw doctor --fix` uses the same read-only SecretRef summary model as status-family commands for targeted config repairs.
    - Example: Telegram `allowFrom` / `groupAllowFrom` `@username` repair tries to use configured bot credentials when available.
    - If the Telegram bot token is configured via SecretRef but unavailable in the current command path, doctor reports that the credential is configured-but-unavailable and skips auto-resolution instead of crashing or misreporting the token as missing.

  </Accordion>
  <Accordion title="13. Gateway 健康检查 + 重启">
    Doctor 会运行健康检查，并在 gateway 看起来不健康时提供重启它的选项。
  </Accordion>
  <Accordion title="13b. 记忆搜索就绪性">
    Doctor 会检查为默认 agent 配置的记忆搜索 embedding provider 是否就绪。具体行为取决于配置的后端和 provider：

    - **QMD backend**: probes whether the `qmd` binary is available and startable. If not, prints fix guidance including `npm install -g @tobilu/qmd` (or the Bun equivalent) and a manual binary path option.
    - **Explicit local provider**: checks for a local model file or a recognized remote/downloadable model URL. If missing, suggests switching to a remote provider.
    - **Explicit remote provider** (`openai`, `voyage`, etc.): verifies an API key is present in the environment or auth store. Prints actionable fix hints if missing.
    - **Legacy auto provider**: treats `memorySearch.provider: "auto"` as OpenAI, checks OpenAI readiness, and `doctor --fix` rewrites it to `provider: "openai"`.

    当存在缓存的 gateway 探测结果时（即检查时 gateway 是健康的），doctor 会将其结果与 CLI 可见配置交叉引用，并指出任何差异。Doctor 不会在默认路径上发起新的 embedding ping；如需实时 provider 检查，请使用深度 memory 状态命令。

    使用 `openclaw memory status --deep` 可在运行时验证 embedding 就绪性。

  </Accordion>
  <Accordion title="14. 频道状态警告">
    如果 gateway 健康，doctor 会运行频道状态探测并报告带有建议修复的警告。
  </Accordion>
  <Accordion title="15. Supervisor config audit + repair">
    Doctor checks the installed supervisor config (launchd/systemd/schtasks) for missing or outdated defaults (for example systemd network-online dependencies and restart delay). When it finds a mismatch, it recommends an update and can rewrite the service file/task to the current defaults.

    说明：

    - `openclaw doctor` prompts before rewriting supervisor config.
    - `openclaw doctor --yes` accepts the default repair prompts.
    - `openclaw doctor --fix` applies recommended fixes without prompts (`--repair` is an alias).
    - `openclaw doctor --fix --force` overwrites custom supervisor configs.
    - `OPENCLAW_SERVICE_REPAIR_POLICY=external` keeps doctor read-only for gateway service lifecycle. It still reports service health and runs non-service repairs, but skips service install/start/restart/bootstrap, supervisor config rewrites, and legacy service cleanup because an external supervisor owns that lifecycle.
    - On Linux, doctor does not rewrite command/entrypoint metadata while the matching systemd gateway unit is active. It also ignores inactive non-legacy extra gateway-like units during the duplicate-service scan so companion service files do not create cleanup noise.
    - If token auth requires a token and `gateway.auth.token` is SecretRef-managed, doctor service install/repair validates the SecretRef but does not persist resolved plaintext token values into supervisor service environment metadata.
    - Doctor detects managed `.env`/SecretRef-backed service environment values that older LaunchAgent, systemd, or Windows Scheduled Task installs embedded inline and rewrites the service metadata so those values load from the runtime source instead of the supervisor definition.
    - Doctor detects when the service command still pins an old `--port` after `gateway.port` changes and rewrites the service metadata to the current port.
    - If token auth requires a token and the configured token SecretRef is unresolved, doctor blocks the install/repair path with actionable guidance.
    - If both `gateway.auth.token` and `gateway.auth.password` are configured and `gateway.auth.mode` is unset, doctor blocks install/repair until mode is set explicitly.
    - For Linux user-systemd units, doctor token drift checks include both `Environment=` and `EnvironmentFile=` sources when comparing service auth metadata.
    - Doctor service repairs refuse to rewrite, stop, or restart a gateway service from an older OpenClaw binary when the config was last written by a newer version. See [Gateway troubleshooting](/gateway/troubleshooting#split-brain-installs-and-newer-config-guard).
    - You can always force a full rewrite via `openclaw gateway install --force`.

  </Accordion>
  <Accordion title="16. Gateway 运行时 + 端口诊断">
    Doctor 会检查服务运行时（PID、上次退出状态），并在服务已安装但实际上未运行时发出警告。它还会检查 gateway 端口（默认 `18789`）上的端口冲突，并报告可能原因（gateway 已在运行、SSH 隧道）。
  </Accordion>
  <Accordion title="17. Gateway runtime best practices">
    Doctor warns when the gateway service runs on Bun or a version-managed Node path (`nvm`, `fnm`, `volta`, `asdf`, etc.). WhatsApp and Telegram channels require Node, and version-manager paths can break after upgrades because the service does not load your shell init. Doctor offers to migrate to a system Node install when available (Homebrew/apt/choco).

    Newly installed or repaired macOS LaunchAgents use a canonical system PATH (`/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`) instead of copying the interactive shell PATH, so Homebrew-managed system binaries stay available while Volta, asdf, fnm, pnpm, and other version-manager directories do not change which Node child processes resolve. Linux services still keep explicit environment roots (`NVM_DIR`, `FNM_DIR`, `VOLTA_HOME`, `ASDF_DATA_DIR`, `BUN_INSTALL`, `PNPM_HOME`) and stable user-bin directories, but guessed version-manager fallback directories are only written to the service PATH when those directories exist on disk.

  </Accordion>
  <Accordion title="18. 配置写入 + 向导元数据">
    Doctor 会持久化任何配置更改，并标记向导元数据以记录这次 doctor 运行。
  </Accordion>
  <Accordion title="19. 工作区提示（备份 + 记忆系统）">
    当缺少工作区记忆系统时，doctor 会建议使用它；如果工作区还不在 git 下，则会打印备份提示。

    有关工作区结构和 git 备份的完整指南（推荐使用私有 GitHub 或 GitLab），请参见 [/concepts/agent-workspace](/concepts/agent-workspace)。

  </Accordion>
</AccordionGroup>

## 相关

- [网关运行手册](/gateway)
- [网关故障排查](/gateway/troubleshooting)
