---
summary: "工具为何被阻止：sandbox 运行时、工具允许/拒绝策略，以及 elevated 执行门控"
title: "Sandbox 与 tool policy 以及 elevated"
read_when: "当你遇到“sandbox jail”或看到工具/elevated 被拒绝，并且想知道要修改的确切配置键时。"
status: active
---

OpenClaw 有三个相关但不同的控制项：

1. **Sandbox** (`agents.defaults.sandbox.*` / `agents.entries.*.sandbox.*`) decides **where tools run** (sandbox backend vs host).
2. **Tool policy** (`tools.*`, `tools.sandbox.tools.*`, `agents.entries.*.tools.*`) decides **which tools are available/allowed**.
3. **Elevated** (`tools.elevated.*`, `agents.entries.*.tools.elevated.*`) is an **exec-only escape hatch** to run outside the sandbox when you are sandboxed (`gateway` by default, or `node` when the exec target is configured to `node`).

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

`agents.defaults.sandbox.workspaceAccess` 控制 sandbox 可见的内容：`"none"`、`"ro"` 或 `"rw"`。

有关完整矩阵（scope、workspace mounts、images），请参见 [Sandboxing](/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` 会 _穿透_ sandbox 文件系统：无论你挂载什么，都会以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认是读写；涉及源代码/密钥时建议使用 `:ro`。
- `scope: "shared"` 会忽略每个 agent 的绑定挂载（仅应用全局绑定）。
- OpenClaw 会对绑定源进行两次校验：第一次在规范化后的源路径上，第二次在通过最深的现有祖先解析后再校验。符号链接父级逃逸不会绕过 blocked-path 或 allowed-root 检查。
- 不存在的叶子路径也会被安全检查。如果 `/workspace/alias-out/new-file` 通过一个符号链接的父级解析到被阻止的路径或超出配置的允许根目录，绑定将被拒绝。
- 挂载 `/var/run/docker.sock` 本质上等于把主机控制权交给 sandbox；只有在明确有意这样做时才使用。
- workspace access（`workspaceAccess`）与绑定挂载模式彼此独立。

For a per-agent configuration with several host folders, access modes, and the external-source safety opt-in, see [Multiple folders for one agent](/gateway/sandboxing#multiple-folders-for-one-agent).

## Tool policy: which tools exist/are callable

有两层很重要：

- **Tool profile**: `tools.profile` and `agents.entries.*.tools.profile` (base allowlist)
- **Provider tool profile**: `tools.byProvider[provider].profile` and `agents.entries.*.tools.byProvider[provider].profile`
- **Global/per-agent tool policy**: `tools.allow`/`tools.deny` and `agents.entries.*.tools.allow`/`agents.entries.*.tools.deny`
- **Provider tool policy**: `tools.byProvider[provider].allow/deny` and `agents.entries.*.tools.byProvider[provider].allow/deny`
- **Sandbox tool policy** (only applies when sandboxed): `tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` and `agents.entries.*.tools.sandbox.tools.*`

经验法则：

- `deny` 永远优先。
- 如果 `allow` 非空，则其他一切都视为被阻止。
- 工具策略是硬性停止：`/exec` 不能覆盖被拒绝的 `exec` 工具。
- 工具策略按名称过滤工具可用性；它不会检查 `exec` 内部的副作用。如果 `exec` 被允许，拒绝 `write`、`edit` 或 `apply_patch` 并不会让 shell 命令变成只读。
- `/exec` 只会为已授权的发送者更改会话默认值；它不会授予工具访问权限。
- 提供方工具键既接受 `provider`（例如 `google-antigravity`），也接受 `provider/model`（例如 `openai/gpt-5.4`）。
- 当工具策略步骤移除工具，或 sandbox 工具策略阻止调用时，Gateway 日志会包含 `agents/tool-policy` 审计条目。使用 `openclaw logs` 查看规则标签、配置键和受影响的工具名称。

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

| Group              | Tools                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `group:runtime`    | `exec`, `process`, `code_execution` (`bash` is accepted as an alias for `exec`)                                                                                                                                                                        |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                                                                                                                                                                                                                 |
| `group:sessions`   | `sessions`, `sessions_list`, `sessions_history`, `sessions_search`, `conversations_list`, `conversations_send`, `conversations_turn`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`, `spawn_task`, `dismiss_task` |
| `group:memory`     | `memory_search`, `memory_get`                                                                                                                                                                                                                          |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                                                                                                                                                                                                  |
| `group:ui`         | `browser`, `screen`, `terminal`, `canvas`, `show_widget`                                                                                                                                                                                               |
| `group:automation` | `heartbeat_respond`, `cron`, `gateway`                                                                                                                                                                                                                 |
| `group:messaging`  | `message`                                                                                                                                                                                                                                              |
| `group:nodes`      | `nodes`, `computer`                                                                                                                                                                                                                                    |
| `group:agents`     | `agents_list`, `get_goal`, `create_goal`, `update_goal`, `update_plan`, `ask_user`, `skill_workshop`                                                                                                                                                   |
| `group:media`      | `image`, `image_generate`, `music_generate`, `video_generate`, `tts`                                                                                                                                                                                   |
| `group:openclaw`   | most built-in OpenClaw tools (excludes the `read`/`write`/`edit`/`apply_patch`/`exec`/`process` fs and runtime primitives, `canvas`, and provider plugins)                                                                                             |
| `group:plugins`    | all loaded plugin-owned tools, including configured MCP servers exposed through `bundle-mcp`                                                                                                                                                           |

对于只读 agent，除非 sandbox 文件系统策略或单独的主机边界强制执行只读约束，否则也要拒绝 `group:runtime` 以及所有会修改文件系统的工具。

对于被 sandbox 化的 MCP 服务器，sandbox 工具策略是第二道允许门。如果 `mcp.servers` 已配置，但在 sandbox 中只显示内置工具，请将 `bundle-mcp`、`group:plugins`，或者带服务器前缀的 MCP 工具名/glob（例如 `outlook__send_mail` 或 `outlook__*`）添加到 `tools.sandbox.tools.alsoAllow`，然后重启/重新加载 gateway 并重新捕获工具列表。服务器 glob 使用 provider-safe 的 MCP 服务器前缀：非 `[A-Za-z0-9_-]` 字符会变成 `-`，不以字母开头的名称会加上 `mcp-` 前缀，而较长或重复的前缀可能会被截断或加后缀。

`openclaw doctor` 目前会检查 `mcp.servers` 中 OpenClaw 管理的服务器是否符合这种结构。来自捆绑插件清单或 Claude `.mcp.json` 的 MCP 服务器使用相同的 sandbox 门控，但此诊断暂时不会枚举这些来源；如果它们的工具在 sandbox 会话中消失，请使用相同的 allowlist 条目。

## Elevated：仅 exec 的“在主机上运行”

Elevated **不会**授予额外工具；它只影响 `exec`。

- 如果你处于沙箱中，`/elevated on`（或带有 `elevated: true` 的 `exec`）会在沙箱外运行（但仍可能需要审批）。
- 使用 `/elevated full` 可跳过本次会话的 exec 审批。
- 如果你已经在直接环境中运行，elevated 实际上不会产生任何影响（但仍受门控）。
- Elevated **不**按 skill 作用域生效，且**不会**覆盖工具的允许/拒绝设置。
- Elevated 不会为 `host=auto` 提供任意跨主机覆盖；它遵循正常的 exec 目标规则，并且只有在已配置/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与 elevated 是分开的。它只会为已授权的发送者调整每会话的 exec 默认值。

门控：

- Enablement: `tools.elevated.enabled` (and optionally `agents.entries.*.tools.elevated.enabled`)
- Sender allowlists: `tools.elevated.allowFrom.<provider>` (and optionally `agents.entries.*.tools.elevated.allowFrom.<provider>`)

参见 [Elevated Mode](/tools/elevated)。

## Common “sandbox jail” fixes

### “Tool X blocked by sandbox tool policy”

Fix key (choose one):

- Disable sandbox: `agents.defaults.sandbox.mode=off` (or per-agent `agents.entries.*.sandbox.mode=off`)
- Allow the tool inside sandbox:
  - remove it from `tools.sandbox.tools.deny` (or per-agent `agents.entries.*.tools.sandbox.tools.deny`)
  - or add it to `tools.sandbox.tools.allow` (or per-agent allow)
- Check `openclaw logs` for the `agents/tool-policy` entry. It records the sandbox mode and whether the allow or deny rule blocked the tool.

### “I thought this was main, why was it sandboxed?”

In `"non-main"` mode, the group/channel key is _not_ main. Use the main session key (shown by `sandbox explain`) or switch the mode to `"off"`.

## 相关内容

- [沙箱化](/gateway/sandboxing) -- 完整的 sandbox 参考（模式、范围、后端、镜像）
- [多智能体沙箱与工具](/tools/multi-agent-sandbox-tools) -- 按 agent 的覆盖与优先级
- [提升模式](/tools/elevated)
