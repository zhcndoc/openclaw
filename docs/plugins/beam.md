---
summary: "将经过编辑的本地编码会话发布到共享的只读 OpenClaw 目录"
read_when:
  - 与受信任的 Gateway 操作员共享 Claude Code 或 Codex 会话
  - 配置经过身份验证的会话导入端点，而不连接节点
  - 审计 Beam 存储和公开的内容
title: "Beam 插件"
---

内置的 `beam` 插件通过经过身份验证的 HTTP 接收经过清理的编码会话快照，并将其呈现在控制界面现有的外部会话目录中。源计算机会向外发送文本；OpenClaw 不会反向连接该计算机，也不会获得文件系统、终端、工具或节点功能。

Beam 随 OpenClaw 一起提供，但默认处于禁用状态。启用后，它会注册：

- `POST /api/v1/beam/sessions`
- 控制界面侧边栏中的只读 **Beam** 会话目录

## 启用

```bash
openclaw plugins enable beam
openclaw gateway restart
```

等效配置：

```json5
{
  plugins: {
    entries: {
      beam: { enabled: true },
    },
  },
}
```

不需要摄取路由时禁用插件：

```bash
openclaw plugins disable beam
openclaw gateway restart
```

## 身份验证

接收端使用标准的 Gateway HTTP 身份验证。它不是匿名上传端点。

- 使用 `gateway.auth.mode: "trusted-proxy"` 时，请通过已配置的身份感知代理发送请求。Beam 依赖 Gateway 身份验证，但不会将代理身份标头持久化为上传者归属信息。
- 使用令牌或密码身份验证时，请发送 `Authorization: Bearer <gateway-token-or-password>`。
- 除非其他私有入口能够对每个请求进行完整身份验证，否则不要将 Beam 与 `gateway.auth.mode: "none"` 一起启用。

受 Cloudflare Access 保护的部署可以在不暴露 GitHub 令牌的情况下对本地 CLI 进行身份验证：

```bash
cloudflared access login https://gateway.example.com
cloudflared access curl https://gateway.example.com/api/v1/beam/sessions \
  -H 'Content-Type: application/json' \
  --data-binary @sanitized-beam.json
```

