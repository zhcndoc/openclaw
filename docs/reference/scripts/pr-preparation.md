---
summary: "scripts/pr 的准备、校正审查、源获取和门绑定"
read_when:
  - "更改 PR 准备、校正审查、源采集或门绑定"
title: "PR 准备"
---

# <a id="pr-preparation"></a> PR 准备

在发布前使用集中的本地检查，并使用 PR CI 进行广泛的证明。一旦更改构建并且其重点测试通过，就打开准备好的 PR；不要在 PR 套件运行之前保留它。下面可选的完整证据模式描述了支持的机制，而不是在 PR 之前运行广泛套件的要求。 ClawSweeper 评论仅供参考；合并入场不会等待机器人评论。

审核转换可识别提交合并或变基解决方案后保留的冲突元数据，包括重命名的文件。每个阶段都必须与其源提交的精确模式和同一路径上的 blob 相匹配，或者是通向提交的解析路径的唯一 Git 检测到的重命名源。不明确或未检测到的重命名仍然会拒绝而不更改索引；保留本机恢复的转换日志。

- 默认代理切换未设置 `OPENCLAW_PR_GATES_REMOTE` 并使用 `merge-run --auto-merge`；显式设置 `OPENCLAW_PR_GATES_REMOTE=github` 选择相同的模式。准备记录`github_pending`装订在已出版的抬头上，无成功证明印章。合并需要完成本地审核、准确准备的头部以及强制执行的`openclaw/ci-gate`；它拒绝已知失败的必需检查，接受待处理的检查，并跳过单独的托管工作流验证及其同步 CI 观察程序。 GitHub 强制执行所需的 CI/security 检查和审查；智能体保留跟进的责任。此模式用 PR 的强制门替换单独预定的 Testbox 证据；现有的完整证据模式仍然可用。接受的请求返回待处理状态，而不是完成状态。遵循维护人员技能的轮询节奏，调查故障和冲突，并通过本机恢复进行协调，直到验证合并和清理。保存已接受或不确定的结果记录；切勿盲目重新提出请求。没有隐式管理或 REST 后备适用于待定门准入；显式授权[prior-CI admin准入](/reference/scripts/prior-ci)是一种单独的模式。
- `prepare-run`、`prepare-gates` 和 `prepare-push` 的门模式验证发生在 PR 读取、锁定获取或准备证据停用之前。选择一种模式：GitHub-挂起调用清除`OPENCLAW_TESTBOX`；已完成的托管证明清除 `OPENCLAW_PR_GATES_REMOTE`。未知或矛盾的选择器必须在不替换保存的证据的情况下失败。此验证不会阻止合并结果协调，其保留意图拥有恢复。
- 仅当明确需要旧的完整本地门时才设置 `OPENCLAW_PR_GATES_REMOTE=local`。 `OPENCLAW_TESTBOX=1` 未设置远程选择器时保留完整的托管模式；将其与显式 `OPENCLAW_PR_GATES_REMOTE=github` 结合起来仍然存在冲突。
- 正常`prepare-init`需要传入头READY。要使用 BLOCKER/IMPORTANT 结果解析经过验证的传入 NEEDS WORK 审核，请显式使用 `scripts/pr prepare-correction-init <PR>`。这仅初始化更正准备，保留传入的评论和贡献者的血统。提交修复，然后使用 `prepare-correction-review-init` 创建单独的精确候选 JSON 审核模板。 JSON单独具有权威性；验证呈现其摘要。独立审查完整更正的候选人并解释每个所需的传入结果的解决方案。门控、推送、同步和合并需要候选人的 READY 审核；更改候选人或即将收到的审查会导致其无效。 Discussion/rejection 判决不能使用此路由。这不会改变规范包装器信任或允许在另一个 PR 上使用未登陆的包装器。更正出版物接受确切候选 `github_pending` 作为待处理的处置，从未成功证明。发布仅通过经过验证的相同树 local/hosted 收据重新绑定其目标；同步和合并保留该绑定。合并仍然需要精确的准备头自动合并准入、强制执行的 `openclaw/ci-gate`，并且没有已知失败的所需检查；实时 review/security 规则仍然执行。已完成的门模式和单独授权的受保护 Crabbox 待定路线仍然可用。
- 在本机更正发布后，新传入的 NEEDS WORK 审查可以在现有的干净、已签名的准备分支上继续使用 `scripts/pr prepare-correction-continue <PR> --expected-head <retained SHA> --expected-tree <tree OID> --incoming-head <hosted SHA> --incoming-review <review JSON OID> --publication-receipt <push|sync> --publication-oid <receipt OID>`。使用 `git hash-object --no-filters` 选择确切的当前 `.local/review.json` 和本机 `prepare-push-result.env` 或 `prepare-sync-result.env` 字节。发布收据必须将旧的传入准备连接到具有相同 local/hosted 树和保留祖先的新托管头；托管头必须是保留候选人的祖先。所有者在更换权限之前重新检查实时 PR 身份、签名的后代、干净的分支、准确的元数据和操作托管。它将之前的准备、更正、发布、基线和门控证据复制并验证到 `.local/prep-evidence.*` 中，然后在不更改 HEAD、索引或源文件的情况下撤销其主动权限。新收到的评论和元数据保持不变。中断的元数据安装保留在现有的过渡日志中，并且只能使用相同的保留身份和证据来恢复；在解决报告的阻塞后重新运行确切的延续。不要重置准备分支或删除保留的转换证据。继续后，初始化并完成新的精确候选校正检查并运行本地门；之前的 READY 评论和门印仍然是历史记录。
- A已审核，已签名的更正被其旧基线阻止可以使用`scripts/pr prepare-baseline-refresh <PR> --expected-head <candidate SHA> --baseline <main SHA> [--resolutions <file>]`。第一次集成还接受 `prepare-correction-init` 之后未更改的、已签名的传入头，其当前确切的审核是 NEEDS WORK 并具有可操作的结果。该录取将创建一个候选者以供审查；它不批准或解决这些调查结果。其签名的绑定记录`incomingSource: true`，保留传入的审查字节，并将现有的准备证据保留为历史。更改的源或现有基线绑定仍然需要更正源或后续审查合同。所选基线必须属于调用的私有捕获的主要祖先。本机所有者重新检查实时传入的 PR 身份、准确的准备分支、干净的源代码、审查字节和操作锁定。它从唯一的 source/baseline 分叉中派生出完整的产品增量，仅将这些路径应用于选定的基线，并以制备源作为第一父项、基线作为第二父项签署候选者。它不执行无限制的合并或接受调用者范围列表。内容重播使用内置的 Git 文本合并精确的私有 blob 文件，独立于工作树属性或配置的合并驱动程序。竞争的 add/add、deletion/type 更改和包含二进制编辑的 NUL- 需要显式解析。冲突需要包含 `version: 1`、`pr`、`sourceHead`、`baselineHead`、`forkBase` 和 `resolutions` 的常规 JSON 清单。每个解决方案都会命名一个计算冲突 `path` 以及确切的 `base`、`source` 和 `baseline` 条目（如果不存在则为 `{mode, oid}` 或 `null`）。其 `resolved` 值为删除的 `null` 或 `{mode, file, sha256}`； `file` 是相对于清单目录的常规文件，其确切字节必须与 SHA-256 匹配。丢失、多余、陈旧或重复的条目将被拒绝。 Gitlinks、directory/file 冲突和本机工件路径拒绝。该命令报告已解析的 Git blob ID 以供独立审查；它保留这些 ID 和模式，而不是可变的解析文件名。在更换主动权限之前，所有者复制并验证 `.local/prep-evidence.*` 中先前的 preparation/review/build/gate 证据。传入的审核字节保持不变。现有的转换日志保留签名的绑定字节，并且恢复在恢复文件并比较和交换准备引用之前验证相同的 source/target/branch。部分过渡拒绝审查和发布。不要删除其日志或保留的证据、重置分支或放弃操作锁定恢复。完成后，初始化并完成新的更正审查，然后在正常发布之前为该确切候选者选择本地门。旧的证据仍然是历史性的。验证会重建不可变的刷新树，并包括原始产品路径（即使基线已包含它们）以及每个后续修复路径。后来签署的修复程序仍然受支持；初始刷新仍然拒绝第二次实现。单独审查的来源可以明确使用 `scripts/pr prepare-baseline-successor <PR> --expected-head <SHA> --expected-tree <OID> --expected-review <OID> --predecessor-head <SHA> --predecessor-binding <OID> --baseline <SHA> [--resolutions <file>]`。这是新的源准入，而不是刷新重试：每个选定的身份必须与签名的 READY 更正和活动前任匹配。其签名版本 1 绑定添加了 `sourceAdmission`，保留了前身身份、确切来源 tree/review 以及整个保留证明链的字节库存。验证递归地重建每个前导和解决方案，保留原始传入审查和完整的 product/fixup 范围，并拒绝更改的证明。恢复只能完成该确切承认的期刊；它不能授权另一位继任者。签名、树、前驱和过渡状态重播在实时 PR 重新验证之前完成。调用本地准备好的事实绑定确切的证据字节和工作树状态；有界本地检出、分支、绑定和锁定检查保护每个权限安装、文件恢复和最终分支 CAS。恢复从同一日志中重建这些事实，而不是接受持久的事实作为新的承认；较晚的拒绝将保留日志和已授权的部分安装。新候选者需要在登机前进行新的独立修正READY；之前的 READY/proof 仍然是历史记录。未落地的实现绝不能自我承认某个功能：在使用前通过现有的可信包装器独立审查并落地此依赖项。门和出版政策不变。
- PR 源获取绑定了由实时 PR 元数据验证的全头 SHA。该确切提交处的现有直接任务拥有的目标引用可以与 Git 的 check-out/rebasing 分支检查重用；缺失、移动、符号或隐藏的引用保留规范源获取及其 filter/error 行为。发布验证使用保留的 `pr-<PR>` 引用，避免在它已经与准备好的头匹配时再次获取。两条路径都会验证确切的提交，并重新检查头部 SHA、分支和存储库身份在获取期间保持不变。 GitHub的异步`refs/pull/<PR>/head`投影不是源权威。所有审查、准备、发布和合并提取都使用此所有者，而不更改私有主检查点或共享跟踪引用。

