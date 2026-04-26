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
- `--thinking <level>`: 代理思考级别（`off`、`minimal`、`low`、`medium`、`high`，以及提供者支持的自定义级别，例如 `xhigh`、`adaptive` 或 `max`）
- `--verbose <on|off>`: 为会话持久化详细级别
- `--channel <channel>`: 传递渠道；省略则使用主会话渠道
- `--reply-to <target>`: 传递目标覆盖
- `--reply-channel <channel>`: 传递渠道覆盖
- `--reply-account <id>`: 传递账号覆盖
- `--local`: 直接运行嵌入式代理（在插件注册表预加载之后）
- `--deliver`: 将回复发送回所选渠道/目标
- `--timeout <seconds>`: 覆盖代理超时（默认 600 或配置值）
- `--json`: 输出 JSON

## 示例

```bash
openclaw agent --to +15555550123 --message "状态更新" --deliver
openclaw agent --agent ops --message "总结日志"
openclaw agent --session-id 1234 --message "总结收件箱" --thinking medium
openclaw agent --to +15555550123 --message "追踪日志" --verbose on --json
openclaw agent --agent ops --message "生成报告" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "本地运行" --local
```

## 说明

- 当 Gateway 模式请求失败时，会回退到嵌入式代理。使用 `--local` 可预先强制执行嵌入式模式。
- `--local` 仍会先预加载插件注册表，因此插件提供的提供者、工具和渠道在嵌入式运行期间仍可用。
- `--channel`、`--reply-channel` 和 `--reply-account` 影响回复投递，而不是会话路由。
- 当此命令触发 `models.json` 重新生成时，受 SecretRef 管理的提供者凭据会以非密钥标记形式持久化（例如环境变量名、`secretref-env:ENV_VAR_NAME` 或 `secretref-managed`），而不会解析为密文明文。
- 标记写入以源为准：OpenClaw 持久化的是来自活动源配置快照的标记，而不是来自已解析的运行时密钥值。

## 相关

- [CLI 参考](/cli)
- [代理运行时](/concepts/agent)
