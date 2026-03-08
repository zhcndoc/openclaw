---
summary: "`openclaw agent` 的命令行参考（通过网关发送一个代理回合）"
read_when:
  - 当您想从脚本运行一个代理回合（可选地发送回复）
title: "agent"
---

# `openclaw agent`

通过网关运行一个代理回合（使用 `--local` 进行嵌入式运行）。
使用 `--agent <id>` 直接指定已配置的代理。

相关内容：

- 代理发送工具: [Agent send](/tools/agent-send)

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## 说明

- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供者凭据会作为非秘密标记（例如环境变量名或 `secretref-managed`）被持久化，而非解析成秘密明文。
