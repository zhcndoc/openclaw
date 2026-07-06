---
summary: "供代理使用的只读 diff 查看器和文件渲染器（可选插件工具）"
title: "Diffs"
sidebarTitle: "Diffs"
read_when:
  - 你希望代理将代码或 Markdown 编辑内容以 diff 形式展示
  - 你需要一个可供画布使用的查看器 URL 或已渲染的 diff 文件
  - 你需要带有安全默认值的受控、临时 diff 产物
---

`diffs` 是一个可选的捆绑插件工具，它会将修改前/后的文本或统一补丁转换为只读 diff 产物。它还会在系统提示中追加简短的代理指导，并附带一个配套技能以提供更完整的说明。

输入：`before` + `after` 文本，或一个统一的 `patch`（二者互斥）。

输出：用于画布展示的网关查看器 URL、用于消息传递的已渲染 PNG/PDF 文件路径，或两者都有。

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
        组合模式（默认）：代理调用 `diffs` 时使用 `mode: "both"`，一次调用即可同时获取两种产物。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## 禁用内置系统指导

要保留该工具但去掉前置的系统提示指导，请将 `plugins.entries.diffs.hooks.allowPromptInjection` 设置为 `false`：

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

这会阻止该插件的 `before_prompt_build` 钩子，同时保留工具和技能可用。要同时禁用指导和工具，请改为禁用该插件。

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
  before/after 模式的显示文件名。
</ParamField>
<ParamField path="lang" type="string">
  before/after 模式的语言覆盖提示。未知值以及默认查看器集合之外的语言会回退为纯文本，除非安装了 Diff Viewer Language Pack 插件。
</ParamField>
<ParamField path="title" type="string">
  查看器标题覆盖。
</ParamField>
<ParamField path="mode" type='"view" | "file" | "both"'>
  输出模式。默认使用插件默认值 `defaults.mode`（`both`）。已弃用别名：`"image"` 的行为与 `"file"` 完全相同。
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
  PNG/PDF 渲染的质量预设。
</ParamField>
<ParamField path="fileScale" type="number">
  设备缩放覆盖值（`1`-`4`）。
</ParamField>
<ParamField path="fileMaxWidth" type="number">
  CSS 像素中的最大渲染宽度（`640`-`2400`）。
</ParamField>
<ParamField path="ttlSeconds" type="number" default="1800">
  查看器和独立文件输出的 Artifact 存活时间（TTL），单位为秒。最大值 `21600`。
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
  <Accordion title="Validation and limits">
    - `before`/`after`: 每个最大 512 KiB。
    - `patch`: 最大 2 MiB。
    - `path`: 最大 2048 字节。
    - `lang`: 最大 128 字节。
    - `title`: 最大 1024 字节。
    - 补丁复杂度上限：最多 128 个文件和 120000 行总数。
    - `patch` 与 `before`/`after` 同时提供将被拒绝。
    - 渲染文件安全限制（PNG 和 PDF）：
      - `fileQuality: "standard"`：最大 8 MP（8,000,000 个渲染像素）。
      - `fileQuality: "hq"`：最大 14 MP。
      - `fileQuality: "print"`：最大 24 MP。
      - PDF 也最多限制为 50 页。

  </Accordion>
</AccordionGroup>

## 语法高亮

内置语言：

`javascript`, `typescript`, `tsx`, `jsx`, `json`, `markdown`, `yaml`, `css`, `html`, `sh`, `python`, `go`, `rust`, `java`, `c`, `cpp`, `csharp`, `php`, `sql`, `docker`, `ruby`, `swift`, `kotlin`, `r`, `dart`, `lua`, `powershell`, `xml`，和 `toml`。

常见别名（`js`, `ts`, `bash`, `md`, `yml`, `c++`, `dockerfile`, `rb`, `kt`, `ps1` 等）会规范化为这些语言。

安装 Diff Viewer Language Pack 插件以支持更多语言（Astro、Vue、Svelte、MDX、GraphQL、Terraform/HCL、Nix、Clojure、Elixir、Haskell、OCaml、Scala、Zig、Solidity、Verilog/VHDL、Fortran、MATLAB、LaTeX、Mermaid、Sass/Less/SCSS、Nginx、Apache、CSV、dotenv、INI、diff 等）：

```bash
openclaw plugins install clawhub:@openclaw/diffs-language-pack
```

