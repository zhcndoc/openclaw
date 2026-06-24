---
summary: "OpenClaw 个人助手设置的默认 OpenClaw 代理说明和技能清单"
title: "默认 AGENTS.md"
read_when:
  - 开始新的 OpenClaw 代理会话
  - 启用或审核默认技能
---

## 首次运行（推荐）

OpenClaw 为代理使用专用的工作区目录。默认：`~/.openclaw/workspace`（可通过 `agents.defaults.workspace` 配置）。

1. 创建工作区（如果它还不存在）：

```bash
mkdir -p ~/.openclaw/workspace
```

2. 将默认工作区模板复制到工作区：

```bash
cp docs/reference/templates/AGENTS.md ~/.openclaw/workspace/AGENTS.md
cp docs/reference/templates/SOUL.md ~/.openclaw/workspace/SOUL.md
cp docs/reference/templates/TOOLS.md ~/.openclaw/workspace/TOOLS.md
```

3. 可选：如果你想要个人助手技能清单，请用此文件替换 AGENTS.md：

```bash
cp docs/reference/AGENTS.default.md ~/.openclaw/workspace/AGENTS.md
```

4. 可选：通过设置 `agents.defaults.workspace` 选择不同的工作区（支持 `~`）：

```json5
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
}
```

## 安全默认设置

- 不要把目录或密钥转储到聊天中。
- 除非明确被要求，否则不要运行破坏性命令。
- 在更改配置或调度器之前（例如 crontab、systemd 单元、nginx 配置或 shell rc 文件），先检查现有状态，并默认进行保留/合并。
- 不要向外部消息界面发送部分/流式回复（仅发送最终回复）。

## Existing solutions preflight

Before proposing or building a custom system, feature, workflow, tool, integration, or automation, do a brief check for open-source projects, maintained libraries, existing OpenClaw plugins, or free platforms that already solve it well enough. Prefer those when adequate. Build custom only when existing options are unsuitable, too expensive, unmaintained, unsafe, non-compliant, or the user explicitly asks for custom. Avoid paid-service recommendations unless the user explicitly approves spend. Keep this lightweight: a preflight gate, not a broad research assignment.

## Session start (required)

- 读取 `SOUL.md`、`USER.md`，以及 `memory/` 中今天和昨天的内容。
- 如存在，读取 `MEMORY.md`。
- 在回复前完成这些操作。

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
- 将环境相关的说明保留在 `TOOLS.md` 中（技能备注）。

## 备份提示（推荐）

如果你把这个工作区当作 Clawd 的“记忆”，请把它做成一个 git 仓库（最好是私有的），这样 `AGENTS.md` 和你的记忆文件就会被备份。

```bash
cd ~/.openclaw/workspace
git init
git add AGENTS.md
git commit -m "添加 Clawd 工作区"
# 可选：添加私有远程仓库并推送
```

## OpenClaw 的作用

- 运行 WhatsApp 网关 + 内嵌 OpenClaw 代理，使助手可以读取/写入聊天、获取上下文，并通过宿主 Mac 运行技能。
- macOS 应用管理权限（屏幕录制、通知、麦克风），并通过其捆绑二进制文件暴露 `openclaw` CLI。
- 默认情况下，直接聊天会合并到代理的 `main` 会话中；群组保持隔离，格式为 `agent:<agentId>:<channel>:group:<id>`（房间/频道：`agent:<agentId>:<channel>:channel:<id>`）；心跳保持后台任务存活。

## 核心技能（在 设置 → 技能 中启用）

- **mcporter** - 用于管理外部技能后端的工具服务器运行时/CLI。
- **Peekaboo** - 带可选 AI 视觉分析的快速 macOS 截图。
- **camsnap** - 从 RTSP/ONVIF 安防摄像头捕获帧、片段或移动警报。
- **oracle** - 带会话回放和浏览器控制的 OpenAI 就绪代理 CLI。
- **eightctl** - 从终端控制你的睡眠。
- **imsg** - 发送、读取、流式处理 iMessage 和 SMS。
- **wacli** - WhatsApp CLI：同步、搜索、发送。
- **discord** - Discord 操作：表情反应、贴纸、投票。使用 `user:<id>` 或 `channel:<id>` 作为目标（裸数字 id 可能有歧义）。
- **gog** - Google Suite CLI：Gmail、Calendar、Drive、Contacts。
- **spotify-player** - 终端版 Spotify 客户端，用于搜索/排队/控制播放。
- **sag** - 带类 macOS say 体验的 ElevenLabs 语音；默认流式输出到扬声器。
- **Sonos CLI** - 从脚本控制 Sonos 扬声器（发现/状态/播放/音量/分组）。
- **blucli** - 从脚本播放、分组并自动化 BluOS 播放器。
- **OpenHue CLI** - Philips Hue 场景与自动化照明控制。
- **OpenAI Whisper** - 用于快速听写和语音信箱转录的本地语音转文本。
- **Gemini CLI** - 在终端中使用 Google Gemini 模型进行快速问答。
- **agent-tools** - 用于自动化和辅助脚本的实用工具包。

## 使用说明

- 编写脚本时优先使用 `openclaw` CLI；mac 应用负责处理权限。
- 从 Skills 选项卡运行安装；如果二进制文件已存在，它会隐藏按钮。
- 保持心跳启用，这样助手才能安排提醒、监控收件箱并触发摄像头捕获。
- Canvas UI 以全屏和原生覆盖层运行。避免把关键控件放在左上/右上/底部边缘；在布局中添加明确的留白，不要依赖安全区域内边距。
- 对于基于浏览器的验证，请使用 `openclaw browser`（标签/状态/截图）和 OpenClaw 管理的 Chrome 配置文件。
- 对于 DOM 检查，请使用 `openclaw browser eval|query|dom|snapshot`（需要机器可读输出时再加 `--json`/`--out`）。
- 对于交互，请使用 `openclaw browser click|type|hover|drag|select|upload|press|wait|navigate|back|evaluate|run`（click/type 需要快照引用；使用 `evaluate` 来处理 CSS 选择器）。

## 相关

- [Agent workspace](/concepts/agent-workspace)
- [Agent runtime](/concepts/agent)
