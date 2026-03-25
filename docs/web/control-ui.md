---
summary: "基于浏览器的网关控制界面（聊天、节点、配置）"
read_when:
  - 你想从浏览器操作网关
  - 你想在无 SSH 隧道情况下访问 Tailnet
title: "控制界面"
---

# 控制界面（浏览器）

控制界面是一个由网关提供服务的小型 **Vite + Lit** 单页应用：

- 默认地址：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它**直接通过同一端口连接网关的 WebSocket**。

## 快速打开（本地）

如果网关运行在同一台电脑上，打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

如果页面加载失败，请先启动网关：`openclaw gateway`。

认证信息在 WebSocket 握手阶段通过以下方式提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
  控制面板设置面板会为当前浏览器标签页会话和所选网关 URL 保留令牌；密码不会被持久保存。
  新手引导默认生成一个网关令牌，所以首次连接时请将其粘贴到这里。

## 设备配对（首次连接）

当你从新的浏览器或设备连接控制界面时，网关需要进行**一次性配对批准**——即使你在同一个 Tailnet 且设置了 `gateway.auth.allowTailscale: true`。这是为了防止未授权访问的安全措施。

**你将看到的提示：**“disconnected (1008): pairing required”（断开连接（1008）：需要配对）

**批准设备的方法：**

```bash
# 列出待处理请求
openclaw devices list

# 通过请求 ID 批准设备
openclaw devices approve <requestId>
```

If the browser retries pairing with changed auth details (role/scopes/public
key), the previous pending request is superseded and a new `requestId` is
created. Re-run `openclaw devices list` before approval.

Once approved, the device is remembered and won't require re-approval unless
you revoke it with `openclaw devices revoke --device <id> --role <role>`. See
[Devices CLI](/cli/devices) for token rotation and revocation.

**注意事项：**

- 本地连接（`127.0.0.1`）自动批准。
- 远程连接（局域网、Tailnet 等）需要明确批准。
- 每个浏览器配置文件会生成唯一设备 ID，更换浏览器或清除浏览器数据会导致需要重新配对。

## 语言支持

控制界面首次加载时根据浏览器语言自动本地化，之后可以在“访问”卡片中的语言选择器手动切换。

- 支持的语言：`en`、`zh-CN`、`zh-TW`、`pt-BR`、`de`、`es`
- 非英语翻译在浏览器中延迟加载。
- 选定的语言保存在浏览器存储中，后续访问时自动使用。
- 缺失的翻译键会回退至英语。

## 当前功能

- 通过网关 WebSocket 聊天模型（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）
- 流式工具调用 + 聊天中实时工具结果卡片（代理事件）
- 频道：WhatsApp/Telegram/Discord/Slack + 插件频道（Mattermost 等）状态、二维码登录、每频道配置 (`channels.status`, `web.login.*`, `config.patch`)
- 实例：在线列表及刷新 (`system-presence`)
- 会话：列表 + 每会话思考/快速/详细/推理重写 (`sessions.list`, `sessions.patch`)
- 定时任务：列表 / 新增 / 编辑 / 运行 / 启用 / 禁用 + 运行历史 (`cron.*`)
- 技能：状态，启用/禁用，安装，API 密钥更新 (`skills.*`)
- 节点：列表 + 权限 (`node.list`)
- 执行审批：编辑网关或节点允许列表 + 针对 `exec host=gateway/node` 的询问策略 (`exec.approvals.*`)
- 配置：查看/编辑 `~/.openclaw/openclaw.json` (`config.get`, `config.set`)
- 配置：应用 + 校验重启 (`config.apply`) 并唤醒最后活动的会话
- 配置写入包含基本哈希保护，防止并发覆盖
- 配置模式 + 表单渲染 (`config.schema`，包括插件和频道模式)；依然支持原始 JSON 编辑器
- 调试：状态 / 健康 / 模型快照 + 事件日志 + 手动 RPC 调用 (`status`, `health`, `models.list`)
- 日志：网关文件日志实时追踪，支持过滤 / 导出 (`logs.tail`)
- 更新：执行包或 Git 更新 + 重启 (`update.run`) 并提供重启报告

定时任务面板说明：

- 对于独立任务，默认采用公告摘要的交付方式。如果你只想进行内部执行，可以切换为无公告。
- 选择公告时，会显示频道/目标字段。
- Webhook 模式使用 `delivery.mode = "webhook"`，且 `delivery.to` 设为有效 HTTP(S) Webhook URL。
- 主会话任务允许使用 webhook 和无公告两种交付模式。
- 高级编辑功能包含执行后删除、清除代理覆盖、cron 精确/错峰选项，代理模型/思考覆盖，以及尽力而为交付开关。
- 表单验证为内联，带字段级错误；无效值时保存按钮会被禁用直到纠正。
- 设置 `cron.webhookToken` 可发送专用的 Bearer 令牌，若省略则无认证头发送 webhook。
- 过时回退：存储的遗留任务 `notify: true` 仍可使用 `cron.webhook`，直到迁移完成。

## 聊天行为

