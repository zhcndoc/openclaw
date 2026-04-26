---
summary: "为 bug 报告创建可共享的 Gateway 诊断包"
title: "诊断导出"
read_when:
  - 准备 bug 报告或支持请求
  - 调试 Gateway 崩溃、重启、内存压力或过大的负载
  - 查看记录或脱敏了哪些诊断数据
---

OpenClaw 可以创建一个本地诊断 zip，适合附加到 bug 报告中。它会组合经过清理的 Gateway 状态、健康信息、日志、配置结构以及最近的、不包含负载的稳定性事件。

## 快速开始

```bash
openclaw gateway diagnostics export
```

该命令会打印生成的 zip 路径。要指定路径：

```bash
openclaw gateway diagnostics export --output openclaw-diagnostics.zip
```

用于自动化：

```bash
openclaw gateway diagnostics export --json
```

## 导出内容

该 zip 包括：

- `summary.md`：用于支持人员的人类可读概览。
- `diagnostics.json`：包含配置、日志、状态、健康信息以及稳定性数据的机器可读摘要。
- `manifest.json`：导出元数据和文件列表。
- 经脱敏的配置结构和非机密配置详情。
- 经脱敏的日志摘要和最近的已脱敏日志行。
- 尽力获取的 Gateway 状态和健康信息快照。
- `stability/latest.json`：最新持久化的稳定性包（如果可用）。

即使 Gateway 处于不健康状态，导出也同样有用。如果 Gateway 无法响应状态或健康请求，只要可用，本地日志、配置结构和最新稳定性包仍会被收集。

## 隐私模型

诊断数据的设计目标是可以共享。导出会保留有助于调试的运行数据，例如：

- 子系统名称、插件 id、提供方 id、通道 id 和已配置的模式
- 状态码、持续时间、字节数、队列状态和内存读数
- 经脱敏的日志元数据和已脱敏的运行消息
- 配置结构和非机密功能设置

导出会省略或脱敏以下内容：

- 聊天文本、提示词、指令、webhook 主体和工具输出
- 凭据、API 密钥、令牌、cookie 和密钥值
- 原始请求或响应主体
- 账户 id、消息 id、原始会话 id、主机名和本地用户名

当日志消息看起来像用户、聊天、提示词或工具负载文本时，导出只保留“消息已省略”的信息以及字节数。

## 稳定性记录器

当启用诊断时，Gateway 默认会记录一个有界的、无负载的稳定性流。它用于运行事实，而非内容。

查看实时记录器：

```bash
openclaw gateway stability
openclaw gateway stability --type payload.large
openclaw gateway stability --json
```

在发生致命退出、关停超时或重启启动失败后，查看最新的持久化稳定性包：

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
- `--log-lines <count>`：要包含的最大已脱敏日志行数。
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

禁用诊断会降低 bug 报告的详细程度，但不会影响正常的 Gateway 日志记录。

## 相关文档

- [健康检查](/gateway/health)
- [Gateway CLI](/cli/gateway#gateway-diagnostics-export)
- [Gateway 协议](/gateway/protocol#system-and-identity)
- [日志记录](/logging)
