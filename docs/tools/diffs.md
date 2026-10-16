---
summary: "供代理使用的只读 diff 查看器和文件渲染器（可选插件工具）"
title: "差异"
sidebarTitle: "差异"
read_when:
  - "您希望代理将代码或降价编辑显示为差异"
  - "您需要一个支持浏览器的查看器 URL 或渲染的 diff 文件"
  - "你需要带有安全默认值的受控、临时 diff 产物"
---

`diffs` 是一个可选插件工具，可将 before/after 文本或统一补丁转换为只读差异工件。它还将简短的代理指导添加到系统提示中，并提供配套技能以提供更完整的说明。

输入：`before` + `after` 文本，或一个统一的 `patch`（二者互斥）。

输出：用于浏览器演示的网关查看器 URL、用于消息传递的渲染 PNG/PDF 文件路径，或两者兼而有之。

[Control UI](/web/control-ui) 已经突出显示了没有此插件的内联工具差异和会话差异。当客服人员需要独立查看器链接或其他频道的渲染附件时，请安装 `diffs`。

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install clawhub:@openclaw/diffs
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

    `diffs`其语言包作为单独的包提供，而不是与OpenClaw，因此安装需要一个作用域定位器。这`clawhub:`前缀选择ClawHub的副本`@openclaw/diffs`。使用`npm:@openclaw/diffs`安装自npm反而。

  </Step>
  <Step id="enable-the-plugin" title="启用插件">
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
  <Step id="pick-a-mode" title="选择一种模式">
    <Tabs>
      <Tab id="view" title="看法">
        浏览器流程：代理使用 `mode: "view"` 调用 `diffs` 并在浏览器中打开 `details.viewerUrl`。
      </Tab>
      <Tab id="file" title="文件">
        聊天文件传送：座席使用 `mode: "file"` 呼叫 `diffs`，并使用 `path` 或 `filePath` 发送 `details.filePath` 和 `message`。
      </Tab>
      <Tab id="both" title="两个都">
        组合模式（默认）：代理调用 `diffs` 时使用 `mode: "both"`，一次调用即可同时获取两种产物。
      </Tab>
    </Tabs>
  </Step>
</Steps>

## <a id="disable-built-in-system-guidance"></a> 禁用内置系统指导

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

## <a id="tool-input-reference"></a> 工具输入参考

除非另有说明，所有字段都是可选的。

<ParamField path="before" type="string">
  原文。当省略 `patch` 时，需要使用 `after`。
</ParamField>
<ParamField path="after" type="string">
  更新了文字。当省略 `patch` 时，需要使用 `before`。
</ParamField>
<ParamField path="patch" type="string">
  统一 diff 文本。与 `before` 和 `after` 互斥。
</ParamField>
<ParamField path="path" type="string">
  before/after 模式的显示文件名。
</ParamField>
<ParamField path="lang" type="string">
  before/after 模式的语言覆盖提示。默认查看器设置之外的未知值和语言将回退为纯文本，除非安装了 Diffs 语言包插件。
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
  查看器 URL 原点覆盖。覆盖插件 `viewerBaseUrl`。必须是 `http` 或 `https`，不是 query/hash.
</ParamField>

<AccordionGroup>
  <Accordion id="validation-and-limits" title="验证和限制">
    - `before`/`after`：每个最大 512 KiB。
    - `patch`：最大 2 MiB。
    - `path`：最大 2048 字节。
    - `lang`：最大 128 字节。
    - `title`：最大 1024 字节。
    - 补丁复杂度上限：最多 128 个文件和 120000 行总数。
    - `patch` 与 `before`/`after` 同时提供将被拒绝。
    - 渲染文件安全限制（PNG 和 PDF）：
      - `fileQuality: "standard"`：最大 8 MP（8,000,000 个渲染像素）。
      - `fileQuality: "hq"`：最大 14 MP。
      - `fileQuality: "print"`：最大 24 MP。
      - PDF 也最多限制为 50 页。

  </Accordion>
</AccordionGroup>

## <a id="syntax-highlighting"></a> 语法高亮

内置语言：

`javascript`, `typescript`, `tsx`, `jsx`, `json`, `markdown`, `yaml`, `css`, `html`, `sh`, `python`, `go`, `rust`, `java`, `c`, `cpp`, `csharp`, `php`, `sql`, `docker`, `ruby`, `swift`, `kotlin`, `r`, `dart`, `lua`, `powershell`, `xml`，和 `toml`。

常见别名（`js`, `ts`, `bash`, `md`, `yml`, `c++`, `dockerfile`, `rb`, `kt`, `ps1` 等）会规范化为这些语言。

