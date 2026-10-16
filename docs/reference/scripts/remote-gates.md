---
summary: "可选的远程 PR 门合约和 Testbox 执行-工作区所有权"
read_when:
  - "维护远程 PR 门或诊断 Testbox 执行工作空间不匹配"
title: "远程 PR 门"
---

# <a id="remote-pr-gates"></a> 远程PR门

使用 PR CI 进行广泛证明。当依赖项和当前主机容量合格时，首选集中本地检查来进行可信、有界的工作；本地执行是可选的。有意的远程证明可以涵盖昂贵的检查、繁忙或不合格的本地主机、另一个 OS/device、实时 providers/channels、长 E2E 或繁重的基准测试。当命令准备好时获取并使用最小的经过验证的配置文件。如果排队，仅停止任务拥有的分配并使用 PR CI 或安全本地范围；保留未发现的特定于平台的证据。切勿强制进行严格的本地检查或连锁供应商后备措施。将不受信任的代码保持在无秘密隔离、凭证范围内并隔离 Gateway/state 的状态。在归因红色之前先阅读 CI 故障分类；切勿仅仅为了绿色而重新运行或重新推送。

## <a id="testbox-command-checkout"></a> Testbox命令校验

- `.github/actions/prepare-testbox-shell` 拥有 Testbox shell/working-directory 合约。非交互式登录 shell 保留调用者选择的目录； Hydration 仅适应已知的 Blacksmith 交互 SSH 自动 `cd` 并在准备注册之前探测精确的物理 cwd。请勿将嵌套 shell 强行放入 `GITHUB_WORKSPACE` 或运输结帐中。
- Raw Crabbox 有效负载在同步传输结帐中启动。 `crabbox-wrapper.mjs` 代替 verifies/applies 其源胶囊，并在运行有效负载之前协调准备好的执行工作空间中的依赖关系。保留有意的接收器切换；它的路径名本身并不能识别过时的源。当准备更改时，验证选定的源 bytes/patch 以及目录和 stop/re-warm 租用。

## <a id="optional-remote-gate-modes"></a> 可选远程门模式

