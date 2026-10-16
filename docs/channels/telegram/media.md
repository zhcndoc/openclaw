---
summary: "相册、语音笔记、视频笔记、地点、地点和贴纸"
read_when:
  - "将多张照片作为一张 Telegram 相册发送"
  - "发送语音注释、视频注释、位置或地点"
  - "启用贴纸发送和贴纸搜索"
title: "Telegram 媒体和附件"
sidebarTitle: "媒体和附件"
---

除了文本之外，OpenClaw 还可以向 Telegram 发送什么内容，以及入站媒体如何到达代理。

## <a id="media-and-attachments"></a> 媒体和附件

<AccordionGroup>
  <Accordion id="photo-albums-audio-video-and-stickers" title="相册、音频、视频和贴纸">
    ### <a id="photo-albums"></a> 相册

    在一次 `message` 工具调用中发送多个图像附件。 OpenClaw 将连续照片按原始顺序分组到最多包含 10 张图像的 Telegram 相册中。多张照片的自动回复使用相同的分组。单独发送一张照片，包括最后一张照片的剩余部分。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  message: "Trip photos",
  attachments: [
    { type: "image", media: "https://example.com/photo-1.jpg" },
    { type: "image", media: "https://example.com/photo-2.jpg" },
  ],
}
```

    标题出现在第一张照片上。超出标题限制的文本会作为单独的消息出现在相册后面。作为文档发送的照片、其他媒体类型以及带有内嵌按钮的消息会保持单独的发送，以便保留其现有的控件和传递行为。

    媒体标题使用 Telegram HTML 而不是丰富的消息块。丰富列表变成单独的标记行（包括嵌套列表和复选框），旁白变成块引用。 HTML 复选框输入类型不区分大小写。字幕编辑使用相同的渲染；纯文本重试保留可见文本，而不根据标题限制计算格式标记。代码示例保留其文字标签。

    ### <a id="audio-messages"></a> 音频消息

    Telegram 区分语音消息和音频文件。默认：音频文件行为；在代理回复中添加标签 `[[audio_as_voice]]` 可强制按语音消息发送。传入的语音消息转写在代理上下文中会被视为机器生成的、不可信的文本，但实体检测仍会使用原始转写，因此基于 mention 的语音消息仍然可以正常工作。

    安装 `ffprobe` 时，OpenClaw 包含 OGG/Opus、MP3 和 M4A 上传的持续时间，以便 Telegram 可以正确显示。如果持续时间探测失败，上传仍会继续进行，而无需持续时间元数据。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/voice.ogg",
  asVoice: true,
}
```

    ### <a id="video-messages"></a> 视频消息

    Telegram 区分视频文件和视频消息（video note）。视频消息不支持 caption；提供的消息文本会单独发送。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  media: "https://example.com/video.mp4",
  asVideoNote: true,
}
```

    ### <a id="locations-and-venues"></a> 位置和场所

    使用现有的 `send` 动作，并提供一个独立的 `location` 对象。坐标会发送原生位置标记；同时添加 `name` 和 `address` 会发送原生场所卡片。位置发送不能与消息文本或媒体组合使用。

```json5
{
  action: "send",
  channel: "telegram",
  to: "123456789",
  location: {
    latitude: 48.858844,
    longitude: 2.294351,
    accuracy: 12,
    name: "Eiffel Tower",
    address: "Champ de Mars, Paris",
  },
}
```

    ### <a id="stickers"></a> 贴纸

    入站：下载并处理静态 WEBP（占位符 `<media:sticker>`）。当贴纸媒体不可用时，包括动画 TGS 和视频 WEBM，OpenClaw 使用贴纸的表情符号作为消息文本。如果没有可用的表情符号，则使用 `<media:sticker>`。缓存的描述优先于此后备。

    贴纸上下文字段：`Sticker.emoji`、`Sticker.setName`、`Sticker.fileId`、`Sticker.fileUniqueId`、`Sticker.cachedDescription`。描述会缓存在 OpenClaw SQLite 插件状态中，以减少重复的视觉调用。

    贴纸描述在共享自动图像模型选择之前使用配置的 `agents.defaults.imageModel`，包括提供商的 MiniMax 图像路由。标签描述使用一种选定的模型，如果该模型失败，则不会尝试配置的后备列表。失败的描述不会被缓存；一般媒体分析仍然可以通过其正常的后备处理单独运行。

    启用贴纸动作：

```json5
{
  channels: {
    telegram: {
      actions: {
        sticker: true,
      },
    },
  },
}
```

    发送：

```json5
{
  action: "sticker",
  channel: "telegram",
  to: "123456789",
  fileId: "CAACAgIAAxkBAAI...",
}
```

    搜索缓存贴纸：

```json5
{
  action: "sticker-search",
  channel: "telegram",
  query: "cat waving",
  limit: 5,
}
```

  </Accordion>
</AccordionGroup>
