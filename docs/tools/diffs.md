---
title: "Diffs"
summary: "Read-only diff viewer and file renderer for agents (optional plugin tool)"
read_when:
  - 你希望代理显示代码或 Markdown 修改的差异
  - 你需要画布就绪的查看器 URL 或渲染的差异文件
  - 你需要受控、临时的差异工件，并有安全的默认设置
---

# Diffs（差异）

`diffs` 是一个可选插件工具，带有简短的内置系统指导和一个配套技能，将变更内容转换为代理使用的只读差异工件。

它接收以下两种输入之一：

- `before` 和 `after` 文本
- 统一 `patch` 补丁

它可以返回：

- 用于画布展示的网关查看器 URL
- 用于消息传递的渲染文件路径（PNG 或 PDF）
- 一次调用同时返回以上两者

启用后，插件会在系统提示空间中预置简明的使用说明，同时还提供详细的技能指导，供代理需要更完整的指令时使用。

## 快速上手

1. 启用插件。
2. 在画布优先的流程中，调用 `diffs` 并设置 `mode: "view"`。
3. 在聊天文件传递流程中，调用 `diffs` 并设置 `mode: "file"`。
4. 当需要同时获得两种工件时，调用 `diffs` 并设置 `mode: "both"`。

## 启用插件

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

## 禁用内置系统指导

如果你想保持 `diffs` 工具启用，但禁用内置的系统提示指导，设置 `plugins.entries.diffs.hooks.allowPromptInjection` 为 `false`：

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

这会阻止 diffs 插件的 `before_prompt_build` 钩子执行，但仍保留插件、工具和配套技能可用。

如果你想同时禁用指导和工具，则应禁用插件本身。

## 典型代理工作流程

1. 代理调用 `diffs`。
2. 代理读取返回的 `details` 字段。
3. 代理根据需要：
   - 使用 `canvas present` 打开 `details.viewerUrl`
   - 通过消息将 `details.filePath` 发送出去，使用键名是 `path` 或 `filePath`
   - 或者同时执行以上两个操作

## 输入示例

前后文本对比示例：

```json
{
  "before": "# Hello\n\nOne",
  "after": "# Hello\n\nTwo",
  "path": "docs/example.md",
  "mode": "view"
}
```

补丁示例：

```json
{
  "patch": "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1 +1 @@\n-const x = 1;\n+const x = 2;\n",
  "mode": "both"
}
```

## 工具输入参考

所有字段均为可选，除非另有说明：

- `before` (`string`): original text. Required with `after` when `patch` is omitted.
- `after` (`string`): updated text. Required with `before` when `patch` is omitted.
- `patch` (`string`): unified diff text. Mutually exclusive with `before` and `after`.
- `path` (`string`): display filename for before and after mode.
- `lang` (`string`): language override hint for before and after mode.
- `title` (`string`): viewer title override.
- `mode` (`"view" | "file" | "both"`): output mode. Defaults to plugin default `defaults.mode`.
  Deprecated alias: `"image"` behaves like `"file"` and is still accepted for backward compatibility.
- `theme` (`"light" | "dark"`): viewer theme. Defaults to plugin default `defaults.theme`.
- `layout` (`"unified" | "split"`): diff layout. Defaults to plugin default `defaults.layout`.
- `expandUnchanged` (`boolean`): expand unchanged sections when full context is available. Per-call option only (not a plugin default key).
- `fileFormat` (`"png" | "pdf"`): rendered file format. Defaults to plugin default `defaults.fileFormat`.
- `fileQuality` (`"standard" | "hq" | "print"`): quality preset for PNG or PDF rendering.
- `fileScale` (`number`): device scale override (`1`-`4`).
- `fileMaxWidth` (`number`): max render width in CSS pixels (`640`-`2400`).
- `ttlSeconds` (`number`): viewer artifact TTL in seconds. Default 1800, max 21600.
- `baseUrl` (`string`): viewer URL origin override. Must be `http` or `https`, no query/hash.

校验和限制：

- `before` 和 `after` 字段最大各 512 KiB。
- `patch` 最大 2 MiB。
- `path` 最大 2048 字节。
- `lang` 最大 128 字节。
- `title` 最大 1024 字节。
- 补丁复杂度限制：最多 128 个文件，120000 行总数。
- 不允许同时提交 `patch` 与 `before` 或 `after`。
- 渲染文件安全限制（PNG 和 PDF 通用）：
  - `fileQuality: "standard"`：最大 8 百万像素（8,000,000 渲染像素）。
  - `fileQuality: "hq"`：最大 14 百万像素。
  - `fileQuality: "print"`：最大 24 百万像素。
  - PDF 最大页数 50 页。

## 输出详情约定

工具返回结构化元数据于 `details` 字段。

生成查看器的模式共享字段：

- `artifactId`
- `viewerUrl`
- `viewerPath`
- `title`
- `expiresAt`
- `inputKind`
- `fileCount`
- `mode`
- `context` (`agentId`, `sessionId`, `messageChannel`, `agentAccountId` when available)

渲染 PNG 或 PDF 时的文件相关字段：

- `artifactId`
- `expiresAt`
- `filePath`
- `path`（与 `filePath` 值相同，兼容消息工具）
- `fileBytes`
- `fileFormat`
- `fileQuality`
- `fileScale`
- `fileMaxWidth`

模式行为总结：

- `mode: "view"`：仅返回查看器相关字段。
- `mode: "file"`：仅返回文件相关字段，不生成查看器工件。
- `mode: "both"`：返回查看器和文件字段。如果文件渲染失败，仍返回查看器且带有 `fileError`。

