---
summary: "CI 管理员登陆之前的确切证据和权限要求"
read_when:
  - "调查或维护先前的 CI 管理员准入和继承失败证据"
title: "优先-CI 管理员入场"
---

# <a id="prior-ci-admin-admission"></a> Prior-CI 管理员准入

PR CI 是默认的广泛证明。不要仅仅为了绿色而重新运行或重新推送。修复实际故障并在归因红色之前阅读 CI 发布的故障分类。下面的例外仍然需要确切的证据和现场权威。

显式 `merge-run --admin-evidence <file> --confirmed-operator-admin` 模式是单独的立即压缩准入，而不是 auto/queue 的回退或失败的请求。它验证先前成功的 CI 尝试及其 PR/head 出处，绑定经过审核的预先准备的增量和范围检查证明，并重新验证有效的 organization/repository-admin 权限和有效的审核规则。仅对于归因的预先存在的故障，它还接受存储库写入访问加上活动组织成员身份以及实际编写者对每个有效存储库拥有的 CI-only 规则集的实时 `always`/`pull_requests_only` 绕过。规则集必须仅包含 GitHub 操作 `openclaw/ci-gate`；混合 review/security 策略无法委托此异常。 CI/security 检查后重新检查政策和补助金，并保留现有结果。范围内的土地管理局包括这种继承失败的例外情况；确认操作员标志记录该范围，而不断言机器人是管理员。不会发生授权更改或备用凭证。现有的权威经典保护缺席门仍然是强制性的：通用 REST 404 和许可投影的 GraphQL 空值不能证明缺席。缺少策略读取功能是外部权限阻止程序，而不是隐式回退或提升写入者的权限。此块选中异常，普通专线CI不能登陆。当普通 CI、审核和合并准入成功时，MAINTAIN 编写者可以使用普通 `scripts/pr merge-run`，无需组织管理员或 CI-bypass 权限。修复失败的CI，并在无法读取经典策略时使用该路由；不要更改凭据或提供策略快照来使异常通过。存储库写入访问、组织成员资格、分支策略读取访问、CI 绕过、发布环境批准和生产部署权限是单独的功能。一条路线上的能力缺失并不能证明其他路线的能力。原始冲突解决路由仅允许 pending/skipped `openclaw/ci-gate`。明确批准的 `pre-existing-failure` 归因会绑定当前失败的尝试、有效的门检查运行、测试的 merge/base、未更改的故障输入和检查的资格工件。计划的 PR 作业在同级故障后完成；取消的承保范围仍未运行。

读取 `pr-failure-report` 或 `openclaw/ci-gate`： **具有匹配签名的预先存在的** 无需进一步归属；对于仅包含作业名称的 **pre-existing**，在归因失败之前检查 main 的失败测试。

历史取消的运行保留其经过测试的取消政策，并需要完整的作业和取消会计。独立归属的已取消 Node 测试、`check-prod-types` 或真实网关 UI 根可以分别使用 `failures[].failedStep: { number, workflowJob }`、`checks-node-core-test-nondist-shard`、`check-shard` 或 `checks-ui-e2e-real-gateway`。准入绑定其实时检查运行、完整步骤、单个失败执行步骤、时间戳和未更改的审核工作流程。生产类型和 UI 路线也匹配每个声明的源步骤及其有序时间线。 UI 路由仅允许其显式可选运行程序 setup/cleanup 对，并且需要在其审核的测试入口点之前成功构建私有 QA。其他步骤必须成功，否则可以通过成功的清理来跳过。将取消的结论保留在根证明中；这不是通过报道。除了验证者保留的历史跳过的 producer/missing-artifact 合约之外，抵押品取消作业的失败步骤仍然处于阻塞状态。它的次要证据仍处于取消状态，从未出现在因果根列表中；测试、清理和上传传输失败仍然被阻止。该评论保留了 `tests.result: "fail"` 以及 `tests.preExistingCi` head/run/attempt 的确切归属。普通合并准入拒绝审查；确认的管理路由必须验证相同的失败尝试。如果没有失败步骤绑定，归因已取消的 Node 根需要其匹配的实时 GitHub 操作检查运行和完整的 deadline/cancellation 注释、一致的 head/suite/timestamps、已过的截止日期、一个已取消的测试步骤、没有其他失败的步骤以及未更改的工作流程。在根证明中保留取消状态；它不是快速失败的抵押品或过渡性保险。手动或未经验证的取消仍然被拒绝。分支引起的或不明原因的故障、其他所需的检查、安全性和所需的审查仍然处于阻塞状态。精确头 `github_pending` 的准备工作仍在进行中。 GraphQL 拥有观察和调节； [protected REST PUT](/reference/scripts/github-transport#octopool-string-rewrite-protection) 拥有 SHA-pinned 调度。现有的保留结果拥有 `priorCiAdmin` 证据并保留其 baseline/prior 头部和测试的合并对象。确切的 PR/policy 事实和登陆母公司审核仍然适用；活跃的先前 CI 入场许可可以接受 [ 合并入场合约 ](/reference/scripts/merge-admission) 下经过验证的远期主要运动。有关证据字段和支持的策略限制，请参阅 [ 登陆工作流程](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-pr-maintainer/references/landing.md#explicit-prior-ci-admin-landing)。

## <a id="requalification-on-a-busy-main"></a> 在繁忙的主干线上重新鉴定

管理员尝试重新验证经过验证的快进主要动作，最多 15 分钟和 32 轮，并报告每轮的已用时间。一轮必须在截止日期之前完成。持久合并性重新计算具有与第一个 UNKNOWN 投影相独立的 60 秒稳定窗口，并具有 2 秒、4 秒和 8 秒的退避。在保留意图或分派合并之前耗尽任一边界停止点。飞行中的读取可能会在截止日期后完成，但不能承认合并或开始另一轮。

每一轮都会刷新所需的检查和套件、审查和安全权限、作者成员资格和旁路以及主要内容。独立的 GitHub 读取与最多四个子请求同时运行。 REST 资质在观察和验证之间共享一份完整的检查清单；它在下一轮之前被丢弃。取消的根检查运行和注释也保持新鲜。已完成的历史尝试作业数据、测试合并和源对象相等性、准备好的头增量和操作员证据只能在不间断的、拥有锁的调用及其固定身份中重用。

历史证据先于共享检查清单和最终主要阅读。当前的审查和安全权限随后得到验证。有效的政策会在该工作之后、最终作者检查之前重新阅读，因此 CI-only 拨款不能放弃新收紧的要求。仅本地验证证明 main 的祖先和合并树，检查重叠和关键路径漂移，并将安全审查发布者的受保护源与该确切提示进行比较。丢失物品需要放弃现场权威，具体化准确的提示，并开始新一轮。批准撤销、新的失败套件、更改的出版商来源或非快进的主要运动仍然拒绝入场。审核后的头部、操作锁定和保留结果合约均未更改。
