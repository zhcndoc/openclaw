---
summary: "导出已脱敏的轨迹包以调试 OpenClaw 代理会话"
read_when:
  - "调试代理为何做出某种回答、失败或以某种方式调用工具"
  - "导出 OpenClaw 会话的支持包"
  - "调查提示词上下文、工具调用、运行时错误或使用元数据"
  - "关闭轨迹捕获"
title: "轨迹包"
---

轨迹捕获是 OpenClaw 的按会话飞行记录器。它会为每次代理运行记录一份结构化时间线，然后 `/export-trajectory` 会将当前会话打包为一个已脱敏的支持包，涵盖：

- 发送给模型的提示词、系统提示词和工具
- 哪些对话消息和工具调用促成了答案
- 运行是否超时、中止、压缩，或遇到提供方错误
- 当时启用的是哪些模型、插件、技能和运行时设置
- 提供方返回的使用情况和提示缓存元数据

对于广泛的网关支持报告，请从 [`/diagnostics`](/gateway/diagnostics#chat-command) 开始；它收集经过清理的网关捆绑包，并且对于 OpenAI Codex harness会话，可以在批准后将 Codex 反馈发送到 OpenAI。当您需要详细的每个会话提示、工具和转录时间线时，请使用 `/export-trajectory`。

## <a id="quick-start"></a> 快速开始

在当前活动会话中发送（别名 `/trajectory`）：

```text
/export-trajectory
```

OpenClaw 会将捆绑包写入工作区下：

```text
.openclaw/trajectory-exports/openclaw-trajectory-<session>-<timestamp>/
```

传入一个相对输出目录名可将其覆盖：

```text
/export-trajectory bug-1234
```

该名称会在 `.openclaw/trajectory-exports/` 内解析。绝对路径和 `~` 路径会被拒绝。

轨迹包可以包含提示、模型消息、工具架构、工具结果、运行时事件和本地路径，因此聊天命令始终经过 exec 批准运行。当您打算创建捆绑包时，批准导出一次；不要使用允许全部。在群聊中，OpenClaw 将审批提示和导出结果私下发送给所有者，而不是将轨迹详细信息发布回共享房间。房间仅收到区分已确认、待处理和禁止的私人传送的状态通知。

对于本地检查或支持工作流，可直接运行底层 CLI 命令：

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
```

其他标志：`--output <path>`（`.openclaw/trajectory-exports` 内的目录名）、`--store <path>`（会话存储覆盖）、`--agent <id>`（用于存储解析的 agent id）、`--json`（结构化输出）。

## <a id="access"></a> 访问

轨迹导出是一个所有者命令。发送者必须通过正常的命令授权检查以及该频道的所有者检查。

## <a id="what-gets-recorded"></a> 会记录什么

OpenClaw 代理运行默认开启轨迹捕获。

运行时事件包括：

- `session.started`
- `trace.metadata`
- `context.compiled`
- `prompt.submitted`
- `tool.call`，具有工具标识和经过净化的参数
- `tool.result`，带有清理结果和执行结果
- `model.fallback_step`，包括源模型、下一个模型、失败reason/detail、链条位置以及链条是否前进、成功或耗尽
- `model.completed`
- `trace.artifacts`
- `session.ended`

对话记录事件会根据当前活动的会话分支重建：用户消息、助手消息、工具调用、工具结果、压缩、模型变更、标签以及自定义会话条目。

事件以 JSON Lines 形式写入，并带有以下 schema 标记：

```json
{
  "traceSchema": "openclaw-trajectory",
  "schemaVersion": 1
}
```

## <a id="bundle-files"></a> 支持包文件

| 文件                  | 内容                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `manifest.json`       | 支持包 schema、源文件、事件计数和生成文件列表                             |
| `events.jsonl`        | 有序的运行时和转录时间线                                                        |
| `session-branch.json` | 已脱敏的活动转录分支和会话头部                                           |
| `metadata.json`       | OpenClaw 版本、OS/runtime、模型、配置快照、插件、技能和提示元数据     |
| `artifacts.json`      | 最终状态、错误、使用量、提示缓存、压缩计数、助手文本和工具元数据 |
| `prompts.json`        | 已提交的提示词和选定的提示构建细节                                         |
| `system-prompt.txt`   | 最近编译的系统提示词（如已捕获）                                                   |
| `tools.json`          | 发送给模型的工具定义（如已捕获）                                              |

`manifest.json` 列出了给定包中存在的文件；当会话未捕获相应的运行时数据时，某些文件会被省略。

## <a id="capture-storage"></a> 捕获存储

运行时轨迹事件与会话一起存储在每个代理 SQLite 数据库中。运行时批处理将捕获的 JSON 字节传送到数据库工作线程以进行持久化。清理耗尽最后一批。当数据库编写器繁忙时，排队事件遵循相同的滚动字节限制。导出轨迹会具体化经过编辑的 JSONL 支持包；实时运行时捕获不是会话相邻的 JSONL sidecar。

每个会话都会滚动 10 个 MiB 运行时窗口。全局保留会删除超过 14 天的完整运行，然后删除最早的剩余运行，目标总数为 512 MiB。触发清理的会话受到其自己的滚动窗口的保护。全局清理在第一次使用时开始，此后每小时开始一次，与附加分开。它选择有界批次而不保留数据库写入器，并在每次删除之前重新检查选择。清理工作通过有界批次继续进行；并发更改将过时的选择推迟到稍后的追加。

运行时导出读取 SQLite 捕获。 2026 年 7 月之前的 `.trajectory.jsonl` 和 `.trajectory-path.json` sidecar 将不再被读取或关注。保留任何所需的诊断数据后，可以删除现有文件。

## <a id="disable-capture"></a> 禁用捕获

```bash
export OPENCLAW_TRAJECTORY=0
```

这会在启动 OpenClaw 之前禁用运行时轨迹捕获。 `/export-trajectory` 仍然可以导出会话分支，但仅运行时数据，例如已编译的上下文、提供方产物以及提示元数据，可能会缺失。

## <a id="tune-flush-timeout"></a> 调整 flush 超时

OpenClaw 在代理清理期间排出任何挂起的运行时轨迹行。默认清理超时为 10,000 毫秒。在慢速磁盘或大型存储上，在启动 OpenClaw 之前设置 `OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS`：

```bash
export OPENCLAW_TRAJECTORY_FLUSH_TIMEOUT_MS=30000
```

这控制 OpenClaw 何时记录 `openclaw-trajectory-flush` 超时并继续；它不会更改轨迹大小上限。要调整所有未传递显式超时的代理清理步骤，请设置 `OPENCLAW_AGENT_CLEANUP_TIMEOUT_MS`。

## <a id="privacy-and-limits"></a> 隐私和限制

轨迹捆绑包用于支持和调试，不用于公开发布。OpenClaw 在写入导出文件之前会对敏感值进行脱敏：

- 凭据和已知的类秘密负载字段
- 图像数据
- 本地状态路径
- 工作区路径，会替换为 `$WORKSPACE_DIR`
- 主页目录路径（如已检测到）

导出器也会对输入大小设置上限：

- runtime capture：实时捕获是一个滚动窗口，上限为 10 MiB，删除最旧的事件，为新事件腾出空间；导出接受最多 50 个 MiB 的 SQLite 运行时存储
- session（转录本）源：50 个 MiB，无论是从 SQLite 转录本存储还是会话文件中读取
- 每次导出的运行时事件：200,000
- 导出的事件总数：250,000
- 单个运行时事件行在超过 256 KiB 时会被截断

在解析事件之前检查源字节限制。 SQLite 源使用 UTF-8 JSONL 大小，包括行之间的分隔符，无论数据库编码如何。在加载行之前还会检查 SQLite 运行时事件计数。在创建导出包之前，过大的源会失败并出现大小错误。

这些是每个源的限制，而不是总进程内存的限制。解析、投影、编辑和输出序列化可以保留额外的副本；大型导出仍然需要比源大小更多的内存。

在与你的团队之外共享之前，请先审查支持包。脱敏是尽力而为的，无法知道所有应用特定的秘密。

## <a id="troubleshooting"></a> 故障排查

如果导出没有运行时事件：

- 确认 OpenClaw 启动时未设置 `OPENCLAW_TRAJECTORY=0`
- 在会话中再运行一条消息，然后重新导出
- 检查 `manifest.json` 中的 `runtimeEventCount`

如果命令拒绝输出路径：

- 使用像 `bug-1234` 这样的相对名称
- 不要传入 `/tmp/...` 或 `~/...`
- 将导出保留在 `.openclaw/trajectory-exports/` 内

如果导出因大小错误而失败，则转录本或运行时源（SQLite 存储或文件）超出了上述导出安全限制。开始新会话或导出较小的复制品。

## <a id="related"></a> 相关内容

- [Diffs](/tools/diffs)
- [会话管理](/concepts/session)
- [Exec 工具](/tools/exec)
- [Codex harness运行时](/plugins/codex-harness-runtime)
