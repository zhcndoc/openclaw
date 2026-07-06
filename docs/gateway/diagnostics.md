---
summary: "为错误报告创建可共享的 Gateway 诊断包"
title: "诊断导出"
read_when:
  - 准备错误报告或支持请求时
  - 调试 Gateway 崩溃、重启、内存压力或超大负载时
  - 查看记录了哪些诊断数据或哪些数据被遮蔽时
---

OpenClaw 可以为错误报告生成本地诊断 `.zip`：经过净化的 Gateway
状态、健康状况、日志、配置结构，以及最近的无载荷稳定性事件。

在审查之前，请将诊断包视为机密。有效载荷和凭据
会按设计被遮蔽，但该包仍会汇总本地 Gateway 日志和
主机级运行时状态。

## 快速开始

```bash
openclaw gateway diagnostics export
```

打印已写入的 zip 路径。选择输出路径：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用于自动化：

```bash
openclaw gateway diagnostics export --json
```

## 聊天命令

所有者可以在任何对话中运行 `/diagnostics [note]`，以请求一个本地
Gateway 导出，作为一份可直接复制粘贴的支持报告：

1. 发送 `/diagnostics`，也可以附上一段简短备注（`/diagnostics bad tool choice`）。
2. OpenClaw 会发送一段前言，并请求一次明确的执行批准，随后运行
   `openclaw gateway diagnostics export --json`。不要通过允许全部的规则来批准 diagnostics。
3. 批准后，OpenClaw 会回复本地捆绑包路径、清单
   摘要、隐私说明以及相关的会话 ID。

在群聊中，所有者仍然可以运行 `/diagnostics`，但 OpenClaw 会将
导出结果、批准提示以及 Codex 会话/线程拆分私下发送给
所有者。群里只会看到一条简短通知，说明 diagnostics 已私下发送。如果没有可用的私聊所有者路径，则该命令会安全失败，并要求
所有者在私信中运行它。

当当前会话使用原生 OpenAI Codex harness 时，相同的执行批准还会覆盖一项针对 OpenClaw 已知 Codex 线程的 OpenAI 反馈上传。该上传独立于本地 Gateway zip，仅
在 Codex harness 会话中发生。批准提示会说明批准操作也会发送 Codex 反馈，但不会列出 Codex 会话或线程 ID。批准后，回复会列出频道、OpenClaw 会话 ID、Codex 线程 ID，以及发送给 OpenAI 的线程的本地恢复命令。拒绝或
忽略该批准会跳过导出、Codex 反馈上传以及
Codex ID 列表。

这让 Codex 调试循环变得很短：在某个频道中注意到异常行为，
运行 `/diagnostics`，批准一次，分享报告，然后如果你想自己检查线程，就在本地运行打印出的
`codex resume <thread-id>` 命令。另见 [Codex harness](/plugins/codex-harness#inspect-codex-threads-locally)。

## 导出内容

- `summary.md`：供支持使用的人类可读概览。
- `diagnostics.json`：配置、日志、状态、健康状况、
  以及稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 已清理的配置结构和非敏感配置详情。
- 已清理的日志摘要和最近的已脱敏日志行。
- 尽力获取的 Gateway 状态和健康状况快照。
- `stability/latest.json`：最新持久化的稳定性数据包（如可用）。

即使 Gateway 处于不健康状态，导出仍然有用：如果状态/健康
请求失败，仍会在可用时收集本地日志、配置结构和最新的稳定性数据包。

## 隐私模型

保留：子系统名称、插件 ID、提供方 ID、通道 ID、已配置的
模式、状态码、持续时间、字节计数、队列状态、内存读数、
已清理的日志元数据、已去除敏感信息的操作消息、配置形状，以及
非密钥功能设置。

省略或脱敏：聊天文本、提示词、指令、webhook 正文、工具
输出、凭据、API 密钥、令牌、cookie、密钥值、原始
请求/响应正文、账户 ID、消息 ID、原始会话 ID、
主机名，以及本地用户名。

当日志消息看起来像用户、聊天、提示词或工具负载文本时，
导出内容只保留已省略消息这一事实以及其字节计数。

## 稳定性记录器

当启用诊断时，Gateway 默认会记录一个有边界、无负载的稳定性流。它捕获的是运行事实，而不是内容。

同一个心跳也会在事件循环或 CPU 看起来饱和时采样存活状态，发出 `diagnostic.liveness.warning` 事件，其中包含事件循环延迟、事件循环利用率、CPU 核心比率、活动/等待/排队会话数、当前启动/运行时阶段（如已知）、最近的阶段跨度以及有边界的工作标签。只有当存在等待或排队的工作，或活动工作与持续的事件循环延迟重叠时，这些事件才会成为 Gateway 的 `warn` 级日志行；否则它们会以 `debug` 级别记录。空闲的存活采样仍会作为诊断事件记录，但不会自行升级为警告。

启动阶段会发出 `diagnostic.phase.completed` 事件，包含墙钟时间和 CPU 时间。当最后一次桥接进度看起来像终态时（例如原始响应项或响应完成事件），但 Gateway 仍认为嵌入式运行处于活动状态时，卡住的嵌入式运行诊断会将 `terminalProgressStale=true`。

查看实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在致命退出、关闭超时或重启启动失败后，检查最新持久化包：

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

| 标志                    | 默认                                                                          | 描述                                           |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `--output <path>`       | `$OPENCLAW_STATE_DIR/logs/support/openclaw-diagnostics-<timestamp>-<pid>.zip` | 写入到指定的 zip 路径（或目录）。              |
| `--log-lines <count>`   | `5000`                                                                        | 要包含的最大已清理日志行数。                   |
| `--log-bytes <bytes>`   | `1000000`                                                                     | 要检查的最大日志字节数。                       |
| `--url <url>`           | -                                                                             | 用于状态/健康快照的网关 WebSocket URL。        |
| `--token <token>`       | -                                                                             | 用于状态/健康快照的网关令牌。                 |
| `--password <password>` | -                                                                             | 用于状态/健康快照的网关密码。                 |
| `--timeout <ms>`        | `3000`                                                                        | 状态/健康快照超时时间。                       |
| `--no-stability-bundle` | off                                                                           | 跳过已持久化的稳定性 bundle 查找。            |
| `--json`                | off                                                                           | 输出可供机器读取的导出元数据。                |

## 禁用诊断

诊断默认启用。要禁用稳定性记录器和诊断事件收集：

```json5
{
  diagnostics: {
    enabled: false,
  },
}
```

禁用诊断会减少 bug 报告的详细程度；它不会影响正常的
Gateway 日志记录。

关键内存压力快照默认关闭。若要在正常诊断事件之外捕获
OOM 前的稳定性快照：

```json5
{
  diagnostics: {
    memoryPressureSnapshot: true,
  },
}
```

仅在能够承受关键内存压力期间额外的文件系统扫描和
快照写入的主机上使用此功能。当快照关闭时，正常的内存压力事件
仍会记录 RSS、heap、threshold 和 growth 事实（`rss_threshold`、
`heap_threshold`、`rss_growth`）。

## 相关内容

- [健康检查](/gateway/health)
- [Gateway CLI](/cli/gateway#gateway-diagnostics-export)
- [Gateway 协议](/gateway/protocol#rpc-method-families)
- [日志](/logging)
- [OpenTelemetry 导出](/gateway/opentelemetry) - 用于将诊断流式传输到收集器的独立流程
