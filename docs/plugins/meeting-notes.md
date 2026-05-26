---
summary: "Meeting Notes 插件：从 Discord 语音和导入的会议来源捕获转录，然后编写摘要"
read_when:
  - 你希望 OpenClaw 记录会议笔记
  - 你正在把 Discord 语音、Google Meet、Slack huddles 或其他会议来源接入笔记
  - 你需要 meeting_notes 工具契约
title: "Meeting Notes 插件"
---

Meeting Notes 插件是用于实时通话和导入的会议转录的通用笔记层。它负责转录存储、摘要渲染以及 `meeting_notes` 工具。通道插件负责捕获、身份验证以及平台特定的会议加入。

当你希望 OpenClaw 今天捕获 Discord 语音笔记，或者你想从其他会议系统导入转录，或者你正在构建 Google Meet、Slack huddle、Zoom 或由日历拥有的来源提供方时，请使用本页。

## 来源模型

会议来源通过插件 SDK 注册 `meetingNotesSourceProviders`。第一个实时提供方是 `discord-voice`；内置的 `manual-transcript` 提供方用于导入会后转录。

- `live-audio`：来源加入或监听通话并流式传输最终发言。
- `live-caption`：来源从浏览器或会议界面读取字幕。
- `posthoc-transcript`：来源在会议结束后导入转录或笔记工件。
- `recording-stt`：来源先转录录音，再导入发言内容。

这样可以让 Discord、Google Meet、Slack huddles 以及未来的会议界面都不进入笔记引擎。每个来源提供带发言人标注的发言；Meeting Notes 写入工件和摘要。

## 安装并启用

Meeting Notes 是本仓库中的一个外部来源插件。它不属于核心 OpenClaw npm 包，只有在插件作为插件安装，或者从包含 `extensions/meeting-notes` 的源代码检出中加载时才可用。

一旦插件被加载，默认即为启用，除非以下任一设置阻止它：

- `plugins.enabled: false` 会禁用所有插件。
- `plugins.deny` 包含 `meeting-notes`。
- `plugins.allow` 已设置但不包含 `meeting-notes`。
- `plugins.entries.meeting-notes.enabled: false` 会禁用此插件条目。
- `plugins.entries.meeting-notes.config.enabled: false` 会保持插件加载，但禁用 `meeting_notes` 工具和自动启动服务。

常规用户配置文件是 `~/.openclaw/openclaw.json`。`plugins` 部分控制插件加载，而嵌套的 `entries.<pluginId>.config` 对象会作为插件特定配置传递给该插件。`meeting-notes` 下需要单独的 `config: { ... }` 块；插件通过它接收自己的选项，而无需向核心配置键添加内容。

当你的配置包含插件允许列表时，请使用以下结构：

```json5
{
  plugins: {
    allow: ["discord", "meeting-notes"],
    entries: {
      "meeting-notes": {
        enabled: true,
        config: {
          enabled: true,
          maxUtterances: 2000,
          autoStart: [],
        },
      },
    },
  },
}
```

编辑后运行配置检查：

```bash
openclaw config validate
```

Gateway 配置热重载会应用插件允许列表和插件条目变更。如果你还在修改来源插件本身、安装新的插件文件，或更改 Discord 语音凭据，请重启 Gateway。

## 配置

Meeting Notes 有三个插件配置字段：

- `enabled`：默认 `true`。设为 `false` 可保留插件已安装，但禁用工具和自动启动服务。
- `maxUtterances`：默认 `2000`。摘要生成只读取 `transcript.jsonl` 中最新的 N 条发言；有效值会被限制在 `1` 到 `10000` 之间。
- `autoStart`：默认为空。每一项会在 Gateway 启动或插件重载时启动一个实时笔记来源。

`autoStart` 条目接受以下字段：

- `providerId`：必填。Discord 语音请使用 `discord-voice`。
- `enabled`：可选，默认 `true`。设为 `false` 可保留该条目但不启动。
- `sessionId`：可选。如果省略，OpenClaw 会生成一个带时间戳的 id。
- `title`：可选的人类可读标题，用于摘要和 CLI 输出。
- `accountId`：可选，当存在多个账号时使用来源账号 id。
- `guildId`：提供方特定的 Discord guild id。
- `channelId`：提供方特定的 Discord 语音频道 id。
- `meetingUrl`：提供方特定的会议 URL，用于浏览器或日历来源。

