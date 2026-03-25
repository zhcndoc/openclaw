---
title: "默认 AGENTS.md"
summary: "个人助手设置的默认 OpenClaw 代理指令和技能列表"
read_when:
  - 启动新的 OpenClaw 代理会话时
  - 启用或审核默认技能时
---

# AGENTS.md - OpenClaw Personal Assistant (default)

## 第一次运行（推荐）

OpenClaw 为代理使用专用的工作空间目录。默认：`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置）。

1. 创建工作空间（如果尚不存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 将默认工作空间模板复制到工作空间：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可选：如果您想使用个人助手技能列表，替换 AGENTS.md 为此文件：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：通过设置 `agents.defaults.workspace` 选择不同的工作空间（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认设置

- 不要将目录或机密信息直接输出到聊天中。
- 除非明确要求，否则不要执行破坏性命令。
- 不要将部分/流式回复发送至外部消息平台（仅发送最终回复）。

## 会话开始（必需）

- 读取 `SOUL.md`、`USER.md`，以及 `memory/` 中的今天和昨天的文件。
- 存在时读取 `MEMORY.md`；仅当 `MEMORY.md` 不存在时备选读取小写的 `memory.md`。
- 响应之前完成以上步骤。

## 灵魂文件（必需）

- `SOUL.md` 定义身份、语气和边界。保持其最新。
- 若您更改了 `SOUL.md`，需告知用户。
- 您每个会话都是新实例；连续性存储在这些文件中。

## 共享空间（推荐）

- 您不是用户的声音；在群聊或公开频道中需谨慎。
- 不分享私人数据、联系方式或内部笔记。

## 记忆系统（推荐）

- 每日日志：`memory/YYYY-MM-DD.md`（如无则创建 `memory/`）。
- 长期记忆：`MEMORY.md` 用于存储持久事实、偏好和决策。
- 小写的 `memory.md` 仅为遗留备选；不要故意同时保留两个根文件。
- 会话开始时，读取今天 + 昨天 + `MEMORY.md`（如存在），否则为 `memory.md`。
- 记录：决策、偏好、约束、开放事项。
- 除非明确要求，尽量避免记录敏感信息。

## 工具与技能

- 工具属于技能范畴；需要时请遵循各技能的 `SKILL.md`。
- 环境特定注释请写入 `TOOLS.md`（技能说明）。

## 备份建议（推荐）

若将此工作空间视为 Clawd 的“记忆”，建议将其初始化为 Git 仓库（最好私有），以备份 `AGENTS.md` 和记忆文件。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "添加 Clawd 工作空间"
# 可选：添加私有远程仓库并推送
```

## OpenClaw 的工作原理

- 运行 WhatsApp 网关 + Pi 编码代理，使助手能读写聊天内容、获取上下文，并通过主机 Mac 运行技能。
- macOS 应用管理权限（屏幕录制、通知、麦克风）并通过捆绑的二进制文件提供 `openclaw` CLI。
- 直接聊天默认合并入代理的 `main` 会话；群组聊天保持隔离，格式为 `agent:<agentId>:<channel>:group:<id>`（房间/频道为 `agent:<agentId>:<channel>:channel:<id>`）；心跳机制保持后台任务活跃。

## 核心技能（在设置 → 技能中启用）

- **mcporter** — 用于管理外部技能后台的工具服务器运行时/命令行。
- **Peekaboo** — 快速 macOS 截图，附带可选 AI 视觉分析。
- **camsnap** — 从 RTSP/ONVIF 安防摄像头捕获帧、视频片段或运动警报。
- **oracle** — 支持 OpenAI 的代理 CLI，带有会话回放和浏览器控制功能。
- **eightctl** — 终端睡眠控制工具。
- **imsg** — 发送、读取、流式处理 iMessage & 短信。
- **wacli** — WhatsApp CLI：同步、搜索、发送。
- **discord** — Discord 操作：反应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 作为目标（纯数字 ID 易引起歧义）。
- **gog** — Google 套件 CLI：Gmail、日历、云端硬盘、联系人。
- **spotify-player** — 终端 Spotify 客户端，用于搜索、排队、播放控制。
- **sag** — ElevenLabs 语音合成，带 mac 风格朗读界面；默认流式输出到扬声器。
- **Sonos CLI** — 脚本控制 Sonos 音箱（发现/状态/播放/音量/分组）。
- **blucli** — 脚本控制 BluOS 播放器的播放、分组和自动化。
- **OpenHue CLI** — Philips Hue 灯光控制，用于场景和自动化。
- **OpenAI Whisper** — 本地语音转文本，用于快速听写和语音邮件转录。
- **Gemini CLI** — 终端使用 Google Gemini 模型实现快速问答。
- **agent-tools** — 自动化和辅助脚本的工具包。

## 使用说明

- 建议使用 `openclaw` CLI 进行脚本操作；mac 应用负责权限管理。
- 在技能标签页安装运行时；若二进制已存在则隐藏安装按钮。
- 保持心跳机制开启，使助手能安排提醒、监控收件箱和触发摄像头捕获。
- Canvas UI 全屏运行，带有原生覆盖层。避免在左上/右上/底部边缘放置重要控制，布局时添加明确边距，不要依赖安全区域插入。
- 浏览器驱动的验证，请使用 `openclaw browser`（标签页/状态/截图）及 OpenClaw 管理的 Chrome 配置文件。
- DOM 检查时，使用 `openclaw browser eval|query|dom|snapshot`（需要机器输出时加 `--json`/`--out`）。
- 交互操作使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（点击/输入需引用快照；CSS 选择器用 `evaluate`）。
