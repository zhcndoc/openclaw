---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - 当你遇到连接/认证问题并希望获得引导式修复时
  - 当你已更新并希望进行一次完整性检查时
title: "医生"
---

# `openclaw doctor`

针对网关、通道、插件、技能、模型路由、本地状态和配置迁移的健康检查与快速修复。只要某些内容没有按预期运行，并且你希望通过一个命令来说明问题所在，就使用它。

相关：

- 故障排查: [疑难解答](/gateway/troubleshooting)
- 安全审计: [安全](/gateway/security)

## 姿态

| 姿态 | 命令                  | 行为                                                                    |
| ------- | ------------------------ | --------------------------------------------------------------------------- |
| 检查 | `openclaw doctor`        | 面向人的检查和引导式提示。                                   |
| 修复  | `openclaw doctor --fix`  | 应用受支持的修复，除非非交互式修复是安全的，否则会提示。 |
| 诊断  | `openclaw doctor --lint` | 仅读取的结构化结果，适用于 CI、预检和审查门禁。          |

当自动化需要稳定结果时，优先使用 `--lint`。当人工操作员希望 doctor 编辑配置或状态时，优先使用 `--fix`。

## 示例

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --all
openclaw doctor --lint --allow-exec
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
openclaw doctor --post-upgrade
openclaw doctor --post-upgrade --json
```

针对通道的权限，请改用通道探测而不是 `doctor`：

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

`channels capabilities` 会报告机器人针对特定通道目标的实际权限。`channels status --probe` 会审计所有已配置的通道和语音自动加入目标。

## 选项

| 选项                         | 作用                                                                                                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--no-workspace-suggestions` | 禁用工作区内存/搜索建议。                                                                                                                                                               |
| `--yes`                      | 无需提示，直接接受默认值。                                                                                                                                                              |
| `--repair` / `--fix`         | 无需提示，应用推荐的非服务修复（`--fix` 是别名）。网关服务的安装/重写仍需要交互式确认或显式的 `gateway` 命令。                                                                                 |
| `--force`                    | 应用激进修复，包括覆盖自定义服务配置。                                                                                                                                                   |
| `--non-interactive`          | 无提示运行；仅执行安全迁移和非服务修复。                                                                                                                                                 |
| `--generate-gateway-token`   | 生成并配置一个网关令牌。                                                                                                                                                                 |
| `--allow-exec`               | 在验证密钥时，允许 doctor 执行已配置的 `exec` SecretRefs。                                                                                                                               |
| `--deep`                     | 扫描系统服务以查找额外的网关安装；报告最近的 Gateway supervisor 重启交接。                                                                                                               |
| `--lint`                     | 以只读模式运行现代化健康检查并输出诊断结果。                                                                                                                                             |
| `--post-upgrade`             | 运行升级后插件兼容性探测；结果输出到 stdout；如果存在任何错误级别的结果，则退出码为 1。                                                                                                    |
| `--json`                     | 与 `--lint` 一起使用时：以 JSON 形式输出结果。与 `--post-upgrade` 一起使用时：输出机器可读的封装 `{ probesRun, findings }`。                                                             |
| `--severity-min <level>`     | 与 `--lint` 一起使用时：过滤掉低于 `info`、`warning` 或 `error` 的结果。                                                                                                                 |
| `--all`                      | 与 `--lint` 一起使用时：运行所有已注册检查，包括默认集合中排除的可选检查。                                                                                                                 |
| `--skip <id>`                | 与 `--lint` 一起使用时：跳过某个检查 id。可重复。                                                                                                                                        |
| `--only <id>`                | 与 `--lint` 一起使用时：仅运行指定的检查 id。可重复。                                                                                                                                   |

`--json`、`--severity-min`、`--all`、`--only` 和 `--skip` 仅在与 `--lint` 一起使用时才被接受。

## 语法检查模式

`openclaw doctor --lint` 是只读的：无提示、无修复、无配置/状态重写。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --all
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
```

人类可读输出很简洁：

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: 运行 `openclaw configure` 并设置 Gateway 模式（local/remote），或 `openclaw config set gateway.mode local`。
```

JSON 输出是脚本接口：

```json
{
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "运行 `openclaw configure` 并设置 Gateway 模式（local/remote），或 `openclaw config set gateway.mode local`。"
    }
  ]
}
```

退出码：

| Code | 含义                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | 在所选严重级别阈值及以上没有发现问题。      |
| `1`  | 至少有一个发现满足所选阈值。            |
| `2`  | 在生成 lint 发现之前发生命令/运行时失败。      |

`--severity-min` 同时控制哪些发现会打印以及退出阈值：即使存在较低严重级别的 `info`/`warning` 发现，`openclaw doctor --lint --severity-min error` 也可能什么都不打印并以 `0` 退出。

`--all` 控制在严重级别过滤之前选择哪些检查。默认的 lint 运行会排除那些更深入、更具历史性，或更可能暴露可修复旧残留的检查；使用 `--all` 可查看完整清单。`--only <id>` 是最精确的选择器，可以按 id 运行任何已注册的检查。

## 结构化健康检查

