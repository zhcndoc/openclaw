---
summary: "设置 ACP 代理：acpx 运行时配置、插件设置、权限"
read_when:
  - "安装或配置用于 Claude Code / Codex / Gemini CLI 的 acpx 运行时"
  - "启用 plugin-tools 或 OpenClaw-tools MCP 桥接"
  - "配置 ACP 权限模式"
title: "ACP 代理 — 设置"
---

关于概览、操作手册和概念，请参见 [ACP 代理](/tools/acp-agents)。

本页涵盖 acpx harness 配置、用于 MCP 桥接的插件设置，以及权限配置。

只有在设置 ACP/acpx 路径时才使用本页。对于原生 Codex app-server 运行时配置，请使用 [Codex harness](/plugins/codex-harness)。对于 OpenAI API 密钥或 Codex OAuth 模型提供方配置，请使用 [OpenAI](/providers/openai)。

Codex 有两条 OpenClaw 路径：

| 路由                      | Config/command                                         | 设置页面                              |
| -------------------------- | ------------------------------------------------------ | --------------------------------------- |
| 原生 Codex app-server    | `/codex ...`, `openai/gpt-*` 代理引用                | [Codex harness](/plugins/codex-harness) |
| 显式 Codex ACP 适配器 | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | 本页                               |

除非你明确需要 ACP/acpx 行为，否则优先使用原生路径。

## <a id="acpx-harness-support-(current)"></a><a id="acpx-harness-support-current"></a> acpx 运行时支持（当前）

内置的 acpx harness 别名（来自固定版本的 `acpx` 依赖）：

