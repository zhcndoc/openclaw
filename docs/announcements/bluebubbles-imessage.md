---
summary: "已从 OpenClaw 中移除 BlueBubbles 支持。新建和迁移的 iMessage 配置请使用随附的 iMessage 插件与 imsg。"
read_when:
  - 你使用了旧的 BlueBubbles 通道，并且需要迁移到 iMessage
  - 你正在选择受支持的 OpenClaw iMessage 配置
  - 你需要对 BlueBubbles 移除的简要说明
title: "BlueBubbles 的移除与 imsg iMessage 路径"
---

# BlueBubbles 的移除与 imsg iMessage 路径

OpenClaw 不再附带 BlueBubbles 通道。iMessage 支持通过捆绑的 `imessage` 插件运行：Gateway 会将 [`imsg`](https://github.com/steipete/imsg) 作为子进程启动，直接在本地运行或通过 SSH 包装器运行，并通过 stdin/stdout 进行 JSON-RPC 通信。没有服务器，没有 webhook，没有端口。

如果你的配置中仍包含 `channels.bluebubbles`，请将其迁移到 `channels.imessage`。旧的 `/channels/bluebubbles` 文档 URL 会重定向到 [来自 BlueBubbles 迁移](/channels/imessage-from-bluebubbles)，其中包含完整的配置转换表和切换检查清单。

## 有哪些变化

- 支持的 iMessage 路径不再包含 BlueBubbles HTTP server、webhook 路由、REST 密码或 BlueBubbles 插件运行时。
- OpenClaw 通过 `imsg` 在已登录 Messages.app 的 Mac 上读取和监视 Messages。
- 基础发送、接收、历史记录和媒体使用标准 `imsg` 接口和 macOS 权限。
- 高级操作（线程回复、tapback、编辑、撤回、特效、已读回执、输入指示、群组管理）需要私有 API 桥接：运行 `imsg launch`，这要求关闭 SIP。
- Linux 和 Windows 网关仍然可以使用 iMessage，只需将 `channels.imessage.cliPath` 指向一个 SSH 包装器，由它在已登录的 Mac 上运行 `imsg`。

## 该怎么做

1. 在 Messages 所在的 Mac 上安装并验证 `imsg`：

   ```bash
   brew install steipete/tap/imsg
   imsg --version
   imsg chats --limit 3
   imsg rpc --help
   ```

2. 为运行 `imsg` 和 OpenClaw 的进程上下文授予“完全磁盘访问权限”和“自动化”权限。

3. 转换旧配置：

   ```json5
   {
     channels: {
       imessage: {
         enabled: true,
         cliPath: "/opt/homebrew/bin/imsg",
         dmPolicy: "pairing",
         allowFrom: ["+15555550123"],
         groupPolicy: "allowlist",
         groupAllowFrom: ["+15555550123"],
         groups: {
           "*": { requireMention: true },
         },
         includeAttachments: true,
       },
     },
   }
   ```

4. 重启网关并验证：

   ```bash
   openclaw channels status --probe
   ```

5. 在删除旧的 BlueBubbles 服务器之前，先测试你依赖的私信、群组、附件以及任何私有 API 操作。

## 迁移说明

- `channels.bluebubbles.serverUrl` 和 `channels.bluebubbles.password` 在 iMessage 中没有对应项；这里不存在可连接或可认证的服务器。
- `allowFrom`、`groupAllowFrom`、`groups`、`includeAttachments`、`attachmentRoots`、`mediaMaxMb`、`textChunkLimit` 和 `actions.*` 在 `channels.imessage` 下保持其原有含义不变。
- `channels.imessage.includeAttachments` 默认仍为关闭。如果你希望传入的照片、语音备忘录、视频或文件能够送达代理，请显式设置它。
- 使用 `groupPolicy: "allowlist"` 时，请复制旧的 `groups` 区块，包括任何 `"*"` 通配符条目。群组发送者允许列表和群组注册表是两个独立的门槛；如果 `groups` 区块有条目但没有匹配的 `chat_id`（或没有 `"*"`），消息会在运行时被丢弃，而空的 `groups` 区块会在启动时记录警告，尽管发送者过滤仍然会放行消息。
- 带有 `match.channel: "bluebubbles"` 的 ACP 绑定必须改为 `"imessage"`。
- 旧的 BlueBubbles 会话键不会自动变成 iMessage 会话键。配对批准是按发送者句柄进行判断的，因此复制过来的 `allowFrom` 条目仍然有效，但 BlueBubbles 会话键下的对话历史不会迁移过来。

## 另请参阅

- [来自 BlueBubbles 迁移](/channels/imessage-from-bluebubbles)
- [iMessage](/channels/imessage)
- [配置参考 - iMessage](/gateway/config-channels#imessage)
