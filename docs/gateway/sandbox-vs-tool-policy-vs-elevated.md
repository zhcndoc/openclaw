---
summary: "工具为何被阻止：sandbox 运行时、工具允许/拒绝策略，以及 elevated 执行门控"
title: Sandbox vs tool policy vs elevated
read_when: "当你遇到“sandbox jail”或看到工具/elevated 拒绝，并且想知道要修改的确切配置键时。"
status: active
---

OpenClaw 有三个相关（但不同）的控制项：

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 决定 **工具在哪里运行**（sandbox 后端 vs 主机）。
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 决定 **哪些工具可用/被允许**。
3. **Elevated** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一个 **仅 exec 的逃生口**，用于在你处于 sandbox 中时在 sandbox 外运行（默认是 `gateway`，或者当 exec 目标配置为 `node` 时是 `node`）。

## 快速调试

使用 inspector 查看 OpenClaw _实际_ 在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它会打印：

- 生效的 sandbox 模式/范围/工作区访问
- 当前会话是否处于 sandbox 中（main vs non-main）
- 生效的 sandbox 工具允许/拒绝情况（以及它来自 agent/global/default 的哪一层）
- elevated 门控以及修复所需的键路径

## Sandbox：工具在哪里运行

Sandbox 由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有内容都在主机上运行。
- `"non-main"`：只有 non-main 会话会被 sandbox 化（群组/频道中常见的“意外情况”）。
- `"all"`：所有内容都被 sandbox 化。

完整矩阵（范围、工作区挂载、镜像）请参见 [Sandboxing](/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` 会 _穿透_ sandbox 文件系统：你挂载的内容会以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果你省略模式，默认是可读写；源代码/密钥建议使用 `:ro`。
- `scope: "shared"` 会忽略每个 agent 的绑定挂载（只应用全局挂载）。
- OpenClaw 会两次验证绑定源：先在规范化后的源路径上验证，然后在通过最深的现有祖先解析之后再次验证。符号链接父目录逃逸不会绕过 blocked-path 或 allowed-root 检查。
- 即使叶子路径不存在，也会安全检查。如果 `/workspace/alias-out/new-file` 通过一个带符号链接的父目录解析到被阻止的路径或超出配置的允许根目录，绑定仍会被拒绝。
- 挂载 `/var/run/docker.sock` 实际上等于把主机控制权交给 sandbox；只有在有意这样做时才应这么操作。
- 工作区访问（`workspaceAccess: "ro"`/`"rw"`）与绑定模式是相互独立的。

## Tool policy：有哪些工具存在/可调用

有两层很重要：

- **Tool profile**：`tools.profile` 和 `agents.list[].tools.profile`（基础允许列表）
- **Provider tool profile**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/按 agent 的工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **Provider 工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **Sandbox 工具策略**（仅在 sandbox 中生效）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 总是优先生效。
- 如果 `allow` 非空，则其他一切都视为被阻止。
- Tool policy 是最终拦截：`/exec` 不能覆盖被拒绝的 `exec` 工具。
- Tool policy 只按名称筛选工具可用性；它不会检查 `exec` 内部的副作用。如果 `exec` 被允许，拒绝 `write`、`edit` 或 `apply_patch` 并不会让 shell 命令变成只读。
- `/exec` 只会为被授权的发送者更改会话默认值；它不会授予工具访问权限。
  Provider tool 键可以接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

### 工具组（简写）

工具策略（全局、agent、sandbox）支持 `group:*` 条目，它们会展开为多个工具：

```json5
{
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

可用的组：

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 可作为
  `exec` 的别名）
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
  对于只读 agent，除非 sandbox 文件系统策略或单独的主机边界强制实施只读限制，否则应同时拒绝 `group:runtime` 以及会修改文件系统的工具。
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`sessions_yield`、`subagents`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:web`：`web_search`、`x_search`、`web_fetch`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`heartbeat_respond`、`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:agents`：`agents_list`、`update_plan`
- `group:media`：`image`、`image_generate`、`music_generate`、`video_generate`、`tts`
- `group:openclaw`：所有内置 OpenClaw 工具（不包括 provider 插件）

## Elevated：仅 exec 的“在主机上运行”

Elevated **不会** 授予额外工具；它只影响 `exec`。

- 如果你处于 sandbox 中，`/elevated on`（或带 `elevated: true` 的 `exec`）会在 sandbox 外运行（但仍可能需要审批）。
- 使用 `/elevated full` 可跳过该会话的 exec 审批。
- 如果你已经在直接模式下运行，elevated 实际上不会产生作用（但仍受门控）。
- Elevated **不** 作用于技能范围，也 **不会** 覆盖工具的允许/拒绝。
- Elevated 不会从 `host=auto` 授予任意跨主机覆盖；它遵循正常的 exec 目标规则，并且仅在已配置/会话目标本来就是 `node` 时保留 `node`。
- `/exec` 与 elevated 是分开的。它只会为被授权的发送者调整每个会话的 exec 默认值。

门控：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.list[].tools.elevated.enabled`）
- 发送者允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.list[].tools.elevated.allowFrom.<provider>`）

参见 [Elevated Mode](/tools/elevated)。

## 常见的 “sandbox jail” 修复

### “Tool X blocked by sandbox tool policy”

修复键（任选其一）：

- 禁用 sandbox：`agents.defaults.sandbox.mode=off`（或按 agent 设置 `agents.list[].sandbox.mode=off`）
- 在 sandbox 内允许该工具：
  - 从 `tools.sandbox.tools.deny` 中移除它（或按 agent 设置 `agents.list[].tools.sandbox.tools.deny`）
  - 或将其添加到 `tools.sandbox.tools.allow`（或按 agent 设置 allow）

### “我以为这是 main，为什么它被 sandbox 化了？”

在 `"non-main"` 模式下，群组/频道键 _不是_ main。请使用 main 会话键（由 `sandbox explain` 显示）或将模式切换为 `"off"`。

## 相关内容

- [Sandboxing](/gateway/sandboxing) -- 完整的 sandbox 参考（模式、范围、后端、镜像）
- [Multi-Agent Sandbox & Tools](/tools/multi-agent-sandbox-tools) -- 按 agent 的覆盖与优先级
- [Elevated Mode](/tools/elevated)
