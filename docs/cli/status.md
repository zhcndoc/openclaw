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
- 输出包括当配置多个代理时的每个代理会话存储。
- 概览包括网关 + 节点主机服务安装/运行时状态（如果可用）。
- 概览包括更新通道 + git SHA（用于源码检出）。
- 更新信息显示在概览中；如果有可用更新，状态将提示运行 `openclaw update`（参见[更新](/install/updating)）。
- 只读状态显示（`status`，`status --json`，`status --all`）在可能的情况下会解析支持的 SecretRef 以获取其目标配置路径。
- 如果配置了支持的频道 SecretRef 但当前命令路径中不可用，状态保持只读并报告降级输出而不是崩溃。人类可读输出显示警告如“配置的令牌在此命令路径中不可用”，JSON 输出包含 `secretDiagnostics`。
- 当命令本地 SecretRef 解析成功时，状态倾向于使用已解析的快照，并从最终输出中清除临时“secret unavailable”频道标记。