没有该语言包时，不受支持的语言仍会以可读的纯文本形式渲染。有关上游目录，请参见 [Diffs Language Pack 插件](/plugins/reference/diffs-language-pack) 和 [Shiki 语言](https://shiki.style/languages)。

## 输出详情契约

<AccordionGroup>
  <Accordion title="查看器字段（view 和 both 模式）">
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
  <Accordion title="文件字段（file 和 both 模式）">
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
  <Accordion title="兼容别名（始终返回）">
    - `format` (= `fileFormat`)
    - `imagePath` (= `filePath`)
    - `imageBytes` (= `fileBytes`)
    - `imageQuality` (= `fileQuality`)
    - `imageScale` (= `fileScale`)
    - `imageMaxWidth` (= `fileMaxWidth`)

  </Accordion>
</AccordionGroup>

| 模式     | 返回内容                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| `"view"` | 仅返回查看器字段。                                                                                          |
| `"file"` | 仅返回文件字段，不返回查看器 artifact。                                                                        |
| `"both"` | 返回查看器字段加文件字段。如果文件渲染失败，查看器仍会返回，并带有 `fileError`/`imageError`。 |

### 折叠的未更改部分

查看器会显示类似 `N 行未修改` 的行。只有当渲染后的 diff 包含可展开的上下文数据时，才会出现展开控件（通常用于 before/after 输入）。许多统一补丁在其 hunks 中省略了上下文正文，因此该行可能在没有展开控件的情况下出现——这是预期行为，不是 bug。`expandUnchanged` 仅在存在可展开上下文时生效。

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
            ttlSeconds: 21600,
          },
        },
      },
    },
  },
}
```

支持的 `defaults` 键：`fontFamily`、`fontSize`、`lineSpacing`、`layout`、`showLineNumbers`、`diffIndicators`、`wordWrap`、`background`、`theme`、`fileFormat`、`fileQuality`、`fileScale`、`fileMaxWidth`、`mode`、`ttlSeconds`。显式传入的工具调用参数会覆盖这些默认值。

### 持久化查看器 URL 配置

<ParamField path="viewerBaseUrl" type="string">
  当工具调用未传入 `baseUrl` 时，插件返回查看器链接时使用的后备值。必须是 `http` 或 `https`，且不能包含 query/hash。
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
  `false`：对 viewer 路由的非回环请求将被拒绝。`true`：如果带 token 的路径有效，则允许远程 viewer。
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

- 产物位于 `$TMPDIR/openclaw-diffs` 下。
- 查看器元数据存储一个随机的 20 位十六进制产物 ID、一个随机的 48 位十六进制 token、`createdAt`/`expiresAt`，以及保存的 `viewer.html` 路径。
- 默认产物 TTL：30 分钟。可接受的最大 TTL：6 小时。
- 每次创建产物调用后会机会性地运行清理；过期产物会被删除。
- 当元数据缺失时，回退扫描会移除超过 24 小时的陈旧文件夹。

## 查看器 URL 和网络行为

Viewer route: `/plugins/diffs/view/{artifactId}/{token}`

Viewer 资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`
- `/plugins/diffs-language-pack/assets/viewer.js` (仅当 diff 使用语言包语言时)

查看器文档会相对于 viewer URL 解析这些资源，因此可选的 `baseUrl` 路径前缀也会传递到资源请求中。

URL 解析顺序：tool-call `baseUrl`（经过严格校验后）-> 插件 `viewerBaseUrl` -> 回环地址 `127.0.0.1` 默认值。如果 gateway 绑定模式为 `custom` 且设置了 `gateway.customBindHost`，则使用该主机而不是回环地址。

`baseUrl` 规则：必须是 `http://` 或 `https://`；会拒绝 query 和 hash；允许 origin 加可选的基础路径。

## 安全模型

<AccordionGroup>
  <Accordion title="查看器加固">
    - 默认仅允许回环访问。
    - 带令牌的查看器路径，并对 ID 和令牌模式进行严格验证。
    - 查看器响应的 CSP：`default-src 'none'`; 脚本/资源仅允许来自自身；不允许任何外部 `connect-src`。
    - 启用远程访问时的远程未命中限流：60 秒内 40 次失败将触发 60 秒锁定（`429 Too Many Requests`）。

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
    Chrome、Chromium、Edge 和 Brave 的常见安装路径及 `PATH` 查找。
  </Step>
</Steps>

常见失败提示：`Diff PNG/PDF rendering requires a Chromium-compatible browser...`。可通过安装 Chrome、Chromium、Edge 或 Brave，或设置上述任一可执行文件路径选项来修复。

## 故障排查

<AccordionGroup>
  <Accordion title="输入验证错误">
    - `Provide patch or both before and after text.` -- 请同时提供 `before` 和 `after`，或者提供 `patch`。
    - `Provide either patch or before/after input, not both.` -- 不要混合使用输入模式。
    - `Invalid baseUrl: ...` -- 使用带可选路径的 `http(s)` 源点，不要包含 query/hash。
    - `{field} exceeds maximum size (...)` -- 减少负载大小。
    - Large patch rejection -- 减少 patch 文件数量或总行数。

  </Accordion>
  <Accordion title="查看器可访问性">
    - Viewer URL resolves to `127.0.0.1` by default.
    - For remote access, either set plugin `viewerBaseUrl`, pass `baseUrl` per call, or use `gateway.bind=custom` with `gateway.customBindHost`.
    - If `gateway.trustedProxies` includes loopback for a same-host proxy (for example Tailscale Serve), raw loopback viewer requests without forwarded client-IP headers fail closed by design.
    - For that proxy topology, prefer `mode: "file"`/`"both"` for an attachment, or intentionally enable `security.allowRemoteViewer` plus plugin `viewerBaseUrl`/a proxy `baseUrl` for a shareable viewer link.
    - Enable `security.allowRemoteViewer` only when external viewer access is intended.

  </Accordion>
  <Accordion title="未修改行没有展开按钮">
    对于缺少可展开上下文的 patch 输入，这是预期行为；不是查看器故障。
  </Accordion>
  <Accordion title="未找到制品">
    - 制品因 TTL 过期。
    - Token 或路径已更改。
    - 清理操作移除了过期数据。

  </Accordion>
</AccordionGroup>

## 操作指南

- 本地在画布中进行交互式审阅时，优先使用 `mode: "view"`。
- 需要附件的外部聊天频道中，优先使用 `mode: "file"`。
- 除非你的部署需要远程查看器 URL，否则请保持 `allowRemoteViewer` 处于禁用状态。
- 对于敏感差异，请设置明确且较短的 `ttlSeconds`。
- 在不需要时，避免在差异输入中发送密钥。
- 如果你的频道会对图片进行强压缩（例如 Telegram 或 WhatsApp），请优先使用 PDF 输出（`fileFormat: "pdf"`）。

<Note>
Diff 渲染引擎由 [Diffs](https://diffs.com) 提供支持。
</Note>

## 另请参阅

- [Browser](/tools/browser)
- [插件](/tools/plugin)
- [工具概览](/tools)
