---
summary: "哪个Feishu消息类型OpenClaw接收和发送，包括贴纸和帖子回复"
read_when:
  - "检查Feishu是否支持消息类型"
  - "启用贴纸回复或贴纸关键字搜索"
title: "Feishu 消息类型"
sidebarTitle: "消息类型"
---

Feishu 消息类型 OpenClaw 可以接收和发送、贴纸支持和线程感知回复。

## <a id="reading-messages-and-chat-information"></a> 读取消息和聊天信息

从 npm 或 ClawHub 安装的官方 Feishu 插件使用与捆绑插件相同的 Feishu 访问检查，用于消息读取、反应和 pin 列表、聊天和成员信息、目录列表以及配置的贴纸搜索。现有帐户、操作和 [ 访问控制](/channels/feishu/access-control) 仍然适用。直接聊天成员查找仍仅限于当前发件人，目录结果仍按配置的策略进行过滤。

对于实时对等查找，`channel-list` 操作将 `query` 与跨提供商页面的用户 ID 和名称进行匹配。 `limit` 适用于匹配对等点，默认为 50。如果分页无法在 100 页内完成或提供程序返回无效的继续令牌，则该操作会报告查找失败。

从已安装的插件中​​进行委托读取需要当前的 Feishu 帐户和对话上下文。结束原始操作或停用插件可以防止以后的提供者请求并拒绝较晚的结果。已发送至 Feishu 的请求无法撤消。

## <a id="supported-message-types"></a> 支持的消息类型

### <a id="receive"></a> 接收

- ✅ 文本
- ✅ 富文本（帖子）
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ Video/media
- ✅ 表情贴纸

收到的贴纸将其可重复使用的 `file_key` 暴露给代理为 `<sticker key="..."/>`。 Feishu/Lark不支持下载贴纸资源，因此OpenClaw保留密钥而不获取附件。

带标题发送的文件或一条消息中的多个文件将以富文本 `post` 形式到达，并带有顶级 `files[]` 数组。 OpenClaw 通过与独立 `file` 消息相同的入站附件路径下载这些文件。

合并转发消息包括每个子级的原始发件人和 UTC 时间戳（如果可用）。发件人姓名使用帐户的 `resolveSenderNames` 设置；如果无法解析名称或禁用查找，则保留发件人 ID。儿童提及内容仍附加在原始邮件中。姓名查找仅限于按时间顺序排列的前 50 个孩子，与呈现的历史记录相匹配。

入站 Feishu/Lark 音频消息被标准化为媒体占位符，而不是原始 `file_key` JSON。配置 `tools.media.audio` 时，OpenClaw 会下载语音笔记资源并在座席轮流之前运行共享音频转录，以便座席收到语音转录。如果 Feishu 直接在音频负载中包含转录文本，则使用该文本而无需另一个 ASR 调用。如果没有音频转录提供程序，代理仍会收到 `<media:audio>` 占位符以及保存的附件，而不是原始 Feishu 资源负载。

### <a id="send"></a> 发送

- ✅ 文本
- ✅ 图片
- ✅ 文件
- ✅ 音频
- ✅ Video/media
- ✅ 视频/媒体
- ✅ 同一机器人之前收到的贴纸（需要 `actions.sticker`）
- ⚠️ 富文本（后样式格式；不支持完整的 Feishu/Lark 创作功能）

本机 Feishu/Lark 音频气泡使用 Feishu `audio` 消息类型，并需要 Ogg/Opus 上传媒体 （`file_type: "opus"`）。现有的 `.opus` 和 `.ogg` 媒体直接作为本机音频发送。仅当回复请求语音传送时，MP3/WAV/M4A 和其他可能的音频格式才会通过 `ffmpeg` 转码为 48kHz Ogg/Opus（`audioAsVoice` / 消息工具 `asVoice`，包括 TTS 语音注释回复）。普通 MP3 附件保留常规文件。如果 `ffmpeg` 丢失或转换失败，OpenClaw 会退回到文件附件并记录原因。

