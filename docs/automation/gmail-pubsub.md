---
summary: "通过 gogcli 将 Gmail Pub/Sub 推送连接到 OpenClaw webhook"
read_when:
  - 将 Gmail 收件箱触发器连接到 OpenClaw
  - 为 agent 唤醒设置 Pub/Sub 推送
title: "Gmail PubSub"
---

# Gmail Pub/Sub -> OpenClaw

目标：Gmail 监听 -> Pub/Sub 推送 -> `gog gmail watch serve` -> OpenClaw webhook。

## 前提条件

- 已安装并登录 `gcloud` （[安装指南](https://docs.cloud.google.com/sdk/docs/install-sdk)）。
- 已安装并授权 Gmail 账户的 `gog`（gogcli）（[gogcli.sh](https://gogcli.sh/)）。
- 启用 OpenClaw 钩子（见[Webhook](/automation/webhook)）。
- 已登录 `tailscale`（[tailscale.com](https://tailscale.com/)）。支持的配置使用 Tailscale Funnel 作为公用 HTTPS 端点。
  其他隧道服务可用，但为自助/不支持，且需要手动配置。
  目前支持的是 Tailscale。

示例钩子配置（启用 Gmail 预设映射）：

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"],
  },
}
```

若要将 Gmail 摘要发送到聊天界面，覆盖预设，添加映射，
配置 `deliver` 及可选的 `channel`/`to`：

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "收到新邮件来自 {{messages[0].from}}\n主题: {{messages[0].subject}}\n{{messages[0].snippet}}\n{{messages[0].body}}",
        model: "openai/gpt-5.2-mini",
        deliver: true,
        channel: "last",
        // to: "+15551234567"
      },
    ],
  },
}
```

若要固定频道，配置 `channel` + `to`。
否则 `channel: "last"` 使用最后的发送路径（默认回退到 WhatsApp）。

若希望为 Gmail 运行强制使用更便宜的模型，设置映射中的 `model`
（`provider/model` 或别名）。若已设置 `agents.defaults.models`，需包含该模型。

想为 Gmail 钩子单独设置默认模型和思考级别，可以在配置里添加
`hooks.gmail.model` / `hooks.gmail.thinking`：

```json5
{
  hooks: {
    gmail: {
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

注释：

- 映射内每个钩子的 `model`/`thinking` 仍覆盖以上默认设置。
- 回退顺序：`hooks.gmail.model` → `agents.defaults.model.fallbacks` → 主模型（授权/限流/超时）。
- 若设置了 `agents.defaults.models`，则 Gmail 所用模型必须在白名单内。
- Gmail 钩子内容默认包裹外部内容安全边界。
  若要禁用（危险），设置 `hooks.gmail.allowUnsafeExternalContent: true`。

进一步自定义负载处理，请添加 `hooks.mappings` 或在
`~/.openclaw/hooks/transforms` 下编写 JS/TS 转换模块（参见[Webhook](/automation/webhook)）。

## 向导（推荐）

使用 OpenClaw 辅助工具自动连接所有环节（macOS 上通过 brew 安装依赖）：

```bash
openclaw webhooks gmail setup \
  --account openclaw@gmail.com
```

默认情况：

- 使用 Tailscale Funnel 作为公共推送端点。
- 写入 `hooks.gmail` 配置供 `openclaw webhooks gmail run` 使用。
- 启用 Gmail 钩子预设（`hooks.presets: ["gmail"]`）。

路径说明：当启用 `tailscale.mode` 时，OpenClaw 自动设置
`hooks.gmail.serve.path` 为 `/` ，公共路径保留为
`hooks.gmail.tailscale.path`（默认为 `/gmail-pubsub`），因 Tailscale 在代理前会移除路径前缀。
如需后端接收带前缀路径，设置
`hooks.gmail.tailscale.target`（或 `--tailscale-target`）为完整 URL，如
`http://127.0.0.1:8788/gmail-pubsub`，并匹配 `hooks.gmail.serve.path`。

想要自定义端点？请使用 `--push-endpoint <url>` 或关闭 tailscale：`--tailscale off`。

平台提示：macOS 下向导通过 Homebrew 安装 `gcloud`、`gogcli` 和 `tailscale`；
Linux 则需自行安装。

网关自动启动（推荐）：

- 当设置 `hooks.enabled=true` 且配置了 `hooks.gmail.account`，
  网关会在启动时运行 `gog gmail watch serve` 并自动续订监听。
- 设定环境变量 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 可跳过此步骤（适合手动运行守护进程）。
- 请勿同时手动运行守护进程，否则出现
  `listen tcp 127.0.0.1:8788: bind: address already in use` 错误。

手动守护进程（启动 `gog gmail watch serve` 并自动续订）：

```bash
openclaw webhooks gmail run
```

## 一次性设置

1. 选择拥有 `gog` 使用的 OAuth 客户端的 GCP 项目：

```bash
gcloud auth login
gcloud config set project <project-id>
```

注意：Gmail 监听要求 Pub/Sub 主题与 OAuth 客户端位于相同项目内。

2. 启用 API：

```bash
gcloud services enable gmail.googleapis.com pubsub.googleapis.com
```

3. 创建主题：

```bash
gcloud pubsub topics create gog-gmail-watch
```

4. 允许 Gmail 推送发布：

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

## 启动监听

```bash
gog gmail watch start \
  --account openclaw@gmail.com \
  --label INBOX \
  --topic projects/<project-id>/topics/gog-gmail-watch
```

从输出中保存 `history_id`（用于调试）。

## 运行推送处理器

本地示例（共享令牌认证）：

```bash
gog gmail watch serve \
  --account openclaw@gmail.com \
  --bind 127.0.0.1 \
  --port 8788 \
  --path /gmail-pubsub \
  --token <shared> \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token OPENCLAW_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

说明：

- `--token` 用于保护推送端点（通过 `x-gog-token` 头或 URL 参数 `?token=`）。
- `--hook-url` 指向 OpenClaw 的 `/hooks/gmail`（经过映射；独立运行 + 汇总到主进程）。
- `--include-body` 和 `--max-bytes` 控制发送到 OpenClaw 的正文摘要大小。

推荐使用 `openclaw webhooks gmail run`，它封装同样流程并自动续订监听。

## 暴露处理器（高级，不支持）

若需非 Tailscale 隧道，手动连接并在推送订阅中使用公网 URL（不支持且无保护）：

```bash
cloudflared tunnel --url http://127.0.0.1:8788 --no-autoupdate
```

使用生成的 URL 作为推送端点：

```bash
gcloud pubsub subscriptions create gog-gmail-watch-push \
  --topic gog-gmail-watch \
  --push-endpoint "https://<public-url>/gmail-pubsub?token=<shared>"
```

生产环境：使用稳定 HTTPS 端点并配置 Pub/Sub OIDC JWT，然后运行：

```bash
gog gmail watch serve --verify-oidc --oidc-email <svc@...>
```

## 测试

向监听的收件箱发送邮件：

```bash
gog gmail send \
  --account openclaw@gmail.com \
  --to openclaw@gmail.com \
  --subject "watch test" \
  --body "ping"
```

检查监听状态和历史记录：

```bash
gog gmail watch status --account openclaw@gmail.com
gog gmail history --account openclaw@gmail.com --since <historyId>
```

## 故障排查

- `Invalid topicName`：项目不匹配（主题不在 OAuth 客户端项目内）。
- `User not authorized`：缺少主题的 `roles/pubsub.publisher` 权限。
- 消息为空：Gmail 推送只提供 `historyId`，需通过 `gog gmail history` 拉取消息。

## 清理

```bash
gog gmail watch stop --account openclaw@gmail.com
gcloud pubsub subscriptions delete gog-gmail-watch-push
gcloud pubsub topics delete gog-gmail-watch
```
