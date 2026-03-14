---
summary: "Google Chat 应用支持状态、功能和配置"
read_when:
  - 在开发 Google Chat 频道功能时
title: "Google Chat"
---

# Google Chat（Chat API）

状态：已准备好通过 Google Chat API webhook（仅限 HTTP）支持私聊和群组空间。

## 快速设置（初学者）

1. 创建一个 Google Cloud 项目并启用 **Google Chat API**。
   - 访问：[Google Chat API 凭据](https://console.cloud.google.com/apis/api/chat.googleapis.com/credentials)
   - 如果尚未启用，点击启用该 API。
2. 创建一个 **服务账号**：
   - 点击 **创建凭据** > **服务账号**。
   - 自行命名（例如：`openclaw-chat`）。
   - 权限留空（点击 **继续**）。
   - 无需添加可访问的主体，直接点击 **完成**。
3. 创建并下载 **JSON 密钥**：
   - 在服务账号列表中，点击刚创建的服务账号。
   - 切换到 **密钥** 标签页。
   - 点击 **添加密钥** > **创建新密钥**。
   - 选择 **JSON** 格式，点击 **创建**。
4. 将下载的 JSON 文件存放于网关主机，例如：`~/.openclaw/googlechat-service-account.json`。
5. 在 [Google Cloud Console Chat 配置页](https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat) 创建 Google Chat 应用：
   - 填写 **应用信息**：
     - **应用名称**：（例如 `OpenClaw`）
     - **头像 URL**：（例如 `https://openclaw.ai/logo.png`）
     - **描述**：（例如 `个人 AI 助手`）
   - 启用 **交互式功能**。
   - 在 **功能** 中，勾选 **加入空间和群聊**。
   - 在 **连接设置** 中，选择 **HTTP 端点 URL**。
   - 在 **触发器** 中，选择 **为所有触发器使用通用的 HTTP 端点 URL**，并设置为网关的公网地址后跟 `/googlechat`。
     - _提示：运行 `openclaw status` 查看网关的公网 URL。_
   - 在 **可见性** 中，勾选 **使此 Chat 应用对您所在域 &lt;Your Domain&gt; 的特定人员和群组可用**。
   - 在文本框中输入你的邮箱地址（例如 `user@example.com`）。
   - 点击页面底部的 **保存**。
6. **启用应用状态**：
   - 保存后，刷新页面。
   - 找到 **应用状态** 部分（通常保存后页面顶部或底部）。
   - 将状态切换为 **在线 - 对用户可用**。
   - 再次点击 **保存**。
7. 在 OpenClaw 中配置服务账号路径和 webhook 受众：
   - 环境变量：`GOOGLE_CHAT_SERVICE_ACCOUNT_FILE=/path/to/service-account.json`
   - 或者配置文件：`channels.googlechat.serviceAccountFile: "/path/to/service-account.json"`。
8. 设置 webhook 受众类型和数值（需与 Chat 应用配置匹配）。
9. 启动网关。Google Chat 会向你的 webhook 路径发送 POST 请求。

## 添加到 Google Chat

网关运行并且你的邮箱加入到可见列表后：

1. 访问 [Google Chat](https://chat.google.com/)。
2. 点击 **直接消息** 旁的 **+**（加号）图标。
3. 在搜索框（平时添加联系人的地方）输入你在 Google Cloud Console 配置的 **应用名称**。
   - **注意**：该机器人不会在“应用市场”浏览列表中显示，因为它是私有应用，必须通过名称搜索。
4. 点击搜索结果中的你的机器人。
5. 点击 **添加** 或 **聊天**，开始一对一对话。
6. 发送“Hello”以触发助理！

## 公共 URL（仅限 Webhook）

Google Chat webhook 需要一个公网 HTTPS 端点。为安全起见，**只将 `/googlechat` 路径暴露到互联网**，OpenClaw 仪表盘和其他敏感端点应保持在私网中。

### 选项 A：Tailscale Funnel（推荐）

使用 Tailscale Serve 保护私有仪表盘，利用 Funnel 公开 webhook 路径，只开放 `/googlechat`。

1. **检查网关绑定地址：**

   ```bash
   ss -tlnp | grep 18789
   ```

   记录 IP 地址（例如：`127.0.0.1`、`0.0.0.0` 或你的 Tailscale IP，如 `100.x.x.x`）。

2. **仅向 tailnet 暴露仪表盘（端口 8443）：**

   ```bash
   # 绑定到本地接口 (127.0.0.1 或 0.0.0.0)：
   tailscale serve --bg --https 8443 http://127.0.0.1:18789

   # 如果绑定到 Tailscale IP（例如 100.106.161.80）：
   tailscale serve --bg --https 8443 http://100.106.161.80:18789
   ```

3. **仅公开 webhook 路径：**

   ```bash
   # 绑定到本地接口 (127.0.0.1 或 0.0.0.0)：
   tailscale funnel --bg --set-path /googlechat http://127.0.0.1:18789/googlechat

   # 绑定到 Tailscale IP（例如 100.106.161.80）：
   tailscale funnel --bg --set-path /googlechat http://100.106.161.80:18789/googlechat
   ```

4. **为该节点授权 Funnel 访问权限：**  
   如果提示，访问输出中的授权 URL，在 tailnet 策略中启用此节点的 Funnel。

5. **验证配置：**

   ```bash
   tailscale serve status
   tailscale funnel status
   ```

你的公网 webhook URL 为：  
`https://<节点名>.<tailnet>.ts.net/googlechat`

私有仪表盘保持 tailnet 内部访问：  
`https://<节点名>.<tailnet>.ts.net:8443/`

在 Google Chat 应用配置中使用公网 URL（无 `:8443`）。

> 注意：此配置重启后依然生效。若要移除，运行 `tailscale funnel reset` 和 `tailscale serve reset`。

### 选项 B：反向代理（Caddy）

如果使用反向代理如 Caddy，仅代理指定路径：

```caddy
your-domain.com {
    reverse_proxy /googlechat* localhost:18789
}
```

此配置下，访问 `your-domain.com/` 的请求会被忽略或返回 404，只有 `your-domain.com/googlechat` 会安全转发到 OpenClaw。

### 选项 C：Cloudflare Tunnel

配置隧道的入口规则，仅路由 webhook 路径：

- **路径**：`/googlechat` -> `http://localhost:18789/googlechat`
- **默认规则**：HTTP 404（找不到）

## 工作原理

1. Google Chat 向网关发送 webhook POST 请求。每个请求都包含一个 `Authorization: Bearer <token>` 头。
   - 当头部存在时，OpenClaw 在读取/解析完整 webhook 内容之前验证 bearer 认证。
   - Google Workspace 插件请求携带 `authorizationEventObject.systemIdToken` 的请求支持更严格的预认证体预算。
2. OpenClaw 根据配置的 `audienceType` + `audience` 验证令牌：
   - `audienceType: "app-url"` → 受众是你的 HTTPS webhook URL。
   - `audienceType: "project-number"` → 受众是 Cloud 项目编号。
3. 消息按空间路由：
   - 私聊使用会话键 `agent:<agentId>:googlechat:direct:<spaceId>`。
   - 群组空间使用会话键 `agent:<agentId>:googlechat:group:<spaceId>`。
4. 私聊默认需要配对。未知发件人会收到配对码；通过以下命令批准：
   - `openclaw pairing approve googlechat <code>`
5. 群组空间默认需要@提及。若需提及检测使用应用用户名，则配置 `botUser`。

## 标识符（Targets）

用于消息投递和允许列表：

- 私聊：`users/<userId>`（推荐）。
- 原始邮箱 `name@example.com` 是可变的，仅在启用 `channels.googlechat.dangerouslyAllowNameMatching: true` 时用于直接允许列表匹配。
- 已废弃：`users/<email>` 被视为用户 ID，不作为邮箱允许列表。
- 空间：`spaces/<spaceId>`。

## 配置示例

```json5
{
  channels: {
    googlechat: {
      enabled: true,
      serviceAccountFile: "/path/to/service-account.json",
      // 或使用 serviceAccountRef: { source: "file", provider: "filemain", id: "/channels/googlechat/serviceAccount" }
      audienceType: "app-url",
      audience: "https://gateway.example.com/googlechat",
      webhookPath: "/googlechat",
      botUser: "users/1234567890", // 可选，辅助提及检测
      dm: {
        policy: "pairing",
        allowFrom: ["users/1234567890"],
      },
      groupPolicy: "allowlist",
      groups: {
        "spaces/AAAA": {
          allow: true,
          requireMention: true,
          users: ["users/1234567890"],
          systemPrompt: "仅简短回答。",
        },
      },
      actions: { reactions: true },
      typingIndicator: "message",
      mediaMaxMb: 20,
    },
  },
}
```

注意事项：

- 服务账号凭据也可以通过 `serviceAccount`（JSON 字符串）直接内联传递。
- 还支持 `serviceAccountRef`（环境变量/文件 SecretRef），包括每个账号独立引用，路径为 `channels.googlechat.accounts.<id>.serviceAccountRef`。
- 默认 webhook 路径为 `/googlechat`，如果未设置 `webhookPath`。
- `dangerouslyAllowNameMatching` 用于重新启用可变邮箱匹配的允许列表（应急兼容模式）。
- 启用 `actions.reactions` 后，可使用 `reactions` 工具和 `channels action` 进行反应操作。
- `typingIndicator` 支持 `none`、`message`（默认）、`reaction`（反应需用户 OAuth）。
- 附件通过 Chat API 下载并存储于媒体管道，大小受 `mediaMaxMb` 限制。

Secrets 参考详情见：[Secrets 管理](/gateway/secrets)。

## 故障排查

### 405 方法不被允许

如果 Google Cloud 日志查看器显示错误：

```
status code: 405, reason phrase: HTTP error response: HTTP/1.1 405 Method Not Allowed
```

表示 webhook 处理程序未注册。常见原因：

1. **频道未配置**：配置中缺少 `channels.googlechat` 部分。用以下命令确认：

   ```bash
   openclaw config get channels.googlechat
   ```

   如果返回“Config path not found”，请添加配置（参见[配置示例](#配置示例)）。

2. **插件未启用**：检查插件状态：

   ```bash
   openclaw plugins list | grep googlechat
   ```

   如果显示“disabled”，请在配置中加入 `plugins.entries.googlechat.enabled: true`。

3. **网关未重启**：添加配置后需要重启网关：

   ```bash
   openclaw gateway restart
   ```

确认频道正在运行：

```bash
openclaw channels status
# 应显示：Google Chat default: enabled, configured, ...
```

### 其他问题

- 使用 `openclaw channels status --probe` 检查认证错误或缺少受众配置。
- 若无消息到达，确认 Chat 应用的 webhook URL 和事件订阅是否正确。
- 如果提及限制阻止回复，设置 `botUser` 为应用的用户资源名称，检查 `requireMention` 配置。
- 发送测试消息时，使用 `openclaw logs --follow` 查看请求是否到达网关。

相关文档：

- [网关配置](/gateway/configuration)
- [安全](/gateway/security)
- [反应操作](/tools/reactions)
