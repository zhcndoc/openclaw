---
summary: "音频剪辑、入站文件处理、分块和交付目标"
read_when:
  - "发送语音片段或文件到Slack中的OpenClaw"
  - "提高或降低 Slack 介质尺寸上限"
  - "调试被跳过的 Slack 附件"
title: "Slack 媒体和附件"
sidebarTitle: "媒体和附件"
---

Slack 文件如何到达代理轮次，以及 OpenClaw 如何发回文本和媒体。

## <a id="voice-input"></a> 语音输入

今天要在 Slack 中与 OpenClaw 通话，请将 Slack 音频剪辑发送到 OpenClaw 应用程序。 Slackbot 的听写麦克风是一个单独的 Slack- 拥有的功能，而不是应用程序 API。

- **[Slackbot 语音听写](https://slack.com/help/articles/202026038-How-to-use-Slackbot)** 存在于用户的私人 Slackbot 对话中。 Slack 将录音转换为 Slackbot 提示，但不会通过事件 API 向第三方 Slack 应用程序发出音频文件、听写事件、提示或输入源标记。 OpenClaw Slack 插件无法启用或接收它。
- **[Slack 音频剪辑](https://slack.com/help/articles/4406235165587-Record-audio-and-video-clips-in-Slack)** 是可存储的 Slack 文件，可以发布到 OpenClaw 的 DM、频道或线程中。OpenClaw 会使用 bot token 下载可访问的剪辑，规范化 Slack 剪辑的 MIME 元数据，并通过共享的 [音频转录管道](/nodes/audio) 发送它。推荐的应用清单包含所需的 `files:read` 范围。

音频剪辑和 Slackbot 听写具有不同的隐私语义：剪辑遵循 Slack 文件保留策略，OpenClaw 会下载它们用于转录，而 Slack 说明听写音频不会被存储。

在启用 `requireMention: true` 的频道中，无需字幕的音频剪辑可以通过说出已配置的提及模式（`agents.entries.*.groupChat.mentionPatterns`，回退到 `messages.groupChat.mentionPatterns`）来满足门槛。OpenClaw 会在下载或转录剪辑之前对发送者进行授权，然后仅当转录内容匹配时才允许通过。失败或不匹配的推测性转录会与下载的剪辑一起被丢弃；它不会保留在频道历史中。无法从语音中推断出原生 Slack `@bot` 身份，因此请配置一个口述名称模式或包含一个手动输入的提及。如果启用了转录回显，则回显仅会在通过准入后发送。

## <a id="media%2C-chunking%2C-and-delivery"></a><a id="media-chunking-and-delivery"></a> 媒体、分块与投递

<AccordionGroup>
  <Accordion id="inbound-attachments" title="入站附件">
    Slack 文件附件从 Slack- 托管的私有 URL（令牌验证的请求流）下载，并在获取成功且大小限制允许时写入媒体存储。文件占位符包括 Slack `fileId`，因此代理可以使用 `download-file` 获取原始文件。

    下载会使用有界的空闲超时和总超时。如果 Slack 文件检索卡住或失败，OpenClaw 会继续处理消息，并回退到文件占位符。

    运行时入站大小上限默认是 `20MB`，除非被 `channels.slack.mediaMaxMb` 覆盖。

  </Accordion>

  <Accordion id="outbound-text-and-files" title="出站文本和文件">
    - 文本分块使用 `channels.slack.textChunkLimit`（默认 `8000`，并受 Slack 自身消息长度限制上限约束）
    - `channels.slack.streaming.chunkMode="newline"` 启用先按段落拆分
    - file 使用 Slack 上传 API 发送，并且可以包含线程回复 （`thread_ts`）
    - long 文件标题使用第一个 Slack-safe 文本块作为上传注释，并将剩余块作为后续消息发送
    - 文本和上下文块保留跨节边界的代码格式和文字反斜杠
    - 配置时，出站媒体上限遵循`channels.slack.mediaMaxMb`；否则通道发送使用媒体管道中的 MIME-kind 默认值

    本机块工具包部分保留所有字段，即使它们的组合辅助功能文本超出了首选文本块大小。 Slack 的块限制和 40,000 字符消息文本硬限制仍然适用。

  </Accordion>

  <Accordion id="delivery-targets" title="交付目标">
    推荐的显式目标：

    - `user:<id>` 用于 DMs
    - `channel:<id>` 用于频道

    Text/block-only Slack DM可以直接发帖到用户ID；文件上传和线程发送首先通过 Slack 对话 API 打开 DM，因为这些路径需要具体的对话 ID。

  </Accordion>
</AccordionGroup>

## <a id="attachment-media-reference"></a> 附件媒体参考

当 Slack 文件下载成功且大小限制允许时，Slack 可以将下载的媒体附加到代理轮次中。音频片段可以被转写，图像文件可以通过媒体理解路径处理，或直接传递给支持视觉的回复模型，而其他文件仍可作为可下载的文件上下文使用。

### <a id="downloading-an-attachment-by-file-id"></a> 按文件下载附件 ID

`message` 工具的 `download-file` 操作需要消息或文件占位符中的 Slack `fileId`。它使用当前的 Slack 通道，除非您提供显式的 `channelId`。显式 `threadId` 还要求在该线程中共享文件；环境对话线程不会缩小仅限频道的下载范围。

OpenClaw 在下载之前检查频道的现有访问策略和新的 `files.info` 共享证据。如果 Slack 刷新过期的下载 URL，它会重复文件共享检查。经过验证的官方 npm 和 ClawHub 安装使用与捆绑的 Slack 插件相同的提供商检查。

允许的下载会返回现有的本地媒体工件。图像还返回配置的图像尺寸限制内的图像内容。配置的读取凭据、Slack/GovSlack 主机限制、HTTPS 和重定向检查以及 `channels.slack.mediaMaxMb` 大小上限继续适用。对于代理下载，取消或撤销的读取无法返回已接受的工件； cleanup 删除自己新创建的文件，同时保留先前存在的或替换的文件。

### <a id="supported-media-types"></a> 支持的媒体类型

| 媒体类型                     | 来源               | 当前行为                                                                  | 笔记                                                                     |
| ------------------------------ | -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Slack 音频片段              | Slack 文件 URL       | 下载后通过共享音频转写流程路由处理                          | 需要 `files:read` 权限以及可正常工作的 `tools.media.audio` 模型或 CLI      |
| JPEG / PNG / GIF / WebP 图像 | Slack 文件 URL       | 下载后附加到该轮次中，以便进行支持视觉的处理                   | 单文件上限：`channels.slack.mediaMaxMb`（默认 20 MB）                 |
| PDF 文件                      | Slack 文件 URL       | 下载并公开为 `download-file` 或 `pdf` 等工具的文件上下文 | Slack 入站不会自动将 PDF 转换为图像视觉输入 |
| 其他文件                    | Slack 文件 URL       | 尽可能下载，并作为文件上下文暴露                              | 二进制文件不会被视为图像输入                               |
| 线程回复                 | 线程起始文件 | 当回复没有直接媒体时，可将根消息文件作为上下文注入  | 仅包含文件的起始消息会使用附件占位符                          |
| 多文件消息            | 多个 Slack 文件 | 每个文件都会被独立评估                                              | Slack 处理每条消息最多支持八个文件                     |

### <a id="inbound-pipeline"></a> 入站管道

当带有文件附件的 Slack 消息到达时：

1. OpenClaw 使用 bot token 从 Slack 的私有 URL 下载文件。
2. 下载成功后，文件会写入媒体存储。
3. 下载后的媒体路径和内容类型会添加到入站上下文中。
4. 音频剪辑被路由到共享转录管道；支持图像的 model/tool 路径可以使用来自同一上下文的图像附件。
5. 其他文件仍可作为文件元数据或媒体引用供能够处理它们的工具使用。

### <a id="thread-root-attachment-inheritance"></a> 线程根附件继承

当消息在某个线程中到达（具有 `thread_ts` 父级）时：

- 如果回复本身没有直接媒体，而包含的根消息有文件，则 Slack 可以将根文件作为线程起始上下文注入。
- 只有在初始化新的或重置后的线程会话时，才会注入根文件。后续仅文本回复会复用现有会话上下文，不会将根文件重新附加为新的媒体。
- 直接回复附件的优先级高于根消息附件。
- 仅包含文件而没有文本的根消息会以附件占位符表示，以便回退逻辑仍可包含其文件。

### <a id="multi-attachment-handling"></a> 多附件处理

当单条 Slack 消息包含多个文件附件时：

- 每个附件都会通过媒体管道独立处理。
- 下载后的媒体引用会聚合到消息上下文中。
- 处理顺序遵循事件负载中 Slack 文件的顺序。
- 某个附件下载失败不会阻止其他附件处理。
- 失败或阻止的文件由于有限的原因保留在代理上下文中，并且每个失败的文件在任何 URL 刷新重试后都会生成一个警告。
- 不下载超过八个文件限制的文件。他们的参考文献带有 `omitted: 8-file limit` 原因。长的不可用文件列表明显被截断，而通知保留不可用附件总数。

### <a id="size%2C-download%2C-and-model-limits"></a><a id="size-download-and-model-limits"></a> 大小、下载与模型限制

- **大小上限**：默认每个文件 20 MB。可通过 `channels.slack.mediaMaxMb` 配置。
- **音频转写上限**：当下载的文件发送到转写提供方或 CLI 时，也会应用所选支持音频的 `tools.media.models[]` 条目的 `maxBytes`。
- **下载失败**：Slack无法提供的文件、过期的URL、无法访问的文件、超大文件和Slack auth/login HTML响应将被跳过，而不是被报告为不支持的格式。
- **视觉模型**：如果当前回复模型支持视觉，则图像分析使用该模型；否则使用 `agents.defaults.imageModel` 中配置的图像模型。

### <a id="known-limits"></a> 已知限制

| 场景                                      | 当前行为                                                                   | 解决方法                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 过期的 Slack 文件 URL                        | 文件被跳过；不显示错误                                                       | 在 Slack 中重新上传该文件                                                   |
| 音频转写不可用               | 片段仍会附加，但不会生成转写                                | 配置 `tools.media.audio` 或安装受支持的本地转写 CLI  |
| 无字幕片段未通过提及门控 | 在私有的推测性转写后被丢弃；转写内容和下载内容都会被丢弃 | 配置口头姓名提及模式、添加已输入的 bot 提及，或使用 DM |
| 未配置视觉模型                   | 图像附件会作为媒体引用存储，但不会作为图像进行分析       | 配置 `agents.defaults.imageModel` 或使用支持视觉的回复模型    |
| 非常大的图像（默认 > 20 MB）        | 根据大小上限被跳过                                                               | 如果 Slack 允许，可增大 `channels.slack.mediaMaxMb`                          |
| Forwarded/shared 附件                  | 文本和 Slack- 托管的 image/file 媒体均尽力而为                             | 直接在OpenClaw帖子里重新分享                                      |
| PDF 附件                               | 存储为 file/media 上下文，不会通过图像视觉自动路由        | 使用 `download-file` 进行文件元数据或使用 `pdf` 工具进行 PDF 分析      |

### <a id="related-documentation"></a> 相关文档

- [媒体理解管道](/nodes/media-understanding)
- [音频和语音笔记](/nodes/audio)
- [PDF 工具](/tools/pdf)