- Main 新鲜度属于一个 `scripts/pr` 操作：嵌套的 entry/review 守卫共享一个捕获的 Main SHA；门的选择、门后的发布以及CI每次刷新后的合并验证。从 PR 工作树的私有 `FETCH_HEAD` 捕获规范起源的主要部分，而不是稍后的共享引用读取。主刷新从不写入共享 `origin/main`。冷配置获取其现有的 per-PR `temp/pr-<PR>` 分支，而不写入规范的 `FETCH_HEAD`，然后在私有检查点之前从该种子完全初始化；种子不是检查点权限。结账预算随测量的树分配而变化（每个文件至少 4 KiB），上限为四小时；同样的衡量标准也给予 Git 在强制终止之前至少 30 秒、最多 30 分钟的信号清理时间。配置通过现有的锁定通知管道通告其测量的清理余量，以便外部监控器在中断后也加入清理；第二信号强制逃逸不变。分配租约、模板记录和配置观察使用规范存储库 `.local/pr-state`，独立于运营商的状态目录环境。在 Git 运行程序稳定下来并且共享清理所有者证明没有管理条目属于该路径后，失败的本机配置可能仅删除其专门保留的未更改的目录；普通拒绝仅删除空预订，而中断则允许删除部分结账；注册的钩子状态、先前存在的损坏、不确定的进程清理和更改的权限仍然保留。目录清理永远不会释放失败的操作锁。每个独立命令和新配置的工作树都是全新启动的；合并不得跳过遏制、转换恢复、精确头部检查或单独的 Crabbox 权限窗口。
- Native 门规划从捕获的快照中导出一个 candidate/main 叉基，并将其通过 `pnpm check --base` 传递到所有棘轮。传入审稿身份和先前发表收据不选择检查基数；当准备好的候选人合并 main 时，保持这些绑定完整。
- 当显式选择可选的本地完整测试门模式时，将 `OPENCLAW_BUILD_PRIVATE_QA=1` 范围限制为其初始 `pnpm build` 子项，以便普通测试准备可以重用完整工件。保留完整的构建配置文件、新鲜度检查和托管网关围栏；不要在 check/test 工作人员之间导出标志。仅文档构建和 remote/hosted 门模式保留其现有输入。

