---
summary: "主机 exec 审批：策略开关、允许列表，以及 YOLO/strict 工作流"
read_when:
  - 配置 exec 审批或允许列表
  - 在 macOS 应用中实现 exec 审批 UX
  - 审阅沙箱逃逸提示及其影响
title: "Exec 审批"
sidebarTitle: "Exec 审批"
---

Exec 审批是用于让一个沙箱化代理在真实主机（`gateway` 或 `node`）上运行命令的**伴随应用 / node 主机护栏**。只有当策略 + 允许列表 +（可选）的用户审批全部一致时，命令才会运行。审批是在工具策略和 elevated gating 之上的**叠加层**（elevated `full` 会跳过它们）。

关于 `deny`、`allowlist`、`ask`、`auto`、`full` 的 mode-first 概览、Codex Guardian 映射以及 ACPX harness 权限，请参见
[权限模式](/tools/permission-modes)。

<Note>
生效策略取 `tools.exec.*` 和审批默认值中**更严格**的那个：审批只能收紧由配置派生的 security/ask，不能放宽它们。如果省略某个审批字段，则使用 `tools.exec` 的值。Host exec 还会使用该机器上的本地审批状态——执行主机审批文件中的 host-local `ask: "always"` 会持续提示，即使会话或配置默认值请求的是 `ask: "on-miss"`。
</Note>

## 适用范围

执行审批在执行主机本地强制执行：

- **Gateway 主机** -> 网关机器上的 `openclaw` 进程。
- **Node 主机** -> 节点运行器（macOS 配套应用或无头 node 主机）。

### 信任模型

- 已通过 Gateway 身份验证的调用方被视为该 Gateway 的受信任操作员。
- 配对节点将该受信任的操作员能力扩展到节点主机上。
- 审批可降低意外执行风险，但**不是**按用户划分的身份验证边界，也不是文件系统只读策略。
- 一旦获得批准，命令可根据所选主机或沙箱文件系统权限修改文件。
- 已批准的节点主机运行会绑定规范化的执行上下文：cwd、精确的 argv、存在时的 env 绑定，以及适用时固定的可执行文件路径。
- 对于 shell 脚本和直接解释器/运行时文件调用，OpenClaw 也会尝试绑定一个具体的本地文件操作数。如果该文件在批准后、执行前发生变化，则运行将被拒绝，而不会执行已漂移的内容。
- 文件绑定是尽力而为的，并不能完整覆盖所有解释器/运行时加载路径。如果无法准确识别出一个具体的本地文件，OpenClaw 会拒绝生成基于审批的运行，而不是假装已完全覆盖。

### macOS 分流

- **node 主机服务** 通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS 应用** 强制执行审批，并在 UI 上下文中执行命令。

## 检查生效策略

| 命令                                                          | 显示内容                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略来源以及最终生效结果。                       |
| `openclaw exec-policy show`                                      | 本地机器的合并视图。                                                             |
| `openclaw exec-policy set` / `preset`                            | 将本地请求的策略与本地主机审批文件一步同步。 |

