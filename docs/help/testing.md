---
summary: "OpenClaw 测试套件的索引，每个读取器作业一页"
read_when:
  - "在本地或 CI 中运行测试时"
  - "添加 model/provider 错误的回归"
  - "调试 gateway + agent 行为时"
title: "测试"
---

OpenClaw 拥有三个 Vitest 套件（unit/integration、e2e、live）以及 Docker 运行程序。本页介绍了每个套件的内容、针对给定工作流程运行哪些命令、实时测试如何发现凭据以及如何为现实世界的 provider/model 错误添加回归。

<Note>
**QA 栈（qa-lab、qa-channel、实时传输通道）** 另有文档说明：

- [QA 概览](/concepts/qa-e2e-automation) - 架构、命令界面、场景编写以及 Matrix 实时通道。
- [成熟度评分卡](/maturity/scorecard) - 发布 QA 证据如何支持稳定性和 LTS 决策。
- [QA 通道](/channels/qa-channel) - 用于仓库支持场景的合成传输插件。

此页面涵盖常规测试套件和Docker/Parallels跑步者。[QA-特定跑步者](#qa-specific-runners)下面列出具体`qa`调用并指向上面的参考文献。
</Note>

此页是一个索引。该测试套件共六页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                | 读它的时候                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [测试套件和命令](/help/testing/suites)                    | 您需要选择一个套件、一个命令或离线回归检查。              |
| [Live 和 Docker/Parallels 工作流程](/help/testing/live-workflows) | 您正在通过实时 Docker 或 Parallels 通道调试真实的提供程序或模型。 |
| [Docker 测试运行器](/help/testing/docker)                         | 您希望 Docker “在 Linux 中工作”通道、它们的调度程序和它们的环境变量。    |
| [QA-特定跑步者](/help/testing/qa-runners)                     | 您正在运行 QA 实验室通道或需要共享 Convex 凭证合约。        |
| [合同测试](/help/testing/contracts)                           | 您更改了频道、提供商或插件 SDK 表面。                             |
| [编写并添加测试](/help/testing/writing-tests)             | 您正在编写测试、回归或可靠性评估。                        |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/help/testing#qa-specific-runners`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start" />[快速入门](/help/testing/suites#quick-start)
- <a id="test-temp-directories" />[测试温度 Directories](/help/testing/writing-tests#test-temp-directories)
- <a id="live-and-docker%2Fparallels-workflows" /><a id="live-and-docker/parallels-workflows" />[Live 和 Docker/Parallels 工作流程](/help/testing/live-workflows#live-and-docker/parallels-workflows)
- <a id="qa-specific-runners" />[QA-特定跑步者](/help/testing/qa-runners#qa-specific-runners)
- <a id="shared-telegram-credentials-via-convex-(v1)" /><a id="shared-telegram-credentials-via-convex-v1" />[通过 Convex 共享 Telegram 凭证 （v1）](/help/testing/qa-runners#shared-telegram-credentials-via-convex-v1)
- <a id="adding-a-channel-to-qa" />[向 QA](/help/testing/qa-runners#adding-a-channel-to-qa) 添加通道
- <a id="test-suites-(what-runs-where)" /><a id="test-suites-what-runs-where" />[测试套件（在哪里运行）](/help/testing/suites#test-suites-what-runs-where)
- <a id="unit-%2F-integration-(default)" /><a id="unit-/-integration-default" />[单位/积分（默认）](/help/testing/suites#unit-/-integration-default)
- <a id="projects-shards-and-scoped-lanes" />[项目、分片和范围通道](/help/testing/suites#projects-shards-and-scoped-lanes)
- <a id="embedded-runner-coverage" />[嵌入式流道覆盖范围](/help/testing/suites#embedded-runner-coverage)
- <a id="vitest-pool-and-isolation-defaults" />[Vitest池和隔离默认值](/help/testing/suites#vitest-pool-and-isolation-defaults)
- <a id="fast-local-iteration" />[快速局部迭代](/help/testing/suites#fast-local-iteration)
- <a id="perf-debugging" />[性能调试](/help/testing/suites#perf-debugging)
- <a id="stability-(gateway)" /><a id="stability-gateway" />[稳定性（网关）](/help/testing/suites#stability-gateway)
- <a id="e2e-(repo-aggregate)" /><a id="e2e-repo-aggregate" />[E2E（回购聚合）](/help/testing/suites#e2e-repo-aggregate)
- <a id="e2e-(gateway-smoke)" /><a id="e2e-gateway-smoke" />[E2E（网关烟雾）](/help/testing/suites#e2e-gateway-smoke)
- <a id="e2e-(control-ui-mocked-browser)" /><a id="e2e-control-ui-mocked-browser" />[E2E（Control UI 模拟浏览器）](/help/testing/suites#e2e-control-ui-mocked-browser)
- <a id="e2e%3A-openshell-backend-smoke" /><a id="e2e-openshell-backend-smoke" />[E2E：OpenShell后端烟雾](/help/testing/suites#e2e-openshell-backend-smoke)
- <a id="live-(real-providers-%2B-real-models)" /><a id="live-real-providers-+-real-models" />[直播（真实供应商+真实模特）](/help/testing/suites#live-real-providers-+-real-models)
- <a id="which-suite-should-i-run%3F" /><a id="which-suite-should-i-run" />[我应该运行哪个套件？](/help/testing/suites#which-suite-should-i-run)
- <a id="live-(network-touching)-tests" /><a id="live-network-touching-tests" />[现场（网络接触）测试](/help/testing/suites#live-network-touching-tests)
- <a id="docker-runners-(optional-%22works-in-linux%22-checks)" /><a id="docker-runners-optional-works-in-linux-checks" />[Docker 运行程序（可选“在 Linux 中工作”检查）](/help/testing/docker#docker-runners-optional-works-in-linux-checks)
- <a id="docs-sanity" />[文档理智](/help/testing/suites#docs-sanity)
- <a id="offline-regression-(ci-safe)" /><a id="offline-regression-ci-safe" />[离线回归（CI-安全）](/help/testing/suites#offline-regression-ci-safe)
- <a id="agent-reliability-evals-(skills)" /><a id="agent-reliability-evals-skills" />[代理可靠性评估（技能）](/help/testing/writing-tests#agent-reliability-evals-skills)
- <a id="contract-tests-(plugin-and-channel-shape)" /><a id="contract-tests-plugin-and-channel-shape" />[合同测试（插件和通道形状）](/help/testing/contracts#contract-tests-plugin-and-channel-shape)
- <a id="commands" />[命令](/help/testing/contracts#commands)
- <a id="channel-contracts" />[渠道合约](/help/testing/contracts#channel-contracts)
- <a id="provider-contracts" />[提供商合同](/help/testing/contracts#provider-contracts)
- <a id="when-to-run" />[何时运行](/help/testing/contracts#when-to-run)
- <a id="adding-regressions-(guidance)" /><a id="adding-regressions-guidance" />[添加回归（指导）](/help/testing/writing-tests#adding-regressions-guidance)

## <a id="related"></a> 相关内容

- [现场测试](/help/testing-live)
- [测试更新和插件](/help/testing-updates-plugins)
- [CI](/ci)
- [OpenClaw 代理运行时工作流程](/openclaw-agent-runtime) - `src/agents/` 中代理运行时代码的构建、测试和实时验证循环
