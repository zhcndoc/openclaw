---
summary: "设置 ACP 代理：acpx 运行时配置、插件设置、权限"
read_when:
  - 安装或配置用于 Claude Code / Codex / Gemini CLI 的 acpx 运行时
  - 启用 plugin-tools 或 OpenClaw-tools MCP 桥接
  - 配置 ACP 权限模式
title: "ACP 代理 — 设置"
---

关于概览、操作手册和概念，请参见 [ACP 代理](/tools/acp-agents)。

下面的章节涵盖 acpx 运行时配置、用于 MCP 桥接的插件设置以及权限配置。

只有在设置 ACP/acpx 路径时才使用本页。对于原生 Codex
app-server 运行时配置，请使用 [Codex harness](/plugins/codex-harness)。对于
OpenAI API 密钥或 Codex OAuth 模型提供方配置，请使用
[OpenAI](/providers/openai)。

Codex 有两条 OpenClaw 路径：

| Route                      | Config/command                                         | Setup page                              |
| -------------------------- | ------------------------------------------------------ | --------------------------------------- |
| 原生 Codex app-server    | `/codex ...`, `openai/gpt-*` 代理引用                | [Codex harness](/plugins/codex-harness) |
| 显式 Codex ACP 适配器 | `/acp spawn codex`, `runtime: "acp", agentId: "codex"` | 本页                               |

除非你明确需要 ACP/acpx 行为，否则优先使用原生路径。

## acpx 运行时支持（当前）

当前 acpx 内置运行时别名：

- `claude`
- `codex`
- `copilot`
- `cursor`（Cursor CLI: `cursor-agent acp`）
- `droid`
- `gemini`
- `iflow`
- `kilocode`
- `kimi`
- `kiro`
- `openclaw`
- `opencode`
- `pi`
- `qwen`

当 OpenClaw 使用 acpx 后端时，除非你的 acpx 配置定义了自定义代理别名，否则优先为 `agentId` 使用这些值。
如果你的本地 Cursor 安装仍然将 ACP 暴露为 `agent acp`，请在你的 acpx 配置中覆盖 `cursor` 代理命令，而不是更改内置默认值。

直接使用 acpx CLI 时也可以通过 `--agent <command>` 目标任意适配器，但这个原始逃生口是 acpx CLI 的特性（不是正常的 OpenClaw `agentId` 路径）。

模型控制取决于适配器能力。Codex ACP 模型引用会在启动前由 OpenClaw
规范化。其他运行时需要 ACP `models` 以及
`session/set_model` 支持；如果某个运行时既不暴露该 ACP 能力，
也不提供自身的启动模型标志，OpenClaw/acpx 就无法强制选择模型。

## 必需配置

ACP 核心基线：

```json5
{
  acp: {
    enabled: true,
    // 可选。默认值为 true；设为 false 可在保留 /acp 控制的同时暂停 ACP 派发。
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
      "iflow",
      "kilocode",
      "kimi",
      "kiro",
      "openclaw",
      "opencode",
      "pi",
      "qwen",
    ],
    maxConcurrentSessions: 8,
    stream: {
      coalesceIdleMs: 300,
      maxChunkChars: 1200,
    },
    runtime: {
      ttlMinutes: 120,
    },
  },
}
```

线程绑定配置取决于通道适配器。Discord 示例：

```json5
{
  session: {
    threadBindings: {
      enabled: true,
      idleHours: 24,
      maxAgeHours: 0,
    },
  },
  channels: {
    discord: {
      threadBindings: {
        enabled: true,
        spawnSessions: true,
      },
    },
  },
}
```

如果线程绑定的 ACP spawn 不起作用，请先验证适配器功能开关：

- Discord: `channels.discord.threadBindings.spawnSessions=true`

当前对话绑定不需要创建子线程。它们需要一个活动的对话上下文，以及一个暴露 ACP 对话绑定的通道适配器。

参见 [配置参考](/gateway/configuration-reference)。

## acpx 后端的插件设置

打包安装会为 ACP 使用官方的 `@openclaw/acpx` 运行时插件。
在使用 ACP harness 会话之前，请先安装并启用它：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源代码检出也可以在 `pnpm install` 后使用本地工作区插件。

先运行：

```text
/acp doctor
```

如果你禁用了 `acpx`、通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者想
切换回打包插件，请使用显式包路径：

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

### acpx 命令和版本配置

默认情况下，`acpx` 插件会在 Gateway
启动期间探测内嵌的 ACP 后端，并在网关发出 `ready` 信号之前等待该探测完成。将
`OPENCLAW_ACPX_RUNTIME_STARTUP_PROBE=0` 设为跳过启动探测，并改为延迟注册
后端。运行 `/acp doctor` 可进行显式按需探测。

