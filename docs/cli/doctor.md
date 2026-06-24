---
summary: "`openclaw doctor` 的 CLI 参考（健康检查 + 引导式修复）"
read_when:
  - 当你遇到连接/认证问题并希望获得引导式修复时
  - 当你已更新并希望进行一次完整性检查时
title: "医生"
---

# `openclaw doctor`

网关和通道的健康检查 + 快速修复。

相关：

- 故障排查: [疑难解答](/gateway/troubleshooting)
- 安全审计: [安全](/gateway/security)

## 为什么使用它

`openclaw doctor` 是 OpenClaw 的健康检查入口。当网关、
通道、插件、技能、模型路由、本地状态或配置迁移
表现不符合预期，而你又希望通过一个命令解释问题所在时，就使用它。

Doctor 有三种姿态：

| 姿态   | 命令                     | 行为                                                                            |
| ------ | ------------------------ | ------------------------------------------------------------------------------- |
| 检查   | `openclaw doctor`        | 面向人的检查与引导式提示。                                                      |
| 修复   | `openclaw doctor --fix`  | 执行受支持的修复；除非非交互式修复是安全的，否则会使用提示。                    |
| 语法检查 | `openclaw doctor --lint` | 只读的结构化结果，供 CI、预检和审查门禁使用。                                   |

当自动化需要稳定结果时，优先使用 `--lint`。当人工操作员明确希望 doctor 编辑配置或状态时，优先使用 `--fix`。

## 示例

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
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

面向目标的 Discord 能力探测会报告机器人在该通道中的有效权限；状态探测会审计已配置的 Discord 通道和语音自动加入目标。

## 选项

- `--no-workspace-suggestions`: 禁用工作区记忆/搜索建议
- `--yes`: 无需提示，直接接受默认值
- `--repair`: 在不提示的情况下应用推荐的非服务修复；网关服务安装和重写仍需要交互式确认或显式网关命令
- `--fix`: `--repair` 的别名
- `--force`: 应用更激进的修复，包括在需要时覆盖自定义服务配置
- `--non-interactive`: 无提示运行；仅执行安全迁移和非服务修复
- `--generate-gateway-token`: 生成并配置网关令牌
- `--allow-exec`: 允许 doctor 在验证密钥时执行已配置的 exec SecretRef
- `--deep`: 扫描系统服务以查找额外的网关安装，并报告最近的 Gateway supervisor 接力重启
- `--lint`: 以只读模式运行现代化健康检查并输出诊断发现
- `--post-upgrade`: 运行升级后插件兼容性探测；将发现输出到 stdout；如果存在任何错误级别发现，则以退出码 1 退出
- `--json`: 与 `--lint` 一起使用时，输出 JSON 发现而非人类可读输出；与 `--post-upgrade` 一起使用时，输出机器可读的 JSON 封装（`{ probesRun, findings }`）
- `--severity-min <level>`: 与 `--lint` 一起使用时，丢弃低于 `info`、`warning` 或 `error` 的发现
- `--skip <id>`: 与 `--lint` 一起使用时，跳过某个检查 id；可重复以跳过多个
- `--only <id>`: 与 `--lint` 一起使用时，仅运行某个检查 id；可重复以运行一小组选定检查

## 语法检查模式

`openclaw doctor --lint` 是 doctor 检查的只读自动化姿态。
它使用结构化健康检查路径，不会提示，也不会修复
或重写配置/状态。请在 CI、预检脚本和审查工作流中使用它，
当你需要机器可读的结果而不是引导式修复提示时就使用它。
诸如 `--json`、`--severity-min`、`--only` 和 `--skip`
这类 lint 输出选项只能与 `--lint` 一起使用。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
```

人类可读输出很简洁：

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: 运行 `openclaw configure` 并设置 Gateway 模式（local/remote），或 `openclaw config set gateway.mode local`。
```

JSON 输出是 lint 运行的脚本化入口：

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

退出行为：

