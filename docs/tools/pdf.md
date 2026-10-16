---
summary: "使用原生提供方支持和提取回退分析一个或多个 PDF 文档"
title: "PDF 工具"
read_when:
  - "您想要分析来自代理的 PDF"
  - "您需要准确的 pdf 工具参数和限制"
  - "你正在调试原生 PDF 模式与提取回退"
---

`pdf` 分析一个或多个 PDF 文档并返回文本。它在 Anthropic 和 Google 模型上使用本机文档输入，并回退到每个其他提供商的 text/image 提取。

## <a id="availability"></a> 可用性

代理可以在自动模型选择完成之前注册该工具。执行时，模型解析遵循以下顺序：

1. `agents.defaults.pdfModel`（显式 primary/fallbacks）
2. `agents.defaults.imageModel`（显式 primary/fallbacks）
3. 来自默认模型提供商的 A 视觉模型，如果该提供商支持本机 PDF 输入（Anthropic、Google）
4. 具有可用身份验证的自动候选者：首先是本机 PDF 提供程序，然后是 image/vision-capable 提供程序以及声明 PDF 文本提取支持的提供程序。默认提供程序声明的文本提取模型优先于通用图像候选。
5. 活动会话模型，如果没有早期候选者解析，则它支持图像，其提供者具有可用的身份验证，并且其提供者不会禁用PDF图像提取（`documentModels.pdf.image: false`）。这包括具有视觉功能的 OpenRouter 模型，无需单独的 `pdfModel` 或 `imageModel` 配置。

自动候选人在选择之前会经过身份验证。显式 PDF/image 设置保留其配置的优先级并在执行时进行身份验证。如果延迟解析找不到可用模型，则在打开 PDF 之前调用会失败并显示 `No PDF model configured.`。

PDF 分析使用所选模型的已配置提供商凭据或连接的帐户。它不需要单独的 PDF API 密钥。

## <a id="input-reference"></a> 输入参考

<ParamField path="pdf" type="string">
一个 PDF 路径或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
多个 PDF 路径或 URL，总共最多 10 个。
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
分析提示。
</ParamField>

<ParamField path="pages" type="string">
页面筛选，例如 `1-5` 或 `1,3,7-9`。原生提供方模式不支持。
</ParamField>

<ParamField path="password" type="string">
加密 PDF 的密码。适用于请求中的每个 PDF；仅由提取回退模式使用。
</ParamField>

<ParamField path="model" type="string">
可选的模型覆盖，格式为 `provider/model`。
</ParamField>

<ParamField path="maxBytesMb" type="number">
每个 PDF 的大小上限，单位为 MB。默认值为 `agents.defaults.pdfMaxMb`，如果未设置则为 `10`。
</ParamField>

注意：

- `pdf` 和 `pdfs` 在加载前会合并并去重；至少需要提供一个。
- `pages` 被解析为从 1 开始的页码，进行重复数据删除和排序。 `agents.defaults.pdfMaxPages`（默认`20`）限制所选页面的数量，而不是其页码；如果缩短较大的选择，则 PDF 模型和调用模型都会收到部分文档通知。

## <a id="supported-pdf-references"></a> 支持的 PDF 引用

- 本地文件路径（包括 `~` 展开）
- `file://` URL
- `http://` 和 `https://` URL
- OpenClaw- 托管入站引用，例如 `media://inbound/<id>`

其他 URI 方案（例如 `ftp://`）返回 `details.error = "unsupported_pdf_reference"`。当该工具在沙盒中运行时，远程 `http(s)` URL 将被拒绝。启用仅工作区文件策略后，允许的根目录之外的本地路径将被拒绝；仍然允许 OpenClaw 的入站媒体存储下的托管入站引用和重播路径。

不支持 `data:` URL。识别为其他文档类型（例如纯文本或 JSON）的文件在模型调度之前会被拒绝。

