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

- [快速开始与首次运行安装]
  - [我卡住了，最快的解决方法是什么？](#我卡住了最快的解决方法是什么)
  - [推荐的 OpenClaw 安装和配置方式是什么？](#推荐的-openclaw-安装和配置方式是什么)
  - [入门后如何打开仪表盘？](#入门后如何打开仪表盘)
  - [本地与远程如何验证仪表盘身份（Token）？](#本地与远程如何验证仪表盘身份token)
  - [需要什么运行时环境？](#需要什么运行时环境)
  - [能在树莓派上运行吗？](#能在树莓派上运行吗)
  - [树莓派安装有什么技巧？](#树莓派安装有什么技巧)
  - [卡在“wake up my friend”，入门流程无法继续怎么办？](#卡在wake-up-my-friend入门流程无法继续怎么办)
  - [可以迁移配置到新机器（Mac mini）而不重做入门吗？](#可以迁移配置到新机器mac-mini而不重做入门吗)
  - [最新版本的更新信息在哪里查看？](#最新版本的更新信息在哪里查看)
  - [无法访问 docs.openclaw.ai（SSL 错误）怎么办？](#无法访问docsopenclawai-ssl错误怎么办)
  - [稳定版和 Beta 版有什么区别？](#稳定版和beta版有什么区别)
  - [如何安装 Beta 版，Beta 和 Dev 有何区别？](#如何安装-beta-版-beta-和-dev-有何区别)
  - [如何尝试最新版本？](#如何尝试最新版本)
  - [安装和入门通常需要多长时间？](#安装和入门通常需要多长时间)
  - [安装卡住了，如何获取更多反馈？](#安装卡住了如何获取更多反馈)
  - [Windows 安装提示找不到 git 或 openclaw 未识别？](#windows-安装提示找不到-git-或-openclaw-未识别)
  - [Windows 执行输出乱码中文怎么办？](#windows-执行输出乱码中文怎么办)
  - [文档没解决我的问题，如何获得更好解答？](#文档没解决我的问题如何获得更好解答)
  - [如何在 Linux 上安装 OpenClaw？](#如何在-linux-上安装-openclaw)
  - [如何在 VPS 上安装 OpenClaw？](#如何在-vps-上安装-openclaw)
  - [云/VPS 安装指南在哪里？](#云vps-安装指南在哪里)
  - [OpenClaw 可以自我更新吗？](#openclaw-可以自我更新吗)
  - [入门向导具体做了什么？](#入门向导具体做了什么)
  - [运行需要 Claude 或 OpenAI 订阅吗？](#运行需要-claude-或-openai-订阅吗)
  - [可以无 API Key 使用 Claude Max 订阅吗？](#可以无-api-key-使用-claude-max-订阅吗)
  - [Anthropic 的 “setup-token” 授权如何工作？](#anthropic-的-setuptoken-授权如何工作)
  - [Anthropic 的 setup-token 从哪获取？](#anthropic-的-setuptoken-从哪获取)
  - [支持 Claude 订阅授权吗（Claude Pro 或 Max）？](#支持-claude-订阅授权吗claude-pro-或-max)
  - [为什么会收到 Anthropic 的 `HTTP 429: rate_limit_error`？](#为什么会收到-http-429-ratelimiterror-来自-anthropic)
  - [支持 AWS Bedrock 吗？](#支持-aws-bedrock吗)
  - [Codex 授权如何工作？](#codex-授权如何工作)
  - [支持 OpenAI 订阅授权（Codex OAuth）吗？](#支持-openai-订阅授权-codex-oauth-吗)
  - [如何设置 Gemini CLI OAuth？](#如何设置-gemini-cli-oauth)
  - [本地模型适合日常聊天吗？](#本地模型适合日常聊天吗)
  - [如何将托管模型流量限制在特定区域？](#如何将托管模型流量限制在特定区域)
  - [必须买 Mac Mini 来安装吗？](#必须买-mac-mini-来安装吗)
  - [iMessage 支持需要 Mac Mini 吗？](#imessage-支持需要-mac-mini-吗)
  - [买 Mac Mini 来运行 OpenClaw 可以连接 MacBook Pro 吗？](#买-mac-mini-来运行-openclaw-可以连接-macbook-pro-吗)
  - [可以用 Bun 吗？](#可以用-bun-吗)
  - [Telegram 的 `allowFrom` 中应该填什么？](#telegram-的-allowfrom-中应该填什么)
  - [多个用户可以用同一个 WhatsApp 号码和不同 OpenClaw 实例吗？](#多个用户可以用同一个-whatsapp-号码和不同-openclaw-实例吗)
  - [可以同时运行“快速聊天”代理和“Opus 编码”代理吗？](#可以同时运行快速聊天代理和opus编码代理吗)
  - [Homebrew 在 Linux 上能用吗？](#homebrew-在-linux-上能用吗)
  - [hackable (git) 安装和 npm 安装有什么区别？](#hackable-git-安装和-npm-安装有什么区别)
  - [以后可以在 npm 和 git 安装间切换吗？](#以后可以在-npm-和-git-安装间切换吗)
  - [Gateway 应该跑在笔记本还是 VPS？](#gateway-应该跑在笔记本还是-vps)
  - [运行 OpenClaw 要专门用一台机器重要吗？](#运行-openclaw-要专门用一台机器重要吗)
  - [VPS 最低要求和推荐操作系统？](#vps-最低要求和推荐操作系统)
  - [可以在虚拟机里跑 OpenClaw吗？要求是什么？](#可以在虚拟机里跑-openclaw吗要求是什么)
- [什么是 OpenClaw？](#什么是-openclaw)
  - [一句话介绍 OpenClaw](#一句话介绍-openclaw)
  - [核心价值是什么？](#核心价值是什么)
  - [刚装好，第一步做什么？](#刚装好第一步做什么)
  - [OpenClaw 的五大常用场景？](#openclaw-的五大常用场景)
  - [OpenClaw 相较 Claude Code 在 Web 开发上的优势？](#openclaw-相较-claude-code-在-web-开发上的优势)
- [技能与自动化](#技能与自动化)
  - [如何定制技能且不污染库？](#如何定制技能且不污染库)
  - [可以从自定义文件夹加载技能吗？](#可以从自定义文件夹加载技能吗)
  - [怎么给不同任务用不同模型？](#怎么给不同任务用不同模型)
  - [Bot 卡住了，怎么卸载重载沉重任务？](#bot-卡住了怎么卸载重载沉重任务)
  - [定时任务或提醒不触发，怎么排查？](#定时任务或提醒不触发怎么排查)
  - [Linux 上如何安装技能？](#linux-上如何安装技能)
  - [OpenClaw 可以定时或后台持续运行任务吗？](#openclaw-可以定时或后台持续运行任务吗)
  - [Linux 能运行 macOS 专属技能吗？](#linux-能运行-macos-专属技能吗)
  - [有 Notion 或 HeyGen 集成吗？](#有-notion-或-heygen-集成吗)
  - [如何安装浏览器接管的 Chrome 插件？](#如何安装浏览器接管的-chrome-插件)
- [沙箱与记忆](#沙箱与记忆)
  - [有专门的沙箱文档吗？](#有专门的沙箱文档吗)
  - [如何绑定宿主文件夹到沙箱？](#如何绑定宿主文件夹到沙箱)
  - [记忆是怎么工作的？](#记忆是怎么工作的)
  - [记忆老是忘怎么办？](#记忆老是忘怎么办)
  - [记忆会永久保留吗？有什么限制？](#记忆会永久保留吗有什么限制)
  - [语义记忆搜索需要 OpenAI API Key 吗？](#语义记忆搜索需要-openai-api-key-吗)
- [数据存放位置](#数据存放位置)
  - [所有数据都本地保存吗？](#所有数据都本地保存吗)
  - [OpenClaw 数据存哪里？](#openclaw-数据存哪里)
  - [AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放哪？](#agentsmd-soulmd-usermd-memorymd-应该放哪)
  - [推荐备份策略？](#推荐备份策略)
  - [如何彻底卸载 OpenClaw？](#如何彻底卸载-openclaw)
  - [代理能工作在工作区外吗？](#代理能工作在工作区外吗)
  - [远程模式下，Session 数据存在哪儿？](#远程模式下session-数据存在哪儿)
- [配置基础](#配置基础)
  - [配置是什么格式，在哪？](#配置是什么格式在哪)
  - [设置 `gateway.bind: "lan"` 或 `"tailnet"` 后端口监听异常、界面显示未授权？](#设置-gatewaybind-lan-或-tailnet-后端口监听异常界面显示未授权)
  - [为何本地访问也要 Token？](#为何本地访问也要-token)
  - [改了配置要重启吗？](#改了配置要重启吗)
  - [怎样关闭 CLI 幽默标语？](#怎样关闭-cli-幽默标语)
  - [如何开启网页搜索及网页抓取？](#如何开启网页搜索及网页抓取)
  - [如何实现中央 Gateway 和分布多设备的专用 Worker？](#如何实现中央-gateway-和分布多设备的专用-worker)
  - [OpenClaw 浏览器能无头运行吗？](#openclaw-浏览器能无头运行吗)
  - [如何用 Brave 浏览器控制？](#如何用-brave-浏览器控制)
- [远程 Gateway 与节点](#远程-gateway-与节点)
  - [Telegram、Gateway 和节点间消息如何转发？](#telegramgateway-和节点间消息如何转发)
  - [Gateway 远程部署，Agent 怎么访问电脑？](#gateway-远程部署agent-怎么访问电脑)
  - [Tailscale 连上了却收不到回复怎么办？](#tailscale-连上了却收不到回复怎么办)
  - [两个 OpenClaw 实例能互通吗（本地和 VPS）？](#两个-openclaw-实例能互通吗本地和-vps)
  - [多代理要多 VPS 吗？](#多代理要多-vps-吗)
  - [用笔记本节点代替 VPS SSH 有好处吗？](#用笔记本节点代替-vps-ssh-有好处吗)
  - [节点运行 Gateway 服务吗？](#节点运行-gateway-服务吗)
  - [有 API / RPC 方式应用配置吗？](#有-api-rpc-方式应用配置吗)
  - [首次安装用的最简配置？](#首次安装用的最简配置)
  - [如何在 VPS 上配置 Tailscale 并用 Mac 连接？](#如何在-vps-上配置-tailscale-并用-mac-连接)
  - [如何让 Mac 节点连接远程 Gateway (Tailscale Serve)？](#如何让-mac-节点连接远程-gateway-tailscale-serve)
  - [第二台笔记本该独立安装还是加节点？](#第二台笔记本该独立安装还是加节点)
- [环境变量及 .env 加载](#环境变量及-env-加载)
  - [OpenClaw 怎么加载环境变量？](#openclaw-怎么加载环境变量)
  - ["通过服务启动 Gateway，环境变量消失了"怎么办？](#通过服务启动-gateway环境变量消失了怎么办)
  - [设置了 COPILOT_GITHUB_TOKEN，但模型状态显示 Shell env 关闭，为什么？](#设置了-copilot_github_token但模型状态显示-shell-env-关闭为什么)
- [会话和多聊](#会话和多聊)
  - [如何开启新对话？](#如何开启新对话)
  - [不发 `/new` 会话会自动重置吗？](#不发-new-会话会自动重置吗)
  - [能设一扎堆 OpenClaw 实例，一个 CEO 多助理吗？](#能设一扎堆-openclaw-实例一个-ceo-多助理吗)
  - [为啥上下文中途截断？怎么预防？](#为啥上下文中途截断怎么预防)
  - [如何彻底重置 OpenClaw 但保留安装？](#如何彻底重置-openclaw-但保留安装)
  - [遇到“上下文过大”报错，如何重置或压缩？](#遇到上下文过大报错如何重置或压缩)
  - [为什么收到“LLM 请求被拒绝：messages.content.tool_use.input 字段必填”？](#为什么收到llm-请求被拒绝messagescontenttool_useinput-字段必填)
  - [为啥每 30 分钟收到一次心跳消息？](#为啥每-30-分钟收到一次心跳消息)
  - [WhatsApp 需不需要加 Bot 账号进群？](#whatsapp-需不需要加-bot-账号进群)
  - [如何获得 WhatsApp 群组的 JID？](#如何获得-whatsapp-群组的-jid)
  - [为什么 OpenClaw 不在群里回复？](#为什么-openclaw-不在群里回复)
  - [群组/线程会和私聊共享上下文吗？](#群组线程会和私聊共享上下文吗)
  - [能创建多少工作区和代理？](#能创建多少工作区和代理)
  - [Slack 能否同时开多 Bot 或多聊天？怎么设？](#slack-能否同时开多-bot-或多聊天怎么设)
- [模型：默认、选型、别名、切换](#模型默认选型别名切换)
  - [什么是默认模型？](#什么是默认模型)
  - [推荐用什么模型？](#推荐用什么模型)
  - [如何切换模型而不丢配置？](#如何切换模型而不丢配置)
  - [能用自托管模型（llama.cpp、vLLM、Ollama）吗？](#能用自托管模型llamacpp-vllm-ollama吗)
  - [OpenClaw、Flawd 和 Krill 用什么模型？](#openclawflawd-和-krill-用什么模型)
  - [如何无需重启动态切换模型？](#如何无需重启动态切换模型)
  - [能用 GPT 5.2 做日常，用 Codex 5.3 编码吗？](#能用-gpt-52-做日常用-codex-53-编码吗)
  - [为啥显示“模型不允许”然后不回复？](#为啥显示模型不允许然后不回复)
  - [为啥显示未知模型 minimax/MiniMax-M2.5？](#为啥显示未知模型minimaxminimaxm25)
  - [能默认用 MiniMax，复杂任务用 OpenAI 吗？](#能默认用-minimax复杂任务用-openai-吗)
  - [opus / sonnet / gpt 是内置快捷方式吗？](#opus-sonnet-gpt-是内置快捷方式吗)
  - [如何定义/覆盖模型别名？](#如何定义覆盖模型别名)
  - [如何添加 OpenRouter、Z.AI 等提供商的模型？](#如何添加-openrouterzai-等提供商的模型)
- [模型故障切换及 “所有模型失败”](#模型故障切换及-所有模型失败)
  - [故障切换如何工作？](#故障切换如何工作)
  - [该错误是什么意思？](#该错误是什么意思)
  - [`No credentials found for profile "anthropic:default"` 修复清单](#no-credentials-found-for-profile-anthropicdefault-修复清单)
  - [为何还尝试了 Google Gemini 但失败？](#为何还尝试了-google-gemini-但失败)
- [授权配置文件：定义及管理](#授权配置文件定义及管理)
  - [什么是授权配置文件？](#什么是授权配置文件)
  - [常见的配置文件 ID 是哪些？](#常见的配置文件-id-是哪些)
  - [能控制先尝试哪个配置文件吗？](#能控制先尝试哪个配置文件吗)
  - [OAuth 和 API Key 有何区别？](#oauth-和-api-key-有何区别)
- [Gateway：端口、已在运行及远程模式](#gateway端口已在运行及远程模式)
  - [Gateway 用什么端口？](#gateway-用什么端口)
  - [为何 `openclaw gateway status` 显示 Runtime: running 但 RPC 探针失败？](#为何-openclaw-gateway-status-显示-runtime-running-但-rpc-探针失败)
  - [为何 `openclaw gateway status` 显示 `Config (cli)` 和 `Config (service)` 不同？](#为何-openclaw-gateway-status-显示-config-cli-和-config-service-不同)
  - [“另一个 Gateway 实例已监听”是什么意思？](#另一个-gateway-实例已监听是什么意思)
  - [如何运行远程模式（客户端连接其它 Gateway）？](#如何运行远程模式客户端连接其它-gateway)
  - [控制界面显示“未授权”或不断重连，怎么办？](#控制界面显示未授权或不断重连怎么办)
  - [`gateway.bind: "tailnet"` 绑定失败，端口不监听？](#gatewaybind-tailnet-绑定失败端口不监听)
  - [能在同一主机上运行多个 Gateway 吗？](#能在同一主机上运行多个-gateway-吗)
  - [“无效握手”/代码 1008 是什么？](#无效握手代码-1008-是什么)
- [日志和调试](#日志和调试)
  - [日志在哪？](#日志在哪)
  - [如何启动/停止/重启 Gateway 服务？](#如何启动停止重启-gateway-服务)
  - [Windows 关闭终端后，如何重启 OpenClaw？](#windows-关闭终端后如何重启-openclaw)
  - [Gateway 启动但回复不来，怎么检查？](#gateway-启动但回复不来怎么检查)
  - [“Disconnected from gateway: no reason” 怎么办？](#disconnected-from-gateway-no-reason-怎么办)
  - [Telegram setMyCommands 网络错误，怎么排查？](#telegram-setmycommands-网络错误怎么排查)
  - [TUI 无输出，怎么办？](#tui-无输出怎么办)
  - [如何彻底停止然后启动 Gateway？](#如何彻底停止然后启动-gateway)
  - [简单说明：`openclaw gateway restart` 和 `openclaw gateway` 有何区别？](#简单说明-openclaw-gateway-restart-和-openclaw-gateway-有何区别)
  - [失败时如何最快获取更多细节？](#失败时如何最快获取更多细节)
- [媒体和附件](#媒体和附件)
  - [技能生成图片或 PDF，但没有发送怎么办？](#技能生成图片pdf但没有发送怎么办)
- [安全与访问控制](#安全与访问控制)
  - [允许 OpenClaw 收到入站私聊安全么？](#允许-openclaw-收到入站私聊安全么)
  - [提示注入仅公共 bot 才需担心吗？](#提示注入仅公共-bot-才需担心吗)
  - [Bot 需单独的邮箱/GitHub 或手机号吗？](#bot-需单独的邮箱github-或手机号吗)
  - [能给它全文消息自主权吗？安全吗？](#能给它全文消息自主权吗安全吗)
  - [个人助理任务能用便宜模型吗？](#个人助理任务能用便宜模型吗)
  - [Telegram 运行 `/start` 没收到配对码？](#telegram-运行-start-没收到配对码)
  - [WhatsApp 会主动发消息给联系人吗？配对怎么做？](#whatsapp-会主动发消息给联系人吗配对怎么做)
- [聊天命令、中止任务和“它停不下来”问题](#聊天命令中止任务和它停不下来问题)
  - [怎么阻止内部系统消息显示在聊天？](#怎么阻止内部系统消息显示在聊天)
  - [如何停止/取消正在运行的任务？](#如何停止取消正在运行的任务)
  - [如何从 Telegram 发 Discord 消息？（“Cross-context messaging denied”）](#如何从-telegram-发-discord-消息crosscontext-messaging-denied)
  - [为什么感觉 bot 忽略了快速发来的消息？](#为什么感觉-bot-忽略了快速发来的消息)

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
openclaw models auth setup-token --provider anthropic
```

其它机器生成的用法见上。

### 支持 Claude 订阅授权吗（Claude Pro 或 Max）？

支持，通过 setup-token。

OpenClaw 不再用 Claude Code CLI OAuth 令牌；请用 setup-token 或 Anthropic API Key。

详见：[Anthropic](/providers/anthropic)、[OAuth](/concepts/oauth)。

但请根据 Anthropic 现行政策自决是否使用，生产环境建议 API Key。

### 为什么会收到 Anthropic 的 `HTTP 429: rate_limit_error`？

表示 Anthropic 配额或请求速率限制耗尽。

- 订阅用户（setup-token）需等待重置或升级套餐。
- API Key 用户查看控制台使用状况，考虑提额。

若提示：

```
Extra usage is required for long context requests
```

意味着请求尝试使用 1M 长上下文(beta)，需开通额外计费。

建议设置**故障模型**，保证限流时仍有回答。

详见 [模型配置](/cli/models)、[OAuth](/concepts/oauth)、[/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

### 支持 AWS Bedrock 吗？

支持，通过 pi-ai 的 **Amazon Bedrock (Converse)** 提供商和手动配置。

需在 Gateway 主机提供 AWS 凭证和区域，且配置 Bedrock 提供商。

详见：[Amazon Bedrock](/providers/bedrock)、[模型提供商](/providers/models)。

若想用托管密钥服务，OpenAI 兼容代理依然是方案之一。

### Codex 授权如何工作？

OpenClaw 支持 OpenAI Code (Codex) 基于 OAuth（ChatGPT 登录）授权。

向导可执行 OAuth 流程，配置默认模型为 `openai-codex/gpt-5.4`。

详见：[模型提供商](/concepts/model-providers)、[起步向导](/start/wizard)。

### 支持 OpenAI 订阅授权 Codex OAuth 吗？

完全支持。OpenAI 明确支持外部工具订阅 OAuth，如 OpenClaw。

向导内可运行该 OAuth 流程。

详见：[OAuth](/concepts/oauth)、[模型提供商](/concepts/model-providers)、[向导](/start/wizard)。

### 如何设置 Gemini CLI OAuth？

Gemini CLI 用**插件式授权流程**，不需 client id/secret。

步骤：

1. 启用插件：

   ```bash
   openclaw plugins enable google-gemini-cli-auth
   ```

2. 登录认证：

   ```bash
   openclaw models auth login --provider google-gemini-cli --set-default
   ```

OAuth 令牌存储于 Gateway 主机授权配置文件。

详见 [模型提供商](/concepts/model-providers)。

### 本地模型适合日常聊天吗？

一般不合适。OpenClaw 需长上下文和高安全，体量小模型会裁剪且有信息泄漏风险。

若必须，使用本地最大 MiniMax M2.5 模型（LM Studio），详见 [/gateway/local-models](/gateway/local-models)。

小型/量化模型更易遭受提示注入攻击，见 [安全指南](/gateway/security)。

### 如何将托管模型流量限制在特定区域？

选用支持区域绑定的接口。

OpenRouter 提供 MiniMax、Kimi 和 GLM 的美国区服务，选美国区型号可保持数据驻留。

你亦可使用 `models.mode: "merge"` 混合 Anthropic/OpenAI 等模型作为降级，同时尊重区域限制。

### 必须买 Mac Mini 来安装吗？

不必。OpenClaw 支持 macOS、Linux，Windows 推荐用 WSL2。

Mac Mini 是可选的，有人买来做常驻主机。小 VPS、家用服务器或树莓派级设备也行。

只有用 macOS 独占工具时才需 Mac，比如 iMessage 推荐用 [BlueBubbles](/channels/bluebubbles)，服务器可在任何 Mac，Gateway 支持 Linux。

其他 macOS 独占工具，要么在 Mac 上运行 Gateway，要么配 macOS 节点。

详见：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

### iMessage 支持需要 Mac Mini 吗？

需要任何 macOS 设备登录 Messages，不必是 Mac Mini。

推荐用 [BlueBubbles](/channels/bluebubbles) 做 iMessage 中转，BlueBubbles 服务器跑在 Mac，Gateway 在 Linux 或别处。

常见方案：

- Gateway 在 Linux/VPS，BlueBubbles 服务器跑在任何登录 Messages 的 Mac。
- 单机运行全部于 Mac。

详见：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

### 买 Mac Mini 运行 OpenClaw 能连接 MacBook Pro 吗？

能。

- Mac Mini 运行 Gateway。
- MacBook Pro 作为节点连接（不会运行 Gateway，仅提供屏幕/摄像头/画布和 `system.run` 命令功能）。

典型场景：

- Gateway 常驻 Mac Mini。
- MacBook Pro 运行 macOS 应用或节点程序，绑定 Gateway。
- 用命令 `openclaw nodes status` / `openclaw nodes list` 查看。

详见：[节点](/nodes)、[节点命令行](/cli/nodes)。

### 可以用 Bun 吗？

不推荐。遇到 WhatsApp、Telegram 等运行时 BUG 还不少。

请用 Node 保证稳定。

若要试验，可在无 WhatsApp/Telegram 的非生产环境尝试 Bun。

### Telegram 的 `allowFrom` 中应该填什么？

`channels.telegram.allowFrom` 是**发送人 Telegram 用户 ID（数字）**，不是用户名。

入门向导可接受 `@用户名` 并转为 ID，授权判定用数字 ID。

安全做法：

- 直接私聊机器人，运行 `openclaw logs --follow` 查看 `from.id`。
- 用 Bot API 调用更新接口获取 id。
- 或用第三方机器人（如 `@userinfobot`）查 ID。

详见 [/channels/telegram](/channels/telegram#access-control-dms--groups)。

### 多个用户可以用同一个 WhatsApp 号码和不同 OpenClaw 实例吗？

可以，用**多代理路由**。

将每个 WhatsApp DM（kind: "direct"，发件人 E.164 号码）绑定到不同 `agentId`，每人工作区和会话独立。

回复仍来自同一 WhatsApp 账号，DM 访问控制全局（`channels.whatsapp.dmPolicy` / `allowFrom`）。

详见 [多代理路由](/concepts/multi-agent) 和 [WhatsApp](/channels/whatsapp)。

### 可以同时运行“快速聊天”代理和“Opus 编码”代理吗？

可以。用多代理路由：

- 给每代理设置默认模型。
- 将入站路由绑定到对应代理。

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

若通过 systemd 启动 OpenClaw，确保 PATH 包含 `~/.linuxbrew/bin` 或 brew 前缀目录。

新版本 systemd 服务也自动追加用户 bin 目录并识别相关环境变量（PNPM_HOME、BUN_INSTALL 等）。

### hackable (git) 安装和 npm 安装有什么区别？

- **可编辑 git 安装**：完整源码检出，适合贡献者，自行本地编译和修改代码/文档。
- **npm 安装**：全局 CLI，无源码，适合“直接运行”，通过 npm 标签更新。

详见：[入门](/start/getting-started)、[升级](/install/updating)。

### 以后可以在 npm 和 git 安装间切换吗？

可以。

先装另一种版本，再运行 `openclaw doctor` 确保 Gateway 服务指向正确可执行文件。

此操作不会删数据，状态目录和工作区不变。

npm→git 示例：

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
openclaw doctor
openclaw gateway restart
```

git→npm 示例：

```bash
npm install -g openclaw@latest
openclaw doctor
openclaw gateway restart
```

Doctor 会检测服务配置不符，自动或手动修复。

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

### 可以在虚拟机里跑 OpenClaw吗？要求是什么？

可，及同 VPS 要求：

- **最低**：1 vCPU，1GB RAM。
- **推荐**：2GB 以上，视多频道和浏览器自动化需求。
- **OS**：Ubuntu LTS 或现代 Debian/Ubuntu。

Windows 推荐用 WSL2 环境。

macOS 虚拟机详见 [macOS VM](/install/macos-vm)。

---

## 精准回答截图/聊天日志的提问

**问：“Anthropic API Key 默认模型是什么？”**

**答：** 在 OpenClaw 中，认证凭据和模型选择是分开的。配置了 `ANTHROPIC_API_KEY`（或将 Anthropic API Key 存到授权配置文件）后，认证就有了，但默认模型由你在配置项 `agents.defaults.model.primary` 设定（比如 `anthropic/claude-sonnet-4-5`、`anthropic/claude-opus-4-6`）。

如果看到 `No credentials found for profile "anthropic:default"`，表示 Gateway 运行时找不到该 Agent 的 Anthropic 授权配置。

---

卡住了？请到[Discord](https://discord.com/invite/clawd)提问或 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)寻求帮助。
