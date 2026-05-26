---
summary: "由 OpenClaw 驱动的社区项目和集成"
title: "展示"
description: "来自社区的真实 OpenClaw 项目"
read_when:
  - 寻找真实的 OpenClaw 使用示例
  - 更新社区项目亮点
---

OpenClaw 项目并不是玩具演示。人们正在通过他们已经在使用的渠道交付 PR 审查循环、移动应用、家庭自动化、语音系统、开发工具和重度内存工作流——在 Telegram、WhatsApp、Discord 和终端上进行聊天原生构建；无需等待 API 就能实现真实的预订、购物和支持自动化；以及与打印机、扫地机器人、摄像头和家庭系统的物理世界集成。

<Info>
**想被展示出来吗？** 在 Discord 的 [#self-promotion](https://discord.gg/clawd) 分享你的项目，或在 X 上 [标记 @openclaw](https://x.com/openclaw)。
</Info>

## 来自 Discord 的新鲜动态

跨编码、开发工具、移动端和聊天原生产品构建的近期亮点。

<CardGroup cols={2}>

<Card title="PR 审查到 Telegram 反馈" icon="code-pull-request" href="https://x.com/i/status/2010878524543131691">
  **@bangnokia** • `review` `github` `telegram`

OpenCode 完成更改，打开 PR，OpenClaw 审查差异并在 Telegram 中回复建议以及明确的合并结论。

  <img src="/assets/showcase/pr-review-telegram.jpg" alt="OpenClaw 在 Telegram 中传递的 PR 审查反馈" />
</Card>

<Card title="几分钟内完成葡萄酒酒窖技能" icon="wine-glass" href="https://x.com/i/status/2010916352454791216">
  **@prades_maxime** • `skills` `local` `csv`

向 “Robby” (@openclaw) 请求一个本地葡萄酒酒窖技能。它会请求一个示例 CSV 导出和一个存储路径，然后构建并测试该技能（示例中有 962 瓶酒）。

  <img src="/assets/showcase/wine-cellar-skill.jpg" alt="OpenClaw 从 CSV 构建本地葡萄酒酒窖技能" />
</Card>

<Card title="Tesco 购物自动驾驶" icon="cart-shopping" href="https://x.com/i/status/2009724862470689131">
  **@marchattonhere** • `automation` `browser` `shopping`

每周餐单、常购清单、预订送货时段、确认订单。没有 API，只有浏览器控制。

  <img src="/assets/showcase/tesco-shop.jpg" alt="通过聊天进行的 Tesco 购物自动化" />
</Card>

<Card title="SNAG 截图转 Markdown" icon="scissors" href="https://github.com/am-will/snag">
  **@am-will** • `devtools` `screenshots` `markdown`

用热键选取屏幕区域，Gemini 视觉识别，即时将 Markdown 放入你的剪贴板。

  <img src="/assets/showcase/snag.png" alt="SNAG 截图转 Markdown 工具" />
</Card>

<Card title="Agents UI" icon="window-maximize" href="https://releaseflow.net/kitze/agents-ui">
  **@kitze** • `ui` `skills` `sync`

用于在 Agents、Claude、Codex 和 OpenClaw 之间管理技能和命令的桌面应用。
</Card>

<Card title="Telegram 语音消息（papla.media）" icon="microphone" href="https://papla.media/docs">
  **社区** • `voice` `tts` `telegram`

封装 papla.media TTS，并将结果作为 Telegram 语音消息发送（没有烦人的自动播放）。

  <img src="/assets/showcase/papla-tts.jpg" alt="来自 TTS 的 Telegram 语音消息输出" />
</Card>

<Card title="CodexMonitor" icon="eye" href="https://clawhub.ai/odrobnik/codexmonitor">
  **@odrobnik** • `devtools` `codex` `brew`

通过 Homebrew 安装的助手，用于列出、检查和监视本地 OpenAI Codex 会话（CLI + VS Code）。
</Card>

<Card title="Bambu 3D 打印机控制" icon="print" href="https://clawhub.ai/tobiasbischoff/bambu-cli">
  **@tobiasbischoff** • `hardware` `3d-printing` `skill`

控制和排查 BambuLab 打印机：状态、任务、摄像头、AMS、校准等。

  <img src="/assets/showcase/bambu-cli.png" alt="ClawHub 上的 Bambu CLI 技能" />
</Card>

<Card title="维也纳交通（Wiener Linien）" icon="train" href="https://clawhub.ai/hjanuschka/wienerlinien">
  **@hjanuschka** • `travel` `transport` `skill`

维也纳公共交通的实时出发、延误、电梯状态和路线规划。

  <img src="/assets/showcase/wienerlinien.png" alt="ClawHub 上的 Wiener Linien 技能" />
</Card>

<Card title="ParentPay 学校餐食" icon="utensils">
  **@George5562** • `automation` `browser` `parenting`

通过 ParentPay 自动预订英国学校餐食。使用鼠标坐标可靠地点击表格单元格。
</Card>

<Card title="R2 上传（Send Me My Files）" icon="cloud-arrow-up" href="https://clawhub.ai/skills/r2-upload">
  **@julianengel** • `files` `r2` `presigned-urls`

上传到 Cloudflare R2/S3 并生成安全的预签名下载链接。适用于远程 OpenClaw 实例。
</Card>

<Card title="通过 Telegram 构建 iOS 应用" icon="mobile">
  **@coard** • `ios` `xcode` `testflight`

完整构建了一个带地图和语音录制功能的 iOS 应用，并且完全通过 Telegram 聊天部署到 TestFlight。

  <img src="/assets/showcase/ios-testflight.jpg" alt="TestFlight 上的 iOS 应用" />
</Card>

<Card title="Oura Ring 健康助手" icon="heart-pulse">
  **@AS** • `health` `oura` `calendar`

将 Oura 戒指数据与日历、预约和健身安排集成的个人 AI 健康助手。

  <img src="/assets/showcase/oura-health.png" alt="Oura 戒指健康助手" />
</Card>

<Card title="Kev's Dream Team（14+ 个代理）" icon="robot" href="https://github.com/adam91holt/orchestrated-ai-articles">
  **@adam91holt** • `multi-agent` `orchestration`

一个网关下的 14+ 个代理，由 Opus 4.5 编排器委派给 Codex 工作器。有关代理沙箱，请参见 [技术说明](https://github.com/adam91holt/orchestrated-ai-articles) 和 [Clawdspace](https://github.com/adam91holt/clawdspace)。
</Card>

<Card title="Linear CLI" icon="terminal" href="https://github.com/Finesssee/linear-cli">
  **@NessZerra** • `devtools` `linear` `cli`

用于 Linear 的 CLI，可与代理式工作流（Claude Code、OpenClaw）集成。可从终端管理 issue、项目和工作流。
</Card>

<Card title="Beeper CLI" icon="message" href="https://github.com/blqke/beepcli">
  **@jules** • `messaging` `beeper` `cli`

通过 Beeper Desktop 读取、发送和归档消息。使用 Beeper 本地 MCP API，因此代理可以在一个地方管理你的所有聊天（iMessage、WhatsApp 等）。
</Card>

</CardGroup>

## 自动化和工作流

日程安排、浏览器控制、支持循环，以及产品中“直接帮我把任务做了”的那一面。

<CardGroup cols={2}>

<Card title="Winix 空气净化器控制" icon="wind" href="https://x.com/antonplex/status/2010518442471006253">
  **@antonplex** • `automation` `hardware` `air-quality`

Claude Code 发现并确认了净化器控制项，然后 OpenClaw 接管以管理房间空气质量。

  <img src="/assets/showcase/winix-air-purifier.jpg" alt="通过 OpenClaw 控制 Winix 空气净化器" />
</Card>

<Card title="漂亮的天空摄像头照片" icon="camera" href="https://x.com/signalgaining/status/2010523120604746151">
  **@signalgaining** • `automation` `camera` `skill`

由屋顶摄像头触发：每当天空看起来很美时，就让 OpenClaw 拍一张天空照片。它设计了一个技能并拍下了照片。

  <img src="/assets/showcase/roof-camera-sky.jpg" alt="OpenClaw 捕获的屋顶摄像头天空快照" />
</Card>

<Card title="视觉晨间简报场景" icon="robot" href="https://x.com/buddyhadry/status/2010005331925954739">
  **@buddyhadry** • `automation` `briefing` `telegram`

一个定时提示词通过 OpenClaw persona 每天早晨生成一张场景图片（天气、任务、日期、最喜欢的帖子或引言）。
</Card>

<Card title="Padel 球场预订" icon="calendar-check" href="https://github.com/joshp123/padel-cli">
  **@joshp123** • `automation` `booking` `cli`

Playtomic 可用性检查器加预订 CLI。再也不会错过空场了。

  <img src="/assets/showcase/padel-screenshot.jpg" alt="padel-cli 截图" />
</Card>

<Card title="会计收集" icon="file-invoice-dollar">
  **社区** • `automation` `email` `pdf`

从电子邮件中收集 PDF，为税务顾问准备文件。每月会计全自动运行。
</Card>

<Card title="沙发土豆开发模式" icon="couch" href="https://davekiss.com">
  **@davekiss** • `telegram` `migration` `astro`

一边看 Netflix 一边通过 Telegram 重建了整个个人网站——从 Notion 到 Astro，迁移了 18 篇文章，DNS 迁移到 Cloudflare。连笔记本电脑都没打开过。
</Card>

<Card title="求职代理" icon="briefcase">
  **@attol8** • `automation` `api` `skill`

搜索职位列表，与简历关键词匹配，并返回带链接的相关机会。使用 JSearch API 在 30 分钟内构建完成。
</Card>

<Card title="Jira 技能构建器" icon="diagram-project" href="https://x.com/jdrhyne/status/2008336434827002232">
  **@jdrhyne** • `jira` `skill` `devtools`

OpenClaw 连接到 Jira，然后即时生成了一个新技能（在它出现在 ClawHub 之前）。
</Card>

<Card title="通过 Telegram 的 Todoist 技能" icon="list-check" href="https://x.com/iamsubhrajyoti/status/2009949389884920153">
  **@iamsubhrajyoti** • `todoist` `skill` `telegram`

自动化 Todoist 任务，并让 OpenClaw 直接在 Telegram 聊天中生成该技能。
</Card>

<Card title="TradingView 分析" icon="chart-line">
  **@bheem1798** • `finance` `browser` `automation`

通过浏览器自动化登录 TradingView，截取图表，并按需执行技术分析。无需 API——只需浏览器控制。
</Card>

<Card title="Slack 自动支持" icon="slack">
  **@henrymascot** • `slack` `automation` `support`

监视公司 Slack 频道，给出有帮助的回复，并将通知转发到 Telegram。未被要求就自主修复了已部署应用中的一个生产 bug。
</Card>

</CardGroup>

## 知识与记忆

用于索引、搜索、记忆和推理个人或团队知识的系统。

<CardGroup cols={2}>

<Card title="xuezh 中文学习" icon="language" href="https://github.com/joshp123/xuezh">
  **@joshp123** • `learning` `voice` `skill`

通过 OpenClaw 提供发音反馈和学习流程的中文学习引擎。

  <img src="/assets/showcase/xuezh-pronunciation.jpeg" alt="xuezh 发音反馈" />
</Card>

<Card title="WhatsApp 记忆保险库" icon="vault">
  **社区** • `memory` `transcription` `indexing`

导入完整的 WhatsApp 导出，转录 1000+ 条语音笔记，与 git 日志交叉核对，输出关联的 markdown 报告。
</Card>

<Card title="Karakeep 语义搜索" icon="magnifying-glass" href="https://github.com/jamesbrooksco/karakeep-semantic-search">
  **@jamesbrooksco** • `search` `vector` `bookmarks`

使用 Qdrant 以及 OpenAI 或 Ollama embeddings 为 Karakeep 书签添加向量搜索。
</Card>

<Card title="Inside-Out-2 记忆" icon="brain">
  **社区** • `memory` `beliefs` `self-model`

独立的记忆管理器，将会话文件转化为记忆，再转化为信念，最后形成不断演化的自我模型。
</Card>

</CardGroup>

## 语音与电话

以语音为先的入口、电话桥接，以及重度依赖转录的工作流。

<CardGroup cols={2}>

<Card title="Clawdia 电话桥接" icon="phone" href="https://github.com/alejandroOPI/clawdia-bridge">
  **@alejandroOPI** • `voice` `vapi` `bridge`

将 Vapi 语音助手连接到 OpenClaw 的 HTTP 桥接。可与你的智能体进行近乎实时的电话通话。
</Card>

<Card title="OpenRouter 转录" icon="microphone" href="https://clawhub.ai/obviyus/openrouter-transcribe">
  **@obviyus** • `transcription` `multilingual` `skill`

通过 OpenRouter（Gemini 等）进行多语言音频转录。在 ClawHub 上提供。
</Card>

</CardGroup>

## 基础设施与部署

让 OpenClaw 更易运行和扩展的打包、部署和集成。

<CardGroup cols={2}>

<Card title="Home Assistant 插件" icon="home" href="https://github.com/ngutman/openclaw-ha-addon">
  **@ngutman** • `homeassistant` `docker` `raspberry-pi`

运行在 Home Assistant OS 上的 OpenClaw 网关，支持 SSH 隧道和持久化状态。
</Card>

<Card title="Home Assistant 技能" icon="toggle-on" href="https://clawhub.ai/skills/homeassistant">
  **ClawHub** • `homeassistant` `skill` `automation`

通过自然语言控制和自动化 Home Assistant 设备。
</Card>

<Card title="Nix 打包" icon="snowflake" href="https://github.com/openclaw/nix-openclaw">
  **@openclaw** • `nix` `packaging` `deployment`

开箱即用的 nix 化 OpenClaw 配置，用于可复现部署。
</Card>

<Card title="CalDAV 日历" icon="calendar" href="https://clawhub.ai/skills/caldav-calendar">
  **ClawHub** • `calendar` `caldav` `skill`

使用 khal 和 vdirsyncer 的日历技能。自托管日历集成。
</Card>

</CardGroup>

## 家庭与硬件

OpenClaw 面向物理世界的一面：家庭、传感器、摄像头、吸尘器和其他设备。

<CardGroup cols={2}>

<Card title="GoHome 自动化" icon="house-signal" href="https://github.com/joshp123/gohome">
  **@joshp123** • `home` `nix` `grafana`

以 OpenClaw 作为界面的 Nix 原生家庭自动化，并配有 Grafana 仪表板。

  <img src="/assets/showcase/gohome-grafana.png" alt="GoHome Grafana 仪表板" />
</Card>

<Card title="Roborock 吸尘器" icon="robot" href="https://github.com/joshp123/gohome/tree/main/plugins/roborock">
  **@joshp123** • `vacuum` `iot` `plugin`

通过自然对话控制你的 Roborock 扫地机器人。

  <img src="/assets/showcase/roborock-screenshot.jpg" alt="Roborock 状态" />
</Card>

</CardGroup>

## 社区项目

从单一工作流发展为更广泛产品或生态系统的项目。

<CardGroup cols={2}>

<Card title="StarSwap 市集" icon="star" href="https://star-swap.com/">
  **社区** • `marketplace` `astronomy` `webapp`

完整的天文器材市集。围绕 OpenClaw 生态构建。
</Card>

</CardGroup>

## 提交你的项目

<Steps>
  <Step title="分享它">
    在 [Discord 上的 #self-promotion](https://discord.gg/clawd) 发帖，或 [@openclaw 发推](https://x.com/openclaw)。
  </Step>
  <Step title="包含详情">
    告诉我们它能做什么，附上仓库或演示链接，如果有截图也请一并分享。
  </Step>
  <Step title="获得推荐">
    我们会把出色的项目添加到这个页面。
  </Step>
</Steps>

## 相关链接

- [入门指南](/start/getting-started)
- [OpenClaw](/start/openclaw)