[openclaw/agent-skills](https://github.com/openclaw/agent-skills) 中的 `beam` 技能可处理 Claude Code 和 Codex 的本地会话记录发现、脱敏、Cloudflare Access 登录和上传。

## 请求

```http
POST /api/v1/beam/sessions
Content-Type: application/json
```

```json
{
  "version": 1,
  "beamId": "0123456789abcdef0123456789abcdef",
  "source": "claude",
  "title": "Fix the upload flow",
  "updatedAt": "2026-07-20T12:00:00.000Z",
  "completed": false,
  "items": [
    { "type": "userMessage", "text": "Fix the upload flow." },
    { "type": "agentMessage", "text": "Implemented and tested." },
    { "type": "other", "text": "3 read, 2 write, 1 execute; raw tool outputs dropped: 4" }
  ]
}
```

该模式是封闭的。Beam 会拒绝未知字段、无效的项目类型、空文本、超过 200 个项目、超过 6,000 个字符的项目文本、非 JSON 请求以及超过 56 KiB 的请求体。

成功上传后会返回稳定的 Beam ID 和相对 Control UI URL：

```json
{
  "ok": true,
  "beamId": "0123456789abcdef0123456789abcdef",
  "url": "/chat/main?catalog=beam&host=gateway&thread=<beamId>"
}
```

上传相同的 `beamId` 会更新现有的目录行。完成状态的上传会将该行状态设置为 `completed`；较早的更新则显示为 `live`。

## 存储与可见性

Beam 将经过清理的载荷存储在 OpenClaw 共享的、由 SQLite 支持的插件状态中：

- 最多 500 个会话
- 七天保留期，每次更新时刷新
- 当目录达到上限时，淘汰最旧的条目
- 服务器接收时间决定目录排序；客户端无法通过伪造时间戳将自己提前

该目录在 Gateway 操作者域内有意共享。拥有 `operator.read` 的每个客户端都可以查看每个 Beam 会话，而上传则需要 `operator.write` 或 `operator.admin`。系统不会保留上传者身份；任何知道 Beam ID 且拥有写入权限的操作者都可以更新该行。OpenClaw 操作者范围并不构成租户隔离；当会话必须在团队或机器之间隔离时，请使用独立的 Gateway。

## 安全边界

Beam 是被动的会话发布功能，不是远程控制。

- 它不具备 `continueSession`、存档、终端、工具或节点能力。
- 它只接受纯文本的规范化转录条目，不接受 HTML、脚本、存档、附件或由服务器获取的 URL。
- 官方技能会在上传前移除原始工具结果、推理内容、提示词、本地路径、凭据、Cookie 和身份验证材料。
- 接收方仍会将每份转录视为不受信任的文本。将 Beam 转录复制到新的智能体会话中，是操作员执行的独立操作。
- 请求会在读取正文前进行速率限制和并发限制。

## 镜像

Beam 也可以作为发送方：通过选择性启用的镜像功能，持续将本机活跃的本地编码会话（Claude Code、Codex 以及其他已注册的会话目录）发布到远程 Beam 接收器，例如共享团队 Gateway。随后，团队成员无需访问源机器，即可在远程控制界面中近乎实时地查看会话记录。

```json5
{
  plugins: {
    entries: {
      beam: {
        enabled: true,
        config: {
          mirror: {
            endpoint: "https://team.example.com/api/v1/beam/sessions",
            token: { source: "env", provider: "default", id: "BEAM_TEAM_TOKEN" },
            catalogs: ["claude", "codex"],
          },
        },
      },
    },
  },
}
```

- `endpoint`（必需）：远程接收器 URL。对于非回环主机，强制使用 HTTPS；仅在 `localhost`/`127.0.0.1`/`::1` 开发环境中接受明文 `http://`。
- `token`：远程接收器的 Gateway 凭据，以 `Authorization: Bearer` 形式发送。接受普通字符串或密钥引用；已配置但无法解析的令牌会暂停镜像，而不是发送未经身份验证的请求。由具备身份感知能力的代理置于前端的部署，需要一个能够接受此 bearer 凭据的入口。
- `catalogs`（必需）：要镜像的会话目录 ID，作为针对每个目录的明确授权——省略或提供空列表时不会镜像任何内容。本地 `beam` 接收器目录始终会被排除，因此两个相互镜像的 Gateway 不会重复镜像对方的记录。
- `pollSeconds`（默认值为 30，最小值为 10）：镜像扫描本地目录的频率。
- `activeWindowMinutes`（默认值为 180）：在此时间窗口内有较新活动的会话会被视为正在进行，并持续镜像；当会话闲置时间超过该窗口后，镜像会发送一次最终的 `completed` 更新。

在任何内容离开本机之前，镜像都会应用与 beam 技能相同的脱敏规范：仅上传用户和代理的消息文本，而将推理、工具调用、工具结果和原始负载替换为简要计数。快照会限制在接收器的上限内（200 个项目、56 KiB），优先丢弃最早的条目，并将上传标记为 `truncated`。配对节点上的会话不会被镜像；镜像仅共享此 Gateway 所在机器上的会话，并优先处理最新的 32 个会话。

## 故障排查

`404 Not Found`

: Beam 插件已禁用、Gateway 在启用插件后尚未重启，或请求被发送到了另一个 Gateway。

`401 Unauthorized`

: 请求未通过 Gateway HTTP 身份验证。请检查 bearer 凭据或受信任代理/Access 会话。

`405 Method Not Allowed`

: 接收端仅接受 `POST`。

`413 Payload Too Large`

: 序列化后的请求超过了 56 KiB。官方 skill 会丢弃较早的已清理消息，直到快照符合大小限制。

`429 Too Many Requests`

: 已认证客户端超出了请求数或并发数限制。请在当前分钟窗口结束后重试。

## 相关

- [控制界面](/web/control-ui)
- [操作员权限范围](/gateway/operator-scopes)
- [受信任代理身份验证](/gateway/trusted-proxy-auth)
- [插件管理](/plugins/manage-plugins)
