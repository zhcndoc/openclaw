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
- 当配置多个代理时，输出包括每个代理的会话存储。
- 概览包含网关和节点主机服务的安装/运行时状态（如果可用）。
- 概览包含更新频道和 git SHA（针对源码检出）。
- 更新信息会在概览中显示；如果有可用更新，状态会提示运行 `openclaw update`（参见 [更新](/install/updating)）。
- 只读状态界面（`status`、`status --json`、`status --all`）会尽可能解析受支持的 SecretRefs 对应的配置路径。
- 如果配置了受支持的频道 SecretRef，但在当前命令路径下不可用，状态仍保持只读且报告降级输出而非崩溃。人类可读输出会显示警告，如“命令路径中配置的令牌不可用”；JSON 输出则包含 `secretDiagnostics`。
