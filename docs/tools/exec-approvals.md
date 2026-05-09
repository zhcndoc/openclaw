---
summary: "主机 exec 许可：策略开关、允许列表，以及 YOLO/严格 工作流"
read_when:
  - 配置 exec 许可或允许列表
  - 在 macOS 应用中实现 exec 许可 UX
  - 审查沙箱逃逸提示及其影响
title: "Exec 许可"
sidebarTitle: "Exec 许可"
---

Exec 许可是用于让一个沙箱化 agent 在真实主机（`gateway` 或 `node`）上运行命令的 **配套应用 / node 主机护栏**。这是一个安全联锁：只有当策略 + 允许列表 +（可选）用户许可都一致时，命令才会被允许。Exec 许可会在工具策略和 elevated gating **之上叠加**（除非 elevated 被设置为 `full`，这会跳过许可）。

<Note>
有效策略是 `tools.exec.*` 与 approvals defaults 中**更严格**的那个；如果省略了某个 approvals 字段，则使用 `tools.exec` 的值。Host exec 也使用该机器上的本地 approvals 状态——`~/.openclaw/exec-approvals.json` 中本地的 `ask: "always"` 即使 session 或 config 默认要求 `ask: "on-miss"`，也会持续弹出提示。
</Note>

## 检查生效策略

| 命令                                                          | 显示内容                                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略来源，以及最终生效结果。                                             |
| `openclaw exec-policy show`                                      | 本地机器的合并视图。                                                                   |
| `openclaw exec-policy set` / `preset`                            | 一步将本地请求策略与本地主机许可文件同步。                                               |

当本地作用域请求 `host=node` 时，`exec-policy show` 会在运行时将该作用域报告为由 node 管理，而不是假装本地许可文件就是权威来源。

如果配套应用 UI **不可用**，任何通常会触发提示的请求都会由**ask fallback** 处理（默认：`deny`）。

<Tip>
原生聊天许可客户端可以在待处理许可消息上预先注入按通道的便捷操作。例如，Matrix 会预置反应快捷方式（`✅` 允许一次，`❌` 拒绝，`♾️` 永久允许），同时仍会在消息中保留 `/approve ...` 命令作为备用。
</Tip>

## 适用范围

Exec 许可在执行主机本地强制执行：

- **Gateway 主机** → gateway 机器上的 `openclaw` 进程。
- **Node 主机** → node 运行器（macOS 配套应用或无头 node 主机）。

### 信任模型

- 经过 Gateway 认证的调用者对该 Gateway 来说是受信任的操作员。
- 已配对的 node 会把这种受信任操作员能力扩展到 node 主机上。
- Exec 许可可以降低误执行风险，但**不是**按用户划分的认证边界，也不是文件系统只读策略。
- 一旦获批，命令可根据所选主机或沙箱文件系统权限修改文件。
- 已批准的 node-host 运行会绑定规范执行上下文：规范 cwd、精确 argv、存在时的 env 绑定，以及在适用时固定的可执行文件路径。
- 对于 shell 脚本和直接解释器/运行时文件调用，OpenClaw 也会尝试绑定一个具体的本地文件操作数。如果在批准后、执行前该绑定文件发生了变化，运行会被拒绝，而不会执行漂移后的内容。
- 文件绑定刻意采用尽力而为的方式，**不是**对每一种解释器/运行时加载器路径的完整语义模型。如果批准模式无法准确识别出恰好一个可绑定的本地文件，它会拒绝生成基于许可的运行，而不是假装完全覆盖。

### macOS 拆分

- **node host service** 会通过本地 IPC 将 `system.run` 转发给 **macOS app**。
- **macOS app** 负责强制执行许可并在 UI 上下文中执行命令。

## 设置与存储

许可存放在执行主机上的一个本地 JSON 文件中：

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
  - `deny` - 阻止所有 host exec 请求。
  - `allowlist` - 仅允许在允许列表中的命令。
  - `full` - 允许一切（等同于 elevated）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  - `off` - 从不提示。
  - `on-miss` - 仅在允许列表不匹配时提示。
  - `always` - 每条命令都提示。即使有效 ask 模式为 `always`，`allow-always` 的持久化信任也**不会**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法到达任何 UI 时的处理方式。

- `deny` - 阻止。
- `allowlist` - 仅当允许列表匹配时才允许。
- `full` - 允许。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当为 `true` 时，OpenClaw 会将内联代码求值形式视为仅可通过许可的操作，即使解释器二进制本身已在允许列表中也是如此。用于防御那些无法干净映射到单一稳定文件操作数的解释器加载器。
</ParamField>

严格模式会捕获的示例：

