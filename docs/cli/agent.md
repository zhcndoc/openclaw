---
summary: "openclaw agent 的 CLI 参考（通过 Gateway 发送一次 agent turn）"
read_when:
  - 你想从脚本中运行一次 agent turn（可选地发送回复）
title: "Agent"
---

# `openclaw agent`

通过 Gateway 运行一次 agent turn（使用 `--local` 可嵌入运行）。
使用 `--agent <id>` 可直接指定一个已配置的 agent。

至少传入一个会话选择器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相关：

- Agent 发送工具：[Agent send](/tools/agent-send)

## Options

- `-m, --message <text>`: 必需的消息正文
- `-t, --to <dest>`: 用于推导会话键的收件人
- `--session-id <id>`: 显式会话 ID
- `--agent <id>`: agent ID；覆盖路由绑定
- `--model <id>`: 本次运行的模型覆盖（`provider/model` 或 model id）
- `--thinking <level>`: agent 思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为会话持久化 verbose 级别
- `--channel <channel>`: 投递渠道；省略则使用主会话渠道
- `--reply-to <target>`: 投递目标覆盖
- `--reply-channel <channel>`: 投递渠道覆盖
- `--reply-account <id>`: 投递账户覆盖
- `--local`: 直接运行嵌入式 agent（在插件注册表预加载之后）
- `--deliver`: 将回复发送回所选的渠道/目标
- `--timeout <seconds>`: 覆盖 agent 超时时间（默认 600 或配置值）
- `--json`: 输出 JSON

## Examples

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notes

- 如果 Gateway 请求失败，Gateway 模式会回退到嵌入式 agent。使用 `--local` 可在一开始就强制使用嵌入式执行。
- `--local` 仍会先预加载插件注册表，因此由插件提供的 providers、tools 和 channels 在嵌入式运行期间仍然可用。
- `--local` 和嵌入式回退运行都被视为一次性运行。捆绑的 MCP 回环资源以及为该本地进程打开的 warm Claude stdio 会话会在回复后被回收，因此脚本化调用不会让本地子进程保持存活。
- 基于 Gateway 的运行会将 Gateway 拥有的 MCP 回环资源保留在正在运行的 Gateway 进程下；旧客户端可能仍会发送历史清理标志，但 Gateway 将其作为兼容性空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复投递，而不是会话路由。
- `--json` 会将 stdout 保留给 JSON 响应。Gateway、插件和嵌入式回退诊断信息会路由到 stderr，因此脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行和 Gateway 运行。
- 当此命令触发 `models.json` 重新生成时，由 SecretRef 管理的提供方凭据会以非密文标记形式持久化（例如 env var 名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不是已解析的密文明文。
- 标记写入以源为准：OpenClaw 从当前生效的源配置快照持久化标记，而不是从已解析的运行时密钥值持久化。

## Related

- [CLI reference](/cli)
- [Agent runtime](/concepts/agent)
