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
- 纯粹的 `openclaw status` 仍然走快速只读路径，并且在跳过内存检查时将内存标记为 `not checked`，而不是不可用。高强度安全审计、插件兼容性以及内存向量探针则留给 `openclaw status --all`、`openclaw status --deep`、`openclaw security audit` 和 `openclaw memory status --deep`。
- `status --json --all` 会报告由 `plugins.slots.memory` 选择的当前内存插件运行时的内存详情。自定义内存插件即使保持内置的 `agents.defaults.memorySearch.enabled` 关闭，也仍然可以报告它们自己的文件、块、向量和 FTS 状态。
- `--usage` 会将标准化的提供方使用窗口输出为 `X% left`。
- 会话状态输出会将 `Execution:` 与 `Runtime:` 分开。`Execution` 是沙箱路径（`direct`、`docker/*`），而 `Runtime` 告诉你该会话正在使用 `OpenClaw Pi Default`、`OpenAI Codex`、CLI 后端，还是像 `codex (acp/acpx)` 这样的 ACP 后端。关于提供方/模型/运行时的区别，请参见 [Agent runtimes](/concepts/agent-runtimes)。
- MiniMax 的原始 `usage_percent` / `usagePercent` 字段表示剩余额度，因此 OpenClaw 在显示前会先反转它们；如果存在基于数量的字段，则以它们为准。`model_remains` 响应优先使用聊天模型条目；在需要时从时间戳推导窗口标签，并在计划标签中包含模型名称。
- 当当前会话快照较稀疏时，`/status` 可以从最近的 transcript usage 日志回填 token 和缓存计数器。已有的非零实时值仍然优先于 transcript 回填值。
- `/status` 包含精简的 Gateway 进程运行时间和主机系统运行时间。
- 当实时会话条目缺少活动运行时模型标签时，transcript 回填也可以恢复该标签。如果该 transcript 模型与所选模型不同，状态会针对恢复出的运行时模型解析上下文窗口，而不是针对所选模型。
- 当会话固定到与已配置主模型不同的模型时，状态会同时打印这两个值、原因（`session override`），以及明确提示（`/model <configured-default>` 或 `/reset`）。已配置的主模型适用于新会话或未固定的会话；已有的固定会话会保持其会话选择，直到被清除。
- 在进行提示大小统计时，如果会话元数据缺失或更小，transcript 回填会优先采用较大的、面向提示词的总量，从而避免自定义提供方会话的 token 显示降为 `0`。
- 当配置了多个代理时，输出会包含每个代理的会话存储。
- 概览在可用时会包含 Gateway + 节点主机服务的安装/运行状态。
- 概览会包含更新通道 + git SHA（适用于源代码检出）。
- 更新信息会在概览中显示；如果有可用更新，状态会提示运行 `openclaw update`（参见 [Updating](/install/updating)）。
- 模型价格刷新失败会作为可选的价格警告显示。它们并不表示 Gateway 或各通道不健康。
- 只读状态视图（`status`、`status --json`、`status --all`）会在可能的情况下，为其目标配置路径解析受支持的 SecretRef。
- 如果配置了受支持的通道 SecretRef，但在当前命令路径中不可用，status 会保持只读，并报告降级输出而不是崩溃。人类可读输出会显示诸如“configured token unavailable in this command path”的警告，而 JSON 输出会包含 `secretDiagnostics`。
- 当命令本地的 SecretRef 解析成功时，status 会优先使用解析后的快照，并清除最终输出中临时的“secret unavailable”通道标记。
- `status --all` 会包含 Secrets 概览行和一个诊断部分，后者会总结 secret 诊断信息（为便于阅读会做截断），而不会停止报告生成。

## 相关内容

- [CLI reference](/cli)
- [Doctor](/gateway/doctor)