当 OpenClaw 应在 gateway 启动时自动开始笔记捕获，请使用 `autoStart`：

```json5
{
  plugins: {
    entries: {
      "meeting-notes": {
        config: {
          autoStart: [
            {
              providerId: "discord-voice",
              guildId: "123",
              channelId: "456",
              title: "Weekly planning",
            },
          ],
        },
      },
    },
  },
}
```

自动启动会在启动失败时最多重试 12 次，每次间隔五秒。这使得笔记服务可以等待 Discord 等通道插件完成初始化。通过自动启动开启的会话，会在插件服务正常停止时被停止并生成摘要。

Discord 语音捕获仍然需要常规的 Discord 语音设置和权限。参见 [Discord 语音](/channels/discord#voice-mode)。

## Discord 语音

Discord 是第一个实时来源。Discord 插件负责语音连接、说话人检测、音频解码和转录。Meeting Notes 接收最终的、带说话人标注的发言并持久化保存。

对于 Discord 实时捕获：

- 先启用并配置 Discord 插件。
- 配置 Discord 语音模式，以便 OpenClaw 可以加入目标语音频道。
- 使用 `providerId: "discord-voice"`。
- 提供 `guildId` 和 `channelId`。
- 只有在你运行多个 Discord 账号时才添加 `accountId`。

转录模型不是由 Meeting Notes 选择的。在 Discord 的 `stt-tts` 语音模式中，STT 使用 `tools.media.audio`；`voice.model` 控制的是代理回复模型，而不是转录。在实时语音模式中，转录遵循已配置的实时提供方和模型。请参见 [Discord 语音](/channels/discord#voice-mode) 了解当前 Discord 语音模型和提供方参数。

## Google Meet、Slack huddles 和其他来源

Meeting Notes 故意保持来源中立。Google Meet、Slack huddles、Zoom、日历录音或浏览器字幕捕获，都应该是通过插件 SDK 注册的独立来源提供方。

推荐的来源选择：

- Google Meet 实时浏览器/字幕支持：实现一个接受 `meetingUrl` 并输出最终字幕发言的 `live-caption` 提供方。
- Google Meet 录音或下载的转录：实现 `posthoc-transcript`，或者在存在提供方之前先使用 `manual-transcript`。
- 目前的 Slack huddles：导入会后 huddle 笔记或转录工件。Slack 不提供通用的 bot 加入式实时 huddle 音频 API。
- 未来的 Slack huddles：让 Slack 拥有的来源提供方负责 Slack 身份验证、工件查找和转录规范化。

笔记引擎不应包含平台加入、浏览器自动化、Slack API 轮询或 Discord 语音逻辑。这些都属于对应的来源插件。

## 工具

使用带有 `action` 的 `meeting_notes`：

- `status`：列出已注册的提供方和活跃会话。
- `start`：开始一个实时笔记会话。
- `stop`：停止一个实时会话并写入 `summary.md`。
- `import`：导入转录并写入 `summary.md`。
- `summarize`：为现有会话重新生成摘要。

Discord 实时笔记需要 `providerId: "discord-voice"`，以及 `guildId` 和 `channelId`。当只有一个 Discord 账号处于活动状态时，`accountId` 是可选的。

```json
{
  "action": "start",
  "providerId": "discord-voice",
  "guildId": "123",
  "channelId": "456",
  "title": "Weekly planning"
}
```

按会话 id 停止：

```json
{
  "action": "stop",
  "sessionId": "meeting-2026-05-22T10-00-00-000Z-a1b2c3d4"
}
```

导入转录：

```json
{
  "action": "import",
  "providerId": "manual-transcript",
  "title": "Design review",
  "transcript": "Alex: We decided to ship the Discord source first.\nSam: Action item: add Slack huddle import later."
}
```

`manual-transcript` 会将纯文本转录拆分为发言条目。可用于复制的 Google Meet 笔记、Slack huddle 摘要、日历转录，或任何已经生成文本的来源。

## 存储布局

工件存放在 OpenClaw 状态目录下：

```text
$OPENCLAW_STATE_DIR/meeting-notes/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

如果未设置 `OPENCLAW_STATE_DIR`，默认状态目录是 `~/.openclaw`。因此，常规本地安装会将笔记写入 `~/.openclaw/meeting-notes/...`。

每个文件各司其职：

- `metadata.json`：会话 id、来源提供方、标题、开始时间、结束时间以及提供方元数据。
- `transcript.jsonl`：仅追加的发言内容。每一行都是一个 JSON 对象，包含发言文本和会话 id。
- `summary.json`：供工具使用的结构化摘要数据，包括用于生成摘要的带说话人标注的转录窗口。
- `summary.md`：面向终端、编辑器和文档工作流的人类可读笔记，包括带说话人标注的转录部分。

日期目录来自会话开始时间，因此同一天的多个会议会被分组在一起。如果人类可读的会话 id 在不同日期重复，请使用 `openclaw meeting-notes list` 中带日期限定的选择器，例如 `2026-05-22/standup`。

默认情况下，OpenClaw 会生成带时间戳的会话 id：

```text
meeting-2026-05-22T10-00-00-000Z-a1b2c3d4
```

这意味着同一天的十场会议会变成十个同级目录：

```text
~/.openclaw/meeting-notes/2026-05-22/
  meeting-2026-05-22T09-00-00-000Z-a1b2c3d4/
  meeting-2026-05-22T10-30-00-000Z-b2c3d4e5/
  meeting-2026-05-22T13-00-00-000Z-c3d4e5f6/
```

只有当该 id 在当天是唯一的情况下，才配置 `sessionId`。像 `standup` 这样的人工 id 适合每天只会重复一次的会议。如果同一个 id 会出现在多个日期，请在 CLI 中使用带日期限定的选择器。

## CLI 访问

使用只读 CLI 来查找或打印已存储的摘要：

```bash
openclaw meeting-notes list
openclaw meeting-notes show <session>
openclaw meeting-notes path <session>
openclaw meeting-notes path <session> --transcript
```

有关完整命令参考，请参见 [会议记录 CLI](/cli/meeting-notes)。

## 长时间会议

对于长时间会议，发言内容会在到达时追加到 `transcript.jsonl` 中。摘要生成会读取一个由
`plugins.entries.meeting-notes.config.maxUtterances` 控制的有界窗口（默认值：`2000`），这样
多小时通话就不需要无限增长的摘要内存。

这意味着转录内容可以继续在磁盘上增长，而摘要保持
有界。当你需要在生成的摘要和带说话人标签的转录部分中包含更多多小时会议内容时，请增大 `maxUtterances`。
当摘要过慢或过大时，请减小它。

当前摘要会在会话停止、导入之后，或在运行 `summarize` 操作时生成。它们不会针对每条发言持续重写。

## 故障排查

### `meeting_notes` 缺失

检查插件是否已安装，或是否已从源码加载，以及插件加载是否没有将其排除：

```bash
openclaw config validate
openclaw meeting-notes list
```

如果设置了 `plugins.allow`，则必须包含 `meeting-notes`。如果 `plugins.deny`
包含 `meeting-notes`，请将其移除。

### 自动开始未加入 Discord

确认 `autoStart` 条目使用了 `providerId: "discord-voice"`，并且包含
`guildId` 和 `channelId`。如果你运行多个 Discord 账号，请包含 `accountId`。另外，请通过 Discord 语音命令加入同一个语音频道，验证 Discord 语音是否能在 Meeting Notes 之外正常工作。

### 缺少摘要

实时会话会在停止时写入 `summary.md`。使用
`meeting_notes` 操作 `stop` 停止会话，然后检查它：

```bash
openclaw meeting-notes list
openclaw meeting-notes path <session>
```

对已有的存储会话使用 `meeting_notes` 操作 `summarize` 重新生成 `summary.md`。

### 选择器有歧义

如果你复用了诸如 `standup` 这样的人工会话 ID，请使用
`openclaw meeting-notes list` 显示的带日期限定的选择器：

```bash
openclaw meeting-notes show 2026-05-22/standup
```

## 相关内容

- [会议记录 CLI](/cli/meeting-notes)
- [Discord 语音](/channels/discord#voice-mode)
- [插件管理](/tools/plugin)
- [插件架构](/plugins/architecture)
