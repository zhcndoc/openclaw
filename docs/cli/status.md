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

- `--deep` 会运行实时探针（WhatsApp Web + Telegram + Discord + Slack + Signal）。
- 纯 `openclaw status` 走快速只读路径；当它跳过内存检查时，会将内存标记为 `not checked`，而不是 unavailable。繁重的安全审计、插件兼容性和内存向量探针则留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 会报告由 `plugins.slots.memory` 选定的活动内存插件运行时中的内存详情。自定义内存插件可以在禁用内置 `agents.defaults.memorySearch.enabled` 的情况下，仍然报告它们自己的文件、分块、向量和 FTS 状态。
- `--usage` 会将标准化的提供方使用窗口打印为 `X% left`。
- 会话状态输出会将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉你该会话正在使用 `OpenClaw Default`、`OpenAI Codex`、CLI 后端，还是像 `codex (acp/acpx)` 这样的 ACP 后端。有关提供方/模型/运行时的区别，请参见 [Agent runtimes](/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度，因此 OpenClaw 会在显示前将其反转；当存在按计数的字段时，它们优先。`model_remains` 响应会优先使用聊天模型条目，必要时根据时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照较为稀疏时，`/status` 可以从最近的 transcript usage 日志回填 token 和缓存计数器。已有的非零实时值仍然优先于 transcript 回填值。
- `/status` 还包括精简的 Gateway 进程运行时间和主机系统运行时间。
- 当实时会话条目缺少活动运行时模型标签时，transcript 回填也可以恢复该标签。如果 transcript 模型与所选模型不同，status 会根据恢复出的运行时模型，而不是所选模型，来解析上下文窗口。
- 当会话固定到一个与配置的主模型不同的模型时，status 会同时打印这两个值、原因（`session override`）以及明确提示（`/model default`）。配置的主模型适用于新的或未固定的会话；已有的固定会话会一直保留其会话选择，直到被清除。
- 对于提示大小统计，当会话元数据缺失或更小时，transcript 回填会优先选择更大的、以提示为导向的总数，因此自定义提供方会话不会显示为 `0` token。
- 当配置了多个代理时，输出会包含每个代理的会话存储。
- 概览会在可用时包含 Gateway + 节点主机服务安装/运行时状态。
- 概览会包含更新通道 + git SHA（适用于源码检出）。
- 更新信息会显示在概览中；如果有可用更新，status 会提示运行 `openclaw update`（参见 [Updating](/install/updating)）。
- 模型定价刷新失败会显示为可选的定价警告。它们并不意味着 Gateway 或通道不健康。
- 只读状态表面（`status`、`status --json`、`status --all`）会在可能时，为其目标配置路径解析受支持的 SecretRef。
- 如果配置了受支持的通道 SecretRef，但在当前命令路径中不可用，status 会保持只读，并报告降级输出而不是崩溃。人类可读输出会显示诸如“configured token unavailable in this command path”之类的警告，JSON 输出则包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用已解析的快照，并清除最终输出中临时的“secret unavailable”通道标记。
- `status --all` 会包含一个 Secrets 概览行和一个诊断部分，总结 secret 诊断信息（为便于阅读而截断），而不会中止报告生成。

## 相关内容

- [CLI reference](/cli)
- [Doctor](/gateway/doctor)