现代 doctor 检查使用一种小型拆分契约：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驱动 `doctor --lint`。`repair()` 是可选的，并且只会在 `doctor --fix` / `doctor --repair` 下运行。尚未迁移到这种形式的检查仍然使用旧的 doctor 贡献流程。

修复上下文可以携带 `dryRun`/`diff` 请求；修复结果可以返回结构化的 `diffs`（配置/文件编辑）和 `effects`（服务、进程、包、状态或其他副作用），因此已转换的检查可以朝着 `doctor --fix --dry-run` 发展，而无需把变更规划移入 `detect()`。

`repair()` 会报告 `status: "repaired" | "skipped" | "failed"`（省略 status 表示 `repaired`）。当修复返回 `skipped` 或 `failed` 时，doctor 会报告原因并跳过该检查的验证。成功修复后，doctor 会针对已修复的发现结果重新运行带范围限制的 `detect()`；如果该发现仍然存在，doctor 会报告修复警告，而不是将该变更视为完成。

一个发现结果包含：

| 字段              | 用途                                                   |
| ----------------- | ------------------------------------------------------ |
| `checkId`         | 用于 skip/only 过滤和 CI 白名单的稳定 id。             |
| `severity`        | `info`、`warning` 或 `error`。                         |
| `message`         | 面向人的问题描述。                                     |
| `path`            | 可用时的配置、文件或逻辑路径。                         |
| `line` / `column` | 可用时的源位置。                                       |
| `ocPath`          | 当检查可以指向一个精确 `oc://` 地址时使用。            |
| `fixHint`         | 建议的操作员动作或修复摘要。                           |

现代化的 core doctor 检查仍然附着在有序的 doctor contribution 上，由其负责对应的人类可见 `doctor` / `doctor --fix` 行为。共享的结构化健康注册表是扩展点：捆绑和插件支持的检查会在其所属包在当前命令路径中注册后，排在 core doctor 检查之后运行。`openclaw/plugin-sdk/health` 为插件作者暴露了相同的契约。

