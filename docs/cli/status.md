---
summary: "`openclaw status` 的 CLI 参考（诊断、探测、使用快照）"
read_when:
  - 你想快速诊断频道健康状况及最近的会话接收者
  - 你想要一个可粘贴的“全部”状态以便调试
title: "status"
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

- `--deep` 运行实时探测（WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal）。
- 当配置多个代理时，输出包含每个代理的会话存储。
- 概述包括 Gateway + 节点主机服务的安装/运行时状态（如有）。
- 概述包括更新通道 + git SHA（针对源码检出）。
- 更新信息显示在概述中；如果有可用更新，status 会打印提示建议运行 `openclaw update`（参见 [更新](/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）在可能的情况下会解析其目标配置路径支持的 SecretRefs。
- 如果支持的频道 SecretRef 已配置但在当前命令路径中不可用，status 保持只读并报告降级输出而不是崩溃。人类可读输出显示警告，如"配置的令牌在此命令路径中不可用"，JSON 输出包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，status 优先使用已解析的快照，并从最终输出中清除临时的"secret 不可用"频道标记。
- `status --all` 包含一个 Secrets 概览行和一个诊断部分，用于摘要 secret 诊断信息（为便于阅读而截断），且不会停止报告生成。
