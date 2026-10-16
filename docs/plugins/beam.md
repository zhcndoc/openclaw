---
summary: "发布编码会话以供共享查看和独立团队延续"
read_when:
  - "与受信任的 Gateway 操作员共享 Claude Code 或 Codex 会话"
  - "继续与团队代理进行愉快的对话"
  - "配置经过身份验证的会话导入端点，而不连接节点"
  - "审计 Beam 存储和公开的内容"
title: "Beam 插件"
---

捆绑的 `beam` 插件通过经过身份验证的 HTTP 接收经过清理的编码会话快照，并将其呈现在 Control UI 的现有外部会话目录中。源计算机发送文本； OpenClaw 永远不会连接回该计算机，也不会接收任何文件系统、终端、工具或节点功能。

Beam 随 OpenClaw 一起提供，但默认处于禁用状态。启用后，它会注册：

- `POST /api/v1/beam/sessions`
- Control UI 侧栏中的 **Beam** 会话目录

## <a id="enable"></a> 启用

```bash
openclaw plugins enable beam
```

启用自动应用于正在运行的网关。如果离线，请启动它以使用 Beam。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

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
```

## <a id="authentication"></a> 身份验证

接收端使用标准的 Gateway HTTP 身份验证。它不是匿名上传端点。

- 使用`gateway.auth.mode: "trusted-proxy"`，通过配置的身份感知代理发送请求。 Beam 会记录经过验证的上传者的 OpenClaw 个人资料 ID（如果可用）；它不保留代理身份标头或凭据。
- 使用令牌或密码身份验证时，请发送 `Authorization: Bearer <gateway-token-or-password>`。
- 除非其他私有入口能够对每个请求进行完整身份验证，否则不要将 Beam 与 `gateway.auth.mode: "none"` 一起启用。

Cloudflare 访问保护部署可以对本地 CLI 进行身份验证，而无需暴露 GitHub 令牌：

```bash
cloudflared access login https://gateway.example.com
cloudflared access curl https://gateway.example.com/api/v1/beam/sessions \
  -H 'Content-Type: application/json' \
  --data-binary @sanitized-beam.json
