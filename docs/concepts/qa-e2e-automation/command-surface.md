---
doc-schema-version: 1
summary: "`pnpm openclaw qa` 子命令表和配置文件支持的 `qa run` 选择器。"
read_when:
  - "您需要选择正确的 qa 子命令"
  - "您正在为 `qa run` 选择 QA 配置文件"
title: "命令面"
---

## <a id="command-surface"></a> 命令界面

每个 QA 流程都在 `pnpm openclaw qa <subcommand>` 下运行。许多流程都有 `pnpm qa:*` 脚本别名；两种形式都可用。

QA 命令失败将其诊断消息打印到 stderr 并以代码 1 退出。在运行开始之前，参数解析器会报告无效的选项值。

| 命令                                             | 用途                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa run`                                            | 不带 `--qa-profile` 时运行捆绑的 QA 自检；使用 `--qa-profile smoke-ci`、`--qa-profile release` 或 `--qa-profile all` 时，运行由分类体系支持的成熟度配置。                                                                                                  |
| `qa suite`                                          | 针对 QA 网关通道运行存储库支持的场景。 `--runner multipass`使用一次性Linux VM代替主机。                                                                                                                                         |
| `qa coverage`                                       | 输出 YAML 场景覆盖清单（机器输出使用 `--json`；使用 `--match <query>` 查找与已修改行为相关的场景；使用 `--tools` 查看运行时工具夹具覆盖）。                                                                                  |
| `qa parity-report`                                  | 比较两个 `qa-suite-summary.json` 文件的模型轴奇偶校验门，或使用 `--runtime-axis --token-efficiency` 编写 Codex-vs-OpenClaw 运行时奇偶校验和令牌效率报告。                                                                          |
| `qa confidence-report`                              | 根据清单对 QA 证明工件进行分类，生成不含 unknown 项的置信度报告。                                                                                                                                                                               |
| `qa confidence-self-test`                           | 写入预置的负控制 canary，证明置信度门禁能检测漂移。                                                                                                                                                                                   |
| `qa jsonl-replay`                                   | 通过运行时一致性重放测试工具重放精选的 JSONL transcript。                                                                                                                                                                                         |
| `qa character-eval`                                 | 在多个实时模型上运行角色 QA 场景并生成判断报告。请参阅 [ 报告 ](/concepts/qa-e2e-automation/qa-reporting#reporting)。                                                                                                                |
| `qa manual`                                         | 针对选定的 provider/model 通道运行一次性提示。                                                                                                                                                                                                      |
| `qa ui`                                             | 启动 QA 调试器 UI 和本地 QA 总线（别名：`pnpm qa:lab:ui`）。                                                                                                                                                                                                |
| `qa docker-build-image`                             | 构建预制的 QA Docker 镜像。                                                                                                                                                                                                                                 |
| `qa docker-scaffold`                                | 为 QA 仪表板 + 网关通道编写 docker-compose 启动文件。                                                                                                                                                                                            |
| `qa up`                                             | 构建 QA 站点，启动 Docker-backed 堆栈，打印 URL（别名：`pnpm qa:lab:up`；`:fast` 变体添加 `--use-prebuilt-image --bind-ui-dist --skip-ui-build`）。                                                                                              |
| `qa aimock`                                         | 仅启动 AIMock provider server。                                                                                                                                                                                                                              |
| `qa mock-openai`                                    | 仅启动面向场景的 `mock-openai` provider server。                                                                                                                                                                                                        |
| `qa credentials doctor` / `add` / `list` / `remove` | 管理共享的 Convex credential pool。                                                                                                                                                                                                                           |
| `qa buzz`                                           | 针对真实 Buzz relay room 的实时传输通道，使用专用的 driver 和 SUT 身份。                                                                                                                                                                        |
| `qa discord`                                        | 针对真实私有 Discord guild channel 的实时传输通道。                                                                                                                                                                                                   |
| `qa matrix`                                         | QA 实验室 Matrix 针对一次性 Tuwunel 家庭服务器的目录场景。参见[Matrix实时通道](/concepts/qa-e2e-automation/operator-flow#matrix-live-lane)。                                                                                                        |
| `qa slack`                                          | 针对真实私有 Slack channel 的实时传输通道。                                                                                                                                                                                                           |
| `qa telegram`                                       | 针对真实私有 Telegram group 的实时传输通道。                                                                                                                                                                                                          |
| `qa whatsapp`                                       | 针对真实 WhatsApp Web 账户的实时传输通道。                                                                                                                                                                                                             |
| `qa mantis`                                         | 用于实时传输错误的 Before/after 验证运行程序，具有 Discord 状态反应证据、Crabbox desktop/browser 烟雾和 Slack-in-VNC 烟雾。请参阅 [Mantis](/concepts/mantis) 和 [Mantis Slack 桌面 Runbook](/concepts/mantis-slack-desktop-runbook)。 |

### <a id="profile-backed-qa-run"></a> 基于配置的 `qa run`

配置文件支持的 `qa run` 从 `taxonomy.yaml` 读取成员资格，然后通过 `qa suite` 分派已解决的场景。 `--surface` 和 `--category` 过滤选定的配置文件，而不是定义单独的泳道。生成的 `qa-evidence.json` 包括配置文件记分卡摘要，其中包含所选类别计数和缺失的覆盖范围 ID；各个证据条目仍然是测试、覆盖角色和结果的事实来源。分类功能覆盖 ID 是精确的证明目标，而不是别名：主要场景覆盖满足匹配 ID，而次要覆盖保持建议性。每个覆盖范围 ID 恰好是 `taxonomy-surface.feature`，使用 `taxonomy.yaml` 的短表面 ID。场景的单独 `surface` 字段是 execution/reporting 标签（例如，`channel` 或 `runtime-tool`）；它没有定义分类所有权。显式配置文件覆盖范围 ID 选择该 ID 的每个合格主要所有者，并按场景进行重复数据删除。场景文件和分类顺序不影响成员资格或执行顺序。

`scenario.execution.channels` 是一个 OR eligibility 列表：特定 channel 的 runner 可以在所列 channel 中任选一个执行该场景。基于配置的执行会将同一列表扩展到所选 driver 支持的每个 channel，并且只有在每个扩展后的 channel 执行都通过时，配置执行才会通过。这一规则统一适用于每个 taxonomy profile。

精简 evidence 会省略每个条目的 `execution`，并设置 `evidenceMode: "slim"`； `smoke-ci` 默认使用 slim，而 `--evidence-mode full` 会恢复完整条目：

```bash
pnpm openclaw qa run \
  --qa-profile smoke-ci \
  --category channels.conversation-routing-and-delivery \
  --provider-mode mock-openai \
  --output-dir .artifacts/qa-e2e/smoke-ci-profile-dispatch
```

使用 `smoke-ci` 通过模拟模型提供商和 Crabline 本地提供商服务器进行可重复的配置文件证明。使用 `release` 进行 Stable/LTS 对抗实时频道的验证。仅将 `all` 用于显式的全分类证据运行；它选择每个活动成熟度类别，并可以通过 `QA Profile Evidence` GitHub Actions 工作流程与 `qa_profile=all` 进行调度。当命令还需要 OpenClaw 根配置文件时，请将根配置文件放在 QA 命令之前：

```bash
pnpm openclaw --profile work qa run --qa-profile smoke-ci
```
