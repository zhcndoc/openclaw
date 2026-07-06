---
summary: "CLI 参考，用于 `openclaw transcripts`（列出、查看和定位已存储的转录）"
read_when:
  - 你想从终端读取已存储的转录摘要
  - 你需要一个转录 Markdown 摘要的路径
  - 你正在调试核心转录存储布局
title: "转录 CLI"
---

# `openclaw transcripts`

用于由 `transcripts` 代理工具写入的转录的只读检查器。  
捕获、导入和摘要都通过该工具运行，而不是通过此 CLI。

工件位于状态目录下：

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

默认状态目录为 `~/.openclaw`；可使用 `OPENCLAW_STATE_DIR` 覆盖。  
日期目录来自会话开始时间；会话目录是从会话 id 派生的、适用于文件系统的 slug。

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

| Command                       | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `list`                        | 列出已存储的会话。                               |
| `show <session>`              | 打印已存储的 `summary.md`。                     |
| `path <session>`              | 打印 `summary.md` 路径。                        |
| `path <session> --dir`        | 打印会话目录。                                   |
| `path <session> --metadata`   | 打印 `metadata.json`。                           |
| `path <session> --transcript` | 打印 `transcript.jsonl`。                        |
| `--json`                      | 打印机器可读输出（适用于任意子命令）。            |

`<session>` 可以是裸会话 ID，也可以是带日期限定的选择器
（`YYYY-MM-DD/<session>`）。当同一个会话 ID 在多天中出现时，请使用带限定的形式，
例如 `openclaw transcripts show
2026-05-22/standup`。默认会话 ID 包含时间戳和随机后缀；
只有当该 ID 在当天内唯一时，才为会话指定固定 ID。

## 输出

`list` 会为每个会话打印一行以制表符分隔的内容：选择器、开始时间、标题、
摘要路径。

```text
2026-05-22/standup  2026-05-22T09:00:00.000Z  每周站会  /Users/user/.openclaw/transcripts/2026-05-22/standup/summary.md
```

选择器是传回给 `show` 或 `path` 时最安全的值。

`list --json` 返回包含 `sessionId`、`selector`、`date`、`title`、
`startedAt`、`stoppedAt`、`source`、`path`、`summaryPath`、`hasSummary` 的对象。

`show --json` 返回已存储的会话元数据、选择器、会话
目录、摘要路径以及摘要 Markdown 文本。

`path --json` 返回所选路径以及该文件是否存在。

## 每天多个会话

会话按日期分组，然后按会话 id 分组。一天中的十次会议会变成
十个同级文件夹：

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

自动化请使用默认生成的 id。仅当固定 id（如 `standup`）在同一天内不会重复时才使用。

## 缺失摘要

当会话停止时，Live sessions 会写入 `summary.md`；导入的转录会在导入后立即写入它。若在捕获仍处于活动状态时、提供方在停止过程中失败时，或在任何发言到达之前元数据已写入时，会话可能会出现在 `list` 中但没有摘要。

使用 `path <session> --transcript` 来检查原始的仅追加转录，或者运行 `transcripts` 工具的 `summarize` 操作来重新生成 Markdown 摘要。

## 配置

捕获是可选启用的（实时来源可以加入并记录会议音频）。通过以下方式启用：

```json
{
  "transcripts": {
    "enabled": true,
    "maxUtterances": 2000
  }
}
```

- `enabled`（默认 `false`）：开启该工具。
- `maxUtterances`（默认 `2000`，限制在 1-10000）：每个会话的发言缓冲区大小。

使用 `transcripts.autoStart` 配置自动启动来源。通过存在即可启用每一项；省略某项即可禁用该来源。`discord-voice` 是内置的支持自动启动的来源，需要 `guildId` 和 `channelId`：

```json
{
  "transcripts": {
    "enabled": true,
    "autoStart": [
      {
        "providerId": "discord-voice",
        "guildId": "1234567890",
        "channelId": "2345678901"
      }
    ]
  }
}
```