- `0`：在所选严重性阈值及以上没有发现结果
- `1`：至少有一个发现结果达到所选阈值
- `2`：在生成 lint 发现结果之前命令/运行时失败

`--severity-min` 同时控制可见发现结果和退出阈值。例如，
`openclaw doctor --lint --severity-min error` 即使存在更低严重性的
`info` 或 `warning` 发现结果，也可能不显示任何结果并以 `0` 退出。

## 结构化健康检查

现代 doctor 检查使用一个小型结构化契约：

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` 驱动 `doctor --lint`。`repair()` 是可选的，并且只会被
`doctor --fix` / `doctor --repair` 考虑。尚未迁移到此
形态的检查，继续使用旧版 doctor 贡献流程。

这种拆分是有意的：`detect()` 负责诊断，而 `repair()` 负责
报告它改变了什么或将会改变什么。修复上下文可以携带
`dryRun`/`diff` 请求，修复结果可以返回结构化 `diffs`
用于配置/文件编辑，以及 `effects` 用于服务、进程、包、状态或其他
副作用。这使得已迁移的检查可以朝着 `doctor --fix --dry-run`
和 diff 报告发展，而无需把变更规划迁移进 `detect()`。

`repair()` 会报告它是否尝试了请求的修复，状态为
`status: "repaired" | "skipped" | "failed"`。若省略状态，则表示 `repaired`，因此简单的修复检查只需返回变更即可。当修复返回 `skipped` 或 `failed` 时，doctor 会报告原因，并且不会为该检查运行验证。

在结构化修复成功后，doctor 会使用已修复的发现结果作为 scope 重新运行 `detect()`。检查可以使用选中的发现结果、路径或 `ocPath` 值进行定向验证。如果该发现仍然存在，doctor 会报告修复警告，而不是将更改静默地视为已完成。

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

现代化核心 doctor 检查仍然附着在其所属的有序 doctor 贡献项上，并由其负责对应的人类可见 `doctor` / `doctor --fix` 行为。共享的结构化健康注册表是扩展点：当内置检查和由插件支持的检查在其所属包向当前命令路径注册后，它们会在核心 doctor 检查之后运行。`openclaw/plugin-sdk/health` 子路径为这些扩展消费者暴露了相同的契约。

## 检查选择

当某个工作流需要聚焦门禁时，请使用 `--only` 和 `--skip`：

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` 和 `--skip` 接受完整的检查 id，并且可以重复。如果某个 `--only`
id 未被注册，则该 id 不会运行任何检查；请使用命令的 `checksRun`
和 `checksSkipped` 字段确认聚焦门禁是否选中了你预期的检查。

## 升级后模式

`openclaw doctor --post-upgrade` 会运行面向构建或升级后串联使用的插件兼容性探测。发现项会输出到 stdout；如果任何发现项的 `level` 为 `"error"`，命令将以退出码 1 退出。添加 `--json` 可接收适合 CI、社区 `fork-upgrade` 技能以及其他升级后烟雾测试工具使用的机器可读封装（`{ probesRun, findings }`）。如果已安装的插件索引缺失或格式错误，JSON 模式仍会输出该封装，并附带一个 `plugin.index_unavailable` 错误发现。

注意：

