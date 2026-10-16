---
summary: "为什么工具被阻止：沙盒运行时、工具 allow/deny 策略和提升的执行门"
title: "Sandbox、工具策略与 elevated"
read_when: "您点击“沙盒监狱”或看到 tool/elevated 拒绝并希望更改确切的配置密钥。"
status: active
---

OpenClaw 有三个相关但不同的控制项：

1. **Sandbox**（`agents.defaults.sandbox.*`、`agents.entries.*.sandbox.*` 或所需的创建者角色策略）决定 **工具运行的位置**（沙箱后端与主机）。
2. **工具策略**（`tools.*`、`tools.sandbox.tools.*`、`agents.entries.*.tools.*`）决定**哪些工具是available/allowed**。
3. **高架** （`tools.elevated.*`， `agents.entries.*.tools.elevated.*`） is an **仅限执行的逃生舱口**来自普通沙箱（`gateway`默认情况下，或`node`当 exec 目标配置为`node`）。它无法绕过创建者角色所需的沙箱。

## <a id="quick-debug"></a> 快速调试

使用 inspector 查看 OpenClaw _实际_ 在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它会打印：

- 有效沙箱 mode/scope/workspace 接入
- 生效的 sandbox 模式／范围／工作区访问
- 有效的沙箱工具allow/deny（以及是否来自agent/global/default）
- elevated 门控以及修复所需的键路径。

## <a id="sandbox%3A-where-tools-run"></a><a id="sandbox-where-tools-run"></a> Sandbox：工具在哪里运行

Sandbox 由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：会话在主机上运行，​​除非其创建者的操作员角色需要沙箱。
- `"non-main"`：只有非主要会话是沙盒的（groups/channels 的常见“惊喜”）。
- `"all"`：所有内容都被 sandbox 化。

`agents.defaults.sandbox.workspaceAccess` 控制 sandbox 可见的内容：`"none"`、`"ro"` 或 `"rw"`。

