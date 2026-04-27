---
summary: "主机 exec 批准：策略开关、允许列表，以及 YOLO/严格工作流"
read_when:
  - 配置 exec 批准或允许列表
  - 在 macOS 应用中实现 exec 批准 UX
  - 审查沙箱逃逸提示及其影响
title: "Exec approvals"
sidebarTitle: "Exec approvals"
---

Exec 批准是让一个受沙箱限制的 agent 在真实主机（`gateway` 或 `node`）上运行命令的**配套应用 / node 主机护栏**。这是一道安全联锁：只有当策略 + 允许列表 +（可选）用户批准三者都同意时，命令才被允许。Exec 批准会**叠加在**工具策略和 elevated 门控之上（除非 elevated 被设置为 `full`，此时会跳过批准）。

<Note>
生效策略是 `tools.exec.*` 和批准默认值中**更严格**的那个；如果省略了某个批准字段，就使用 `tools.exec` 的值。Host exec 还会使用该机器上的本地批准状态——`~/.openclaw/exec-approvals.json` 中主机本地的 `ask: "always"` 会持续提示，即使会话或配置默认要求 `ask: "on-miss"`。
</Note>

## 检查生效策略

| Command                                                          | What it shows                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略来源，以及最终生效结果。                       |
| `openclaw exec-policy show`                                      | 本地机器的合并视图。                                                             |
| `openclaw exec-policy set` / `preset`                            | 将本地请求策略与本地主机批准文件一步同步。                            |

当本地作用域请求 `host=node` 时，`exec-policy show` 会在运行时将该作用域报告为由 node 管理，而不是假装本地批准文件才是唯一的事实来源。

如果配套应用 UI **不可用**，任何通常会弹窗提示的请求都会通过**ask 回退**来解决（默认：`deny`）。

<Tip>
原生聊天批准客户端可以在待批准消息上预置按通道区分的快捷操作。例如，Matrix 会预置反应快捷键（`✅` 允许一次，`❌` 拒绝，`♾️` 永久允许），同时仍在消息中保留 `/approve ...` 命令作为回退。
</Tip>

## 适用范围

Exec 批准在执行主机上本地强制执行：

- **Gateway 主机** → gateway 机器上的 `openclaw` 进程。
- **Node 主机** → node 运行器（macOS 配套应用或无头 node 主机）。

### 信任模型

- 经过 Gateway 认证的调用方对该 Gateway 而言是受信任的操作者。
- 配对的 nodes 将这种受信任的操作者能力扩展到 node 主机上。
- Exec 批准可降低误执行风险，但**不是**按用户划分的认证边界。
- 已批准的 node 主机运行会绑定规范化执行上下文：规范化 cwd、精确 argv、存在时的 env 绑定，以及适用时固定的可执行文件路径。
- 对于 shell 脚本和直接解释器/运行时文件调用，OpenClaw 也会尝试绑定一个具体的本地文件操作数。如果该绑定文件在批准后、执行前发生变化，则会拒绝运行，而不是执行已漂移的内容。
- 文件绑定刻意采用尽力而为的方式，**不是**对每条解释器/运行时加载路径的完整语义模型。如果批准模式无法精确识别出一个可绑定的具体本地文件，它会拒绝生成基于批准的运行，而不是假装已经完全覆盖。

### macOS 拆分

- **node 主机服务** 通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS 应用** 在 UI 上下文中强制执行批准并运行命令。

## 设置与存储

批准保存在执行主机上的本地 JSON 文件中：

```text
~/.openclaw/exec-approvals.json
```

示例 schema：

```json
{
  "version": 1,
  "socket": {
    "path": "~/.openclaw/exec-approvals.sock",
    "token": "base64url-token"
  },
  "defaults": {
    "security": "deny",
    "ask": "on-miss",
    "askFallback": "deny",
    "autoAllowSkills": false
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "askFallback": "deny",
      "autoAllowSkills": true,
      "allowlist": [
        {
          "id": "B0C8C0B3-2C2D-4F8A-9A3C-5A4B3C2D1E0F",
          "pattern": "~/Projects/**/bin/rg",
          "source": "allow-always",
          "commandText": "rg -n TODO",
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略开关

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` — 阻止所有 host exec 请求。
  - `allowlist` — 仅允许允许列表中的命令。
  - `full` — 允许所有内容（等同于 elevated）。
