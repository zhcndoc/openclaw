---
summary: "CLI 参考：`openclaw status`（诊断、探针、使用情况快照）"
read_when:
  - 你想快速诊断通道健康状况 + 最近的会话接收者
  - 你想要一份可直接粘贴的用于调试的“all”状态
title: "状态"
---

# `openclaw status`

通道 + 会话的诊断信息。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

说明：

- `--deep` 会运行实时探针（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 纯 `openclaw status` 走快速只读路径，并且在跳过内存检查时将内存标记为 `not checked`，而不是 unavailable。重型安全审计、插件兼容性和内存向量探针留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 会报告由 `plugins.slots.memory` 选择的当前内存插件运行时中的内存详情。自定义内存插件可以保持内置的 `agents.defaults.memorySearch.enabled` 处于禁用状态，同时仍然报告它们自己的文件、分块、向量和 FTS 状态。
- `--usage` 以 `X% left` 的形式输出归一化后的提供方使用窗口。
- 会话状态输出会将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉你该会话正在使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端，还是像 `codex (acp/acpx)` 这样的 ACP 后端。有关提供方/模型/运行时的区别，请参见 [Agent runtimes](/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度，因此 OpenClaw 在显示前会对其取反；当存在基于计数的字段时，以它们为准。`model_remains` 响应会优先使用 chat-model 条目，在需要时根据时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照比较稀疏时，`/status` 可以从最近的转录使用日志中回填 token 和 cache 计数器。现有的非零实时值仍然优先于转录回填值。
- 转录回填也可以在实时会话条目缺少时恢复活动运行时的模型标签。如果该转录模型与所选模型不同，status 会基于恢复出的运行时模型而不是所选模型来解析上下文窗口。
- 对于提示词大小统计，当会话元数据缺失或更小时，转录回填会优先使用更大的、面向 prompt 的总量，因此自定义提供方会话不会显示为 `0` token。
- 当配置了多个代理时，输出会包含按代理划分的会话存储。
- 在可用时，概览会包含 Gateway + 节点主机服务的安装/运行时状态。
- 概览会包含更新通道 + git SHA（适用于源码检出）。
- 更新信息会在概览中展示；如果有可用更新，status 会提示运行 `openclaw update`（参见 [Updating](/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会尽可能为其目标配置路径解析受支持的 SecretRef。
- 如果已配置受支持通道的 SecretRef，但在当前命令路径中不可用，status 会保持只读并报告降级输出，而不是崩溃。人类可读输出会显示诸如“configured token unavailable in this command path”的警告，而 JSON 输出会包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用已解析的快照，并清除最终输出中的临时“secret unavailable”通道标记。
- `status --all` 会包含一个 Secrets 概览行和一个诊断部分，用于汇总 secret 诊断信息（为便于阅读而截断），且不会中止报告生成。

## 相关内容

- [CLI reference](/cli)
- [Doctor](/gateway/doctor)