### <a id="sticker-replies"></a> 贴纸回复

启用贴纸操作以让代理重新发送贴纸：

```json5
{
  channels: {
    feishu: {
      actions: { sticker: true },
    },
  },
}
```

仅针对一个帐户，请设置 `channels.feishu.accounts.<id>.actions.sticker: true`。账户级 `actions` 对象 **替换**，而不是与通道级对象合并。重复您想要保留的任何操作门。例如，在启用 `work` 贴纸的同时保持禁用反应：

```json5
{
  channels: {
    feishu: {
      actions: { reactions: false },
      accounts: {
        work: {
          actions: { reactions: false, sticker: true },
        },
      },
    },
  },
}
```

首先向该机器人发送贴纸，然后要求其重新发送贴纸。共享`message`工具将`action: "sticker"`与`fileId`中收到的`file_key`或`stickerId`的第一个条目一起使用。在多帐户设置中，请使用收到贴纸的相同 `accountId`。

只能发送该机器人之前收到的贴纸。不支持上传新贴纸、下载贴纸资源、搜索贴纸商店。

### <a id="sticker-keyword-search"></a> 贴纸关键词搜索

添加精选贴纸集，让客服人员通过关键字查找收到的贴纸。首先将每个贴纸发送给机器人并询问其收到的`file_key`。然后将密钥和您自己的标签添加到现有的 Feishu 配置中：

```json5
{
  channels: {
    feishu: {
      actions: { sticker: true },
      stickerSets: {
        cli_work: {
          file_received_key: ["thumbs up", "赞", "👍"],
        },
      },
    },
  },
}
```

将 `cli_work` 替换为机器人的实际应用程序 ID，将 `file_received_key` 替换为该机器人收到的密钥。 `stickerSets` 直接属于 `channels.feishu`，而不是在帐户内。所选账户只能搜索与其应用ID匹配的集合；将帐户更改为不同的机器人不会重复使用之前的机器人集。使用同一机器人的帐户共享其集合。如上所述，保留任何现有的账户级操作关卡。

要求代理“发送一张竖起大拇指的贴纸”。它可以将共享的 `message` 工具与 `action: "sticker-search"`、`query: "thumbs up"` 和预期的 `accountId` 一起使用，然后在同一帐户上发送返回的 `fileId` 和 `action: "sticker"`。仅当启用贴纸且机器人具有非空配置集时，搜索才可用。

搜索按贴纸键顺序匹配显式关键字的不区分大小写的子字符串，包括中文标签和表情符号。它不会推断贴纸的含义、搜索 Feishu 的商店或自动收集收到的贴纸。结果包括匹配的 `keyword` 和可重复使用的 `fileId`。没有匹配项会产生空列表； `truncated: true` 表示匹配条目被结果限制或输出预算忽略。缩小查询范围以查找其他匹配项。

限制：32 个机器人组，每组 256 个贴纸，每个贴纸 1-8 个关键字。存储关键字时不带前导或尾随空格；每个必须非空且最多 64 个 Unicode 字符。文件密钥必须与从 Feishu 收到的密钥完全相同，最多 512 个 Unicode 字符。每个键在其机器人的地图中仅出现一次。查询非空且最多 128 个 Unicode 字符。 `limit` 默认为 5，接受 1 到 10 的整数；搜索结果的上限也为 JSON 输出的 3 KiB。删除集合会将其从搜索中删除；不会创建单独的贴纸数据库或缓存。

### <a id="threads-and-replies"></a> 线程和回复

- ✅ 行内回复
- ✅ 线程回复
- ✅ 回复媒体在回复线程消息时仍保持线程感知

主题组会话路由包含在 [ 组会话范围和主题线程](/channels/feishu/advanced-configuration#group-session-scope-and-topic-threads) 中。