安装更多语言的 Diffs 语言包插件（Astro、Vue、Svelte、MDX、GraphQL、Terraform/HCL、Nix、Clojure、Elixir、Haskell、OCaml、Scala、Zig、Solidity、Verilog/VHDL、Fortran、MATLAB、 LaTeX、美人鱼、Sass/Less/SCSS、Nginx、Apache、CSV、dotenv、INI、diff 等）：

```bash
openclaw plugins install clawhub:@openclaw/diffs-language-pack
```

没有该语言包时，不受支持的语言仍会以可读的纯文本形式渲染。有关上游目录，请参见 [Diffs Language Pack 插件](/plugins/reference/diffs-language-pack) 和 [Shiki 语言](https://shiki.style/languages)。

## <a id="output-details-contract"></a> 输出详情契约

所有成功结果都包括 `changed`：相同的 before/after 输入返回 `false`，而不创建工件。渲染结果返回`true`。

<AccordionGroup>
  <Accordion id="viewer-fields-view-and-both-modes" title="查看器字段（视图和两种模式）">
    - `changed`
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
  <Accordion id="file-fields-file-and-both-modes" title="文件字段（文件和两种模式）">
    - `changed`
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
</AccordionGroup>

| 模式     | 返回内容                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------- |
| `"view"` | 仅返回查看器字段。                                                                             |
| `"file"` | 仅返回文件字段，不返回查看器工件。                                                           |
| `"both"` | 返回查看器字段和文件字段。如果文件渲染失败，查看器仍会返回，并附带 `fileError`。 |

### <a id="collapsed-unchanged-sections"></a> 折叠的未更改部分

查看器显示类似 `N unmodified lines` 的行。仅当渲染的差异具有可扩展上下文数据（通常用于 before/after 输入）时，扩展控件才会出现。许多统一补丁在其块中省略了上下文主体。然后，该行可以在没有展开控件的情况下出现。这是预期的，不是错误。 `expandUnchanged` 仅在可扩展上下文存在时适用。

### <a id="multi-file-navigation"></a> 多文件导航

涉及多个文件的补丁从更改文件摘要卡开始。该卡显示：

- `+N` / `-N` 总数
- 每个文件计数
- 添加、删除和重命名徽章
- anchor 跳转到每个文件的链接

渲染的 PNG/PDF 文件保留每个文件的标头计数。他们放弃了交互式视图切换，因为这些是静态文件中的死控件。

## <a id="plugin-defaults"></a> 插件默认值

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

### <a id="persistent-viewer-url-config"></a> 持久化查看器 URL 配置

<ParamField path="viewerBaseUrl" type="string">
  当工具调用未通过 `baseUrl` 时，插件拥有的后备返回查看器链接。必须是 `http` 或 `https`，不是 query/hash.
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

## <a id="security-config"></a> 安全配置

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

## <a id="artifact-lifecycle-and-storage"></a> 资源生命周期和存储

- Viewer HTML 和元数据位于 Diffs 插件 blob 命名空间下的共享 `state/openclaw.sqlite` 数据库中。 HTML 采用 gzip 压缩。 SQLite 仅存储随机 URL 令牌的 SHA-256 哈希值，而不是令牌本身。
- 渲染的PNG/PDF文件在`$TMPDIR/openclaw-diffs`下保留临时实现，因为通道传送需要文件路径。 SQLite 拥有其到期元数据。 OpenClaw 不写入 JSON sidecar。
- 默认制品 TTL：30 分钟。可接受的最大 TTL：6 小时。
- 清理会在每次 artifact create 调用后机会性运行。首先删除已过期的 SQLite 行，然后删除任何对应的 PNG/PDF 目录。
- 兜底扫描会移除超过 24 小时且没有对应数据库行的临时文件夹。旧版 `meta.json`、`file-meta.json` 和 `viewer.html` 缓存不会被导入或读取。

## <a id="viewer-url-and-network-behavior"></a> 查看器 URL 和网络行为

查看器路由：`/plugins/diffs/view/{artifactId}/{token}`

查看器资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`
- `/plugins/diffs-language-pack/assets/viewer.js`（仅当 diff 使用语言包语言时）

查看器文档相对于查看器 URL 解析这些资源。因此，可选的 `baseUrl` 路径前缀也适用于资产请求。

URL 解析顺序：工具调用的 `baseUrl`（严格验证后）-> 插件的 `viewerBaseUrl` -> `gateway.publicOrigin` -> 现有的绑定感知 Gateway 后备值。

`baseUrl`规则：

- 方案必须是`http://`或`https://`。
- A `baseUrl` 携带查询字符串或哈希值被拒绝。
- 允许源加上可选的基本路径。

## <a id="security-model"></a> 安全模型

<AccordionGroup>
  <Accordion id="viewer-hardening" title="观察者硬化">
    - 默认仅允许回环访问。
    - 带令牌的查看器路径，并对 ID 和令牌模式进行严格验证。
    - 查看者响应 CSP：`default-src 'none'`。脚本和资源仅从自身加载。查看器不发出出站 `connect-src` 请求。
    - 启用远程访问时远程未命中限制：每 60 秒 40 次失败会触发 60 秒锁定 （`429 Too Many Requests`）。

  </Accordion>
  <Accordion id="file-rendering-hardening" title="文件渲染强化">
    - 截图浏览器请求路由采用默认拒绝策略。
    - 仅允许来自 `http://127.0.0.1/plugins/diffs/assets/*` 的本地 viewer 资源。
    - 外部网络请求被阻止。

  </Accordion>
</AccordionGroup>

## <a id="browser-requirements-for-file-mode"></a> 文件模式的浏览器要求

`mode: "file"` 和 `mode: "both"` 需要 Chromium- 兼容的浏览器。

解析顺序：

<Steps>
  <Step id="config" title="配置">
    OpenClaw 配置中的 `browser.executablePath`。
  </Step>
  <Step id="environment-variables" title="环境变量">
    - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
    - `BROWSER_EXECUTABLE_PATH`
    - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`

  </Step>
  <Step id="platform-fallback" title="平台回退">
    Chrome、Chromium、Edge 和 Brave 的常见安装路径，以及 `PATH` 查找。
  </Step>
</Steps>

常见失败信息：`Diff PNG/PDF rendering requires a Chromium-compatible browser...`。可以通过安装 Chrome、Chromium、Edge 或 Brave，或者设置上述任一可执行文件路径选项来解决。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="input-validation-errors" title="输入验证错误">
    - `Provide patch or both before and after text.` -- 请同时提供 `before` 和 `after`，或者提供 `patch`。
    - `Provide either patch or before/after input, not both.` -- 不要混合使用输入模式。
    - `Invalid baseUrl: ...` -- 使用具有可选路径的 `http(s)` 原点，无 query/hash.
    - `{field} exceeds maximum size (...)` -- 减少负载大小。
    - Large patch rejection -- 减少 patch 文件数量或总行数。

  </Accordion>
  <Accordion id="viewer-accessibility" title="观众可访问性">
    - 默认情况下，Viewer URL 解析为 `127.0.0.1`。
    - 如需远程访问，请设置 `gateway.publicOrigin`、设置插件的 `viewerBaseUrl`，或按次调用传入 `baseUrl`。
    - `gateway.trustedProxies` 可以包括同一主机代理（例如 Tailscale Serve）的环回。然后，没有转发 client-IP 标头的原始环回查看器请求将被设计拒绝。
    - 对于该代理拓扑，首选 `mode: "file"`/`"both"` 作为附件。对于可共享的查看器链接，请有意启用 `security.allowRemoteViewer` 以及插件 `viewerBaseUrl`/a 代理 `baseUrl`。
    - 仅当确实需要外部查看器访问时，才启用 `security.allowRemoteViewer`。

  </Accordion>
  <Accordion id="unmodified-lines-row-has-no-expand-button" title="未修改的行没有展开按钮">
    预计补丁输入缺乏可扩展的上下文。这不是观众的失败。
  </Accordion>
  <Accordion id="artifact-not-found" title="未找到文物">
    - 制品因 TTL 过期。
    - Token 或路径已更改。
    - 清理操作移除了过期数据。

  </Accordion>
</AccordionGroup>

## <a id="operational-guidance"></a> 操作指南

- 首选 `mode: "view"` 在浏览器中进行本地交互式评论。
- 需要附件的外部聊天频道中，优先使用 `mode: "file"`。
- 保持 `allowRemoteViewer` 禁用，除非您的部署需要远程查看器 URL。
- 对于敏感差异，请设置明确且较短的 `ttlSeconds`。
- 在不需要时，避免在差异输入中发送密钥。
- 如果你的频道会对图片进行强压缩（例如 Telegram 或 WhatsApp），请优先使用 PDF 输出（`fileFormat: "pdf"`）。

<Note>
差异渲染引擎由 [Diffs](https://diffs.com) 提供支持。
</Note>

## <a id="related"></a> 相关内容

- [浏览器](/tools/browser)
- [插件](/tools/plugin)
- [工具概览](/tools)
- [`apply_patch`](/tools/apply-patch) — 生成这些编辑的工具
