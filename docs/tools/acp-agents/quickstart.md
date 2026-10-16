---
summary: "安装 acpx ACP 运行时插件，确认其可用，然后选择一个harness目标id"
title: "ACP 代理快速入门"
read_when:
  - "您正在安装或启用 ACP 运行时插件"
  - "您需要首次运行的陷阱和运行时先决条件"
  - "您需要 /acp spawn 支持的harness目标 ID"
---

## <a id="does-this-work-out-of-the-box%3F"></a><a id="does-this-work-out-of-the-box"></a> 这开箱即用吗？

是的，安装官方 ACP 运行时插件后即可：

```bash
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

源签出可以在 `pnpm install` 之后使用本地 `extensions/acpx` 工作区插件。运行 `/acp doctor` 进行准备情况检查。

OpenClaw 仅在 ACP 为 **真正可用的** 时向代理传授有关 ACP 生成的知识：必须启用 ACP，不得禁用调度，当前会话不得被沙箱阻止，并且运行时后端必须已加载且运行正常。如果任何条件失败，ACP 技能和 `sessions_spawn` ACP 指导将保持隐藏状态，因此代理不会建议后端不可用。

ACP 策略更改无需重新启动网关即可应用。启用、调度、默认代理和允许的代理管理新的准入；后端和后备设置控制后续回合。承认的回合保留其会话所有权。 ACPX 运行状况检查从当前允许的代理中进行选择，除非其插件配置设置了显式 `probeAgent`。

ACPX 会话状态默认为 OpenClaw 状态目录内的 `acpx/`（`OPENCLAW_STATE_DIR`，通常为 `~/.openclaw`）。会话重置时，工作目录和已安装的包目录不需要是可写的。显式 `plugins.entries.acpx.config.stateDir` 仍会覆盖此位置。以前的 `<workspace>/state` 默认值中的会话会在 ACPX 启动时自动迁移，或者在新的默认值为空时由 `openclaw doctor --fix` 自动迁移。仅当您想保留旧位置时才设置 `stateDir`。如果迁移失败，ACPX 会发出警告并继续使用该进程的旧位置；警告指定要设置的覆盖。

<AccordionGroup>
  <Accordion id="first-run-gotchas" title="首次运行的陷阱">
    - 如果设置了 `plugins.allow`，它就是一个受限的插件清单，并且 **必须** 包含 `acpx`，否则已安装的 ACP 后端会被故意阻止（`/acp doctor` 会报告缺失的允许列表项）。
    - Codex ACP 适配器自带 `acpx` 插件，并在可能时本地启动。
    - Codex ACP 与隔离的 `CODEX_HOME` 一起运行。 OpenClaw 从主机 Codex 配置复制可信项目信任条目以及安全 model/provider 路由配置（`model`、`model_provider`、`model_reasoning_effort`、`sandbox_mode` 和安全 `model_providers.<name>` 字段）；身份验证、通知和挂钩仅保留在主机配置上。
    - 其他目标 harness 适配器可能会在首次使用时通过 `npx` 按需获取。
    - 该 harness 的厂商认证必须已在宿主上存在。
    - 如果宿主没有 npm 或网络访问权限，首次运行时的适配器获取将会失败，直到缓存被预热或以其他方式安装该适配器。

  </Accordion>
  <Accordion id="runtime-prerequisites" title="运行时先决条件">
    ACP 会启动一个真实的外部 harness 进程。OpenClaw 负责路由、 后台任务状态、投递、绑定和策略；harness 负责其提供方登录、模型目录、文件系统行为和原生工具。

    在归咎于 OpenClaw 之前，请验证：

    - `/acp doctor` 报告后端已启用且健康。
    - 当设置了 allowlist 时，目标 id 需要被 `acp.allowedAgents` 允许。
    - harness 命令可以在 Gateway 主机上启动。
    - 该 harness 已存在供应商认证（`claude`、`codex`、`gemini`、`opencode`、`droid` 等）。
    - 为该 harness 选择的模型存在 - 模型 id 不能跨 harness 通用。
    - 请求的 `cwd` 存在且可访问，或者省略 `cwd` 让 backend 使用其默认值。
    - 权限模式与工作匹配。非交互式会话无法单击本机权限提示，因此 write/exec-heavy 编码运行通常需要可以无头进行的 ACPX 权限配置文件。

  </Accordion>
</AccordionGroup>

默认情况下，OpenClaw 插件工具和内置的 OpenClaw 工具**不会**暴露给 ACP harness。只有在 harness 需要直接调用这些工具时，才在 [ACP agents - setup](/tools/acp-agents-setup) 中启用显式的 MCP 桥接。

## <a id="supported-harness-targets"></a> 支持的 harness 目标

使用 `acpx` 后端时，可将这些 id 作为 `/acp spawn <id>` 或 `sessions_spawn({ runtime: "acp", agentId: "<id>" })` 的目标：

| harness ID   | 常见后端                                | 笔记                                                                               |
| ------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `claude`     | Claude Code ACP 适配器                        | 需要主机上已完成 Claude Code 身份验证。                                              |
| `codex`      | Codex ACP 适配器                              | 仅在原生 `/codex` 不可用或请求 ACP 时，才会显式回退到 ACP。 |
| `copilot`    | GitHub Copilot ACP 适配器                     | 需要 Copilot CLI/runtime 身份验证。                                                  |
| `cursor`     | 光标 CLI ACP （`cursor-agent acp`）            | 如果本地安装暴露了不同的 ACP 入口点，请覆盖 acpx 命令。    |
| `droid`      | 工厂机器人 CLI                              | 需要 Factory/Droid 身份验证，或在 harness 环境中提供 `FACTORY_API_KEY`。        |
| `fast-agent` | fast-agent-mcp ACP 适配器                     | 通过 `uvx` 按需获取。                                                       |
| `gemini`     | Gemini CLI ACP 适配器                         | 需要 Gemini CLI 身份验证或 API key 配置。                                          |
| `grok-build` | Grok 构建 CLI （`grok agent stdio`）            | 需要在主机上安装并验证 Grok Build。                        |
| `iflow`      | iFlow CLI                                      | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `kilocode`   | 公斤代码 CLI                                  | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `kimi`       | Kimi/Moonshot CLI                              | 需要主机上已完成 Kimi/Moonshot 身份验证。                                            |
| `kiro`       | 基罗 CLI                                       | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `mux`        | Mux CLI ACP 适配器                            | 通过 `npx` 按需获取。                                                       |
| `opencode`   | OpenCode ACP 适配器                           | 需要 OpenCode CLI/provider 身份验证。                                                |
| `openclaw`   | OpenClaw 网关桥接 `openclaw acp` | 让 ACP-aware harness与 OpenClaw 网关会话进行对话。                 |
| `pool`       | Poolside 代理 （`pool acp`）                    | 需要在网关主机上安装并验证 Poolside CLI。          |
| `qoder`      | 订购 CLI                                      | 适配器可用性和模型控制取决于已安装的 CLI。                 |
| `qwen`       | Qwen 代码 / Qwen CLI                           | 需要主机上的 Qwen- 兼容身份验证。                                          |
| `trae`       | Trae CLI ACP 适配器                           | 适配器可用性和模型控制取决于已安装的 CLI。                 |

`pi`（pi-acp）也在 acpx 后端中注册，但它并不像上面这些那样属于编码 harness。

`grok-build` 是启动 Grok 内部版本 CLI 的 ACPX 代理目标，而不是 xAI 模型 ID `xai/grok-build-0.1`。将 `grok-build` 传递为 `agentId` 为 ACP；仅在 OpenClaw 模型字段中使用 xAI 模型 ID。

自定义 acpx agent 别名可以在 acpx 本身中配置，但在分发前，OpenClaw 策略仍会检查 `acp.allowedAgents` 以及任何 `agents.entries.*.runtime.acp.agent` 映射。
