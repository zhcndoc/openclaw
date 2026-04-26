---
summary: "导出已脱敏的轨迹包，以便调试 OpenClaw 代理会话"
read_when:
  - 调试代理为何以某种方式回答、失败或调用工具
  - 为 OpenClaw 会话导出支持包
  - 调查提示上下文、工具调用、运行时错误或使用元数据
  - 禁用或重新定位轨迹捕获
title: "轨迹包"
---

轨迹捕获是 OpenClaw 按会话记录的飞行记录器。它会为每次代理运行记录一条
结构化时间线，然后 `/export-trajectory` 会将当前会话打包为一个已脱敏的支持包。

当你需要回答以下问题时，请使用它：

- 发送给模型的提示、系统提示和工具是什么？
- 哪些对话消息和工具调用导致了这个答案？
- 运行是否超时、中止、压缩，或遇到了提供方错误？
- 当时启用了哪个模型、插件、技能和运行时设置？
- 提供方返回了哪些使用量和提示缓存元数据？

## 快速开始

在当前会话中发送以下内容：

```text
/export-trajectory
```

别名：

```text
/trajectory
```

OpenClaw 会将该包写入工作区下方：

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

你可以选择一个相对输出目录名：

```text
/export-trajectory bug-1234
```

自定义路径会解析到 `.openclaw/trajectory-exports/` 内部。绝对路径和
`~` 路径会被拒绝。

## 访问

轨迹导出是所有者命令。发送者必须通过该频道的常规命令授权检查
以及所有者检查。

## 会记录什么

OpenClaw 代理运行默认开启轨迹捕获。

运行时事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `model.completed`
- `trace.artifacts`
- `session.ended`

对话事件也会从活动会话分支中重建：

- 用户消息
- 助手消息
- 工具调用
- 工具结果
- 压缩
- 模型变更
- 标签和自定义会话条目

事件会以 JSON Lines 形式写入，并带有以下 schema 标记：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## 包文件

导出的包可以包含：

| 文件                  | 内容                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `manifest.json`       | 包架构、源文件、事件计数，以及生成的文件列表                                                 |
| `events.jsonl`        | 有序的运行时和对话时间线                                                                   |
| `session-branch.json` | 已脱敏的活动对话分支和会话头部                                                             |
| `metadata.json`       | OpenClaw 版本、操作系统/运行时、模型、配置快照、插件、技能和提示元数据                     |
| `artifacts.json`      | 最终状态、错误、使用量、提示缓存、压缩次数、助手文本和工具元数据                           |
| `prompts.json`        | 提交的提示以及所选的提示构建细节                                                           |
| `system-prompt.txt`   | 最近编译的系统提示（如果已捕获）                                                           |
| `tools.json`          | 发送给模型的工具定义（如果已捕获）                                                         |

`manifest.json` 会列出该包中存在的文件。如果会话没有捕获相应的运行时数据，
某些文件会被省略。

## 捕获位置

默认情况下，运行时轨迹事件会写在会话文件旁边：

```text
<session>.trajectory.jsonl
```

OpenClaw 也会在会话旁边写入一个尽力而为的指针文件：

```text
<session>.trajectory-path.json
```

设置 `OPENCLAW_TRAJECTORY_DIR`，可将运行时轨迹侧车文件存储到一个
专用目录中：

```bash
export OPENCLAW_TRAJECTORY_DIR=/var/lib/openclaw/trajectories
```

当设置了这个变量时，OpenClaw 会为该目录中的每个会话 id 写入一个 JSONL 文件。

## 禁用捕获

在启动 OpenClaw 之前设置 `OPENCLAW_TRAJECTORY=0`：

```bash
export OPENCLAW_TRAJECTORY=0
```

这会禁用运行时轨迹捕获。`/export-trajectory` 仍然可以导出
对话分支，但诸如已编译上下文、提供方产物和提示元数据等仅运行时文件可能会缺失。

## 隐私与限制

轨迹包是为支持和调试而设计的，不适合公开发布。OpenClaw 会在写入导出文件前
对敏感值进行脱敏：

- 凭据和已知类似密钥的载荷字段
- 图像数据
- 本地状态路径
- 工作区路径，会替换为 `$WORKSPACE_DIR`
- 检测到的主目录路径

导出器还会对输入大小设限：

- 运行时侧车文件：50 MiB
- 会话文件：50 MiB
- 运行时事件：200,000
- 导出事件总数：250,000
- 单条运行时事件行在超过 256 KiB 时会被截断

在团队外共享之前，请先审查这些包。脱敏是尽力而为的，
无法识别每一种应用特定的密钥。

## 故障排查

如果导出没有运行时事件：

- 确认 OpenClaw 启动时没有设置 `OPENCLAW_TRAJECTORY=0`
- 检查 `OPENCLAW_TRAJECTORY_DIR` 是否指向可写目录
- 在会话中再发送一条消息，然后重新导出
- 检查 `manifest.json` 中的 `runtimeEventCount`

如果命令拒绝输出路径：

- 使用类似 `bug-1234` 的相对名称
- 不要传入 `/tmp/...` 或 `~/...`
- 将导出保留在 `.openclaw/trajectory-exports/` 内

如果导出因大小错误而失败，说明会话或侧车超过了
导出安全限制。请开启新会话，或导出更小的复现。

## 相关内容

- [Diffs](/tools/diffs)
- [Session management](/concepts/session)
- [Exec tool](/tools/exec)
