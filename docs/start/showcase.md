---
summary: "由 OpenClaw 支持的社区构建项目与集成"
title: "展示"
description: "来自社区的真实 OpenClaw 项目"
read_when:
  - 想要查找真实的 OpenClaw 使用案例
  - 更新社区项目亮点
---

OpenClaw 项目并不是玩具演示。人们正在把 PR 审核循环、移动应用、家庭自动化、语音系统、开发工具，以及重度内存工作流，部署到他们已经在使用的渠道中——在 Telegram、WhatsApp、Discord 和终端中构建原生聊天式应用；无需等待 API，就能实现用于预订、购物和支持的真实自动化；以及与打印机、吸尘器、摄像头和家庭系统的物理世界集成。

<Info>
**想要被展示吗？** 在 [Discord 的 #self-promotion 频道](https://discord.gg/clawd) 分享你的项目，或在 [X 上标记 @openclaw](https://x.com/openclaw)。
</Info>

## 视频

如果你想从“这是什么？”到“好吧，我懂了”走最短路径，就从这里开始。

<CardGroup cols={3}>

<Card title="完整设置演示" href="https://www.youtube.com/watch?v=SaWSPZoPX34">
  VelvetShark，28 分钟。安装、入门，并端到端获得第一个可工作的助手。
</Card>

<Card title="社区展示集锦" href="https://www.youtube.com/watch?v=mMSKQvlmFuQ">
  更快速地浏览围绕 OpenClaw 构建的真实项目、界面和工作流。
</Card>

<Card title="野外项目实例" href="https://www.youtube.com/watch?v=5kkIJNUGFho">
  来自社区的示例，从聊天原生编码循环到硬件和个人自动化。
</Card>

</CardGroup>

## Discord 最新内容

涵盖编码、开发工具、移动端和聊天原生产品构建的近期亮点。

<CardGroup cols={2}>

<Card title="PR 审核到 Telegram 反馈" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成更改，发起一个 PR，OpenClaw 审查差异并在 Telegram 中回复建议以及明确的合并结论。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw 在 Telegram 中提供 PR 审核反馈" />
</Card>

<Card title="几分钟内的酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

为本地酒窖技能向 "Robby"（@openclaw）提出请求。它会请求一个示例 CSV 导出和一个存储路径，然后构建并测试该技能（示例中有 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw 根据 CSV 构建本地酒窖技能" />
</Card>

<Card title="Tesco 购物自动驾驶" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周餐单、常购商品、预订配送时段、确认订单。无需 API，只用浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="通过聊天实现的 Tesco 购物自动化" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

用快捷键选定屏幕区域，Gemini 视觉识别，立刻把 Markdown 放进剪贴板。

  <img src="/assets/showcase/snag.png" alt="SNAG 截图转 Markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

桌面应用，用于跨 Agents、Claude、Codex 和 OpenClaw 管理技能与命令。

  <img src="/assets/showcase/agents-ui.jpg" alt="Agents UI 应用" />
</Card>

<Card title="Telegram 语音笔记（papla.media）" icon="microphone" href="https://papla.media/docs">
  **Community** • `voice` `tts` `telegram`

封装 papla.media 的文字转语音服务，并以 Telegram 语音笔记发送结果（无烦人自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="来自 TTS 的 Telegram 语音笔记输出" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

通过 Homebrew 安装的辅助工具，用于列出、检查和监视本地 OpenAI Codex 会话（CLI + VS Code）。

  <img src="/assets/showcase/codexmonitor.png" alt="ClawHub 上的 CodexMonitor" />
</Card>

<Card title="Bambu 3D 打印机控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排查 BambuLab 打印机：状态、任务、摄像头、AMS、校准等功能。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="维也纳交通（Wiener Linien）" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

提供维也纳公共交通的实时出发、故障、电梯状态与路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 学校餐食" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动化英国学校餐订购。使用鼠标坐标保障表格单元格点击准确。
</Card>

<Card title="R2 上传（Send Me My Files）" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上传到 Cloudflare R2/S3，并生成安全的预签名下载链接。适用于远程 OpenClaw 实例。
</Card>

<Card title="通过 Telegram 构建 iOS 应用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

使用 Telegram 聊天完整构建了带地图和语音录制功能的 iOS 应用，并部署到 TestFlight。
  
  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 应用" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

个人 AI 健康助理，集成 Oura Ring 数据与日历、预约和健身计划。

  <img src="/assets/showcase/oura-health.png" alt="Oura Ring 健康助理" />
</Card>

<Card title="Kev 的梦之队（14+ agents）" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

一个网关下的 14+ agents，由 Opus 4.5 编排器将任务委派给 Codex 工作者。有关 agent 沙箱化，请参阅 [technical write-up](https://github.com/adam91holt/orchestrated-ai-articles) 和 [Clawdspace](https://github.com/adam91holt/clawdspace)。
</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

面向 Linear 的 CLI，可与 agentic 工作流（Claude Code、OpenClaw）集成。可从终端管理问题、项目和工作流。
</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

通过 Beeper Desktop 读取、发送和归档消息。使用 Beeper 本地 MCP API，让 agents 可以在一个地方管理你的所有聊天（iMessage、WhatsApp 等）。
</Card>

</CardGroup>

## 自动化与工作流

调度、浏览器控制、支持循环，以及产品中“直接帮我把事做了”的那一面。

<CardGroup cols={2}>

<Card title="Winix 空气净化器控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了净化器控制方式，随后由 OpenClaw 负责管理室内空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="通过 OpenClaw 控制的 Winix 空气净化器" />
</Card>

<Card title="漂亮的天空摄像头照片" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

由屋顶摄像头触发：当天空看起来很美时，让 OpenClaw 拍一张天空照片。它设计了一个技能并完成了拍摄。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="由 OpenClaw 捕捉的屋顶摄像头天空快照" />
</Card>

<Card title="视觉晨间简报场景" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

一个定时提示词通过 OpenClaw persona 每天早上生成一张场景图像（天气、任务、日期、喜欢的帖子或引言）。
</Card>

<Card title="Padel 球场预订" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Playtomic 可用性检查器加预订 CLI。再也不会错过空闲球场。

  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli screenshot" />
</Card>

<Card title="会计资料收集" icon="file-invoice-dollar">
  **Community** • `automation` `email` `pdf`

从电子邮件中收集 PDF，为税务顾问准备文档。每月记账全自动。
</Card>

<Card title="躺平式开发模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

一边看 Netflix 一边通过 Telegram 重建整个个人网站——从 Notion 到 Astro，迁移了 18 篇文章，DNS 切到 Cloudflare。甚至都没打开过笔记本电脑。
</Card>

<Card title="求职搜索 agent" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，将其与简历关键词匹配，并返回带链接的相关机会。使用 JSearch API 在 30 分钟内完成构建。
</Card>

<Card title="Jira 技能构建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw 连接 Jira 后，实时生成了一个技能（在 ClawHub 还未存在之前）。
</Card>

<Card title="通过 Telegram 的 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

自动化 Todoist 任务，由 OpenClaw 在 Telegram 聊天中直接生成技能。
</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

通过浏览器自动化登录 TradingView，截取图表，并按需进行技术分析。无需 API —— 只需浏览器控制。
</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监视公司的 Slack 频道，提供有帮助的回复，并将通知转发到 Telegram。曾在无人要求的情况下，自动修复了一个已部署应用中的生产环境 bug。
</Card>

</CardGroup>

## 知识与记忆

用于索引、搜索、记忆并对个人或团队知识进行推理的系统。

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

通过 OpenClaw 提供发音反馈和学习流程的中文学习引擎。

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh 发音反馈" />
</Card>

<Card title="WhatsApp 记忆保险库" icon="vault">
  **Community** • `memory` `transcription` `indexing`

导入完整的 WhatsApp 导出，转写 1000+ 条语音笔记，与 git 日志交叉核对，输出带链接的 markdown 报告。
</Card>

<Card title="Karakeep 语义搜索" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

使用 Qdrant 加 OpenAI 或 Ollama embeddings 为 Karakeep 书签添加向量搜索。
</Card>

<Card title="Inside-Out-2 记忆" icon="brain">
  **Community** • `memory` `beliefs` `self-model`

独立的记忆管理器，会将会话文件转化为记忆，再转化为信念，最后形成不断演化的自我模型。
</Card>

</CardGroup>

## 语音与电话

以语音优先的入口、电话桥接，以及以转录为主的工作流。

<CardGroup cols={2}>

<Card title="Clawdia 电话桥接" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

Vapi 语音助手到 OpenClaw HTTP 桥接。与您的代理进行近乎实时的电话通话。
</Card>

<Card title="OpenRouter 转录" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter（Gemini 等）进行多语言音频转录。在 ClawHub 上可用。
</Card>

</CardGroup>

## 基础设施与部署

让 OpenClaw 更易于运行和扩展的打包、部署与集成。

<CardGroup cols={2}>

<Card title="Home Assistant 附加组件" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

运行在 Home Assistant OS 上的 OpenClaw 网关，支持 SSH 隧道和持久化状态。
</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

通过自然语言控制和自动化 Home Assistant 设备。
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

开箱即用、包含完整功能的 nix 化 OpenClaw 配置，用于可复现部署。
</Card>

<Card title="CalDAV 日历" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

使用 khal 和 vdirsyncer 的日历技能。自托管日历集成。
</Card>

</CardGroup>

## 家庭与硬件

OpenClaw 在现实世界中的一面：家庭、传感器、摄像头、吸尘器和其他设备。

<CardGroup cols={2}>

<Card title="GoHome 自动化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

以 OpenClaw 作为接口的 Nix 原生家庭自动化，外加 Grafana 仪表板。

  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana 仪表板" />
</Card>

<Card title="Roborock 吸尘器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

通过自然对话控制您的 Roborock 扫地机器人。

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock 状态" />
</Card>

</CardGroup>

## 社区项目

从单一工作流成长为更广泛产品或生态系统的项目。

<CardGroup cols={2}>

<Card title="StarSwap 市场" icon="star" href="https://star-swap.com/">
  **Community** • `marketplace` `astronomy` `webapp`

完整的天文器材市场。基于 OpenClaw 生态系统构建，并围绕其打造。
</Card>

</CardGroup>

## 提交你的项目

<Steps>
  <Step title="分享它">
    在 [Discord 上的 #self-promotion](https://discord.gg/clawd) 发帖，或 [@openclaw 发推](https://x.com/openclaw)。
  </Step>
  <Step title="提供详情">
    告诉我们它的功能，链接到仓库或演示，并且如果有截图也请分享。
  </Step>
  <Step title="获得推荐">
    我们会把出色的项目加入到这个页面。
  </Step>
</Steps>

## 相关

- [入门指南](/start/getting-started)
- [OpenClaw](/start/openclaw)
