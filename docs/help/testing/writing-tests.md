---
summary: "行为集成证明、测试价值和成本以及回归创作"
title: "编写和添加测试"
read_when:
  - "您正在编写一个新测试"
  - "您正在为提供程序错误添加回归"
---

## <a id="prove-behavior-at-the-owning-boundary"></a> 证明在所属边界的行为

通过具有固定外部 I/O 固定装置和独立预期值的生产所有者证明呼叫者可见的合同。与模拟的内部决策或整个产品启动相比，更喜欢集中的集成测试和独立的单元合同。列出可信回归以及测试无法证明的内容。

垂直切片工作：失败行为、连贯修复、通过证明。回归必须在原始缺陷上失败，而不是在夹具设置上失败；报告无法提供基线证明。在绿色测试下进行重构，并在合并覆盖范围时保留不同的合同。使用合成内容并防止凭据被捕获。

应用[测试值门](https://github.com/openclaw/openclaw/blob/main/.agents/skills/test-audit/SKILL.md)和[证明策略](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#proof-policy)。对于请求、付费电话、恢复、违约或性能索赔，请在更改代码或证明之前阅读 [ 场景合同 ](/help/testing/boundary-scenarios#scenario-contracts)。太多的私人控制表明所有权分散，不需要仅测试出口。

## <a id="cost-budget"></a> 成本预算

使用 `pnpm test <file> --maxWorkers=1` 测量每个新的或更改的测试文件；报告可用时间和 CI 秒； PR 都说明了两者。

- 长达数秒的测试必须证明合约没有更便宜的层可以做到。长的端到端组合属于仅发布层。
- 每个文件的测试时间低于 5 秒。在 30 秒以上，解释合约以及为什么没有更便宜的层来证明它。
- 按所有者拆分超出计划员作业预算的文件，或考虑 `scripts/lib/ci-node-test-plan.mts` 中的 `RELEASE_ONLY_*`。权衡 PR 与释放检测的风险；保持覆盖范围，无需重复发布测试。保留分配的配置和 process/timer 策略；产品 E2E/live 保持独立。请参见 [ 维护工具路由 ](/ci/scope-and-routing/node-test-lanes)。
- 注入时钟；不要添加实时计时器、睡眠或轮询。通过`src/test-utils/port-claims.ts`声明端口，隔离每个文件的状态，并重用套件级Gateway/process装置；当存在套件级固定装置时，切勿在每次测试时启动一个。导入狭窄的 API，而不是宽泛的桶。修复共享状态；不要添加串行配置或工作引脚。
- 对于已编译的子进程和遗留超时帮助程序，请遵循 [collection/preload 和超时迁移配方 ](/help/testing/fixtures#compiled-subprocesses-and-timeout-helpers)。

## <a id="test-temp-directories"></a> 测试临时目录

使用 [ 临时目录和可执行装置配方 ](/help/testing/fixtures#test-temp-directories) 进行共享清理、裸目录异常和执行时关闭副本。

## <a id="agent-reliability-evals-(skills)"></a><a id="agent-reliability-evals-skills"></a> Agent 可靠性评估（技能）

对于技能选择、合规性和多轮工作流程评估，请使用 [ 夹具指南](/help/testing/fixtures#agent-reliability-evals-skills)。

## <a id="module-mocks-and-export-completeness"></a> Module 模拟和导出完整性

遵循 [mock 配方 ](/help/testing/fixtures#module-mocks-and-export-completeness) 进行导出保存、状态隔离模拟、注释和收缩基线。

## <a id="raw-sqlite-state-access"></a> Raw SQLite 状态访问

在原始数据库读取或文件快照之前，请遵循 [async 关闭合约 ](/help/testing/fixtures#raw-sqlite-state-access)。

<a id="skills-watchers" />

## <a id="skills-discovery"></a> 技能发现

关闭后台工作程序并隔离被动刷新，如 [discovery cleanup](/help/testing/fixtures#skills-discovery) 中所述。

## <a id="flake-triage"></a> 片状分类

遵循规范的 [ 测试失败策略 ](https://github.com/openclaw/openclaw/blob/main/.agents/skills/openclaw-testing/SKILL.md#test-failure-policy)。单独运行前重现原始分片顺序；仅订单失败通常意味着早期文件共享状态泄漏。对夹具状态、缺失的完成信号和产品竞赛进行分类。修复生产者。如果删除导致红色，请在恢复之前阅读其 PR 可接受的权衡。选择重现故障模式的重复计数，而不是固定的干净运行配额。

## <a id="adding-regressions-(guidance)"></a><a id="adding-regressions-guidance"></a> 添加回归测试（指南）

通过真正的规划者传递有限的合成库存和固定时间来解决容量错误。保留覆盖范围、所有权和执行预算主张；在现有的集成测试中保持真实的结帐库存覆盖率。

对于实时提供者错误，更喜欢在达到缺陷的最小生产组合上进行 CI-safe 回归：具有捕获请求的真实适配器、session/history/tool 管道的网关集成或独立解析器单元合约。保持固有的仅限实时检查范围并选择加入。

`src/secrets/target-registry-data.ts` 中的新 `includeInPlan` SecretRef 系列需要在 `src/secrets/exec-secret-ref-id-parity.test.ts` 中进行分类，因此采样遍历段拒绝不能默默地跳过它们。
