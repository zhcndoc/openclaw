---
summary: "使用原生提供方支持和提取回退分析一个或多个 PDF 文档"
title: "PDF 工具"
read_when:
  - 你想从代理分析 PDF
  - 你需要精确的 PDF 工具参数和限制
  - 你正在调试原生 PDF 模式与提取回退
---

`pdf` 会分析一个或多个 PDF 文档并返回文本。它在 Anthropic 和 Google 模型上使用原生文档输入，而对其他所有提供方则回退到文本/图像提取。

## 可用性

该工具仅在 OpenClaw 能为该代理解析出一个支持 PDF 的模型时才会注册。解析顺序：

1. `agents.defaults.pdfModel`（显式主模型/回退模型）
2. `agents.defaults.imageModel`（显式主模型/回退模型）
3. 该代理已解析的会话/默认模型，如果其提供方支持原生 PDF 输入（Anthropic、Google），或已经配置了视觉模型
4. 自动检测到的、带有可用认证信息的图像/视觉能力提供方，优先选择支持原生 PDF 的提供方

每个回退候选在使用前都会进行认证检查，因此，已配置的 `provider/model` 只有在 OpenClaw 能为该代理对该提供方完成认证时才算有效。如果没有解析出可用模型，则不会暴露 `pdf` 工具。

## 输入参考

<ParamField path="pdf" type="string">
一个 PDF 路径或 URL。
</ParamField>

<ParamField path="pdfs" type="string[]">
多个 PDF 路径或 URL，最多总计 10 个。
</ParamField>

<ParamField path="prompt" type="string" default="分析此 PDF 文档。">
分析提示。
</ParamField>

<ParamField path="pages" type="string">
页面筛选，例如 `1-5` 或 `1,3,7-9`。原生提供方模式不支持。
</ParamField>

<ParamField path="password" type="string">
加密 PDF 的密码。适用于请求中的每个 PDF；仅在提取回退模式中使用。
</ParamField>

<ParamField path="model" type="string">
可选的模型覆盖，格式为 `provider/model`。
</ParamField>

<ParamField path="maxBytesMb" type="number">
每个 PDF 的大小上限，单位为 MB。默认值为 `agents.defaults.pdfMaxMb`，如果未设置则为 `10`。
</ParamField>

备注：

- `pdf` 和 `pdfs` 在加载前会合并并去重；至少需要提供一个。
- `pages` 会按从 1 开始的页码解析、去重、排序，并限制到 `agents.defaults.pdfMaxPages`（默认 `20`）。如果某个范围不包含任何有效页码，则会在模型调用前报错。

## 支持的 PDF 引用

- 本地文件路径（包括 `~` 展开）
- `file://` URL
- `http://` 和 `https://` URL
- OpenClaw 管理的入站引用，例如 `media://inbound/<id>`

其他 URI 方案（例如 `ftp://`）会返回 `details.error = "unsupported_pdf_reference"`。当工具在沙箱中运行时，远程 `http(s)` URL 会被拒绝。启用仅工作区文件策略后，不允许根目录之外的本地路径会被拒绝；但 OpenClaw 的入站媒体存储下的受管入站引用和重放路径仍然允许。

## 执行模式

### 原生提供方模式

用于提供方 `anthropic` 和 `google`（目前唯一声明原生 PDF 文档支持的提供方）。原始 PDF 字节会作为每个文件的原生文档/内联 PDF 部分直接发送到提供方 API。

限制：

- 不支持 `pages`；如果设置了该项，工具会抛出 `pages is not supported with native PDF providers`。
- 不支持 `password`；如果设置了该项，工具会抛出 `password is not supported with native PDF providers`。对于加密 PDF，请使用非原生模型。

### 提取回退模式

用于其他所有提供方。

1. 使用捆绑的 `document-extract` 插件从所选页面提取文本（最多 `agents.defaults.pdfMaxPages`，默认 `20`），该插件使用 `clawpdf` 包（PDFium WebAssembly）进行文本和图像提取。
2. 如果提取出的文本短于 `200` 个字符，则将相同页面渲染为 PNG 图像。渲染预算总计为 `4,000,000` 像素，并在所有需要图像的页面之间共享（按剩余页面比例分配，而不是按每页分配），因此已经包含足够文本的页面会完全跳过渲染。
3. 将提取的文本（以及任何渲染出的图像）和提示一起发送给所选模型。

详情：

- 加密 PDF 使用顶层 `password` 参数打开。
- 如果模型不支持图像输入且没有可提取文本，工具会报错。
- 如果图像渲染失败，OpenClaw 会丢弃图像并继续使用提取出的文本。
- 如果目标模型仅支持文本，而提取过程产生了图像，OpenClaw 会丢弃图像并仅发送文本。

## 配置

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

| 键                              | 默认值    | 含义                                                                                   |
| ----------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `agents.defaults.pdfModel`    | 未设置   | 显式指定主／备用 PDF 模型；若无则回退到 `imageModel`，再回退到会话模型。 |
| `agents.defaults.pdfMaxMb`    | `10`    | 单个 PDF 的大小上限（MB）。                                                                   |
| `agents.defaults.pdfMaxPages` | `20`    | 每个 PDF 处理的最大页数。                                                              |

请参阅 [配置参考](/gateway/config-agents#agent-defaults) 以获取完整字段详情。

## 输出详情

该工具会在 `content[0].text` 中返回文本，并在 `details` 中返回结构化元数据。

常见 `details` 字段：

- `model`：解析后的模型引用（`provider/model`）
- `native`：原生提供方模式为 `true`，回退模式为 `false`
- `attempts`：成功前失败的回退尝试次数

路径字段：

- 单个 PDF 输入：`details.pdf`
- 多个 PDF 输入：`details.pdfs[]`，其中包含 `pdf` 条目
- 沙箱路径重写元数据（适用时）：`rewrittenFrom`

## 错误行为

| 条件                              | 结果                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| 没有 PDF 输入                     | 抛出 `pdf required: provide a path or URL to a PDF document` |
| 超过 10 个 PDF                    | `details.error = "too_many_pdfs"`                              |
| 不支持的引用方案                   | `details.error = "unsupported_pdf_reference"`                  |
| 使用原生提供程序时传入 `pages`     | 抛出 `pages is not supported with native PDF providers`      |
| 使用原生提供程序时传入 `password`  | 抛出 `password is not supported with native PDF providers`   |

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
- [配置参考](/gateway/config-agents#agent-defaults) - `pdfMaxMb` 和 `pdfMaxPages` 配置