</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` — 从不提示。
  - `on-miss` — 仅当允许列表未匹配时才提示。
  - `always` — 每条命令都提示。即使有效 ask 模式为 `always`，`allow-always` 的持久信任也**不会**抑制提示。
</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法连接到任何 UI 时的处理结果。

  - `deny` — 阻止。
  - `allowlist` — 仅当允许列表匹配时才允许。
  - `full` — 允许。
</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当为 `true` 时，OpenClaw 会将内联代码求值形式视为仅可通过批准，即使解释器二进制本身已在允许列表中。用于防御深度防护，针对那些无法干净映射到单个稳定文件操作数的解释器加载器。
</ParamField>

严格模式会捕获的示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在严格模式下，这些命令仍然需要显式批准，并且 `allow-always` 不会自动为它们持久化新的允许列表条目。

## YOLO 模式（无批准）

如果你希望 host exec 在没有批准提示的情况下运行，必须同时打开**两层**策略：OpenClaw 配置中的请求 exec 策略（`tools.exec.*`）**以及** `~/.openclaw/exec-approvals.json` 中的主机本地批准策略。

YOLO 是默认的主机行为，除非你显式将其收紧：

| Layer                 | YOLO setting               |
| --------------------- | -------------------------- |
| `tools.exec.security` | `full` on `gateway`/`node` |
| `tools.exec.ask`      | `off`                      |
| Host `askFallback`    | `full`                     |

<Warning>
  **重要区别：**

  - `tools.exec.host=auto` 决定 exec **在哪里**运行：可用时在沙箱中运行，否则在 gateway 上运行。
  - YOLO 决定 host exec **如何**被批准：`security=full` 加上 `ask=off`。
  - 在 YOLO 模式下，OpenClaw **不会**在已配置的 host exec 策略之上，再额外添加一层独立的启发式命令混淆批准门或脚本预检拒绝层。
  - `auto` 不会让 gateway 路由在沙箱会话中变成一个可自由覆盖的选项。单次调用中的 `host=node` 请求在 `auto` 下是允许的；只有在没有激活沙箱运行时，`host=gateway` 才能在 `auto` 下被允许。若要稳定地使用非 auto 默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。
</Warning>

暴露自身非交互式权限模式的 CLI 后端可以遵循这项策略。当 OpenClaw 请求的 exec 策略为 YOLO 时，Claude CLI 会添加 `--permission-mode bypassPermissions`。你可以通过 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下的显式 Claude 参数覆盖该后端行为——例如 `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。

如果你想要更保守的配置，可以把任一层收紧回 `allowlist` / `on-miss` 或 `deny`。

### 持久化的 gateway 主机“永不提示”设置

<Steps>
  <Step title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="匹配主机批准文件">
    ```bash
    openclaw approvals set --stdin <<'EOF'
    {
      version: 1,
      defaults: {
        security: "full",
        ask: "off",
        askFallback: "full"
      }
    }
    EOF
    ```
  </Step>
</Steps>

### 本地快捷方式

```bash
openclaw exec-policy preset yolo
```

这个本地快捷方式会同时更新：

- 本地 `tools.exec.host/security/ask`。
- 本地 `~/.openclaw/exec-approvals.json` 默认值。

它有意仅限本地使用。若要远程更改 gateway 主机或 node 主机的批准，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

### Node 主机

对于 node 主机，请在该 node 上应用相同的批准文件：

```bash
openclaw approvals set --node <id|name|ip> --stdin <<'EOF'
{
  version: 1,
  defaults: {
    security: "full",
    ask: "off",
    askFallback: "full"
  }
}
EOF
```

<Note>
  **本地限制：**

  - `openclaw exec-policy` 不会同步 node 批准。
  - `openclaw exec-policy set --host node` 会被拒绝。
  - node exec 批准会在运行时从 node 获取，因此面向 node 的更新必须使用 `openclaw approvals --node ...`。
</Note>

### 仅会话快捷方式

- `/exec security=full ask=off` 只会更改当前会话。
- `/elevated full` 是一个紧急开关快捷方式，也会跳过该会话的 exec 批准。

如果主机批准文件比配置更严格，则更严格的主机策略仍然生效。

## 允许列表（按 agent）

允许列表是**按 agent**划分的。如果存在多个 agent，请在 macOS 应用中切换你正在编辑的 agent。模式是 glob 匹配。

模式可以是可解析的二进制路径 glob，或者裸命令名 glob。裸名称只匹配通过 `PATH` 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但**不能**匹配 `./rg` 或 `/tmp/rg`。如果你想信任某个特定二进制位置，请使用路径 glob。

旧版 `agents.default` 条目会在加载时迁移到 `agents.main`。像 `echo ok && pwd` 这样的 shell 链仍然需要每个顶层片段都满足允许列表规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每个允许列表条目都会跟踪：

