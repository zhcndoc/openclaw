---
summary: "`openclaw agent` 的命令行参考（通过网关发送一个代理回合）"
read_when:
  - 你想从脚本中运行一个代理回合（可选地传递回复）
title: "Agent"
---

# `openclaw agent`

通过网关运行一个代理回合（使用 `--local` 进行嵌入式运行）。
使用 `--agent <id>` 直接指定已配置的代理。

至少传递一个会话选择器：

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

相关：

- 代理发送工具：[代理发送](/tools/agent-send)

## 选项

- `-m, --message <text>`: 必需的消息正文
- `-t, --to <dest>`: 用于推导会话密钥的收件人
- `--session-id <id>`: 显式会话 ID
- `--agent <id>`: 代理 ID；覆盖路由绑定
- `--model <id>`: 本次运行的模型覆盖（`provider/model` 或模型 ID）
- `--thinking <level>`: 代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供方支持的自定义级别，如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为该会话持久化详细级别
- `--channel <channel>`: 交付渠道；省略则使用主会话渠道
- `--reply-to <target>`: 交付目标覆盖
- `--reply-channel <channel>`: 交付渠道覆盖
- `--reply-account <id>`: 交付账户覆盖
- `--local`: 直接运行嵌入式代理（在插件注册表预加载之后）
- `--deliver`: 将回复发送回所选渠道/目标
- `--timeout <seconds>`: 覆盖代理超时（默认 600 或配置值）
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

- 如果网关请求失败，Gateway 模式会回退到嵌入式代理。使用 `--local` 可在一开始就强制执行嵌入式运行。
- `--local` 仍会先预加载插件注册表，因此由插件提供的 providers、tools 和 channels 在嵌入式运行期间仍然可用。
- 每次 `openclaw agent` 调用都被视为一次性运行。为该次运行打开的捆绑或用户配置的 MCP 服务器会在回复后退出，即使命令使用的是 Gateway 路径也是如此，因此 stdio MCP 子进程不会在脚本化调用之间保持存活。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复交付，而不是会话路由。
- `--json` 会将 stdout 保留给 JSON 响应。Gateway、插件以及嵌入式回退诊断信息会路由到 stderr，因此脚本可以直接解析 stdout。
- 嵌入式回退 JSON 包含 `meta.transport: "embedded"` 和 `meta.fallbackFrom: "gateway"`，以便脚本区分回退运行和 Gateway 运行。
- 当此命令触发 `models.json` 重新生成时，SecretRef 管理的提供方凭据会以非密钥标记的形式持久化（例如环境变量名、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不是已解析的密文明文。
- 标记写入以源为权威：OpenClaw 持久化的是来自活动源配置快照的标记，而不是来自已解析运行时密钥值的标记。

## 相关

- [CLI 参考](/cli)
- [代理运行时](/concepts/agent)
