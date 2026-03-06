---
title: "PDF 工具"
summary: "分析一个或多个 PDF 文档，支持原生提供商并回退到提取模式"
read_when:
  - 你想分析来自代理的 PDF
  - 你需要准确的 PDF 工具参数和限制
  - 你正在调试原生 PDF 模式与提取回退模式
---

# PDF 工具

`pdf` 用于分析一个或多个 PDF 文档并返回文本内容。

快速行为概述：

- Anthropic 和 Google 模型提供商的原生提供商模式。
- 其他提供商使用提取回退模式（先提取文本，再在需要时提取页面图像）。
- 支持单个（`pdf`）或多个（`pdfs`）输入，单次最多 10 个 PDF。

## 可用性

只有当 OpenClaw 能解析出支持 PDF 的模型配置时，该工具才会被注册：

1. `agents.defaults.pdfModel`
2. 回退至 `agents.defaults.imageModel`
3. 基于可用认证尽最大努力选择默认提供商

如果无法解析出可用模型，`pdf` 工具将不会被暴露。

## 输入参考

- `pdf`（`string`）：单个 PDF 文件路径或 URL
- `pdfs`（`string[]`）：多个 PDF 文件路径或 URL，总数最多 10 个
- `prompt`（`string`）：分析提示，默认值为 `Analyze this PDF document.`
- `pages`（`string`）：页面过滤，如 `1-5` 或 `1,3,7-9`
- `model`（`string`）：可选模型覆盖（`provider/model`）
- `maxBytesMb`（`number`）：单个 PDF 最大字节数（MB）

输入说明：

- `pdf` 与 `pdfs` 会合并并去重后加载。
- 如果未提供任何 PDF 输入，该工具会报错。
- `pages` 按 1 起始页码解析，去重、排序，并限制在配置最大页数内。
- `maxBytesMb` 默认为 `agents.defaults.pdfMaxBytesMb`，若无则为 `10`。

## 支持的 PDF 引用

- 本地文件路径（支持 `~` 目录展开）
- `file://` URL
- `http://` 和 `https://` URL

引用说明：

- 其他 URI 方案（如 `ftp://`）会被拒绝并返回 `unsupported_pdf_reference`。
- 沙盒模式下，远程 `http(s)` URL 会被拒绝。
- 启用仅工作区文件策略时，工作区根目录外的本地文件路径会被拒绝。

## 执行模式

### 原生提供商模式

原生模式用于提供商 `anthropic` 和 `google`。
该工具直接向提供商 API 发送原始 PDF 字节。

原生模式限制：

- 不支持 `pages` 参数。如果设置，工具会返回错误。

### 提取回退模式

非原生提供商使用回退模式。

流程：

1. 从选定页面提取文本（最多 `agents.defaults.pdfMaxPages`，默认 20 页）。
2. 如果提取文本长度少于 200 字符，则渲染选定页面为 PNG 图片并包含其中。
3. 将提取内容加提示发送到选定模型。

回退细节：

- 页面图片提取使用 4,000,000 像素预算。
- 如果目标模型不支持图片输入，且无可提取文本，工具会报错。
- 回退模式需依赖 `pdfjs-dist`（渲染图片时还需 `@napi-rs/canvas`）。

## 配置

```json5
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
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

- 缺少 PDF 输入：抛出 `pdf required: provide a path or URL to a PDF document`
- PDF 数量过多：`details.error = "too_many_pdfs"` 结构化错误
- 不支持的引用方案：`details.error = "unsupported_pdf_reference"`
- 原生模式带 `pages` 参数：抛出明确错误 `pages is not supported with native PDF providers`

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
  "model": "openai/gpt-5-mini",
  "prompt": "仅提取客户影响相关事件"
}
```
