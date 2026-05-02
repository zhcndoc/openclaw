---
summary: "供代理使用的只读 diff 查看器和文件渲染器（可选插件工具）"
title: "Diffs"
sidebarTitle: "Diffs"
read_when:
  - 你希望代理将代码或 Markdown 编辑内容以 diff 形式展示
  - 你需要一个可供画布使用的查看器 URL 或已渲染的 diff 文件
  - 你需要带有安全默认值的受控、临时 diff 产物
---

`diffs` 是一个可选插件工具，带有简短的内置系统指导，以及一个配套技能，可将变更内容转换为供代理使用的只读 diff 产物。

它接受以下任一输入：

- `before` 和 `after` 文本
- 一个统一的 `patch`

它可以返回：

- 用于画布展示的网关查看器 URL
- 用于消息传递的已渲染文件路径（PNG 或 PDF）
- 在一次调用中同时返回两种输出

启用后，插件会将简洁的使用指导预置到 system-prompt 空间中，并且还会暴露一个详细技能，供代理需要更完整说明时使用。

## 快速开始

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install diffs
    ```
  </Step>
  <Step title="启用插件">
    ```json5
    {
      plugins: {
        entries: {
          diffs: {
            enabled: true,
          },
        },
      },
    }
    ```
  </Step>
  <Step title="选择模式">
    <Tabs>
      <Tab title="view">
        以画布优先的流程：代理调用 `diffs` 时使用 `mode: "view"`，并通过 `canvas present` 打开 `details.viewerUrl`。
      </Tab>
      <Tab title="file">
        聊天文件传递：代理调用 `diffs` 时使用 `mode: "file"`，并通过 `message` 使用 `path` 或 `filePath` 发送 `details.filePath`。
      </Tab>
      <Tab title="both">
        组合模式：代理调用 `diffs` 时使用 `mode: "both"`，一次调用即可获得两种产物。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## 禁用内置系统指导

如果你想保留 `diffs` 工具启用，但禁用其内置的 system-prompt 指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设为 `false`：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
      },
    },
  },
}
```

这会阻止 diffs 插件的 `before_prompt_build` 钩子，同时保留插件、工具和配套技能可用。

如果你想同时禁用指导和工具，请改为禁用插件。

## 典型代理工作流

<Steps>
  <Step title="调用 diffs">
    代理使用输入调用 `diffs` 工具。
  </Step>
  <Step title="读取详情">
    代理读取响应中的 `details` 字段。
  </Step>
  <Step title="展示">
    代理要么使用 `canvas present` 打开 `details.viewerUrl`，要么通过 `message` 使用 `path` 或 `filePath` 发送 `details.filePath`，或者两者都做。
  </Step>
</Steps>

## 输入示例

<Tabs>
  <Tab title="Before and after">
    ```json
    {
      "before": "# Hello\n\nOne",
      "after": "# Hello\n\nTwo",
      "path": "docs/example.md",
      "mode": "view"
    }
    ```
  </Tab>
  <Tab title="Patch">
    ```json
    {
      "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
      "mode": "both"
    }
    ```
  </Tab>
</Tabs>

## 工具输入参考

除非另有说明，所有字段都是可选的。

<ParamField path="before" type="string">
  原始文本。当省略 `patch` 时，需与 `after` 一起提供。
</ParamField>
<ParamField path="after" type="string">
  更新后的文本。当省略 `patch` 时，需与 `before` 一起提供。
</ParamField>
<ParamField path="patch" type="string">
  统一 diff 文本。与 `before` 和 `after` 互斥。
</ParamField>
<ParamField path="path" type="string">
  before 和 after 模式下显示的文件名。
</ParamField>
<ParamField path="lang" type="string">
  before 和 after 模式下的语言覆盖提示。未知值会回退为纯文本。
</ParamField>
<ParamField path="title" type="string">
  查看器标题覆盖。
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  输出模式。默认使用插件默认值 `defaults.mode`。已弃用别名：`"image"` 的行为与 `"file"` 相同，并且为了向后兼容仍可接受。
</ParamField>
<ParamField path="theme" type='"light" | "dark"'>
  查看器主题。默认使用插件默认值 `defaults.theme`。
