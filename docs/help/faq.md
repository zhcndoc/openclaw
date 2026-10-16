---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - "回答常见的设置、安装、入门或运行时支持问题"
  - "在深入调试前先对用户报告的问题进行分流"
title: "FAQ"
---

针对真实环境部署的快速回答和更深入的故障排查（本地开发、VPS、多智能体、OAuth/API 密钥、模型故障切换）。运行时诊断请参见 [故障排查](/gateway/troubleshooting)。完整配置参考请参见 [配置](/gateway/configuration)。

此页是一个索引。日常 FAQ 分为十三页，每个主题一页。分诊阶梯保留在该页面上；打开与您的问题相符的页面。

| 页面                                                                                       | 读它的时候                                                                    |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [什么是OpenClaw？](/help/faq/what-is-openclaw)                                            | 您正在评估 OpenClaw，或解释它是什么以及谁资助它。         |
| [技能与自动化](/help/faq/skills-and-automation)                                   | 您正在自定义技能，或者 cron 作业、提醒或子代理行为不当。    |
| [沙箱和内存](/help/faq/sandboxing-and-memory)                                   | 您正在调整沙箱，或者内存不持久。                        |
| [ 磁盘上的内容](/help/faq/where-things-live-on-disk)                           | 您需要查找、备份、移动或删除 OpenClaw 数据。                       |
| [配置基础](/help/faq/config-basics)                                                   | 您正在编辑配置、启用网络搜索或从 `config.apply` 恢复。 |
| [远程网关和节点](/help/faq/remote-gateways-and-nodes)                           | 您在 VPS 或其他计算机上运行网关，或者您正在添加节点。      |
| [Env 变量和 .env 加载](/help/faq/env-vars)                                            | 您正在通过 env 或 `.env` 设置密钥，或者服务丢失它们。           |
| [会话和多个聊天](/help/faq/sessions-and-chats)                                | 您正在管理会话、重置、上下文限制、组或多个机器人。     |
| [网关端口，已运行，远程模式](/help/faq/gateway-ports-and-remote-mode) | 网关不会绑定，表示它已经在运行，或者您需要远程模式。 |
| [记录和调试](/help/faq/logging-and-debugging)                                   | 您需要记录日志或重新启动服务，否则永远不会收到回复。                    |
| [媒体和附件](/help/faq/media-and-attachments)                                   | 技能生成了图像或 PDF，但没有发送任何内容。                          |
| [安全和访问控制](/help/faq/security-and-access-control)                       | 您正在将 OpenClaw 暴露给入站消息或判断插件风险。           |
| [聊天命令、中止任务和停止运行](/help/faq/chat-commands-and-stopping)  | 任务不会停止，或者您正在调整斜杠命令和队列。           |

## <a id="first-60-seconds-if-something-is-broken"></a> 出问题后的前 60 秒

<Steps>
  <Step id="quick-status" title="快速状态">
    ```bash
    openclaw status
    ```
    快速本地摘要：OS + 更新、Gateway/service 可访问性、agents/sessions、提供程序配置 + 运行时问题（当网关可访问时）。
  </Step>
  <Step id="pasteable-report-safe-to-share" title="可粘贴的报告（安全共享）">
    ```bash
    openclaw status --all
    ```
    只读诊断，附带日志尾部（令牌已脱敏）。
  </Step>
  <Step id="daemon-%2B-port-state" title="守护进程+端口状态">
    ```bash
    openclaw gateway status
    ```
    显示主管运行时与 RPC 可访问性、检查目标 URL 以及服务可能使用的配置。
  </Step>
  <a id="deep-probes" />

  <Step id="deep-checks" title="深度检查">
    ```bash
    openclaw status --deep
    ```
    实时网关运行状况检查，包括支持时的通道检查（需要可访问的网关）。请参阅 [Health](/gateway/health)。
  </Step>
  <Step id="tail-the-latest-log" title="跟踪最新日志">
    ```bash
    openclaw logs --follow
    ```
    如果 RPC 挂了，可改用：
    ```bash
    tail -f "/tmp/openclaw/openclaw-$(date +%F).log"
    # Named profile example:
    tail -f "/tmp/openclaw/openclaw-dev-$(date +%F).log"
    ```
    文件日志与服务日志是分开的；参见 [日志记录](/logging) 和 [故障排除](/gateway/troubleshooting)。
  </Step>
  <Step id="run-the-doctor-repairs" title="跑医生（修理）">
    ```bash
    openclaw doctor
    ```
    Repairs/migrates 配置和状态，然后运行运行状况检查。请参见 [Doctor](/gateway/doctor)。
  </Step>
  <Step id="gateway-snapshot-ws-only" title="网关快照（仅WS-）">
    ```bash
    openclaw health --json
    openclaw health --verbose   # shows the target URL + config path on errors
    ```
    向正在运行的网关请求完整快照。请参阅 [Health](/gateway/health)。
  </Step>
