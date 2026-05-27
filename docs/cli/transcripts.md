---
summary: "CLI 参考，用于 `openclaw transcripts`（列出、查看和定位已存储的转录）"
read_when:
  - 你想从终端读取已存储的转录摘要
  - 你需要一个转录 Markdown 摘要的路径
  - 你正在调试核心转录存储布局
title: "转录 CLI"
---

# `openclaw transcripts`

检查由 OpenClaw 核心 `transcripts` 工具写入的转录。此 CLI 仅用于
只读；捕获、导入和摘要由 agent 工具负责，并由配置的自动启动源决定。

当你想查找昨天的记录、在编辑器中打开 Markdown 文件、将转录内容传给其他工具，
或调试某个会话落盘位置时，请使用此 CLI。它不会启动或停止捕获。

工件存放在 OpenClaw 状态目录下：

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

默认状态目录是 `~/.openclaw`；设置 `OPENCLAW_STATE_DIR` 可以使用其他目录。
日期目录来自会话开始时间，会话目录是从会话 id 派生出来的安全文件系统片段。

## 命令

```bash
openclaw transcripts list
openclaw transcripts show <session>
openclaw transcripts show YYYY-MM-DD/<session>
openclaw transcripts path <session>
openclaw transcripts path YYYY-MM-DD/<session>
openclaw transcripts path <session> --dir
openclaw transcripts path <session> --metadata
openclaw transcripts path <session> --transcript
openclaw transcripts list --json
openclaw transcripts show <session> --json
openclaw transcripts path <session> --json
```

- `list`：列出已存储的会话、带日期限定的选择器、开始时间、标题，以及 `summary.md` 路径。
- `show <session>`：打印存储的 `summary.md`。
- `path <session>`：打印 `summary.md` 路径。
- `path <session> --dir`：打印会话目录。
- `path <session> --metadata`：打印 `metadata.json`。
- `path <session> --transcript`：打印 `transcript.jsonl`。
- `--json`：打印机器可读输出。

当人类会话 id 在不同日期重复时，请使用 `list` 中带日期限定的选择器，
例如 `openclaw transcripts show 2026-05-22/standup`。
默认会话 id 包含时间戳和随机后缀；只有当它们在同一天内是唯一的时，
才配置固定会话 id。

## 输出

`list` 每行打印一个会话：

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  Weekly standup  /Users/alex/.openclaw/transcripts/2026-05-22/standup/summary.md
```

输出以制表符分隔。列分别为选择器、开始时间、标题和摘要路径。
选择器是回传给 `show` 或 `path` 的最安全值。

`list --json` 打印包含以下字段的对象：

- `sessionId`
- `selector`
- `date`
- `title`
- `startedAt`
- `stoppedAt`
- `source`
- `path`
- `summaryPath`
- `hasSummary`

`show --json` 返回已存储的会话元数据、选择器、会话目录、摘要路径以及摘要 Markdown 文本。
`path --json` 返回所选路径以及该文件是否存在。

## 每日多次会议

Transcripts 按日期分组会话，然后再按会话 id 分组。一天内的十场会议会变成十个同级文件夹：

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

对于大多数自动化场景，请使用默认生成的 id。仅当同一个 id 在同一天内不会被使用两次时，
才使用诸如 `standup` 这样的固定 id。

## 缺失摘要

实时会话会在会话停止时写入 `summary.md`。导入的转录会在导入后立即写入 `summary.md`。
当捕获处于活动状态、提供者在停止过程中失败，或者在收到任何发言之前就写入了元数据时，
会话仍可能出现在 `list` 中，但没有摘要。

使用 `path <session> --transcript` 检查仅追加的转录，并使用
`transcripts` 工具动作 `summarize` 重新生成 Markdown 摘要。

## 配置

转录捕获是可选启用的，因为实时来源可以加入并记录会议音频。
通过顶层 `transcripts.enabled` 启用该工具：

```json
{
  "transcripts": {
    "enabled": true,
    "maxUtterances": 2000
  }
}
```

在 `openclaw.json` 中使用 `transcripts.autoStart` 配置自动启动源。
每个条目只要存在就会被启用；省略某个条目即可禁用该来源。

```json
{
  "transcripts": {
    "enabled": true,
    "autoStart": [
      {
        "providerId": "discord-voice",
        "guildId": "1234567890",
        "channelId": "2345678901"
      },
      {
        "providerId": "slack-huddle",
        "accountId": "workspace",
        "channelId": "C123"
      }
    ]
  }
}
```
