---
summary: "执行审批、允许列表和沙箱逃逸提示"
read_when:
  - 配置执行审批或允许列表
  - 在 macOS 应用中实现执行审批 UX
  - 审查沙箱逃逸提示及其影响
title: "执行审批"
---

执行审批是**伴生应用 / 节点主机护栏**，用于让一个被沙箱化的代理在真实主机（`gateway` 或 `node`）上运行命令。这是一个安全联锁：只有当策略 + 允许列表 +（可选）用户审批都一致时，命令才会被允许。执行审批是在工具策略和提升式门控之上再叠加一层**保护**（除非 elevated 设置为 `full`，此时会跳过审批）。

<Note>
生效策略取 `tools.exec.*` 与审批默认值中的**更严格者**；如果某个审批字段被省略，则使用 `tools.exec` 的值。主机执行还会使用该机器上的本地审批状态——`~/.openclaw/exec-approvals.json` 中主机本地的 `ask: "always"` 即使会话或配置默认值要求 `ask: "on-miss"`，也仍会持续提示。
</Note>

## 检查生效策略

- `openclaw approvals get`, `... --gateway`, `... --node <id|name|ip>` — 显示请求的策略、主机策略来源以及生效结果。
- `openclaw exec-policy show` — 本地机器的合并视图。
- `openclaw exec-policy set|preset` — 一步将本地请求策略与本地主机审批文件同步。

当本地作用域请求 `host=node` 时，`exec-policy show` 会在运行时将该作用域报告为由节点托管，而不是假装本地审批文件才是真正的权威来源。

如果伴生应用 UI **不可用**，任何通常会触发提示的请求都会由**ask 回退**来解决（默认：拒绝）。

<Tip>
原生聊天审批客户端可以在待审批消息上为通道注入特定快捷操作。例如，Matrix 会注入反应快捷方式（`✅` 允许一次、`❌` 拒绝、`♾️` 永久允许），同时仍保留消息中的 `/approve ...` 命令作为回退。
</Tip>

## 适用范围

执行审批在执行主机本地强制执行：

- **gateway 主机** → 网关机器上的 `openclaw` 进程
- **node 主机** → 节点运行器（macOS 伴生应用或无头节点主机）

- 通过网关认证的调用者是该网关的受信操作者。  
- 配对节点将该受信操作者的能力扩展到节点主机。  
- 执行审批减少了意外执行的风险，但并非基于单用户认证边界的控制。  
- 经审批的节点主机运行绑定标准执行上下文：标准的当前工作目录（cwd）、精确的 argv、env 绑定（如有）以及固定的可执行文件路径（适用时）。  
- 对于 shell 脚本和直接调用解释器/运行时文件的情况，OpenClaw 还尝试绑定一个具体的本地文件操作数。如果该绑定文件在审批后、执行前发生变化，则拒绝运行，而非执行发生偏移的内容。  
- 这种文件绑定是出于最大努力的考虑，而非每个解释器/运行时加载路径的完整语义模型。如果审批模式无法准确识别绑定一个具体的本地文件，则拒绝发放基于审批的运行，而非假装实现了完整覆盖。  

macOS 拆分：

- **节点主机服务** 通过本地 IPC 转发 `system.run` 到**macOS 应用**。
- **macOS 应用** 执行审批并在 UI 上下文中执行命令。

## 设置和存储

审批信息存储在执行主机本地的 JSON 文件中：
`~/.openclaw/exec-approvals.json`

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
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 无审批 "YOLO" 模式

如果希望主机执行在没有审批提示的情况下运行，必须打开**两个**策略层：

- OpenClaw 配置中的请求执行策略（`tools.exec.*`）
- `~/.openclaw/exec-approvals.json` 中的主机本地审批策略

除非明确收紧，否则这现在是默认主机行为：

- `tools.exec.security`: `gateway`/`node` 上为 `full`
- `tools.exec.ask`: `off`
- 主机 `askFallback`: `full`

重要区别：

