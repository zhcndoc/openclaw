---
summary: "分析一个或多个 PDF 文档，支持原生提供商模式和提取回退模式"
title: "PDF 工具"
read_when:
  - 你想分析来自代理的 PDF
  - 你需要准确的 PDF 工具参数和限制
  - 你正在调试原生 PDF 模式与提取回退模式
---

`pdf` 会分析一个或多个 PDF 文档并返回文本。

快速行为概述：

- Anthropic 和 Google 模型提供商的原生提供商模式。
- 其他提供商使用提取回退模式（先提取文本，再在需要时提取页面图像）。
- 支持单个（`pdf`）或多个（`pdfs`）输入，单次最多 10 个 PDF。

## 可用性

只有当 OpenClaw 能解析出支持 PDF 的模型配置时，该工具才会被注册：

1. `agents.defaults.pdfModel`
2. 回退到 `agents.defaults.imageModel`
3. 回退到该代理解析后的会话/默认模型
4. 如果原生 PDF 提供商有基于认证的配置，则优先于通用图像回退候选项

如果无法解析出可用模型，`pdf` 工具将不会被暴露。

可用性说明：

- 回退链是感知认证的。只有当 OpenClaw 能为该代理实际认证该提供商时，已配置的 `provider/model` 才算有效。
- 原生 PDF 提供商目前是 **Anthropic** 和 **Google**。
- 如果解析后的会话/默认提供商已经配置了 vision/PDF 模型，PDF 工具会先复用它，然后再回退到其他基于认证的提供商。

## 输入参考

<ParamField path="pdf" type="string">
一个 PDF 路径或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
多个 PDF 路径或 URL，最多总计 10 个。
</ParamField>

<ParamField path="prompt" type="string" default="分析此 PDF 文档。">
分析提示词。
</ParamField>

<ParamField path="pages" type="string">
页面过滤器，例如 `1-5` 或 `1,3,7-9`。
</ParamField>

<ParamField path="model" type="string">
可选的模型覆盖，格式为 `provider/model`。
</ParamField>

<ParamField path="maxBytesMb" type="number">
每个 PDF 的大小上限，单位为 MB。默认值为 `agents.defaults.pdfMaxBytesMb` 或 `10`。
</ParamField>

输入说明：

- `pdf` 与 `pdfs` 会合并并去重后加载。
- 如果未提供任何 PDF 输入，该工具会报错。
- `pages` 按 1 起始页码解析，去重、排序，并限制在配置最大页数内。
- `maxBytesMb` 默认为 `agents.defaults.pdfMaxBytesMb`，若无则为 `10`。

## 支持的 PDF 引用

- 本地文件路径（支持 `~` 目录展开）
- `file://` URL
- `http://` 和 `https://` URL
- OpenClaw 管理的入站引用，例如 `media://inbound/<id>`

引用说明：

- 其他 URI 方案（例如 `ftp://`）会以 `unsupported_pdf_reference` 拒绝。
- 在沙盒模式下，远程 `http(s)` URL 会被拒绝。
- 启用仅工作区文件策略时，允许根目录之外的本地文件路径会被拒绝。
- 在仅工作区文件策略下，允许 OpenClaw 入站媒体存储中的管理入站引用和回放路径。

## 执行模式

### 原生提供商模式

原生模式用于提供商 `anthropic` 和 `google`。
该工具直接向提供商 API 发送原始 PDF 字节。

原生模式限制：

- 不支持 `pages`。如果设置了该参数，工具将返回错误。
- 支持多 PDF 输入；每个 PDF 会在提示词之前以原生文档块 / 内联 PDF 部分发送。

### 提取回退模式

非原生提供商使用回退模式。

流程：

1. 从选定页面提取文本（最多 `agents.defaults.pdfMaxPages`，默认 20 页）。
2. 如果提取文本长度少于 200 字符，则将选定页面渲染为 PNG 图片并包含其中。
3. 将提取内容加提示发送到选定模型。

回退细节：

- 页面图像提取使用的像素预算为 `4,000,000`。
- 如果目标模型不支持图像输入且没有可提取文本，工具会报错。
- 如果文本提取成功，但图像提取在纯文本模型上需要视觉能力，OpenClaw 会丢弃渲染图像并继续使用提取文本。
- 提取回退使用内置的 `document-extract` 插件。该插件负责 `pdfjs-dist`；`@napi-rs/canvas` 仅在图像渲染回退可用时使用。

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

完整字段说明见 [配置参考](/gateway/configuration-reference)。

## 输出详情

工具将文本放在 `content[0].text`，结构化元数据在 `details`。

常见 `details` 字段：

- `model`：解析后的模型引用（`provider/model`）
- `native`：原生提供商模式为 `true`，回退模式为 `false`
- `attempts`：回退过程中失败的尝试次数

路径字段：

- 单个 PDF 输入时为 `details.pdf`
- 多个 PDF 输入时为 `details.pdfs[]`，每项含 `pdf` 条目
- 沙盒路径重写元数据（若适用）：`rewrittenFrom`

## 错误行为

- 缺少 PDF 输入：抛出 `需要 pdf：提供 PDF 文档的路径或 URL`
- PDF 数量过多：`details.error = "too_many_pdfs"` 结构化错误
- 不支持的引用方案：`details.error = "unsupported_pdf_reference"`
- 原生模式带 `pages` 参数：抛出明确错误 `原生 PDF 提供商不支持 pages 参数`

## 示例

单个 PDF：

```json
{
  "pdf": "/tmp/report.pdf",
  "prompt": "用 5 条要点总结该报告"
}
```

多个 PDF：

```json
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "比较两个文档中的风险及时间线变化"
}
```

页面过滤的回退模型：

```json
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5.4-mini",
  "prompt": "仅提取会影响客户的事件"
}
```

## 相关内容

- [Tools Overview](/tools) — 所有可用的代理工具
- [Configuration Reference](/gateway/config-agents#agent-defaults) — pdfMaxBytesMb 和 pdfMaxPages 配置