## 检查选择

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
openclaw doctor --lint --all --skip core/doctor/session-locks
```

`--only` 和 `--skip` 接受完整的检查 ID，并且可以重复使用。如果某个 `--only` ID 未注册，则该 ID 不会运行任何检查；请使用输出中的 `checksRun`/`checksSkipped` 来确认有针对性的门控是否选择了你期望的检查。

## 升级后模式

`openclaw doctor --post-upgrade` 在构建或升级后运行插件兼容性探测，以便串联后续步骤。结果输出到 stdout；如果任何结果的 `level` 为 `"error"`，退出码为 1。添加 `--json` 可输出适合机器读取的封装格式（`{ probesRun, findings }`），适用于 CI、社区的 `fork-upgrade` 技能以及其他升级后的冒烟测试工具。如果已安装的插件索引缺失或格式错误，JSON 模式仍会输出该封装，并包含一个 `plugin.index_unavailable` 错误结果。

## 说明

- 在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，只读的 doctor 检查仍然可用，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 会被禁用，因为 `openclaw.json` 是不可变的。请改为编辑此安装对应的 Nix 源；对于 nix-openclaw，请使用以 agent-first 为主的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（keychain/OAuth 修复等）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 非交互式 `doctor` 运行会跳过急切的插件加载，因此无头健康检查保持快速。交互式会话仍会加载旧版 health/repair 流程所需的插件界面。
- `--lint` 比 `--non-interactive` 更严格：始终只读，绝不提示，也绝不应用安全迁移。当你希望 doctor 进行修改时，请使用 `doctor --fix` 或 `doctor --repair`。
- 默认情况下，doctor 在检查密钥时不会执行 `exec` SecretRef。只有当你有意让 doctor 运行这些已配置的密钥解析器时，才使用 `--allow-exec`（可与 `--lint` 一起或单独使用）。
- 任何配置写入（包括 `--fix` 修复）都会将备份轮换到 `~/.openclaw/openclaw.json.bak`（带有编号的 `.bak.1`..`.bak.4` 环形备份）。`--fix` 还会删除模式校验报告的未知配置键，并逐项列出移除内容；如果更新正在进行中，它会跳过这一步，以免在迁移尚未完成前就清除部分写入的升级状态。
- 当另一个监管进程负责 gateway 生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。doctor 仍会报告 gateway/service 健康状况并应用非服务类修复，但会跳过服务安装/启动/重启/bootstrap 以及旧版服务清理。
- 在 Linux 上，doctor 会忽略不活跃的额外 gateway 样式 systemd 单元，并且在修复期间不会为正在运行的 systemd gateway 服务重写 command/entrypoint 元数据。请先停止该服务，或者使用 `openclaw gateway install --force` 来替换当前启动器。
- `doctor --fix --non-interactive` 会报告缺失或过时的 gateway 服务定义，但不会在更新修复模式之外安装或重写它们。若服务缺失，请运行 `openclaw gateway install`；若要替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查会检测 sessions 目录中的孤儿 transcript 文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会将它们保留在原处。
- Doctor 会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中旧版 cron job 结构，并在将规范行导入 SQLite 之前对其进行重写。
- Doctor 会报告带有显式 `payload.model` 覆盖的 cron jobs，包括 provider 命名空间计数以及与 `agents.defaults.model` 的不匹配情况，因此在进行认证或计费排查时，未继承默认模型的计划任务是可见的。
- 在 Linux 上，如果用户的 crontab 仍在运行未维护的旧版 `~/.openclaw/bin/ensure-whatsapp.sh`，doctor 会发出警告；当 cron 缺少 systemd 用户总线环境时，它可能会误报 `Gateway inactive`。
- 当启用 WhatsApp 时，doctor 会检查是否存在降级的 Gateway 事件循环且本地 `openclaw-tui` 客户端仍在运行。`doctor --fix` 只会停止已验证的本地 TUI 客户端，因此 WhatsApp 回复不会排在过时的 TUI 刷新循环之后。
- Doctor 会将旧版 `openai-codex/*` 模型引用重写为规范的 `openai/*` 引用，覆盖主模型、回退模型、图像/视频生成模型、heartbeat/subagent/compaction 覆盖项、hooks、channel 模型覆盖，以及过时的 session route pins。`--fix` 还会把旧版 `openai-codex:*` 认证配置文件和 `auth.order.openai-codex` 条目迁移为 `openai:*`，将 Codex intent 移到按 provider/model 作用域划分的 `agentRuntime.id: "codex"` 条目上，移除过时的整 agent/session runtime pins，并确保修复后的 OpenAI agent 引用继续走 Codex 认证路由，而不是直接使用 OpenAI API key 认证。
- Doctor 会清理旧版 OpenClaw 版本遗留的插件依赖 staging 状态，并为声明它为 peer dependency 的托管 npm 插件重新链接宿主 `openclaw` 包。它还会修复配置中引用的缺失可下载插件（`plugins.entries`、已配置的 channels、已配置的 provider/search 设置、已配置的 agent runtimes）。在包更新期间，doctor 会跳过包管理器插件修复，直到包切换完成；如果某个已配置插件仍需要恢复，请在之后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误，并保留该已配置插件条目以便下次修复尝试。
- 当插件发现状态正常时，doctor 会通过从 `plugins.allow`/`plugins.deny`/`plugins.entries` 中移除缺失的插件 id 来修复过时的插件配置，同时清理匹配的悬空 channel 配置、heartbeat 目标和 channel 模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 负载来隔离无效的插件配置。Gateway 启动本来就只会跳过那个有问题的插件，因此其他插件和 channel 仍可继续运行。
- Doctor 会移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始终会保持 Codex 原生的 workspace tools 为原生状态。
- Doctor 会自动将旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）迁移到 `talk.provider` + `talk.providers.<provider>`。重复运行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含一个 memory-search 就绪检查，并且当缺少 embedding 凭据时，可以建议运行 `openclaw configure --section model`。
- 当没有配置 command owner 时，doctor 会发出警告。command owner 是允许运行仅 owner 可用命令并批准危险操作的人类操作员账户。DM 配对只允许某人与机器人对话；如果你在首次 owner bootstrap 机制存在之前就批准过某个发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex-mode agents 且操作员的 Codex home 中存在个人 Codex CLI 资产时，doctor 会报告一条信息提示。本地 Codex app-server 启动会使用按 agent 隔离的 home；如有需要，请先安装 Codex 插件，然后使用 `openclaw migrate plan codex` 来盘点应被有意提升的资产。
- 当默认 agent 允许的 skills 在当前运行环境中不可用时（缺少二进制、环境变量、配置或操作系统要求），doctor 会发出警告。`doctor --fix` 可以通过 `skills.entries.<skill>.enabled=false` 禁用这些不可用的 skills；如果你希望保持该 skill  सक्रिय，请改为安装/配置缺失的要求。
- 如果已启用 sandbox 模式但 Docker 不可用，doctor 会报告一条高信号警告，并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在旧版 sandbox registry 文件或分片目录（`~/.openclaw/sandbox/containers.json`、`~/.openclaw/sandbox/browsers.json`、`~/.openclaw/sandbox/containers/` 或 `~/.openclaw/sandbox/browsers/`），doctor 会将其报告出来；`--fix` 会把有效条目迁移到 SQLite，并隔离无效的旧版文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，并且不会写入明文回退凭据。对于由 exec 支持的 SecretRef，除非存在 `--allow-exec`，doctor 不会执行。
- 如果在修复路径中 channel 的 SecretRef 检查失败，doctor 会继续执行并报告警告，而不是提前退出。
- 在状态目录迁移之后，如果启用的默认 Telegram 或 Discord 账户依赖环境变量回退，而 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中存在可解析的 Telegram token。如果 token 检查不可用，doctor 会报告警告并跳过该次自动解析。

## macOS：`launchctl` 环境变量覆盖

如果你之前运行过 `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...`（或 `...PASSWORD`），该值会覆盖你的配置文件，并可能导致持续的“未授权”错误。

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## 相关

- [CLI 参考](/cli)
- [Gateway 诊断](/gateway/doctor)