</ParamField>
<ParamField path="layout" type='"unified" | "split"'>
  diff 布局。默认使用插件默认值 `defaults.layout`。
</ParamField>
<ParamField path="expandUnchanged" type="boolean">
  当完整上下文可用时展开未更改部分。仅限每次调用的选项（不是插件默认键）。
</ParamField>
<ParamField path="fileFormat" type='"png" | "pdf"'>
  渲染文件格式。默认使用插件默认值 `defaults.fileFormat`。
</ParamField>
<ParamField path="fileQuality" type='"standard" | "hq" | "print"'>
  PNG 或 PDF 渲染的质量预设。
</ParamField>
<ParamField path="fileScale" type="number">
  设备缩放覆盖值（`1`-`4`）。
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  CSS 像素中的最大渲染宽度（`640`-`2400`）。
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  查看器和独立文件输出的产物 TTL（秒）。最大 21600。
</ParamField>
<ParamField path="baseUrl" type="string">
  查看器 URL 源覆盖值。覆盖插件 `viewerBaseUrl`。必须是 `http` 或 `https`，且不能包含 query/hash。
</ParamField>

<AccordionGroup>
  <Accordion title="旧版输入别名">
    为了向后兼容，仍可接受：

    - `format` -> `fileFormat`
    - `imageFormat` -> `fileFormat`
    - `imageQuality` -> `fileQuality`
    - `imageScale` -> `fileScale`
    - `imageMaxWidth` -> `fileMaxWidth`

  </Accordion>
  <Accordion title="验证与限制">
    - `before` 和 `after` 各自最大 512 KiB。
    - `patch` 最大 2 MiB。
    - `path` 最大 2048 字节。
    - `lang` 最大 128 字节。
    - `title` 最大 1024 字节。
    - patch 复杂度上限：最多 128 个文件和 120000 总行数。
    - `patch` 不能与 `before` 或 `after` 同时使用。
    - 渲染文件的安全限制（适用于 PNG 和 PDF）：
      - `fileQuality: "standard"`：最大 8 MP（8,000,000 个渲染像素）。
      - `fileQuality: "hq"`：最大 14 MP（14,000,000 个渲染像素）。
      - `fileQuality: "print"`：最大 24 MP（24,000,000 个渲染像素）。
      - PDF 还最多支持 50 页。

  </Accordion>
</AccordionGroup>

## 输出详情契约

该工具会在 `details` 下返回结构化元数据。

<AccordionGroup>
  <Accordion title="查看器字段">
    为创建查看器的模式提供的共享字段：

    - `artifactId`
    - `viewerUrl`
    - `viewerPath`
    - `title`
    - `expiresAt`
    - `inputKind`
    - `fileCount`
    - `mode`
    - `context`（在可用时包含 `agentId`、`sessionId`、`messageChannel`、`agentAccountId`）

  </Accordion>
  <Accordion title="文件字段">
    当渲染 PNG 或 PDF 时的文件字段：

    - `artifactId`
    - `expiresAt`
    - `filePath`
    - `path`（与 `filePath` 相同的值，用于 message 工具兼容性）
    - `fileBytes`
    - `fileFormat`
    - `fileQuality`
    - `fileScale`
    - `fileMaxWidth`

  </Accordion>
  <Accordion title="兼容别名">
    也会为现有调用方返回：

    - `format`（与 `fileFormat` 相同的值）
    - `imagePath`（与 `filePath` 相同的值）
    - `imageBytes`（与 `fileBytes` 相同的值）
    - `imageQuality`（与 `fileQuality` 相同的值）
    - `imageScale`（与 `fileScale` 相同的值）
    - `imageMaxWidth`（与 `fileMaxWidth` 相同的值）

  </Accordion>
</AccordionGroup>

模式行为摘要：

| 模式     | 返回内容                                                                                                             |
| -------- | -------------------------------------------------------------------------------------------------------------------- |
| `"view"` | 仅返回查看器字段。                                                                                                   |
| `"file"` | 仅返回文件字段，不返回查看器产物。                                                                                   |
| `"both"` | 返回查看器字段和文件字段。如果文件渲染失败，仍会返回查看器，并附带 `fileError` 和 `imageError` 别名。 |