对于基线绑定更正，发布会验证托管头之外的每个准备好的提交以及由其签名的刷新绑定验证的确切基线。继承的基线历史记录不需要额外的本地签名者信任；任一合并父级上的任务提交仍然需要有效签名。缺失或更改的基线权威机构拒绝在运输选择之前发布。

## <a id="signing-a-baseline-on-another-host"></a> 在另一台主机上签署基线

当准备主机可以验证签名但签名密钥仅在另一台授权主机上可用时，请使用本机请求和继续命令：

```bash
scripts/pr prepare-baseline-signing-request <PR> --expected-head <SHA> --baseline <SHA> --signer <key-fingerprint> [--resolutions <file>]
scripts/pr prepare-baseline-signing-continue <PR> --request <request-OID> --signed-commit <file>
```

对于后继者，请添加 `prepare-baseline-successor` 所需的相同 `--expected-tree`、`--expected-review`、`--predecessor-head` 和 `--predecessor-binding` 身份。这两个命令都使用规范的包装器代码和新的操作锁。现有的同步签名命令仍然可用。

请求命令打印**Awaiting签名**和路径`.local/prepare-baseline-signing.<request-OID>.json`。它保留了主动编制权限和分支。保留该确切请求及其打印的 OID。它包含预期的签名密钥指纹、base64 中的精确未签名提交字节、基线绑定、签出身份和保留的证明清单。支持 SHA-256 SSH 指纹和全大写 OpenPGP 指纹。从运营商授权的签名密钥中选择指纹；仅匹配的作者电子邮件并不能识别该密钥。