<Note>
每个会话的 `/exec` 覆盖项不包含在内。请在相关会话中运行 `/exec` 以检查其当前默认值。参见 [session overrides](/tools/exec#session-overrides-exec)。
</Note>

完整的 CLI 参考（标志、JSON 输出、allowlist 添加/移除）：[Approvals CLI](/cli/approvals)。

当本地范围请求 `host=node` 时，`exec-policy show` 会在运行时将
该范围报告为由节点管理，而不是将本地审批
文件视为事实来源。

如果配套应用 UI **不可用**，任何原本会触发提示的请求都会通过
**ask 回退** 处理（默认：`deny`）。

<Tip>
原生聊天审批客户端可以在待审批消息上为特定频道预设可用操作。Matrix 预设了反应快捷方式（`✅` 仅允许一次，
`♾️` 始终允许，
`❌` 拒绝），同时在消息中保留 `/approve ...` 作为回退。
</Tip>

## 设置与存储

审批保存在执行主机上的本地 JSON 文件中。当
`OPENCLAW_STATE_DIR` 被设置时，该文件会使用该状态目录；
否则使用默认的 OpenClaw 状态目录：

```text
$OPENCLAW_STATE_DIR/exec-approvals.json
# 否则
~/.openclaw/exec-approvals.json
```

默认审批 socket 也遵循相同的根目录：
`$OPENCLAW_STATE_DIR/exec-approvals.sock`，或者当变量未设置时使用
`~/.openclaw/exec-approvals.sock`。

2026.6.6 之前的版本始终将文件保存在 `~/.openclaw` 中。如果
`OPENCLAW_STATE_DIR` 指向其他位置，而审批文件仍存在于默认目录中，请直接运行一次
`openclaw doctor --fix`，将其导入状态目录（原始文件会以
`.migrated` 后缀归档）。交互式 doctor 也可以预览并确认导入。自动更新和 Gateway watch 修复运行从不跨状态目录导入：临时或暂存状态目录绝不应捕获默认安装的审批。相同的边界也适用于将旧的
`plugin-binding-approvals.json` 导入共享的 SQLite 状态。

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
          "lastUsedAt": 1737150000000,
          "lastUsedCommand": "rg -n TODO",
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        }
      ]
    }
  }
}
```

## 策略旋钮

### `tools.exec.mode`

`tools.exec.mode` 是主机执行的首选规范化策略表面：

| 值         | 行为                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deny`     | 阻止主机执行。                                                                                                                                                         |
| `allowlist` | 仅运行允许列表中的命令，无需询问。                                                                                                                                    |
| `ask`      | 使用允许列表策略，并在未命中时询问。                                                                                                                                     |
| `auto`     | 使用允许列表策略，直接运行确定性匹配项，并在回退到人工审批流程之前，先通过 OpenClaw 的原生自动审核器处理审批未命中的项。 |
| `full`     | 运行主机执行时不显示审批提示。                                                                                                                                          |

旧版的 `tools.exec.security` / `tools.exec.ask` 仍然受支持，并且在该作用域下
`mode` 未设置的任何地方仍然适用。

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 阻止所有主机执行请求。
  - `allowlist` - 仅允许允许列表中的命令。
  - `full` - 允许所有内容（等同于提权）。
</ParamField>