## 折叠的未更改部分

- 查看器可以显示如 `N unmodified lines` 这样的行。
- 这些行上的展开控件是有条件出现的，并不保证对每种输入类型都存在。
- 当渲染后的 diff 具有可展开的上下文数据时，会显示展开控件，这在 before 和 after 输入中较为常见。
- 对于许多统一 patch 输入，解析后的 patch hunk 中并不存在省略的上下文正文，因此该行可能在没有展开控件的情况下出现。这是预期行为。
- `expandUnchanged` 仅在存在可展开上下文时生效。

## 插件默认值

在 `~/.openclaw/openclaw.json` 中设置插件级默认值：

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          defaults: {
            fontFamily: "Fira Code",
            fontSize: 15,
            lineSpacing: 1.6,
            layout: "unified",
            showLineNumbers: true,
            diffIndicators: "bars",
            wordWrap: true,
            background: true,
            theme: "dark",
            fileFormat: "png",
            fileQuality: "standard",
            fileScale: 2,
            fileMaxWidth: 960,
            mode: "both",
          },
        },
      },
    },
  },
}
```

支持的默认值：

- `fontFamily`
- `fontSize`
- `lineSpacing`
- `layout`
- `showLineNumbers`
- `diffIndicators`
- `wordWrap`
- `background`
- `theme`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`
- `mode`

显式工具参数会覆盖这些默认值。

### 持久化查看器 URL 配置

<ParamField path="viewerBaseUrl" type="string">
  当工具调用未传入 `baseUrl` 时，插件拥有的返回查看器链接的后备值。必须是 `http` 或 `https`，且不能包含 query/hash。
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          viewerBaseUrl: "https://gateway.example.com/openclaw",
        },
      },
    },
  },
}
```

## 安全配置

<ParamField path="security.allowRemoteViewer" type="boolean" default="false">
  `false`：会拒绝对 viewer 路由的非回环请求。`true`：如果带 token 的路径有效，则允许远程 viewer。
</ParamField>

```json5
{
  plugins: {
    entries: {
      diffs: {
        enabled: true,
        config: {
          security: {
            allowRemoteViewer: false,
          },
        },
      },
    },
  },
}
```

## 资源生命周期和存储

- Artifacts 存储在临时子文件夹下：`$TMPDIR/openclaw-diffs`。
- Viewer artifact 元数据包含：
  - 随机 artifact ID（20 位十六进制字符）
  - 随机 token（48 位十六进制字符）
  - `createdAt` 和 `expiresAt`
  - 存储的 `viewer.html` 路径
- 未指定时，默认 artifact TTL 为 30 分钟。
- 接受的最大 viewer TTL 为 6 小时。
- 清理会在 artifact 创建后机会性运行。
- 已过期的 artifacts 会被删除。
- 当元数据缺失时，回退清理会移除超过 24 小时的陈旧文件夹。

## Viewer URL 和网络行为

Viewer 路由：

- `/plugins/diffs/view/{artifactId}/{token}`

Viewer 资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

Viewer 文档会相对于 viewer URL 解析这些资源，因此可选的 `baseUrl` 路径前缀也会同时保留给这两种资源请求。

URL 构造行为：

- 如果提供了工具调用的 `baseUrl`，则会在严格验证后使用它。
- 否则，如果配置了插件 `viewerBaseUrl`，则会使用它。
- 若两者都未覆盖，viewer URL 默认指向回环地址 `127.0.0.1`。
- 如果 gateway 绑定模式为 `custom` 且设置了 `gateway.customBindHost`，则使用该主机。

`baseUrl` 规则：

- 必须是 `http://` 或 `https://`。
- 查询和 hash 会被拒绝。
- 允许 origin 加上可选的 base path。

## 安全模型