仅传输所需的 Git 对象并通过已授权的传输请求。在签名主机上，使用任务拥有的对象存储中的普通 `git commit-tree -S` 以及请求的确切树、有序父级、作者和提交者身份、时间戳和消息。返回完整的 `git cat-file commit` 输出，无需修剪或重写字节。不要将分离的签名拼接到合成提交中。包装器既不提供远程执行桥，也不授予新主机或凭证访问权限。

继续验证完整的签名、预期密钥和确切的未签名有效负载，重建树并保留审查权限，并重新检查实时 PR、证据、结账、分支和当前操作锁。保存的请求绝不是安装候选者的权限。更改的输入拒绝而不替换证据。部分过渡保留现有的本地期刊；使用相同的请求 OID 重复继续，并在解决报告的情况后签名提交。它仅恢复该目标，没有新的时间戳或其他签名请求。安装后，在发布之前完成新的更正审查和本机门资格。

基线准入还支持已由原生 `prepare-push` 或 `prepare-sync` 发布的候选者。其经过验证的出版物收据确定了预期的托管负责人，而原始传入评论保持不变。签名继续和中断的转换恢复验证来自保留的源证据的那些收据，包括在主动准备元数据已停用之后。没有发布收据的匹配的本地和托管负责人不会授权基线准入。安装后会保留经过验证的出版收据以供后来的继任者和出版使用，同时取消前任候选人的审查和门禁权限。

源必须扩展记录的托管头。具有相同树的不同 GitHub 提交别名对于新基线父级来说是不够的。准入还需要所选托管头的本机推送或同步结果：`prep.env` 单独记录已完成的发布，但在基线更改时停用。在更改源或创建请求之前，这些条件会被拒绝。保留证据并首先解决所报告的出版物或祖先状况。
