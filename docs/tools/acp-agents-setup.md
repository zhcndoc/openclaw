---
summary: "设置 ACP 代理：acpx 运行框架配置、插件设置、权限"
read_when:
  - 安装或配置用于 Claude Code / Codex / Gemini CLI 的 acpx 运行框架
  - 启用 plugin-tools 或 OpenClaw-tools MCP 桥接
  - 配置 ACP 权限模式
title: "ACP 代理 — 设置"
---

有关概览、操作手册和概念，请参见 [ACP agents](/tools/acp-agents)。
本页面涵盖 acpx 运行框架配置、用于 MCP 桥接的插件设置以及
权限配置。

## acpx 运行框架支持（当前）

当前 acpx 内置运行框架别名：

- `claude`
- `codex`
- `copilot`
- `cursor`（Cursor CLI：`cursor-agent acp`）
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

直接使用 acpx CLI 也可以通过 `--agent <command>` 目标指向任意适配器，但该原始逃逸出口是 acpx CLI 的功能（不是常规 OpenClaw `agentId` 路径）。

## 必需配置

ACP 核心基线：

```json5
{
  acp: {
    enabled: true,
    // 可选。默认值为 true；设置为 false 可在保留 /acp 控件的同时暂停 ACP 分发。
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

线程绑定配置是特定于通道适配器的。Discord 示例：

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
        spawnAcpSessions: true,
      },
    },
  },
}
```

如果线程绑定的 ACP 创建不起作用，请先验证适配器功能标志：

- Discord: `channels.discord.threadBindings.spawnAcpSessions=true`

当前会话绑定不需要创建子线程。它们需要一个活跃的会话上下文和一个暴露 ACP 会话绑定的通道适配器。

参见 [Configuration Reference](/gateway/configuration-reference)。

## acpx 后端的插件设置

新安装默认会启用捆绑的 `acpx` 运行时插件，因此 ACP
通常无需手动安装插件步骤即可工作。

先运行：

```text
/acp doctor
```

如果你禁用了 `acpx`，通过 `plugins.allow` / `plugins.deny` 拒绝了它，或者
希望切换到本地开发检出版本，请使用显式插件路径：

```bash
openclaw plugins install acpx
openclaw config set plugins.entries.acpx.enabled true
```

开发期间在本地工作区安装：

```bash
openclaw plugins install ./path/to/local/acpx-plugin
```

然后验证后端健康状况：

```text
/acp doctor
```

### acpx 命令和版本配置

默认情况下，捆绑的 `acpx` 插件使用其插件本地固定二进制文件（插件包内的 `node_modules/.bin/acpx`）。启动时会将后端注册为未就绪，并由后台任务验证 `acpx --version`；如果二进制文件缺失或不匹配，它会运行 `npm install --omit=dev --no-save acpx@<pinned>` 并重新验证。整个过程中网关保持非阻塞。

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

- `command` 接受绝对路径、相对路径（从 OpenClaw 工作区解析）或命令名。
- `expectedVersion: "any"` 会禁用严格版本匹配。
- 自定义 `command` 路径会禁用插件本地自动安装。

参见 [Plugins](/tools/plugin)。

### 自动依赖安装

当你通过 `npm install -g openclaw` 全局安装 OpenClaw 时，acpx
运行时依赖（特定平台的二进制文件）会通过 postinstall 钩子自动安装。
如果自动安装失败，网关仍会正常启动，并通过 `openclaw acp doctor` 报告缺失的依赖。

### Plugin tools MCP 桥接

默认情况下，ACPX 会话不会将 OpenClaw 已注册的插件工具暴露给
ACP 运行框架。

如果你希望像 Codex 或 Claude Code 这样的 ACP 代理调用已安装的
OpenClaw 插件工具，例如 memory recall/store，请启用专用桥接：

```bash
openclaw config set plugins.entries.acpx.config.pluginToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-plugin-tools` 的内置 MCP 服务器注入到 ACPX 会话
  启动过程中。
