---
title: 沙箱 vs 工具策略 vs 提权
summary: "为什么工具被阻止：沙箱运行时、工具允许/拒绝策略和提权执行权限"
read_when: "当你遇到“沙箱监狱”或看到工具/提权拒绝时，想知道具体的配置键以便修改。"
status: active
---

# 沙箱 vs 工具策略 vs 提权

OpenClaw 有三种相关（但不同）的控制：

1. **沙箱** (`agents.defaults.sandbox.*` / `agents.list[].sandbox.*`) 决定 **工具在哪里运行**（Docker 容器还是宿主机）。
2. **工具策略** (`tools.*`, `tools.sandbox.tools.*`, `agents.list[].tools.*`) 决定 **哪些工具可用/被允许**。
3. **提权** (`tools.elevated.*`, `agents.list[].tools.elevated.*`) 是一个 **仅限执行的逃生通道**，用于当被沙箱限制时在宿主机上运行。

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

- `docker.binds` 会 _打穿_ 沙箱文件系统：你挂载的内容能以你设置的权限模式（`:ro` 或 `:rw`）在容器内访问。
- 如果省略模式，默认是读写；为源码/密钥建议使用只读 `:ro`。
- `scope: "shared"` 会忽略每个 agent 的绑定（只应用全局绑定）。
- 挂载 `/var/run/docker.sock` 等同于将宿主机控制权交给沙箱；只应在有意图时使用。
- 工作区访问权限 (`workspaceAccess: "ro"`/`"rw"`) 与绑定模式权限无关。

## 工具策略：哪些工具存在/可调用

两层策略生效：

- **工具配置文件**：`tools.profile` 和 `agents.list[].tools.profile` （基础允许列表）
- **提供者工具配置文件**：`tools.byProvider[provider].profile` 和 `agents.list[].tools.byProvider[provider].profile`
- **全局/单 agent 工具策略**：`tools.allow`/`tools.deny` 和 `agents.list[].tools.allow`/`agents.list[].tools.deny`
- **提供者工具策略**：`tools.byProvider[provider].allow/deny` 和 `agents.list[].tools.byProvider[provider].allow/deny`
- **沙箱工具策略**（仅沙箱中生效）：`tools.sandbox.tools.allow`/`tools.sandbox.tools.deny` 和 `agents.list[].tools.sandbox.tools.*`

经验法则：

- `deny` 永远优先。
- 如果 `allow` 非空，其他未列出的工具被视为阻止。
- 工具策略是硬限制：被拒绝执行的工具，`/exec` 无法绕过。
- `/exec` 只调整授权调用者的会话默认；不会授予工具访问权限。
  
提供者工具键可以使用 `provider`（例如 `google-antigravity`）或者 `provider/model`（例如 `openai/gpt-5.2`）。

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

- `group:runtime`：`exec`、`bash`、`process`
- `group:fs`：`read`、`write`、`edit`、`apply_patch`
- `group:sessions`：`sessions_list`、`sessions_history`、`sessions_send`、`sessions_spawn`、`session_status`
- `group:memory`：`memory_search`、`memory_get`
- `group:ui`：`browser`、`canvas`
- `group:automation`：`cron`、`gateway`
- `group:messaging`：`message`
- `group:nodes`：`nodes`
- `group:openclaw`：所有内建 OpenClaw 工具（不包括提供者插件）

## 提权：仅限执行的"在宿主机上运行"

提权不授予额外工具，只影响 `exec` 操作。

- 如果你处于沙箱中，使用 `/elevated on`（或 `exec` 时带 `elevated: true`）会在宿主机运行（仍可能需审批）。
- 使用 `/elevated full` 可跳过当前会话的执行审批。
- 如果你已直接运行（未经过沙箱），提权实际上无效（仍受门控）。
- 提权 **不受技能范围限制**，且 **不覆盖工具允许/拒绝策略**。
- `/exec` 与提权是分开的；它只调整授权调用者的会话执行默认。

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

在 `"non-main"` 模式下，分组/频道键 _不是_ 主会话。使用主会话键（由 `sandbox explain` 显示）或将模式切换为 `"off"`。

## 参见

- [沙箱机制](/gateway/sandboxing) -- 完整的沙箱参考（模式、范围、后端、镜像）
- [多代理沙箱与工具](/tools/multi-agent-sandbox-tools) -- 单 agent 覆盖及优先级
- [提权模式](/tools/elevated)