## 折叠的未修改部分

- 查看器可显示类似 `N unmodified lines`（N 行未修改）的行。
- 这些行上的展开控制是条件性的，并非每种输入类型都保证出现。
- 当渲染的差异包含可展开的上下文数据时，通常会出现展开按钮，这在使用前后文本输入时很常见。
- 许多统一补丁输入中，被省略的上下文不在解析后的补丁分块里，因此这类行不会显示展开按钮，这是预期行为。
- `expandUnchanged` 选项仅在有可展开上下文时生效。

## 插件默认配置

在 `~/.openclaw/openclaw.json` 中设置全插件默认值：

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

支持的默认配置项：

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

显示传入参数优先于默认值。

## 安全配置

- `security.allowRemoteViewer`（`boolean`，默认 `false`）
  - `false`：查看器路由非本地请求被拒绝。
  - `true`：只要令牌路径有效，允许远程访问查看器。

示例：

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

## 工件生命周期和存储

- 工件存储于临时子目录：`$TMPDIR/openclaw-diffs`。
- 查看器工件元数据包含：
  - 随机工件 ID（20 个十六进制字符）
  - 随机令牌（48 个十六进制字符）
  - `createdAt` 和 `expiresAt` 时间戳
  - 存储的 `viewer.html` 路径
- 查看器默认 TTL 为 30 分钟（未指定时）。
- 最大允许查看器 TTL 为 6 小时。
- 清理任务在工件创建后机会性执行。
- 过期工件会被删除。
- 备选清理会删除缺失元数据且超过 24 小时的陈旧文件夹。

## 查看器 URL 和网络行为

查看器路由：

- `/plugins/diffs/view/{artifactId}/{token}`

查看器资源：

- `/plugins/diffs/assets/viewer.js`
- `/plugins/diffs/assets/viewer-runtime.js`

URL 构建逻辑：

- 如果提供了 `baseUrl`，经严格验证后使用。
- 否则查看器 URL 默认为本地回环地址 `127.0.0.1`。
- 当网关绑定模式为 `custom` 且设置了 `gateway.customBindHost` 时，使用该主机。

`baseUrl` 规则：

- 必须以 `http://` 或 `https://` 开头。
- 不允许查询字符串和哈希。
- 允许源地址加上可选的基础路径。

## 安全模型

查看器强化措施：

- 默认为只监听本地回环。
- 查看器路径加令牌访问，严格验证 ID 和令牌。
- 查看器响应的内容安全策略（CSP）：
  - `default-src 'none'`
  - 脚本和资源仅限自源
  - 禁止外发的 `connect-src`
- 远程访问启用时的访问失败限速：
  - 每 60 秒允许 40 次失败
  - 持续 60 秒的锁定（返回 `429 Too Many Requests`）

文件渲染强化：

- 截图浏览器请求默认拒绝。
- 仅允许加载本地查看器资源：`http://127.0.0.1/plugins/diffs/assets/*`。
- 阻止外部网络请求。

## 文件模式的浏览器要求

`mode: "file"` 和 `mode: "both"` 需要兼容 Chromium 的浏览器。

查找顺序：

1. OpenClaw 配置中的 `browser.executablePath`。
2. 环境变量：
   - `OPENCLAW_BROWSER_EXECUTABLE_PATH`
   - `BROWSER_EXECUTABLE_PATH`
   - `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`
3. 平台命令路径查找回退。

常见失败提示：

- `Diff PNG/PDF rendering requires a Chromium-compatible browser...`

解决方法：安装 Chrome、Chromium、Edge 或 Brave，或设置上述可执行路径。

## 故障排除

输入校验错误：

- `Provide patch or both before and after text.`
  - 需要同时提供 `before` 和 `after`，或提供 `patch`。
- `Provide either patch or before/after input, not both.`
  - 不得混用输入模式。
- `Invalid baseUrl: ...`
  - 请使用支持的 `http(s)` 源，不带查询和哈希。
- `{field} exceeds maximum size (...)`
  - 减小有效负载大小。
- 大补丁被拒绝
  - 减少补丁文件数量或总行数。

查看器访问问题：

- 查看器 URL 默认解析为 `127.0.0.1`。
- 远程访问时，必须：
  - 每次调用传入 `baseUrl`，或者
  - 使用 `gateway.bind=custom` 和 `gateway.customBindHost` 设置
- 仅当需要远程访问时才启用 `security.allowRemoteViewer`。

未修改行无法展开：

- 补丁输入时，若补丁不包含可展开上下文，这种情况常见。
- 属于预期行为，不是查看器故障。

工件未找到：

- 因 TTL 到期被删除。
- 令牌或路径发生更改。
- 清理任务删除了陈旧数据。

## 运行建议

- 本地互动审阅优先使用 `mode: "view"`。
- 需要发送附件的外发聊天渠道优先使用 `mode: "file"`。
- 除非需要远程查看器 URL，建议关闭 `allowRemoteViewer`。
- 对敏感差异设置短期的 `ttlSeconds`。
- 避免在不必要时通过差异输入发送机密信息。
- 若通道强制压缩图片（如 Telegram、WhatsApp），建议使用 PDF 输出（`fileFormat: "pdf"`）。

差异渲染引擎：

- 由 [Diffs](https://diffs.com) 提供技术支持。

## 相关文档

- [工具概览](/tools)
- [插件](/tools/plugin)
- [浏览器](/tools/browser)