- `chat.send` 为**非阻塞**：它立即确认返回 `{ runId, status: "started" }`，响应通过 `chat` 事件流式传输。
- 使用相同的 `idempotencyKey` 重新发送时，正在运行返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
- `chat.history` 响应大小有限以保证 UI 安全。条目过大时，网关可能截断长文本字段、省略重量级元数据块，超大消息会被占位符替代（`[chat.history omitted: message too large]`）。
- `chat.inject` 会将助手消息追加到会话记录，并广播 `chat` 事件，仅更新 UI（无代理运行，无频道投递）。
- 停止方式：
  - 点击“停止”按钮（调用 `chat.abort`）
  - 输入 `/stop`（或独立的中止词如 `stop`, `stop action`, `stop run`, `stop openclaw`, `please stop`）进行带外中止
  - `chat.abort` 支持 `{ sessionKey }`（无 `runId`）参数，用于终止该会话的所有活动运行
- 中止部分保留：
  - 运行被中止时，部分助手文本仍在 UI 显示
  - 网关将中止时缓冲的助手部分文本保存在会话历史中
  - 持久化条目包含中止元数据，供记录使用者区分中止部分和正常完成输出

## Tailnet 访问（推荐）

### 集成 Tailscale Serve（首选）

保持网关监听 loopback，由 Tailscale Serve 代理并提供 HTTPS：

```bash
openclaw gateway --tailscale serve
```

打开：

- `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

默认情况下，Control UI/WebSocket Serve 请求可通过 Tailscale 身份头
(`tailscale-user-login`) 认证（当 `gateway.auth.allowTailscale` 为 `true`）。OpenClaw
通过使用 `tailscale whois` 解析 `x-forwarded-for` 地址并匹配头部验证身份，
且只接受带有 Tailscale `x-forwarded-*` 头部的本地请求。若想要求令牌/密码认证
即使是 Serve 流量，也可设置 `gateway.auth.allowTailscale: false`
或强制 `gateway.auth.mode: "password"`。
无令牌 Serve 认证假设主机受信任。如果主机上可能运行不信任的本地代码，
请要求令牌/密码认证。

### 绑定 Tailnet + 令牌

```bash
openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
```

然后打开：

- `http://<tailscale-ip>:18789/`（或配置的 `gateway.controlUi.basePath`）

将令牌粘贴到 UI 设置中（作为 `connect.params.auth.token` 发送）。

## HTTP 非安全访问

如果你通过明文 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器将处于**非安全上下文**并阻止 WebCrypto。默认情况下，
OpenClaw **阻止无设备身份的控制界面连接**。

**推荐解决方案：**使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在网关主机上）

**非安全认证切换示例行为：**

```json5
{
  gateway: {
    controlUi: { allowInsecureAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`allowInsecureAuth` 是一个本地兼容性开关：

- 它允许本地 localhost 控制界面会话在非安全 HTTP 环境下无设备身份继续运行。
- 它不会绕过配对检查。
- 它不会放宽远程（非 localhost）设备身份要求。

**仅紧急用：**

```json5
{
  gateway: {
    controlUi: { dangerouslyDisableDeviceAuth: true },
    bind: "tailnet",
    auth: { mode: "token", token: "replace-me" },
  },
}
```

`dangerouslyDisableDeviceAuth` 会禁用控制界面设备身份检查，是极严重的安全降级，紧急使用后应尽快恢复。

有关 HTTPS 设置指导，请参见 [Tailscale](/gateway/tailscale)。

## 构建 UI

网关静态托管 `dist/control-ui` 下的文件。构建方式：

```bash
pnpm ui:build # 首次运行自动安装 UI 依赖
```

可选绝对基路径（用于固定资源 URL）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

本地开发（使用独立开发服务器）：

```bash
pnpm ui:dev # 首次运行自动安装 UI 依赖
```

然后将 UI 指向你的网关 WS 地址（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程网关

控制界面是静态文件，WebSocket 目标可配置，可与 HTTP 源不同。方便你在本地运行 Vite 开发服务器但网关部署在别处。

1. 启动 UI 开发服务器：`pnpm ui:dev`
2. 访问如下 URL：

```text
http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
```

可选一次性认证（如需）：

```text
http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
```

注意：

- `gatewayUrl` is stored in localStorage after load and removed from the URL.
- `token` should be passed via the URL fragment (`#token=...`) whenever possible. Fragments are not sent to the server, which avoids request-log and Referer leakage. Legacy `?token=` query params are still imported once for compatibility, but only as a fallback, and are stripped immediately after bootstrap.
- `password` is kept in memory only.
- When `gatewayUrl` is set, the UI does not fall back to config or environment credentials.
  Provide `token` (or `password`) explicitly. Missing explicit credentials is an error.
- Use `wss://` when the Gateway is behind TLS (Tailscale Serve, HTTPS proxy, etc.).
- `gatewayUrl` is only accepted in a top-level window (not embedded) to prevent clickjacking.
- Non-loopback Control UI deployments must set `gateway.controlUi.allowedOrigins`
  explicitly (full origins). This includes remote dev setups.
- Do not use `gateway.controlUi.allowedOrigins: ["*"]` except for tightly controlled
  local testing. It means allow any browser origin, not “match whatever host I am
  using.”
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` enables
  Host-header origin fallback mode, but it is a dangerous security mode.

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情见：[远程访问](/gateway/remote)。
