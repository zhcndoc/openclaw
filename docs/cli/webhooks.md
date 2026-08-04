---
summary: "openclaw Webhook 的 CLI 参考（Gmail Pub/Sub 配置和运行器）"
read_when:
  - 你想将 Gmail Pub/Sub 事件接入 OpenClaw
  - 你需要完整的标志列表和默认值
title: "Webhook"
---

# `openclaw webhooks`

Webhook 辅助工具和集成。目前此接口范围限定为基于内置 `gog` 监听器构建的 Gmail Pub/Sub 流程。

## 子命令

```bash
openclaw webhooks gmail setup --account <email> [...]
openclaw webhooks gmail run   [--account <email>] [...]
```

| 子命令 | 描述                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `gmail setup` | 一次性向导：Gmail 监控、Pub/Sub 主题/订阅，以及 OpenClaw hook 投递。 |
| `gmail run`   | 在前台运行 `gog watch serve` 以及监控自动续期循环。               |

<Note>
Gateway 还会在启动时自动启动 `gog gmail watch serve`，前提是设置了 `hooks.enabled=true` 和 `hooks.gmail.account`（由 `gmail setup` 设置）。`gmail run` 在前台执行相同逻辑，适用于调试或当 Gateway watcher 被禁用时。有关自动启动详情以及 `OPENCLAW_SKIP_GMAIL_WATCHER` 退出选项，请参见 [Gmail Pub/Sub 集成](/automation/cron-jobs#gmail-pubsub-integration)。
</Note>

## `webhooks gmail setup`

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

安装缺失的 `gcloud` 和 `gog`，对 `gcloud` 进行身份验证，创建 Pub/Sub 主题和订阅，启动 Gmail 监听，并写入 `hooks.gmail` 配置且设置 `hooks.enabled=true`。打印 `Next: openclaw webhooks gmail run`。

<Warning>
此命令会连接 Gmail 传输，但不会创建受限读取代理，也不会创建模板化预设所需的会话密钥策略。如果没有设置 `agentId` 的自定义 Gmail 映射，传入的电子邮件将由默认代理处理，并使用该代理实际生效的工作区、沙箱和工具策略。对于不受信任的收件箱，请在运行 setup 前完成[配置受限的 Gmail 读取代理](/automation/cron-jobs#configure-a-restricted-gmail-reader-recommended)。
</Warning>

### 必需

| 标志                | 描述                  |
| ------------------- | --------------------- |
| `--account <email>` | 要监听的 Gmail 账户。 |

### Pub/Sub 选项

| 标志                    | 默认值                | 描述                                                                                                                             |
| ----------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `--project <id>`        | （无）                 | GCP 项目 ID（OAuth 客户端所有者）。优先回退到主题自身的项目 ID，然后回退到从 `gog` 凭据解析出的项目。 |
| `--topic <name>`        | `gog-gmail-watch`      | Pub/Sub 主题名称。                                                                                                                    |
| `--subscription <name>` | `gog-gmail-watch-push` | Pub/Sub 订阅名称。                                                                                                             |
| `--label <label>`       | `INBOX`                | 要监听的 Gmail 标签。                                                                                                                  |
| `--push-endpoint <url>` | （无）                 | 显式指定的 Pub/Sub 推送端点。会覆盖 Tailscale。                                                                                    |

### OpenClaw 投递选项

| 标志                   | 默认值                                      | 描述                                |
| ---------------------- | -------------------------------------------- | ------------------------------------------ |
| `--hook-url <url>`     | 根据 `hooks.path` 和 Gateway 端口构建 | OpenClaw webhook URL。                      |
| `--hook-token <token>` | `hooks.token`，或生成的令牌          | OpenClaw webhook 令牌。                    |
| `--push-token <token>` | 生成的令牌                              | 传递给 `gog watch serve` 的推送令牌。     |

### `gog watch serve` 选项

| 标志                  | 默认值         | 描述                                                                                                                                  |
| --------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bind <host>`       | `127.0.0.1`     | `gog watch serve` 绑定的主机。                                                                                                                |
| `--port <port>`       | `8788`          | `gog watch serve` 端口。                                                                                                                     |
| `--path <path>`       | `/gmail-pubsub` | `gog watch serve` 路径。在未显式指定目标且启用 Tailscale 时强制为 `/`，因为 Tailscale 在反向代理前会去掉路径。                              |
| `--include-body`      | `true`          | 包含邮件正文片段。没有可用于关闭它的 CLI 标志；请改为在配置中设置 `hooks.gmail.includeBody: false`。                                          |
| `--max-bytes <n>`     | `20000`         | 每个正文片段的最大字节数。                                                                                                                   |
| `--renew-minutes <n>` | `720`（12 小时）     | 每 N 分钟续订一次 Gmail watch。                                                                                                              |

### Tailscale 暴露

| 标志                      | 默认值  | 描述                                                      |
| ------------------------- | ------- | --------------------------------------------------------- |
| `--tailscale <mode>`      | `funnel` | 通过 Tailscale 暴露推送端点：`funnel`、`serve` 或 `off`。 |
| `--tailscale-path <path>` | （无）   | Tailscale serve/funnel 的路径。                           |
| `--tailscale-target <t>`  | （无）   | Tailscale serve/funnel 目标（端口、`host:port` 或 URL）。  |

### 输出

| 标志     | 描述                                       |
| -------- | ------------------------------------------ |
| `--json` | 输出机器可读的摘要，而不是文本。           |

## `webhooks gmail run`

```bash
openclaw webhooks gmail run --account you@example.com
```

在前台运行 `gog watch serve` 以及 watch 自动续订循环；如果它意外退出，则在 2 秒延迟后重启 `gog watch serve`。

`run` 接受与 `setup` 相同的 Pub/Sub、OpenClaw 投递、`gog watch serve` 和 Tailscale 标志，但有以下例外：

- `--account` 在 `run` 中是**可选**的；它会回退到 `hooks.gmail.account`。
- `run` **不**接受 `--project`、`--push-endpoint` 或 `--json`。
- 每个标志都会回退到匹配的 `hooks.gmail.*` 配置值（由 `setup` 写入），然后回退到 `setup` 使用的相同内置默认值，但有一个例外：当标志和 `hooks.gmail.tailscale.mode` 都未设置时，`--tailscale` 在 `run` 中默认为 `off`（而不是 `funnel`）。

| 类别             | 标志                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| Pub/Sub           | `--account`、`--topic`、`--subscription`、`--label`                              |
| OpenClaw 投递    | `--hook-url`、`--hook-token`、`--push-token`                                     |
| `gog watch serve` | `--bind`、`--port`、`--path`、`--include-body`、`--max-bytes`、`--renew-minutes` |
| Tailscale         | `--tailscale`、`--tailscale-path`、`--tailscale-target`                          |

<Note>
对于 `run`，`--topic` 的值是完整的 Pub/Sub 主题路径（`projects/.../topics/...`），而不只是短主题名。
</Note>

## 相关

- [CLI 参考](/cli)
- [Webhook 自动化](/automation/webhook)
- [Gmail Pub/Sub 集成](/automation/cron-jobs#gmail-pubsub-integration)
