---
summary: "为什么生成的图像或 PDF 未传送至聊天"
title: "媒体和附件"
read_when:
  - "技能生成了文件但没有发送任何内容"
---

## <a id="media-and-attachments"></a> 媒体和附件

<AccordionGroup>
  <Accordion id="my-skill-generated-an-image-pdf-but-nothing-was-sent" title="我的技能生成了 image/PDF，但没有发送任何内容">
    来自代理的外发附件必须使用结构化媒体字段，例如 `media`、`mediaUrl`、`path` 或 `filePath`。请参见 [OpenClaw 助手设置](/start/openclaw) 和 [Agent send](/tools/agent-send)。

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还请检查：目标渠道支持外发媒体且未被允许列表阻止；文件在提供方的大小限制内（图片会缩放至最大边 2048px）；`tools.fs.workspaceOnly=true` 会将本地路径发送限制为 workspace、temp/media-store 和沙箱验证文件；`tools.fs.workspaceOnly=false`（默认）允许结构化本地媒体发送使用代理已可读取的主机本地文件，包括媒体以及安全文档类型（图片、音频、视频、PDF、Office 文档，以及经过验证的文本文档，如 Markdown/MD、TXT、JSON、YAML/YML）。这不是秘密扫描器——只要扩展名和内容校验匹配，代理可读取的 `secret.txt` 或 `config.json` 也可以附加。请将敏感文件保留在代理不可读的路径之外，或者保持 `tools.fs.workspaceOnly=true` 以获得更严格的本地路径发送限制。

    参见 [图片](/nodes/images)。

  </Accordion>
</AccordionGroup>
