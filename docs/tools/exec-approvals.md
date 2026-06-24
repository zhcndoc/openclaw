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

有关 `deny`、`allowlist`、`ask`、`auto`、`full` 的模式优先概览、Codex Guardian 映射以及 ACPX harness 权限，请参见
[权限模式](/tools/permission-modes)。

<Note>
生效策略是 `tools.exec.*` 和 approvals 默认值中**更严格**的那个；如果省略了 approvals 字段，则使用 `tools.exec` 的值。Host exec 还会使用该机器上的本地 approvals 状态——execution host approvals 文件中的主机本地 `ask: "always"` 会持续提示，即使 session 或 config 默认值请求的是 `ask: "on-miss"`。
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

批准项保存在执行主机上的本地 JSON 文件中。当设置了
`OPENCLAW_STATE_DIR` 时，该文件会遵循该状态目录；
否则使用默认的 OpenClaw 状态目录：

```text
$OPENCLAW_STATE_DIR/exec-approvals.json
# otherwise
~/.openclaw/exec-approvals.json
```

默认的批准 socket 也遵循相同根目录：
`$OPENCLAW_STATE_DIR/exec-approvals.sock`，或者当该变量未设置时使用
`~/.openclaw/exec-approvals.sock`。

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

### `tools.exec.mode`

`tools.exec.mode` 是 host exec 首选的标准化策略面。可用值为：

- `deny` - 阻止 host exec。
- `allowlist` - 仅在不询问的情况下运行允许列表中的命令。
- `ask` - 使用允许列表策略，并在未命中时询问。
- `auto` - 使用允许列表策略，直接运行确定性匹配项，并将许可未命中通过 OpenClaw 的原生自动审查器处理，然后再回退到人工许可流程。
- `full` - 运行 host exec 而不弹出许可提示。

旧版 `tools.exec.security` / `tools.exec.ask` 仍然受支持，并且当它们设置在更窄的 session 或 agent 作用域时仍然优先生效。

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 阻止所有 host exec 请求。
  - `allowlist` - 仅允许在允许列表中的命令。
  - `full` - 允许一切（等同于 elevated）。

</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  为 host exec 配置的 ask 策略。控制来自 `tools.exec.ask` 和 host approvals defaults 的基础许可提示行为。每次调用的 `ask` 工具参数（见 [Exec tool](/tools/exec#parameters)）只能在此基础上进一步收紧，而当有效的 host ask 为 `off` 时，来自通道的模型调用会忽略它。

- `off` - 从不提示。
- `on-miss` - 仅当允许列表未命中时提示。
- `always` - 每次命令都提示。即使有效 ask 模式为 `always`，`allow-always` 的持久信任也**不会**抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法访问任何 UI 时的处理方式。如果省略此字段，OpenClaw 默认为 `deny`。

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

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  仅控制 exec 许可提示中的展示效果。启用后，OpenClaw 可能会附加由解析器派生的命令跨度，以便 Web 许可提示能够高亮命令标记。将其设为 `true` 可启用命令文本高亮。
</ParamField>

此设置不会更改 `security`、`ask`、允许列表匹配、严格内联求值行为、许可转发或命令执行。它可以全局设置为 `tools.exec.commandHighlighting`，也可以按 agent 设置为 `agents.list[].tools.exec.commandHighlighting`。

## YOLO 模式（无需许可）

如果你希望 host exec 在不弹出许可提示的情况下运行，你必须同时打开
**两层**策略：OpenClaw 配置中的请求 exec 策略
（`tools.exec.*`）**以及**执行主机许可文件中的主机本地批准策略。

OpenClaw 默认将省略的 `askFallback` 设为 `deny`。当无 UI 的许可提示应该
回退为允许时，请显式将主机的 `askFallback` 设为 `full`。

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

提供自身非交互式许可模式的 CLI 后端提供方
可以遵循此策略。当 OpenClaw 的有效 exec
策略为 YOLO 时，Claude CLI 会添加
`--permission-mode bypassPermissions`。对于由 OpenClaw 管理的 Claude 实时会话，OpenClaw 的
有效 exec 策略优先于 Claude 的原生许可模式：
YOLO 会将实时启动规范化为 `--permission-mode bypassPermissions`，而
受限的有效 exec 策略会将实时启动规范化为
`--permission-mode default`，即使原始 Claude 后端参数指定了其他
模式。

如果你想要更保守的设置，请将 OpenClaw exec 策略收紧回
`allowlist` / `on-miss` 或 `deny`。

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
- 本地 approvals 文件 defaults，包括 `askFallback: "full"`。

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

- `/exec security=full ask=off` 仅更改当前 session。
- `/elevated full` 是一个破窗快捷方式，仅当请求的策略和主机 approvals 文件都解析为 `security: "full"` 且 `ask: "off"` 时，才会跳过 exec 许可。更严格的主机文件，例如 `ask: "always"`，仍然会提示。

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

目标选择器会选择 **Gateway**（本地审批）或某个 **Node**。节点必须公开 `system.execApprovals.get/set`（macOS 应用或无头节点主机）。如果节点尚未公开 exec approvals，请直接编辑其本地审批文件。

CLI：`openclaw approvals` 支持 gateway 或 node 编辑 - 参见
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

- `Exec running` (仅当命令超过运行通知阈值时)。
- `Exec finished`。

这些消息会在节点报告事件后发布到代理的会话中。被拒绝的 exec 审批对主机命令本身是终态的：命令不会运行。对于带有来源会话的主代理异步审批，OpenClaw 会将拒绝作为内部后续消息发布回该会话，以便代理可以停止等待异步命令并避免缺失结果修复。如果没有会话或会话无法恢复，OpenClaw 仍可在存在安全路径时向操作员或直接聊天路由报告简洁的拒绝信息。子代理会话的拒绝不会回传到子代理中。Gateway 主机 exec 审批在命令结束时（以及可选地在运行超过阈值时）会发出相同的生命周期事件。受审批门控的 exec 会在这些消息中重用审批 id 作为 `runId`，以便轻松关联。

## 拒绝审批行为

当异步 exec 审批被拒绝时，OpenClaw 会将主机命令视为终态并以失败关闭。对于主代理会话，拒绝会作为内部会话后续消息送达，告知代理该异步命令未运行。这样可以在不暴露过时命令输出的情况下保持转录连续性。如果会话送达不可用，OpenClaw 会在存在安全路径时回退为简洁的操作员或直接聊天拒绝。

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