在插件配置中覆盖命令或版本：

```json
{
  "plugins": {
    "entries": {
      "acpx": {
        "enabled": true,
        "config": {
          "command": "../acpx/dist/cli.js",
          "expectedVersion": "any"
        }
      }
    }
  }
}
```

- `command` 可接受绝对路径、相对路径（从 OpenClaw 工作区解析），或命令名。
- `expectedVersion: "any"` 会禁用严格版本匹配。
- 自定义 `command` 路径会禁用插件本地自动安装。

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

- `agents.<id>.command` 是该 ACP 代理的可执行文件或现有命令字符串。
- `agents.<id>.args` 为可选项。OpenClaw 通过当前 acpx 命令字符串注册表传递之前，会先对数组中的每一项进行 shell 引号转义。

参见 [插件](/tools/plugin)。

### 自动依赖安装

当你通过 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx
运行时依赖（平台特定二进制文件）会通过 postinstall 钩子自动安装。若自动安装失败，网关仍会正常启动，并通过 `openclaw acp doctor` 报告缺失的依赖。

### Plugin tools MCP 桥接

默认情况下，ACPX 会话**不会**将 OpenClaw 插件注册的工具暴露给
ACP 运行时。

如果你希望 Codex 或 Claude Code 之类的 ACP 代理调用已安装的
OpenClaw 插件工具，例如 memory recall/store，请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

这会做什么：

- 将一个名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入 ACPX 会话
  启动流程。
- 暴露已安装且已启用的 OpenClaw 插件所注册的插件工具。
- 保持该功能显式启用且默认关闭。

安全与信任说明：

- 这会扩展 ACP 运行时工具面。
- ACP 代理只能访问网关中已激活的插件工具。
- 应将其视为与允许这些插件在 OpenClaw 本身中执行具有相同的信任边界。
- 在启用前请审查已安装的插件。

自定义 `mcpServers` 仍然像以前一样工作。内置的 plugin-tools 桥接是一项额外的可选便利功能，而不是通用 MCP 服务器配置的替代品。

### OpenClaw tools MCP 桥接

默认情况下，ACPX 会话同样**不会**通过
MCP 暴露内置 OpenClaw 工具。只有当 ACP 代理需要某些选定的内置工具（如 `cron`）时，才启用单独的 core-tools 桥接：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

这会做什么：

- 将一个名为 `openclaw-tools` 的内置 MCP 服务器注入 ACPX 会话
  启动流程。
- 暴露选定的内置 OpenClaw 工具。初始服务器暴露 `cron`。
- 保持核心工具暴露显式启用且默认关闭。

### 运行时超时配置

`acpx` 插件默认将嵌入式运行时设置为 120 秒超时。这为 Gemini CLI 之类较慢的 harness 留出足够时间完成 ACP 启动和初始化。若你的主机需要不同的运行时限制，可覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改该值后重启网关。

### 健康探测代理配置

当 `/acp doctor` 或启动探测检查后端时，随附的 `acpx`
插件会探测一个 harness 代理。如果设置了 `acp.allowedAgents`，则默认使用
第一个允许的代理；否则默认使用 `codex`。如果你的部署需要用于健康检查的不同 ACP 代理，请显式设置探测代理：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

更改该值后重启网关。

## 权限配置

ACP 会话以非交互方式运行——没有 TTY 可用于批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供两个配置键来控制权限处理方式：

这些 ACPX 运行时权限与 OpenClaw exec 审批以及 CLI 后端厂商绕过标志（例如 Claude CLI `--permission-mode bypassPermissions`）是分开的。ACPX `approve-all` 是 ACP 会话的运行时紧急开关。

### `permissionMode`

控制运行时代理在不提示的情况下可执行哪些操作。

| Value           | Behavior                                                  |
| --------------- | --------------------------------------------------------- |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。                        |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。                        |
| `deny-all`      | 拒绝所有权限提示。                                        |

### `nonInteractivePermissions`

控制当本应显示权限提示但没有交互式 TTY 可用时会发生什么（ACP 会话始终如此）。

| Value  | Behavior                                                          |
| ------ | ----------------------------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）**                     |
| `deny` | 静默拒绝该权限并继续（优雅降级）。                                |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后重启网关。

<Warning>
OpenClaw 默认使用 `permissionMode=approve-reads` 和 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行都可能失败，并返回 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。

如果你需要限制权限，请将 `nonInteractivePermissions` 设为 `deny`，这样会话会优雅降级而不是崩溃。
</Warning>

## 相关内容

- [ACP 代理](/tools/acp-agents) — 概览、运维手册、概念
- [子代理](/tools/subagents)
- [多代理路由](/concepts/multi-agent)
