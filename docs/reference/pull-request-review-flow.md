---
summary: "Barnacle 和 ClawSweeper 的反馈如何帮助 OpenClaw 拉取请求通过评审。"
read_when:
  - "在 Barnacle 或 ClawSweeper 提供反馈后跟进"
  - "请求 ClawSweeper 进行评审"
  - "排查 Barnacle、ClawSweeper、陈旧标签或自动关闭问题"
title: "拉取请求评审流程"
sidebarTitle: "PR 评审流程"
---

本页说明你在打开或更新 OpenClaw 拉取请求后的评审流程：Barnacle 和 ClawSweeper 会做什么，如何根据它们的反馈改进 PR，以及当自动化保持沉默时该检查什么。

Barnacle 和 ClawSweeper 帮助维护者保持评审队列可用。它们不能取代维护者的判断。

## <a id="barnacle"></a> 藤壶

Barnacle 对 GitHub 分类应用固定规则。它查找已知的队列管理案例并以标签、注释或闭包进行响应。

Barnacle 可能会在以下情况下采取行动：

- PR 正文大多为空，或缺少问题背景；
- PR 没有有用的证据；
- a 仅文档、仅测试、仅重构、CI-only 或基础更改缺少链接的维护者上下文；
- 某项更改看起来更适合放在 ClawHub 或某个插件中，而不是核心中；
- 某个分支包含无关工作；
- an 作者有 20 多个公开 PR。

Barnacle 运行于受信任的仓库工作流代码中。它不会检出或运行贡献者代码。

大多数路由标签都是维护者或自动化信号，因此贡献者不需要自己添加标签。

## ClawSweeper

ClawSweeper 是 OpenClaw 存储库的 AI- 辅助审查和维护机器人。它可以审查 PR、评估证据、留下持久的审查意见，并帮助维护人员进行受保护的修复或自动合并流程。

ClawSweeper 的积极结果只是支持性证据，不代表维护者批准。维护者仍然决定 PR 是否以及何时准备好合并。

ClawSweeper 基于队列运行。当你打开一个非草稿 PR 或将草稿标记为准备审查时，它会立即发布一条简短的收据评论，但实际审查仍需等待队列空位。在打开 PR、推送提交或添加审查请求后，不要期待立即获得审查结果。ClawSweeper 运行后的标签更新也可能需要一些时间。

新 PR 进入 ClawSweeper 审核队列。维护人员还可以使用标签或命令对审核、修复或自动合并流程进行排队。对于普通贡献者更新，仅在更新分支、PR 描述、证明或代码后，才要求 ClawSweeper 进行另一次审核。然后使用新的 PR 评论请求新的评论：

```text
@clawsweeper re-review
```

PR 作者也可以使用 `@clawsweeper re-run`；具有仓库写权限的用户可以对任何开放项使用这两个命令中的任意一个。直接的 `@clawsweeper review` 命令仅限维护者使用。请耐心等待：在所请求的更改尚未出现之前再次请求，只会增加队列噪音。

当 ClawSweeper 留下审查对话时，请将其视为普通的审查反馈，并使用下面的后续检查清单。

如果人类贡献者或维护者已经接管了 PR 并正在积极处理它，不要在同一时间召唤 ClawSweeper 或以其他方式处理该 PR。先让人类的审查或修复完成。如果活动停止，请检查作者是否被要求提供证明或进行其他更新。

## <a id="improve-a-pr-during-review"></a> 在审查期间改进 PR

一旦 Barnacle、ClawSweeper 或维护者作出回应，请将该反馈作为该 PR 的下一步检查清单。