具有 `sandbox: "required"` 的操作员角色会覆盖代理模式，无法通过提升执行或主机覆盖来转义，并且在无法配置其沙箱时会阻止执行。请参见 [ 命名操作员角色](/gateway/operator-scopes#named-operator-roles)。

有关完整矩阵（scope、workspace mounts、images），请参见 [Sandboxing](/gateway/sandboxing)。

### <a id="bind-mounts-(security-quick-check)"></a><a id="bind-mounts-security-quick-check"></a> 绑定挂载（安全快速检查）

- `docker.binds` 会 _穿透_ sandbox 文件系统：无论你挂载什么，都会以你设置的模式（`:ro` 或 `:rw`）在容器内可见。
- 省略模式则默认为可读写；更喜欢 `:ro` 而不是 source/secrets.
- `scope: "shared"` 会忽略每个 agent 的绑定挂载（仅应用全局绑定）。
- OpenClaw 会对绑定源进行两次校验：第一次在规范化后的源路径上，第二次在通过最深的现有祖先解析后再校验。符号链接父级逃逸不会绕过 blocked-path 或 allowed-root 检查。
- 不存在的叶子路径也会被安全检查。如果 `/workspace/alias-out/new-file` 通过一个符号链接的父级解析到被阻止的路径或超出配置的允许根目录，绑定将被拒绝。
- 挂载 `/var/run/docker.sock` 本质上等于把主机控制权交给 sandbox；只有在明确有意这样做时才使用。
- workspace access（`workspaceAccess`）与绑定挂载模式彼此独立。

有关单个 agent 使用多个主机文件夹、访问模式和外部源安全选择加入的逐 agent 配置，请参见 [单个 agent 使用多个文件夹](/gateway/sandboxing#multiple-folders-for-one-agent)。

## <a id="tool-policy%3A-which-tools-exist%2Fare-callable"></a><a id="tool-policy-which-tools-exist/are-callable"></a> 工具策略：哪些工具exist/are可调用

五层很重要：

- **工具配置**：`tools.profile` 和 `agents.entries.*.tools.profile`（基础允许列表）
- **提供商工具配置**：`tools.byProvider[provider].profile` 和 `agents.entries.*.tools.byProvider[provider].profile`
- **Global/per-agent 工具策略**：`tools.allow`/`tools.deny` 和 `agents.entries.*.tools.allow`/`agents.entries.*.tools.deny`
- **提供商工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.entries.*.tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅适用于沙箱环境）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.entries.*.tools.sandbox.tools.*`

经验法则：

- `deny` 始终优先。
- 如果 `allow` 非空，则其他所有内容都视为被阻止。
- 工具策略是硬性限制：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- 工具策略按名称过滤工具可用性；不会检查 `exec` 内部的副作用。如果允许 `exec`，拒绝 `write`、`edit` 或 `apply_patch` 并不会使 shell 命令变为只读。
- `/exec` 只会为经过授权的发送者更改会话默认值；不会授予工具访问权限。
- Provider 工具密钥接受 `provider` （e.g. `anthropic`） 或 `provider/model` （e.g. `openai/gpt-5.4`）。
- 当工具策略步骤移除工具，或沙箱工具策略阻止调用时，网关日志会包含 `agents/tool-policy` 审计条目。使用 `openclaw logs` 查看规则标签、配置键和受影响的工具名称。

### <a id="tool-groups-(shorthands)"></a><a id="tool-groups-shorthands"></a> 工具组（简写）

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

- `group:runtime`：`exec`、`process`、`code_execution`（`bash` 被接受作为 `exec` 的别名）
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions`, `sessions_list`, `sessions_history`, `sessions_search`, `conversations_list`, `conversations_send`, `conversations_turn`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`, `suggest_task`, `dismiss_task`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `screen`, `terminal`, `canvas`, `progress_card`, `show_widget`
- `group:automation`: `heartbeat_respond`, `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`, `computer`
- `group:agents`: `agents_list`, `get_goal`, `create_goal`, `update_goal`, `progress_card`, `ask_user`, `skill_workshop`
- `group:media`: `view_image`, `image_generate`, `music_generate`, `video_generate`, `tts`, `pdf`
- `group:openclaw`：大多数内置 OpenClaw 工具（不包括 `read`/`write`/`edit`/`apply_patch`/`exec`/`process` fs 和运行时基元、`canvas` 和提供程序插件）
- `group:plugins`：所有加载的插件拥有的工具，包括通过 `bundle-mcp` 公开的配置的 MCP 服务器

对于只读 agent，除非沙箱文件系统策略或单独的主机边界强制执行只读约束，否则也要拒绝 `group:runtime` 以及所有会修改文件系统的工具。

对于沙盒 MCP 服务器，沙盒工具策略是第二个允许门。如果配置了 `mcp.servers`，但沙盒只显示内置工具，请添加 `bundle-mcp`、`group:plugins` 或服务器前缀 MCP 工具 name/glob（例如 `outlook__send_mail` 或 `outlook__*`） `tools.sandbox.tools.alsoAllow`，然后restart/reload网关并重新捕获工具列表。服务器 glob 使用提供者安全的 MCP 服务器前缀：非 `[A-Za-z0-9_-]` 字符变为 `-`，不以字母开头的名称获得 `mcp-` 前缀，长或重复的前缀可能会被截断或添加后缀。

`openclaw doctor` 当前检查 `mcp.servers` 中 OpenClaw- 托管服务器的此形状。从捆绑插件清单加载的 MCP 服务器或 Claude `.mcp.json` 使用相同的沙箱门，但此诊断尚未枚举这些源；如果他们的工具在沙盒中消失，则使用相同的白名单条目。

## <a id="elevated%3A-exec-only-%22run-on-host%22"></a><a id="elevated-exec-only-run-on-host"></a> Elevated：仅 exec 的“在主机上运行”

Elevated **不会**授予额外工具；它只影响 `exec`。

- 如果您通常处于沙箱中，则 `/elevated on`（或带有 `elevated: true` 的 `exec`）在沙箱外部运行（批准可能仍然适用）。创建者角色所需的沙箱拒绝提升执行。
- 使用 `/elevated full` 可跳过本次会话的 exec 审批。
- 如果你已经在直接环境中运行，elevated 实际上不会产生任何影响（但仍受门控）。
- Elevated 是 **not** 技能范围，并且 **not** 覆盖工具 allow/deny.
- Elevated 不会授予来自 `host=auto` 的任意跨主机覆盖；它遵循正常的执行目标规则，并且仅当 configured/session 目标已经是 `node` 时才保留 `node`。
- `/exec` 与 elevated 是分开的。它只会为已授权的发送者调整每会话的 exec 默认值。

门控：

- 启用：`tools.elevated.enabled`（以及可选的 `agents.entries.*.tools.elevated.enabled`）
- 发送者允许列表：`tools.elevated.allowFrom.<provider>`（以及可选的 `agents.entries.*.tools.elevated.allowFrom.<provider>`）

请参阅 [E 提升的 Mode](/tools/elevated)。

## <a id="common-%22sandbox-jail%22-fixes"></a><a id="common-sandbox-jail-fixes"></a> 常见的“沙箱隔离”修复方法

### <a id="%22tool-x-blocked-by-sandbox-tool-policy%22"></a><a id="tool-x-blocked-by-sandbox-tool-policy"></a> “工具 X 被沙箱工具策略阻止”

修复方法（任选其一）：

- 禁用普通沙箱：`agents.defaults.sandbox.mode=off`（或每个代理`agents.entries.*.sandbox.mode=off`）；这不会覆盖创建者角色所需的沙箱。
- 允许在沙箱中使用该工具：
  - 从 `tools.sandbox.tools.deny` 中移除它（或从单个代理的 `agents.entries.*.tools.sandbox.tools.deny` 中移除）
  - 或将其添加到 `tools.sandbox.tools.allow` 中（或添加到单个代理的 allow 列表）
- 检查 `openclaw logs` 中的 `agents/tool-policy` 条目。它会记录沙箱模式，以及是 allow 规则还是 deny 规则阻止了该工具。

### <a id="%22i-thought-this-was-main%2C-why-is-it-sandboxed%3F%22"></a><a id="i-thought-this-was-main-why-is-it-sandboxed"></a> “我以为这是主会话，为什么它在沙箱中运行？”

In `"non-main"`模式，group/channel键不是主要的。使用主会话密钥（显示为`sandbox explain`） 或切换模式至`"off"`。

## <a id="related"></a> 相关内容

- [会话权限模式](/gateway/permission-modes) -- 会话根源和升级审核者
- [沙箱化](/gateway/sandboxing) -- 完整的 sandbox 参考（模式、范围、后端、镜像）
- [多代理沙箱和Tools](/tools/multi-agent-sandbox-tools)——每个代理的覆盖和优先级
- [高架 Mode](/tools/elevated)
- [OpenShell](/gateway/openshell) — 托管沙箱后端，在 SSH 上运行沙箱层
