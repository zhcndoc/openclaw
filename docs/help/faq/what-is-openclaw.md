---
summary: "OpenClaw 是什么，它的对象是谁，它是如何资助的，以及它如何比较"
title: "OpenClaw是什么？"
read_when:
  - "您正在评估 OpenClaw 或向某人解释"
  - "您想要所有权、资金或比较答案"
---

## <a id="what-is-openclaw%3F"></a><a id="what-is-openclaw"></a> 什么是 OpenClaw？

<AccordionGroup>
  <Accordion id="what-is-openclaw-in-one-paragraph" title="一段话中的 OpenClaw 是什么？">
    OpenClaw 是一个 AI 助手，您可以在自己的基础设施上运行 - 供您自己使用，或与您的团队共享。它会在您已使用的消息表面上回复（Discord、Google Chat、iMessage、Mattermost、Signal、Slack、Telegram、WebChat、 WhatsApp 以及捆绑的频道插件（例如 QQ Bot），还可以在聊天、会话仪表板和 macOS 面板中执行语音和托管小部件。 **Gateway** 是始终在线的控制平面；助手就是产品。同一网关可以从一个人的 WhatsApp 扩展到具有 [ 多用户会话 ](/concepts/multi-user) 的共享工作区机器人。
  </Accordion>

  <Accordion id="can-my-team-share-one-openclaw" title="我的团队可以共享一台 OpenClaw 吗？">
    是的。共享网关是受支持的一流部署：会话带有不可变的创建者、可分配的所有者以及提示它们的人； Control UI 实时显示谁正在查看和打字；共享会话的提交可以为引导它们的人携带 `Co-authored-by` 预告片。 [命名操作员角色](/gateway/operator-scopes#named-operator-roles)限制了每个队友可以做什么。

    需要遵守的一个边界：网关是一个信任域。与互相信任的人分享；相互敌对的用户需要单独的网关。请参阅 [ 团队设置 ](/start/teams)、[ 多用户模式 ​​](/concepts/multi-user) 和 [ 安全性 ](/gateway/security)。

  </Accordion>

  <Accordion id="value-proposition" title="价值主张">
    OpenClaw 不是“只是一个 Claude 包装器”。它是一个 **本地优先控制平面**，在 **你自己的硬件** 上运行一个能力强大的助手，可从你已经在使用的聊天应用中访问，具备有状态会话、记忆和工具能力－而不必把你的工作流交给托管式 SaaS。

    - **你的设备，你的数据**：可在任何你想要的地方运行 Gateway（Mac、Linux、VPS），并将工作区和会话历史保留在本地。
    - **真实通道，而不是网络沙箱**：Discord/iMessage/Signal/Slack/Telegram/WhatsApp/etc，加上移动语音和托管小部件。
    - **模型无关**：可使用 Anthropic、MiniMax、OpenAI、OpenRouter 等，并支持按代理路由和故障转移。
    - **仅本地选项**：运行本地模型，使所有数据都能留在你的设备上。
    - **多代理路由**：按频道、账号或任务分别设置代理，每个代理都有自己的工作区和默认配置。
    - **开源且可改造**：可检查、扩展并自托管，不受供应商锁定。

    文档：[Gateway](/gateway)、[Channels](/channels)、[多代理](/concepts/multi-agent)、[记忆](/concepts/memory)。

  </Accordion>

  <Accordion id="i-just-set-it-up-what-should-i-do-first" title="我刚刚设置 - 我应该先做什么？">
    比较适合的入门项目：搭建一个网站（WordPress、Shopify 或静态站点）；制作一个移动应用原型（大纲、界面、API 规划）；整理文件和文件夹；连接 Gmail 并自动化摘要或跟进。

    它可以处理大型任务，但最佳实践是将其拆分为多个阶段，并使用子代理并行工作。

  </Accordion>

  <Accordion id="what-are-the-top-five-everyday-use-cases-for-openclaw" title="OpenClaw 的前五个日常用例是什么？">
    - **个人简报**：汇总你关心的收件箱、日历和新闻。
    - **研究与起草**：快速研究、摘要，以及邮件或文档的初稿。
    - **提醒与跟进**：由 cron 或 heartbeat 驱动的提醒和检查清单。
    - **浏览器自动化**：填写表单、收集数据、重复执行网页任务。
    - **跨设备协作**：从手机发送任务，让 Gateway 在服务器上运行，再把结果通过聊天返回给你。

  </Accordion>

  <Accordion id="can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas" title="OpenClaw 能否为 SaaS 提供潜在客户开发、外展、广告和博客方面的帮助？">
    可以，适用于 **研究、资格筛选和起草**：扫描网站、建立候选名单、总结潜在客户、撰写外联或广告文案初稿。

    对于 **外联或广告投放**，请保留人工介入。避免垃圾信息，遵守当地法律和平台政策，并在发送前审查任何内容。让 OpenClaw 负责起草；由你来批准。

    文档：[安全](/gateway/security)。

  </Accordion>

  <Accordion id="is-openclaw-owned-by-openai" title="OpenClaw 是 OpenAI 所有吗？">
    第 OpenClaw 由独立 501（c）（3） 机构 [OpenClaw Foundation](https://openclaw.org) 管理。 OpenAI 是几个捐赠者之一，其创建者在那里工作。捐助者不拥有、控制或指导该项目。 Codex 是 [agentharness](/concepts/agent-runtimes) 插件中的一个，并且没有实验室的模型在代码中享有特权。

  </Accordion>

  <Accordion id="what-does-openclaw-send-to-the-foundation" title="OpenClaw 向基金会发送了什么？">
    默认情况下，每日更新检查包含 OpenClaw 版本、OS、Node 版本和 CPU 架构：与任何软件包注册表看到的信息相同。可选的匿名功能统计信息默认处于关闭状态，并且不携带任何标识符。任何提示、消息、模型名称、密钥、路径或机器标识符都不会发送给基金会。设置 `update.checkOnStart: false` 不发送任何内容。与往常一样，流向您配置的模型提供商和聊天平台的流量是独立的，并流向它们；参见[与OpenClaw一起使用的所有数据都保存在本地吗？](/help/faq/where-things-live-on-disk#is-all-data-used-with-openclaw-saved-locally)。详细信息：[使用遥测和更新检查](/gateway/telemetry)。

  </Accordion>

  <Accordion id="how-is-openclaw-funded-and-how-does-that-compare" title="OpenClaw 是如何资助的？比较如何？">
    该基金会由捐款资助，没有可销售的产品：没有付费等级，没有托管服务，没有代币。它没有风险投资支持。其他一些自托管代理是由风险投资公司建立的，这些公司在设​​置过程中出售其代理提供的订阅。这是激励措施的差异，而不是对其工程的判断；请参阅 [ 治理比较 ](/start/why-openclaw#governance)。

  </Accordion>

  <Accordion id="what-are-the-advantages-vs-claude-code-for-web-development" title="与 Claude Code 相比，Web 开发有哪些优势？">
    OpenClaw 是 **辅助和协调层**，而不是 IDE 的替代品。使用 Claude Code 或 Codex 实现存储库内最快的直接编码循环。使用 OpenClaw 实现持久内存、跨设备访问和工具编排。

    - 会话之间保留持久记忆和工作区。
    - 多平台访问（Telegram、WhatsApp、TUI、WebChat）。
    - 工具编排（浏览器、文件、调度、hooks）。
    - 始终在线的 Gateway（可运行在 VPS 上，并从任何地方交互）。
    - 本地节点 browser/screen/camera/exec.

  </Accordion>
</AccordionGroup>