| 别名        | 裹布                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `claude`     | [克劳德 Code](https://claude.ai/code)                                                                  |
| `codex`      | [Codex CLI](https://developers.openai.com/codex/cli)                                                   |
| `copilot`    | [GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli) |
| `cursor`     | [光标CLI](https://cursor.com/docs/cli/acp) （`cursor-agent acp`）                                     |
| `droid`      | [工厂 Droid](https://www.factory.ai)                                                                |
| `fast-agent` | [快速代理](https://fast-agent.ai)                                                                    |
| `gemini`     | [双子座 CLI](https://github.com/google-gemini/gemini-cli)                                              |
| `grok-build` | [Grok Build](https://docs.x.ai/build/overview) （`grok agent stdio`）                                    |
| `iflow`      | [iFlow CLI](https://github.com/iflow-ai/iflow-cli)                                                     |
| `kilocode`   | [千码](https://kilocode.ai)                                                                        |
| `kimi`       | [Kimi CLI](https://github.com/MoonshotAI/kimi-cli)                                                     |
| `kiro`       | [Kiro CLI](https://kiro.dev)                                                                           |
| `mcode`      | MiniMax 代码（`mcode acp`；在网关主机上安装并验证其 CLI）                       |
| `mux`        | [Mux](https://mux.coder.com)                                                                           |
| `opencode`   | [OpenCode](https://opencode.ai)                                                                        |
| `openclaw`   | OpenClaw ACP 桥接（原生 `openclaw acp`）                                                            |
| `pi`         | [Pi 编码 Agent](https://github.com/earendil-works/pi)                                                |
| `pool`       | 池 （`pool acp`）                                                                                      |
| `qoder`      | [Qoder CLI](https://docs.qoder.com/cli/acp)                                                            |
| `qwen`       | [Q文 Code](https://github.com/QwenLM/qwen-code)                                                       |
| `trae`       | [Trae CLI](https://docs.trae.cn/cli)                                                                   |
| `zeroclaw`   | ZeroClaw (`zeroclaw acp`)                                                                              |

`factory-droid` 和 `factorydroid` 也会解析为内置的 `droid` 适配器。

当 OpenClaw 使用 acpx 后端时，首选 `agentId` 的这些值，除非您的 acpx 配置定义了自定义代理别名。 `grok-build` 是 ACPX 代理目标，而不是 xAI 模型 ID `xai/grok-build-0.1`。使用`agentId: "grok-build"`通过ACP启动Grok Build CLI；仅当在 OpenClaw 的 xAI 提供商路径上选择该模型时才使用 `xai/grok-build-0.1`。如果您的本地 Cursor 安装仍然将 ACP 公开为 `agent acp`，请覆盖 acpx 配置中的 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 时，也可以通过 `--agent <command>` 目标任意适配器，但这个原始逃生口是 acpx CLI 的特性（不是正常的 OpenClaw `agentId` 路径）。

模型控制依赖于适配器能力。 Codex ACP 模型参考在启动前由 OpenClaw 标准化。其他harness需要带有 `session/set_config_option` 的广告模型配置选项，或带有 `session/set_model` 的传统 ACP `models`。如果没有支持的 ACP 模型控制或适配器特定的启动模型标志，OpenClaw/acpx 无法强制选择模型。

## <a id="github-copilot-cli-in-native-chat"></a> 本机聊天中的 GitHub Copilot CLI

GitHub Copilot CLI 可以通过安装的代理模型选择器提供普通 OpenClaw 聊天，包括网络聊天和频道。此路由使用本地 `copilot --acp --stdio` 进程，而不是 OpenClaw API-provider 凭证。

安装支持 ACP- 的 CLI 并使用运行网关的同一 OS 帐户登录。 Copilot CLI 1.0.86 支持 ACP 上的模型发现和选择：

```bash
npm install -g @github/copilot
copilot --version
copilot login
```

刷新模型目录，然后选择 `acp-copilot/<model-id>` 条目。 OpenClaw 仅使用该 CLI 所宣传的模型；它不提供静态模型列表。仅安装检测并不能证明身份验证或模型访问。要防止新的本机 Copilot 轮换和目录发现，请将 `plugins.entries.acpx.config.nativeAgents.copilot` 设置为 `false`。经典 `/acp spawn copilot` 会话和 `acp.allowedAgents` 是分开的。

Copilot拥有认证和计费：

- Native GitHub 身份验证使用 CLI 的 OAuth 登录或其支持的 GitHub 令牌路由，包括经过身份验证的 `gh` 后备。环境令牌（`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`、`GITHUB_TOKEN`）可以覆盖存储的登录名。
- Copilot 模型使用消耗账户的计划津贴。不要因为某个模型的目录条目可用而认为该模型是免费的；检查帐户的包含使用量和额外使用量预算。
- 显式 CLI BYOK 配置（`COPILOT_PROVIDER_*`、`COPILOT_PROVIDERS_CONFIG` 或 CLI 的 `providers.json`）可以将模型请求路由到单独计费的提供商，即使 GitHub 登录可用也是如此。故意配置该路由。 OpenClaw 不会选择它或将 OpenClaw API 凭证复制到本机harness中。

有关帐户和计划要求，请参阅 GitHub 的 [CLI 身份验证指南](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli) 和 [Copilot 计费指南](https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing)。下面的本机聊天权限和沙箱边界仍然适用。

安装的本机代理保留自己的登录信息。在发现期间，`/models` 可以报告 **Checking 本机代理**，而不需要 OpenClaw API 密钥。如果未确认可用性，请检查网关主机上的本机应用程序并再次运行 `/models`。

<a id="tool-profiles-for-native-chat-runtimes" />

## <a id="permissions-for-native-chat-runtimes"></a> 本机聊天运行时的权限

从 **模型 → 安装的代理** 启用已安装的代理。对于使用自己的本机权限的运行时，OpenClaw 在启用之前会询问 **Use {runtime} 的本机权限？**。接受会记住在与启用相同的配置更新中对所选 OpenClaw 代理的同意。然后，使用该运行时的新聊天将从 **完全访问** 和可选沙箱关闭开始，而无需重复提示。启用本机应用程序不会让您登录到该应用程序。

本机代理在网关主机上使用自己的权限。 OpenClaw 并未声称在该代理内强制执行其可选工具限制。其他代理及其聊天保持不变，OpenClaw 托管的工具保留其策略。从 `agents.entries.<agentId>.nativeRuntimeConsent` 中删除运行时 ID 以撤销记住的同意。禁用并重新启用该应用程序不会将其删除。

对于在未记住同意的情况下手动配置的运行时，在选择运行时或发送包含该选择的消息时，Control UI 仍会向管理员提供 **Continue for this chat**。此后备仅更改该聊天的权限。

拒绝会使权限保持不变并保持消息未发送。第一次发送可以创建一个空聊天，因此确认会绑定到该聊天，但在确认之前不会保存或运行任何消息。确认会保存权限并重试该消息一次，包括聊天的第一条消息，而不固定其默认模型。仅选择确认，不发送草稿。每个聊天的同意不会被另一个聊天继承，并且会在会话重置或选定的运行时更改时清除。

此确认不能免除所需的沙箱、所需的工作区边界和不兼容的远程执行放置。受限用户必须询问管理员或选择兼容的运行时。

## <a id="required-config"></a> 必需配置

ACP 核心基线：

```json5
{
  acp: {
    enabled: true,
    // Optional. Default is true; set false to pause ACP dispatch while keeping /acp controls.
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "codex",
    allowedAgents: [
      "claude",
      "codex",
      "copilot",
      "cursor",
      "droid",
      "gemini",
      "grok-build",
      "iflow",
      "kilocode",
      "kimi",
      "kiro",
      "openclaw",
      "opencode",
      "pool",
      "qwen",
    ],
    stream: {
      deliveryMode: "live",
    },
  },
}
```

线程绑定配置在所有受支持的通道适配器之间共享：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
      spawnSessions: true,
    },
  },
}
```

如果线程绑定的 ACP spawn 不起作用，请先验证适配器功能开关：

- Discord: `session.threadBindings.spawnSessions=true`

当前对话绑定不需要创建子线程。它们需要一个活动的对话上下文，以及一个暴露 ACP 对话绑定的通道适配器。

请参阅 [ 配置 Reference](/gateway/configuration-reference)。

## <a id="repair-existing-bare-session-histories"></a> 修复现有的裸会话历史记录

ACPX 通过 OpenClaw 所有者隔离裸会话名称。如果会话报告 `SESSION_OWNER_MIGRATION_REQUIRED`，请停止网关并运行 `openclaw doctor --fix`，然后重新启动。 Doctor 使用与 Gateway 相同的服务工作区； ACPX的默认状态目录是`<service workspace>/state`。

修复需要一项当前的、明确的存储所有者声明以及匹配的后端标识符。它保留原始历史记录、事件日志引用、上游会话 ID、时间戳、选项和使用情况。持久记录名称移动到所有者限定的资源；现有的一次性物理 ID 和历史记录保持不变。不明确、陈旧、冲突、不可读或实时记录与诊断一起保留。在重试之前解决所报告的证据问题；重置会话不会绕过此修复。

这是一种离线、可崩溃恢复的迁移，具有原子目标文件发布功能。文件和 SQLite 不是一项原子事务。中断的修复可以重新运行：医生在完成元数据更新和归档旧的持久记录之前检查现有目标和存储的所有者声明。

## <a id="plugin-setup-for-acpx-backend"></a> acpx 后端的插件设置

打包安装会为 ACP 使用官方的 `@openclaw/acpx` 运行时插件。 在使用 ACP harness 会话之前，请先安装并启用它：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源代码检出也可以在 `pnpm install` 后使用本地工作区插件。

先运行：

```text
/acp doctor
```

如果你禁用了 `acpx`、通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想切换回打包插件，请使用显式包路径：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间的本地工作区安装：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然后验证后端健康状态：

```text
/acp doctor
```

<a id="acpx-runtime-startup-probe" />

### <a id="acpx-runtime-startup-check"></a> acpx运行时启动检查

`acpx` 插件直接嵌入 ACP 运行时（无需配置单独的 `acpx` 二进制文件或版本）。默认情况下，它会在网关启动期间注册嵌入式后端，并在网关 `ready` 信号之前等待一次运行状况检查。该检查还提供故障诊断并受 `plugins.entries.acpx.config.timeoutSeconds` 约束；不健康的结果不会启动第二次检查。仅针对有意禁用启动检查的脚本或环境设置 `OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=0` 或 `OPENCLAW_SKIP_ACPX_RUNTIME_PROBE=1`。运行 `/acp doctor` 进行显式按需检查。

当路径或标志值应保持为一个 argv token 时，可使用结构化参数覆盖单个 ACP 代理命令：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "agents": {
            "claude": {
              "command": "node",
              "args": ["/path/to/custom adapter.mjs", "--verbose"]
            }
          }
        }
      }
    }
  }
}
```

- `agents.<id>.command` 是该 ACP 代理的可执行或现有命令字符串。现有的绝对可执行路径保留一个参数，即使它包含空格也是如此。
- `agents.<id>.args` 为可选。每个项目均原封不动地传递，包括空字符串、空格、引号和反斜杠。不要在数组内添加 shell 引用。

在 Windows 上，将可执行路径放在 `command` 中，将其标志放在 `args` 中。使用命令字符串时引用包含空格的相对可执行路径。生成的适配器包装器也使用 argv 数组。重新连接未更改的会话将保留其保存的命令表示和对话历史记录。

参见 [插件](/tools/plugin)。

### <a id="automatic-adapter-download"></a> 自动下载适配器

`acpx` 会在首次使用时通过 `npx` 自动下载 ACP 适配器（例如 Claude 和 Codex ACP 桥接）。你无需手动安装适配器包，OpenClaw 本身也没有单独的 postinstall 步骤。如果适配器下载或启动失败，`/acp doctor` 会报告该失败。

### <a id="plugin-tools-mcp-bridge"></a> Plugin tools MCP 桥接

默认情况下，ACPX 会话**不会**将 OpenClaw 插件注册的工具暴露给 ACP 运行时。

如果您希望 ACP 代理（例如 Codex 或 Claude Code）调用已安装的 OpenClaw 插件工具（例如内存 recall/store），请启用专用桥：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

这会做什么：

- 将一个内置的、名为 `openclaw-plugin-tools` 的 MCP 服务器注入到 ACPX 会话启动流程中。
- 暴露由已安装且已启用的 OpenClaw 插件注册的插件工具。
- 将当前激活的 ACP 会话身份传递给插件工具工厂，从而让代理作用域的工具保留在该代理的命名空间中。
- 保持该功能显式开启且默认关闭。

安全与信任说明：

- 这会扩展 ACP 运行时工具面。
- ACP 代理只能访问网关中已激活的插件工具。
- 应将其视为与允许这些插件在 OpenClaw 本身中执行具有相同的信任边界。
- 在启用前请审查已安装的插件。

自定义 `mcpServers` 仍然像以前一样工作。内置的 plugin-tools 桥接是一项额外的可选便利功能，而不是通用 MCP 服务器配置的替代品。

### <a id="openclaw-tools-mcp-bridge"></a> OpenClaw tools MCP 桥接

默认情况下，ACPX 会话还执行 **not** 通过 MCP 公开内置 OpenClaw 工具。当 ACP 代理需要选定的内置工具（例如 `cron`）时，启用单独的核心工具桥：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

这会做什么：

- 将一个名为 `openclaw-tools` 的内置 MCP 服务器注入 ACPX 会话启动流程。
- 暴露选定的内置 OpenClaw 工具。初始服务器暴露 `cron`。
- 保持核心工具暴露显式启用且默认关闭。

### <a id="runtime-operation-timeout-configuration"></a> 运行时操作超时配置

默认情况下，`acpx` 插件会为内嵌运行时启动和控制操作提供 120 秒。这为 Gemini CLI 之类较慢的 harness 留出足够时间完成 ACP 启动和初始化。如果你的主机需要不同的操作限制，请覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

运行时轮流使用 OpenClaw agent/run 超时，包括 `/acp timeout`。交互式转弯可以继续超出插件操作限制，直到其转弯预算到期、harness完成或您取消它。 `sessions_spawn` 不接受每次调用超时覆盖；操作员路径为`agents.defaults.subagents.runTimeoutSeconds`。使用默认的混合重新加载模式，更改 `timeoutSeconds` 会自动重新加载插件。参见[配置热重载](/gateway/configuration/hot-reload)。

<a id="health-probe-agent-configuration" />

### <a id="health-check-agent-configuration"></a> 健康检查代理配置

当 `/acp doctor` 或启动检查验证后端时，捆绑的 `acpx` 插件会检查一个harness代理。如果设置了`acp.allowedAgents`，则默认为第一个允许的代理；否则默认为 `codex`。如果您的部署需要不同的 ACP 代理进行运行状况检查，请显式设置检查代理：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

使用默认的混合重新加载模式，此更改会自动重新加载插件。运行`/acp doctor`来检查更新的后端。

## <a id="permission-configuration"></a> 权限配置

ACP 会话在没有用于文件写入和 shell 执行权限提示的交互式 TTY 的情况下运行。这不会在通道传递的轮次期间禁用 ACP 表单或 URL 诱导：这些请求改为使用瞬态网关问题。 acpx 插件提供了两个控制harness权限的配置键，`permissionMode` 和 `nonInteractivePermissions`，两者均在下面进行了描述。

这些 ACPX harness权限与 OpenClaw 执行批准分开，并且与 CLI- 后端供应商旁路标志（例如 Claude CLI `--permission-mode bypassPermissions`）分开。 ACPX `approve-all` 是用于 ACP 会话的harness级玻璃开关。

有关 OpenClaw `tools.exec.mode`、Codex Guardian 审批以及 ACPX harness 权限之间更广泛的比较，请参见 [权限模式](/tools/permission-modes)。

### `permissionMode`

控制运行时代理在不提示的情况下可执行哪些操作。

| 值           | 行为                                                  |
| --------------- | --------------------------------------------------------- |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。          |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。 |
| `deny-all`      | 拒绝所有权限提示。                              |

### `nonInteractivePermissions`

控制当本应显示权限提示但没有交互式 TTY 可用时会发生什么（ACP 会话始终如此）。

| 值  | 行为                                                                 |
| ------ | ------------------------------------------------------------------------ |
| `fail` | 以 `PermissionPromptUnavailableError` 中止会话。**（默认）** |
| `deny` | 静默拒绝该权限并继续（优雅降级）。        |

### <a id="configuration"></a> 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

使用默认的混合重新加载模式，这些更改会自动重新加载插件。其他重载模式请参见[配置热重载](/gateway/configuration/hot-reload)。

<Warning>
OpenClaw 默认使用 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行操作都可能失败，并报错 `PermissionPromptUnavailableError: Permission prompt unavailable in non-interactive mode`。

如果需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，以便会话拒绝受限制的操作而不是崩溃。
</Warning>

## <a id="related"></a> 相关内容

- [ACP 代理](/tools/acp-agents) — 概览、运维手册、概念
- [子代理](/tools/subagents)
- [多代理路由](/concepts/multi-agent)
- [ACPx 插件参考](/plugins/reference/acpx) — acpx 运行时插件的清单和配置，包括 Pi 会话目录