</Steps>

## <a id="quick-start-and-first-run-setup"></a> Quick start 和首次运行设置

首次运行问答 - 安装、载入、身份验证路由、订阅、初始故障 - 位于 [ 首次运行 FAQ](/help/faq-first-run) 上。

## <a id="models%2C-failover%2C-and-auth-profiles"></a><a id="models-failover-and-auth-profiles"></a> 模型、故障转移和认证配置文件

模型问答 - 默认、选择、别名、切换、故障转移、身份验证配置文件 - 存在于 [ 模型 FAQ](/help/faq-models) 上。

## <a id="miscellaneous"></a> 其他

<AccordionGroup>
  <Accordion id="what-is-the-default-model-for-anthropic-with-an-api-key" title='带有 API 密钥的 Anthropic 的默认模型是什么？'>
    证书和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在身份验证配置文件中存储 Anthropic API 密钥）可启用身份验证，但实际的默认模型是您在 `agents.defaults.model.primary` 中配置的任何模型（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。 `No credentials found for profile "anthropic:default"` 表示网关在运行代理可用的 SQLite 身份验证存储中找不到 Anthropic 凭证。
  </Accordion>
</AccordionGroup>

---

仍然无法解决？请在 [Discord](https://discord.com/invite/clawd) 中提问，或使用 [GitHub issue 选择器](https://github.com/openclaw/openclaw/issues/new/choose)。

## <a id="where-each-section-moved"></a> 各部分移动的地方

之前单页版本中的每个问题标题都保留在此处，因此现有链接（例如 `/help/faq#where-things-live-on-disk`）仍然可以解析。每个条目都指向现在包含答案的页面。

- <a id="what-is-openclaw%3F" /><a id="what-is-openclaw" />[什么是OpenClaw？](/help/faq/what-is-openclaw#what-is-openclaw)
- <a id="what-is-openclaw-in-one-paragraph" />[OpenClaw 是什么？](/help/faq/what-is-openclaw#what-is-openclaw-in-one-paragraph)
- <a id="can-my-team-share-one-openclaw" />[我的团队可以共用一个OpenClaw吗？](/help/faq/what-is-openclaw#can-my-team-share-one-openclaw)
- <a id="value-proposition" />[价值主张](/help/faq/what-is-openclaw#value-proposition)
- <a id="i-just-set-it-up-what-should-i-do-first" />[I 只是设置 - 我应该先做什么？](/help/faq/what-is-openclaw#i-just-set-it-up-what-should-i-do-first)
- <a id="what-are-the-top-five-everyday-use-cases-for-openclaw" />[ OpenClaw 的前五个日常用例是什么？](/help/faq/what-is-openclaw#what-are-the-top-five-everyday-use-cases-for-openclaw)
- <a id="can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas" />[ OpenClaw 可以为 SaaS 提供潜在客户开发、外展、广告和博客方面的帮助吗？](/help/faq/what-is-openclaw#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
- <a id="is-openclaw-owned-by-openai" />[OpenClaw是OpenAI拥有的吗？](/help/faq/what-is-openclaw#is-openclaw-owned-by-openai)
- <a id="what-does-openclaw-send-to-the-foundation" />[ OpenClaw 向基金会发送什么？](/help/faq/what-is-openclaw#what-does-openclaw-send-to-the-foundation)
- <a id="how-is-openclaw-funded-and-how-does-that-compare" />[ OpenClaw 的资金来源如何，比较如何？](/help/faq/what-is-openclaw#how-is-openclaw-funded-and-how-does-that-compare)
- <a id="what-are-the-advantages-vs-claude-code-for-web-development" />[ Web开发与Claude Code相比有什么优势？](/help/faq/what-is-openclaw#what-are-the-advantages-vs-claude-code-for-web-development)
- <a id="skills-and-automation" />[技能与自动化](/help/faq/skills-and-automation#skills-and-automation)
- <a id="how-do-i-customize-skills-without-keeping-the-repo-dirty" />[如何在不弄脏仓库的情况下自定义技能？](/help/faq/skills-and-automation#how-do-i-customize-skills-without-keeping-the-repo-dirty)
- <a id="can-i-load-skills-from-a-custom-folder" />[我可以从自定义文件夹加载技能吗？](/help/faq/skills-and-automation#can-i-load-skills-from-a-custom-folder)
- <a id="how-can-i-use-different-models-or-settings-for-different-tasks" />[如何针对不同的任务使用不同的模型或设置？](/help/faq/skills-and-automation#how-can-i-use-different-models-or-settings-for-different-tasks)
- <a id="the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that" />[机器人在执行繁重工作时冻结。我如何卸载它？](/help/faq/skills-and-automation#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
- <a id="how-do-thread-bound-subagent-sessions-work-on-discord" />[ 线程绑定子代理会话如何在 Discord 上工作？](/help/faq/skills-and-automation#how-do-thread-bound-subagent-sessions-work-on-discord)
- <a id="a-subagent-finished-but-the-completion-update-went-to-the-wrong-place-or-never-posted-what-should-i-check" />[A 子代理已完成，但完成更新去了错误的地方或从未发布。我应该检查什么？](/help/faq/skills-and-automation#a-subagent-finished-but-the-completion-update-went-to-the-wrong-place-or-never-posted-what-should-i-check)
- <a id="cron-or-reminders-do-not-fire-what-should-i-check" />[Cron 或提醒不会触发。我应该检查什么？](/help/faq/skills-and-automation#cron-or-reminders-do-not-fire-what-should-i-check)
- <a id="cron-fired-but-nothing-was-sent-to-the-channel-why" />[Cron 已触发，但没有任何内容发送到通道。为什么？](/help/faq/skills-and-automation#cron-fired-but-nothing-was-sent-to-the-channel-why)
- <a id="why-did-an-isolated-cron-run-switch-models-or-retry-once" />[为什么隔离的cron运行切换模型或重试一次？](/help/faq/skills-and-automation#why-did-an-isolated-cron-run-switch-models-or-retry-once)
- <a id="how-do-i-install-skills-on-linux" />[如何在Linux上安装技能？](/help/faq/skills-and-automation#how-do-i-install-skills-on-linux)
- <a id="can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background" />[ OpenClaw可以在后台定时或连续运行任务吗？](/help/faq/skills-and-automation#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
- <a id="can-i-run-apple-macos-only-skills-from-linux" />[我可以运行Apple macOS-仅来自Linux的技能吗？](/help/faq/skills-and-automation#can-i-run-apple-macos-only-skills-from-linux)
- <a id="do-you-have-a-notion-or-heygen-integration" />[ 您有 Notion 或 HeyGen 集成吗？](/help/faq/skills-and-automation#do-you-have-a-notion-or-heygen-integration)
- <a id="how-do-i-use-my-existing-signed-in-chrome-with-openclaw" />[如何将现有登录的 Chrome 与 OpenClaw 一起使用？](/help/faq/skills-and-automation#how-do-i-use-my-existing-signed-in-chrome-with-openclaw)
- <a id="sandboxing-and-memory" />[沙箱和内存](/help/faq/sandboxing-and-memory#sandboxing-and-memory)
- <a id="is-there-a-dedicated-sandboxing-doc" />[有专用的沙箱文档吗？](/help/faq/sandboxing-and-memory#is-there-a-dedicated-sandboxing-doc)
- <a id="docker-feels-limited-how-do-i-enable-full-features" />[Docker 感觉有限 - 如何启用全部功能？](/help/faq/sandboxing-and-memory#docker-feels-limited-how-do-i-enable-full-features)
- <a id="can-i-keep-dms-personal-but-make-groups-public-sandboxed-with-one-agent" />[ 我可以将 DM 保持为私人状态，但可以使用一名代理进行群组 public/sandboxed 吗？](/help/faq/sandboxing-and-memory#can-i-keep-dms-personal-but-make-groups-public-sandboxed-with-one-agent)
- <a id="how-do-i-bind-a-host-folder-into-the-sandbox" />[如何将主机文件夹绑定到沙箱中？](/help/faq/sandboxing-and-memory#how-do-i-bind-a-host-folder-into-the-sandbox)
- <a id="how-does-memory-work" />[ 内存是如何工作的？](/help/faq/sandboxing-and-memory#how-does-memory-work)
- <a id="memory-keeps-forgetting-things-how-do-i-make-it-stick" />[记忆总是忘记事情。如何让它粘住？](/help/faq/sandboxing-and-memory#memory-keeps-forgetting-things-how-do-i-make-it-stick)
- <a id="does-memory-persist-forever-what-are-the-limits" />[记忆会永远存在吗？有什么限制？](/help/faq/sandboxing-and-memory#does-memory-persist-forever-what-are-the-limits)
- <a id="does-semantic-memory-search-require-an-openai-api-key" />[语义记忆搜索是否需要 OpenAI API 密钥？](/help/faq/sandboxing-and-memory#does-semantic-memory-search-require-an-openai-api-key)
- <a id="where-things-live-on-disk" />[ 磁盘上的内容](/help/faq/where-things-live-on-disk#where-things-live-on-disk)
- <a id="is-all-data-used-with-openclaw-saved-locally" />[ OpenClaw使用的所有数据都保存在本地吗？](/help/faq/where-things-live-on-disk#is-all-data-used-with-openclaw-saved-locally)
- <a id="where-does-openclaw-store-its-data" />[ OpenClaw 在哪里存储其数据？](/help/faq/where-things-live-on-disk#where-does-openclaw-store-its-data)
- <a id="where-should-agents-md-soul-md-user-md-memory-md-live" />[ AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该住在哪里？](/help/faq/where-things-live-on-disk#where-should-agents-md-soul-md-user-md-memory-md-live)
- <a id="can-i-make-soul-md-bigger" />[我可以把SOUL.md做大吗？](/help/faq/where-things-live-on-disk#can-i-make-soul-md-bigger)
- <a id="recommended-backup-strategy" />[推荐备份策略](/help/faq/where-things-live-on-disk#recommended-backup-strategy)
- <a id="how-do-i-completely-uninstall-openclaw" />[如何彻底卸载OpenClaw？](/help/faq/where-things-live-on-disk#how-do-i-completely-uninstall-openclaw)
- <a id="can-agents-work-outside-the-workspace" />[ 客服人员可以在工作区之外工作吗？](/help/faq/where-things-live-on-disk#can-agents-work-outside-the-workspace)
- <a id="remote-mode-where-is-the-session-store" />[远程模式：会话存储在哪里？](/help/faq/where-things-live-on-disk#remote-mode-where-is-the-session-store)
- <a id="config-basics" />[配置基础](/help/faq/config-basics#config-basics)
- <a id="what-format-is-the-config-where-is-it" />[ 配置是什么格式？在哪里？](/help/faq/config-basics#what-format-is-the-config-where-is-it)
- <a id="i-set-gateway-bind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized" />[I 设置 gateway.bind：“lan”（或“tailnet”），现在没有任何声音/UI 说未经授权的](/help/faq/config-basics#i-set-gateway-bind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
- <a id="why-do-i-need-a-token-on-localhost-now" />[为什么我现在需要本地主机上的令牌？](/help/faq/config-basics#why-do-i-need-a-token-on-localhost-now)
- <a id="do-i-have-to-restart-after-changing-config" />[更改配置后是否需要重新启动？](/help/faq/config-basics#do-i-have-to-restart-after-changing-config)
- <a id="how-do-i-enable-web-search-and-web-fetch" />[如何启用网络搜索（和网络获取）？](/help/faq/config-basics#how-do-i-enable-web-search-and-web-fetch)
- <a id="config-apply-wiped-my-config-how-do-i-recover-and-avoid-this" />[config.apply 擦除了我的配置。如何恢复并避免这种情况？](/help/faq/config-basics#config-apply-wiped-my-config-how-do-i-recover-and-avoid-this)
- <a id="how-do-i-run-a-central-gateway-with-specialized-workers-across-devices" />[如何跨设备运行具有专门工作人员的中央网关？](/help/faq/config-basics#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
- <a id="can-the-openclaw-browser-run-headless" />[ OpenClaw浏览器可以无头运行吗？](/help/faq/config-basics#can-the-openclaw-browser-run-headless)
- <a id="how-do-i-use-brave-for-browser-control" />[如何使用Brave进行浏览器控制？](/help/faq/config-basics#how-do-i-use-brave-for-browser-control)
- <a id="remote-gateways-and-nodes" />[远程网关和节点](/help/faq/remote-gateways-and-nodes#remote-gateways-and-nodes)
- <a id="how-do-commands-propagate-between-telegram-the-gateway-and-nodes" />[命令如何在Telegram、网关和节点之间传播？](/help/faq/remote-gateways-and-nodes#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
- <a id="how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely" />[ 如果网关是远程托管的，我的代理如何访问我的计算机？](/help/faq/remote-gateways-and-nodes#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
- <a id="tailscale-is-connected-but-i-get-no-replies-what-now" />[Tailscale 已连接，但我没有收到回复。现在怎么办？](/help/faq/remote-gateways-and-nodes#tailscale-is-connected-but-i-get-no-replies-what-now)
- <a id="can-two-openclaw-instances-talk-to-each-other-local-vps" />[ 两个 OpenClaw 实例能否相互通信（本地 + VPS）？](/help/faq/remote-gateways-and-nodes#can-two-openclaw-instances-talk-to-each-other-local-vps)
- <a id="do-i-need-separate-vpses-for-multiple-agents" />[ 我是否需要为多个代理提供单独的 VPS？](/help/faq/remote-gateways-and-nodes#do-i-need-separate-vpses-for-multiple-agents)
- <a id="is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps" />[ 在我的个人笔记本电脑上使用节点而不是 VPS 中的 SSH 有好处吗？](/help/faq/remote-gateways-and-nodes#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
- <a id="do-nodes-run-a-gateway-service" />[节点是否运行网关服务？](/help/faq/remote-gateways-and-nodes#do-nodes-run-a-gateway-service)
- <a id="is-there-an-api-rpc-way-to-apply-config" />[是否有 API / RPC 方式来应用配置？](/help/faq/remote-gateways-and-nodes#is-there-an-api-rpc-way-to-apply-config)
- <a id="minimal-sane-config-for-a-first-install" />[首次安装的最小合理配置](/help/faq/remote-gateways-and-nodes#minimal-sane-config-for-a-first-install)
- <a id="how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac" />[如何在 VPS 上设置 Tailscale 并从我的 Mac 进行连接？](/help/faq/remote-gateways-and-nodes#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
- <a id="how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve" />[如何将Mac节点连接到远程网关（Tailscale服务）？](/help/faq/remote-gateways-and-nodes#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
- <a id="should-i-install-on-a-second-laptop-or-just-add-a-node" />[我应该安装在第二台笔记本电脑上还是只添加一个节点？](/help/faq/remote-gateways-and-nodes#should-i-install-on-a-second-laptop-or-just-add-a-node)
- <a id="env-vars-and-.env-loading" /><a id="env-vars-and-env-loading" />[EEnv 变量和 .env 加载](/help/faq/env-vars#env-vars-and-env-loading)
- <a id="how-does-openclaw-load-environment-variables" />[ OpenClaw如何加载环境变量？](/help/faq/env-vars#how-does-openclaw-load-environment-variables)
- <a id="i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now" />[I 通过服务启动网关，我的环境变量消失了。现在怎么办？](/help/faq/env-vars#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
- <a id="i-set-copilot-github-token-but-models-status-shows-shell-env-off-why" />[I 设置为 COPILOT_GITHUB_TOKEN，但模型状态显示“Shell env：关闭”。为什么？](/help/faq/env-vars#i-set-copilot-github-token-but-models-status-shows-shell-env-off-why)
- <a id="sessions-and-multiple-chats" />[会话和多个聊天](/help/faq/sessions-and-chats#sessions-and-multiple-chats)
- <a id="how-do-i-start-a-fresh-conversation" />[我如何开始新的对话？](/help/faq/sessions-and-chats#how-do-i-start-a-fresh-conversation)
- <a id="do-sessions-reset-automatically-if-i-never-send-new" />[如果我从不发送/new，会话会自动重置吗？](/help/faq/sessions-and-chats#do-sessions-reset-automatically-if-i-never-send-new)
- <a id="is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents" />[ 有没有办法让 OpenClaw 实例组成一个团队（一个 CEO 和多个代理）？](/help/faq/sessions-and-chats#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
- <a id="why-did-context-get-truncated-mid-task-how-do-i-prevent-it" />[为什么上下文在任务中被截断？如何预防？](/help/faq/sessions-and-chats#why-did-context-get-truncated-mid-task-how-do-i-prevent-it)
- <a id="how-do-i-completely-reset-openclaw-but-keep-it-installed" />[如何完全重置OpenClaw但保持安装状态？](/help/faq/sessions-and-chats#how-do-i-completely-reset-openclaw-but-keep-it-installed)
- <a id="i-am-getting-context-too-large-errors-how-do-i-reset-or-compact" />[I 收到“上下文太大”错误 - 如何重置或压缩？](/help/faq/sessions-and-chats#i-am-getting-context-too-large-errors-how-do-i-reset-or-compact)
- <a id="why-am-i-seeing-llm-request-rejected-messages-content-tool-use-input-field-required" />[为什么我会看到“LLM 请求被拒绝：messages.content.tool_use.input 字段必填”？](/help/faq/sessions-and-chats#why-am-i-seeing-llm-request-rejected-messages-content-tool-use-input-field-required)
- <a id="why-am-i-getting-heartbeat-messages-every-30-minutes" />[为什么我每 30 分钟就会收到一次心跳消息？](/help/faq/sessions-and-chats#why-am-i-getting-heartbeat-messages-every-30-minutes)
- <a id="do-i-need-to-add-a-bot-account-to-a-whatsapp-group" />[我需要向WhatsApp组添加“机器人帐户”吗？](/help/faq/sessions-and-chats#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
- <a id="how-do-i-get-the-jid-of-a-whatsapp-group" />[如何获取WhatsApp组的JID？](/help/faq/sessions-and-chats#how-do-i-get-the-jid-of-a-whatsapp-group)
- <a id="why-does-openclaw-not-reply-in-a-group" />[为什么OpenClaw在群里不回复？](/help/faq/sessions-and-chats#why-does-openclaw-not-reply-in-a-group)
- <a id="do-groups-threads-share-context-with-dms" />[groups/threads是否与DM共享上下文？](/help/faq/sessions-and-chats#do-groups-threads-share-context-with-dms)
- <a id="how-many-workspaces-and-agents-can-i-create" />[ 我可以创建多少个工作区和代理？](/help/faq/sessions-and-chats#how-many-workspaces-and-agents-can-i-create)
- <a id="can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up" />[我可以同时运行多个机器人或聊天吗（Slack），我应该如何设置？](/help/faq/sessions-and-chats#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- <a id="gateway%3A-ports%2C-%22already-running%22%2C-and-remote-mode" /><a id="gateway-ports-already-running-and-remote-mode" />[网关：端口、“已运行”和远程模式](/help/faq/gateway-ports-and-remote-mode#gateway-ports-already-running-and-remote-mode)
- <a id="what-port-does-the-gateway-use" />[ 网关使用什么端口？](/help/faq/gateway-ports-and-remote-mode#what-port-does-the-gateway-use)
- <a id="why-does-openclaw-gateway-status-say-runtime-running-but-connectivity-probe-failed" />[为什么openclaw网关状态报告正在运行进程但连接失败？](/help/faq/gateway-ports-and-remote-mode#why-does-openclaw-gateway-status-say-runtime-running-but-connectivity-probe-failed)
- <a id="why-does-openclaw-gateway-status-show-config-cli-and-config-service-different" />[为什么openclaw网关状态显示“Config（cli）”和“Config（service）”不同？](/help/faq/gateway-ports-and-remote-mode#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
- <a id="what-does-another-gateway-instance-is-already-listening-mean" />[“另一个网关实例已在侦听”是什么意思？](/help/faq/gateway-ports-and-remote-mode#what-does-another-gateway-instance-is-already-listening-mean)
- <a id="how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere" />[如何在远程模式下运行OpenClaw（客户端连接到其他地方的网关）？](/help/faq/gateway-ports-and-remote-mode#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
- <a id="the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now" />[Control UI 表示“未经授权”（或不断重新连接）。现在怎么办？](/help/faq/gateway-ports-and-remote-mode#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
- <a id="i-set-gateway-bind-tailnet-but-it-listens-only-on-loopback" />[I 设置 gateway.bind tailnet，但它仅侦听环回 ](/help/faq/gateway-ports-and-remote-mode#i-set-gateway-bind-tailnet-but-it-listens-only-on-loopback)
- <a id="can-i-run-multiple-gateways-on-the-same-host" />[我可以在同一主机上运行多个网关吗？](/help/faq/gateway-ports-and-remote-mode#can-i-run-multiple-gateways-on-the-same-host)
- <a id="what-does-invalid-handshake-code-1008-mean" />[“无效握手”/代码1008是什么意思？](/help/faq/gateway-ports-and-remote-mode#what-does-invalid-handshake-code-1008-mean)
- <a id="logging-and-debugging" />[日志记录和调试](/help/faq/logging-and-debugging#logging-and-debugging)
- <a id="where-are-logs" />[日志在哪里？](/help/faq/logging-and-debugging#where-are-logs)
- <a id="how-do-i-start-stop-restart-the-gateway-service" />[ start/stop/restart 如何使用网关服务？](/help/faq/logging-and-debugging#how-do-i-start-stop-restart-the-gateway-service)
- <a id="i-closed-my-terminal-on-windows-how-do-i-restart-openclaw" />[I 在 Windows 上关闭了我的终端 - 如何重新启动 OpenClaw？](/help/faq/logging-and-debugging#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
- <a id="the-gateway-is-up-but-replies-never-arrive-what-should-i-check" />[网关已启动，但回复从未到达。我应该检查什么？](/help/faq/logging-and-debugging#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
- <a id="disconnected-from-gateway-no-reason-what-now" />[“与网关断开连接：无原因”-现在怎么办？](/help/faq/logging-and-debugging#disconnected-from-gateway-no-reason-what-now)
- <a id="telegram-setmycommands-fails-what-should-i-check" />[Telegram setMyCommands 失败。我应该检查什么？](/help/faq/logging-and-debugging#telegram-setmycommands-fails-what-should-i-check)
- <a id="tui-shows-no-output-what-should-i-check" />[TUI 显示无输出。我应该检查什么？](/help/faq/logging-and-debugging#tui-shows-no-output-what-should-i-check)
- <a id="how-do-i-completely-stop-then-start-the-gateway" />[如何完全停止然后启动网关？](/help/faq/logging-and-debugging#how-do-i-completely-stop-then-start-the-gateway)
- <a id="eli5-openclaw-gateway-restart-vs-openclaw-gateway" />[ELI5：openclaw网关重启与openclaw网关](/help/faq/logging-and-debugging#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
- <a id="fastest-way-to-get-more-details-when-something-fails" />[出现故障时获取更多详细信息的最快方法](/help/faq/logging-and-debugging#fastest-way-to-get-more-details-when-something-fails)
- <a id="media-and-attachments" />[媒体和附件](/help/faq/media-and-attachments#media-and-attachments)
- <a id="my-skill-generated-an-image-pdf-but-nothing-was-sent" />[我的技能生成了image/PDF，但没有发送任何内容](/help/faq/media-and-attachments#my-skill-generated-an-image-pdf-but-nothing-was-sent)
- <a id="security-and-access-control" />[安全和访问控制](/help/faq/security-and-access-control#security-and-access-control)
- <a id="is-it-safe-to-expose-openclaw-to-inbound-dms" />[ 将 OpenClaw 暴露给入站 DM 是否安全？](/help/faq/security-and-access-control#is-it-safe-to-expose-openclaw-to-inbound-dms)
- <a id="is-prompt-injection-only-a-concern-for-public-bots" />[ 即时注入只是公共机器人的问题吗？](/help/faq/security-and-access-control#is-prompt-injection-only-a-concern-for-public-bots)
- <a id="is-openclaw-less-safe-because-it-uses-typescript-node-instead-of-rust-wasm" />[ OpenClaw 是否不太安全，因为它使用 TypeScript/Node 而不是 Rust/WASM？](/help/faq/security-and-access-control#is-openclaw-less-safe-because-it-uses-typescript-node-instead-of-rust-wasm)
- <a id="i-saw-reports-about-exposed-openclaw-instances-what-should-i-check" />[I 看到有关暴露的 OpenClaw 实例的报告。我应该检查什么？](/help/faq/security-and-access-control#i-saw-reports-about-exposed-openclaw-instances-what-should-i-check)
- <a id="are-clawhub-skills-and-third-party-plugins-safe-to-install" />[ ClawHub技能和第三方插件可以安全安装吗？](/help/faq/security-and-access-control#are-clawhub-skills-and-third-party-plugins-safe-to-install)
- <a id="should-my-bot-have-its-own-email-github-account-or-phone-number" />[ 我的机器人应该有自己的电子邮件、GitHub 帐户或电话号码吗？](/help/faq/security-and-access-control#should-my-bot-have-its-own-email-github-account-or-phone-number)
- <a id="can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe" />[我可以赋予它对我的短信的自主权吗？这样安全吗？](/help/faq/security-and-access-control#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
- <a id="can-i-use-cheaper-models-for-personal-assistant-tasks" />[ 我可以使用更便宜的模型来执行个人助理任务吗？](/help/faq/security-and-access-control#can-i-use-cheaper-models-for-personal-assistant-tasks)
- <a id="i-ran-start-in-telegram-but-did-not-get-a-pairing-code" />[I 在 Telegram 中运行 /start 但没有获得配对码](/help/faq/security-and-access-control#i-ran-start-in-telegram-but-did-not-get-a-pairing-code)
- <a id="whatsapp-will-it-message-my-contacts-how-does-pairing-work" />[WhatsApp：它会向我的联系人发送消息吗？配对如何进行？](/help/faq/security-and-access-control#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- <a id="chat-commands%2C-aborting-tasks%2C-and-%22it-will-not-stop%22" /><a id="chat-commands-aborting-tasks-and-it-will-not-stop" />[聊天命令、中止任务和“它不会停止”](/help/faq/chat-commands-and-stopping#chat-commands-aborting-tasks-and-it-will-not-stop)
- <a id="how-do-i-stop-internal-system-messages-from-showing-in-chat" />[如何阻止内部系统消息在聊天中显示？](/help/faq/chat-commands-and-stopping#how-do-i-stop-internal-system-messages-from-showing-in-chat)
- <a id="how-do-i-stop-cancel-a-running-task" />[ stop/cancel 如何运行任务？](/help/faq/chat-commands-and-stopping#how-do-i-stop-cancel-a-running-task)
- <a id="how-do-i-send-a-discord-message-from-telegram-cross-context-messaging-denied" />[如何从Telegram发送Discord消息？ （“跨上下文消息传递被拒绝”）](/help/faq/chat-commands-and-stopping#how-do-i-send-a-discord-message-from-telegram-cross-context-messaging-denied)
- <a id="why-does-it-feel-like-the-bot-ignores-rapid-fire-messages" />[为什么感觉机器人“忽略”快速消息？](/help/faq/chat-commands-and-stopping#why-does-it-feel-like-the-bot-ignores-rapid-fire-messages)

## <a id="related"></a> 相关内容

- [首次运行 FAQ](/help/faq-first-run) - 安装、上手、认证、订阅、早期失败
- [模型 FAQ](/help/faq-models) - 模型选择、故障转移、认证配置文件
- [故障排查](/help/troubleshooting) - 以症状为先的分诊。