```

[openclaw/agent-skills](https://github.com/openclaw/agent-skills) 中的 `beam` 技能可处理 Claude Code 和 Codex 的本地记录发现、编辑、Cloudflare Access 登录以及上传。

## <a id="request"></a> 请求

```http
POST /api/v1/beam/sessions
Content-Type: application/json
```

```json
{
  "version": 1,
  "beamId": "0123456789abcdef0123456789abcdef",
  "source": "claude",
  "sourceModel": { "provider": "anthropic", "model": "claude-opus-4-1" },
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

按对话顺序发送 `items`，最早的在前。 Beam 会将该顺序保留在存储中，并在回答之前显示问题。其会话目录 API 返回最新的第一页，与其他编码会话目录相匹配。

该模式是封闭的。Beam 会拒绝未知字段、无效的项目类型、空文本、超过 200 个项目、超过 6,000 个字符的项目文本、非 JSON 请求以及超过 56 KiB 的请求体。

成功上传会返回稳定的 Beam id 和相对的 Control UI URL：

```json
{
  "ok": true,
  "beamId": "0123456789abcdef0123456789abcdef",
  "url": "/beam/fix-the-upload-flow-0123456789ab"
}
```

返回的 URL 使用会话标题 slug，后跟 12 个字符的小写十六进制 ID 前缀，与常规会话链接匹配。 ID 仍然具有权威性：裸 ID 链接和具有旧标题的链接仍然可以解析，并且浏览器会用当前标题替换名称，而不添加历史记录。不产生 slug 的标题使用裸 ID。配置的 Control UI 基本路径为路由添加前缀，例如 `/openclaw/beam/fix-the-upload-flow-0123456789ab`。完整 32 个字符的 Beam id 中的较长前缀也可以使用。 2026.8.2 接收器中附带的命名链接；在更新接收器之前更新 Beam 技能，以便其响应验证器接受它们。

当 `updatedAt` 更新时，上传相同的 `beamId` 会更新现有目录行。等时间戳上传可能会刷新相同状态或将活动行标记为已完成，但无法将已完成的行恢复为活动状态。较旧的上传和等时间戳完成回归仍返回正常的 `200` 成功响应，但 OpenClaw 会忽略它们。仅接受的更新会刷新保留和上传者归属。

`sourceModel` 是可选的。自动镜像包括源目录报告的最新模型。如果没有它，较旧的客户端和快照仍然有效。

## <a id="continue-on-the-team-gateway"></a> 在团队网关上继续

在 Control UI 中选择一个 Beam 并在其编辑器中写入一条消息。在第一次发送时，OpenClaw 为选定的团队代理创建一个正常会话，将保留的 Beam 行中的有界清理历史记录复制到其中，然后将消息发送到那里。忽略的过时上传无法更改该继续源。原始 Beam 保持不变，以后的源上传不会更改复制的会话。

OpenClaw用途`sourceModel`当团队代理可以使用该确切模型时。否则，它将使用代理的配置模型。每个复制的记录项都被标记为不受信任的外部内容。复制的会话还包括一条通知，表明旧内容是参考资料而不是操作员说明，命名了模型选择，并解释了该会话无法访问源计算机或其工具。

延续是复制，而不是远程恢复或双向同步。每个操作符都可以从同一个 Beam 创建一个独立的延续。

## <a id="storage-and-visibility"></a> 存储与可见性

Beam 将清理后的有效负载存储在 OpenClaw 的共享 SQLite-backed 插件状态中：

- 最多 500 个会话
- 每个接受的更新都会刷新七天保留期
- 当目录达到上限时，淘汰最旧的条目
- 服务器接收时间决定目录排序；客户端无法通过伪造时间戳将自己提前

侧边栏重用内存中的元数据库存，而不是在每次轮询中加载每个记录。上传和删除会立即使该库存失效；下一个列表分享了从商店重新加载的一次。插件服务会预加载清单并每 30 秒刷新一次，以获取其他进程所做的更改。过期条目隐藏在每个列表中。转录读取和延续总是读取底层存储。更新时无需迁移存储数据。

该目录有意在网关运营商域之间共享。每个具有 `operator.read` 的客户端都可以查看每个传输的会话。上传或继续需要`operator.write`或`operator.admin`；代理访问策略还必须允许所选代理。任何知道 Beam id 的写入授权操作员都可以更新该行。上传者归属并不授予所有权或更改访问权限。 OpenClaw 操作员范围不是租户隔离；当会话必须在团队或计算机之间隔离时，请使用单独的网关。

延续属于创建它的经过身份验证的操作员。从那时起，它遵循该团队代理的普通会话共享、沙箱、工具和模型策略。对原始 Beam 的访问并不授予对另一个操作员的延续的访问权限。

用户轮次归因于当前快照的已验证发布者，使用其当前的个人资料名称和头像，包括合并的个人资料。 Beam 的上传格式无法识别多用户成绩单中的个别作者。上传者参考共享快照的 7 天保留期，并在每次上传时进行替换。共享令牌上传、配置文件解析失败以及没有记录的上传者的旧快照显示 **User**；他们永远不会继承查看者的身份或先前上传者的身份。通过个人身份验证重新上传旧快照以对其进行归属。

### <a id="delete"></a> 删除

任何拥有 `operator.write` 的操作员都可以从其侧边栏行菜单中删除梁。确认后，侧边栏隐藏该行，删除完成。如果删除失败，该行将返回并出现错误。成功删除是永久的。重新上传相同的 `beamId` 会重新创建该行，无论是通过手动技能还是仍然活动的镜像的下一次上传。镜像会跳过未更改的快照，因此不一定会在下一次轮询时进行重新创建。删除 Beam 不会影响已从其创建的延续。

## <a id="security-boundary"></a> 安全边界

光束发布不是远程控制。

- Continuing 进行独立的网关拥有的会话。 Beam 本身没有文件系统、终端、工具或节点功能。
- 它接受纯文本规范化转录项目，而不是 HTML、脚本、档案、附件或服务器获取的 URL。
- 官方技能会在上传前移除原始工具结果、推理内容、提示词、本地路径、凭据、Cookie 和身份验证材料。
- 接收方将每个记录视为不可信文本。 Beam 编辑器中的第一条消息是将其复制到新会话中的显式操作员操作。
- 请求会在读取正文前进行速率限制和并发限制。

## <a id="mirroring"></a> 镜像

Beam 还可以充当发送方：一个选择加入的镜像，持续将此计算机的活动本地编码会话（Claude Code、Codex 和其他已注册的会话目录）发布到远程 Beam 接收方，例如共享团队网关。然后，队友可以在远程 Control UI 中观看近乎实时的会话记录，而无需访问源计算机。

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

- `endpoint`（必填）：最终的远程接收器URL。更改它会开始向该接收者发送新的内容，包括未更改的活动会话；前一个接收器的待定终端重试将被丢弃，使其行正常过期。不遵循重定向响应（301、302、303、307 和 308）；直接配置目标URL。重定向后，当前镜像服务实例的重复轮询将被抑制。网关重新启动会再次检查配置的端点，以便在同一 URL 处纠正的接收器可以恢复。对于非环回主机强制执行 HTTPS；仅 `localhost`/`127.0.0.1`/`::1` 开发接受明文 `http://`。
- `token`：远程接收器的 Gateway 凭据，以 `Authorization: Bearer` 形式发送。接受普通字符串或密钥引用；已配置但无法解析的令牌会暂停镜像，而不是发送未经身份验证的请求。由具备身份感知能力的代理置于前端的部署，需要一个能够接受此 bearer 凭据的入口。
- `catalogs`（必需）：要镜像的会话目录 ID，作为明确的每个目录同意 — 省略或空列表不会镜像任何内容。本地 `beam` 接收器目录始终被排除，因此两个镜像网关无法重新镜像彼此的行。
- `pollSeconds`（默认值为 30，最小值为 10）：镜像扫描本地目录的频率。
- `activeWindowMinutes`（默认 180）：具有比此窗口更新的活动的会话算作活动并保持镜像；当会话空闲超过窗口时，正在运行的镜像服务将重试其最终 `completed` 更新，直到接收者接受它或 7 天的保留窗口结束。重试状态是进程本地的：网关重新启动会清除挂起的终端重试，因此远程行保持活动状态，直到其正常的 7 天保留期到期。

该镜像上传用户和代理消息文本，用紧凑的计数替换结构化推理、工具调用、工具结果和原始有效负载。标题和消息在剪辑之前会保留其原始文本，包括凭据。 `logging.redactPatterns` 适用于日志和诊断，不适用于镜像内容。手动 Beam 技能分别剥离设置包装器、本地路径、联系人标识符和不透明值；自动镜像不适用这些规则。仅对您想要共享其可见消息文本的目录启用它。

在应用接收器限制（200 个项目，56 KiB）之前，镜像将最新的第一个目录页面转换为按时间顺序上传，首先删除最旧的条目。每当旧页面保留、源报告截断或文本或项目被剪裁时，它就会标记上传 `truncated`。 Claude 目录页面对单个文本、推理和工具块进行计数并限制其文本大小。配对节点上的会话不会被镜像；镜像仅共享来自该网关计算机的会话，最新的 32 个优先。即使其目录有更多页面，离开活动窗口的列出会话也会收到其最终完成的更新；只有在完整、成功的主持人列表之后，缺席会话​​才会结束。

在配对节点上浏览 Claude 会话时，请与网关一起更新这些节点。当混合行跨越页面时，没有块恢复元数据的旧节点构建会报告需要更新的错误。

## <a id="troubleshooting"></a> 故障排查

**`404 Not Found`** Beam 插件已禁用、运行时应用程序失败或请求正在到达另一个网关。检查启用结果并[检查插件](/plugins/manage-plugins#apply-changes-and-inspect)。

**`401 Unauthorized`** 该请求不满足网关 HTTP 身份验证。检查承载凭证或trusted-proxy/Access 会话。

**`405 Method Not Allowed`** 接收器仅接受 `POST`。

**`413 Payload Too Large`** 序列化请求超过 56 KiB。官方技能会删除较旧的已清理消息，直到快照适合为止。

**`429 Too Many Requests`** 经过身份验证的客户端超出了有界请求或并发限制。在当前分钟窗口后重试。

**`beam mirror upload blocked ... receiver returned redirect`** 配置的镜像端点返回重定向。 Beam 不遵循重定向并抑制对当前服务实例的重复尝试；将 `mirror.endpoint` 设置为最终接收者 URL。网关重新启动会再次检查配置的端点。

## <a id="related"></a> 相关内容

- [控制 UI](/web/control-ui)
- [控制 UI URL](/web/urls)
- [操作员范围](/gateway/operator-scopes)
- [可信代理授权](/gateway/trusted-proxy-auth)
- [插件管理](/plugins/manage-plugins)