- 暴露已安装并启用的 OpenClaw 插件已注册的插件工具。
- 保持该功能显式启用，默认关闭。

安全与信任说明：

- 这会扩展 ACP 运行框架的工具面。
- ACP 代理只能访问网关中已激活的插件工具。
- 请将其视为与允许这些插件在 OpenClaw 本身中执行相同的信任边界。
- 在启用之前请审查已安装的插件。

自定义 `mcpServers` 仍可照常使用。内置的 plugin-tools 桥接是一个额外的可选便利功能，而不是通用 MCP 服务器配置的替代品。

### OpenClaw tools MCP 桥接

默认情况下，ACPX 会话也不会通过
MCP 暴露内置的 OpenClaw 工具。在 ACP 代理需要某些
内置工具（例如 `cron`）时，启用单独的 core-tools 桥接：

```bash
openclaw config set plugins.entries.acpx.config.openClawToolsMcpBridge true
```

其作用如下：

- 将名为 `openclaw-tools` 的内置 MCP 服务器注入到 ACPX 会话
  启动过程中。
- 暴露选定的内置 OpenClaw 工具。初始服务器暴露 `cron`。
- 保持核心工具暴露显式启用，默认关闭。

### 运行时超时配置

捆绑的 `acpx` 插件默认将嵌入式运行时设置为 120 秒
超时。这为像 Gemini CLI 这样较慢的运行框架提供了足够时间来完成
ACP 启动和初始化。如果你的主机需要不同的
运行时限制，请覆盖它：

```bash
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
```

更改此值后请重启网关。

### 健康探测代理配置

捆绑的 `acpx` 插件在判断
嵌入式运行时后端是否就绪时，会探测一个运行框架代理。默认值是 `codex`。如果你的部署
使用不同的默认 ACP 代理，请将探测代理设置为相同的 id：

```bash
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

更改此值后请重启网关。

## 权限配置

ACP 会话以非交互方式运行——没有 TTY 可用于批准或拒绝文件写入和 shell 执行权限提示。acpx 插件提供两个配置键来控制权限的处理方式：

这些 ACPX 运行框架权限与 OpenClaw exec 审批是分开的，也与 CLI 后端供应商绕过标志分开，例如 Claude CLI `--permission-mode bypassPermissions`。ACPX `approve-all` 是 ACP 会话在运行框架级别的紧急开关。

### `permissionMode`

控制运行框架代理在不提示的情况下可以执行哪些操作。

| 值              | 行为                                                     |
| --------------- | -------------------------------------------------------- |
| `approve-all`   | 自动批准所有文件写入和 shell 命令。                      |
| `approve-reads` | 仅自动批准读取；写入和执行需要提示。                     |
| `deny-all`      | 拒绝所有权限提示。                                       |

### `nonInteractivePermissions`

控制当本应显示权限提示但没有可用的交互式 TTY 时会发生什么（ACP 会话始终如此）。

| 值     | 行为                                                             |
| ------ | ---------------------------------------------------------------- |
| `fail` | 使用 `AcpRuntimeError` 中止会话。**（默认）**                    |
| `deny` | 静默拒绝该权限并继续（优雅降级）。                               |

### 配置

通过插件配置设置：

```bash
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

更改这些值后请重启网关。

> **重要：** OpenClaw 当前默认 `permissionMode=approve-reads` 且 `nonInteractivePermissions=fail`。在非交互式 ACP 会话中，任何触发权限提示的写入或执行都可能失败，并显示 `AcpRuntimeError: Permission prompt unavailable in non-interactive mode`。
>
> 如果你需要限制权限，请将 `nonInteractivePermissions` 设置为 `deny`，这样会话会优雅降级，而不是崩溃。

## 相关内容

- [ACP agents](/tools/acp-agents) — 概览、操作手册、概念
- [Sub-agents](/tools/subagents)
- [Multi-agent routing](/concepts/multi-agent)