- Unset `OPENCLAW_PR_GATES_REMOTE` 默认为 `github`：准备记录 `github_pending` 并将广泛证明推迟到 PR CI。显式 `OPENCLAW_PR_GATES_REMOTE=github` 是等效的。仅当明确需要时，才为旧的完整本地网关选择 `OPENCLAW_PR_GATES_REMOTE=local`。未设置远程选择器的 `OPENCLAW_TESTBOX=1` 保留其完整的托管证明语义；显式冲突的选择器仍然会失败。
- `OPENCLAW_PR_GATES_REMOTE=testbox` 通过 `scripts/crabbox-wrapper.mjs`（与 `check:changed` 相同的委托）在一个隔离的 Blacksmith Testbox 源胶囊中运行订购的 `pnpm build`、`pnpm check --base <captured-fork-base>` 和全套 `pnpm test` 门。胶囊拥有依赖安装；本地准备结帐中没有运行任何包门。仅文档更改仍会跳过 `pnpm test`。 `tbx_` 租赁 ID 和 Actions 在 `.local/gates.env` （`REMOTE_GATES_*`） 和 `.local/prep.md` 中运行 URL 土地。有意将其用于昂贵或特定环境的证明，并立即授予容量；如果排队，则仅停止任务拥有的分配并使用 PR CI 或安全本地范围。切勿链接 Testbox、AWS 和 Hetzner 后备； contributor/fork 代码保留在秘密 CI 或净化的 AWS 上，除非维护者明确批准凭证执行。显式 `OPENCLAW_TEST_PROJECTS_PARALLEL` 和 `OPENCLAW_VITEST_MAX_WORKERS` 值被验证为正整数并转发到远程测试命令。空值保留远程调度程序默认值；此适配器不会转发其他调用者环境变量。
- `OPENCLAW_PR_GATES_REMOTE=crabbox-aws`是显式的 active-org-admin 模式，绝不是队列回退或默认模式。`prepare-gates`记录待处理的句柄；后`prepare-push`证明精确的远程头，`scripts/pr-lib/ci-dispatch.mjs --backend crabbox`同步分派受保护的主发布者并等待其精确头部检查。受信任的工作流程校验和安装已发布的 Crabboxv0.77.0，求解其`/v1/whoami`服务主体，并创建经过净化的代理AWS同理证明`umask 022`， 值得信赖`scripts/crabbox-untrusted-bootstrap.sh`， `pnpm build`， `pnpm check`，以及故障关闭PR-从存储库的更改测试所有者派生测试计划。每个可执行文件更改的路径必须独立解析为具体的匹配测试文件；广泛的后备、部分计划、删除的可执行路径，以及unmatched/config目标被拒绝。只有明确的文档和`AGENTS.md`/`CLAUDE.md`指令表面可能会产生零测试。规范的代理命令绑定了确切的PR基础、头部、引导哈希和计划摘要。出版商要求PR基础作为其不可变工作流程的合并基础SHA并证明每个受保护的主快照与该工作流程相同或源自该工作流程SHA，每次比较时都进行不变的重读。 Main 可能会在长时间远程运行期间前进，但不会在任一发布者验证窗口内前进。它验证其新创建的不可变代理运行、有序的完整事件、准确的代理解析owner/org之间的相关性`/v1/whoami`以及运行、规范引导哈希、精确command/base/head/plan、活动管理员参与者，并打开相同存储库PR之前的目标GitHubActions 添加了工作流程SHA严格总结并发表鲜明的`openclaw/crabbox-gate`；拒绝选秀仍然是合并时的规则。历史经纪人阶段`released` or `cleanup`只有在检查其身份、结果和有序事件后才能证明工作负载。在发布之前，必须运行相同的临时 Crabbox 主目录`crabbox stop --provider aws --id <exact-lease> --wait`并确认完成。等待清理永远不会成功；不确定的清理会保留恢复主目录和准确的 ID，以便稍后等待。只有在成功之后`.local/gates.env`记录provider/run/lease/URL从可信检查中恢复元数据。保留的日志在存在时会被检查，但它是可选的，因为 Crabbox 可以保留零日志字节以确保成功运行。普通的`openclaw/ci-gate`语义保持不变。本机合并可能会添加`--admin`仅当确切的 Crabbox 检查成功时GitHubActions，其不可变的工作流程SHA是最终受保护主快照的祖先，它也必须从第一个合并验证主读取下降，参与者仍然是活跃的组织管理员，并且唯一未满足的所需检查是正常的CI门与GitHub-拥有的工作流程`startup_failure`或公认的托管、未获取、零步`failure`/`timed_out`工作；取消、需要操作、陈旧、指定的运行程序、作业日志文本以及任何失败或执行的工作流程步骤都不会授权绕过。证明基础仍然受到约束`REMOTE_GATES_BASE_SHA`；现场PR基地只能前进到第一个主要阅读的前向祖先。该流程在固定头合并请求之前立即重复此验证。该检查返回的任何较新的 main 都会放弃其权限决策，验证候选树并确定投影，然后在共享中重复完整的权限验证900-second/32-round管理限制。活跃组织会员资格是最终的实时权限读取，之后不会获取或结算；GitHub没有预期基数OID合并前提条件，因此 Crabbox 路径将登陆的南瓜父级与原始准入主快照进行比较`.local/merge-crabbox-parent-audit.json`并在完成合并后报告匹配或干预主要动作。正常的合并路径不执行此审核。

如果需要，在现有的精确令牌锁定恢复后，中断的受保护 Crabbox 准备工作将通过 `scripts/pr prepare-push <PR> --resume-crabbox-run <Actions run ID>` 恢复。这观察到了一项固定发布者的尝试；它永远不会刷新、推送或发送另一个证明。待处理的调度意图和选定的 run/controller/attempt 保留在 `gates.env` 中，直到可信的精确头检查成功。没有记录运行的已接受调度需要明确的运行选择；普通的准备推送拒绝重新分派。遗留待处理的准备工作使用保留的审查基础，如果出版商证明不匹配，则会失败；当前的 main 永远不会被替换。预更改完成的邮票还需要其保留的经纪人运行和租赁以匹配可信支票。它们丢失的 controller/attempt 是从选定的操作运行中固定的，不被视为历史接收证据。保留碱基不匹配需要对原始调度进行调查；简历拒绝而不更改收据或替换今天的主要或支票的基础。
