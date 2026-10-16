---
doc-schema-version: 1
summary: "私有 QA 堆栈的索引：qa-lab、qa-channel、repo 支持的场景、实时传输通道、传输适配器和报告。"
read_when:
  - "了解 QA 堆栈如何协同工作"
  - "扩展 qa-lab、qa-channel 或传输适配器"
  - "添加基于仓库的 QA 场景"
  - "围绕 Gateway 仪表板构建更高真实性的 QA 自动化"
title: "QA 概览"
---

私有 QA 堆栈以一种更贴近真实、面向通道的方式对 OpenClaw 进行测试，这是单元测试无法做到的。

组成部分：

- `extensions/qa-channel`：带有 DM、频道、线程、反应、编辑和删除表面的合成消息通道。
- `extensions/qa-lab`：调试器 UI、QA 总线、场景运行器，以及用于观察对话记录、 注入入站消息和导出 Markdown 报告的实时传输适配器。
- `qa/`：用于启动任务和基线 QA 场景的基于仓库的种子资产。
- [Mantis](/concepts/mantis)：before/after 实时验证需要真实传输、浏览器屏幕截图、VM 状态和 PR 证据的错误。

此页是一个索引。 QA 堆栈记录在八页上，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                                | 读它的时候                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [命令面](/concepts/qa-e2e-automation/command-surface)                      | 您需要正确的 `qa` 子命令或配置文件支持的 `qa run` 选择器。                                                                                                 |
| [操作流程](/concepts/qa-e2e-automation/operator-flow)                          | 您正在启动 QA 实验室并运行一条通道：可观测性冒烟、Matrix 实时通道、Discord Mantis、Slack 桌面运行器或凭证池运行状况检查。 |
| [场景覆盖](/concepts/qa-e2e-automation/scenario-coverage)                  | 您正在选择跑步的范围，或者您需要多通道套件车道。                                                                                                 |
| [通道 QA 参考](/concepts/qa-e2e-automation/channel-qa-reference)            | 您正在运行 Buzz、Telegram 或 Discord 通道，或者您需要每个实际传输通道接受的标志。                                                             |
| [松弛 QA](/concepts/qa-e2e-automation/slack-qa)                                    | 您正在运行 Slack 通道或配置其工作区、应用程序和范围。                                                                                            |
| [WhatsApp QA 和凭证](/concepts/qa-e2e-automation/whatsapp-and-credentials) | 您正在运行 WhatsApp 通道或从凸池租赁凭证。                                                                                            |
| [扩展 QA 堆栈](/concepts/qa-e2e-automation/extending-the-stack)           | 您正在添加种子资产、提供商模拟通道、传输适配器或通道。                                                                                      |
| [QA 报告](/concepts/qa-e2e-automation/qa-reporting)                            | 您正在阅读 QA 报告、证据文件或字符评估判断报告。                                                                                         |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/concepts/qa-e2e-automation#matrix-live-lane`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="command-surface" />[命令面](/concepts/qa-e2e-automation/command-surface#command-surface)
- <a id="profile-backed-qa-run" />[配置文件支持 `qa run`](/concepts/qa-e2e-automation/command-surface#profile-backed-qa-run)
- <a id="operator-flow" />[操作流程](/concepts/qa-e2e-automation/operator-flow#operator-flow)
- <a id="observability-smokes" />[可观察性烟雾](/concepts/qa-e2e-automation/operator-flow#observability-smokes)
- <a id="matrix-live-lane" />[矩阵直播车道](/concepts/qa-e2e-automation/operator-flow#matrix-live-lane)
- <a id="discord-mantis-scenarios" />[Discord Mantis 场景](/concepts/qa-e2e-automation/operator-flow#discord-mantis-scenarios)
- <a id="mantis-slack-desktop-and-visual-task-runners" />[Mantis Slack 桌面和视觉任务运行器](/concepts/qa-e2e-automation/operator-flow#mantis-slack-desktop-and-visual-task-runners)
- <a id="credential-pool-health-check" />[凭证池健康检查](/concepts/qa-e2e-automation/operator-flow#credential-pool-health-check)
- <a id="live-transport-coverage" /><a id="canonical-scenario-coverage" />[场景覆盖](/concepts/qa-e2e-automation/scenario-coverage#canonical-scenario-coverage)
- <a id="buzz%2C-discord%2C-slack%2C-telegram%2C-and-whatsapp-qa-reference" /><a id="buzz-discord-slack-telegram-and-whatsapp-qa-reference" />[Buzz、Discord、Slack、Telegram 和 WhatsApp QA参考](/concepts/qa-e2e-automation/channel-qa-reference#buzz-discord-slack-telegram-and-whatsapp-qa-reference)
- <a id="shared-cli-flags" />[共享 CLI 标志](/concepts/qa-e2e-automation/channel-qa-reference#shared-cli-flags)
- <a id="buzz-qa" />[Buzz QA](/concepts/qa-e2e-automation/channel-qa-reference#buzz-qa)
- <a id="telegram-qa" />[电报 QA](/concepts/qa-e2e-automation/channel-qa-reference#telegram-qa)
- <a id="discord-qa" />[不和谐 QA](/concepts/qa-e2e-automation/channel-qa-reference#discord-qa)
- <a id="slack-qa" />[松弛 QA](/concepts/qa-e2e-automation/slack-qa#slack-qa)
- <a id="setting-up-the-slack-workspace" />[设置 Slack 工作区](/concepts/qa-e2e-automation/slack-qa#setting-up-the-slack-workspace)
- <a id="whatsapp-qa" />[WhatsApp QA](/concepts/qa-e2e-automation/whatsapp-and-credentials#whatsapp-qa)
- <a id="convex-credential-pool" />[凸凭证池](/concepts/qa-e2e-automation/whatsapp-and-credentials#convex-credential-pool)
- <a id="repo-backed-seeds" />[回购支持种子](/concepts/qa-e2e-automation/extending-the-stack#repo-backed-seeds)
- <a id="provider-mock-lanes" />[提供模拟车道](/concepts/qa-e2e-automation/extending-the-stack#provider-mock-lanes)
- <a id="transport-adapters" />[传输适配器](/concepts/qa-e2e-automation/extending-the-stack#transport-adapters)
- <a id="adding-a-channel" />[添加通道](/concepts/qa-e2e-automation/extending-the-stack#adding-a-channel)
- <a id="scenario-helper-names" />[场景助手名称](/concepts/qa-e2e-automation/extending-the-stack#scenario-helper-names)
- <a id="reporting" />[报告](/concepts/qa-e2e-automation/qa-reporting#reporting)

## <a id="related-docs"></a> 相关文档

- [成熟度记分卡](/maturity/scorecard)
- [个人代理基准测试包](/concepts/personal-agent-benchmark-pack)
- [QA Channel](/channels/qa-channel)
- [测试](/help/testing)
- [仪表盘](/web/dashboard)
