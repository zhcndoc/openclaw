---
summary: "已从 OpenClaw 中移除 BlueBubbles 支持。新建和迁移的 iMessage 配置请使用随附的 iMessage 插件与 imsg。"
read_when:
  - 你使用了旧的 BlueBubbles 通道，并且需要迁移到 iMessage
  - 你正在选择受支持的 OpenClaw iMessage 配置
  - 你需要对 BlueBubbles 移除的简要说明
title: "BlueBubbles 的移除与 imsg iMessage 路径"
---

# BlueBubbles 的移除与 imsg iMessage 路径

OpenClaw 不再提供 BlueBubbles 通道。iMessage 支持现在通过随附的 `imessage` 插件运行，该插件会在本地或通过 SSH 包装器启动 [`imsg`](https://github.com/steipete/imsg)，并通过 stdin/stdout 进行 JSON-RPC 通信。

如果你的配置中仍包含 `channels.bluebubbles`，请将其迁移到 `channels.imessage`。旧的 `/channels/bluebubbles` 文档 URL 会重定向到 [来自 BlueBubbles 迁移](/channels/imessage-from-bluebubbles)，其中包含完整的配置转换表和切换检查清单。

## 有哪些变化

- 在受支持的 OpenClaw iMessage 路径中，不再有 BlueBubbles HTTP 服务器、webhook 路由、REST 密码或 BlueBubbles 插件运行时。
- OpenClaw 通过 `imsg` 在登录了 Messages.app 的 Mac 上读取和监视 Messages。
- 基本的发送、接收、历史记录和媒体功能使用标准的 `imsg` 接口以及 macOS 权限。
- 线程回复、tapback、编辑、撤回、效果、已读回执、正在输入指示器和群组管理等高级操作需要使用可用私有 API 桥接的 `imsg launch`。
- Linux 和 Windows 网关仍可通过将 `channels.imessage.cliPath` 设置为一个 SSH 包装器来使用 iMessage，该包装器在已登录的 Mac 上运行 `imsg`。

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

- `channels.bluebubbles.serverUrl` 和 `channels.bluebubbles.password` 没有对应的 iMessage 配置项。
- `channels.bluebubbles.allowFrom`、`groupAllowFrom`、`groups`、`includeAttachments`、附件根目录、媒体大小限制、分块以及操作开关都有对应的 iMessage 配置项。
- `channels.imessage.includeAttachments` 仍然默认关闭。如果你希望传入的照片、语音备忘录、视频或文件能够到达代理，请显式设置它。
- 当使用 `groupPolicy: "allowlist"` 时，请复制旧的 `groups` 配置块，包括任何 `"*"` 通配符条目。群组发送者白名单和群组注册表是两个独立的检查点。
- 任何匹配 `channel: "bluebubbles"` 的 ACP 绑定都必须改为 `channel: "imessage"`。
- 旧的 BlueBubbles 会话密钥不会变成 iMessage 会话密钥。配对授权会按 handle 继承，但 BlueBubbles 会话密钥下的对话历史不会继承。

## 另请参阅

- [来自 BlueBubbles 迁移](/channels/imessage-from-bluebubbles)
- [iMessage](/channels/imessage)
- [配置参考 - iMessage](/gateway/config-channels#imessage)
