---
summary: "iMessage 附件摄取、出站暂存、文本分块和交付目标格式"
read_when:
  - "启用入站附件"
  - "调整出站文本分块"
  - "选择发送的寻址格式"
title: "iMessage 媒体和附件"
sidebarTitle: "媒体和附件"
---

附件如何移入和移出、出站文本如何分块以及 iMessage 接受哪些传送目标。

## <a id="media%2C-chunking%2C-and-delivery-targets"></a><a id="media-chunking-and-delivery-targets"></a> 媒体、分块和投递目标

<AccordionGroup>
  <Accordion id="attachments-and-media" title="附件和媒体">
    - 入站附件摄取默认为 **off** — 设置 `channels.imessage.includeAttachments: true` 将照片、语音备忘录、视频和其他附件转发到代理。禁用它后，仅附件的 iMessage 在到达代理之前会被删除，并且可能根本不会生成 `Inbound message` 日志行。
    - 设置 `remoteHost` 后，可通过 SCP 获取远程入站附件路径
    - 出站文件会暂存到已配置或自动检测到的 Messages Mac 上一个仅所有者可访问的临时路径中，通过该远程路径传递给 `imsg`，并在成功、失败或超时后尽力清理；清理失败会发出警告，并可能留下仅所有者可访问的残留文件
    - 附件路径必须匹配允许的根路径：
      - `channels.imessage.attachmentRoots`（本地）
      - `channels.imessage.remoteAttachmentRoots`（远程 SCP 模式）
      - 已配置的根路径会扩展默认根路径模式 `/Users/*/Library/Messages/Attachments`（合并而非替换）
    - SCP 使用严格的主机密钥检查（`StrictHostKeyChecking=yes`）
    - 出站媒体大小使用 `channels.imessage.mediaMaxMb`（默认 16 MB）

  </Accordion>

  <Accordion id="outbound-text-and-chunking" title="出站文本和分块">
    - 文本分块限制：`channels.imessage.textChunkLimit`（默认 4000）
    - 分块模式：`channels.imessage.streaming.chunkMode`
      - `length`（默认）
      - `newline`（优先按段落拆分）
    - 出站标记 bold/italic/underline/strikethrough 转换为本机样式文本（macOS 15+ 收件人呈现样式；较早的收件人看到没有标记的纯文本）；降价表按通道降价表模式进行转换
    - `channels.imessage.sendTransport`（默认 `auto`，可选 `bridge`、`applescript`）用于选择 `imsg` 的发送投递方式

  </Accordion>

  <Accordion id="addressing-formats" title="寻址格式">
    推荐的显式目标：

    - `chat_id:123`（推荐用于稳定路由）
    - `chat_guid:...`
    - `chat_identifier:...`

    还支持直接句柄：

    - `+1555...`
    - `tel:+1555...`
    - `imessage:+1555...`
    - `sms:+1555...`
    - `user@example.com`

    使用联系人姓名或混合字母数字别名的服务限定目标：

    - `auto:<contact>` 让消息选择 iMessage 或 SMS
    - `imessage:<contact>` 需要 iMessage
    - `sms:<contact>` 需要 SMS

    纯联系人姓名和混合字母数字别名将被拒绝，而不是转换为电话号码。如果现有自动化使用其中之一，请添加 `auto:`、`imessage:` 或 `sms:` 以使预期的交付服务明确。

    ```bash
    imsg chats --limit 20
    ```

  </Accordion>
</AccordionGroup>
