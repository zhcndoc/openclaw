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

说明：

- `--deep` 运行实时探针（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 纯 `openclaw status` 保持在快速只读路径上，并在跳过内存检查时将内存标记为 `not checked`，而不是 unavailable。重型安全审计、插件兼容性和内存向量探针留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 会从由 `plugins.slots.memory` 选定的当前内存插件运行时报告内存详情。自定义内存插件可以保持内置的 `agents.defaults.memorySearch.enabled` 处于禁用状态，同时仍然报告它们自己的文件、分块、向量和 FTS 状态。
- `--usage` 以 `X% left` 的形式打印标准化的提供商使用窗口。
- 会话状态输出会将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉你该会话正在使用 `OpenClaw Default`、`OpenAI Codex`、CLI 后端，还是像 `codex (acp/acpx)` 这样的 ACP 后端。有关提供商/模型/运行时的区别，请参阅 [Agent runtimes](/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度，因此 OpenClaw 在显示前会将其反向转换；如果存在基于计数的字段，则以它们为准。`model_remains` 响应会优先使用聊天模型条目，在需要时根据时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照较稀疏时，`/status` 可以从最近的 transcript 使用日志回填 token 和缓存计数器。现有的非零实时值仍然优先于 transcript 回退值。
- `/status` 还会包含简洁的 Gateway 进程运行时间和宿主系统运行时间。
- 当实时会话条目缺少当前运行时模型标签时，transcript 回退也可以恢复该标签。如果该 transcript 模型与所选模型不同，status 会基于恢复出的运行时模型而不是所选模型来解析上下文窗口。
- 当会话固定到与配置的 primary 不同的模型时，status 会同时打印两个值、原因（`session override`）以及明确提示（`/model <configured-default>` 或 `/reset`）。配置的 primary 适用于新的或未固定的会话；已有的固定会话会保持其会话选择，直到被清除。
- 对于 prompt-size 记账，当会话元数据缺失或更小时，transcript 回退会优先采用较大的、面向 prompt 的总量，因此自定义提供商会话不会显示为 `0` token。
- 当配置了多个代理时，输出会包含每个代理的会话存储。
- 在可用时，Overview 会包含 Gateway + 节点宿主服务的安装/运行时状态。
- Overview 会包含更新通道 + git SHA（适用于源码检出）。
- 更新信息会显示在 Overview 中；如果有可用更新，status 会提示运行 `openclaw update`（参见 [Updating](/install/updating)）。
- 模型价格刷新失败会显示为可选的价格警告。这并不意味着 Gateway 或通道不健康。
- 只读状态表面（`status`、`status --json`、`status --all`）会在可能时为其目标配置路径解析受支持的 SecretRef。
- 如果配置了受支持的通道 SecretRef，但在当前命令路径中不可用，status 会保持只读并报告降级输出，而不是崩溃。人类可读输出会显示诸如“configured token unavailable in this command path”的警告，而 JSON 输出会包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用已解析的快照，并清除最终输出中临时的“secret unavailable”通道标记。
- `status --all` 会包含一个 Secrets 概览行，以及一个总结 secret 诊断信息的 diagnosis 区段（为可读性会做截断），同时不会停止报告生成。

## 相关内容

- [CLI reference](/cli)
- [Doctor](/gateway/doctor)
