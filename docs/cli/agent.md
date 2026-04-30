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

## 选项

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

## 示例

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## 说明

- Gateway 模式在 Gateway 请求失败时会回退到嵌入式 agent。使用 `--local` 可预先强制执行嵌入式运行。
- `--local` 仍会先预加载插件注册表，因此插件提供的提供方、工具和渠道在嵌入式运行期间仍可用。
- `--local` 和嵌入式回退运行都被视为一次性运行。为该本地进程打开的捆绑 MCP loopback 资源和 warm Claude stdio 会话会在回复后退役，因此脚本化调用不会让本地子进程继续存活。
- 基于 Gateway 的运行会将 Gateway 所拥有的 MCP loopback 资源保留在正在运行的 Gateway 进程下；旧客户端可能仍会发送历史清理标志，但 Gateway 会将其作为兼容性空操作接受。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复投递，而不是会话路由。
- `--json` 会保留 stdout 专用于 JSON 响应。Gateway、插件和嵌入式回退诊断信息会路由到 stderr，以便脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行和 Gateway 运行。
- 如果 Gateway 接受了 agent 运行，但 CLI 在等待最终回复时超时，嵌入式回退会使用一个新的显式 `gateway-fallback-*` session/run id，并报告 `meta.fallbackReason: "gateway_timeout"` 以及回退会话字段。这可避免与 Gateway 所拥有的 transcript lock 发生竞争，或静默替换原始路由会话。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供方凭据会以非密文标记形式持久化（例如 env var 名称、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不是已解析的密文明文。
- 标记写入以源为准：OpenClaw 持久化的是来自当前源配置快照的标记，而不是来自已解析运行时密钥值的标记。

## 相关

- [CLI reference](/cli)
- [Agent runtime](/concepts/agent)
