---
summary: "CLI 参考：`openclaw status`（诊断、探针、使用情况快照）"
read_when:
  - 你想快速诊断通道健康状况 + 最近的会话接收者
  - 你想要一个可直接粘贴的 "all" 状态用于调试
title: "openclaw status"
---

通道 + 会话的诊断。

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

说明：

- `--deep` 会运行实时探针（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 纯 `openclaw status` 仍然走快速只读路径，并且在跳过内存检查时将内存标记为 `not checked` 而不是 unavailable。较重的安全审计、插件兼容性和内存向量探针则留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 会从由 `plugins.slots.memory` 选定的活动内存插件运行时报告内存详情。自定义内存插件可以保持内置的 `agents.defaults.memorySearch.enabled` 处于禁用状态，同时仍然报告它们自己的文件、块、向量和 FTS 状态。
- `--usage` 以 `X% left` 的形式打印规范化的提供商使用窗口。
- 会话状态输出将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 则告诉你该会话正在使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端，还是像 `codex (acp/acpx)` 这样的 ACP 后端。有关提供商/模型/运行时的区别，请参见 [Agent runtimes](/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余配额，因此 OpenClaw 在显示前会将其取反；当计数字段存在时，以计数字段为准。`model_remains` 响应会优先使用聊天模型条目，在需要时根据时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照稀疏时，`/status` 可以从最近的 transcript usage log 回填 token 和缓存计数器。已有的非零实时值仍然优先于 transcript 回退值。
- `/status` 还包括精简的 Gateway 进程运行时间和主机系统运行时间。
- 当实时会话条目缺少活动运行时模型标签时，transcript 回退也可以恢复该标签。如果该 transcript 模型与所选模型不同，status 会针对恢复出的运行时模型而不是所选模型解析上下文窗口。
- 对于 prompt 大小统计，当会话元数据缺失或更小时，transcript 回退会优先采用更大的、面向 prompt 的总量，因此自定义提供商会话不会坍缩为 `0` token 显示。
- 当配置了多个 agent 时，输出会包含每个 agent 的会话存储。
- 概览在可用时会包含 Gateway + node 主机服务的安装/运行时状态。
- 概览会包含更新通道 + git SHA（适用于源码检出）。
- 更新信息会在 Overview 中展示；如果有可用更新，status 会提示运行 `openclaw update`（参见 [Updating](/install/updating)）。
- 只读状态表面（`status`、`status --json`、`status --all`）会在可能时为其目标配置路径解析受支持的 SecretRef。
- 如果配置了受支持的通道 SecretRef，但在当前命令路径中不可用，status 仍会保持只读，并报告降级输出而不是崩溃。人类可读输出会显示诸如 "configured token unavailable in this command path" 之类的警告，JSON 输出则包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用已解析的快照，并清除最终输出中的临时 "secret unavailable" 通道标记。
- `status --all` 包含一个 Secrets 概览行，以及一个总结 secret diagnostics（为可读性而截断）的诊断部分，同时不会停止报告生成。

## 相关内容

- [CLI reference](/cli)
- [Doctor](/gateway/doctor)
