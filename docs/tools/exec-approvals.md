---
summary: "主机 exec 审批：策略开关、允许列表，以及 YOLO/strict 工作流"
read_when:
  - "配置 exec 审批或允许列表"
  - "检查或撤销持久 MCP 工具授权"
  - "在 macOS 应用中实现 exec 审批 UX"
  - "检查沙盒代理的主机执行批准提示及其影响"
title: "执行批准"
sidebarTitle: "执行批准"
---

Exec 批准是 **配套应用程序/节点主机防护栏**，用于让沙盒代理在真实主机（`gateway` 或 `node`）上运行命令。仅当策略 + 允许列表 +（可选）用户批准全部同意时才运行命令。批准堆栈 **位于** 工具策略和提升的门控之上。网关完整会话和合格的提升完整路径可以跳过主机批准评估。请参阅 [ 严格内联评估异常 ](/tools/exec#inline-eval-strictinlineeval)。

关于 `deny`、`allowlist`、`ask`、`auto`、`full` 的 mode-first 概览、Codex Guardian 映射以及 ACPX harness 权限，请参见 [权限模式](/tools/permission-modes)。

<Note>
在下面描述的全权限网关会话例外之外，有效策略是 `tools.exec.*` 的 **stricter** 和批准默认值：批准只能收紧配置派生的 security/ask，决不能放松它们。如果省略批准字段，则使用 `tools.exec` 值。主机执行程序还使用该计算机上的本地批准状态 - 执行主机批准文档中的主机本地 `ask: "always"` 会不断提示，即使会话或配置默认请求 `ask: "on-miss"` 也是如此。未配置的节点使用与网关相同的 `full` / `off` 基线。 Node 执行在分派之前仍会检查目标策略：调用者 `allowlist` / `off` 拒绝不匹配的命令，并且即使调用者请求 `full` / `off`，目标 `ask: "always"` 也需要批准。
</Note>

## <a id="where-it-applies"></a> 适用范围

执行审批在执行主机本地强制执行：

- **Gateway 主机** -> 网关机器上的 `openclaw` 进程。
- **Node 主机** -> 节点运行器（macOS 配套应用或无头 node 主机）。

当 `ask: "on-miss"` 时，`claude-cli` 后端还会根据代理的执行白名单检查本机 Bash 命令。这授权命令参数，而 Claude Code 拥有执行权。它不提供 OpenClaw 沙箱。请参阅 [Native Bash 和 exec allowedlist](/gateway/cli-backends#native-bash-and-the-exec-allowlist) 以了解匹配、提示和绑定限制。

### <a id="trust-model"></a> 信任模型

- 已通过 Gateway 身份验证的调用方被视为该 Gateway 的受信任操作员。
- 配对节点将该受信任的操作员能力扩展到节点主机上。
- 审批可降低意外执行风险，但**不是**按用户划分的身份验证边界，也不是文件系统只读策略。
- 一旦获得批准，命令可根据所选主机或沙箱文件系统权限修改文件。
- 批准的节点主机运行绑定精确的执行上下文：cwd、精确的argv、env绑定（如果存在）以及固定的可执行路径（如果适用）。
- Gateway 批准支持的命令在审核之前绑定每个已解析的命令段可执行文件，并在启动之前重新检查它。 Node 主机在本地策略评估期间捕获这些身份，并在调度前重新检查。这不包括经过远程人工批准等待的内壳可执行文件。受保护的可执行文件仅使用已解析的实际路径标识。可写可执行文件也使用内容哈希。绑定窗口期间分辨率的更改（包括 `PATH` 上较早的新可执行文件）会拒绝运行。仅身份绑定保留其他合格的 `allow-always` 决策。请参见 [Interpreter/runtime 命令](/tools/exec-approvals-advanced#interpreter%2Fruntime-commands)。
- 对于 shell 脚本和直接 interpreter/runtime 文件调用，OpenClaw 还尝试绑定一个具体的本地文件操作数。如果该文件在批准后但执行前发生更改，则运行将被拒绝，而不是执行漂移的内容。
- File 绑定是尽力而为的，而不是每个 interpreter/runtime 加载程序路径的完整模型。如果无法识别确切的一个具体本地文件，OpenClaw 拒绝创建一个经过批准支持的运行，而不是假装完全覆盖。

### <a id="macos-split"></a> macOS 分流

- **node 主机服务** 通过本地 IPC 将 `system.run` 转发给 **macOS 应用**。
- **macOS 应用** 强制执行审批，并在 UI 上下文中执行命令。

## <a id="inspecting-the-effective-policy"></a> 检查生效策略

| 命令                                                          | 显示内容                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `openclaw approvals get` / `--gateway` / `--node <id\|name\|ip>` | 请求的策略、主机策略来源，以及最终生效结果。                                      |
| `openclaw exec-policy show`                                      | 终端工具政策和本地指挥审批；添加 `--session <key>` 以进行会话工具预览。 |
| `openclaw exec-policy set` / `preset`                            | 将本地请求的策略与本地主机审批文档一步同步。            |

<Note>
不包括每会话 `/exec` 覆盖。在相关会话中运行 `/exec` 以检查其当前默认值。请参阅 [ 会话覆盖 ](/tools/exec#session-overrides-%2Fexec)。
</Note>

工具可用性和命令批准是分开的：即使批准允许命令，`messaging` 工具配置文件也可以排除 `exec` 和 `process`。 `exec-policy show` 离线解释本地排除并识别策略来源。 `--session <key>` 从保存的会话设置中预览工具。包含并不能保证执行，不存在也不能证明工具被禁用。验证运行中的执行情况；命令批准仍然适用。使用`--agent <id>`选择代理并使用`--verbose`选择所有审批范围。

完整 CLI 参考（标志、JSON 输出、白名单 add/remove）：[Approvals CLI](/cli/approvals)。

当本地范围请求 `host=node` 时，`exec-policy show` 会在运行时将该范围报告为由节点管理，而不是将本地审批文件视为事实来源。

如果配套应用 UI **不可用**，任何原本会触发提示的请求都会通过 **ask 回退** 处理（默认：`deny`）。

<Tip>
原生聊天审批客户端可以在待审批消息上为特定频道预设可用操作。Matrix 预设了反应快捷方式（`✅` 仅允许一次， `♾️` 始终允许， `❌` 拒绝），同时在消息中保留 `/approve ...` 作为回退。
</Tip>

对于本机聊天审批界面，节点执行程序会等待原始工具调用中的决定并返回命令输出。关闭或取消该回合将使其待决权限无效。逾期批准无法重新启动。输入的 `SYSTEM_RUN_DENIED` 结果意味着节点拒绝执行，而不是命令可能已运行。

## <a id="settings-and-storage"></a> 设置与存储

批准位于执行主机上的共享 SQLite 状态数据库中。当设置 `OPENCLAW_STATE_DIR` 时，数据库遵循该状态目录。否则它使用默认的 OpenClaw 状态目录：

```text
$OPENCLAW_STATE_DIR/state/openclaw.sqlite#exec_approvals_config
# otherwise
~/.openclaw/state/openclaw.sqlite#exec_approvals_config
```

`#exec_approvals_config` 后缀是用于单例 SQLite 行的显示定位符， 不是数据库文件名的一部分。该行保存下面展示的 JSON 文档作为其权威值， 因此 CLI 和 Gateway 的比较并交换哈希值保持稳定。

默认批准 socket 采用相同的根路径： `$OPENCLAW_STATE_DIR/exec-approvals.sock`，或者在变量未设置时使用 `~/.openclaw/exec-approvals.sock`。

状态目录是独立的信任范围。当 `OPENCLAW_STATE_DIR` 指向其他位置时，OpenClaw 永远不会从默认状态目录导入或存档批准。为自定义状态目录单独配置批准。如果活动状态目录仍包含旧版 `exec-approvals.json`，请停止网关并运行一次 `openclaw doctor --fix` 将其导入。仅当旧版 `plugin-binding-approvals.json` 属于活动状态目录时，Doctor 才会导入它。

旧版白名单条目可能包含 `null`（对于 `lastUsedAt` 或 `lastUsedCommand`）。 Doctor 在导入期间将这两个使用字段视为不存在，包括当配置仍需要修复时。这不会放松对当前策略的验证：其他格式错误的字段或冲突的旧策略仍保留以供操作员恢复，并且执行批准将保持阻止状态，直到旧文件得到解决。修复后，使用相同的状态目录与 `openclaw approvals get` 进行验证。

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
          "pattern": "~/path/to/**/bin/rg",
          "argPattern": "sha256:argv:...",
          "source": "allow-always",
          "lastUsedAt": 1737150000000,
          "lastResolvedPath": "/Users/user/Projects/.../bin/rg"
        },
        {
          "pattern": "~/path/to/**/bin/git"
        }
      ],
      "mcpTools": [
        {
          "server": "project-docs",
          "tool": "publish_page",
          "source": "allow-always",
          "addedAt": 1737150000000
        }
      ]
    }
  }
}
```

## <a id="policy-knobs"></a> 策略旋钮

### `tools.exec.mode`

`tools.exec.mode` 是主机执行的首选规范化策略表面：

| 值       | 行为                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `deny`      | 阻止主机执行。                                                                                                                              |
| `allowlist` | 仅运行允许列表中的命令，无需询问。                                                                                                 |
| `ask`       | 使用允许列表策略，并在未命中时询问。                                                                                                       |
| `auto`      | 直接运行白名单匹配；使用 `allow`（一次）、`deny`（返回给代理的原因）或 `ask`（人工批准）审核符合条件的未命中。 |
| `full`      | 在没有普通策略提示的情况下运行主机执行；请参阅下面的严格内联评估行为。                                                         |

Doctor 将支持的旧版 `tools.exec.security` / `tools.exec.ask` 对迁移到 `tools.exec.mode`。如果部署脚本、模板或配置生成器仍然发送旧字段，`config patch` 和网关 `config.patch` 会拒绝混合策略而不更改文件。更新错误指定的同一 exec 对象中的源，包括用于代理覆盖的 `agents.entries.<agentId>.tools.exec`。如果存在完全相同的值，请将 `security` / `ask` 替换为建议的 `mode` 值。例如，`security: "full", ask: "off"` 变为 `mode: "full"`。

不完整的对需要在转换之前明确选择预期策略。与 `ask: "always"` 或 `security: "full", ask: "on-miss"` 配对没有确切的等效模式：保留两个旧字段并从同一对象中删除 `mode` 以保留其策略。替换对象时保留其他执行设置。对于仍需要迁移的已保存文件运行 `openclaw doctor --fix`。再次运行它不会更新过时的部署源。

### `exec.security`

<ParamField path="security" type='"deny" | "allowlist" | "full"'>
  - `deny` - 阻止所有主机执行请求。
  - `allowlist` - 仅允许允许列表中的命令。
  - `full` - 不需要允许列表匹配。这不会授予提升的访问权限。

对于 gateway/node 主机，默认值为 `full`。 `sandbox` 主机默认为 `deny`。
</ParamField>

### `exec.ask`

<ParamField path="ask" type='"off" | "on-miss" | "always"'>
  为主机执行配置询问策略。控制 `tools.exec.mode` 和主机批准默认值的基线批准提示行为。默认值为 `off`。每次调用 `ask` 工具参数（请参阅 [Exec 工具](/tools/exec#parameters)）只能强化该基线，当有效主机询问为 `off` 时，通道源模型调用会忽略它。

- `off` - 无普通策略提示。单独启用的严格内联评估检查仍然需要批准。
- `on-miss` - 仅当允许列表不匹配时提示。
- `always` - 每个命令都会提示。当有效询问模式为 `always` 时，`allow-always` 持久信任不会 **not** 抑制提示。

</ParamField>

### `askFallback`

<ParamField path="askFallback" type='"deny" | "allowlist" | "full"'>
  当需要提示但无法访问任何 UI（或提示超时）时的处理方式。未指定时默认值为 `deny`。

- `deny` - 阻止。
- `allowlist` - 仅当允许列表匹配时允许。
- `full` - 不对活动安全策略添加更严格的后备限制。白名单限制和明确批准要求（例如公认的严格内联评估表单）仍然适用。

</ParamField>

### `tools.exec.strictInlineEval`

<ParamField path="strictInlineEval" type="boolean" default="false">
  当普通主机审批评估运行时，`true` 将识别的内联代码评估表单视为仅审批，包括在普通 `full`/`off` 策略或允许的解释器二进制文件下。针对未完全映射到一个稳定文件操作数的解释器加载程序进行深度防御。
</ParamField>

严格模式会捕获的示例：`python -c`、`node -e`/`--eval`/`-p`， `ruby -e`、`perl -e`/`-E`、`php -r`、`lua -e`、`osascript -e`（以及 `awk`、 `sed`、`make`、`find -exec` 和 `xargs` 的内联形式）。

在该批准路径上，这些命令需要审阅者或明确批准。对于 `tools.exec.mode: "auto"`，符合条件的命令会收到 `allow`、`deny` 或 `ask` 判决。审核者可以授予一次低风险或中等风险的执行，向代理返回拒绝原因，或者询问人工。网关命令必须通过可变文件绑定检查，但不需要具有固定路径的渲染命令来接受审查。 POSIX 登录或交互式 shell 包装器会在绑定成功时跳过审阅者并需要人工批准，因为它们的隐式启动文件位于操作数绑定之外。现有的绑定拒绝，包括交互式代码加载表单，仍然被拒绝。有关绑定限制和升级，请参阅 [Exec 模式](/tools/exec#modes)。 `Codex app-server` 到达审阅者回退的命令批准会询问人员，因为他们的批准请求不会公开可执行的已解析可执行文件。 `allow-always` 不会保留内联评估命令的新允许列表条目。

单独配置的 `tools.exec.mode: "full"` 不会绕过此设置。在网关上，具有有效安全性 `full` 和询问 `off` 的完全权限会话会跳过主机审批评估。当 exec 和主机批准策略都允许 `full`/`off`. 时，允许的提升完整执行也会跳过它。这些路径会跳过严格的内联评估检测。仅询问完整会话的收紧可恢复批准路径，同时保留其主机文件底限例外。请参见 [ 内联评估 ](/tools/exec#inline-eval-strictinlineeval)。

### `tools.exec.commandHighlighting`

<ParamField path="commandHighlighting" type="boolean" default="false">
  仅演示：启用后，OpenClaw 可以附加解析器派生的命令跨度，以便 Web 批准提示可以突出显示命令令牌。 **not** 是否更改 `security`、`ask`、白名单匹配、严格内联评估行为、批准转发或命令执行。
</ParamField>

在全局范围下可设置为 `tools.exec.commandHighlighting`，或在单个 agent 下设置为 `agents.entries.*.tools.exec.commandHighlighting`。

## <a id="yolo-mode-(no-approval)"></a><a id="yolo-mode-no-approval"></a> YOLO 模式（无需批准）

要在没有批准提示的情况下运行主机执行，请打开 **both** 策略层：在执行主机批准文档中的 OpenClaw 配置 （`tools.exec.*`） **和** 主机本地批准策略中请求执行策略。

对于没有提示的已识别内联评估表单的普通配置完整模式执行，请保留 `tools.exec.strictInlineEval` 未设置或将其设置为 `false`（默认值）。如果检测在启用严格模式的情况下运行，`askFallback: "full"` 不会取代审阅者或明确批准。上述网关会话和提升的异常会跳过该检测。

省略 `askFallback` 时默认为 `deny`。若希望在无 UI 的批准提示中回退为允许，请显式将 host 的 `askFallback` 设为 `full`。

| 层              | YOLO设置               |
| ------------------ | -------------------------- |
| `tools.exec.mode`  | `full` on `gateway`/`node` |
| 主机 `askFallback` | `full`                     |

<Warning>
**重要区别：**

- `tools.exec.host=auto` 决定 exec **在哪里**运行：可用时在沙箱中，否则在 gateway 中。
- YOLO 决定 host exec **如何**获得批准：`security=full` 加上 `ask=off`。
- YOLO **not** 在配置的主机执行策略之上添加单独的启发式命令混淆批准门或脚本预检拒绝层。 Node 准备仍然读取目标策略并解析工作目录一次。如果双方都允许 full/off 并且禁用严格内联评估，则普通路径别名和内联脚本不需要批准绑定。限制性政策和后来的政策变更仍然执行。
- `auto` 不会使节点或网关路由从沙盒会话中自由覆盖。仅当没有沙箱运行时处于活动状态时，才允许来自 `auto` 的每次调用 `host=node` 和 `host=gateway` 请求。对于稳定的非自动默认值，请设置 `tools.exec.host` 或显式使用 `/exec host=...`。

</Warning>

对于 OpenClaw- 托管的 Claude 会话，OpenClaw 在其 `default` 权限模式下启动 Claude Code。 OpenClaw 的有效执行策略通过本机工具挂钩和权限请求（包括 YOLO 和限制性策略）保持权威，即使原始 Claude 后端参数请求 `bypassPermissions` 也是如此。

如果你想要更保守的配置，可以将 OpenClaw exec 策略收紧回 `allowlist` / `on-miss` 或 `deny`。

### <a id="persistent-gateway-host-%22never-prompt%22-setup"></a><a id="persistent-gateway-host-never-prompt-setup"></a> 持久化的 gateway-host “永不提示” 配置

<Steps>
  <Step id="set-the-requested-config-policy" title="设置请求的配置策略">
    ```bash
    openclaw config set tools.exec.host gateway
    openclaw config set tools.exec.mode full
    openclaw config set tools.exec.strictInlineEval false
    openclaw gateway restart
    ```
  </Step>
  <Step id="match-the-host-approvals-document" title="匹配主机批准文件">
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

### <a id="local-shortcut"></a> 本地快捷方式

```bash
openclaw exec-policy preset yolo
```

更新本地 `tools.exec.host/security/ask` 和本地审批文件默认值（包括 `askFallback: "full"`）。它有意仅限于本地，并且需要所选状态的独占离线所有权。在使用 `exec-policy set` 或 `preset` 之前，通过其服务所有者停止正在运行的网关；当另一个活动网关拥有该状态时，这些命令在更改策略之前拒绝。要远程更改网关主机或节点主机批准，请使用 `openclaw approvals set --gateway` 或 `openclaw approvals set --node <id|name|ip>`。

当 cron 命令启动时，撤回权限的网关策略更改可能会被拒绝。命令启动稳定后重试；拒绝后，之前的政策仍然有效。

其他内置预设：`cautious`（`host=gateway`、`security=allowlist`、`ask=on-miss`、`askFallback=deny`）和 `deny-all`（`host=gateway`、`security=deny`、`ask=off`、`askFallback=deny`）。使用相同方式应用：`openclaw exec-policy preset cautious`。

要设置单个字段而不是完整预设，请将 `openclaw exec-policy set --host <auto|sandbox|gateway|node> --security <deny|allowlist|full> --ask <off|on-miss|always> --ask-fallback <deny|allowlist|full>` 与这些标志的任何子集一起使用。

### <a id="node-host"></a> Node主机

在 node 上应用相同的审批文档：

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
- Node 执行批准是在运行时从节点获取的。用`openclaw approvals get --node <id|name|ip>`检查它们并用`openclaw approvals set --node <id|name|ip> --file <path>`（或`--stdin`）替换它们；请参阅 [ 批准 CLI](/cli/approvals)。

</Note>

### <a id="session-and-turn-shortcuts"></a> 会话和转向快捷键

- `/exec security=full ask=off <task>` 仅请求当前消息的策略。将任务包含在同一消息中。独立指令不会影响下一条消息。会话权限模式和主机策略仍然可以限制请求。
- `/elevated full` 是一个 break-glass 快捷方式，仅当请求的策略和 host 审批文档都解析为 `security: "full"` 且 `ask: "off"` 时，才会跳过 exec 审批。更严格的 host 文件（例如 `ask: "always"`）仍然会提示。

在完全权限网关会话例外之外，如果主机批准文档保持比配置更严格，则更严格的主机策略仍然获胜。

## <a id="allowlist-(per-agent)"></a><a id="allowlist-per-agent"></a> 白名单（按 agent）

白名单是**按 agent**划分的。如果存在多个 agent，请在 macOS 应用中切换到你正在编辑的那个 agent。模式使用 glob 匹配。

模式可以解析为二进制路径 glob 或裸命令名 glob。裸名称仅匹配通过 `PATH` 调用的命令，因此当命令为 `rg` 时，`rg` 可以匹配 `/opt/homebrew/bin/rg`，但 **不能匹配**、`./rg` 或 `/tmp/rg`。使用路径 glob 来信任一个特定的二进制位置。

仍使用旧版 `agents.default` 密钥或 `commandText` 字段的已保存策略不会在加载时进行转换。 OpenClaw 拒绝它们，直到 `openclaw doctor --fix` 将 `agents.default` 移动到 `agents.main` 并丢弃 `commandText`； `openclaw update` 运行相同的医生通行证。插件和运算符 API 仍然接受旧形状作为输入，并在保存之前对其进行标准化。参见[执行审批政策](/gateway/doctor/config-migrations#exec-approval-policy)。像 `echo ok && pwd` 这样的 Shell 链仍然需要每个顶级段来满足白名单规则。

示例：

- `rg`
- `~/path/to/**/bin/peekaboo`
- `~/.local/bin/*`
- `/opt/homebrew/bin/rg`

### <a id="restricting-arguments-with-argpattern"></a> 使用 argPattern 限制参数

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

该条目允许 `python3 safe.py`。 `python3 other.py` 属于许可名单未命中。如果还存在同一二进制文件的仅路径条目，则不匹配的参数仍然可以回退到该仅路径条目。当目标是将二进制文件限制为声明的参数时，请省略仅路径条目。

批准流程保存的条目使用内部分隔符格式来实现精确的 argv 匹配。首选 UI 或批准流程来重新生成这些条目，而不是手动编辑编码值。如果 OpenClaw 无法解析命令段的 argv，则带有 `argPattern` 的条目不匹配。

生成的 `allow-always` 条目绑定到确切的 argv 和您批准它们的工作目录。选择 **此处始终允许** 仅在该目录中授权相同的命令。在其他地方运行它是一个许可名单失误。

2026.8.1 之前保存的生成条目不受目录限制，并且在升级后处于非活动状态。 `openclaw update` 在其自动 Doctor pass 期间删除它们，或者您可以自己运行 `openclaw doctor --fix`。重新运行受影响的工作流程并选择 **始终允许此处** 创建替换。手动允许名单规则不会更改。对于手动仅路径规则，请忽略 `source` 和 `argPattern`。

每个允许列表条目支持：

| 字段              | 含义                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `pattern`          | 解析后的二进制路径 glob 或裸命令名 glob                      |
| `argPattern`       | ECMAScript argv 正则表达式或生成的精确 argv 哈希；省略则仅限路径 |
| `id`               | 稳定的透明 ID；缺失时生成 UUID                        |
| `source`           | 生成条目的来源，例如 `allow-always`；手工条目省略  |
| `commandText`      | 遗留明文输入；保存的条目需要 `openclaw doctor --fix`       |
| `lastUsedAt`       | 最近使用时间戳                                                      |
| `lastUsedCommand`  | 最近一次匹配的命令；生成的哈希 argv 条目省略     |
| `lastResolvedPath` | 上次解析到的二进制路径                                                |

## <a id="mcp-tool-grants"></a> MCP 工具补助

对于网关托管的 Codex 运行，**Allow Always** 可以为 `mcp.servers` 中配置的服务器上的一个 MCP 工具保存持久授权。网关在同一批准文件中将拨款写入 `agents.<agentId>.mcpTools`。它涵盖了确切的代理、配置的服务器名称和工具名称 **以及任何参数**。它不授予对其他代理、服务器或工具的访问权限。

每个条目都有 `server`、`tool`、`source: "allow-always"` 和 `addedAt`（Unix 毫秒）。 `lastUsedAt` 是可选的。 Codex 应用程序、本机插件服务器和计算机使用服务器不会收到 OpenClaw MCP 工具授权。 OpenClaw 仅在提供持久性时才会铸造，并且它可以明确地将批准与网关拥有的实时工具调用相匹配。缺失或不明确的相关性将保留 Codex 的现有 native/session 行为。

当服务器的 `codex.defaultToolsApprovalMode` 为 `auto` 或未指定时，补助金适用。显式 `prompt` 赢得了存储的授权并不断请求。显式 `approve` 已绕过每次调用批准。请参阅 [Codex 工具认证 ](/cli/mcp#codex-tool-approvals)。

当 OpenClaw 下一步准备 Codex 线程配置和挂钩注册时（例如新会话或重新启动后），将读取持久授权。当前会话继续使用 Codex 记住的决策。 OpenClaw 不会为每个工具调用重新加载授权。

要检查补助金，请运行 `openclaw approvals get --gateway`。要撤销一项，请导出文档，从 `agents.<agentId>.mcpTools` 中删除其条目，然后用现有的 `set` 命令替换该文档：

```bash
openclaw approvals get --gateway --json | jq '.file' > approvals.json
# Edit approvals.json, preserving other settings, allowlists, and grants.
openclaw approvals set --gateway --file approvals.json
```

从两个命令中省略 `--gateway` 以编辑本地批准。撤销也在下一个线程 preparation/registration 生效。启动新会话或重新启动以放弃活动会话记住的批准。如果 Codex 还在其本机配置中保留了单独的批准，也请删除该本机授权。

## <a id="standing-grants-for-automations"></a> 自动化常设补助金

网关主机自动化 （cron） 运行引发的批准仅传递给连接的执行批准客户端：Control UI、macOS/iOS/Android 应用程序以及声明 `approvals` 或 `exec-approvals` 功能的 API 客户端。 TUI 不会呈现执行批准卡，并且聊天通道永远不会收到自动化批准，这会在每次出现时重复一张卡。当审阅者界面已连接时，计划运行会像交互式运行一样等待决策。自动化是单次飞行，因此每个作业一次最多有一张卡处于待处理状态。如果没有连接审批界面，请求会立即被拒绝，并且运行错误会解释策略修复。 Node-host 自动化执行人员保持完全无头策略（无卡），直到节点执行获得自己的常设授权路径。

当批准源自自动化的隔离运行时，使用 **Alwaysallow** 解析它不会写入 JSON 允许列表条目。相反，网关会创建一个与该确切代理、自动化、作业配置和操作（命令文本、工作目录和请求的环境）绑定的范围内的常设授权。当授权有效时，稍后出现的同一作业将执行该确切操作，而无需提示。批准卡预先说明了这一点：自动化批准带有一条范围线，准确描述了“始终允许”将铸造的内容。

### <a id="what-a-grant-covers%2C-and-when-it-stops"></a><a id="what-a-grant-covers-and-when-it-stops"></a> 补助金涵盖哪些内容以及何时停止

当作业被删除或其实质性定义发生更改时，即使稍后的编辑恢复了早期的定义，授权也会被拒绝，并且需要正常提示。暂停并重新启用未更改的自动化将保留授权。当命令、工作目录或环境仅相差一个字节时，当授权被撤销或过期时，或者当原始批准记录消失时，授权也会停止匹配。每次使用都会检查当前的授权和批准行。一旦使用提交，它就授权该使用；撤销或作业编辑可能会影响已检查的启动。在进程生成之前仍会立即检查运行活动和主机策略。需要明确审查的可变文件操作数和命令（heredocs、严格内联评估、审计抑制）每次出现时都会提示。非自动化审批不变。

### <a id="grant-lifetime"></a> 授予生命周期

默认情况下，授权存在于 **直至撤销** — 与产品中其他地方的“始终允许”含义相同。条款在生效时冻结，并且永远不会追溯更改：

- `tools.exec.grantExpiryDays`（默认情况下未设置）设置 **future** 授权的默认生命周期（以天为单位）。现有的赠款保留其铸造时的条款。使用撤销来提前退休他们。这是需要定期重新批准的托管部署的队列策略旋钮。
- A 解析表面可以使用 `approval.resolve` / `exec.approval.resolve` 或 `openclaw approvals resolve <id> allow-always --expires-in-days <n>` 上的 `grantExpiresInDays` 字段覆盖每个授权的默认值。覆盖优先于配置默认值。
- 过期的补助金会回退到提示并被机会性地修剪。

### <a id="listing-and-revoking"></a> 列名与撤销

每项常设补助都是可见且可撤销的：

- **Control UI**：设置 → 批准显示常设拨款分类账 — 自动化、精确命令、使用计数和状态（直到撤销、N 天后过期、过期、撤销） — 每个活动行都有一个撤销操作。
- **CLI**：`openclaw approvals grants list` 渲染相同的账本。 `openclaw approvals grants revoke <grant-id>` 撤销一项资助。重复撤销不会产生额外效果。它会阻止后续的赠款消耗，从而再次提示。已消耗的使用可能仍会开始。
- 删除或实质性编辑自动化，或撤销铸币批准，也会使赠款无效，而无需触及赠款表面。暂停并重新启用未更改的自动化则不会。

铸造 `operator_approvals` 行仍然是唯一的授权所有者：授权是衍生相关性，在每次使用时根据实时批准行、自动化行和撤销状态重新验证。

## <a id="auto-allow-skill-clis"></a> 自动允许技能 CLI

启用 **自动允许技能 CLIs** （`autoAllowSkills`） 时，已知技能引用的可执行文件将被视为节点（macOS 节点或无头节点主机）上的允许列表。这通过网关 RPC 使用 `skills.bins` 来获取技能箱列表。如果您需要严格的手动许可名单，请禁用此功能。

技能信任属于提供它的网关。切换网关会废弃以前的缓存，包括 Mac 应用程序的受信任二进制列表和仍在进行中的批准检查。刷新失败可以保留来自同一网关的最后已知信任。它无法导入另一个网关的信任。

当选定的网关连接时，Mac 的 Exec Approvals 窗格会刷新其受信任的二进制文件和代理选择。本地策略、选定的范围和未完成的允许列表编辑保留在 Mac 上。

<Warning>
- 这是一个**隐式的便捷允许列表**，与手动路径允许列表条目分开。
- 它适用于 Gateway 和节点处于同一信任边界内的受信任运维环境。
- 如果你需要严格的显式信任，请保持 `autoAllowSkills: false`，并且仅使用手动路径允许列表条目。

</Warning>

## <a id="safe-bins-and-approval-forwarding"></a> 安全 bin 和审批转发

有关安全 bin（仅 stdin 的快速路径）、解释器绑定细节，以及如何将审批提示转发到 Slack/Discord/Telegram（或将它们作为原生审批客户端运行），请参见 [Exec approvals - advanced](/tools/exec-approvals-advanced)。

## <a id="control-ui-editing"></a> Control UI 编辑

使用 **Control UI -> 节点 -> 执行批准** 卡编辑默认值、每个代理覆盖和允许列表。选择范围（默认值或代理），调整策略、add/remove 白名单模式，然后 **Save**。 UI 显示每个模式最后使用的元数据，以便您可以保持列表整洁。

目标选择器会选择 **Gateway**（本地审批）或一个 **Node**。 节点必须上报 `system.execApprovals.get/set`（macOS 应用或无头 node 主机）。如果某个节点尚未上报 exec approvals，请直接编辑其本地审批文档。

某些节点主机（包括 Windows 同伴）拥有不同的批准策略格式。 Control UI 以只读方式显示这些主机本机策略。使用配套应用程序或 `openclaw approvals set --node <id|name|ip>` 与本机策略形状来编辑它们。请参阅 [ 批准 CLI](/cli/approvals)。

CLI：`openclaw approvals` 支持 gateway 或 node 编辑 - 请参见 [Approvals CLI](/cli/approvals)。

## <a id="approval-flow"></a> 审批流程

当需要提示时，网关会向操作客户端广播 `exec.approval.requested`。Control UI 和 macOS 应用通过 `exec.approval.resolve` 来处理它，然后网关将已批准的请求转发到节点主机。

在及时截止日期之前接受的批准在网关的实时切换窗口期间仍然有效。在发货过程中超过及时期限并不会撤销该决定。关闭的运行、过期的切换窗口和重复使用的 **Allow Once** 批准仍拒绝执行。

macOS 批准面板使普通命令保持紧凑，将提供的代理和主机汇总在一个摘要中。它显示了完整的包装命令下的工作目录。较长的命令会滚动。展开 **Details** 以检查可执行路径。目录和可执行路径仍然完全可选。 **Copy** 复制显示的命令，包括控制的可见转义符和不可见字符。主机来自请求。网关或节点可以远离显示面板的 Mac。

选择 **允许一次** 或按 **Command-Return** 批准一次执行。单独退货不认可。 **Escape** 关闭面板，当 **Don't Allow** 可用时拒绝请求。否则，它将在没有决定的情况下关闭。 **此处始终允许** 仅当请求的策略允许持久批准时才出现。

对于 `host=node`，批准请求包括准备好的 `systemRunPlan` 有效负载。在转发批准的 `system.run` 请求时，网关使用该计划作为权威 command/cwd/session 上下文：

- 节点执行路径预先准备一个计划。
- 审批记录会存储该计划及其绑定元数据。
- 一旦获批，最终转发的 `system.run` 调用会复用已存储的计划，而不是信任后续的调用方编辑。
- 创建批准请求后对 `command`、`rawCommand`、`cwd`、`agentId` 或 `sessionKey` 的编辑将被丢弃：网关改为转发存储的值。更改后的 `env` 覆盖仍会因批准不匹配而被拒绝。

## <a id="approval-scope-summaries"></a> 批准范围摘要

审批所有者可以附加一个键入的、仅显示的范围，描述该操作影响哪些人员或资源。 OpenClaw 在渠道审批卡上呈现经过净化的摘要，并将有限范围包含在可供 Control UI 客户使用的安全审批演示中。独立批准链接在决策按钮之前显示提供的范围，包括自动化授予条款。 Scope 从不授予授权或更改审批政策。

- `message-send`：目标、收件人计数、可选收件人预览以及受众是内部还是外部。
- `payment`：精确的小数金额、货币和收款人或支付系统。
- `external-post`：目标以及帖子是公开的还是受限的。

例如，电子邮件批准可能会显示 `Send to 3 recipients via email (external): alice@example.com, bob@example.com, +1 more`。业主提供这些事实。通道从不从命令或消息文本推断它们。如果没有声明范围，批准卡的呈现方式与以前完全相同。

## <a id="system-events-and-denials"></a> 系统事件和拒绝

当批准可以下达时，普通代理运行等待决策并同时接收执行结果。最终回复使用原始传递路径，包括入站 A2A 任务。操作员拒绝返回拒绝的工具结果而不运行命令。

显式使用异步执行的诊断和导出命令保留其单独的后续交付。对于这些工作流程：

Exec 生命周期会在节点报告完成后向代理的会话发送一条 `Exec finished` 系统消息。OpenClaw 在批准获批后、`tools.exec.approvalRunningNoticeMs` 经过后（默认 `10000`，`0` 表示禁用）也可以发出一条进行中通知。被拒绝的 exec 批准对主机命令而言是终结性的：该命令不会运行。

- 对于带有源会话的主代理异步批准，OpenClaw 会将拒绝作为内部后续消息回发到该会话中，这样代理就可以停止等待异步命令，并避免缺失结果修复。
- 如果没有会话，或者会话无法恢复，OpenClaw 仍然可以向操作员或直接聊天路由报告一个简洁的拒绝信息。
- 子代理和 cron 会话的拒绝不会回发到该会话中。

网关主机执行批准会发出相同的完成生命周期事件。审批门控执行人员重用审批 ID 将待处理请求与其 completion/denial 消息 （`Exec finished (gateway id=...)` / `Exec denied (gateway id=...)`） 相关联。

## <a id="implications"></a> 启示

- **`full`** 功能强大。尽可能选择允许名单。
- **`ask`** 让你保持知情，同时仍然可以快速批准。
- 按代理分别设置允许列表，可防止一个代理的批准泄漏到其他代理。
- 批准仅适用于来自 **授权发送方** 的主机执行请求。未授权的发送方不能发出 `/exec`。
- `/exec security=full <task>` 是授权操作员发出的当前回合请求，受有效会话和主机策略的约束。要硬阻止执行，请通过工具策略拒绝 `exec` 工具。请参阅 [session overrides](/tools/exec#session-overrides-%2Fexec) 以了解托管审批楼层的完全访问会话例外。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="执行批准 - 高级" href="/tools/exec-approvals-advanced" icon="gear">
    安全 bin、解释器绑定，以及将审批转发到聊天。
  </Card>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    Shell 命令执行工具。
  </Card>
  <Card title="高架模式" href="/tools/elevated" icon="shield-exclamation">
    也会跳过审批的紧急通道。
  </Card>
  <Card title="沙箱化" href="/gateway/sandboxing" icon="box">
    沙箱模式和工作区访问。
  </Card>
  <Card title="安全" href="/gateway/security" icon="lock">
    安全模型和加固。
  </Card>
  <Card title="Sandbox、工具策略与 elevated" href="/gateway/sandbox-vs-tool-policy-vs-elevated" icon="sliders">
    何时使用每种控制。
  </Card>
  <Card title="技能" href="/tools/skills" icon="sparkles">
    基于技能的自动允许行为。
  </Card>
</CardGroup>