对于 gateway/node 主机，默认值为 `full`；对于 `sandbox` 主机，默认值改为
`deny`。

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  为主机执行配置的询问策略。控制 `tools.exec.ask` 和主机审批默认值的基础审批
  提示行为。默认值为 `off`。每次调用的 `ask` 工具参数（见
  [Exec tool](/tools/exec#parameters)）只能在此基础上进一步收紧，而
  当生效的主机 ask 为 `off` 时，来自通道的模型调用会忽略它。

- `off` - 从不提示。
- `on-miss` - 仅当允许列表不匹配时提示。
- `always` - 每条命令都提示。`allow-always` 持久信任在生效的 ask 模式为 `always` 时不会抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法访问任何 UI（或
  提示超时）时的处理方式。未指定时默认值为 `deny`。

- `deny` - 阻止。
- `allowlist` - 仅当允许列表匹配时允许。
- `full` - 允许。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean">
  当为 `true` 时，即使解释器二进制本身在允许列表中，也会将内联代码求值形式视为仅可审批。为那些无法整齐映射到单一稳定文件操作数的解释器加载器提供深度防御。
</ParamField>

严格模式会捕获的示例：`python -c`、`node -e`/`--eval`/`-p`，
`ruby -e`、`perl -e`/`-E`、`php -r`、`lua -e`、`osascript -e`（以及 `awk`、
`sed`、`make`、`find -exec` 和 `xargs` 的内联形式）。

在严格模式下，这些命令需要审阅者或显式批准。启用
`tools.exec.mode: "auto"` 时，如果命令具有可强制执行的计划，审阅者可以授予一次低风险执行；否则 OpenClaw 会询问人工。
进入审阅者回退流程的 `Codex app-server` 命令批准会询问人工，因为它们的批准请求不会暴露可强制执行的已解析可执行文件。
`allow-always` 不会为内联求值命令持久保存新的允许列表条目。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  仅用于展示：启用后，OpenClaw 可能会附加由解析器派生的
  命令跨度，以便 Web 审批提示高亮显示命令标记。不会更改
  `security`、`ask`、允许列表匹配、严格内联求值
  行为、审批转发或命令执行。
</ParamField>

可在全局 `tools.exec.commandHighlighting` 下设置，或在每个代理的
`agents.list[].tools.exec.commandHighlighting` 下设置。

## YOLO 模式（无需批准）

要在不出现批准提示的情况下运行 host exec，需同时打开**两个**策略层：
OpenClaw 配置中的请求执行策略（`tools.exec.*`）和执行主机审批文件中的本地审批策略。

省略 `askFallback` 时默认为 `deny`。若希望在无 UI 的批准提示中回退为允许，请显式将 host 的 `askFallback` 设为 `full`。

| 层                    | YOLO 设置                   |
| --------------------- | -------------------------- |
| `tools.exec.security` | `gateway`/`node` 上设为 `full` |
| `tools.exec.ask`      | `off`                      |
| Host `askFallback`    | `full`                     |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 决定 exec **在哪里**运行：可用时在沙箱中，否则在 gateway 中。
- YOLO 决定 host exec **如何**获得批准：`security=full` 加上 `ask=off`。
- YOLO **不会**在已配置的 host exec 策略之上，再额外添加一层启发式的命令混淆审批门禁或脚本预检拒绝层。
- `auto` 不会让 gateway 路由在沙箱会话中变成一种自由的覆盖。可以从 `auto` 发起单次 `host=node` 请求；只有在没有启用沙箱运行时，`host=gateway` 才允许从 `auto` 使用。若要稳定地使用非 auto 默认值，请显式设置 `tools.exec.host` 或使用 `/exec host=...`。

</Warning>

支持自身非交互式权限模式的 CLI 提供方可以遵循此策略。Claude CLI 在 OpenClaw 的有效执行策略为 YOLO 时，会添加 `--permission-mode bypassPermissions`。对于由 OpenClaw 管理的 Claude 实时会话，OpenClaw 的有效执行策略具有优先权，高于 Claude 原生的权限模式：YOLO 会将实时启动规范化为 `--permission-mode bypassPermissions`，而限制性的有效执行策略会将实时启动规范化为 `--permission-mode default`，即使原始 Claude 后端参数指定了其他模式也是如此。

如果你想要更保守的配置，可以将 OpenClaw exec 策略收紧回 `allowlist` / `on-miss` 或 `deny`。

### 持久化的 gateway-host “永不提示” 配置

<Steps>
  <Step title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.security full
    openclaw config set tools.exec.ask off
    openclaw gateway restart
    ```
  </Step>
  <Step title="匹配 host 审批文件">
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

这会同时更新本地的 `tools.exec.host/security/ask` 和本地审批文件默认值（包括 `askFallback: "full"`）。它刻意仅限本地使用。若要远程更改 gateway-host 或 node-host 的审批，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

其他内置预设：`cautious`（`host=gateway`、`security=allowlist`、`ask=on-miss`、`askFallback=deny`）和 `deny-all`（`host=gateway`、`security=deny`、`ask=off`、`askFallback=deny`）。使用相同方式应用：`openclaw exec-policy preset cautious`。

### Node host

请在 node 上应用相同的审批文件：

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

- `openclaw exec-policy` 不会同步 node 审批。
- `openclaw exec-policy set --host node` 会被拒绝。
- node 的 exec 审批会在运行时从 node 拉取，因此针对 node 的更新必须使用 `openclaw approvals --node ...`。

</Note>

### 仅会话内快捷方式

- `/exec security=full ask=off` 只更改当前会话。
- `/elevated full` 是一个紧急开关快捷方式，它仅在请求的策略和 host 审批文件都解析为 `security: "full"` 且 `ask: "off"` 时，才会跳过 exec 审批。更严格的 host 文件，例如 `ask: "always"`，仍然会提示。

如果 host 审批文件比配置更严格，则更严格的 host 策略仍然优先生效。

## 白名单（按 agent）

白名单是**按 agent**划分的。如果存在多个 agent，请在 macOS 应用中切换到你正在编辑的那个 agent。模式使用 glob 匹配。

模式可以解析为二进制路径 glob 或裸命令名 glob。裸名称只匹配通过 `PATH` 调用的命令，因此当命令是 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但**不能**匹配 `./rg` 或 `/tmp/rg`。请使用路径 glob 来信任某个特定的二进制位置。

旧版的 `agents.default` 条目会在加载时迁移到 `agents.main`。像 `echo ok && pwd` 这样的 shell 链仍然需要每个顶层片段都满足白名单规则。

示例：

- `rg`
- `~/Projects/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### 使用 argPattern 限制参数

当某个允许列表条目需要同时匹配二进制和特定的参数形式时，请添加 `argPattern`。OpenClaw 在每个主机上都使用 ECMAScript（JavaScript）正则表达式语义，并将表达式应用于解析后的命令参数，排除可执行文件标记（`argv[0]`）。对于手工编写的条目，参数会以单个空格连接，因此在需要精确匹配时请为模式加上锚点。

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

该条目允许 `python3 safe.py`；`python3 other.py` 则是不命中白名单。如果同一二进制还有一个仅路径的条目，那么不匹配的参数仍然可以回退到那个仅路径条目。当目标是将二进制限制为声明的参数时，请省略仅路径条目。

通过审批流程保存的条目会使用内部分隔符格式进行精确的 `argv` 匹配。请优先使用 UI 或审批流程来重新生成这些条目，而不是手动编辑编码后的值。如果 OpenClaw 无法解析某个命令片段的 `argv`，带有 `argPattern` 的条目将不会匹配。

每个白名单条目都支持：

| Field              | Meaning                                              |
| ------------------ | ---------------------------------------------------- |
| `pattern`          | 已解析的二进制路径 glob 或裸命令名 glob              |
| `argPattern`       | 可选的 ECMAScript argv 正则表达式；省略则仅按路径匹配 |
| `id`               | 稳定的透明 ID；缺失时会生成 UUID                   |
| `source`           | 条目来源，例如 `allow-always`                     |
| `commandText`      | 旧版明文输入；加载时会被丢弃                       |
| `lastUsedAt`       | 上次使用时间戳                                      |
| `lastUsedCommand`  | 上次匹配的命令                                       |
| `lastResolvedPath` | 上次解析到的二进制路径                            |

## 自动允许技能 CLI

当启用 **自动允许技能 CLI**（`autoAllowSkills`）时，已知技能引用的可执行文件会在节点（macOS 节点或无头节点主机）上被视为已加入允许列表。此功能通过 Gateway RPC 使用 `skills.bins` 获取技能 bin 列表。如果你希望使用严格的手动允许列表，请禁用此功能。

<Warning>
- 这是一个**隐式的便捷允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点处于同一信任边界内的受信任运维环境。
- 如果你需要严格的显式信任，请保持 `autoAllowSkills: false`，并且仅使用手动路径允许列表条目。

</Warning>

## 安全 bin 和审批转发

有关安全 bin（仅 stdin 的快速路径）、解释器绑定细节，以及
如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为
原生审批客户端运行），请参见
[Exec approvals - advanced](/tools/exec-approvals-advanced)。

## 控制 UI 编辑

使用 **Control UI -> Nodes -> Exec approvals** 卡片来编辑默认值、
每个代理的覆盖项以及允许列表。选择一个范围（Defaults 或某个代理），
调整策略，添加/移除允许列表模式，然后点击 **Save**。UI
会显示每个模式最近使用的元数据，方便你保持列表整洁。

目标选择器可选择 **Gateway**（本地审批）或 **Node**。
节点必须声明 `system.execApprovals.get/set`（macOS 应用或无头
node 主机）。如果某个节点尚未声明 exec approvals，请直接编辑其
本地审批文件。

一些节点主机，包括 Windows companion，使用不同的审批
策略格式。Control UI 会以只读方式显示这些主机原生策略。使用
companion 应用或带有原生策略形状的 `openclaw approvals set --node <id|name|ip>` 来编辑它们；请参见 [Approvals CLI](/cli/approvals)。

CLI：`openclaw approvals` 支持 gateway 或 node 编辑 - 请参见 [Approvals CLI](/cli/approvals)。

## 审批流程

当需要提示时，网关会向操作客户端广播
`exec.approval.requested`。Control UI 和 macOS
应用通过 `exec.approval.resolve` 来处理它，然后网关将
已批准的请求转发到节点主机。

对于 `host=node`，审批请求包含一个规范化的 `systemRunPlan`
负载。网关在转发已批准的 `system.run` 请求时，会将该计划作为权威的命令/cwd/session
上下文：

- 节点执行路径会预先准备一个规范化计划。
- 审批记录会存储该计划及其绑定元数据。
- 一旦获批，最终转发的 `system.run` 调用会复用已存储的计划，而不是信任后续的调用方编辑。
- 如果调用方在审批请求创建后更改了 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey`，网关会因审批不匹配而拒绝转发该运行请求。

## 系统事件和拒绝

Exec 生命周期会在节点报告完成后向代理的会话发送一条 `Exec finished` 系统消息。OpenClaw 在批准获批后、`tools.exec.approvalRunningNoticeMs` 经过后（默认 `10000`，`0` 表示禁用）也可以发出一条进行中通知。被拒绝的 exec 批准对主机命令而言是终结性的：该命令不会运行。

- 对于带有源会话的主代理异步批准，OpenClaw 会将拒绝作为内部后续消息回发到该会话中，这样代理就可以停止等待异步命令，并避免缺失结果修复。
- 如果没有会话，或者会话无法恢复，OpenClaw 仍然可以向操作员或直接聊天路由报告一个简洁的拒绝信息。
- 子代理和 cron 会话的拒绝不会回发到该会话中。

Gateway-host exec 批准会发出相同的完成生命周期事件。受批准门控的 exec 会复用批准 id 来关联待处理请求及其完成/拒绝消息（`Exec finished (gateway id=...)` / `Exec denied (gateway id=...)`）。

## 启示

- **`full`** 很强大；在可能的情况下，优先使用允许列表。
- **`ask`** 让你保持知情，同时仍然可以快速批准。
- 按代理分别设置允许列表，可防止一个代理的批准泄漏到其他代理。
- 批准仅适用于来自 **授权发送方** 的主机执行请求。未授权的发送方不能发出 `/exec`。
- 对于授权操作员，`/exec security=full` 是一种会话级便捷设置，并且按设计会跳过审批。若要彻底阻止主机执行，请将审批安全级别设置为 `deny`，或通过工具策略拒绝 `exec` 工具。

## 相关

<CardGroup cols={2}>
  <Card title="Exec approvals - advanced" href="/tools/exec-approvals-advanced" icon="gear">
    安全 bin、解释器绑定，以及将审批转发到聊天。
  </Card>
  <Card title="Exec tool" href="/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="Elevated mode" href="/tools/elevated" icon="shield-exclamation">
    也会跳过审批的紧急通道。
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