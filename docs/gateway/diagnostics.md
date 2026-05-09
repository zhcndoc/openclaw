---
summary: "为错误报告创建可共享的 Gateway 诊断包"
title: "诊断导出"
read_when:
  - 准备错误报告或支持请求时
  - 调试 Gateway 崩溃、重启、内存压力或超大负载时
  - 查看记录了哪些诊断数据或哪些数据被红acted时
---

OpenClaw 可以为错误报告创建本地诊断 zip 包。它会组合经过清理的 Gateway 状态、健康信息、日志、配置结构，以及最近的、无载荷的稳定性事件。

在你审查之前，请将诊断包视为机密。它们旨在省略或遮蔽负载和凭据，但仍会汇总本地 Gateway 日志和主机级运行时状态。

## 快速开始

```bash
openclaw gateway diagnostics export
```

该命令会打印写入的 zip 路径。要指定路径：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用于自动化：

```bash
openclaw gateway diagnostics export --json
```

## 聊天命令

所有者可以在聊天中使用 `/diagnostics [note]` 请求本地 Gateway 导出。  
当 bug 发生在真实对话中，并且你希望为支持团队提供一份可直接复制粘贴的报告时，请使用此命令：

1. 在你注意到问题的对话中发送 `/diagnostics`。如果有帮助，可以添加一条简短说明，例如 `/diagnostics 错误的工具选择`。
2. OpenClaw 会发送诊断前置说明，并要求一次明确的 exec 批准。该批准会运行 `openclaw gateway diagnostics export --json`。不要通过放行所有规则来批准诊断。
3. 批准后，OpenClaw 会回复一份可粘贴的报告，其中包含本地包路径、清单摘要、隐私说明以及相关会话 id。

在群聊中，所有者仍然可以运行 `/diagnostics`，但 OpenClaw 不会把诊断详情回发到共享聊天中。它会通过私有批准路径向所有者发送前置说明、批准提示、Gateway 导出结果以及 Codex 会话/线程拆分信息。群聊里只会收到一条简短通知，说明诊断流程已私下发送。如果 OpenClaw 找不到私有所有者路径，该命令会安全失败，并要求所有者在私聊中运行。

当当前活动的 OpenClaw 会话使用原生 OpenAI Codex harness 时，同一次 exec 批准还会覆盖一项针对 OpenClaw 已知的 Codex 运行时线程的 OpenAI 反馈上传。该上传与本地 Gateway zip 是分开的，并且仅出现在 Codex harness 会话中。在批准之前，提示会说明批准诊断也会发送 Codex 反馈，但不会列出 Codex 会话或线程 id。批准之后，聊天回复会列出已发送到 OpenAI 服务器的通道、OpenClaw 会话 id、Codex 线程 id，以及这些线程的本地恢复命令。如果你拒绝或忽略该批准，OpenClaw 不会运行导出，不会发送 Codex 反馈，也不会打印 Codex id。

这使得常见的 Codex 调试流程更简短：在 Telegram、Discord 或其他渠道中注意到异常行为，运行 `/diagnostics`，一次批准，向支持团队分享报告，然后如果你想自己检查原生 Codex 线程，可以在本地运行打印出的 `codex resume <thread-id>` 命令。有关该检查流程，请参见 [Codex harness](/plugins/codex-harness#inspect-a-codex-thread-from-the-cli)。

## 导出内容

该 zip 包括：

- `summary.md`：供支持团队查看的人类可读概览。
- `diagnostics.json`：配置、日志、状态、健康信息和稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 经清理的配置结构和非机密配置详情。
- 经清理的日志摘要和最近的已遮蔽日志行。
- 尽最大努力获取的 Gateway 状态和健康快照。
- `stability/latest.json`：最新持久化的稳定性包（如可用）。

即使 Gateway 处于不健康状态，该导出仍然有用。如果 Gateway 无法响应状态或健康请求，本地日志、配置结构以及最新稳定性包仍会在可用时被收集。

## 隐私模型

诊断数据旨在便于共享。导出会保留有助于调试的运行数据，例如：

- 子系统名称、插件 id、提供方 id、通道 id 和已配置模式
- 状态码、持续时间、字节计数、队列状态和内存读数
- 已清理的日志元数据和被遮蔽的运行消息
- 配置结构和非机密功能设置

导出会省略或遮蔽以下内容：

- 聊天文本、提示、指令、webhook 正文和工具输出
- 凭据、API 密钥、令牌、cookie 和机密值
- 原始请求或响应正文
- 账户 id、消息 id、原始会话 id、主机名和本地用户名

当日志消息看起来像用户、聊天、提示或工具载荷文本时，导出只保留“该消息已被省略”的标记以及字节数。

## 稳定性记录器

Gateway 默认会记录一个有上限、无载荷的稳定性流，前提是已启用诊断。它用于运行事实，而不是内容。

同一个诊断心跳会在 Gateway 持续运行但 Node.js 事件循环或 CPU 看起来已饱和时记录可用性样本。这些 `diagnostic.liveness.warning` 事件包含事件循环延迟、事件循环利用率、CPU 核心比率、活动/等待/排队会话数、已知的当前启动/运行阶段、最近的阶段跨度，以及有界的活动/排队工作标签。空闲样本会保持在 telemetry 的 `info` 级别中。只有当工作正在等待或排队，或者活动工作与持续的事件循环延迟重叠时，可用性样本才会成为 Gateway 警告。否则，在背景工作正常进行时出现的瞬时最大延迟尖峰会保留在调试日志中。它们不会单独重启 Gateway。

启动阶段也会发出 `diagnostic.phase.completed` 事件，其中包含墙钟时间和 CPU 时间。卡住的嵌入式运行诊断会在最后一次桥接进度看起来像终止状态时标记 `terminalProgressStale=true`，例如原始响应项或响应完成事件，但 Gateway 仍认为该嵌入式运行处于活动状态。

查看实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在致命退出、关机超时或重启启动失败后，查看最新持久化的稳定性包：

```bash
openclaw gateway stability --bundle latest
```

从最新持久化包创建诊断 zip：

```bash
openclaw gateway stability --bundle latest --export
```

当存在事件时，持久化包位于 `~/.openclaw/logs/stability/` 下。

## 有用的选项

```bash
openclaw gateway diagnostics export \
  --output openclaw-diagnostics.zip \
  --log-lines 5000 \
  --log-bytes 1000000
```

- `--output <path>`：写入到指定的 zip 路径。
- `--log-lines <count>`：要包含的最大已清理日志行数。
- `--log-bytes <bytes>`：要检查的最大日志字节数。
- `--url <url>`：用于状态和健康快照的 Gateway WebSocket URL。
- `--token <token>`：用于状态和健康快照的 Gateway 令牌。
- `--password <password>`：用于状态和健康快照的 Gateway 密码。
- `--timeout <ms>`：状态和健康快照超时时间。
- `--no-stability-bundle`：跳过持久化稳定性包查找。
- `--json`：打印机器可读的导出元数据。

## 禁用诊断

诊断默认启用。要禁用稳定性记录器和诊断事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

禁用诊断会减少错误报告的细节，但不会影响正常的 Gateway 日志记录。

## 相关内容

- [健康检查](/gateway/health)
- [Gateway CLI](/cli/gateway#gateway-diagnostics-export)
- [Gateway 协议](/gateway/protocol#system-and-identity)
- [日志记录](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry) — 将诊断流式传输到收集器的独立流程
