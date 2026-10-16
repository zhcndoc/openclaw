---
summary: "`openclaw triage` 的 CLI 参考（净化诊断和代理切换）"
read_when:
  - "OpenClaw 行为不当，您需要代理就绪的调试提示"
  - "更新失败，您希望本地编码代理修复它"
  - "您需要一个经过清理的诊断包，而无需启动代理"
title: "分诊"
---

# `openclaw triage`

收集经过清理的诊断信息并在此计算机上打开编码代理以诊断、修复和验证此 OpenClaw 安装。

```bash
openclaw triage
```

在交互式终端中，分类会按照以下检测顺序在 `PATH` 上启动第一个可直接启动的代理：Codex （`codex`）、Claude Code （`claude`）、Pi （`pi`）、OpenCode （`opencode`）、Muse 代码 （`muse`）、Grok 构建 （`grok`）、光标 （`cursor-agent`）、Kimi 代码 （`kimi`）、Qwen 代码（`qwen`），然后是Google反重力CLI（`agy`）。当Codex和Claude Code都可用时，除非您选择带有`--agent`的座席，否则Codex优先。显式 `openclaw triage` 调用会打印所选代理并直接传递有界修复提示，无需选择器或启动确认。代理使用其现有的身份验证和本机执行策略。

Google 反重力 CLI 使用 `agy --prompt-interactive` 以修复提示启动并保持会话打开。首先安装并登录[官方CLI](https://antigravity.google/docs/cli/install/)。 Triage 使用 Antigravity 现有的身份验证和权限设置；它不会导入 Google 凭据或绕过工具批准。

光标选择使用 `--agent cursor` 并需要由 Cursor 的 CLI 安装程序安装 `cursor-agent` 别名。 Triage 不使用 `cursor` 编辑器命令或通用 `agent` 别名（Grok 也安装了该命令）。

Kimi 代码使用 `kimi --prompt` 进行单次维修。其原生提示方式采用自动权限，无需审批提示；分类会在启动或手动切换之前打印此策略。 Kimi 代码不公开交互式初始提示标志。 Qwen 代码使用 `qwen --prompt-interactive` 以修复提示启动并保持交互式会话打开，包括其正常的工具批准。

Claude Code 在受支持时以 `--safe-mode` 开头，这会禁用自定义挂钩、插件、技能、MCP 服务器和项目指令，同时保留身份验证和内置工具。这可以防止项目启动挂钩（例如依赖项安装）延迟修复提示。当安装的 CLI 未通告安全模式支持时，分类会打印通知并使用正常自定义设置运行 `claude -p`。打印的手动命令也使用 Claude 的常规自定义设置，包括插件和 MCP 服务器。

使用 `--agent` 选择特定代理，或在不启动 `--json` 或 `--non-interactive` 的情况下收集诊断信息：

```bash
openclaw triage --agent agy
openclaw triage --agent codex
openclaw triage --agent cursor
openclaw triage --agent grok
openclaw triage --agent kimi
openclaw triage --agent muse
openclaw triage --agent qwen
openclaw triage --json
openclaw triage --non-interactive
```

提示包括 OpenClaw 版本、平台、Node.js 版本、带修复提示的优先 Doctor 结果以及诊断存档路径。该存档包含经过清理的配置、尽力网关状态和运行状况快照、操作日志摘要以及可用的稳定性诊断。如果网关无法访问，分类仍然会写入包含可用本地诊断的存档，并在其中记录快照故障。医生或导出失败会记录在提示中，以便代理仍然可以进行调查。

诊断存档不包括机密、令牌、原始聊天负载和原始日志。更新失败提示包括有限制的、经过清理的诊断摘录，其中包含在截断之前编辑的机密和本地路径。提示内的路径相对于 `~` 或 `$OPENCLAW_STATE_DIR` 显示。保存的提示符路径、存档路径和打印的切换命令保留 shell 所需的真实绝对路径。诊断集合是只读的。启动的代理被要求在其现有权限内自主修复并保留配置、历史记录和数据库。

存档的配置摘要对已保存文件中声明的代理、插件和通道条目进行计数。共享通道设置和 `$include` 指令不包括在这些计数中。诊断不会扩展包含的文件。

## <a id="failed-update-recovery"></a> 更新恢复失败

在更新程序释放其维护状态后，交互式更新恢复使用相同的切换。它从捕获的更新失败开始。它将新的 Doctor 检查和存档收集推迟给修复代理，因此对损坏的安装的检查不会延迟移交。代理在操作员捕获的工作目录中启动，如果该目录已删除或无法访问，则在其 OS 主目录中启动。即使无法访问或创建状态目录，绝对安装选择器仍会识别要修复的状态、配置和默认工作空间。

在自动交互式启动之前，OpenClaw 显示它将运行的内容。它显示了所选的二进制文件或使用您配置的模型的嵌入式 OpenClaw 代理。它还显示保存的提示路径（如果可用），以及它使用您自己的帐户或令牌的通知。 OpenClaw 然后要求确认。只有肯定的“是”才会启动代理。输入 `n`、取消或 30 秒无应答会跳过启动，为所选代理打印一份手动下一步，并保留诊断信息和失败更新的退出状态。要选择其他外部代理，请运行 `openclaw triage --agent codex` 或其他支持的 `--agent` 值。这取代了之前的 timeout-as-Yes 默认值；显式独立分类保持其现有行为。

该提示会保留原始错误、之前和之后的版本，以及在当前 Doctor 发现之前记录的恢复状态。它包括最多三个失败或中断的步骤，不包括建议性 Doctor 结果，以及来自 stderr 和 stdout 的有限摘录。它还保留有限制的插件故障和终端 Doctor 警告。故障记录限制为4 KiB，整个提示限制为8 KiB。健康的医生检查不会消除失败的尝试，并且缺席的重启安全判决仍然未知。

使用 `--yes`、JSON 输出或没有 TTY 的会话进行更新永远不会启动修复代理。它们保存分类诊断并打印显式选择加入命令 `openclaw triage --run --update-result <path>`。托管切换更新和前台 `gateway run` 启动失败也仅收集诊断信息。初始参数、所有权和安装拒绝保留其现有输出。独立诊断将挂起的失败更新通知保留为上下文。嵌入式验证通过决议所有者选择当前账本历史记录。这些读取不会消耗通知或创建状态数据库。交付路线和继续说明不包括在内。

使用 `--update-result <path>` 包含更新程序保存的故障工件。分类最多读取有效 UTF-8 JSON 中的 8 个 KiB 并验证故障记录。其打印的嵌入式切换命令使用经过净化的支持导出，因此在删除临时更新程序输入后它仍然可用。捕获故障的交互式切换会推迟新的诊断。 JSON 和强制非交互式运行仍然会收集它们。

修复提示指示代理保留迁移的状态，在回滚或重新启动之前进行调查，并在修复后验证预期的安装以及网关运行状况和 RPC 连接。成功的代理退出不会将原始更新程序失败更改为成功更新。

## <a id="installation-target-and-embedded-handoff"></a> 安装目标和嵌入式切换

分类会捕获已诊断安装的已解析状态目录、确切的配置路径和默认工作区，包括自定义路径和命名配置文件。本地 shell 命令接收这些命令为 `OPENCLAW_STATE_DIR`、`OPENCLAW_CONFIG_PATH` 和 `OPENCLAW_WORKSPACE_DIR`。因此，即使其选择器是隐式的，存档引用和默认工作区检查也会根据诊断的安装进行解析。安装配置中的创作工作区仍然优先于其默认工作区。嵌入式代理将其自己的配置快照、会话、执行 cwd 和临时运行状态分开。进程内配置和会话工具指的是临时运行。使用本地 shell 命令检查或修复已诊断的安装。

`openclaw triage --run` 在交互式终端中请求最多一个有界嵌入式修复回合。推理使用系统代理所有者的默认模型，然后是其配置的 `model.fallbacks`，然后是其他配置的代理的经过身份验证的路由。明确缺乏工具支持的模型和没有可用身份验证的路由将被跳过。如果没有路线有效，分类会报告嵌入式修复不可用。使用保存的切换命令，或使用 `openclaw onboard` 修复模型设置。

对于独立安装分类，循环在转弯之前和之后运行 Doctor lint，使用错误发现的数量来衡量改进情况。最初正常的安装会打印 **alreadysolved**，而不开始推理。分类允许转一圈，总共十分钟，每圈五分钟，以及 40 次工具调用。轮流后发现更多错误，报告安装未修复。

对于记录的更新失败，包括 Doctor 最终确定，干净的 Doctor lint 是不够的。分类需要完整的更新程序结果，并验证已安装的软件包或 Git 运行时、Doctor 发现以及托管网关的安装和准备情况。显式提供的故障工件会对其记录的目标进行严格检查。简单分类接受稍后成功更新到相同或更新版本，并验证当前完成的安装，因此历史故障不会将安装固定到旧版本。插件故障还需要插件健康状况。稍后验证的回滚到相同或更新的版本也会保留该恢复：普通分类检查回滚运行自己的先前和恢复的身份、记录的包恢复和当前安装。显式工件仍然需要回滚到其原始版本。分类保留历史失败的运行；它永远不会将失败结果中幸存的 `after.version` 视为请求的目标。

软件包更新记录其已解析的注册表版本。 Git 更新会在候选验证或激活之前记录目标检查期间选定的提交和可用的清单版本。 Triage 可以使用记录的身份验证 Git 目标；它会检查所有存在的身份。仅包含 channel/tag 选择器（例如 `dev`/`latest`）的旧版 Git 记录不会建立已解析的目标。

普通 `triage --run` 通过分辨率所有者验证更新历史记录，即使没有重新启动通知或出现更新的预览也是如此。修复确认可清除历史废弃运行的阻止程序，但仍需要新的医生检查；它们无法隐藏当前的配置错误。稍后的预览和确认放弃的运行也无法替代已完成的更新。 Doctor/config 失败需要与其他更新失败相同的更新程序记录的完成。挂起的插件状态迁移仍然悬而未决，并出现在判决中，直到其迁移所有者记录完成为止，包括在较新的成功更新之后以及没有保留重新启动通知时。

没有运行标识或记录目标的显式 `--update-result` 工件或挂起通知仍为 **unrepaired**，包括 Doctor/config 故障。 Triage 报告它无法建立更新目标，并指示您检查 `openclaw update status --json`，然后运行 ​​`openclaw update repair`。对于不相关的更新失败，它永远不会退回到健康的 Doctor 判决。故意停止或不受管理的网关无法提供托管服务验证。当初始检查证明已解决时，人工输出显示 **已解决**；修复轮后，仅当相同的检查通过时，才会显示 **repaired**。工作协议保留其现有的 `repaired` 和 `unrepaired` 状态。代理的成功退出或声称它解决了问题并不是解决问题的证据。

挂起的程序包激活还会阻止分类报告解决方案，即使 Doctor 通过、上次运行成功且未列出恢复集也是如此。对于重新启动后丢失或更改的切换租用数据库，分类会在重试更新之前将您引导至 `openclaw update repair`。从包含 [lease 恢复修复 ](/cli/update/repair-and-recovery#update-repair) 的 CLI 运行修复；较旧的被阻止的 CLI 可能需要此处描述的手动安装跃点。如果分类没有针对记录的故障的解决谓词，它会这么说并将 `openclaw update repair` 命名为下一步。

轮后医生检查仅在执行者确认清理后运行。如果清理失败或超时，修复会报告失败，保留执行状态，并拒绝该 CLI 进程中的另一次修复。在从新进程重试之前，检查诊断并停止任何剩余的工作。

操作员拥有更新或显式 `--run` 请求。因此，嵌入式修复将交互式执行批准替换为无提示运行，范围仅限于安装或暂存候选根 （`fs.workspaceOnly: true`）。它保留安全箱和工具允许列表。它永远不会覆盖显式的执行或修复工具拒绝。它拒绝配置的沙箱、节点和远程执行路由，而不是将它们重定向到主机，并且不启动外部编码代理 CLI。显式拒绝报告 `exec-denied-by-policy`。使用 `openclaw triage` 进行外部切换。保存的执行策略不变。

修复提示指示代理仅更改安装或暂存候选根，并使用固定的 OpenClaw 状态进行诊断。它禁止编辑凭据或身份验证存储、删除状态或数据库、包管理器在目标根目录之外写入，以及启动、停止或重新启动服务或网关。文件系统工具强制执行工作区边界。主机命令遵循提示的范围约定，并且不是 OS 沙箱。允许的检查包括 `openclaw doctor --lint --json`、`openclaw doctor --fix` 和 `openclaw health --json`。修复循环不会激活更新、重新启动服务、拍摄快照或撤消文件。

每个回合都被要求以机器可读的行结束：

```text
REPAIR_RESULT: {"status":"fixed","summary":"Repaired the installation and checked Doctor lint."}
```

状态可能是 `fixed`、`partial` 或 `not-fixed`。缺失或格式错误的行会退回到最终文本的有限摘要。所有者验证仍然具有权威性。故障上下文和修复指令共享 8 KiB 提示限制。

在 Windows 上，已识别的 npm `.cmd` 和 `.bat` 垫片直接启动其 Node.js 或本机可执行入口点，保留交互式终端。 Node.js 入口点需要在 `PATH` 上运行 Node.js 运行时或 `node.exe`。需要 shell 的自定义包装器仍然是手动切换。缺少或仅手动的显式 `--agent` 会以非零值退出，而无需选择其他代理。

## <a id="manual-handoff"></a> 手动切换

非交互式会话无需启动代理即可保存诊断信息。人工输出打印明确选择或第一个检测到的编码剂的下一步。如果未检测到编码代理，它会解释如何安装编码代理并重新运行分类。需要 shell 的 Windows 包装器仍可作为手动命令使用。 JSON 输出保留所有外部切换命令和显式嵌入路由。保存的外部提示是从标准输入读取的，或者对于 Grok 和 Muse，使用 `--prompt-file` 读取。 Kimi 代码和反重力 CLI 接收一条简短的指令来读取保存的提示，而不是通过管道将其传输到标准输入。在 macOS 和 Linux 上，命令如下所示：

```bash
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' agy --prompt-interactive 'Read the debugging prompt at <prompt-path> and follow its repair and verification instructions.'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' claude -p < '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' codex exec --skip-git-repo-check - < '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' cursor-agent --print < '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' grok --prompt-file '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' kimi --prompt 'Read the debugging prompt at <prompt-path> and follow its repair and verification instructions.'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' muse exec --prompt-file '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' opencode run < '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' pi --print < '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' qwen < '<prompt-path>'
env OPENCLAW_STATE_DIR='<state-dir>' OPENCLAW_CONFIG_PATH='<config-path>' OPENCLAW_WORKSPACE_DIR='<default-workspace-dir>' openclaw triage --run
```

捕获的更新失败将 `--update-result <saved-failure-path>` 添加到嵌入命令中。外部命令使用其代理的本机工具策略，包括 Kimi 代码的自动权限。反重力的保存命令启动交互式会话。分类不会添加任何权限覆盖。使用`openclaw triage --agent <name>`启动会话； Kimi 代码仍然是单提示运行。

打印的 Windows 命令以 PowerShell 为目标，包括 Windows PowerShell 5.1. 它们将保存的提示读取为 UTF-8，保留文字路径，并在命令完成后恢复安装选择器。 WSL 使用 POSIX shell 命令。

JSON 输出还包括 `detectedAgents`，列出在 `PATH` 上找到的外部代理。使用 JSON 输出、非 TTY 会话或 `--non-interactive` 的独立分类永远不会启动代理，即使使用 `--agent` 也是如此。 Codex 命令在 Git 签出之外工作。它不会更改 Codex 沙箱或审批设置。

<a id="automatic-failure-handoff" />

## <a id="unattended-failure-diagnostics"></a> 无人值守故障诊断

无人值守更新、托管更新切换和记录的前台网关启动故障无需启动代理即可保存诊断。更新结算和服务恢复先运行。更换软件包后，安装的 CLI 会收集 `--non-interactive` 或 `--json` 的诊断信息。失败输出和原来的退出状态保持不变。当更新使用 JSON 输出时，诊断将转到 stderr。

输出命名保存的故障工件和显式选择加入命令：

```bash
openclaw triage --run --update-result <path>
```

在网关主机上的交互式终端中运行该命令，保留打印的安装选择器。它使用您配置的推理和现有的嵌入式修复行为。交互式更新仍然提供 **诊断更新失败** 并在启动代理之前需要肯定的是。

丢失或不兼容安装的 CLI 会留下保存的故障工件和手动指导。现有的所有权、架构、启动清理和取消拒绝保留其行为。旧版本承认的本机恢复切换在升级过程中保留其权限和清理检查，但新的 CLI 仅收集诊断信息。实时或不确定的索赔留给其生命周期所有者；当之前的工作可能仍在运行时，请勿删除它们。

## <a id="output-and-exit-codes"></a> 输出和退出代码

该提示将写入状态目录内的 `logs/support/` 中，具有仅限所有者的权限，以及诊断存档和已清理的更新失败（如果可用）。打印提示和存档路径，`--json` 返回它们以及按严重性和切换命令查找计数。

如果无法保存支持工件，分类会报告存储错误。它仍然将内存中的提示传递给可用的交互式代理，包括明确请求的嵌入转向。它不会报告失败写入的已保存提示路径。独立 JSON 输出、非交互式会话和没有可启动切换的会话保留非零工件故障。这些显式诊断运行永远不会自动启动代理。

启动的外部代理继承当前环境，并固定捕获的安装状态、配置和默认工作区选择器。打印的命令固定相同的选择器并保留 shell 引用。外部代理仍然控制自己的 shell 环境和执行策略。保持本机的交接。分类退出并显示已启动代理的退出代码。如果代理无法启动，分类将打印其手动命令并以非零值退出。它不会尝试其他提供商。失败的嵌入式推理检查、不支持的执行路径或没有交互式终端的 `--run` 也会以非零值退出。保存的提示和手动切换命令仍然可用。

当其验证证明解决问题时，嵌入式修复以 0 退出；当时间预算停止运行时，嵌入式修复以 2 退出；对于其他不完整或不可用的修复，则以 1 退出。留下错误或未经验证的更新的改进仍然是不完整的。

## <a id="options"></a> 选项

| 选项                   | 作用                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `--json`                 | 发出提示和存档路径、查找计数、检测到的代理和命令。                                                  |
| `--no-export`            | 跳过诊断存档；仍然准备提示并使用所选的切换路线。                                     |
| `--agent <name>`         | 选择 `agy`、`claude`、`codex`、`cursor`、`grok`、`kimi`、`muse`、`opencode`、`pi` 或`qwen`代替自动检测。 |
| `--run`                  | 通过安装或更新分辨率验证运行一轮有界嵌入式修复。                                        |
| `--non-interactive`      | 在不提示或启动代理的情况下准备诊断，包括在终端上。                                           |
| `--update-result <path>` | 包括由更新程序编写的有限更新失败 JSON 诊断工件。                                           |

`--run` 不能与 `--json`、`--non-interactive` 或 `--agent` 组合使用。

相关：[Doctor](/cli/doctor)、[Gateway](/cli/gateway) 和 [ 故障排除 ](/help/troubleshooting)。