- `tools.exec.host=auto` 选择执行运行位置：可用时在沙箱中，否则在网关上。
- YOLO 选择主机执行如何被审批：`security=full` 加上 `ask=off`。
- 暴露自身非交互权限模式的 CLI 后端可以遵循此策略。
  当 OpenClaw 请求的执行策略为 YOLO 时，Claude CLI 会添加 `--permission-mode bypassPermissions`。可通过在 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 下使用显式 Claude 参数覆盖该后端行为，例如
  `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。
- 在 YOLO 模式下，OpenClaw 不会在已配置的主机执行策略之上再额外添加一层启发式的命令混淆审批门或脚本预检拒绝层。
- `auto` 不会让网关路由成为沙箱会话中的自由覆盖。每次调用请求 `host=node` 都允许从 `auto` 发起，而只有在没有活跃沙箱运行时时，`host=gateway` 才允许从 `auto` 发起。如果你想要稳定的非 auto 默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

如果希望更保守的设置，请将任一策略层收紧回 `allowlist`/`on-miss` 或 `deny`。

持久化网关主机"永不提示"设置：

```bash
openclaw config set tools.exec.host gateway
openclaw config set tools.exec.security full
openclaw config set tools.exec.ask off
openclaw gateway restart
```

然后设置主机审批文件以匹配：

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

当前机器上相同网关主机策略的本地快捷方式：

```bash
openclaw exec-policy preset yolo
```

该本地快捷方式会同时更新：

- 本地 `tools.exec.host/security/ask`
- 本地 `~/.openclaw/exec-approvals.json` 默认值

它故意设计为仅限本地。如果您需要远程更改网关主机或节点主机审批，请继续使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

对于节点主机，请在该节点上应用相同的审批文件：

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

重要的仅限本地限制：

- `openclaw exec-policy` 不同步节点审批
- `openclaw exec-policy set --host node` 被拒绝
- 节点执行审批在运行时从节点获取，因此针对节点的更新必须使用 `openclaw approvals --node ...`

仅限会话的快捷方式：

- `/exec security=full ask=off` 仅更改当前会话。
- `/elevated full` 是一个应急快捷方式，也会跳过该会话的执行审批。

如果主机审批文件比配置更严格，更严格的主机策略仍然胜出。

## 策略旋钮

### 安全性（`exec.security`）

- **deny**：阻止所有主机执行请求。
- **allowlist**：仅允许允许列表中的命令。
- **full**：允许所有命令（等同于权限提升模式）。

### 提示（`exec.ask`）

- **off**：永不提示。
- **on-miss**：仅当允许列表不匹配时提示。
- **always**：每个命令都提示。
- `allow-always` 持久信任在有效询问模式为 `always` 时不会抑制提示。

### 提示回退（`askFallback`）

当需要提示但 UI 不可达时，回退决策：

- **deny**：阻止。
- **allowlist**：仅在允许列表匹配时允许。
- **full**：允许。

### 内联解释器评估强化（`tools.exec.strictInlineEval`）

当 `tools.exec.strictInlineEval=true` 时，即使解释器二进制文件本身已在允许列表中，OpenClaw 也将内联代码评估形式视为仅需审批。

示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

这是针对无法清晰映射到单一稳定文件操作数的解释器加载器的纵深防御。在严格模式下：

- 这些命令仍然需要显式审批；
- `allow-always` 不会自动为它们持久化新的允许列表条目。

## 允许列表（按代理）

允许列表是**按代理**的。如果存在多个代理，请在 macOS 应用中切换要编辑的代理。模式是**不区分大小写的 glob 匹配**。
模式应解析为**二进制路径**（仅基名条目将被忽略）。
遗留的 `agents.default` 条目在加载时迁移到 `agents.main`。
诸如 `echo ok && pwd` 的 shell 链式连接仍需要每个顶级段满足允许列表规则。

示例：

- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

每条允许列表记录包含：

- **id**：用于 UI 身份识别的稳定 UUID（可选）
- **上次使用时间** 时间戳
- **上次使用的命令**
- **上次解析的路径**

## 自动允许技能 CLI

启用**自动允许技能 CLI**后，已知技能引用的可执行文件将被视为节点上的允许列表命令（macOS 节点或无头节点主机）。该功能通过 Gateway RPC 的 `skills.bins` 获取技能二进制列表。如果需要严格的手动允许列表，请禁用此选项。

重要信任说明：

- 该功能是一种**隐式便捷的允许列表**，与手动路径允许列表条目分开。
- 适用于 Gateway 和节点位于相同信任边界的受信操作环境。
- 如果需要严格的显式信任，保持 `autoAllowSkills: false`，只使用手动路径允许列表。

## 安全二进制文件和审批转发

对于安全二进制文件（仅 stdin 的快速路径）、解释器绑定细节，以及如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为原生审批客户端运行），请参见 [执行审批 — 高级](/tools/exec-approvals-advanced)。

<!-- moved to /tools/exec-approvals-advanced -->

## 控制 UI 编辑

通过 **控制 UI → 节点 → 执行审批** 面板编辑默认值、按代理覆盖和允许列表。选择作用域（默认或某代理），调整策略，添加/删除允许列表模式，点击**保存**。UI 会显示每个模式的**上次使用**元数据，方便列表整理。

目标选择器可选 **Gateway**（本地审批）或某 **节点**。节点必须声明支持 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点未支持审批，可以直接编辑其本地 `~/.openclaw/exec-approvals.json` 文件。

CLI：`openclaw approvals` 支持对网关或节点的编辑（详见 [审批 CLI](/cli/approvals)）。

## 审批流程

当需要提示时，网关向操作客户端广播 `exec.approval.requested`。控制 UI 与 macOS 应用通过 `exec.approval.resolve` 解决请求，随后网关将获批请求转发至节点主机。

对于 `host=node`，审批请求包含规范的 `systemRunPlan` 负载。网关使用该计划作为转发获批 `system.run` 请求的权威命令/工作目录/会话上下文。

这对异步审批延迟很重要：

- 节点执行路径会预先准备一个规范计划
- 审批记录存储该计划及其绑定元数据
- 一旦批准，最终转发的 `system.run` 调用会重用存储的计划，而不是信任后续调用者的编辑
- 如果调用者在创建审批请求后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关会因审批不匹配而拒绝转发的运行

## 系统事件

执行生命周期以系统消息形式展现：

- `执行中`（仅当命令运行时间超过阈值时）
- `执行完成`
- `执行被拒绝`

这些消息在节点报告事件后，发布到代理的会话中。网关主机执行审批在命令结束时（和可选的运行超过阈值时）发出相同生命周期事件。

## 拒绝审批行为

当异步执行审批被拒绝时，OpenClaw 会防止代理重用会话中同一命令任何早期运行的输出。拒绝原因会附带明确指导，说明没有命令输出可用，从而阻止代理声称有新输出或使用先前成功运行的过时结果重复被拒绝的命令。

## 影响及建议

- **full** 很强大；在可能时优先使用允许列表。
- **ask** 会让你持续知情，同时仍允许快速审批。
- 按代理的允许列表可防止一个代理的审批泄漏到其他代理中。
- 审批只适用于来自**已授权发送者**的主机执行请求。未授权发送者不能发起 `/exec`。
- `/exec security=full` 是授权操作者在会话级别的便捷方式，并且按设计会跳过审批。若要强制阻止主机执行，请将审批安全性设为 `deny`，或通过工具策略拒绝 `exec` 工具。

## 相关内容

<CardGroup cols={2}>
  <Card title="执行审批 — 高级" href="/tools/exec-approvals-advanced" icon="gear">
    安全二进制文件、解释器绑定以及审批转发到聊天。
  </Card>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="提升模式" href="/tools/elevated" icon="shield-exclamation">
    也会跳过审批的应急路径。
  </Card>
  <Card title="沙箱化" href="/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="安全性" href="/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="沙箱 vs 工具策略 vs 提升模式" href="/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用各个控制项。
  </Card>
  <Card title="技能" href="/tools/skills" icon="sparkles">
    基于技能的自动允许行为。
  </Card>
</CardGroup>
