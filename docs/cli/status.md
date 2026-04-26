---
summary: "`openclaw status` 的 CLI 参考（诊断、探测、使用快照）"
read_when:
  - 你想快速诊断频道健康状况 + 最近的会话接收者
  - 你想要一份可直接粘贴的“all”状态用于调试
title: "状态"
---

# `openclaw status`

频道和会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

说明：

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- `--usage` 以 `X% left` 的形式打印归一化后的提供方使用窗口。
- 会话状态输出会将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 则说明会话正在使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端，或诸如 `codex (acp/acpx)` 之类的 ACP 后端。有关提供方/模型/运行时的区别，请参见 [Agent runtimes](/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度，因此 OpenClaw 在显示前会将其取反；如果存在按计数字段，则以其为准。`model_remains` 响应优先使用 chat-model 条目，必要时根据时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照较为稀疏时，`/status` 可以从最近的 transcript usage 日志中回填 token 和 cache 计数器。现有的非零实时值仍然优先于 transcript 回退值。
- transcript 回退也可以在实时会话条目缺少时恢复活动运行时模型标签。如果该 transcript 模型与所选模型不同，状态会改为基于恢复出的运行时模型来解析上下文窗口，而不是基于所选模型。
- 对于提示词大小统计，当会话元数据缺失或更小时，transcript 回退会优先选择更大的、面向 prompt 的总量，因此自定义提供方会话不会显示为 `0` token。
- 当配置了多个 agent 时，输出会包含每个 agent 的会话存储。
- 概览会在可用时包含 Gateway + 节点主机服务的安装/运行时状态。
- 概览会包含更新通道 + git SHA（适用于源码检出）。
- 更新信息会显示在 Overview 中；如果有可用更新，状态会提示运行 `openclaw update`（参见 [Updating](/install/updating)）。
- 只读状态表面（`status`、`status --json`、`status --all`）会在可能的情况下为其目标配置路径解析受支持的 SecretRef。
- 如果已配置受支持的频道 SecretRef，但在当前命令路径中不可用，状态仍保持只读，并报告降级输出而不是崩溃。人工输出会显示诸如“configured token unavailable in this command path”之类的警告，而 JSON 输出会包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，状态会优先使用已解析的快照，并清除最终输出中的临时“secret unavailable”频道标记。
- `status --all` 会包含一个 Secrets 概览行，以及一个总结 secret diagnostics 的诊断部分（为便于阅读会截断），且不会中止报告生成。

## 相关

- [CLI reference](/cli)
- [Doctor](/gateway/doctor)
