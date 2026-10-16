---
summary: "运行 doctor，选择一种模式，然后读取只读 lint 报告"
title: "跑医生"
read_when:
  - "你想要运行 doctor 并选择正确的标志"
  - "您需要 CI 或预检自动化的只读运行状况报告"
---

运行 `openclaw doctor` 来修复和迁移 OpenClaw 安装。本页介绍了该命令、其自动化标志和只读 lint 模式。

您可以在更新后运行 Doctor，而无需先启动网关。插件健康检查使用Doctor准备的运行时配置。

当系统代理运行 Doctor 时，它使用来自同一 OpenClaw 安装的单独进程。然后可以运行批量诊断检查，而不会阻塞网关的事件循环。这使用现有的 `--non-interactive` 行为，包括其安全迁移；它不能进行额外的维修。一旦开始，Doctor 就会在取消的调用者解决之前完成并释放其资源，因此取消不能放弃正在进行的迁移。

## <a id="quick-start"></a> 快速开始

```bash
openclaw doctor
```

### <a id="headless-and-automation-modes"></a> 无头和自动化模式

<Tabs>
  <Tab title="--yes">
    ```bash
    openclaw doctor --yes
    ```

    接受默认的非服务维修而不提示，并根据 [ 服务保留和安装漂移规则 ](/cli/doctor/recovery#gateway-service-recovery) 进入维护。

  </Tab>
  <Tab title="--fix">
    ```bash
    openclaw doctor --fix
    ```

    在不提示的情况下应用建议的非服务维修（`--repair` 是别名），并根据 [ 服务保留和安装漂移规则 ](/cli/doctor/recovery#gateway-service-recovery) 进入维护。

  </Tab>
  <Tab title="--lint">
    ```bash
    openclaw doctor --lint
    openclaw doctor --lint --json
    ```

    为 CI 或预检自动化运行结构化健康检查。只读：不执行提示、修复、迁移、重启或状态写入。

  </Tab>
  <Tab title="--fix --force">
    ```bash
    openclaw doctor --fix --force
    ```

    也进行积极的 config/state 维修。维修维护使用相同的服务保存和安装漂移规则；使用预期安装中的 `openclaw gateway install --force` 来替换其启动器和托管环境。

  </Tab>
  <Tab title="--non-interactive">
    ```bash
    openclaw doctor --non-interactive
    ```

    在没有提示的情况下运行，仅应用安全迁移（配置规范化+磁盘状态移动）。跳过需要人工确认的 restart/service/sandbox 操作。旧状态迁移在检测到时仍会自动运行。添加 `--fix` 以进行所有受支持的启动阻止修复（无需提示），包括工作区设置、会话存储、执行批准和审核架构迁移。在数据库快照之前显式修复检查所有权；另一位现场业主必须停下来才能继续维修。格式错误或冲突的保留文件需要错误中指定的手动恢复。

    当共享数据库已经是最新的时，准备工作将使正在运行的网关的工作环境可用。实际架构修复会在后续维护继续之前淘汰旧数据库资源，包括修复清理失败时。

  </Tab>
  <Tab title="--deep">
    ```bash
    openclaw doctor --deep
    ```

    扫描系统服务以获取额外的网关安装 （launchd/systemd/schtasks）。

  </Tab>
</Tabs>

如果插件由于其源捕获磁盘空间不足而无法加载，Doctor 会报告 `ENOSPC` 以及底层文件系统错误。释放受影响的文件系统上的空间并重新运行 Doctor。独立 `--non-interactive` Doctor 退出，代码为 `1`；调用更新的 Doctor 将问题记录为警告，以便更新可以继续，同时保持诊断可见。

使用 `OPENCLAW_GATEWAY_STARTUP_TRACE=1`，Doctor 将每相时序（`doctor.*` 和 `cli.bootstrap.*` 行）打印到 stderr。

要在写入前查看更改，请先打开配置文件：

```bash
cat ~/.openclaw/openclaw.json
```

## <a id="read-only-lint-mode"></a> 只读 lint 模式

`openclaw doctor --lint` 是 `openclaw doctor --fix` 面向自动化的对应模式。它们共享同一个 Doctor 规则注册表，但选择或执行规则的方式并不相同：

| 模式                     | 提示词   | 写入 config/state                        | 输出                 | 用途                       |
| ------------------------ | --------- | ------------------------------------------ | ---------------------- | -------------------------------- |
| `openclaw doctor`        | 是       | 是的，安全迁移和确认修复 | 友好的健康报告 | 指导检查和维修        |
| `openclaw doctor --json` | no        | no                                         | JSON 咨询报告   | 机器可读的操作员检查 |
| `openclaw doctor --fix`  | 有时 | 是，按修复策略写入                    | 友好的修复日志    | 应用已批准的修复        |
| `openclaw doctor --lint` | no        | no                                         | 结构化结果    | CI、预检和审查门禁  |

默认 `doctor --lint` 运行广泛安全的自动化配置文件：检查静态、本地且在 CI 或预检输出中有用的内容。它会跳过建议性的、环境敏感的、实时服务相关的、account/workspace 库存或历史清理的选择加入检查。当您需要完整注册的 lint 审核（包括那些选择加入的检查）时，请使用 `doctor --lint --all`，或者使用 `--only <id>` 进行有针对性的检查。

`doctor --fix` 不使用 lint 默认配置文件，也不接受 `--all`。它运行 Doctor 的有序修复路径：现代健康检查可能提供可选的 `repair()` 实现，而较旧的区域仍然使用其遗留的 Doctor 修复流程。一些 lint 发现仅是有意诊断的，因此 `--lint --all` 中出现的检查并不意味着 `--fix` 会改变该区域。该合约将 `detect()`（报告发现）与 `repair()`（报告 changes/diffs/side 效果）分开，这为未来的 `doctor --fix --dry-run` 保持了开放的路径，而无需将 lint 检查转变为突变规划器。

一些内置检查在内部默认禁用，这样它们仍可用于 `--all`、`--only` 和 Doctor 修复流程，同时不会成为默认 `doctor --lint` 自动化配置文件的一部分。发现的严重性仍会按每条发现分别输出（`info`、`warning` 或 `error`）；默认选择并不代表严重性级别。

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --all
openclaw doctor --lint --only core/doctor/gateway-config --json
```

JSON 输出字段：

- `schemaVersion`：机器可读的 lint 信封版本；在解析其他字段之前对此进行分支
- `ok`：是否有任何发现达到所选严重性阈值
- `checksRun`／`checksSkipped`：数量（因配置文件、`--only` 或 `--skip` 而跳过）
- `findings`：结构化诊断信息，包含 `checkId`、`severity`、`message`，以及可选的 `path`、`line`、`column`、`ocPath`、`source`、`target`、`requirement`、`fixHint`

退出码：

| 代码 | 含义                                                  |
| ---- | -------------------------------------------------------- |
| `0`  | 没有发现达到或超过所选阈值的问题           |
| `1`  | 有一个或多个发现达到所选阈值          |
| `2`  | command/runtime 在发布结果之前失败 |

这些基于阈值的退出代码属于显式 `--lint` 模式，无论有或没有 `--json`。裸机`openclaw doctor --json`在产生其有效负载后保留普通医生建议出口`0`；机器消费者应阅读 `ok` 和 `findings`。输出之前的致命错误保持非零。

在`openclaw update`期间，未能删除Doctor的一次性lint快照会被记录为更新警告，并且不会阻止更新。独立 `doctor --lint` 仍将清理失败报告为错误。更新保留了检查的实际结果；清理警告不会隐藏其他故障。

标志：

- `--severity-min info|warning|error`（默认值为 `warning`）：控制输出内容以及导致非零退出码的内容。
- `--all`：运行所有已注册的 lint 检查，包括默认自动化集合中排除的选择性检查。
- `--only <id>`（可重复）：仅运行指定的检查 ID；未知 ID 被报告为错误发现。
- `--skip <id>`（可重复）：排除某项检查，同时保持其余运行继续进行。
- `--severity-min`、`--all`、`--only` 和 `--skip` 需要 `--lint`。裸露的 `--json` 可以用于咨询性机器可读报告； `--fix` 拒绝它，除非另一个机器模式拥有该输出。