| Field              | Meaning                          |
| ------------------ | -------------------------------- |
| `id`               | 用于 UI 标识的稳定 UUID |
| `lastUsedAt`       | 上次使用时间戳              |
| `lastUsedCommand`  | 匹配到的上一条命令        |
| `lastResolvedPath` | 上次解析出的二进制路径        |

## 自动允许技能 CLI

当启用 **自动允许技能 CLI** 时，已知技能引用的可执行文件会在节点（macOS 节点或无头节点主机）上被视为已列入允许名单。此功能通过 Gateway RPC 使用 `skills.bins` 拉取技能 bin 列表。如果你希望严格手动维护允许名单，请禁用此功能。

<Warning>
- 这是一种 **隐式的便捷允许名单**，与手动路径允许名单条目分开。
- 它适用于 Gateway 与节点处于同一信任边界的受信任运维环境。
- 如果你需要严格、显式的信任，请保持 `autoAllowSkills: false`，并且仅使用手动路径允许名单条目。
</Warning>

## 安全 bin 和审批转发

关于安全 bin（仅 stdin 的快速路径）、解释器绑定细节，以及如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为原生审批客户端运行），请参见
[Exec approvals — advanced](/tools/exec-approvals-advanced)。

## Control UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、按代理覆盖项和允许名单。选择一个作用域（Defaults 或某个代理），调整策略，添加/移除允许名单模式，然后点击 **Save**。UI 会显示每个模式最后使用的元数据，方便你保持列表整洁。

目标选择器可选择 **Gateway**（本地审批）或 **Node**。节点必须公开 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果某个节点尚未公开 exec approvals，请直接编辑其本地的 `~/.openclaw/exec-approvals.json`。

CLI：`openclaw approvals` 支持 gateway 或 node 编辑 —— 参见
[Approvals CLI](/cli/approvals)。

## 审批流程

当需要提示时，gateway 会向操作员客户端广播
`exec.approval.requested`。Control UI 和 macOS
应用通过 `exec.approval.resolve` 处理它，然后 gateway 将已批准的请求转发到节点主机。

对于 `host=node`，审批请求会包含规范化的 `systemRunPlan`
负载。gateway 会将该计划作为转发已批准
`system.run` 请求时的权威命令/cwd/session 上下文。

这对异步审批延迟很重要：

- 节点 exec 路径会预先准备一份规范化计划。
- 审批记录会存储该计划及其绑定元数据。
- 一旦批准，最终转发的 `system.run` 调用会复用已存储的计划，而不是信任后续调用方的编辑。
- 如果调用方在审批请求创建后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，gateway 会将转发运行拒绝为审批不匹配。

## 系统事件

Exec 生命周期会以系统消息的形式展示：

- `Exec running`（仅当命令超过运行提示阈值时）。
- `Exec finished`.
- `Exec denied`.

这些消息会在节点报告事件后发布到代理的会话中。Gateway 主机上的 exec approvals 在命令结束时（以及可选地在运行时间超过阈值时）也会发出相同的生命周期事件。受审批约束的 exec 会在这些消息中复用审批 id 作为 `runId`，以便于关联。

## 拒绝审批行为

当异步 exec 审批被拒绝时，OpenClaw 会阻止代理在会话中重用同一命令任何较早运行的输出。拒绝原因会附带明确说明：没有可用的命令输出，这会阻止代理声称存在新输出，或使用先前成功运行中的过期结果重复已被拒绝的命令。

## 影响

- **`full`** 很强大；在可能的情况下优先使用允许名单。
- **`ask`** 让你保持在流程中，同时仍允许快速审批。
- 按代理的允许名单可以防止一个代理的审批泄露到其他代理中。
- 审批仅适用于来自 **授权发送方** 的主机 exec 请求。未授权发送方不能发出 `/exec`。
- `/exec security=full` 是面向授权操作员的会话级便捷方式，并且按设计会跳过审批。若要硬性阻止主机 exec，请将 approvals security 设置为 `deny`，或通过工具策略拒绝 `exec` 工具。

## 相关内容

<CardGroup cols={2}>
  <Card title="Exec approvals — advanced" href="/tools/exec-approvals-advanced" icon="gear">
    安全 bin、解释器绑定，以及向聊天转发审批。
  </Card>
  <Card title="Exec tool" href="/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="Elevated mode" href="/tools/elevated" icon="shield-exclamation">
    也会跳过审批的紧急突破路径。
  </Card>
  <Card title="Sandboxing" href="/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="Security" href="/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="Sandbox vs tool policy vs elevated" href="/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用每种控制。
  </Card>
  <Card title="Skills" href="/tools/skills" icon="sparkles">
    基于技能的自动允许行为。
  </Card>
</CardGroup>
