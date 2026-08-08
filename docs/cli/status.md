---
summary: "CLI 参考：`openclaw status`（诊断、探针、使用情况快照）"
read_when:
  - 你想快速诊断通道健康状况 + 最近的会话接收者
  - 你想要一个可直接粘贴的“all”状态用于调试
title: "openclaw status"
---

通道 + 会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

| 参数                    | 描述                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--all`                 | 完整诊断（只读，可粘贴）。包括安全审计、插件兼容性和内存向量探针。 |
| `--deep`                | 运行实时探针（WhatsApp Web + Telegram + Discord + Slack + Signal）。同时启用安全审计。         |
| `--usage`               | 以 `X% left` 的形式输出标准化的提供商使用情况窗口。                                                          |
| `--json`                | 机器可读的输出。                                                                                        |
| `--timeout <ms>`        | 以毫秒为单位的探针超时时间（默认：`10000`）。                                                               |
| `--verbose` / `--debug` | 在报告之前同时输出原始网关目标解析结果。                                                 |

普通的 `openclaw status` 保持在快速只读路径上，并在跳过内存检查时将内存标记为
`not checked`，而不是 unavailable。繁重的
安全审计、插件兼容性和内存向量探针留给
`openclaw status --all`、`openclaw status --deep`、`openclaw security audit`
以及 `openclaw memory status --deep`。

## 会话和模型解析

- 会话状态输出将 `Execution:` 与 `Runtime:` 分开。`Execution`
  是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉你
  当前会话使用的是 `OpenClaw Default`、`OpenAI Codex`、CLI
  后端，还是像 `codex (acp/acpx)` 这样的 ACP 后端。有关
  提供方/模型/运行时的区分，请参见
  [Agent runtimes](/concepts/agent-runtimes)。
- 当当前会话快照信息稀疏时，`/status` 可以从最近的转录使用日志中回填 token
  和缓存计数器。已有的非零实时值仍然优先于转录回退值。
- 转录回退还可以在实时会话条目缺少它时恢复活动运行时模型标签。如果该转录模型与
  所选模型不同，状态会针对恢复出的运行时模型而不是所选模型来解析上下文窗口。
- 对于提示词大小统计，当会话元数据缺失或更小时，转录回退会优先采用更大的
  面向提示词的总量，因此自定义提供方会话不会显示为 `0` token。
- 当会话被固定到一个与已配置主模型不同的模型时，状态会同时打印两个值、原因（`session override`）以及提示 `/model default`。已配置的主模型适用于新的或未固定的会话；现有已固定会话会保留其会话选择，直到被清除。
- 当配置了多个代理时，输出会包含每个代理的会话存储。

## 用量和配额

- `--usage` 会将规范化后的提供商用量窗口显示为 `X% left`。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度，
  因此 OpenClaw 会在显示前将其反转；当存在基于计数的字段时，它们优先。
  `model_remains` 响应会优先选择 chat-model 条目，在需要时根据时间戳推导
  窗口标签，并将模型名称包含在计划标签中。
- 模型定价刷新失败会显示为可选的定价警告。
  这并不意味着 Gateway 或通道不健康。

## 概览和更新状态

- 概览在可用时包括网关 + 节点主机服务的安装/运行时状态，以及简要的网关进程运行时间和主机系统运行时间。
- 概览包括更新渠道 + git SHA（对于源代码检出）。
- 更新信息会显示在概览中；如果有可用更新，状态信息会提示运行 `openclaw update`（参见[更新](/install/updating)）。
- `status --all` 包括 **遥测导出器**诊断，其中包含最新的、受信任的各信号导出器状态和传输方式。不显示端点值、标头、证书、负载和原始错误。

## 密钥

- 当运行中的 Gateway 在启动、重载或配置写入期间存在任何隔离的 SecretRef 所有者时，状态会在 JSON 中包含 `degradedSecretOwners`，并在人工输出中包含一个 **降级密钥** 概览行。每个条目都会标明所有者、降级状态（`cold` 或 `stale`）、配置路径以及已脱敏的原因。cold 所有者不可用；stale 所有者会继续使用已知的最后可用值。
- 只读状态界面（`status`、`status --json`、`status --all`）会在可能时，为其目标配置路径解析受支持的 SecretRef。
- 如果配置了受支持的通道 SecretRef，但在当前命令路径中不可用，status 仍保持只读，并返回降级输出而不是崩溃。人工输出会显示类似 “configured token unavailable in this command path” 的警告，而 JSON 输出会包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用已解析的快照，并清除最终输出中临时的 “secret unavailable” 通道标记。
- `status --all` 包含一个密钥概览行和一个诊断部分，用于汇总密钥诊断信息（为便于阅读会截断），且不会停止报告生成。

## 内存

`status --json --all` 从由 `plugins.slots.memory` 选择的当前活动内存插件报告内存详情。自定义内存插件可以保持内置的 `memory.search.enabled` 处于禁用状态，同时仍然报告它们自己的文件、块、向量和 FTS 状态。

## 相关内容

- [CLI 参考](/cli)
- [Doctor](/gateway/doctor)
