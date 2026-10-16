---
summary: "FAQ：快速启动和首次运行设置 - 安装、板载、身份验证、订阅、初始失败"
read_when:
  - "新安装、上手卡住，或首次运行错误"
  - "选择认证和提供商订阅"
  - "无法访问 docs.openclaw.ai、无法打开仪表盘、安装卡住"
title: "FAQ：首次运行设置"
sidebarTitle: "首次运行 FAQ"
---

快速开始和首次运行问答。关于日常操作、模型、认证、会话和故障排除，请参阅主 [FAQ](/help/faq)。

此页是一个索引。首次运行的问答记录在两页上，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                          | 读它的时候                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [快速启动和首次运行设置](/help/faq-first-run/quick-start)            | 您正在安装、载入或在首次运行时遇到错误。              |
| [提供商、硬件和托管](/help/faq-first-run/providers-and-hosting) | 您正在选择提供商身份验证或模型，或者决定在什么机器上运行它。 |

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本中的每个锚点都将其目标保留在此处，因此现有链接（例如 `/help/faq-first-run#why-am-i-seeing-http-429-ratelimiterror-from-anthropic`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start-and-first-run-setup" />[快速启动和首次运行设置](/help/faq-first-run/quick-start#quick-start-and-first-run-setup)
- <a id="i-am-stuck" />[I 卡住了](/help/faq-first-run/quick-start#i-am-stuck)
- <a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic" />[为什么我看到来自 Anthropic 的 HTTP 429 rate_limit_error？](/help/faq-first-run/providers-and-hosting#why-am-i-seeing-http-429-ratelimiterror-from-anthropic)
- <a id="recommended-way-to-install-and-set-up-openclaw" />[推荐的安装和设置方法 OpenClaw](/help/faq-first-run/quick-start#recommended-way-to-install-and-set-up-openclaw)
- <a id="i-am-stuck-fastest-way-to-get-unstuck" />[I 卡住了，最快的摆脱卡住的方法](/help/faq-first-run/quick-start#i-am-stuck-fastest-way-to-get-unstuck)
- <a id="how-do-i-open-the-dashboard-after-onboarding" />[ 入门引导后如何打开仪表板？](/help/faq-first-run/quick-start#how-do-i-open-the-dashboard-after-onboarding)
- <a id="how-do-i-authenticate-the-dashboard-on-localhost-vs-remote" />[如何在本地主机和远程上验证仪表板？](/help/faq-first-run/quick-start#how-do-i-authenticate-the-dashboard-on-localhost-vs-remote)
- <a id="heartbeat-keeps-skipping-what-do-the-skip-reasons-mean" />[Heartbeat 不断跳动。跳过原因是什么意思？](/help/faq-first-run/quick-start#heartbeat-keeps-skipping-what-do-the-skip-reasons-mean)
- <a id="why-are-there-two-exec-approval-configs-for-chat-approvals" />[为什么聊天批准有两个执行批准配置？](/help/faq-first-run/quick-start#why-are-there-two-exec-approval-configs-for-chat-approvals)
- <a id="what-runtime-do-i-need" />[ 我需要什么运行时？](/help/faq-first-run/quick-start#what-runtime-do-i-need)
- <a id="does-it-run-on-raspberry-pi" />[它在Raspberry Pi上运行吗？](/help/faq-first-run/quick-start#does-it-run-on-raspberry-pi)
- <a id="any-tips-for-raspberry-pi-installs" />[Raspberry Pi 安装有任何提示吗？](/help/faq-first-run/quick-start#any-tips-for-raspberry-pi-installs)
- <a id="it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now" />[它卡在唤醒我的朋友/入门不会孵化。现在怎么办？](/help/faq-first-run/quick-start#it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now)
- <a id="can-i-migrate-my-setup-to-a-new-machine-without-redoing-onboarding" />[我可以将我的设置迁移到新计算机而不重新进行登录吗？](/help/faq-first-run/quick-start#can-i-migrate-my-setup-to-a-new-machine-without-redoing-onboarding)
- <a id="where-do-i-see-what-is-new-in-the-latest-version" />[ 在哪里可以看到最新版本中的新增功能？](/help/faq-first-run/quick-start#where-do-i-see-what-is-new-in-the-latest-version)
- <a id="cannot-access-docs-openclaw-ai-ssl-error" />[无法访问docs.openclaw.ai（SSL错误）](/help/faq-first-run/quick-start#cannot-access-docs-openclaw-ai-ssl-error)
- <a id="difference-between-stable-and-beta" />[稳定版和测试版的区别](/help/faq-first-run/quick-start#difference-between-stable-and-beta)
- <a id="how-do-i-install-the-beta-version-and-what-is-the-difference-between-beta-and-dev" />[如何安装测试版以及测试版和开发版有什么区别？](/help/faq-first-run/quick-start#how-do-i-install-the-beta-version-and-what-is-the-difference-between-beta-and-dev)
- <a id="how-do-i-try-the-latest-bits" />[我如何尝试最新的位？](/help/faq-first-run/quick-start#how-do-i-try-the-latest-bits)
- <a id="how-long-does-install-and-onboarding-usually-take" />[ 安装和入门通常需要多长时间？](/help/faq-first-run/quick-start#how-long-does-install-and-onboarding-usually-take)
- <a id="installer-stuck-how-do-i-get-more-feedback" />[安装程序卡住了？如何获得更多反馈？](/help/faq-first-run/quick-start#installer-stuck-how-do-i-get-more-feedback)
- <a id="windows-install-says-git-not-found-or-openclaw-not-recognized" />[Windows 安装显示 git 未找到或 openclaw 无法识别](/help/faq-first-run/quick-start#windows-install-says-git-not-found-or-openclaw-not-recognized)
- <a id="windows-exec-output-shows-garbled-chinese-text-what-should-i-do" />[Windows exec 输出显示中文乱码 - 我该怎么办？](/help/faq-first-run/quick-start#windows-exec-output-shows-garbled-chinese-text-what-should-i-do)
- <a id="the-docs-did-not-answer-my-question-how-do-i-get-a-better-answer" />[文档没有回答我的问题 - 我如何获得更好的答案？](/help/faq-first-run/quick-start#the-docs-did-not-answer-my-question-how-do-i-get-a-better-answer)
- <a id="how-do-i-install-openclaw-on-linux" />[如何在Linux上安装OpenClaw？](/help/faq-first-run/quick-start#how-do-i-install-openclaw-on-linux)
- <a id="how-do-i-install-openclaw-on-a-vps" />[如何在VPS上安装OpenClaw？](/help/faq-first-run/quick-start#how-do-i-install-openclaw-on-a-vps)
- <a id="where-are-the-cloud-vps-install-guides" />[ cloud/VPS 安装指南在哪里？](/help/faq-first-run/quick-start#where-are-the-cloud-vps-install-guides)
- <a id="can-i-ask-openclaw-to-update-itself" />[我可以要求OpenClaw自行更新吗？](/help/faq-first-run/quick-start#can-i-ask-openclaw-to-update-itself)
- <a id="what-does-onboarding-actually-do" />[ 入门引导实际上有什么作用？](/help/faq-first-run/quick-start#what-does-onboarding-actually-do)
- <a id="do-i-need-a-claude-or-openai-subscription-to-run-this" />[ 我需要 Claude 或 OpenAI 订阅才能运行此程序吗？](/help/faq-first-run/quick-start#do-i-need-a-claude-or-openai-subscription-to-run-this)
- <a id="can-i-use-claude-max-subscription-without-an-api-key" />[ 我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？](/help/faq-first-run/quick-start#can-i-use-claude-max-subscription-without-an-api-key)
- <a id="do-you-support-claude-subscription-auth-claude-pro-or-max" />[是否支持Claude订阅授权（Claude Pro或Max）？](/help/faq-first-run/quick-start#do-you-support-claude-subscription-auth-claude-pro-or-max)
- <a id="why-am-i-seeing-http-429-rate-limit-error-from-anthropic" />[为什么我看到来自 Anthropic 的 HTTP 429 rate_limit_error？](/help/faq-first-run/providers-and-hosting#why-am-i-seeing-http-429-rate-limit-error-from-anthropic)
- <a id="is-aws-bedrock-supported" />[ AWS 是否支持基岩？](/help/faq-first-run/providers-and-hosting#is-aws-bedrock-supported)
- <a id="how-does-codex-auth-work" />[Codex 身份验证如何工作？](/help/faq-first-run/providers-and-hosting#how-does-codex-auth-work)
- <a id="why-does-openclaw-still-mention-legacy-openai-codex-prefix" />[为什么 OpenClaw 仍然提到旧版 OpenAI Codex 前缀？](/help/faq-first-run/providers-and-hosting#why-does-openclaw-still-mention-legacy-openai-codex-prefix)
- <a id="why-can-codex-oauth-limits-differ-from-chatgpt-web" />[为什么Codex OAuth限制与ChatGPT web不同？](/help/faq-first-run/providers-and-hosting#why-can-codex-oauth-limits-differ-from-chatgpt-web)
- <a id="do-you-support-openai-subscription-auth-codex-oauth" />[是否支持OpenAI订阅授权（Codex OAuth）？](/help/faq-first-run/providers-and-hosting#do-you-support-openai-subscription-auth-codex-oauth)
- <a id="can-i-use-gemini-cli-or-antigravity-oauth" />[我可以使用Gemini CLI或反重力OAuth吗？](/help/faq-first-run/providers-and-hosting#can-i-use-gemini-cli-or-antigravity-oauth)
- <a id="is-a-local-model-ok-for-casual-chats" />[是本地模型OK用于休闲聊天吗？](/help/faq-first-run/providers-and-hosting#is-a-local-model-ok-for-casual-chats)
- <a id="how-do-i-keep-hosted-model-traffic-in-a-specific-region" />[如何保持特定区域中的托管模型流量？](/help/faq-first-run/providers-and-hosting#how-do-i-keep-hosted-model-traffic-in-a-specific-region)
- <a id="do-i-have-to-buy-a-mac-mini-to-install-this" />[ 我必须购买 Mac Mini 才能安装这个吗？](/help/faq-first-run/providers-and-hosting#do-i-have-to-buy-a-mac-mini-to-install-this)
- <a id="do-i-need-a-mac-mini-for-imessage-support" />[ 我需要 Mac mini 才能支持 iMessage 吗？](/help/faq-first-run/providers-and-hosting#do-i-need-a-mac-mini-for-imessage-support)
- <a id="if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro" />[如果我购买 Mac mini 来运行 OpenClaw，我可以将其连接到我的 MacBook Pro 吗？](/help/faq-first-run/providers-and-hosting#if-i-buy-a-mac-mini-to-run-openclaw-can-i-connect-it-to-my-macbook-pro)
- <a id="can-i-use-bun" />[我可以使用Bun吗？](/help/faq-first-run/providers-and-hosting#can-i-use-bun)
- <a id="telegram-what-goes-in-allowfrom" />[电报：allowFrom中包含什么？](/help/faq-first-run/providers-and-hosting#telegram-what-goes-in-allowfrom)
- <a id="can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances" />[一个WhatsApp号码可以多人使用不同的OpenClaw实例吗？](/help/faq-first-run/providers-and-hosting#can-multiple-people-use-one-whatsapp-number-with-different-openclaw-instances)
- <a id="can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent" />[ 我可以运行“快速聊天”代理和“Opus 用于编码”代理吗？](/help/faq-first-run/providers-and-hosting#can-i-run-a-fast-chat-agent-and-an-opus-for-coding-agent)
- <a id="does-homebrew-work-on-linux" />[Homebrew是否适用于Linux？](/help/faq-first-run/providers-and-hosting#does-homebrew-work-on-linux)
- <a id="difference-between-the-hackable-git-install-and-npm-install" />[可破解的git安装和npm安装之间的区别](/help/faq-first-run/providers-and-hosting#difference-between-the-hackable-git-install-and-npm-install)
- <a id="can-i-switch-between-npm-and-git-installs-later" />[ 我可以稍后在 npm 和 git 安装之间切换吗？ ](/help/faq-first-run/providers-and-hosting#can-i-switch-between-npm-and-git-installs-later)
- <a id="should-i-run-the-gateway-on-my-laptop-or-a-vps" />[ 我应该在笔记本电脑还是 VPS 上运行网关？](/help/faq-first-run/providers-and-hosting#should-i-run-the-gateway-on-my-laptop-or-a-vps)
- <a id="how-important-is-it-to-run-openclaw-on-a-dedicated-machine" />[ 在专用机器上运行 OpenClaw 有多重要？](/help/faq-first-run/providers-and-hosting#how-important-is-it-to-run-openclaw-on-a-dedicated-machine)
- <a id="what-are-the-minimum-vps-requirements-and-recommended-os" />[ VPS 的最低要求和建议的 OS 是什么？](/help/faq-first-run/providers-and-hosting#what-are-the-minimum-vps-requirements-and-recommended-os)
- <a id="can-i-run-openclaw-in-a-vm-and-what-are-the-requirements" />[我可以在VM中运行OpenClaw吗？有什么要求？](/help/faq-first-run/providers-and-hosting#can-i-run-openclaw-in-a-vm-and-what-are-the-requirements)

## <a id="related"></a> 相关内容

- [FAQ](/help/faq) - 主要 FAQ（模型、会话、网关、安全性等）
- [模型 FAQ](/help/faq-models) - 模型默认值、选择、别名、切换、故障转移和身份验证配置文件
- [安装概览](/install)
- [入门](/start/getting-started)
- [故障排查](/help/troubleshooting)