相对路径从任务的工作目录解析，包括选定的 Git 工作树。本地读取使用会话批准的文件系统根；参见 [ 本地媒体文件](/tools/media-overview#local-media-files)。

## <a id="execution-modes"></a> 执行模式

### <a id="native-provider-mode"></a> 原生提供方模式

用于提供程序 `anthropic` 和 `google`（当前声明本机 PDF 文档支持的唯一提供程序）。原始 PDF 字节直接发送到提供者 API 作为每个文件的本机 document/inline-PDF 部分。

限制：

- 不支持 `pages`；如果设置了该项，工具会抛出 `pages is not supported with native PDF providers`。
- 不支持`password`；如果设置，该工具将抛出 `password is not supported with native PDF providers`。对加密的 PDF 使用非本机模型。

### <a id="extraction-fallback-mode"></a> 提取回退模式

用于其他所有提供方。

1. 通过捆绑的 `document-extract` 插件从选定页面（最多 `agents.defaults.pdfMaxPages`，默认 `20`）中提取文本，该插件使用 `clawpdf` 包 （PDFium WebAssembly） 进行文本和图像提取。
2. 对于提取文本的字符数少于 `200` 的每个选定页面，将该页面渲染为 PNG 图像。文本丰富的页面不会抑制其他选定页面的图像回退。渲染预算总计为 `4,000,000` 像素，在需要图像的所有页面之间共享（按剩余页面而不是每个页面按比例分配），因此已经具有足够文本的文本页面完全跳过渲染。
3. 将提取的文本（以及任何渲染出的图像）和提示一起发送给所选模型。

详情：

- 本地提取在可重用工作线程中运行，因此 PDF 文本和图像处理不会阻塞网关。取消代理运行会停止排队或主动提取。
- 使用顶级 `password` 参数打开加密的 PDF。
- 如果模型不支持图像输入且没有可提取文本，工具会报错。
- 如果图像渲染失败，OpenClaw 会丢弃图像并继续使用提取出的文本。
- 如果目标模型仅支持文本，而提取过程产生了图像，OpenClaw 会丢弃图像并仅发送文本。
- 如果页面、文本或图像限制导致提取部分，OpenClaw 在分析上下文和工具结果中包含一个简短的部分文档通知。

## <a id="config"></a> 配置

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      pdfMaxMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

| 键                           | 默认值 | 含义                                                                                   |
| ----------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `agents.defaults.pdfModel`    | 未设置   | 显式primary/fallback PDF模型；回退到 `imageModel`，然后是会话模型。 |
| `agents.defaults.pdfMaxMb`    | `10`    | 单个 PDF 的大小上限（MB）。                                                                   |
| `agents.defaults.pdfMaxPages` | `20`    | 每个 PDF 处理的最大页数。                                                              |

有关完整字段详细信息，请参阅 [ 配置 Reference](/gateway/config-agents#agent-defaults)。

## <a id="output-details"></a> 输出详情

该工具返回 `content[0].text` 和 `details.text` 中的分析，因此 [Code Mode](/tools/code-mode) 和 [Tool Search](/tools/tool-search) 可以读取相同的结果。

常见 `details` 字段：

- `text`：分析文本
- `model`：解析后的模型引用（`provider/model`）
- `native`：原生提供方模式为 `true`，回退模式为 `false`
- `attempts`：成功前失败的回退尝试次数

路径字段：

- 单个 PDF 输入：`details.pdf`
- 多个 PDF 输入：`details.pdfs[]`，其中包含 `pdf` 条目
- 沙箱路径重写元数据（适用时）：`rewrittenFrom`

## <a id="error-behavior"></a> 错误行为

| 条件                         | 结果                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| 没有 PDF 输入                      | 抛出 `pdf required: provide a path or URL to a PDF document` |
| 超过 10 个 PDF                 | `details.error = "too_many_pdfs"`                              |
| 不支持的引用方案      | `details.error = "unsupported_pdf_reference"`                  |
| 使用原生提供程序时传入 `pages`    | 抛出 `pages is not supported with native PDF providers`      |
| 使用原生提供程序时传入 `password` | 抛出 `password is not supported with native PDF providers`   |

## <a id="examples"></a> 示例

单个 PDF：

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}
```

按页面过滤的回退模型：

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}
```

页面过滤后备模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Extract only customer-impacting incidents"
}
```

加密 PDF 的提取回退：

```json
{
  "pdf": "/tmp/locked.pdf",
  "password": "example-password",
  "model": "openai/gpt-5.4-mini",
  "prompt": "Summarize this contract"
}
```

## <a id="related"></a> 相关内容

- [Tools Overview](/tools) - 所有可用的代理工具。
- [配置 Reference](/gateway/config-agents#agent-defaults) - `pdfMaxMb` 和 `pdfMaxPages` 配置
