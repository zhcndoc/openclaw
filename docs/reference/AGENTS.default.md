---
summary: "OpenClaw 个人助手设置的默认 OpenClaw 代理说明和技能清单"
title: "默认 AGENTS.md"
read_when:
  - 开始新的 OpenClaw 代理会话
  - 启用或审核默认技能
---

## 首次运行（推荐）

OpenClaw 代理使用工作区目录。默认值：`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置，支持 `~`）。

1. 创建工作区：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 将默认工作区模板复制到其中：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可选：使用此文件中的个人助手技能清单，而不是通用模板：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：指向不同的工作区：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认设置

- 不要将目录或机密信息转储到聊天中。
- 除非明确要求，不要运行破坏性命令。
- 在更改配置或调度器（crontab、systemd 单元、nginx 配置、shell rc 文件）之前，先检查现有状态，并默认进行保留/合并。
- 不要向外部消息传递渠道发送部分/流式回复（仅发送最终回复）。

## 现有解决方案预检

在提出或构建自定义系统、功能、工作流、工具、集成或自动化之前，请检查是否已有开源项目、维护中的库、现有的 OpenClaw 插件，或已经足够好地解决问题的免费平台。在足够合适时，优先选择这些方案。仅当现有选项不适用、成本过高、缺乏维护、不安全、不合规，或用户明确要求定制时，才构建自定义方案。除非用户明确批准支出，否则避免推荐付费服务。保持这一步轻量化，作为预检门槛，而不是研究任务。

## 会话开始（必需）

- 在回复之前阅读 `SOUL.md`、`USER.md` 以及 `memory/` 中今天和昨天的内容。
- 如存在 `MEMORY.md`，请阅读。

## 灵魂（必需）

- `SOUL.md` 定义身份、语气和边界。请保持其为最新。
- 如果你修改了 `SOUL.md`，请告诉用户。
- 你每个会话都是一个全新的实例；连续性保存在这些文件中。

## 共享空间（推荐）

- 你不是用户的代言人；在群聊或公共频道中要小心。
- 不要分享私人数据、联系方式或内部备注。

## 记忆系统（推荐）

- 每日日志：`memory/YYYY-MM-DD.md`（如需要请创建 `memory/`）。
- 长期记忆：`MEMORY.md`，用于保存持久化事实、偏好和决定。
- 小写的 `memory.md` 只是旧版修复输入；不要刻意同时保留这两个根文件。
- 在会话开始时，如存在，请读取今天、昨天以及 `MEMORY.md`。
- 在写入记忆文件之前，先读取它们；只写入具体更新，不要写空占位符。
- 记录：决定、偏好、约束、未完成事项。
- 除非明确要求，否则避免记录秘密。

## 工具和技能

- 工具存在于技能中；当你需要时，请遵循每个技能的 `SKILL.md`。
- 将环境相关的说明保存在 `TOOLS.md` 中（供技能使用的说明）。

## 备份提示（推荐）

将此工作区视为助手的记忆：把它做成一个 git 仓库（最好是私有仓库），这样 `AGENTS.md` 和记忆文件就会被备份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "Add workspace"
# 可选：添加一个私有远程仓库并推送
```

## OpenClaw 的作用

- 运行一个消息渠道网关（WhatsApp、Telegram、Discord、Signal、iMessage、Slack 等）以及一个嵌入式 agent，使助手能够读写聊天、获取上下文，并通过主机运行技能。
- macOS 应用负责管理权限（屏幕录制、通知、麦克风），并通过其捆绑的二进制文件公开 `openclaw` CLI。
- 直接聊天默认会合并到 agent 的 `main` 会话；群组和频道/房间会有各自的会话键。有关确切的键格式，请参见 [Channel routing](/channels/channel-routing)。心跳会保持后台任务处于活跃状态。

## 核心技能（在 设置 → 技能 中启用）

个人助理工作区的示例 roster；请根据你的配置替换为适合的技能。

- **mcporter** - 用于管理外部技能后端的工具服务器运行时/CLI。
- **Peekaboo** - 快速的 macOS 截图，支持可选的 AI 视觉分析。
- **camsnap** - 从 RTSP/ONVIF 安防摄像头捕获画面、片段或移动警报。
- **oracle** - 具备 OpenAI 兼容能力的 agent CLI，支持会话回放和浏览器控制。
- **eightctl** - 在终端中控制你的睡眠。
- **imsg** - 发送、读取、流式接收 iMessage 和 SMS。
- **wacli** - WhatsApp CLI：同步、搜索、发送。
- **discord** - Discord 操作：表情回应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 作为目标（纯数字 id 容易产生歧义）。
- **gog** - Google Suite CLI：Gmail、日历、云端硬盘、联系人。
- **spotify-player** - 终端版 Spotify 客户端，用于搜索/排队/控制播放。
- **sag** - ElevenLabs 语音，带有类似 mac 的 say 交互体验；默认流式输出到扬声器。
- **Sonos CLI** - 从脚本中控制 Sonos 扬声器（发现/状态/播放/音量/分组）。
- **blucli** - 从脚本中播放、分组并自动化 BluOS 播放器。
- **OpenHue CLI** - Philips Hue 照明控制，用于场景和自动化。
- **OpenAI Whisper** - 本地语音转文字，用于快速听写和语音信箱转录。
- **Gemini CLI** - 在终端中使用 Google Gemini 模型进行快速问答。
- **agent-tools** - 用于自动化和辅助脚本的实用工具包。

## 使用说明

- 优先使用 `openclaw` CLI 进行脚本编写；桌面应用负责处理权限。
- 从 Skills 选项卡运行安装；当所需二进制文件已存在时，安装按钮会被隐藏。
- 保持心跳功能启用，这样助手才能安排提醒、监控收件箱并触发摄像头拍摄。
- Canvas UI 以原生覆盖层全屏运行。避免将关键控件放在左上/右上/底部边缘；请添加显式布局边距，不要依赖安全区域内边距。
- 对于由浏览器驱动的验证，请使用带有 OpenClaw 管理的 Chrome/Brave/Edge/Chromium 配置文件的 `openclaw browser` CLI（捆绑的 `browser` 插件）。
- 管理：`status`、`doctor [--deep]`、`start [--headless]`、`stop`、`tabs`、`tab [new|select|close]`、`open <url>`、`focus <id>`、`close <id>`。
- 检查：`screenshot [--full-page|--ref|--labels]`、`snapshot [--format ai|aria|--interactive|--efficient]`、`console`、`errors`、`requests`、`pdf`、`responsebody`。
- 操作：`navigate`、`click <ref>`、`type <ref> <text>`、`press`、`hover`、`drag`、`select`、`upload`、`download`、`fill`、`dialog`、`wait`、`evaluate --fn <js>`、`highlight`。操作需要来自 `snapshot` 的 `ref`（不接受用于操作的 CSS 选择器）；当需要 `document.querySelector` 风格的定位时，请使用 `evaluate`。
- 在任何检查命令中添加 `--json` 以获得机器可读输出。

## 相关

- [Agent 工作区](/concepts/agent-workspace)
- [Agent 运行时](/concepts/agent)
- [Channel 路由](/channels/channel-routing)