1. 阅读 ClawSweeper 的 `Rank-up moves:` 和 `Proof guidance:`，将其作为该 PR 的行动清单。评分和标签只是审查信号，不是固定的合并目标。
2. 推送所请求的代码或文档变更，并在问题、解决方案、用户影响或证据发生变化时更新 PR 描述。
3. 使用与变更相匹配的证据，补充所请求的证明材料。
4. 自行解决已处理的审查对话。只有在你需要维护者或审查者判断时，才回复并保留对话处于打开状态。
5. 仅在分支、PR 描述、证据以及相关 CI 结果都已更新后，再请求重新审查。作者、维护者和 ClawSweeper 之间进行多轮更新与审查循环是正常的。
6. 尽可能保留对 PR 的讨论。仅当 PR 需要维护人员协调、自动化似乎受阻或下一个决策很难在 GitHub 注释中解决时，才在 Discord 上迁移到 `#clawtributors`。包括 PR 链接、当前状态以及具体问题或剩余证据。

请保持 PR 正文为最新状态。评论有助于讨论，但 PR 描述才是维护者和自动化会反复查看的持久摘要。

`status: ⏳ waiting on author` 表示下一步动作在 PR 作者这边：在请求再次审查之前，先更新分支、PR 描述、证明材料，或补充缺失的上下文。

有用的证据包括重点测试输出、CI 结果、屏幕截图、录音、终端输出、实时观察、编辑日志或工件链接。对于视觉变化，请在可行时包括之前和之后的屏幕截图。对于证明文件，最好链接 CI 工件、GitHub- 上传的屏幕截图或录音，或者简短的编辑日志摘录。不要提交生成的证明文件，除非它们是实际文档、测试或产品变更的一部分。