- 在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，只读 doctor 检查仍然可用，但 `doctor --fix`、`doctor --repair`、`doctor --yes` 和 `doctor --generate-gateway-token` 会被禁用，因为 `openclaw.json` 是不可变的。请改为编辑此安装的 Nix 源；对于 nix-openclaw，请使用 agent-first 的 [快速开始](https://github.com/openclaw/nix-openclaw#quick-start)。
- 交互式提示（如密钥环/OAuth 修复）仅在 stdin 是 TTY 且未设置 `--non-interactive` 时运行。无头运行（cron、Telegram、无终端）会跳过提示。
- 性能：非交互式 `doctor` 运行会跳过急切的插件加载，以便无头健康检查保持快速。交互式 doctor 会话仍会加载旧版健康和修复流程所需的插件界面。
- `--lint` 比 `--non-interactive` 更严格：它始终是只读的，绝不会提示，也绝不会应用安全迁移。当你希望 doctor 进行更改时，请运行 `doctor --fix` 或 `doctor --repair`。
- 默认情况下，doctor 在检查密钥时不会执行 `exec` SecretRef。仅当你有意让 doctor 运行这些已配置的密钥解析器时，才使用 `openclaw doctor --allow-exec` 或 `openclaw doctor --lint --allow-exec`。
- `--fix`（`--repair` 的别名）会将备份写入 `~/.openclaw/openclaw.json.bak`，并删除未知配置键，同时列出每项移除。
- 现代化健康检查可以为 `doctor --fix` 暴露 `repair()` 路径；未暴露该路径的检查会继续沿用现有的 doctor 修复流程。
- `doctor --fix --non-interactive` 会报告缺失或过期的网关服务定义，但不会在更新修复模式之外安装或重写它们。若服务缺失，请运行 `openclaw gateway install`；若你有意替换启动器，请运行 `openclaw gateway install --force`。
- 状态完整性检查现在会检测会话目录中的孤立转录文件。将它们归档为 `.deleted.<timestamp>` 需要交互式确认；`--fix`、`--yes` 和无头运行会将它们保留在原处。
- Doctor 还会扫描 `~/.openclaw/cron/jobs.json`（或 `cron.store`）中的旧版 cron 作业形状，并在将规范化行导入 SQLite 之前重写它们。
- Doctor 会报告具有显式 `payload.model` 覆盖的 cron 作业，包括提供者命名空间计数以及与 `agents.defaults.model` 的不匹配情况，因此在认证或计费排查期间，可以看到未继承默认模型的计划任务。
- 在 Linux 上，当用户的 crontab 仍在运行旧版 `~/.openclaw/bin/ensure-whatsapp.sh` 时，doctor 会发出警告；该脚本已不再维护，并且在 cron 缺少 systemd user-bus 环境时会记录错误的 WhatsApp 网关宕机。
- 启用 WhatsApp 时，doctor 会检查 Gateway 事件循环是否降级，以及本地 `openclaw-tui` 客户端是否仍在运行。`doctor --fix` 只会停止已验证的本地 TUI 客户端，从而避免 WhatsApp 回复排在过时的 TUI 刷新循环后面。
- Doctor 会将旧版 `openai-codex/*` 模型引用重写为规范的 `openai/*` 引用，覆盖主模型、回退模型、图像/视频生成模型、心跳/子代理/压缩覆盖、hooks、通道模型覆盖以及过期的会话路由固定。`--fix` 还会迁移旧版 `openai-codex:*` 认证配置文件和 `auth.order.openai-codex` 条目到 `openai:*`，将 Codex 意图迁移到按提供者/模型作用域的 `agentRuntime.id: "codex"` 条目，移除过期的整代理/会话运行时固定，并将已修复的 OpenAI 代理引用保留在 Codex 认证路由上，而不是直接使用 OpenAI API key 认证。
- Doctor 会清理旧版 OpenClaw 版本创建的遗留插件依赖暂存状态，并为声明它为 peer dependency 的托管 npm 插件重新链接宿主 `openclaw` 包。它还会修复配置中引用的缺失可下载插件，例如 `plugins.entries`、已配置通道、已配置提供者/搜索设置或已配置的代理运行时。在包更新期间，doctor 会在包交换完成之前跳过包管理器插件修复；如果某个已配置插件仍需要恢复，请在之后重新运行 `openclaw doctor --fix`。如果下载失败，doctor 会报告安装错误，并保留已配置的插件条目以供下一次修复尝试。
- Doctor 会通过移除 `plugins.allow`/`plugins.deny`/`plugins.entries` 中缺失的插件 id 来修复过期插件配置，并在插件发现正常时一并移除匹配的悬空通道配置、心跳目标和通道模型覆盖。
- Doctor 会通过禁用受影响的 `plugins.entries.<id>` 条目并移除其无效的 `config` 负载来隔离无效插件配置。Gateway 启动已经只会跳过那个有问题的插件，因此其他插件和通道可以继续运行。
- 当另一 supervisor 负责网关生命周期时，请设置 `OPENCLAW_SERVICE_REPAIR_POLICY=external`。Doctor 仍会报告网关/服务健康并应用非服务修复，但会跳过服务安装/启动/重启/引导以及遗留服务清理。
- 在 Linux 上，doctor 会忽略处于非活动状态的额外 gateway-like systemd 单元，并且在修复期间不会为正在运行的 systemd 网关服务重写命令/入口点元数据。请先停止该服务，或者在你有意替换当前启动器时使用 `openclaw gateway install --force`。
- Doctor 会自动迁移旧版扁平 Talk 配置（`talk.voiceId`、`talk.modelId` 等）到 `talk.provider` + `talk.providers.<provider>`。
- 重复执行 `doctor --fix` 时，如果唯一差异只是对象键顺序，则不再报告/应用 Talk 规范化。
- Doctor 包含内存搜索就绪性检查，并且在缺少嵌入凭据时可建议使用 `openclaw configure --section model`。
- 当未配置命令 owner 时，doctor 会发出警告。命令 owner 是被允许运行仅 owner 命令并批准危险操作的人类操作员账户。DM 配对只表示有人可以与机器人对话；如果你在首次 owner 引导存在之前已批准过发送者，请显式设置 `commands.ownerAllowFrom`。
- 当配置了 Codex 模式代理且操作员的 Codex home 中存在个人 Codex CLI 资产时，doctor 会报告一条信息提示。本地 Codex app-server 启动使用按代理隔离的 home，因此如有需要请先安装 Codex 插件，然后使用 `openclaw migrate plan codex` 清点应有意提升的资产。
- Doctor 会移除已退役的 `plugins.entries.codex.config.codexDynamicToolsProfile`；Codex app-server 始终保持 Codex 原生工作区工具为原生状态。
- 当默认代理允许使用的技能在当前运行时环境中不可用，因为缺少二进制文件、环境变量、配置或操作系统要求时，doctor 会发出警告。`doctor --fix` 可以通过设置 `skills.entries.<skill>.enabled=false` 来禁用这些不可用技能；如果你希望保留该技能，请改为安装/配置缺失的要求。
- 如果已启用沙箱模式但 Docker 不可用，doctor 会报告一个高信号警告，并给出修复建议（`install Docker` 或 `openclaw config set agents.defaults.sandbox.mode off`）。
- 如果存在遗留的沙箱注册表文件或分片目录（`~/.openclaw/sandbox/containers.json`、`~/.openclaw/sandbox/browsers.json`、`~/.openclaw/sandbox/containers/` 或 `~/.openclaw/sandbox/browsers/`），doctor 会报告它们；`openclaw doctor --fix` 会将有效条目迁移到 SQLite，并隔离无效的遗留文件。
- 如果 `gateway.auth.token`/`gateway.auth.password` 由 SecretRef 管理且在当前命令路径中不可用，doctor 会报告只读警告，而不会写入明文回退凭据。对于 exec-backed SecretRef，只有在提供 `--allow-exec` 时 doctor 才会跳过执行。
- 如果在修复路径中通道 SecretRef 检查失败，doctor 会继续并报告警告，而不会过早退出。
- 在状态目录迁移之后，如果已启用的默认 Telegram 或 Discord 账户依赖环境回退，而 `TELEGRAM_BOT_TOKEN` 或 `DISCORD_BOT_TOKEN` 对 doctor 进程不可用，doctor 会发出警告。
- Telegram `allowFrom` 用户名自动解析（`doctor --fix`）需要在当前命令路径中存在可解析的 Telegram token。如果 token 检查不可用，doctor 会报告警告并跳过该轮自动解析。

## macOS: `launchctl` 环境变量覆盖

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
