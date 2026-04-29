---
summary: "导出已脱敏的轨迹包以调试 OpenClaw 代理会话"
read_when:
  - 调试为什么某个代理以某种方式回答、失败或调用工具
  - 为 OpenClaw 会话导出支持包
  - 排查提示上下文、工具调用、运行时错误或使用元数据
  - 禁用或重新定位轨迹捕获
title: "轨迹包"
---

轨迹捕获是 OpenClaw 按会话运行的飞行记录仪。它会为每次代理运行记录一条
结构化时间线，然后 `/export-trajectory` 会将当前会话打包成一个已脱敏的支持包。

当你需要回答以下问题时使用它：

- 发送给模型的提示词、系统提示词和工具是什么？
- 哪些转录消息和工具调用导致了这个结果？
- 运行是否超时、中止、压缩，或遇到了提供方错误？
- 当时启用了哪个模型、插件、技能和运行时设置？
- 提供方返回了哪些使用量和提示缓存元数据？

如果你是在为一个实时 Gateway 问题提交较宽泛的支持报告，请先使用
[`/diagnostics`](/gateway/diagnostics#chat-command)。Diagnostics 会收集
已清理的 Gateway 支持包，并且对于 OpenAI Codex harness 会话，在批准后还可以将
Codex 反馈发送到 OpenAI 服务器。当你明确需要详细的按会话提示、工具和转录
时间线时，请使用 `/export-trajectory`。

## 快速开始

在当前会话中发送：

```text
/export-trajectory
```

别名：

```text
/trajectory
```

OpenClaw 会将支持包写入工作区下：

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

你可以选择一个相对输出目录名：

```text
/export-trajectory bug-1234
```

自定义路径会在 `.openclaw/trajectory-exports/` 内解析。绝对路径和 `~` 路径会被拒绝。

轨迹包可能包含提示词、模型消息、工具模式、工具结果、运行时事件和本地路径。因此聊天斜杠命令每次都会经过 exec 批准流程。只在你打算创建支持包时批准一次导出；不要使用全放行。在群组聊天中，OpenClaw 会将批准提示和导出结果私下发送给拥有者，而不是把轨迹详情发回共享房间。

对于本地检查或支持工作流，你也可以直接运行已批准的命令路径：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
```

## 访问权限

轨迹导出是拥有者命令。发送者必须通过该频道的常规命令授权检查和拥有者检查。

## 会记录什么

OpenClaw 代理运行默认开启轨迹捕获。

运行时事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.fallback_step`，包括源模型、下一个模型、失败原因/详情、链路位置，以及回退是否推进、成功或耗尽链路
- `model.completed`
- `trace.artifacts`
- `session.ended`

转录事件也会从活动会话分支重建出来：

- 用户消息
- 助手消息
- 工具调用
- 工具结果
- 压缩
- 模型变更
- 标签和自定义会话条目

事件以 JSON Lines 形式写入，并带有以下 schema 标记：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## 支持包文件

导出的支持包可能包含：

| 文件                  | 内容                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `manifest.json`       | 支持包 schema、源文件、事件计数和生成文件列表                             |
| `events.jsonl`        | 有序的运行时和转录时间线                                                        |
| `session-branch.json` | 已脱敏的活动转录分支和会话头部                                           |
| `metadata.json`       | OpenClaw 版本、操作系统/运行时、模型、配置快照、插件、技能和提示元数据     |
| `artifacts.json`      | 最终状态、错误、使用量、提示缓存、压缩计数、助手文本和工具元数据 |
| `prompts.json`        | 已提交的提示词和选定的提示构建细节                                         |
| `system-prompt.txt`   | 最近编译的系统提示词（如已捕获）                                                   |
| `tools.json`          | 发送给模型的工具定义（如已捕获）                                              |

`manifest.json` 会列出该支持包中存在的文件。如果会话没有捕获相应的运行时数据，则某些文件会被省略。

## 捕获位置

默认情况下，运行时轨迹事件会写在会话文件旁边：

```text
<session>.trajectory.jsonl
```

OpenClaw 还会在会话文件旁边写入一个尽力而为的指针文件：

```text
<session>.trajectory-path.json
```

设置 `OPENCLAW_TRAJECTORY_DIR` 可将运行时轨迹侧车文件存储到一个
专用目录中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

设置此变量后，OpenClaw 会在该目录中为每个会话 id 写入一个 JSONL 文件。

会话维护在其所属会话条目被会话磁盘预算清理、截断或逐出时，会移除轨迹侧车文件。位于会话目录之外的运行时文件，只有在指针目标仍能证明它属于该会话时才会被移除。

## 禁用捕获

在启动 OpenClaw 之前设置 `OPENCLAW_TRAJECTORY=0`：

```bash
export OPENCLAW_TRAJECTORY=0
```

这会禁用运行时轨迹捕获。`/export-trajectory` 仍然可以导出
转录分支，但仅运行时文件（例如编译后的上下文、
提供方工件和提示元数据）可能会缺失。

## 隐私和限制

轨迹包是为支持和调试设计的，不适合公开发布。OpenClaw 会在写入导出文件之前对敏感值进行脱敏：

- 凭据和已知的类秘密负载字段
- 图像数据
- 本地状态路径
- 工作区路径，会替换为 `$WORKSPACE_DIR`
- 主页目录路径（如已检测到）

导出器也会对输入大小设置上限：

- 运行时侧车文件：50 MiB
- 会话文件：50 MiB
- 运行时事件：200,000
- 导出事件总数：250,000
- 单个运行时事件行在 256 KiB 以上会被截断

在与你的团队之外共享之前，请先审查支持包。脱敏是尽力而为的，无法知道所有应用特定的秘密。

## 故障排查

如果导出没有运行时事件：

- 确认 OpenClaw 启动时未设置 `OPENCLAW_TRAJECTORY=0`
- 检查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可写目录
- 在会话中再发送一条消息，然后重新导出
- 在 `manifest.json` 中检查 `runtimeEventCount`

如果命令拒绝输出路径：

- 使用像 `bug-1234` 这样的相对名称
- 不要传入 `/tmp/...` 或 `~/...`
- 将导出保留在 `.openclaw/trajectory-exports/` 内

如果导出因大小错误而失败，说明会话或侧车文件超过了
导出安全限制。请开启新会话，或导出更小的复现样例。

## 相关内容

- [Diffs](/tools/diffs)
- [会话管理](/concepts/session)
- [Exec 工具](/tools/exec)
