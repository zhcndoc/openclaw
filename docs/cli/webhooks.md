---
doc-schema-version: 1
summary: "CLI `openclaw webhooks` 参考（Gmail Pub/Sub 设置和运行程序）"
read_when:
  - "你想将 Gmail Pub/Sub 事件接入 OpenClaw"
  - "你需要完整的标志列表和默认值"
title: "网络钩子"
---

# `openclaw webhooks`

`openclaw webhooks` 通过 `gog` （gogcli） 设置并运行 Gmail Pub/Sub 传输。它不注册[内部`HOOK.md`挂钩](/automation/hooks)或管理任意[网关挂钩映射](/automation/cron-jobs#webhooks)。

## <a id="subcommands"></a> 子命令

```bash
openclaw webhooks gmail setup --account <email> [...]
openclaw webhooks gmail run   [--account <email>] [...]
```

| 子命令    | 描述                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `gmail setup` | 一次性向导：Gmail 手表、Pub/Sub topic/subscription 和 OpenClaw 挂钩投递。 |
| `gmail run`   | 在前台运行 `gog gmail watch serve` 以及手表自动更新循环。         |

<Note>
一旦设置了 `hooks.enabled=true` 和 `hooks.gmail.account`（由 `gmail setup` 设置），网关也会在启动时自动启动 `gog gmail watch serve`。 `gmail run` 提供了一个前台观察程序，用于调试或禁用网关观察程序时。不要针对同一个侦听器运行两者。有关自动启动详细信息和 `OPENCLAW_SKIP_GMAIL_WATCHER` 选择退出，请参阅 [Gmail Pub/Sub 集成](/automation/cron-jobs#gmail-pubsub-integration)。
</Note>

## `webhooks gmail setup`

```bash
openclaw webhooks gmail setup --account you@example.com
openclaw webhooks gmail setup --account you@example.com --project my-gcp-project --json
openclaw webhooks gmail setup --account you@example.com --hook-url https://gateway.example.com/hooks/gmail
```

验证 `gcloud`、启用所需的 API、创建或更新 Pub/Sub、topic/subscription 和推送端点、启动 Gmail 监视，并使用 `hooks.enabled: true` 和 Gmail 预设写入 `hooks.gmail`。缺少的 `gcloud`、`gog` 和 Tailscale 依赖项可以使用 Homebrew 自动安装在 macOS 上。其他平台需要先安装它们。 Gmail 帐户必须已在 `gog` 中获得授权。

安装程序更改云资源、暴露设置和本地配置。它不是只读检查。重新运行它可以将 CLI 默认值应用于保存的 Gmail 设置。它打印 `Next: openclaw webhooks gmail run`。仅当网关管理的观察程序尚未运行时才使用它。

<Warning>
此命令会连接 Gmail 传输，但不会创建受限读取代理，也不会创建模板化预设所需的会话密钥策略。如果没有设置 `agentId` 的自定义 Gmail 映射，传入的电子邮件将由默认代理处理，并使用该代理实际生效的工作区、沙箱和工具策略。对于不受信任的收件箱，请在运行 setup 前完成[配置受限的 Gmail 读取代理](/automation/cron-jobs#configure-a-restricted-gmail-reader-recommended)。
</Warning>

### <a id="required"></a> 必需

| 标志                | 描述             |
| ------------------- | ----------------------- |
| `--account <email>` | 要监听的 Gmail 账户。 |

### <a id="pub%2Fsub-options"></a><a id="pub/sub-options"></a> Pub/Sub 选项

| 标志                    | 默认值                | 描述                                                                                                                                                                            |
| ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--project <id>`        | （无）                 | GCP 项目 ID（OAuth 客户端所有者）。返回到主题自己的项目 ID，然后返回到从 `gog` 凭据解析的项目。                                                |
| `--topic <name>`        | `gog-gmail-watch`      | Pub/Sub 主题名称。                                                                                                                                                                    |
| `--subscription <name>` | `gog-gmail-watch-push` | Pub/Sub 订阅名称。                                                                                                                                                             |
| `--label <label>`       | `INBOX`                | 要监听的 Gmail 标签。                                                                                                                                                                  |
| `--push-endpoint <url>` | （无）                 | 显式 Pub/Sub 推送端点。跳过 Tailscale 端点设置；使用 `--tailscale off` 进行外部管理的曝光。 URL 按原样使用，包括任何所需的推送令牌。 |

### <a id="openclaw-delivery-options"></a> OpenClaw 投递选项

| 标志                   | 默认值                                       | 描述                                                                      |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `--hook-url <url>`     | `hooks.gmail.hookUrl`，则本地网关URL | OpenClaw 网络钩子 URL；生成的回退使用 `hooks.path` 和网关端口。 |
| `--hook-token <token>` | `hooks.token`，或生成的令牌           | OpenClaw webhook 令牌。                                                          |
| `--push-token <token>` | `hooks.gmail.pushToken`，或生成的令牌 | 将 Pub/Sub 验证为 `gog gmail watch serve` 的单独令牌。                |

<a id="gog-watch-serve-options" />

### <a id="gog-gmail-watch-serve-options"></a> `gog gmail watch serve` 选项

| 标志                  | 默认值         | 描述                                                                                                                                        |
| --------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bind <host>`       | `127.0.0.1`     | `gog gmail watch serve` 绑定主机。                                                                                                                 |
| `--port <port>`       | `8788`          | `gog gmail watch serve` 端口。                                                                                                                      |
| `--path <path>`       | `/gmail-pubsub` | `gog gmail watch serve` 路径。当 Tailscale 在没有明确目标的情况下启用时，强制为 `/`，因为 Tailscale 在代理之前剥离路径。 |
| `--include-body`      | `true`          | 包含邮件正文片段。没有可用于关闭它的 CLI 标志；请改为在配置中设置 `hooks.gmail.includeBody: false`。                        |
| `--max-bytes <n>`     | `20000`         | 每个正文片段的最大字节数。                                                                                                                        |
| `--renew-minutes <n>` | `720` (12h)     | 每 N 分钟更新一次 Gmail 手表。                                                                                                                 |

### <a id="tailscale-exposure"></a> Tailscale 暴露

| 标志                          | 默认值                                            | 描述                                                      |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| `--tailscale <mode>`          | `funnel`                                           | 通过 tailscale 公开推送端点：`funnel`、`serve` 或 `off`。 |
| `--tailscale-path <path>`     | `hooks.gmail.tailscale.path`，则服务路径      | 尾秤路径 serve/funnel.                                 |
| `--tailscale-target <target>` | `hooks.gmail.tailscale.target`，则本地观察者 | Tailscale serve/funnel 目标（端口、`host:port` 或 URL）。       |

### <a id="output"></a> 输出

| 标志     | 描述                                       |
| -------- | ------------------------------------------------- |
| `--json` | 输出机器可读的摘要，而不是文本。 |

<Warning>Setup 输出很敏感：`--json` 包括 `hookToken` 和 `pushToken`，以任一格式打印的推送端点都可以包含其令牌。共享之前编辑输出 it.</Warning>

命令失败显示来自 stdout 和 stderr 的有界尾部，并删除了终端颜色和进度重绘。退出代码和记录的终止原因区分超时、信号和输出限制。单独的退出代码 `124` 并不意味着超时。省略标记 （`…`） 表示输出被截断。这些诊断仍然可能包含敏感的命令输出：在共享之前对其进行编辑。

`--port`、`--max-bytes` 和 `--renew-minutes` 需要正整数，不带单位后缀。 `--include-body`没有负CLI标志：设置`hooks.gmail.includeBody: false`并让`run`继承它。

## `webhooks gmail run`

```bash
openclaw webhooks gmail run --account you@example.com
```

启动 Gmail 监视并在前台运行 `gog gmail watch serve` 以及定期监视更新。意外的服务进程退出会在 5 秒后继续重新启动。绑定冲突5秒、10秒、20秒后重试；如果所有 3 次重试均未能绑定，则会记录错误并重新启动停止，但监视更新会继续。每个侦听器仅运行一个观察程序，并在重新启动此命令之前停止冲突的进程。 Ctrl-C 或 SIGTERM 取消挂起的重新启动和更新工作并关闭服务进程树。调查日志中的重复退出。

`run` 接受与 `setup` 相同的 Pub/Sub、OpenClaw 交付、`gog gmail watch serve` 和 Tailscale 标志，但以下情况除外：

- `--account` is **选修的** on `run`。它回落到`hooks.gmail.account`。
- `run` **不**接受 `--project`、`--push-endpoint` 或 `--json`。
- 未指定的标志继承匹配的 `hooks.gmail.*` 设置。 `--hook-token` 继承 `hooks.token`。
- 必须提供或配置 Account、完整主题路径、挂钩令牌和推送令牌。 `run` 不会生成丢失的令牌、配置 Pub/Sub 资源或重写配置。
- 当不存在保存的设置时，其他字段使用设置默认值，但 `--tailscale` 除外，默认为 `off` 而不是 `funnel`。

| 类别                | 标志                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| Pub/Sub                 | `--account`, `--topic`, `--subscription`, `--label`                              |
| OpenClaw 投递       | `--hook-url`, `--hook-token`, `--push-token`                                     |
| `gog gmail watch serve` | `--bind`, `--port`, `--path`, `--include-body`, `--max-bytes`, `--renew-minutes` |
| Tailscale               | `--tailscale`, `--tailscale-path`, `--tailscale-target`                          |

<Note>
对于 `run`，`--topic` 的值是完整的 Pub/Sub 主题路径（`projects/.../topics/...`），而不只是短主题名。
</Note>

## <a id="verify-forwarding"></a> 验证转发

```bash
openclaw config validate
openclaw logs --follow
```

将测试从另一个帐户发送到监视的收件箱。观察程序不包括 `SPAM`、`TRASH`、`DRAFT` 和 `SENT` 消息。检查观察者转发错误，然后检查网关挂钩 completion/error 日志和阅读器的运行输出。成功推送或 HTTP 准入响应并不证明电子邮件处理或渠道传送已完成。在连接不受信任的收件箱之前，请遵循 [ 阅读器边界检查 ](/automation/cron-jobs#verify-the-reader-boundary)。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [Webhook 自动化](/automation/cron-jobs#webhooks)
- [Gmail Pub/Sub 集成](/automation/cron-jobs#gmail-pubsub-integration)
- [配置参考](/gateway/configuration-reference) — 其中记录了每个 Webhook 设置