对于行为改变，请使用 [ 边界证明指南 ](/help/testing/writing-tests#prove-behavior-at-the-owning-boundary) 来审查生产路径、提供者请求和 failure/reconstruction 证据。

编辑敏感数据是贡献者的责任。在发布证据之前删除秘密、令牌、私有 URL、用户数据和不相关的日志。

OpenClaw还使用单独的过时的自动化。未分配的问题和 PR 可以在之后标记为过时14闲置天数，然后关闭7空闲的日子多了。分配的 PR 被标记为过时27开放后几天，无论后来的更新如何，然后关闭7没有活动的乏味日子。如果指定了PR仍然处于活动状态，请与维护人员协调处理。

## <a id="maintainer-review-artifacts"></a> 维护者审查工件

`scripts/pr review-artifacts-init <PR>` 为当前审查的头写入 `.local/review.json`。它的默认值在结构上是有效的并且明确未完成：`NEEDS WORK`、`performed: false`、空证据数组和`tests.result: "not_run"`。初始化会保留为相同 PR 和头部标记的现有工件，因此它不会重写旧的或部分填充的评论。

使用审查结果和证据填写 JSON，然后运行 ​​`scripts/pr review-validate-artifacts <PR>`。 JSON 拥有审查权；验证打印其摘要，现有的 `.local/review.md` 不具有权威性。保持枚举值裸露，不带注释，例如 `(allowed: ...)`：

| 字段                              | 接受的值                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `recommendation`                   | `READY FOR /prepare-pr`, `NEEDS WORK`, `NEEDS DISCUSSION`, `NOT USEFUL (CLOSE)` |
| `findings[].severity`              | `BLOCKER`, `IMPORTANT`, `NIT`                                                   |
| `nitSweep.status`（可选扫描） | `none`, `has_nits`                                                              |
| `issueValidation.source`           | `linked_issue`, `pr_body`, `both`                                               |
| `issueValidation.status`           | `valid`, `unclear`, `invalid`, `already_fixed_on_main`                          |
| `behavioralSweep.status`           | `pass`, `needs_work`, `not_applicable`                                          |
| `behavioralSweep.silentDropRisk`   | `none`, `present`, `unknown`                                                    |
| `tests.result`                     | `pass`, `fail`, `not_run`                                                       |
| `docs`                             | `up_to_date`, `missing`, `not_applicable`                                       |
| `changelog`                        | `required`, `not_required`                                                      |

`nitSweep` 是可选的，并且在新模板中被省略。如果提供，则需要 `performed: true`、与 NIT 结果一致的状态以及非空摘要。所需的问题和行为摘要也必须非空，并且每个发现都需要一个严重性。结构有效性并不授权准备：`READY FOR /prepare-pr` 仍需要完成问题和行为审查、已解决的实质性调查结果以及适用的运行时证明。

当有界调查无法建立或完成本地测试失败的安全修复时，请保留 `tests.result: "fail"` 并记录 `tests.investigatedLocalFailures`。它的 `head` 必须是经过严格审查的提交。它的非空`failures`数组记录了每个原始`failure`、`reproductionAttempts`和`evidence`的非空字符串数组以及一个非空`remainingUncertainty`。描述命令和观察到的结果，并参考 PR 中记录的证据。通过重播并不能证明解决问题。

完成的调查可以伴随 READY 建议，而无需将失败的证明变成通过。实质性调查结果、行为审查、所需的 CI、安全检查和强制审查仍然是独立的。仅将 `tests.preExistingCi` 用于其单独的、归因于 CI-failure 工作流程；当地调查未授权 CI 例外。

## <a id="when-automation-stays-quiet"></a> 当自动化保持静默时

当维护者已经在处理该事项、某个审查或修复请求仍在队列中、事件属于常规情况，或者 ClawSweeper 处理通道未配置所请求的操作时，自动化可能会保持静默。

当某个受信任的工作流需要运行不受信任的贡献者代码时，它也可能不会采取行动。在这种情况下，维护者会改用常规审查或更安全的工作流。

## <a id="troubleshooting"></a> 故障排查

维护人员可以将 `OPENCLAW_PR_TOOLING_ROOT` 设置为此存储库的完整签出，以独立于驻留在另一个分支上的主要签出来获取物化的 `scripts/pr` 依赖项。初次校验时环境设置优先于`git config openclaw.pr.toolingRoot /path/to/tooling-checkout`；没有任何一个，依赖源保持不变。版本必须与包装器的信任锚清单匹配。如果不匹配，则会获取单独的干净 `main` 工具检查，快进并与 `pnpm install --frozen-lockfile` 一起安装一次，然后重新检查。脏污或非主要工装拒绝检查并提供维修指导；主要结账永远不会刷新。该设置适用于两个依赖物化切换；就地包装器保留其结账的依赖上下文。包装器代码选择和信任保持不变。

如果主机的默认 Git 损坏，请将 `OPENCLAW_PR_GIT` 设置为绝对 Git 可执行路径。包装器以 10 秒的截止时间检查 Git，并在失败时打印所选路径和 Xcode 恢复提示。 API 速率限制故障可识别所使用的资源，并显示 GraphQL 和 REST 核心余额和重置时间。

如果 ClawSweeper 没有立即响应，请在重试前等待。该服务是基于队列的，反复添加评论或更改标签可能会让该线程更难审查，而不会让队列更快。

在寻求帮助之前，请检查：

- PR 描述是最新的；
- 最新提交包含所请求的更改；
- CI 已完成，或者 PR 正文解释了任何仍然存在的失败为何与该 PR 无关；
- 最新的审查请求是作为 PR 评论发出的： `@clawsweeper re-review`；
- 维护者或贡献者并未已经在积极处理该 PR；
- 最新请求尚未仍处于 ClawSweeper 的正常队列延迟时间内。

如果在 PR 为当前数小时后仍然没有 ClawSweeper 响应，或者如果 PR 似乎被自动化阻止，请在 Discord 上的 `#clawtributors` 中询问。包括 PR 链接、您的期望、询问时间以及自上次机器人评论以来发生的变化。

## <a id="forking-the-automation"></a> 分叉该自动化

希望获得类似审查自动化的项目可以研究或分叉 ClawSweeper：

- [openclaw/clawsweeper](https://github.com/openclaw/clawsweeper)
- [ClawSweeper 文档](https://clawsweeper.bot/)。

## <a id="related"></a> 相关内容

- [贡献指南](https://github.com/openclaw/openclaw/blob/main/CONTRIBUTING.md)
- [CI 流水线](/ci)