<AccordionGroup>
  <Accordion title="Viewer 加固">
    - 默认仅允许回环。
    - 带 token 的 viewer 路径，且对 ID 和 token 进行严格验证。
    - Viewer 响应的 CSP：
      - `default-src 'none'`
      - 脚本和资源仅允许来自 self
      - 不允许外发 `connect-src`
    - 启用远程访问时的远程 miss 限流：
      - 每 60 秒 40 次失败
      - 60 秒锁定（`429 Too Many Requests`）

  </Accordion>
  <Accordion title="文件渲染加固">
    - 截图浏览器请求路由采用默认拒绝策略。
    - 仅允许来自 `http://127.0.0.1/plugins/diffs/assets/*` 的本地 viewer 资源。
    - 外部网络请求被阻止。

  </Accordion>
</AccordionGroup>

## 文件模式的浏览器要求

`mode: "file"` 和 `mode: "both"` 需要兼容 Chromium 的浏览器。

解析顺序：

<Steps>
  <Step title="配置">
    OpenClaw 配置中的 `browser.executablePath`。
  </Step>
  <Step title="环境变量">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step title="平台回退">
    平台命令/路径发现回退。
  </Step>
</Steps>

常见失败文本：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

通过安装 Chrome、Chromium、Edge 或 Brave 来修复，或者设置上述某个可执行文件路径选项。

## 故障排查

<AccordionGroup>
  <Accordion title="输入验证错误">
    - `Provide patch or both before and after text.` — 需要提供 `patch`，或者同时提供 `before` 和 `after` 文本。
    - `Provide either patch or before/after input, not both.` — 请只使用一种输入模式，不要同时使用两者。
    - `Invalid baseUrl: ...` — 使用带可选路径的 `http(s)` origin，不要包含 query/hash。
    - `{field} exceeds maximum size (...)` — 减少负载大小。
    - 大型 patch 被拒绝 — 减少 patch 的文件数量或总行数。

  </Accordion>
  <Accordion title="Viewer 可访问性">
    - Viewer URL 默认解析为 `127.0.0.1`。
    - 对于远程访问场景，请选择以下任一方式：
      - 设置插件 `viewerBaseUrl`，或
      - 在工具调用时传入 `baseUrl`，或
      - 使用 `gateway.bind=custom` 和 `gateway.customBindHost`
    - 如果 `gateway.trustedProxies` 为同主机代理（例如 Tailscale Serve）包含了回环地址，那么缺少转发客户端 IP 头的原始回环 viewer 请求会按设计失败并被关闭。
    - 对于这种代理拓扑：
      - 如果只需要附件，优先使用 `mode: "file"` 或 `mode: "both"`，或
      - 当你需要可分享的 viewer URL 时，显式启用 `security.allowRemoteViewer`，并设置插件 `viewerBaseUrl` 或传入代理/公共 `baseUrl`
    - 只有在你确实打算让外部访问 viewer 时，才启用 `security.allowRemoteViewer`。

  </Accordion>
  <Accordion title="未修改行 row 没有展开按钮">
    当 patch 输入不包含可展开的上下文时，可能会出现这种情况。这是预期行为，并不表示 viewer 出现故障。
  </Accordion>
  <Accordion title="未找到 Artifact">
    - Artifact 已因 TTL 过期。
    - Token 或路径已更改。
    - 清理操作已移除陈旧数据。

  </Accordion>
</AccordionGroup>

## 操作指南

- 在 canvas 中进行本地交互式审查时，优先使用 `mode: "view"`。
- 对于需要附件的外发聊天渠道，优先使用 `mode: "file"`。
- 除非你的部署需要远程 viewer URL，否则保持 `allowRemoteViewer` 为禁用状态。
- 对于敏感 diff，设置明确且较短的 `ttlSeconds`。
- 在不需要时，避免在 diff 输入中发送敏感信息。
- 如果你的渠道会严重压缩图片（例如 Telegram 或 WhatsApp），优先使用 PDF 输出（`fileFormat: "pdf"`）。

<Note>
Diff 渲染引擎由 [Diffs](https://diffs.com) 提供支持。
</Note>

## 另请参阅

- [Browser](/tools/browser)
- [插件](/tools/plugin)
- [工具概览](/tools)