- `python -c`
- `node -e`, `node --eval`, `node -p`
- `ruby -e`
- `perl -e`, `perl -E`
- `php -r`
- `lua -e`
- `osascript -e`

在严格模式下，这些命令仍然需要显式许可，且 `allow-always` 不会自动为它们持久化新的允许列表条目。

## YOLO 模式（无许可）

如果你希望 host exec 在没有批准提示的情况下运行，你必须同时打开
OpenClaw 配置中的**两层**策略：
请求的 exec policy（`tools.exec.*`）以及
`~/.openclaw/exec-approvals.json` 中的本地主机 approvals policy。

YOLO 是默认的主机行为，除非你显式收紧它：

| 层                   | YOLO 设置                    |
| -------------------- | ---------------------------- |
| `tools.exec.security` | `gateway`/`node` 上为 `full` |
| `tools.exec.ask`      | `off`                        |
| 主机 `askFallback`    | `full`                       |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 决定 exec **在哪里**运行：可用时在沙箱中，否则在 gateway 上。
- YOLO 决定 host exec **如何**被许可：`security=full` 加 `ask=off`。
- 在 YOLO 模式下，OpenClaw **不会**在已配置的 host exec 策略之上再添加单独的启发式命令混淆许可门或脚本预检拒绝层。
- `auto` 不会让 gateway 路由从沙箱会话中变成一个可免费覆盖的选项。允许从 `auto` 发起逐次调用的 `host=node` 请求；仅当没有沙箱运行时，`host=gateway` 才允许从 `auto` 发起。若要稳定地使用非 auto 默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

</Warning>

提供自己非交互许可模式的 CLI 后端也可以遵循此策略。Claude CLI 在 OpenClaw 请求的 exec policy 为 YOLO 时会添加 `--permission-mode bypassPermissions`。可通过 `agents.defaults.cliBackends.claude-cli.args` / `resumeArgs` 中显式传入 Claude 参数来覆盖该后端行为——例如 `--permission-mode default`、`acceptEdits` 或 `bypassPermissions`。

如果你想要更保守的配置，可以将任一层收紧回 `allowlist` / `on-miss` 或 `deny`。

### 持久化 gateway-host“永不提示”设置

<Steps>
  <Step title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="匹配主机许可文件">
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

它刻意仅限本地。若要远程更改 gateway-host 或 node-host 的许可，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

### Node host

对于 node host，请在该 node 上应用相同的许可文件：

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
**仅限本地的限制：**

- `openclaw exec-policy` 不会同步 node 许可。
- `openclaw exec-policy set --host node` 会被拒绝。
- Node exec 许可会在运行时从 node 获取，因此面向 node 的更新必须使用 `openclaw approvals --node ...`。

</Note>

### 仅会话快捷方式

- `/exec security=full ask=off` 只会更改当前会话。
- `/elevated full` 是一个紧急开关快捷方式，也会为该会话跳过 exec 许可。

如果主机许可文件比 config 更严格，那么更严格的主机策略仍然会生效。

## 允许列表（按 agent）

允许列表是**按 agent**划分的。如果存在多个 agent，请在 macOS app 中切换到你正在编辑的那个 agent。模式采用 glob 匹配。

模式可以是可解析的二进制路径 glob，或裸命令名 glob。裸名称只匹配通过 `PATH` 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但**不能**匹配 `./rg` 或 `/tmp/rg`。如果你想信任某个特定二进制位置，请使用路径 glob。

旧版 `agents.default` 条目会在加载时迁移到 `agents.main`。像 `echo ok && pwd` 这样的 shell 链仍然需要每个顶层段都满足允许列表规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制参数

当某个允许列表条目应当匹配某个二进制和特定参数形式时，添加 `argPattern`。OpenClaw 会针对解析后的命令参数评估该正则表达式，不包括可执行文件标记（`argv[0]`）。对于手工编写的条目，参数会用单个空格连接，因此在需要精确匹配时请为模式添加锚点。

```json
{
  "version": 1,
  "agents": {
    "main": {
      "allowlist": [
        {
          "pattern": "python3",
          "argPattern": "^safe\\.py$"
        }
      ]
    }
  }
}
```

该条目允许 `python3 safe.py`；`python3 other.py` 则是一次允许列表未命中。如果同一个二进制还存在仅按路径匹配的条目，则未匹配的参数仍可能回退到该仅路径条目。若目标是将该二进制限制为声明的参数，请省略仅路径条目。

由批准流程保存的条目可以使用内部分隔符格式来实现精确 argv 匹配。建议使用 UI 或批准流程来重新生成这些条目，而不是手工编辑编码后的值。如果 OpenClaw 无法解析某个命令段的 argv，则带有 `argPattern` 的条目不会匹配。

每个允许列表条目都支持：

