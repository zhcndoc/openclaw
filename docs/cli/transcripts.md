---
summary: "openclaw transcripts 的 CLI 参考（列出、查看和导出已存储的转录）"
read_when:
  - 你想从终端读取已存储的转录摘要
  - 你需要一个转录 Markdown 摘要的路径
  - 你正在调试核心转录存储布局
title: "转录 CLI"
---

# `openclaw transcripts`

用于持久化会议转录的检查与导出命令。Google Meet、
Microsoft Teams 和 Zoom 浏览器参与者会自动捕获笔记；
`transcripts` 代理工具也支持提供方捕获和手动导入。

规范的转录状态保存在共享 SQLite 数据库中：
`$OPENCLAW_STATE_DIR/state/openclaw.sqlite`。`show` 和 `path` 会显式
在状态目录下生成面向用户的工件：

```text
$OPENCLAW_STATE_DIR/transcripts/YYYY-MM-DD/<session>/
  metadata.json
  transcript.jsonl
  summary.json
  summary.md
```

这些文件是导出内容，不是第二份运行时存储。OpenClaw 在捕获、
摘要生成或列表过程中不会重新读取它们。默认状态目录是
`~/.openclaw`；可通过 `OPENCLAW_STATE_DIR` 覆盖。日期目录来自会话开始时间；
会话目录是根据会话 id 派生的适合文件系统的 slug。

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

| 命令                          | 描述                                             |
| ----------------------------- | ------------------------------------------------ |
| `list`                        | 列出已存储的会话。                                |
| `show <session>`              | 打印并生成 `summary.md`。                         |
| `path <session>`              | 生成并打印 `summary.md` 路径。                    |
| `path <session> --dir`        | 生成所有工件并打印其目录。                        |
| `path <session> --metadata`   | 生成并打印 `metadata.json`。                      |
| `path <session> --transcript` | 生成并打印 `transcript.jsonl`。                   |
| `--json`                      | 输出机器可读格式结果（适用于任何子命令）。         |

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
存储的会议源 URL 仅包含 origin 和 path；在持久化之前会移除查询字符串、
片段和嵌入式凭据。

`show --json` 返回已存储的会话元数据、选择器、会话
目录、摘要路径以及摘要 Markdown 文本。

`path --json` 返回所选路径以及该资源是否可以被
物化。对于已存储的会话，元数据和转录导出始终存在；在会话拥有摘要之前，摘要路径会报告 `exists: false`。

## Multiple sessions per day

Sessions are grouped by date, then by session id. Ten meetings in a day become
ten sibling folders:

```text
~/.openclaw/transcripts/2026-05-22/
  transcript-2026-05-22T09-00-00-000Z-a1b2c3d4/
  transcript-2026-05-22T10-30-00-000Z-b2c3d4e5/
  standup/
```

For automation, use the default generated id. Only use a fixed id (such as `standup`) when it will not be duplicated on the same day.

## 缺失摘要

实时会话在会话停止时会存储并生成 `summary.md`；
导入的转录会在导入后立即执行此操作。当捕获仍在进行中时，如果提供方在停止时失败，或者在任何话语到达之前元数据已被存储，会话可能会在 `list` 中出现但没有摘要。

使用 `path <session> --transcript` 来检查原始的仅追加转录，或者运行 `transcripts` 工具的 `summarize` 操作来重新生成 Markdown 摘要。

## 升级旧版文件存储

早于 SQLite 存储的 OpenClaw 版本会将规范的运行时状态直接写入 `$OPENCLAW_STATE_DIR/transcripts/` 下。运行：

```bash
openclaw doctor --fix
```

Doctor 会将完整的旧版树导入 SQLite，验证行数和顺序，记录迁移回执，并将已验证的源树移动到带时间戳的 `transcripts.migrated-*` 归档中。运行时命令不会回退到旧版文件。请保留该归档，直到你已验证导入的会话以及你依赖的任何导出。

## 配置

默认已启用会议转录捕获。如需全局关闭：

```json
{
  "transcripts": {
    "enabled": false
  }
}
```

- `enabled`（默认 `true`）：启用自动会议笔记、transcripts 工具以及已配置的自动启动来源。若会议笔记不应持久化到主机上，请将其设为 `false`。显式请求的会议 `transcribe` 模式会保留其现有的有限实时字幕尾部，但在此设置为 false 时不会写入持久化记录。
  使用 `transcripts.autoStart` 配置自动启动来源。每个条目通过存在即表示启用；省略某个条目即可禁用该来源。`discord-voice`
  是内置的、支持自动启动的来源，并且需要 `guildId` 和
  `channelId`：

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

会议提供方 id 为 `google-meet`、`teams` 和 `zoom`。它们的别名
分别是 `googlemeet`/`meet`、`teams-meetings`/`microsoft-teams`/`msteams`，以及
`zoom-meetings`。会议提供方会附加到一个已经处于活动状态的
会议机器人会话；普通会议加入不需要 `autoStart` 条目。
