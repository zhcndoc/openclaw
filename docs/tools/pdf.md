---
summary: "使用原生提供方支持和提取回退分析一个或多个 PDF 文档"
title: "PDF 工具"
read_when:
  - 你想从代理分析 PDF
  - 你需要精确的 PDF 工具参数和限制
  - 你正在调试原生 PDF 模式与提取回退
---

`pdf` 会分析一个或多个 PDF 文档并返回文本。

快速行为：

- 对 Anthropic 和 Google 模型提供方使用原生提供方模式。
- 对其他提供方使用提取回退模式（先提取文本，必要时再提取页面图像）。
- 支持单个（`pdf`）或多个（`pdfs`）输入，每次调用最多 10 个 PDF。

## 可用性

仅当 OpenClaw 能为代理解析出支持 PDF 的模型配置时，才会注册该工具：

1. `agents.defaults.pdfModel`
2. 回退到 `agents.defaults.imageModel`
3. 回退到代理解析后的会话/默认模型
4. 如果原生 PDF 提供方是基于认证的，则优先于通用图像回退候选项

如果无法解析出可用模型，则不会暴露 `pdf` 工具。

可用性说明：

- 回退链是感知认证状态的。只有当 OpenClaw 能为代理实际认证该提供方时，配置的 `provider/model` 才算有效。
- 当前支持原生 PDF 的提供方是 **Anthropic** 和 **Google**。
- 如果解析后的会话/默认提供方已经配置了可视化/PDF 模型，PDF 工具会先复用它，然后再回退到其他基于认证的提供方。

## 输入参考

<ParamField path="pdf" type="string">
一个 PDF 路径或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
多个 PDF 路径或 URL，最多总计 10 个。
</ParamField>

<ParamField path="prompt" type="string" default="Analyze this PDF document.">
分析提示。
</ParamField>

<ParamField path="pages" type="string">
页面过滤器，如 `1-5` 或 `1,3,7-9`。
</ParamField>

<ParamField path="password" type="string">
加密 PDF 在提取回退模式下的密码。
</ParamField>

<ParamField path="model" type="string">
可选的模型覆盖，格式为 `provider/model`。
</ParamField>

<ParamField path="maxBytesMb" type="number">
每个 PDF 的大小上限，单位 MB。默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。
</ParamField>

输入说明：

- `pdf` 和 `pdfs` 会在加载前合并并去重。
- 如果未提供 PDF 输入，工具会报错。
- `pages` 会按从 1 开始的页码解析、去重、排序，并裁剪到配置的最大页数。
- `password` 会应用于请求中的每个 PDF，并且仅用于提取回退模式。
- `maxBytesMb` 默认为 `agents.defaults.pdfMaxBytesMb` 或 `10`。

## 支持的 PDF 引用

- 本地文件路径（包括 `~` 展开）
- `file://` URL
- `http://` 和 `https://` URL
- OpenClaw 管理的入站引用，例如 `media://inbound/<id>`

引用说明：

- 其他 URI 方案（例如 `ftp://`）会被拒绝，并返回 `unsupported_pdf_reference`。
- 在沙箱模式下，远程 `http(s)` URL 会被拒绝。
- 启用仅工作区文件策略时，工作区允许根目录之外的本地文件路径会被拒绝。
- 在仅工作区文件策略下，OpenClaw 的入站媒体存储中的受管入站引用和回放路径是允许的。

## 执行模式

### 原生提供方模式

原生模式用于提供方 `anthropic` 和 `google`。
该工具会将原始 PDF 字节直接发送到提供方 API。

原生模式限制：

- `pages` 不受支持。如果设置了该参数，工具会返回错误。
- `password` 不受支持。请使用非原生模型来分析加密 PDF。
- 支持多 PDF 输入；每个 PDF 会在提示前作为原生文档块 /
  内联 PDF 部分发送。

### 提取回退模式

回退模式用于非原生提供方。

流程：

1. 从选定页面提取文本（最多到 `agents.defaults.pdfMaxPages`，默认 `20`）。
2. 如果提取出的文本长度少于 `200` 个字符，则将选定页面渲染为 PNG 图像并一并包含。
3. 将提取内容和提示发送给选定模型。

回退细节：

- 页面图像提取使用 `4,000,000` 的像素预算。
- 加密 PDF 可以使用顶层 `password` 参数打开。
- 如果目标模型不支持图像输入且没有可提取文本，工具会报错。
- 如果文本提取成功，但图像提取在仅文本模型上需要视觉能力，OpenClaw 会丢弃渲染图像并继续使用提取文本。
- 提取回退使用内置的 `document-extract` 插件。该插件拥有 `clawpdf`，它通过 PDFium WebAssembly 提供文本提取和图像渲染。

## 配置

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5.4-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}
```

有关完整字段详情，请参见[配置参考](/gateway/configuration-reference)。

## 输出详情

该工具会在 `content[0].text` 中返回文本，并在 `details` 中返回结构化元数据。

常见 `details` 字段：

- `model`：解析后的模型引用（`provider/model`）
- `native`：原生提供方模式为 `true`，回退模式为 `false`
- `attempts`：成功前失败的回退尝试次数

路径字段：

- 单个 PDF 输入：`details.pdf`
- 多个 PDF 输入：`details.pdfs[]`，其中包含 `pdf` 条目
- 沙箱路径重写元数据（如适用）：`rewrittenFrom`

## 错误行为

- 缺少 PDF 输入：抛出 `pdf required: provide a path or URL to a PDF document`
- PDF 过多：在 `details.error = "too_many_pdfs"` 中返回结构化错误
- 不支持的引用方案：返回 `details.error = "unsupported_pdf_reference"`
- 原生模式下使用 `pages`：抛出明确的 `pages is not supported with native PDF providers` 错误

## 示例

单个 PDF：

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "用 5 个要点总结这份报告"
}
```

多个 PDF：

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "比较两份文档中的风险和时间线变化"
}
```

按页面过滤的回退模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "仅提取对客户有影响的事件"
}
```

加密 PDF 的提取回退：

```json
{
  "pdf": "/tmp/locked.pdf",
  "password": "example-password",
  "model": "openai/gpt-5.4-mini",
  "prompt": "总结这份合同"
}
```

## 相关内容

- [工具概览](/tools) - 所有可用的代理工具
- [配置参考](/gateway/config-agents#agent-defaults) - `pdfMaxBytesMb` 和 `pdfMaxPages` 配置