| 字段              | 含义                                                       |
| ------------------ | ------------------------------------------------------------- |
| `pattern`          | 已解析二进制路径 glob 或裸命令名 glob           |
| `argPattern`       | 可选的 argv 正则；省略时为仅路径匹配            |
| `id`               | 用于 UI 身份识别的稳定 UUID                               |
| `source`           | 条目来源，例如 `allow-always`                          |
| `commandText`      | 批准流程创建该条目时捕获的命令文本 |
| `lastUsedAt`       | 最近使用时间戳                                           |
| `lastUsedCommand`  | 最近一次匹配的命令                                     |
| `lastResolvedPath` | 最近一次解析出的二进制路径                                     |

## 自动允许技能 CLI

当启用 **自动允许技能 CLI** 时，已知技能引用的可执行文件会在节点上（macOS 节点或无头节点主机）被视为已加入允许名单。这会通过 Gateway RPC 使用 `skills.bins` 获取技能 bin 列表。如果你想要严格的手动允许名单，请关闭此功能。

<Warning>
- 这是一种**隐式的便捷允许名单**，与手动路径允许名单条目分开。
- 它适用于 Gateway 和节点处于同一信任边界的受信任运维环境。
- 如果你需要严格、显式的信任，请保持 `autoAllowSkills: false`，并且仅使用手动路径允许名单条目。

</Warning>

## 安全 bin 与审批转发

对于安全 bin（仅 stdin 的快速路径）、解释器绑定详情，以及
如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为
原生审批客户端运行），请参见
[Exec approvals - advanced](/tools/exec-approvals-advanced)。

## 控制 UI 编辑

使用 **Control UI → Nodes → Exec approvals** 卡片来编辑默认值、按代理覆盖项以及允许名单。选择一个范围（Defaults 或某个代理），调整策略，添加/移除允许名单模式，然后点击 **Save**。UI 会显示每个模式最近使用的元数据，方便你保持列表整洁。

目标选择器可选择 **Gateway**（本地审批）或 **Node**。节点必须公开 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果某个节点尚未公开 exec approvals，请直接编辑其本地的 `~/.openclaw/exec-approvals.json`。

CLI: `openclaw approvals` 支持 gateway 或 node 编辑 - 参见
[Approvals CLI](/cli/approvals)。

## 审批流程

当需要提示时，gateway 会向操作员客户端广播
`exec.approval.requested`。Control UI 和 macOS 应用通过 `exec.approval.resolve` 处理它，然后 gateway 将已批准的请求转发到节点主机。

对于 `host=node`，审批请求会包含规范化的 `systemRunPlan`
负载。gateway 会使用该计划作为转发已批准的 `system.run`
请求时权威的命令/cwd/session 上下文。

这对异步审批延迟很重要：

- 节点执行路径会预先准备一个规范化计划。
- 审批记录会存储该计划及其绑定元数据。
- 一旦批准，最终转发的 `system.run` 调用会重用已存储的计划，而不是信任后续调用者的编辑。
- 如果调用者在审批请求创建后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，gateway 会将转发运行拒绝为审批不匹配。

## 系统事件

Exec 生命周期会作为系统消息显示：

- `Exec running`（仅当命令超过运行提示阈值时）。
- `Exec finished`。
- `Exec denied`。

这些消息会在节点报告事件后发布到代理的会话中。Gateway 主机 exec approvals 在命令完成时（以及可选地在运行时间超过阈值时）会发出相同的生命周期事件。受审批门控的 exec 会在这些消息中重用审批 id 作为 `runId`，便于关联。

## 拒绝审批行为

当异步 exec 审批被拒绝时，OpenClaw 会阻止代理在会话中复用同一命令任何更早一次运行的输出。拒绝原因会连同明确指引一起传递，说明没有可用的命令输出，这样可阻止代理声称有新的输出，或使用之前成功运行的过期结果重复被拒绝的命令。

## 影响

- **`full`** 很强大；在可能时优先使用允许名单。
- **`ask`** 让你保持在流程中，同时仍允许快速审批。
- 按代理的允许名单可防止一个代理的审批泄漏到其他代理中。
- 审批只适用于来自**授权发送者**的主机 exec 请求。未授权发送者不能发出 `/exec`。
- `/exec security=full` 是面向授权操作员的会话级便捷方式，并且按设计会跳过审批。若要强制阻止主机 exec，请将审批安全级别设为 `deny`，或通过工具策略拒绝 `exec` 工具。

## 相关内容

<CardGroup cols={2}>
  <Card title="Exec approvals - advanced" href="/tools/exec-approvals-advanced" icon="gear">
    安全 bin、解释器绑定，以及将审批转发到聊天。
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
