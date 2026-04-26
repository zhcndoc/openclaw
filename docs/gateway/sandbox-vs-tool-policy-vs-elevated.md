---
summary: "工具被阻止的原因：沙箱运行时、工具允许/拒绝策略，以及提权执行门控"
title: 沙箱 vs 工具策略 vs 提权
read_when: "当你遇到“沙箱监狱”或看到工具/提权拒绝时，并且想知道需要修改的确切配置键。"
status: active
---

OpenClaw 有三个相关但不同的控制项：

1. **沙箱** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 决定 **工具运行的位置**（沙箱后端 vs 宿主机）。
2. **工具策略** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 决定 **哪些工具可用/被允许**。
3. **提权** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一个 **仅限 exec 的逃生通道**，用于在你处于沙箱中时绕过沙箱在外部运行（默认是 `gateway`，或者当 exec 目标配置为 `node` 时使用 `node`）。

## 快速调试

使用 inspector 查看 OpenClaw 实际在做什么：

```bash
openclaw sandbox explain
openclaw sandbox explain --session agent:main:main
openclaw sandbox explain --agent work
openclaw sandbox explain --json
```

它会输出：

- 实际的沙箱模式/范围/工作区访问权限
- 会话当前是否处于沙箱中（主会话 vs 非主会话）
- 实际的沙箱工具允许/拒绝情况（以及其来源：agent/global/default）
- 提权门控以及修复所需的配置路径

## 沙箱：工具运行位置

沙箱由 `agents.defaults.sandbox.mode` 控制：

- `"off"`：所有工具在宿主机上运行。
- `"non-main"`：只有非主会话被沙箱限制（这是分组/频道的常见“惊喜”）。
- `"all"`：所有工具均运行在沙箱中。

完整矩阵（范围、工作区挂载、镜像）请参见 [沙箱机制](/gateway/sandboxing)。

### 绑定挂载（安全快速检查）

- `docker.binds` _穿透_ 沙箱文件系统：无论挂载什么，都会以设定的模式（`:ro` 或 `:rw`）在容器内可见。
- 如果省略模式，默认为读写；对于源码/密钥，建议使用 `:ro`。
- `scope: "shared"` 忽略每个 agent 的绑定（仅应用全局绑定）。
- OpenClaw 会验证绑定源两次：首先在规范化源路径上验证，然后在通过最深的现有祖先解析后再次验证。符号链接父级逃逸不会绕过被阻止路径或允许根目录的检查。
- 不存在的叶路径也会被安全检查。如果 `/workspace/alias-out/new-file` 通过符号链接父级解析到被阻止的路径或配置允许的根目录之外，绑定将被拒绝。
- 绑定 `/var/run/docker.sock` 实际上将宿主机控制权交给了沙箱；仅在有意图时这样做。
- 工作区访问权限（`workspaceAccess: "ro"`/`"rw"`）独立于绑定模式。

## 工具策略：哪些工具存在/可调用

两层策略生效：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile` （基础允许列表）
- **提供者工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/单 agent 工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供者工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅在沙箱中生效）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 始终优先。
- 如果 `allow` 非空，其他所有内容均被视为被阻止。
- 工具策略是硬性停止：`/exec` 无法覆盖被拒绝的 `exec` 工具。
- `/exec` 仅更改授权发送者的会话默认值；它不授予工具访问权限。
- 提供者工具键接受 `provider`（例如 `google-antigravity`）或 `provider/model`（例如 `openai/gpt-5.4`）。

### 工具分组（简写）

工具策略（全局、agent、沙箱）支持 `group:*` 条目，可展开为多个工具：

```json5
{
  // 允许运行时、文件系统、会话和内存工具分组
  tools: {
    sandbox: {
      tools: {
        allow: ["group:runtime", "group:fs", "group:sessions", "group:memory"],
      },
    },
  },
}
```

可用分组：

- `group:runtime`: `exec`, `process`, `code_execution` (`bash` 被接受为 `exec` 的别名)
- `group:fs`: `read`, `write`, `edit`, `apply_patch`
- `group:sessions`: `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `sessions_yield`, `subagents`, `session_status`
- `group:memory`: `memory_search`, `memory_get`
- `group:web`: `web_search`, `x_search`, `web_fetch`
- `group:ui`: `browser`, `canvas`
- `group:automation`: `cron`, `gateway`
- `group:messaging`: `message`
- `group:nodes`: `nodes`
- `group:agents`: `agents_list`
- `group:media`: `image`, `image_generate`, `video_generate`, `tts`
- `group:openclaw`: 所有内置 OpenClaw 工具（不包括提供者插件）

## 提权：仅限执行的"在宿主机上运行"

提权不授予额外工具，只影响 `exec` 操作。

- 如果你被沙箱限制，`/elevated on`（或带有 `elevated: true` 的 `exec`）将在沙箱外运行（可能仍需批准）。
- 使用 `/elevated full` 跳过会话的执行批准。
- 如果你已经直接运行，提权实际上是空操作（仍受门控限制）。
- 提权**不**限于技能范围，也**不**覆盖工具允许/拒绝策略。
- 提权不会授予来自 `host=auto` 的任意跨主机覆盖；它遵循正常的执行目标规则，仅当配置/会话目标已经是 `node` 时才保留 `node`。
- `/exec` 与提权分开。它仅调整授权发送者的每会话执行默认值。

门控机制：

- 启用：`tools.elevated.enabled`（也可针对单 agent 设定 `agents.list[].tools.elevated.enabled`）
- 发送者允许列表：`tools.elevated.allowFrom.<provider>`（同样可针对单 agent 设置 `agents.list[].tools.elevated.allowFrom.<provider>`）

详见 [提权模式](/tools/elevated)。

## 常见的"沙箱监狱"修复

### "工具 X 被沙箱工具策略阻止"

修复建议（任选其一）：

- 关闭沙箱：`agents.defaults.sandbox.mode=off`（或针对单 agent 的 `agents.list[].sandbox.mode=off`）
- 允许该工具在沙箱内使用：
  - 从 `tools.sandbox.tools.deny` 中移除（或单 agent 的 `agents.list[].tools.sandbox.tools.deny`）
  - 或添加到 `tools.sandbox.tools.allow`（或单 agent 的允许列表）

### "我以为这是主会话，为什么它被沙箱限制了？"

在 `"non-main"` 模式下，分组/频道键_不是_主会话。使用主会话键（由 `sandbox explain` 显示）或将模式切换为 `"off"`。

## 相关内容

- [沙箱机制](/gateway/sandboxing) -- 完整的沙箱参考（模式、范围、后端、镜像）
- [多代理沙箱与工具](/tools/multi-agent-sandbox-tools) -- 单 agent 覆盖及优先级
- [提权模式](/tools/elevated)
