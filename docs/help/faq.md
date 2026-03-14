---
summary: "关于 OpenClaw 安装、配置和使用的常见问题解答"
read_when:
  - 回答常见的安装、配置、入门或运行时支持问题
  - 在更深入调试前进行用户报告问题的初步筛查
title: "常见问题解答"
---

# 常见问题解答

快速解答以及针对实际环境（本地开发、VPS、多代理、OAuth/API 密钥、模型故障切换）的深入排查。运行时诊断见 [故障排查](/gateway/troubleshooting)。完整配置参考见 [配置指南](/gateway/configuration)。

## 目录

- [快速开始和首次运行设置]
  - [我卡住了，最快的解卡方式是什么？](#im-stuck-whats-the-fastest-way-to-get-unstuck)
  - [推荐的 OpenClaw 安装和设置方式是什么？](#whats-the-recommended-way-to-install-and-set-up-openclaw)
  - [完成入门后，如何打开仪表盘？](#how-do-i-open-the-dashboard-after-onboarding)
  - [在本地与远程上如何对仪表盘进行认证（令牌）？](#how-do-i-authenticate-the-dashboard-token-on-localhost-vs-remote)
  - [我需要什么运行时环境？](#what-runtime-do-i-need)
  - [它能运行在树莓派上吗？](#does-it-run-on-raspberry-pi)
  - [树莓派安装有什么提示？](#any-tips-for-raspberry-pi-installs)
  - [卡在“wake up my friend”阶段 / 入门无法完成，接下来怎么办？](#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
  - [我可以迁移设置到新机器（Mac mini）而无需重新入门吗？](#can-i-migrate-my-setup-to-a-new-machine-mac-mini-without-redoing-onboarding)
  - [在哪里查看最新版本的新功能？](#where-do-i-see-what-is-new-in-the-latest-version)
  - [我无法访问 docs.openclaw.ai（SSL 错误），怎么办？](#i-cant-access-docsopenclawai-ssl-error-what-now)
  - [稳定版和测试版有什么区别？](#whats-the-difference-between-stable-and-beta)
  - [如何安装测试版本，测试版和开发版有什么区别？](#how-do-i-install-the-beta-version-and-whats-the-difference-between-beta-and-dev)
  - [如何尝试最新的功能？](#how-do-i-try-the-latest-bits)
  - [安装和入门通常需要多长时间？](#how-long-does-install-and-onboarding-usually-take)
  - [安装卡住了？如何获取更多反馈？](#installer-stuck-how-do-i-get-more-feedback)
  - [Windows 安装提示找不到 git 或 openclaw 命令不被识别](#windows-install-says-git-not-found-or-openclaw-not-recognized)
  - [Windows 执行输出显示乱码中文，我该怎么办](#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
  - [文档没有回答我的问题——如何获得更好的答案？](#the-docs-didnt-answer-my-question-how-do-i-get-a-better-answer)
  - [如何在 Linux 上安装 OpenClaw？](#how-do-i-install-openclaw-on-linux)
  - [如何在 VPS 上安装 OpenClaw？](#how-do-i-install-openclaw-on-a-vps)
  - [云端/VPS 安装指南在哪里？](#where-are-the-cloudvps-install-guides)
  - [我能让 OpenClaw 自我更新吗？](#can-i-ask-openclaw-to-update-itself)
  - [入门向导实际上做了什么？](#what-does-the-onboarding-wizard-actually-do)
  - [我需要 Claude 或 OpenAI 订阅才能运行吗？](#do-i-need-a-claude-or-openai-subscription-to-run-this)
  - [我能在没有 API key 的情况下使用 Claude Max 订阅吗？](#can-i-use-claude-max-subscription-without-an-api-key)
  - [Anthropic 的“setup-token”认证是怎样的？](#how-does-anthropic-setuptoken-auth-work)
  - [我在哪里能找到 Anthropic 的 setup-token？](#where-do-i-find-an-anthropic-setuptoken)
  - [你们支持 Claude 订阅认证（Claude Pro 或 Max）吗？](#do-you-support-claude-subscription-auth-claude-pro-or-max)
  - [为什么我看到 Anthropic 返回 `HTTP 429: rate_limit_error`？](#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
  - [支持 AWS Bedrock 吗？](#is-aws-bedrock-supported)
  - [Codex 认证是如何工作的？](#how-does-codex-auth-work)
  - [你们支持 OpenAI 订阅认证（Codex OAuth）吗？](#do-you-support-openai-subscription-auth-codex-oauth)
  - [如何设置 Gemini CLI 的 OAuth](#how-do-i-set-up-gemini-cli-oauth)
  - [本地模型适合随便聊天吗？](#is-a-local-model-ok-for-casual-chats)
  - [如何让托管模型流量保持在特定区域？](#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
  - [我必须买 Mac Mini 才能安装吗？](#do-i-have-to-buy-a-mac-mini-to-install-this)
  - [我需要 Mac mini 来支持 iMessage 吗？](#do-i-need-a-mac-mini-for-imessage-support)
  - [如果我买 Mac mini 来运行 OpenClaw，能连接到我的 MacBook Pro 吗？](#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
  - [我能用 Bun 吗？](#can-i-use-bun)
  - [Telegram：`allowFrom` 里填写什么？](#telegram-what-goes-in-allowfrom)
  - [多人能用一个 WhatsApp 号码对应不同的 OpenClaw 实例吗？](#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
  - [能同时运行“快速聊天”代理和“用于编程的 Opus”代理吗？](#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
  - [Homebrew 在 Linux 上能用吗？](#does-homebrew-work-on-linux)
  - [可修改版（git）安装和 npm 安装有什么区别？](#whats-the-difference-between-the-hackable-git-install-and-npm-install)
  - [后续可以在 npm 和 git 安装间切换吗？](#can-i-switch-between-npm-and-git-installs-later)
  - [我应该在笔记本还是 VPS 上运行 Gateway？](#should-i-run-the-gateway-on-my-laptop-or-a-vps)
  - [OpenClaw 运行在专用机器上重要吗？](#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
  - [最小 VPS 需求和推荐的操作系统是什么？](#what-are-the-minimum-vps-requirements-and-recommended-os)
  - [我能在虚拟机中运行 OpenClaw 吗？要求是什么？](#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)
- [什么是 OpenClaw？](#what-is-openclaw)
  - [一段话介绍 OpenClaw 是什么？](#what-is-openclaw-in-one-paragraph)
  - [它的价值主张是什么？](#whats-the-value-proposition)
  - [我刚设置好，第一步该做什么？](#i-just-set-it-up-what-should-i-do-first)
  - [OpenClaw 的五大日常用例是什么？](#what-are-the-top-five-everyday-use-cases-for-openclaw)
  - [OpenClaw 能帮忙做 SaaS 的潜在客户营销广告和博客吗？](#can-openclaw-help-with-lead-gen-outreach-ads-and-blogs-for-a-saas)
  - [OpenClaw 相比 Claude Code 在网页开发上的优势是什么？](#what-are-the-advantages-vs-claude-code-for-web-development)
- [技能和自动化](#skills-and-automation)
  - [如何定制技能而不弄乱代码库？](#how-do-i-customize-skills-without-keeping-the-repo-dirty)
  - [能从自定义文件夹加载技能吗？](#can-i-load-skills-from-a-custom-folder)
  - [如何给不同任务使用不同模型？](#how-can-i-use-different-models-for-different-tasks)
  - [机器人在重负载时冻结，如何卸载这些工作？](#the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that)
  - [定时任务或提醒没触发，我该检查什么？](#cron-or-reminders-do-not-fire-what-should-i-check)
  - [如何在 Linux 上安装技能？](#how-do-i-install-skills-on-linux)
  - [OpenClaw 能否按计划或持续后台运行任务？](#can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background)
  - [能从 Linux 运行 macOS 专属技能吗？](#can-i-run-apple-macos-only-skills-from-linux)
  - [有 Notion 或 HeyGen 的集成吗？](#do-you-have-a-notion-or-heygen-integration)
  - [如何安装浏览器接管用的 Chrome 扩展？](#how-do-i-install-the-chrome-extension-for-browser-takeover)
- [沙箱和内存](#sandboxing-and-memory)
  - [有专门的沙箱文档吗？](#is-there-a-dedicated-sandboxing-doc)
  - [如何绑定宿主文件夹到沙箱？](#how-do-i-bind-a-host-folder-into-the-sandbox)
  - [内存是如何工作的？](#how-does-memory-work)
  - [内存总是忘记东西，如何让它记得？](#memory-keeps-forgetting-things-how-do-i-make-it-stick)
  - [内存会永久保存吗？有限制吗？](#does-memory-persist-forever-what-are-the-limits)
  - [语义记忆搜索需要 OpenAI API key 吗？](#does-semantic-memory-search-require-an-openai-api-key)
- [文件存储位置](#where-things-live-on-disk)
  - [OpenClaw 使用的所有数据都保存在本地吗？](#is-all-data-used-with-openclaw-saved-locally)
  - [OpenClaw 数据存储在哪里？](#where-does-openclaw-store-its-data)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？](#where-should-agentsmd-soulmd-usermd-memorymd-live)
  - [推荐的备份策略是什么？](#whats-the-recommended-backup-strategy)
  - [如何彻底卸载 OpenClaw？](#how-do-i-completely-uninstall-openclaw)
  - [代理能在工作区外工作吗？](#can-agents-work-outside-the-workspace)
  - [我处于远程模式 - 会话存储在哪？](#im-in-remote-mode-where-is-the-session-store)
- [配置基础](#config-basics)
  - [配置是什么格式？在哪？](#what-format-is-the-config-where-is-it)
  - [我设置了 `gateway.bind: "lan"`（或 `"tailnet"`），现在监听失效／UI 显示未授权](#i-set-gatewaybind-lan-or-tailnet-and-now-nothing-listens-the-ui-says-unauthorized)
  - [为什么本地访问现在需要令牌？](#why-do-i-need-a-token-on-localhost-now)
  - [改配置后必须重启吗？](#do-i-have-to-restart-after-changing-config)
  - [如何禁用有趣的 CLI 标语？](#how-do-i-disable-funny-cli-taglines)
  - [如何启用网页搜索（及网页抓取）？](#how-do-i-enable-web-search-and-web-fetch)
  - [config.apply 擦除了我的配置，如何恢复及避免？](#configapply-wiped-my-config-how-do-i-recover-and-avoid-this)
  - [我如何运行带有多个设备专门工作者的集中 Gateway？](#how-do-i-run-a-central-gateway-with-specialized-workers-across-devices)
  - [OpenClaw 浏览器能无头运行吗？](#can-the-openclaw-browser-run-headless)
  - [如何用 Brave 控制浏览器？](#how-do-i-use-brave-for-browser-control)
- [远程网关和节点](#remote-gateways-and-nodes)
  - [Telegram、网关与节点间命令如何传播？](#how-do-commands-propagate-between-telegram-the-gateway-and-nodes)
  - [如果网关远程部署，代理如何访问我的电脑？](#how-can-my-agent-access-my-computer-if-the-gateway-is-hosted-remotely)
  - [Tailscale 已连接但没回应，怎么办？](#tailscale-is-connected-but-i-get-no-replies-what-now)
  - [两个 OpenClaw 实例能通信吗（本地 + VPS）？](#can-two-openclaw-instances-talk-to-each-other-local-vps)
  - [多个代理需要各自的 VPS 吗？](#do-i-need-separate-vpses-for-multiple-agents)
  - [用个人笔记本节点比 VPS SSH 有优势吗？](#is-there-a-benefit-to-using-a-node-on-my-personal-laptop-instead-of-ssh-from-a-vps)
  - [节点运行网关服务吗？](#do-nodes-run-a-gateway-service)
  - [有 API/RPC 方式应用配置吗？](#is-there-an-api-rpc-way-to-apply-config)
  - [首次安装的最小“合理”配置是什么？](#whats-a-minimal-sane-config-for-a-first-install)
  - [如何在 VPS 上设置 Tailscale 并用 Mac 连接？](#how-do-i-set-up-tailscale-on-a-vps-and-connect-from-my-mac)
  - [如何将 Mac 节点连接到远程网关（Tailscale Serve）？](#how-do-i-connect-a-mac-node-to-a-remote-gateway-tailscale-serve)
  - [该在第二台笔记本安装还是仅加节点？](#should-i-install-on-a-second-laptop-or-just-add-a-node)
- [环境变量与 .env 加载](#env-vars-and-env-loading)
  - [OpenClaw 如何加载环境变量？](#how-does-openclaw-load-environment-variables)
  - [“我用服务方式启动网关，环境变量没了”怎么办？](#i-started-the-gateway-via-the-service-and-my-env-vars-disappeared-what-now)
  - [我设置了 `COPILOT_GITHUB_TOKEN`，但模型状态显示“Shell env: off.”，为什么？](#i-set-copilotgithubtoken-but-models-status-shows-shell-env-off-why)
- [会话与多聊](#sessions-and-multiple-chats)
  - [如何开始新对话？](#how-do-i-start-a-fresh-conversation)
  - [如果我从不发 `/new`，会话会自动重置吗？](#do-sessions-reset-automatically-if-i-never-send-new)
  - [能否让一批 OpenClaw 实例形成一个 CEO 和多代理的团队？](#is-there-a-way-to-make-a-team-of-openclaw-instances-one-ceo-and-many-agents)
  - [为什么上下文在任务中途被截断？如何避免？](#why-did-context-get-truncated-midtask-how-do-i-prevent-it)
  - [如何彻底重置 OpenClaw 但保持安装？](#how-do-i-completely-reset-openclaw-but-keep-it-installed)
  - [“上下文过大”错误怎么办？如何重置或压缩？](#im-getting-context-too-large-errors-how-do-i-reset-or-compact)
  - [为什么看到“LLM 请求拒绝：messages.content.tool_use.input 字段是必需的”？](#why-am-i-seeing-llm-request-rejected-messagescontenttool_useinput-field-required)
  - [为什么每 30 分钟收到心跳消息？](#why-am-i-getting-heartbeat-messages-every-30-minutes)
  - [我需要给 WhatsApp 群组添加“机器人账号”吗？](#do-i-need-to-add-a-bot-account-to-a-whatsapp-group)
  - [如何获取 WhatsApp 群组的 JID？](#how-do-i-get-the-jid-of-a-whatsapp-group)
  - [OpenClaw 为什么不在群组回复？](#why-doesnt-openclaw-reply-in-a-group)
  - [群组/线程上下文会跟 DMs 共享吗？](#do-groupsthreads-share-context-with-dms)
  - [我能创建多少个工作区和代理？](#how-many-workspaces-and-agents-can-i-create)
  - [能同时运行多个机器人或聊天（Slack）吗？怎么设？](#can-i-run-multiple-bots-or-chats-at-the-same-time-slack-and-how-should-i-set-that-up)
- [模型：默认、选择、别名、切换](#models-defaults-selection-aliases-switching)
  - [什么是“默认模型”？](#what-is-the-default-model)
  - [推荐使用什么模型？](#what-model-do-you-recommend)
  - [如何切换模型不清除配置？](#how-do-i-switch-models-without-wiping-my-config)
  - [能用自托管模型（llama.cpp、vLLM、Ollama）吗？](#can-i-use-selfhosted-models-llamacpp-vllm-ollama)
  - [OpenClaw、Flawd 和 Krill 用的是什么模型？](#what-do-openclaw-flawd-and-krill-use-for-models)
  - [如何实现即时切换模型（无需重启）？](#how-do-i-switch-models-on-the-fly-without-restarting)
  - [能用 GPT 5.2 做日常任务，Codex 5.3 编码吗？](#can-i-use-gpt-52-for-daily-tasks-and-codex-53-for-coding)
  - [为什么提示“模型 … 不被允许”后无回复？](#why-do-i-see-model-is-not-allowed-and-then-no-reply)
  - [为什么提示“未知模型：minimax/MiniMax-M2.5”？](#why-do-i-see-unknown-model-minimaxminimaxm25)
  - [能用 MiniMax 作为默认模型，复杂任务用 OpenAI 吗？](#can-i-use-minimax-as-my-default-and-openai-for-complex-tasks)
  - [opus / sonnet / gpt 是内置快捷用法吗？](#are-opus-sonnet-gpt-builtin-shortcuts)
  - [如何定义/覆盖模型快捷方式（别名）？](#how-do-i-defineoverride-model-shortcuts-aliases)
  - [如何添加 OpenRouter 或 Z.AI 等其他提供商模型？](#how-do-i-add-models-from-other-providers-like-openrouter-or-zai)
- [模型故障切换和“所有模型失败”](#model-failover-and-all-models-failed)
  - [故障切换是如何工作的？](#how-does-failover-work)
  - [这个错误是什么意思？](#what-does-this-error-mean)
  - [修复 “No credentials found for profile "anthropic:default"” 的清单](#fix-checklist-for-no-credentials-found-for-profile-anthropicdefault)
  - [为什么还尝试了 Google Gemini 并失败？](#why-did-it-also-try-google-gemini-and-fail)
- [认证配置：是什么及如何管理](#auth-profiles-what-they-are-and-how-to-manage-them)
  - [什么是认证配置？](#what-is-an-auth-profile)
  - [常见的配置 ID 是什么？](#what-are-typical-profile-ids)
  - [能控制先尝试哪个认证配置吗？](#can-i-control-which-auth-profile-is-tried-first)
  - [OAuth 和 API key 有何区别？](#oauth-vs-api-key-whats-the-difference)
- [网关：端口、“已运行”状态和远程模式](#gateway-ports-already-running-and-remote-mode)
  - [网关用哪个端口？](#what-port-does-the-gateway-use)
  - [`openclaw gateway status` 显示 `Runtime: running`，但 `RPC probe` 失败，为什么？](#why-does-openclaw-gateway-status-say-runtime-running-but-rpc-probe-failed)
  - [`openclaw gateway status` 显示的 `Config (cli)` 和 `Config (service)` 不一致，为什么？](#why-does-openclaw-gateway-status-show-config-cli-and-config-service-different)
  - [“另一网关实例已在监听”是什么意思？](#what-does-another-gateway-instance-is-already-listening-mean)
  - [如何运行远程模式 OpenClaw（客户端连接别处的网关）？](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)
  - [控制界面显示 “未授权” 或不断重连，怎么办？](#the-control-ui-says-unauthorized-or-keeps-reconnecting-what-now)
  - [设置 `gateway.bind: "tailnet"` 后无法绑定／无监听，怎么办？](#i-set-gatewaybind-tailnet-but-it-cant-bind-nothing-listens)
  - [能在同一主机上运行多个网关吗？](#can-i-run-multiple-gateways-on-the-same-host)
  - [“无效握手”/代码 1008 是什么意思？](#what-does-invalid-handshake-code-1008-mean)
- [日志和调试](#logging-and-debugging)
  - [日志在哪？](#where-are-logs)
  - [如何启动/停止/重启网关服务？](#how-do-i-startstoprestart-the-gateway-service)
  - [我关闭了 Windows 终端，如何重启 OpenClaw？](#i-closed-my-terminal-on-windows-how-do-i-restart-openclaw)
  - [网关启动了，却收不到回复，该检查什么？](#the-gateway-is-up-but-replies-never-arrive-what-should-i-check)
  - [“Disconnected from gateway: no reason”——怎么办？](#disconnected-from-gateway-no-reason-what-now)
  - [Telegram 的 setMyCommands 失败，应该检查什么？](#telegram-setmycommands-fails-what-should-i-check)
  - [TUI 没有输出，怎么办？](#tui-shows-no-output-what-should-i-check)
  - [如何彻底停止然后启动网关？](#how-do-i-completely-stop-then-start-the-gateway)
  - [给小白解释：`openclaw gateway restart` 和 `openclaw gateway` 的区别](#eli5-openclaw-gateway-restart-vs-openclaw-gateway)
  - [发生故障时，最快获取更多细节的方法？](#whats-the-fastest-way-to-get-more-details-when-something-fails)
- [媒体和附件](#media-and-attachments)
  - [我的技能生成了图片/PDF，但未发送](#my-skill-generated-an-imagepdf-but-nothing-was-sent)
- [安全和访问控制](#security-and-access-control)
  - [暴露 OpenClaw 给入站私信安全吗？](#is-it-safe-to-expose-openclaw-to-inbound-dms)
  - [提示注入仅对公共机器人构成威胁吗？](#is-prompt-injection-only-a-concern-for-public-bots)
  - [我的机器人应该有独立的邮箱、GitHub 账户或电话号码吗？](#should-my-bot-have-its-own-email-github-account-or-phone-number)
  - [我能授权它操作我的短信吗？这样安全吗？](#can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe)
  - [我能用更便宜的模型做个人助理任务吗？](#can-i-use-cheaper-models-for-personal-assistant-tasks)
  - [我在 Telegram 输入 `/start` 但没收到配对码](#i-ran-start-in-telegram-but-didnt-get-a-pairing-code)
  - [WhatsApp 会自动给我的联系人发消息吗？配对流程是怎样的？](#whatsapp-will-it-message-my-contacts-how-does-pairing-work)
- [聊天命令、中止任务及“停不下来”](#chat-commands-aborting-tasks-and-it-wont-stop)
  - [如何阻止内部系统消息显示在聊天中？](#how-do-i-stop-internal-system-messages-from-showing-in-chat)
  - [如何停止/取消正在运行的任务？](#how-do-i-stopcancel-a-running-task)
  - [如何从 Telegram 发送 Discord 消息？（“跨上下文消息被拒绝”）](#how-do-i-send-a-discord-message-from-telegram-crosscontext-messaging-denied)
  - [为什么感觉机器人“忽略”快速连发的消息？](#why-does-it-feel-like-the-bot-ignores-rapidfire-messages)

## 如果出问题，前 60 秒先做什么

1. **快速状态检查（首选）**

   ```bash
   openclaw status
   ```

   快速本地汇总：操作系统与版本，gateway/服务可达性，代理/会话概况，提供商配置及运行时问题（当 Gateway 可达时）。

2. **可粘贴报告（安全共享）**

   ```bash
   openclaw status --all
   ```

   只读诊断，含日志尾部（敏感令牌已遮蔽）。

3. **守护进程与端口状态**

   ```bash
   openclaw gateway status
   ```

   显示守护运行状况与 RPC 可达性、探针目标 URL，以及服务实际使用的配置文件。

4. **深度探针**

   ```bash
   openclaw status --deep
   ```

   运行 Gateway 健康检查和提供商探测（需 Gateway 可达），详见 [健康检查](/gateway/health)。

5. **监控最新日志**

   ```bash
   openclaw logs --follow
   ```

   若 RPC 不通，退回：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志和服务日志分开，详细见 [日志](/logging) 和 [故障排查](/gateway/troubleshooting)。

6. **运行诊断修复**

   ```bash
   openclaw doctor
   ```

   校验并修复配置/状态，运行健康检查，详见 [诊断](/gateway/doctor)。

7. **Gateway 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # 错误时显示目标 URL 和配置路径
   ```

   请求正在运行的 Gateway 全量状态，仅限 WebSocket，详见 [健康检查](/gateway/health)。

## 快速开始与首次运行安装

### 我卡住了，最快的解决方法是什么？

用能够**访问你机器的本地 AI 代理**最有效。这远胜于在 Discord 等远程求助，因为大多数“卡住”问题都是**本地配置或环境问题**，远程助理无法查看。

推荐工具：

- **Claude Code**：[https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
- **OpenAI Codex**：[https://openai.com/codex/](https://openai.com/codex/)

用它们可以读取源码、执行命令、检查日志、帮你修机器（PATH、服务、权限、授权文件）。

请用**可编辑的 git 安装方式**获取全部源码：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

这会以 git checkout 的方式安装，代理能看到准确版本的代码和文档。后续可随时用不带 `--install-method git` 的安装脚本切回稳定版。

技巧：让代理**规划和监督**操作（分步骤）再执行，仅改必要命令，改动小且便于审计。

若发现真 bug 或修复，请提交 GitHub issue 或 PR：
[https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
[https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

向外求助时请先运行并共享输出：

```bash
openclaw status
openclaw models status
openclaw doctor
```

说明：

- `openclaw status`：快速查看 Gateway 及代理健康状况与基础配置
- `openclaw models status`：检查提供商授权和模型可用性
- `openclaw doctor`：校验并修复通用配置/状态问题

其他常用 CLI 检查命令：`openclaw status --all`、`openclaw logs --follow`、`openclaw gateway status`、`openclaw health --verbose`

快速调试流程请见：[如果出问题，前 60 秒先做什么](#如果出问题前-60-秒先做什么)。

安装文档：[安装](/install)、[安装器参数](/install/installer)、[升级](/install/updating)。

### 推荐的 OpenClaw 安装和配置方式是什么？

建议从源码运行并使用入门向导：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard --install-daemon
```

向导还可自动构建 UI 资源。入门完成后通常运行 Gateway 于端口 **18789**。

源码安装（贡献者/开发者）：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build # 首次运行时自动安装 UI 依赖
openclaw onboard
```

若没全局安装，可执行：

```bash
pnpm openclaw onboard
```

### 入门后如何打开仪表盘？

入门向导会自动打开无 Token 的仪表盘链接并在总结中打印。保持该浏览器标签页打开，若没自动弹出，请在同机复制粘贴打印的 URL。

### 本地与远程如何验证仪表盘身份（Token）？

**本机访问（localhost）：**

- 访问 `http://127.0.0.1:18789/`
- 若要求授权，则在控制面板中粘贴 `gateway.auth.token` 或环境变量 `OPENCLAW_GATEWAY_TOKEN`
- 令牌查看方法：

  ```bash
  openclaw config get gateway.auth.token
  # 或生成：
  openclaw doctor --generate-gateway-token
  ```

**非本机访问：**

- **Tailscale Serve（推荐）**：保持绑定 loopback，运行

  ```bash
  openclaw gateway --tailscale serve
  ```

  然后访问 `https://<magicdns>/`。若 `gateway.auth.allowTailscale` 为 `true`，身份验证头自动满足控制 UI/WebSocket， 无需 Token（HTTP 接口仍需 Token/密码）。

- **Tailnet 绑定**：运行

  ```bash
  openclaw gateway --bind tailnet --token "<token>"
  ```

  访问 `http://<tailscale-ip>:18789/`，在仪表盘粘贴 Token。

- **SSH 隧道**：

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

  打开 `http://127.0.0.1:18789/` 并在控制 UI 粘贴 Token。

详见 [仪表盘](/web/dashboard) 和 [Web 接入](/web)。

### 需要什么运行时环境？

必须 Node.js **版本 ≥ 22**，推荐 `pnpm`。Bun 不推荐用于 Gateway。

### 能在树莓派上运行吗？

能。Gateway 轻量，文档建议最低 **512MB-1GB 内存**，**1 核**，约 **500MB** 磁盘。树莓派 4 可运行。

若需要余量（日志、媒体、其他服务），推荐 **2GB 内存**，非硬性最低。

小型 Pi 或 VPS 可作为 Gateway，笔记本/手机节点配合本地屏幕、摄像头、画布或命令执行。详见 [节点](/nodes)。

### 树莓派安装有什么技巧？

简版：能用，但有粗糙体验。

- 用**64 位系统**且 Node.js 保持 ≥ 22。
- 优先用**可编辑的 git 安装**，方便看日志、快速升级。
- 先不启用频道/技能，再逐个添加。
- 遇到奇怪二进制问题，通常是**ARM 兼容性**导致。

文档：[Linux](/platforms/linux)，[安装](/install)。

### 卡在 "wake up my friend" ，入门无法继续怎么办？

该界面依赖 Gateway 可达及授权。TUI 初次启动时会自动发送 "Wake up, my friend!"，无回复且令牌计数为 0 表明 Agent 未运行。

1. 重启 Gateway：

   ```bash
   openclaw gateway restart
   ```

2. 检查状态与授权：

   ```bash
   openclaw status
   openclaw models status
   openclaw logs --follow
   ```

3. 仍挂起，运行诊断修复：

   ```bash
   openclaw doctor
   ```

远程情况请确保隧道/Tailscale 连通，且 UI 指向正确 Gateway，参考 [远程访问](/gateway/remote)。

### 可以迁移配置到新机器 Mac mini 而不重做入门吗？

可以。复制**状态目录**和**工作区**，然后运行一次 Doctor 保持环境一致（记忆、会话、授权等）。

步骤：

1. 新机器安装 OpenClaw。
2. 复制旧机器 `$OPENCLAW_STATE_DIR`（默认 `~/.openclaw`）。
3. 复制工作区（默认 `~/.openclaw/workspace`）。
4. 运行 `openclaw doctor` 并重启 Gateway 服务。

这会保留配置、授权、WhatsApp 凭证、会话和记忆。远程模式下，Session 存储在 Gateway 主机。

**注意：** 若只提交工作区代码库，仅备份记忆及启动文件，不含会话和授权，它们存于 `~/.openclaw` 下，例如 `~/.openclaw/agents/<agentId>/sessions/`。

谨见相关文档：[迁移](/install/migrating)、[数据存放](/help/faq#openclaw-数据存哪里)、[Agent 工作区](/concepts/agent-workspace)、[诊断](/gateway/doctor)、[远程模式](/gateway/remote)。

### 最新版本的更新信息在哪里查看？

查看 GitHub 更新日志：

[https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

最新内容在最上方，未标记 “Unreleased” 则为已发布版。条目分为**重点**、**更改**、**修复**（及文档/其他）。

### 无法访问 docs.openclaw.ai，出现 SSL 错误怎么办？

部分 Comcast/Xfinity 用户被 Xfinity 高级安全错误阻断。

解决方案：

- 关闭该安全功能，或白名单 docs.openclaw.ai 后重试。
- 详见排查：[故障排查](/help/troubleshooting#docsopenclawai-显示-ssl-错误-comcastxfinity)。

请帮忙反馈解封请求：

[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)

仍访问不了，文档镜像在 GitHub：

[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

### 稳定版和 Beta 版有什么区别？

两者是 npm 分发标签，不是代码分支：

- `latest` 对应稳定版
- `beta` 对应测试版早期构建

先发布 beta，测稳后升级同版本到 latest。所以有时稳定和 beta 指向同一版本。

查看改动：[CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)。

### 如何安装 Beta 版，Beta 和 Dev 有何区别？

- **Beta** 是 npm 的 `beta` 标签（可能和 `latest` 一样）。
- **Dev** 指源码主分支 `main`，发布时标记为 `dev`。

一键安装示例（macOS/Linux）：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
```

或可用 hackable 安装（git 方式）：

```bash
curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
```

Windows 安装脚本（PowerShell）：

[https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

更多细节见：[开发渠道](/install/development-channels) 和 [安装器参数](/install/installer)。

### 安装和入门通常需要多长时间？

大致时间：

- **安装**：2-5 分钟
- **入门**：5-15 分钟，取决配置的频道和模型数量

如卡住，参见 [安装卡住](/help/faq#安装卡住如何获取更多反馈) 及 [快速解卡流程](#如果出问题前-60-秒先做什么)。

### 如何尝试最新版本？

两种方式：

1. **Dev 渠道（git checkout）**

   ```bash
   openclaw update --channel dev
   ```

   切换到主分支并拉取源码。

2. **hackable 安装**

   ```bash
   curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
   ```

   获得本地可编辑源码，用 git 更新。

可手动克隆：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
```

详见更新文档：[更新](/cli/update)、[开发渠道](/install/development-channels)、[安装](/install)。

### 安装卡住了，如何获得更多反馈？

重新运行安装脚本加上详尽输出：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
```

Beta 版加详尽输出：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
```

git 方式安装：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
```

Windows PowerShell 等效：

```powershell
# install.ps1 目前无专用 -Verbose 参数
Set-PSDebug -Trace 1
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
Set-PSDebug -Trace 0
```

更多可用参数见：[安装器参数](/install/installer)。

### Windows 安装提示找不到 git 或 openclaw 未识别？

两个常见问题：

1. npm 错误提示找不到 git：
   - 安装 **Git for Windows** 并确保 `git` 在 PATH 中。
   - 关闭重开 PowerShell，重跑安装。

2. 安装后 `openclaw` 命令未识别：
   - npm 全局 bin 文件夹不在 PATH。
   - 执行：

     ```powershell
     npm config get prefix
     ```

   - 将返回目录加入用户 PATH（Windows 多是 `%AppData%\npm`），无需加 `\bin`。
   - 保存后关闭重开 PowerShell。

建议 Windows 用户用 WSL2 环境运行，体验更佳。详见 [Windows 安装](/platforms/windows)。

### Windows 执行输出乱码中文怎么办？

通常是控制台代码页与编码不匹配。

症状：

- `system.run` / `exec` 输出中文乱码
- 另一个终端正常显示同命令

PowerShell 快速修正：

```powershell
chcp 65001
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

重启 Gateway：

```powershell
openclaw gateway restart
```

如最新版本仍复现，请关注或反馈问题：

- [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

### 文档没解决我的问题，如何获得更好解答？

用**可编辑的 git 安装**本地拥有完整源码和文档，然后从那个目录下向 Bot 或 Claude/Codex 询问，Bot 可准确阅读源码答复。

安装命令：

```bash
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
```

详细文档：[安装](/install)、[安装器参数](/install/installer)。

### 如何在 Linux 上安装 OpenClaw？

直接依 Linux 指南，运行入门向导即可。

- Linux 快速路径及服务安装见：[Linux 平台](/platforms/linux)
- 完整快速入门：[开始使用](/start/getting-started)
- 安装与更新：[安装与升级](/install/updating)

### 如何在 VPS 上安装 OpenClaw？

任何 Linux VPS 均可安装。直接在服务器上安装，SSH 或 Tailscale 远程访问 Gateway。

指南有：[exe.dev](/install/exe-dev)、[Hetzner](/install/hetzner)、[Fly.io](/install/fly) 等。
远程访问见 [Gateway 远程模式](/gateway/remote)。

### 云/VPS 安装指南在哪里？

我们维护了多个主流供应商的安装汇总页面：

- [VPS 托管](/vps)
- [Fly.io](/install/fly)
- [Hetzner](/install/hetzner)
- [exe.dev](/install/exe-dev)

说明：Gateway 在服务器上运行，可通过控制 UI/Tailscale/SSH 远程访问。
状态和工作区存服务器，视其为数据源并记得备份。

可搭配节点（Mac/iOS/Android/headless）访问本地屏幕/摄像头/画布，或执行本地命令。

文档：[平台](/platforms)、[远程访问](/gateway/remote)、[节点](/nodes)、[节点命令行](/cli/nodes)。

### OpenClaw 可以自我更新吗？

可行，但不推荐。更新时可能重启 Gateway（会断开会话），需干净 git checkout，可能需手动确认。

建议运维人员手动 shell 中更新。

CLI 命令有：

```bash
openclaw update
openclaw update status
openclaw update --channel stable|beta|dev
openclaw update --tag <dist-tag|version>
openclaw update --no-restart
```

自动化场景（慎用）：

```bash
openclaw update --yes --no-restart
openclaw gateway restart
```

详见：[更新 CLI](/cli/update)、[升级指南](/install/updating)。

### 入门向导具体做了什么？

`openclaw onboard` 推荐的本地安装路径，会依次：

- 模型与授权配置（支持 OAuth、setup-token 及 API Key，本地模型如 LM Studio）
- 工作区地址及启动文件布置
- Gateway 参数（绑定地址、端口、授权、Tailscale）
- 各渠道配置（WhatsApp、Telegram、Discord、Mattermost 插件、Signal、iMessage）
- 守护进程安装（macOS LaunchAgent，Linux/WSL2 systemd 用户服务）
- 健康检查与技能选择

如模型未识别或缺授权，会发警告。

### 运行需要 Claude 或 OpenAI 订阅吗？

不需要。可用 API Key（Anthropic/OpenAI 等）或**仅本地模型**，保持数据在本地。

订阅（Claude Pro/Max，OpenAI Codex）是可选认证方式。

Anthropic 订阅授权有访问限制，OpenAI Codex OAuth 官方支持。

文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)、[本地模型](/gateway/local-models)、[模型](/concepts/models)。

### 可以无 API Key 使用 Claude Max 订阅吗？

可以。使用**setup-token**授权替代 API Key。

Claude Pro/Max 订阅无 API Key，setup-token 是订阅的技术授权路径。

注意：此兼容性非政策保证，Anthropic 过去限制了部分订阅使用。
生产或多用户场景推荐 API Key 认证。

### Anthropic 的 “setup-token” 授权如何工作？

`claude setup-token` 通过 Claude Code CLI 生成 Token（Web 控制台无此服务），可在任意机器运行。

向导中选 **Anthropic token (paste setup-token)**，或用命令：

```bash
openclaw models auth paste-token --provider anthropic
```

它被存为 `anthropic` 提供商的授权配置文件，类似 API Key，无自动刷新。

详见 [OAuth](/concepts/oauth)。

### Anthropic 的 setup-token 从哪获取？

**不在 Anthropic 控制台**，需通过 Claude Code CLI 生成（任意机器）：

```bash
claude setup-token
```

复制输出 Token 后，向导中粘贴使用。

若在 gateway 主机生成，执行：

```bash
openclaw cron run <jobId> --force
openclaw cron runs --id <jobId> --limit 50
```

文档: [Cron jobs](/automation/cron-jobs), [Cron vs Heartbeat](/automation/cron-vs-heartbeat).

### 如何在 Linux 上安装技能

使用 **ClawHub**（CLI）或将技能直接放入你的工作区。macOS 的技能 UI 在 Linux 不可用。
浏览技能：[https://clawhub.com](https://clawhub.com)。

安装 ClawHub CLI（任选一种包管理器）:

```bash
npm i -g clawhub
```

```bash
pnpm add -g clawhub
```

### OpenClaw 能否按计划或持续后台运行任务？

可以。使用 Gateway 调度器：

- **Cron 任务** 用于定时或周期性任务（重启后依然生效）。
- **Heartbeat** 用于“主会话”的周期性检测。
- **隔离任务** 用于自主代理，发布摘要或推送聊天。

文档: [Cron jobs](/automation/cron-jobs), [Cron vs Heartbeat](/automation/cron-vs-heartbeat),
[Heartbeat](/gateway/heartbeat)。

### 能否从 Linux 运行仅限 Apple macOS 的技能？

不能直接运行。macOS 技能受限于 `metadata.openclaw.os` 和必需的二进制文件，只有当技能在 **Gateway 主机** 上符合条件时才会出现在系统提示中。在 Linux 上，`darwin` 专属技能（例如 `apple-notes`、`apple-reminders`、`things-mac`）不会加载，除非你覆写限制。

你有三种支持的方案：

**方案 A - 在 Mac 上运行 Gateway（最简单）。**  
将 Gateway 部署于含 macOS 二进制文件的机器，然后通过 Linux 远程模式连接（见[#如何以远程模式运行 openclaw 客户端连接到另一台 Gateway](#how-do-i-run-openclaw-in-remote-mode-client-connects-to-a-gateway-elsewhere)）或通过 Tailscale 连接。技能会正常加载，因为 Gateway 主机是 macOS。

**方案 B - 使用 macOS 节点（无 SSH）。**  
Gateway 在 Linux 上运行，配对一个 macOS 节点（菜单栏应用），并将 macOS 上的 **节点运行命令** 设置为“始终询问”或“始终允许”。当节点存在所需二进制文件时，OpenClaw 可将 macOS 专属技能视为可用。代理通过 `nodes` 工具运行这些技能。若选择“始终询问”，接受“始终允许”后会将命令加入允许白名单。

**方案 C - 通过 SSH 代理 macOS 二进制（高级）。**  
Gateway 仍在 Linux 上，但将必需的 CLI 二进制用 SSH 包装器代理到 Mac。然后替换技能元数据，允许 Linux 系统，使其保持可用。

1. 创建二进制的 SSH 包装脚本（示例：Apple Notes 的 `memo`）：

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
   ```

2. 将包装器放入 Linux 主机的 `PATH` 中（例如 `~/bin/memo`）。
3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`）允许 Linux：

   ```markdown
   ---
   name: apple-notes
   description: Manage Apple Notes via the memo CLI on macOS.
   metadata:
     {
       "openclaw":
         { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } },
     }
   ---
   ```

4. 启动新会话以刷新技能快照。

### 是否有 Notion 或 HeyGen 集成？

目前没有内置集成。

选项：

- **自定义技能/插件：** 最适合可靠的 API 访问（Notion 和 HeyGen 都提供 API）。
- **浏览器自动化：** 无代码方案，但速度较慢且易碎。

如果想为每个客户保持上下文（如代理工作流），一个简单模式是：

- 每个客户一页 Notion 页面（包含上下文 + 喜好 + 活动工作）。
- 会话开始时让代理提取该页面。

如需原生集成，欢迎提交功能请求或开发针对这些 API 的技能。

安装技能：

```bash
clawhub install <skill-slug>
clawhub update --all
```

ClawHub 将技能安装至当前目录下的 `./skills`（若无则回退到已配置的 OpenClaw 工作区）；OpenClaw 在下次会话时会将其视为 `<workspace>/skills`。若要多个代理共享技能，放置于 `~/.openclaw/skills/<name>/SKILL.md`。部分技能依赖 Homebrew 安装的二进制，在 Linux 上相当于 Linuxbrew（参见上文 Homebrew Linux FAQ）。详见 [技能](/tools/skills) 和 [ClawHub](/tools/clawhub)。

### 如何安装 Chrome 扩展以实现浏览器接管？

使用内置安装程序，然后在 Chrome 中加载解压的扩展：

```bash
openclaw browser extension install
openclaw browser extension path
```

打开 Chrome → 访问 `chrome://extensions` → 开启“开发者模式” → 点击“加载已解压的扩展程序” → 选择上一步路径。

完整指南（含远程 Gateway 及安全备注）：[Chrome 扩展](/tools/chrome-extension)

如果 Gateway 与 Chrome 在同一主机（默认），通常**无需额外操作**。  
如果 Gateway 在别处，请在浏览器机器上运行节点，以便 Gateway 代理浏览器操作。你仍需在想控制的标签页点击扩展按钮（不会自动附加）。

## 沙箱与内存

### 是否有专门的沙箱文档？

有。参见 [沙箱](/gateway/sandboxing)。如需 Docker 特定配置（完整 Gateway 于 Docker 或沙箱镜像），见 [Docker](/install/docker)。

### Docker 功能有限，如何启用完整功能？

默认镜像优先安全，使用 `node` 用户运行，不集成系统包、Homebrew 或内置浏览器。稍完整的配置：

- 用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，缓存可保存。
- 用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖打入镜像。
- 通过绑定的 CLI 安装 Playwright 浏览器：
  `node /app/node_modules/playwright-core/cli.js install chromium`
- 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保路径持久。

文档：[Docker](/install/docker), [浏览器](/tools/browser)。

**如何让私聊保密同时群组用公有沙箱单代理？**

可行 —— 当你的私人流量是**私聊 (DMs)**，公有流量是**群组**时：

使用 `agents.defaults.sandbox.mode: "non-main"`，群组/频道会话（非主密钥）在 Docker 中运行，主 DM 会话仍在主机上。并用 `tools.sandbox.tools` 限制沙箱会话可用工具。

配置示例及流程：[Groups: personal DMs + public groups](/channels/groups#pattern-personal-dms-public-groups-single-agent)

关键配置参考：[Gateway 配置](/gateway/configuration#agentsdefaultssandbox)

### 如何绑定主机目录到沙箱？

设置 `agents.defaults.sandbox.docker.binds` 为 `["host:path:mode"]`（例：`"/home/user/src:/src:ro"`）。全局绑定和每代理绑定会合并；采用 `scope: "shared"` 时忽略每代理绑定。敏感路径使用 `:ro`（只读）。绑定绕过沙箱文件系统墙，务必小心。详见[沙箱自定义绑定](/gateway/sandboxing#custom-bind-mounts)及[绑定挂载安全简查](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

### 内存是如何工作的？

OpenClaw 内存即代理工作区的 Markdown 文件：

- 日记笔记保存在 `memory/YYYY-MM-DD.md`
- 策划的长期笔记在 `MEMORY.md`（仅主/私会话）

OpenClaw 还进行**静默预紧缩内存刷新**，提醒模型写入持久笔记，防止自动紧缩前丢失信息。只在工作区可写时运行，读写沙箱跳过此步骤。详见 [内存](/concepts/memory)。

### 内存总是忘东西，怎样持久化？

让机器人**写入内存**。长期笔记写入 `MEMORY.md`，短期上下文写入 `memory/YYYY-MM-DD.md`。

这是当前仍在改进的领域，多提醒模型存储内容有帮助。若持续遗忘，确认 Gateway 每次运行时使用同一工作区。

文档：[内存](/concepts/memory), [代理工作区](/concepts/agent-workspace)。

### 语义内存搜索需要 OpenAI API key 吗？

仅在使用 **OpenAI embeddings** 时需要。Codex OAuth 覆盖聊天/补全，不包含 embeddings 访问权限，因此**使用 Codex OAuth 登录不支持语义搜索**。OpenAI embeddings 仍需提供真实 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

未指定提供者时，OpenClaw 会自动选取可用的 API key，对应 OpenAI、Gemini、Voyage、Mistral、Ollama 或本地模型依次尝试。若无远程 key，则搜索功能禁用。详见 [内存](/concepts/memory)。

### 内存保存多久，有限制吗？

内存文件保存在磁盘，除非删除，否则永久存在。限制来自存储容量，而非模型本身。会话上下文仍受模型上下文窗口限制，长会话可能被截断或紧缩，这正是语义搜索存在的目的——仅拉回相关内容。

文档：[内存](/concepts/memory), [上下文](/concepts/context)。

## 文件存储位置

### OpenClaw 的所有数据都保存在本地吗？

不是 —— **OpenClaw 状态保存在本地**，但**访问的外部服务依然会见到你发送的内容**。

- **本地默认：** 会话、内存文件、配置和工作区都在 Gateway 主机（`~/.openclaw` 及你的工作区目录）中。
- **远程必然：** 向模型提供商（Anthropic/OpenAI 等）发送消息，数据发送至其 API；聊天平台（WhatsApp/Telegram/Slack 等）将消息存储于其服务器。
- **你控制自身数据：** 使用本地模型可保证提示留在机器上，但频道流量仍经由频道服务器。

相关：[代理工作区](/concepts/agent-workspace), [内存](/concepts/memory)。

### OpenClaw 把数据存哪里？

所有数据都放置于 `$OPENCLAW_STATE_DIR`（默认为 `~/.openclaw`）下：

| 路径                                                            | 用途                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置（JSON5 格式）                                        |
| `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制进 auth profiles）           |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 认证配置文件（OAuth、API Key 及可选的 `keyRef`/`tokenRef`） |
| `$OPENCLAW_STATE_DIR/secrets.json`                              | 可用的文件支持 SecretRef 的秘密载体                         |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧兼容文件（静态 API Key 条目已清理）                       |
| `$OPENCLAW_STATE_DIR/credentials/`                              | 提供商状态（如 `whatsapp/<accountId>/creds.json`）          |
| `$OPENCLAW_STATE_DIR/agents/`                                   | 每代理状态（代理目录和会话）                                |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 会话历史及状态（每代理）                                    |
| `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每代理）                                        |

旧版单代理路径：`~/.openclaw/agent/*`（用 `openclaw doctor` 迁移）。

你的**工作区**（AGENTS.md，内存文件，技能等）独立配置，通过 `agents.defaults.workspace` 指定（默认为 `~/.openclaw/workspace`）。

### AGENTS.md、SOUL.md、USER.md、MEMORY.md 应该放哪里？

这些文件放在**代理工作区**，而非 `~/.openclaw`。

- **工作区（每代理）**: `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`（或 `memory.md`）、`memory/YYYY-MM-DD.md`，可选 `HEARTBEAT.md`。
- **状态目录 (`~/.openclaw`)**: 配置、凭证、认证配置、会话、日志及共享技能（`~/.openclaw/skills`）。

默认工作区为 `~/.openclaw/workspace`，可通过配置调整：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

如果机器人重启后“忘记”，请确认 Gateway 每次启动使用相同工作区（远程模式使用的是 **Gateway 主机** 的工作区，而非本机）。

建议: 若你想持久保存行为或偏好，告诉机器人**写入 AGENTS.md 或 MEMORY.md**，而非仅靠消息历史。

详见：[代理工作区](/concepts/agent-workspace) 和 [内存](/concepts/memory)。

### 推荐备份策略是什么？

将你的**代理工作区**放到**私有** git 仓库，并备份在私有处（例如私有 GitHub）。这样可以保存记忆及 AGENTS/SOUL/USER 文件，方便日后恢复助手“思维”。

不要提交 `~/.openclaw` 下的内容（凭证、会话、令牌或加密秘密载体）。需要全备时，工作区及状态目录分开备份（详见上文迁移问题）。

文档：[代理工作区](/concepts/agent-workspace)。

### 如何彻底卸载 OpenClaw？

见专门指南：[卸载](/install/uninstall)。

### 代理能否在工作区外运行？

可以。工作区是**默认当前工作目录**和内存锚点，不是硬性沙箱。相对路径解析于工作区，绝对路径可访问宿主机任意处，除非启用沙箱。如果需要隔离，使用 [`agents.defaults.sandbox`](/gateway/sandboxing) 或单代理沙箱设定。如想让某仓库为默认工作目录，指向该代理的 `workspace` 即可。OpenClaw 源码仓库是单纯源码，建议别让代理运行于此，除非故意如此。

示例（将 repo 设默认 cwd）：

```json5
{
  agents: {
    defaults: {
      workspace: "~/Projects/my-repo",
    },
  },
}
```

### 我在远程模式下，会话存储在哪里？

会话状态归 **Gateway 主机** 所有。远程模式时，你关心的会话存储在远程机器，而非本地。详见 [会话管理](/concepts/session)。

## 配置基础

### 配置是什么格式，放哪？

OpenClaw 读取可选的 **JSON5** 格式配置，路径为 `$OPENCLAW_CONFIG_PATH`（默认：`~/.openclaw/openclaw.json`）：

```
$OPENCLAW_CONFIG_PATH
```

文件缺失则使用较安全的默认值（包含默认工作区 `~/.openclaw/workspace`）。

### 我设置了 gateway.bind 为 lan 或 tailnet 后，无法监听，UI 显示未授权？

非 loopback 绑定需要启用认证。配置 `gateway.auth.mode` + `gateway.auth.token`（或使用环境变量 `OPENCLAW_GATEWAY_TOKEN`）。

示例：

```json5
{
  gateway: {
    bind: "lan",
    auth: {
      mode: "token",
      token: "replace-me",
    },
  },
}
```

注意：

- `gateway.remote.token` / `.password` 本身并不会启用本地 Gateway 认证。
- 本地调用路径只有在未配置 `gateway.auth.*` 时，才可用 `gateway.remote.*` 作为回退方案。
- 如果通过 SecretRef 明确配置了 `gateway.auth.token` / `gateway.auth.password`，但未能解析，则会失败且关闭访问（不会用远程回退掩盖错误）。
- 控制 UI 通过 `connect.params.auth.token` 进行认证（存储于应用/UI 设置中）。避免将令牌放入 URL 中。

### 为什么本地访问现在也需要令牌？

OpenClaw 默认强制令牌认证，包括回送访问。若未配置令牌，Gateway 启动时自动生成并写入 `gateway.auth.token`，因此本地 WS 客户端必须认证，这阻断了其他本地进程访问 Gateway。

若**确实想关闭本地令牌认证**，显式配置 `gateway.auth.mode: "none"`。可以用 `openclaw doctor --generate-gateway-token` 随时生成令牌。

### 改配置后必须重启吗？

Gateway 监听配置文件，支持热加载：

- `gateway.reload.mode: "hybrid"`（默认）：安全变更热应用，关键变更重启。
- 还支持 `hot`、`restart`、`off`。

### 如何关闭 CLI 的趣味标语？

配置中设置 `cli.banner.taglineMode`：

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

含义：

- `off`: 隐藏标语，但保留标题/版本行。
- `default`: 统一显示 “All your chats, one OpenClaw.”。
- `random`: 随机显示趣味/季节性标语（默认）。
- 若想完全无横幅，设置环境变量：`OPENCLAW_HIDE_BANNER=1`。

### 如何启用网页搜索和网页抓取？

`web_fetch` 默认无需 API key。`web_search` 需选定提供商并提供对应 key（Brave、Gemini、Grok、Kimi、Perplexity）。  
**推荐**：执行 `openclaw configure --section web` 选择提供商。

环境变量示例：

- Brave: `BRAVE_API_KEY`
- Gemini: `GEMINI_API_KEY`
- Grok: `XAI_API_KEY`
- Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

配置例：

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        provider: "brave",
        apiKey: "BRAVE_API_KEY_HERE",
        maxResults: 5,
      },
      fetch: {
        enabled: true,
      },
    },
  },
}
```

注意：

- 使用白名单时，需添加 `web_search`/`web_fetch` 或 `group:web`。
- 默认启用 `web_fetch`，除非显式禁用。
- 守护进程加载 `~/.openclaw/.env` 环境变量（或服务环境变量）。

文档：[Web 工具](/tools/web)。

### 如何运行一台中央 Gateway，配合跨设备专用工作机器？

常见模式为 **一台 Gateway**（如树莓派）搭配 **节点** 和 **代理**：

- **Gateway（中央）：** 管理频道（Signal/WhatsApp）、路由和会话。
- **节点（设备）：** macOS/iOS/Android 设备作为外围，暴露本地工具（`system.run`、`canvas`、`camera`）。
- **代理（工作机）：** 各司其职、独立工作区（例：“Hetzner 运维”、“个人数据”）。
- **子代理:** 在主代理中启动后台工作，实现并行。
- **TUI:** 连接 Gateway，切换代理和会话。

文档：[节点](/nodes), [远程访问](/gateway/remote), [多代理路由](/concepts/multi-agent), [子代理](/tools/subagents), [TUI](/web/tui)。

### OpenClaw 浏览器能无头运行吗？

可以，是一个配置选项：

```json5
{
  browser: { headless: true },
  agents: {
    defaults: {
      sandbox: { browser: { headless: true } },
    },
  },
}
```

默认 `false`（带界面）。无头模式更容易触发部分网站的反机器人检测。详见 [浏览器](/tools/browser)。

无头浏览使用同一个 Chromium 引擎，支持大部分自动化场景（表单、点击、抓取、登录）。区别：

- 无可见浏览器窗口（可用截图功能观察）。
- 部分站点对无头更严格（CAPTCHA、反机器人），如 X/Twitter 经常阻止无头访问。

### 如何用 Brave 浏览器进行浏览器控制？

将 `browser.executablePath` 指向 Brave 可执行文件（或其它基于 Chromium 的浏览器），重启 Gateway。  
见全文配置示例：[浏览器](/tools/browser#use-brave-or-another-chromium-based-browser)。

## 远程 Gateways 与节点

### Telegram、Gateway 与节点间的命令怎样传递？

Telegram 消息由 **Gateway** 处理。Gateway 运行代理，然后如需本地节点工具调用，才通过 **Gateway WebSocket** 调用节点：

Telegram → Gateway → 代理 → `node.*` → 节点 → Gateway → Telegram

节点看不到外部渠道的消息流；只处理节点 RPC 调用。

### Gateway 若部署于远程，我的代理如何访问本地电脑？

简答：**将本地电脑配对成节点**。Gateway 运行外部，可通过 Gateway WebSocket 调用本地机器上的 `node.*` 工具（屏幕、摄像头、系统命令等）。

典型配置步骤：

1. 在常开主机（VPS/家用服务器）运行 Gateway。
2. 将 Gateway 主机和电脑置于同一 Tailnet。
3. 确保 Gateway WebSocket 可达（tailnet 绑定或 SSH 隧道）。
4. 本地开启 macOS app，使用 **SSH 远程模式** 或直连 tailnet，注册为节点。
5. 在 Gateway 确认节点许可：

   ```bash
   openclaw plugins enable google-gemini-cli-auth
   ```

6. 登录认证：

   ```bash
   openclaw models auth login --provider google-gemini-cli --set-default
   ```

OAuth 令牌存储于 Gateway 主机授权配置文件。

详见 [模型提供商](/concepts/model-providers)。

### 本地模型适合日常对话吗？

通常不合适。OpenClaw 需求长上下文和高安全性能，小体量模型常常被裁剪且存在信息泄露风险。

若硬要用，选择本地最大 MiniMax M2.5 模型（LM Studio），详见 [/gateway/local-models](/gateway/local-models)。

小型/量化模型更易遭受提示注入攻击，参见 [安全指南](/gateway/security)。

### 如何将托管模型流量限制在特定地区？

使用支持区域绑定的接口。

OpenRouter 提供 MiniMax、Kimi 和 GLM 美国区服务，选择美国区型号即可保证数据驻留。

或用 `models.mode: "merge"` 混合 Anthropic/OpenAI 等模型做降级，同时满足区域限制。

### 一定要买 Mac Mini 来安裝吗？

不必。OpenClaw 支持 macOS、Linux，Windows 推荐用 WSL2。

Mac Mini 只是可选常驻主机，有人买来用。小 VPS、家用服务器或树莓派等都可。

macOS 独占工具如 iMessage 推荐用 [BlueBubbles](/channels/bluebubbles)，服务器可在任何 Mac，Gateway 允许 Linux。

其他 macOS 独占工具，要么在 Mac 上运行 Gateway，要么配 macOS 节点。

详见：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

### iMessage 支持需要 Mac Mini 吗？

需要任何运行 macOS 的设备登录 Messages，非必须 Mac Mini。

推荐通过 [BlueBubbles](/channels/bluebubbles) 作为中继，服务器跑在 Mac 上，Gateway 可部署于 Linux 或其它。

常见方案：

- Gateway 在 Linux/VPS，BlueBubbles 服务器跑在登录 Messages 的 Mac 机器上。
- 全部在一台 Mac 机器上跑。

详见：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

### 买 Mac Mini 运行 OpenClaw 能连接 MacBook Pro 吗？

可以。

- Mac Mini 运行 Gateway。
- MacBook Pro 作为节点连接（不运行 Gateway，仅提供屏幕/摄像头/画布和 `system.run` 命令）。

典型场景：

- Gateway 持续运行于 Mac Mini。
- MacBook Pro 运行 macOS app 或节点程序，绑定 Gateway。
- 用命令 `openclaw nodes status` / `openclaw nodes list` 查看状态。

详见：[节点](/nodes)、[节点命令行](/cli/nodes)。

### 可以使用 Bun 吗？

不推荐。WhatsApp、Telegram 等运行环境存在不少 BUG。

推荐用 Node 保证稳定。若要尝试，只在无 WhatsApp/Telegram 的非生产环境使用。

### Telegram 的 `allowFrom` 应该填什么？

`channels.telegram.allowFrom` 是**发送人 Telegram 用户的数字 ID**，非用户名。

入门向导可接受 `@用户名` 并转换为 ID，授权比较时使用数字 ID。

安全做法：

- 私聊机器人时，运行 `openclaw logs --follow` 查看 `from.id`。
- 用 Telegram Bot API 调用更新接口获取 ID。
- 或用第三方机器人（如 `@userinfobot`）查询。

详见 [/channels/telegram](/channels/telegram#access-control-dms--groups)。

### 多个用户能共用同一个 WhatsApp 号码和不同的 OpenClaw 实例吗？

可以，使用**多代理路由**。

将每个 WhatsApp 私聊（`kind: "direct"`，发件人 E.164 号码）绑定到单独的 `agentId`，工作区和会话各自独立。

回复仍来自同一 WhatsApp 账号，私聊访问控制是全局的（`channels.whatsapp.dmPolicy` / `allowFrom`）。

详见 [多代理路由](/concepts/multi-agent) 和 [WhatsApp](/channels/whatsapp)。

### 可以同时运行“快速聊天”代理和“Opus 编码”代理吗？

可以。用多代理路由：

- 给每个代理设置默认模型。
- 入站路由绑定至对应代理。

示例见 [多代理路由](/concepts/multi-agent)。

参见 [模型](/concepts/models)、[配置](/gateway/configuration)。

### Homebrew 在 Linux 上能用吗？

能。Homebrew 支持 Linux（Linuxbrew）。

快速安装：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
brew install <formula>
```

通过 systemd 启动 OpenClaw 时，确保 PATH 包含 `~/.linuxbrew/bin` 或 Homebrew 前缀路径。

新版 systemd 服务自动追加用户目录及识别相关环境变量（PNPM_HOME、BUN_INSTALL 等）。

### hackable (git) 安装和 npm 安装有什么区别？

- **可编辑 git 安装**：检出完整源码，适合贡献者，方便修改源码/文档。
- **npm 安装**：全局 CLI，无源码，方便“即装即用”，通过 npm 标签更新。

详见：[入门](/start/getting-started)、[升级](/install/updating)。

### 今后可在 npm 和 git 安装间切换吗？

可以。

先安装另一种版本，再执行 `openclaw doctor` 确保 Gateway 指向正确可执行文件。

这一操作不改变数据，状态目录和工作区保持不变。

npm→git 示例：

```bash
openclaw reset
```

非交互全重置：

```bash
openclaw reset --scope full --yes --non-interactive
```

再执行入门向导：

```bash
openclaw onboard --install-daemon
```

提示：

- 入门向导若检测到已配置，提供重置选项，参见 [Wizard](/start/wizard)。
- 使用配置文件（`--profile` / `OPENCLAW_PROFILE`）时，重置每个状态目录（默认是 `~/.openclaw-<profile>`）。
- 开发测试重置：`openclaw gateway --dev --reset`（仅开发用，清除测试配置、凭证、会话、工作区）。

### 收到 Context Too Large 错误，如何重置或压缩？

使用以下命令之一：

- **压缩**（保持会话，摘要老对话）：

  ```
  /compact
  ```

  或 `/compact <概要指令>` 指定摘要内容。

- **重置**（同一聊天键创建新会话 ID）：

  ```
  /new
  /reset
  ```

若频繁出现，建议：

- 启用或调整 **会话裁剪**（`agents.defaults.contextPruning`）以减少老旧工具输出。
- 使用更大上下文窗口的模型。

文档：[压缩](/concepts/compaction), [会话裁剪](/concepts/session-pruning), [会话管理](/concepts/session)。

### 为什么看到 “LLM request rejected: messages.content.tool_use.input field required”？

这是提供商验证错误：模型发出 `tool_use` 块却缺少必需的 `input` 字段。通常意味着会话历史变旧或损坏（常发生在长线程或工具/模式变更后）。

解决：用 `/new` 指令开启新会话。

### 为什么每 30 分钟收到心跳消息？

心跳默认每 **30 分钟** 发送一次。可调整或禁用：

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "2h", // 或 "0m" 关闭
      },
    },
  },
}
```

若 `HEARTBEAT.md` 存在但内容基本空白（仅空行、Markdown 标题），OpenClaw 会跳过心跳调用以节省 API。若缺失此文件，心跳仍执行，模型自行决策。

单代理覆盖用 `agents.list[].heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

### 需要把机器人账号加进 WhatsApp 群组吗？

不需。OpenClaw 运行于**你的账号**上，只要你在群组，OpenClaw 就能看到消息。默认情况下群组回复被阻止，除非你允许特定发送者（`groupPolicy: "allowlist"`）。

若希望仅自己能触发群组回复：

```json5
{
  channels: {
    whatsapp: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["+15551234567"],
    },
  },
}
```

### 怎么获取 WhatsApp 群组的 JID？

方案 1（最快）: 监听日志，并在群组发一条测试消息：

```bash
openclaw logs --follow --json
```

查找 `chatId` 或 `from` 字段，结尾带 `@g.us`，示例：  
`1234567890-1234567890@g.us`

方案 2（已配置且允许访问）: 从配置列出群组：

```bash
openclaw directory groups list --channel whatsapp
```

文档：[WhatsApp](/channels/whatsapp), [目录](/cli/directory), [日志](/cli/logs)。

### 为什么 OpenClaw 不回复群组消息？

常见两种原因：

- 触发需提及（默认）；必须 @机器人或符合 `mentionPatterns`。
- 配置了 `channels.whatsapp.groups` 而未包含 `"*"`，且群组未列入允许名单。

详见 [群组](/channels/groups) 和 [群组消息](/channels/group-messages)。

### 群组、线程和私聊的上下文是否共享？

默认情况下，私聊合并为主会话。群组/频道使用独立会话键，Telegram 话题与 Discord 线程也是独立会话。详见 [群组](/channels/groups) 和 [群组消息](/channels/group-messages)。

### 我可以创建多少工作区和代理？

没有硬性限制。几十个甚至上百都可，但要留意：

- **磁盘成长：** 会话和转录保存在 `~/.openclaw/agents/<agentId>/sessions/`。
- **令牌成本：** 代理越多，模型并发使用越多。
- **运维开销：** 认证配置、工作区、渠道路由多份维护。

建议：

- 每代理仅保留一个**活跃**工作区 (`agents.defaults.workspace`)。
- 适时清理过往会话（删 JSONL 或条目）。
- `openclaw doctor` 帮助查找多余工作区和配置不匹配。

### 可以同时运行多个机器人或会话（Slack 等）吗？如何设置？

可以。使用**多代理路由**管理多个独立代理，并按照渠道/账号/联系人路由入站消息。Slack 支持绑定至指定代理。

浏览器访问强大，但不保证“人能做的所有动作”均能自动化防反爬、验证码和多因素认证仍会阻断。最可靠自动化方案是浏览器所在机器使用 Chrome 扩展中转，Gateway 可部署任意位置。

最佳实践：

- 常驻的 Gateway 主机（VPS/Mac mini）。
- 每个角色一个代理（绑定）。
- Slack 频道绑定相应代理。
- 需要时通过扩展中继或节点调用本地浏览器。

文档：[多代理路由](/concepts/multi-agent), [Slack](/channels/slack),
[浏览器](/tools/browser), [Chrome 扩展](/tools/chrome-extension), [节点](/nodes)。

## 模型：默认、选择、别名、切换

### 默认模型是什么？

OpenClaw 默认模型是配置中：

```
agents.defaults.model.primary
```

模型格式为 `provider/model`（例：`anthropic/claude-opus-4-6`）。省略提供商时，OpenClaw 当前默认为 `anthropic`（旧版兼容），建议明确写出。

### 推荐用什么模型？

**推荐默认：** 选取你提供商中能力最强、最新一代的模型。  
**带工具或不信任输入代理：** 以模型能力优先，勿图便宜。  
**日常低风险对话：** 用更便宜的Fallback模型，按代理角色路由选择。

MiniMax M2.5 模型详见：[MiniMax](/providers/minimax) 和 [本地模型](/gateway/local-models)。

经验法则：高风险任务用**最强模型**，常规对话或摘要用更便宜的。通过代理定向模型，并用子代理并行处理长任务（每个子代理消耗令牌）。详见 [模型](/concepts/models) 和 [子代理](/tools/subagents)。

强警告：弱模型或过度量化模型风险高，易受提示注入和不安全行为影响。详见 [安全](/gateway/security)。

更多信息见 [模型](/concepts/models)。

### 可以使用自托管模型 llamacpp vLLM Ollama 吗？

可以。Ollama 是本地模型的最简单路径。

快速安装步骤：

1. 从 `https://ollama.com/download` 安装 Ollama
2. 拉取本地模型，例如 `ollama pull glm-4.7-flash`
3. 如果你还想使用 Ollama 云端，运行 `ollama signin`
4. 运行 `openclaw onboard` 并选择 `Ollama`
5. 选择 `Local` 或 `Cloud + Local`

注意：

- `Cloud + Local` 让你同时拥有 Ollama 云端模型和本地 Ollama 模型
- 云端模型如 `kimi-k2.5:cloud` 无需本地拉取
- 手动切换可用 `openclaw models list` 和 `openclaw models set ollama/<model>`

安全提示：体积小或重量化模型更易受提示注入攻击。强烈建议**大型模型**用以支持带工具的机器人。若坚持小模型，务必启用沙箱和严格工具白名单。

文档：[Ollama](/providers/ollama), [本地模型](/gateway/local-models),
[模型提供商](/concepts/model-providers), [安全](/gateway/security),
[沙箱](/gateway/sandboxing)。

### 如何切换模型而不重置配置？

使用**模型相关命令**或只修改**模型字段**，避免整体替换配置。

安全方式：

- 聊天中发送 `/model`（快，按会话切换）
- 命令行 `openclaw models set ...`（只更新模型配置）
- 交互式 `openclaw configure --section model`
- 编辑 `~/.openclaw/openclaw.json` 中 `agents.defaults.model`

避免用 `config.apply` 来替换部分对象，除非想替换整个配置。若误覆盖，可从备份恢复或运行 `openclaw doctor` 修复。

文档：[模型](/concepts/models), [配置](/cli/configure), [配置](/cli/config), [诊断](/gateway/doctor)。

### OpenClaw、Flawd 和 Krill 用什么模型？

- 这些部署可能不同且会改动，无固定推荐。
- 可用 `openclaw models status` 查看当前 Gateway 运行时配置。
- 高安全及工具代理建议用最新、最强模型。

### 如何切换模型且不中断运行？

聊天中单独发送指令：

```
/model sonnet
/model haiku
/model opus
/model gpt
/model gpt-mini
/model gemini
/model gemini-flash
```

可用 `/model`、`/model list` 查看可用列表。

`/model` 和 `/model list` 列表带编号，发 `/model 3` 选择。

支持在会话中强制指定认证配置：

```
/model opus@anthropic:default
/model opus@anthropic:work
```

提示：`/model status` 显示活跃代理，加载的认证文件，当前使用的认证配置，及提供商终端 (`baseUrl`) 和 API 模式 (`api`)。

**如何取消 `/model` 指令中绑定的认证配置？**

重新发送 `/model` 指令不带 `@profile` 后缀即可：

```
/model anthropic/claude-opus-4-6
```

若想回到默认配置，从 `/model` 列表选或发默认模型全名。用 `/model status` 确认当前认证情况。

### 日常用 GPT 5.2，编码用 Codex 5.3，如何切换？

可以。设一个为默认，按需切换：

- **快速切换（按会话）**：会话进入 `/model gpt-5.2` 做日常，`/model openai-codex/gpt-5.4` 用 Codex OAuth 编码。
- **默认 + 切换**：设置默认 `agents.defaults.model.primary` 为 `openai/gpt-5.2`，需要编码时切换到 `openai-codex/gpt-5.4`，反之亦然。
- **子代理**：为编码任务使用专用默认模型子代理。

详见 [模型](/concepts/models) 和 [斜线命令](/tools/slash-commands)。

### 出现 “Model is not allowed” 并无回复？

当配置 `agents.defaults.models` 时，它将成为 `/model` 及会话范围内允许的模型白名单。选择不在名单中的模型，会返回：

```
Model "provider/model" is not allowed. Use /model to list available models.
```

此错误发生时不会正常回复。解决办法：

- 将模型加入 `agents.defaults.models`
- 移除允许列表限制
- 使用 `/model list` 选允许模型。

### 显示 “Unknown model minimaxMiniMaxM25” 是什么意思？

表示**提供商未配置**（未找到 MiniMax 相关配置或认证），无法解析模型。此检测方案在 **2026.1.12**（截至写作时未发布）修复。

修复步骤：

1. 升级到 **2026.1.12** 或源码主分支，重启 Gateway。
2. 确认 MiniMax 配置（向导或 JSON 配置），或存在 MiniMax 的环境变量/认证文件。
3. 使用正确且区分大小写的模型 ID：`minimax/MiniMax-M2.5` 或 `minimax/MiniMax-M2.5-highspeed`（旧名：`-Lightning`）。
4. 执行：

   ```bash
   openclaw models list
   ```

   从列表选模型（或聊天内 `/model list`）。

详见 [MiniMax](/providers/minimax) 和 [模型](/concepts/models)。

### 可否默认用 MiniMax，复杂任务用 OpenAI？

可以。默认 MiniMax，必要时按会话切换至 OpenAI。降级仅用于**错误场景**，非处理“复杂任务”，后者用 `/model` 命令或分代理。

**方案 A：按会话切换**

```json5
{
  env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "minimax/MiniMax-M2.5" },
      models: {
        "minimax/MiniMax-M2.5": { alias: "minimax" },
        "openai/gpt-5.2": { alias: "gpt" },
      },
    },
  },
}
```

使用：

```
/model gpt
```

**方案 B：分代理**

- 代理 A 默认 MiniMax
- 代理 B 默认 OpenAI
- 按代理路由或用 `/agent` 切换

文档：[模型](/concepts/models), [多代理路由](/concepts/multi-agent), [MiniMax](/providers/minimax), [OpenAI](/providers/openai)。

### Opus、Sonnet、GPT 是内置快捷方式吗？

是。OpenClaw 默认带几个简写（仅在模型存在于 `agents.defaults.models` 时生效）：

- `opus` → `anthropic/claude-opus-4-6`
- `sonnet` → `anthropic/claude-sonnet-4-5`
- `gpt` → `openai/gpt-5.2`
- `gpt-mini` → `openai/gpt-5-mini`
- `gemini` → `google/gemini-3-pro-preview`
- `gemini-flash` → `google/gemini-3-flash-preview`

若配置中同名别名覆盖，则优先使用自定义的。

### 如何定义或覆盖模型快捷别名？

别名由 `agents.defaults.models.<modelId>.alias` 指定。例如：

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "opus" },
        "anthropic/claude-sonnet-4-5": { alias: "sonnet" },
        "anthropic/claude-haiku-4-5": { alias: "haiku" },
      },
    },
  },
}
```

之后发送 `/model sonnet`（或其他支持的快捷命令）将解析到相应模型 ID。

### 如何添加其他提供商的模型（如 OpenRouter 或 ZAI）？

OpenRouter（按令牌计费，多模型）示例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "openrouter/anthropic/claude-sonnet-4-5" },
      models: { "openrouter/anthropic/claude-sonnet-4-5": {} },
    },
  },
  env: { OPENROUTER_API_KEY: "sk-or-..." },
}
```

Z.AI（GLM 模型）示例：

```json5
{
  agents: {
    defaults: {
      model: { primary: "zai/glm-5" },
      models: { "zai/glm-5": {} },
    },
  },
  env: { ZAI_API_KEY: "..." },
}
```

若引用了提供商/模型但缺少提供商 API Key，将遇到运行时认证错误（如 `No API key found for provider "zai"`）。

**新增代理后出现无凭证错误**

往往因**新代理的认证存储为空**。认证为每代理独立，存储路径：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

解决方案：

- 用 `openclaw agents add <id>` 并在向导中配置认证。
- 或从主代理目录复制 `auth-profiles.json` 到新代理目录。

不要共用 `agentDir`，会导致认证和会话冲突。

## 模型故障转移与“所有模型失效”

### 故障转移如何工作？

分两步：

1. 同一提供商内部的认证配置轮换。
2. 使用 `agents.defaults.model.fallbacks` 中定义的后备模型。

失败的认证会加入冷却期（指数退避），保障在提供商限流或临时异常时保持响应。

### “No credentials found for profile "anthropic:default"” 意味什么？

表示系统尝试使用 `anthropic:default` 认证配置，但在对应存储里找不到。

### 排查清单

- **确认认证配置位置**（新旧路径）
  - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - 旧版：`~/.openclaw/agent/*`（用 `openclaw doctor` 可迁移）

- **确保环境变量被 Gateway 读入**
  - 若在 Shell 设了 `ANTHROPIC_API_KEY`，但 Gateway 由 systemd/launchd 启动，可能未继承。可放进 `~/.openclaw/.env` 或启用 `env.shellEnv`。

- **确认操作的代理是否正确**
  - 多代理配置下有多处认证文件。

- **查看模型/认证状态**
  - 用 `openclaw models status` 查看认证使用和模型配置。

### 解决方案

- **用 Setup-token：**

  ```bash
  claude setup-token
  openclaw models auth setup-token --provider anthropic
  ```

  若 token 在别处生成，用：

  ```bash
  openclaw models auth paste-token --provider anthropic
  ```

- **用 API Key 代替**
  - 在 Gateway 主机的 `~/.openclaw/.env` 中设置 `ANTHROPIC_API_KEY`。
  - 清除强制固定的认证顺序：

    ```bash
    openclaw models auth order clear --provider anthropic
    ```

- **确认命令在 Gateway 机器执行**

  远程模式时认证配置在 Gateway 主机不在本地。

### 为什么还会尝试 Google Gemini 并失败？

若模型配置含 Google Gemini 作为后备（或者使用了 Gemini 别名），OpenClaw 会尝试它。未配置 Google 认证则会显示 `No API key found for provider "google"`。

解决：提供 Google 认证，或去除 `agents.defaults.model.fallbacks` 或别名中的 Google 模型。

**关于 “LLM request rejected message thinking signature required for google antigravity”**

因为会话历史带有未签名的思考块（通常为流中断未完成产生），Google Antigravity 要求签名。

OpenClaw 现会剥离未签名的思考块，若仍出现，开启新会话或用`/thinking off`。

## 认证配置概念与管理

相关：[/concepts/oauth](/concepts/oauth)（OAuth 流程、令牌存储、多账号管理）

### 认证配置是什么？

认证配置是关联提供商的命名凭证记录（OAuth 或 API Key），位于：

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

### 常见配置 ID 格式？

OpenClaw 使用前缀化 ID，例如：

- `anthropic:default`（无邮箱身份时常见）
- `anthropic:<email>` OAuth 身份
- 自定义 ID，如 `anthropic:work`

### 能否控制认证配置优先使用顺序？

可以。配置支持提供商认证顺序（`auth.order.<provider>`），映射 ID 到提供商和认证模式，并指定轮换顺序（不存储密钥）。

OpenClaw 可能因短期冷却（限流、超时、认证失败）或长期禁用（账单、额度不足）跳过某配置。可用 `openclaw models status --json` 检查 `auth.unusableProfiles`。可调参数如 `auth.cooldowns.billingBackoffHours*`。

每代理也可本地在其 `auth-profiles.json` 里覆盖顺序，命令行操作：

```bash
# 默认针对当前配置代理，省略 --agent
openclaw models auth order get --provider anthropic

# 只尝试单一认证配置（锁定）
openclaw models auth order set --provider anthropic anthropic:default

# 显式设置顺序（提供商内降级顺序）
openclaw models auth order set --provider anthropic anthropic:work anthropic:default

# 清除覆盖，回归配置文件顺序或轮循
openclaw models auth order clear --provider anthropic
```

针对特定代理：

```bash
openclaw models auth order set --provider anthropic --agent main anthropic:default
```

### OAuth 和 API Key 有何不同？

OpenClaw 两者皆支持：

- **OAuth** 通常关联订阅访问（如适用）。
- **API Key** 采用按令牌计费。

向导明确支持 Anthropic setup-token 及 OpenAI Codex OAuth，且可保存 API Keys。

## Gateway：端口、“已运行”及远程模式

### Gateway 用哪个端口？

`gateway.port` 控制 WebSocket + HTTP 复用端口（控制 UI、Webhook 等）。

优先级：

```
--port > OPENCLAW_GATEWAY_PORT > gateway.port > 默认 18789
```

### 为什么 `openclaw gateway status` 报告 Runtime running 但 RPC 探测失败？

“运行中”是**监控器视角**（launchd/systemd/schtasks）；RPC 探测是 CLI 连接 Gateway WebSocket 调用 `status`。

看以下可信信息：

- `Probe target:` （探测 URL）
- `Listening:` （绑定端口信息）
- `Last gateway error:` （最近错误说明）

### 为什么 `openclaw gateway status` 显示 CLI 配置和服务配置不符？

意味着你编辑一个配置文件，服务运行另外一个（通常是 `--profile` 或 `OPENCLAW_STATE_DIR` 不匹配）。

解决：

```bash
openclaw gateway install --force
```

用目标Profile对应环境执行。

### “another gateway instance is already listening” 是什么意思？

OpenClaw 启动时尝试绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`），若端口被占用会报 `EADDRINUSE`，抛出 `GatewayLockError`。意味着已有实例监听。

解决：停止其他实例，释放端口，或者用：

```bash
openclaw gateway --port <port>
```

指定不同端口。

### 如何运行 OpenClaw 远程模式，客户端连接远程 Gateway？

设置：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://gateway.tailnet:18789",
      token: "your-token",
      password: "your-password",
    },
  },
}
```

注意：

- `openclaw gateway` 仅当 `gateway.mode` 为 `local` 时启动（除非传递覆盖标识）。
- macOS App 实时读取配置，自动切换模式。

### 控制 UI 显示未授权或持续重连，应怎么办？

你的 Gateway 开启了认证 (`gateway.auth.*`)，但 UI 未发送正确令牌。

事实说明：

- 控制 UI 将令牌储存在当前浏览器标签 `sessionStorage`，刷新同标签仍有效，无长期本地存储。
- 于 `AUTH_TOKEN_MISMATCH`，可基于提示尝试带设备令牌的重试。

解决方案：

- 快速打开 `openclaw dashboard`（打印并复制仪表盘链接，尝试打开，无图形时提示 SSH）；
- 若无令牌，执行 `openclaw doctor --generate-gateway-token`；
- 远程时先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host` 后访问 `http://127.0.0.1:18789/`；
- 在 Gateway 主机配置 `gateway.auth.token` 或环境变量；
- 在控制 UI 设置中粘贴相同令牌；
- 若重试失败，重置设备令牌：

  ```bash
  openclaw devices list
  openclaw devices rotate --device <id> --role operator
  ```

- 仍然卡住，运行 `openclaw status --all`，参见 [故障排查](/gateway/troubleshooting)；认证信息见 [仪表盘](/web/dashboard)。

### 设置 `gateway.bind` 为 tailnet 后无法绑定，无服务监听？

`tailnet` 绑定使用 Tailscale 网络接口（100.64.0.0/10）IP。如果机器没启动 Tailscale 或接口断开，无法绑定。

解决：

- 启动 Tailscale，使机器获得 100.x 地址，或
- 改用 `gateway.bind: "loopback"` 或 `"lan"`。

注意：`tailnet` 显式绑定；`auto` 默认选回送接口。想专用 tailnet，显式使用 `gateway.bind: "tailnet"`。

### 可以在同一主机跑多个 Gateway 吗？

通常不行 —— 一个 Gateway 可管理多渠道、多代理。除非需冗余或强隔离。

可行方案但需隔离：

- 分别设置独立的 `OPENCLAW_CONFIG_PATH` 配置文件。
- 分别用独立 `OPENCLAW_STATE_DIR` 状态目录。
- 分别使用不同 `agents.defaults.workspace` 工作区。
- 设置不同 `gateway.port` 端口。

推荐快速配置：

- 用 `openclaw --profile <name> …` 每实例一份配置和状态（自动生成 `~/.openclaw-<name>`）。
- 在每个配置里指定唯一的 `gateway.port`（或手动运行时指定）。
- 安装各配置对应的服务：`openclaw --profile <name> gateway install`。

服务会以 `ai.openclaw.<profile>` 命名，旧版类似 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`。

详见：[多个 Gateway 运行指南](/gateway/multiple-gateways)。

### “invalid handshake code 1008”是啥意思？

Gateway 是 **WebSocket 服务端**，首条消息必须是 `connect` 帧，否则关闭连接并返回代码 1008（策略违规）。

常见原因：

- 访问了 HTTP 地址（`http://...`）而非 WebSocket。
- 端口/路径错误。
- 代理/隧道剥离认证头或不是 Gateway 请求。

快速修复：

1. 用 WS 地址：`ws://<host>:18789`（或 `wss://...`）。
2. 不要在普通浏览器标签打开 WS 端口。
3. 认证时在 `connect` 帧携带令牌/密码。

CLI/TUI 运行示例：

```
openclaw tui --url ws://<host>:18789 --token <token>
```

协议详细说明：[Gateway 协议](/gateway/protocol)。

## 日志与调试

### 日志都存哪里？

结构化文件日志：

```
/tmp/openclaw/openclaw-YYYY-MM-DD.log
```

可设置稳定路径：`logging.file`，文件日志等级：`logging.level`，控制台输出详尽度通过 `--verbose` 和 `logging.consoleLevel` 控制。

最快查看日志：

```bash
openclaw logs --follow
```

服务/守护进程日志（Gateway 通过 launchd/systemd 运行时）:

- macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；Profile 模式下为 `~/.openclaw-<profile>/logs/...`）
- Linux:

  ```bash
  journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager
  ```

- Windows:

  ```bash
  schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST
  ```

详见 [故障排查](/gateway/troubleshooting#log-locations)。

### 如何启动/停止/重启 Gateway 服务？

用 Gateway 辅助命令：

```bash
openclaw gateway status
openclaw gateway restart
```

git → npm 示例：

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

Doctor 会检测服务配置不符并自动或提示修复。

备份建议见：[备份策略](/help/faq#推荐备份策略)。

### Gateway 应该跑在笔记本还是 VPS？

简答：**想要全天候稳定用 VPS**，想省钱且可接受断线睡眠则本地。

笔记本（本地 Gateway）：

- 优点：无云费用，直连本地文件，有实时 UI。
- 缺点：睡眠、网络掉线、系统更新会断开，需常开机。

VPS/云端：

- 优点：全天在线，网络稳定，无睡眠问题，易保持运行。
- 缺点：无界面（用截图代替），没本地文件，只能 SSH 维护。

特别说明：WhatsApp、Telegram、Slack、Discord 等均可 VPS 运行。

推荐：如遇断线推荐 VPS，本地适合正在使用机器且需本地文件或 UI 自动化情形。

### 运行 OpenClaw 要专门用一台机器重要吗？

不是必须，但稳定性和隔离建议这么做。

- 独立主机（VPS/Mac mini/Pi）：全天在线，无睡眠中断，权限清晰。
- 台式或笔记本共用：调试、日常用可，但机器睡眠和重启会暂停服务。

最佳方案：Gateway 运行于专用主机，笔记本作为节点使用（屏幕、摄像头、执行工具）。

安全插件见 [安全](/gateway/security)。

### VPS 最低要求和推荐操作系统？

OpenClaw 轻量。

基本 Gateway + 1 个频道：

- **最低**：1 vCPU，1GB 内存，约 500MB 磁盘
- **推荐**：1-2 vCPU，2GB 以上内存以支持日志、媒体和多频道

操作系统：Ubuntu LTS 或 modern Debian/Ubuntu 最佳。

详见：[Linux](/platforms/linux)、[VPS 托管](/vps)。

### Telegram setMyCommands 失败我该检查什么？

同 VPS 要求：

- **最低**：1 vCPU，1GB RAM。
- **推荐**：2GB 以上，视多频道和浏览器自动化需求。
- **OS**：Ubuntu LTS 或现代 Debian/Ubuntu。

然后匹配错误：

- `BOT_COMMANDS_TOO_MUCH`: Telegram 菜单条目过多。OpenClaw 已经将条目裁剪到 Telegram 限制并重试，但仍需删除一些菜单条目。减少插件/技能/自定义命令，或者如果不需要菜单，可禁用 `channels.telegram.commands.native`。
- `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果您在 VPS 上或使用代理，请确认允许出站 HTTPS 并且 DNS 能解析 `api.telegram.org`。

如果网关是远程的，请确保您正在查看网关主机上的日志。

macOS 虚拟机详见 [macOS VM](/install/macos-vm)。

---

## 精准回答截图/聊天日志的提问

**问：“Anthropic API Key 默认模型是什么？”**

**答：** 在 OpenClaw 中，认证凭据和模型选择是分开的。配置了 `ANTHROPIC_API_KEY`（或将 Anthropic API Key 存到授权配置文件）后，认证就有了，但默认模型由你在配置项 `agents.defaults.model.primary` 设定（比如 `anthropic/claude-sonnet-4-5`、`anthropic/claude-opus-4-6`）。

如果看到 `No credentials found for profile "anthropic:default"`，表示 Gateway 运行时找不到该 Agent 的 Anthropic 授权配置。

---

卡住了？请到[Discord](https://discord.com/invite/clawd)提问或 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)寻求帮助。
