---
summary: "OpenClaw 浏览器控制 API、CLI 参考和脚本操作"
read_when:
  - 通过本地控制 API 对代理浏览器进行脚本编写或调试
  - 查找 `openclaw browser` CLI 参考
  - 使用快照和 ref 添加自定义浏览器自动化
title: "浏览器控制 API"
---

有关安装、配置和故障排除，请参见 [浏览器](/tools/browser)。
本页是本地控制 HTTP API、`openclaw browser`
CLI 以及脚本模式（快照、ref、等待、调试流程）的参考文档。

## 控制 API（可选）

仅用于本地集成。Gateway 会暴露一个小型回环 HTTP API。
该独立服务器是可选启用的——在 gateway 服务环境中设置环境变量
`OPENCLAW_EAGER_BROWSER_CONTROL_SERVER=1`，
并在 HTTP 端点可用之前重启 gateway。若不设置此变量，浏览器控制运行时仍可通过 CLI 和
代理工具工作，但不会有任何服务监听回环控制端口。

- 状态/启动/停止：`GET /`, `POST /start`, `POST /stop`
- 标签页：`GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`, `POST /screenshot`
- 操作：`POST /navigate`, `POST /act`
- 钩子：`POST /hooks/file-chooser`, `POST /hooks/dialog`
- 下载：`POST /download`, `POST /wait/download`
- 权限：`POST /permissions/grant`
- 调试：`GET /console`, `POST /pdf`
- 调试：`GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- 状态：`GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- 设置：`POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

所有端点都接受 `?profile=<name>`。`POST /start?headless=true` 会请求一次性无头启动，仅适用于本地托管配置文件，且不会更改持久化的浏览器配置；仅附加、远程 CDP 和现有会话配置文件会拒绝该覆盖，因为 OpenClaw 不会启动这些浏览器进程。

对于标签页端点，`targetId` 是兼容字段名。优先传递来自 `GET /tabs` 或 `POST /tabs/open` 的 `suggestedTargetId`；标签和 `tabId`
句柄（如 `t1`）也被接受。原始 CDP target id 和唯一的原始
target-id 前缀仍然可用，但它们是易变的诊断句柄。

如果配置了共享密钥网关认证，浏览器 HTTP 路由也需要认证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码的 HTTP Basic 认证

注意：

- 这个独立的回环浏览器 API **不会**消费可信代理或
  Tailscale Serve 身份头。
- 如果 `gateway.auth.mode` 为 `none` 或 `trusted-proxy`，这些回环浏览器
  路由不会继承这些带身份的模式；请将其仅用于回环。

### `/act` 错误契约

`POST /act` 针对路由级验证和策略失败使用结构化错误响应：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前 `code` 值：

- `ACT_KIND_REQUIRED`（HTTP 400）：缺少 `kind` 或无法识别。
- `ACT_INVALID_REQUEST`（HTTP 400）：操作负载规范化或验证失败。
- `ACT_SELECTOR_UNSUPPORTED`（HTTP 400）：`selector` 用于不支持该操作种类的操作。
- `ACT_EVALUATE_DISABLED`（HTTP 403）：配置禁用了 `evaluate`（或 `wait --fn`）。
- `ACT_TARGET_ID_MISMATCH`（HTTP 403）：顶层或批处理的 `targetId` 与请求目标冲突。
- `ACT_EXISTING_SESSION_UNSUPPORTED`（HTTP 501）：现有会话配置文件不支持该操作。

其他运行时失败仍可能返回不含 `code` 字段的 `{ "error": "<message>" }`。

### Playwright 要求

某些功能（navigate/act/AI 快照/role 快照、元素截图、
PDF）需要 Playwright。如果未安装 Playwright，这些端点会返回
明确的 501 错误。

不使用 Playwright 仍可用的功能：

- ARIA 快照
- 基于角色的可访问性快照（`--interactive`、`--compact`、
  `--depth`、`--efficient`），前提是每个标签页可用 CDP WebSocket。这是
  用于检查和 ref 发现的回退方案；Playwright 仍是主要的
  操作引擎。
- 当每个标签页可用 CDP WebSocket 时，受管的 `openclaw` 浏览器的页面截图
- `existing-session` / Chrome MCP 配置文件的页面截图
- 来自快照输出的 `existing-session` 基于 ref 的截图（`--ref`）

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- 依赖于 Playwright 原生 AI 快照格式的 AI 快照
- 基于 CSS 选择器的元素截图（`--element`）
- 完整的浏览器 PDF 导出

元素截图也会拒绝 `--full-page`；该路由会返回 `fullPage is
not supported for element screenshots`。

如果你看到 `Playwright is not available in this gateway build`，说明打包的
Gateway 缺少核心浏览器运行时依赖。请重新安装或更新
OpenClaw，然后重启 gateway。对于 Docker，还请按如下所示安装 Chromium
浏览器二进制文件。

#### Docker 中安装 Playwright

如果你的 Gateway 运行在 Docker 中，请避免使用 `npx playwright`（npm 覆盖冲突）。
对于自定义镜像，请将 Chromium 烘焙进镜像：

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

对于现有镜像，请改为通过捆绑的 CLI 安装：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`），并确保 `/home/node` 通过
`OPENCLAW_HOME_VOLUME` 或绑定挂载进行持久化。OpenClaw 会在 Linux 上自动检测持久化的
Chromium。参见 [Docker](/install/docker)。

## 工作原理（内部）

一个小型回环控制服务器接收 HTTP 请求，并通过 CDP 连接到基于 Chromium 的浏览器。高级操作（click/type/snapshot/PDF）通过 CDP 上层的 Playwright 执行；当缺少 Playwright 时，仅可用非 Playwright 操作。代理看到的是一个稳定接口，而本地/远程浏览器和配置文件可在其下自由切换。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 以定位特定配置文件，并接受 `--json` 以输出机器可读结果。

<AccordionGroup>

<Accordion title="基础：状态、标签页、打开/聚焦/关闭">

```bash
openclaw browser status
openclaw browser start
openclaw browser start --headless # 本地托管的一次性无头启动
openclaw browser stop            # 也会清除附加仅/远程 CDP 的仿真
openclaw browser tabs
openclaw browser tab             # 当前标签页的快捷方式
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="检查：截图、快照、控制台、错误、请求">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # 或使用 --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion title="操作：navigate、click、type、drag、wait、evaluate">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # 或使用 e12 表示 role refs
openclaw browser click-coords 120 340        # 视口坐标
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser upload media://inbound/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser evaluate --fn 'const title = document.title; return title;'
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="状态：cookies、storage、offline、headers、geo、device">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear 用于移除
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

注意：

- `upload` 和 `dialog` 是**预置**调用；请在触发选择器/对话框的 click/press 之前运行它们。如果某个操作打开了模态窗口，动作响应会包含 `blockedByDialog` 和 `browserState.dialogs.pending`；将该 `dialogId` 传入即可直接响应。在 OpenClaw 外部处理的对话框会出现在 `browserState.dialogs.recent` 中。
- `click`/`type` 等操作需要来自 `snapshot` 的 `ref`（数字 `12`、role ref `e12`，或可操作的 ARIA ref `ax12`）。CSS 选择器有意不支持用于操作。只有可见视口位置是唯一可靠目标时，请使用 `click-coords`。
- 下载和 trace 路径受 OpenClaw 临时根目录限制：`/tmp/openclaw{,/downloads}`（回退：`${os.tmpdir()}/openclaw/...`）。
- `upload` 接受来自 OpenClaw 临时上传根目录以及 OpenClaw 管理的传入媒体中的文件。管理的传入媒体可通过 `media://inbound/<id>`、沙箱相对路径 `media/inbound/<id>` 或受管传入媒体目录中的解析路径来引用。嵌套媒体引用、路径遍历、符号链接、硬链接以及任意本地路径仍会被拒绝。
- `upload` 还可通过 `--input-ref` 或 `--element` 直接设置文件输入。

当 OpenClaw 能够证明替换后的标签页时，例如相同 URL 或提交表单后单个旧标签页变成单个新标签页，稳定的标签页 id 和标签会在 Chromium 原始 target 替换时保持不变。原始 target id 仍然是易变的；在脚本中优先使用 `tabs` 返回的 `suggestedTargetId`。

快照标志一览：

- `--format ai` (默认，使用 Playwright)：带数字 refs 的 AI 快照（`aria-ref="<n>"`）。
- `--format aria`：带 `axN` refs 的可访问性树。在 Playwright 可用时，OpenClaw 会将 refs 与后端 DOM id 绑定到实时页面，因此后续操作可以使用它们；否则应将输出仅视为检查用途。
- `--efficient`（或 `--mode efficient`）：紧凑的 role 快照预设。设置 `browser.snapshotDefaults.mode: "efficient"` 可将其设为默认值（参见 [Gateway 配置](/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 会强制使用带 `ref=e12` refs 的 role 快照。`--frame "<iframe>"` 会将 role 快照限定到某个 iframe。
- 在使用 Playwright 时，`--labels` 会添加带有叠加 ref 标签的截图
  （输出 `MEDIA:<path>`），并附带一个 `annotations` 数组，其中包含每个 ref 的边界
  框。在 `screenshot` 中，基于 Playwright 的标签支持 `--full-page`、`--ref` 和 `--element`；在 `snapshot` 中，附带的截图仍然
  仅限视口。现有会话/chrome-mcp 配置文件会在页面截图上渲染叠加标签，但不会返回 `annotations` 或使用 Playwright 的
  full-page/ref/element 投影助手。没有 Playwright 或 chrome-mcp 时，
  不可用带标签的截图。
- `--urls` 会将发现的链接目标附加到 AI 快照中。

## 快照和 ref

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字 refs）**：`openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字 refs 的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在内部，ref 通过 Playwright 的 `aria-ref` 解析。

- **Role snapshot（类似 `e12` 的 role refs）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带有 `[ref=e12]`（以及可选 `[nth=1]`）的基于 role 的列表/树。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在内部，ref 通过 `getByRole(...)`（以及重复项的 `nth()`）解析。
  - 添加 `--labels` 可包含一张带叠加 `e12` 标签的截图。在
    基于 Playwright 的配置文件中，这还会返回每个 ref 的边界框元数据
    （`annotations[]`）。
  - 当链接文本含糊且代理需要明确的导航目标时，添加 `--urls`。

- **ARIA 快照（类似 `ax12` 的 ARIA refs）**：`openclaw browser snapshot --format aria`
  - 输出：作为结构化节点的可访问性树。
  - 操作：当快照路径能够通过 Playwright 和 Chrome 后端 DOM id 绑定
    ref 时，`openclaw browser click ax12` 可正常工作。
- 如果 Playwright 不可用，ARIA 快照仍然可用于
  检查，但 refs 可能无法执行操作。在需要可操作 refs 时，请使用 `--format ai`
  或 `--interactive` 重新生成快照。
- 原始 CDP 回退路径的 Docker 证明：`pnpm test:docker:browser-cdp-snapshot`
  会以 CDP 启动 Chromium，运行 `browser doctor --deep`，并验证 role
  快照包含链接 URL、由鼠标指针提升为可点击的元素，以及 iframe 元数据。

Ref 行为：

- Refs 在**导航之间不稳定**；如果某些操作失败，请重新运行 `snapshot` 并使用新的 ref。
- 当 `/act` 能够证明替换标签页时，它会返回动作触发替换后的当前原始 `targetId`。后续命令请继续使用稳定的标签页 id/label。
- 如果 role 快照是用 `--frame` 生成的，那么在下一次 role 快照之前，role refs 都限定在该 iframe 内。
- 未知或过期的 `axN` refs 会快速失败，而不会退回到 Playwright 的 `aria-ref` 选择器。发生这种情况时，请在同一标签页上运行新的快照。

## Waiting for enhancements

You can wait for more than just time/text:

- Wait for URL (Playwright supports glob):
  - `openclaw browser wait --url "**/dash"`
- Wait for load state:
  - `openclaw browser wait --load networkidle`
  - Supported on managed `openclaw` and raw/remote CDP profiles. The `user` and `existing-session` profiles reject `networkidle`; use `--url`, `--text`, a selector, or `--fn` waits there.
- Wait for a JS predicate:
  - `openclaw browser wait --fn "window.ready===true"`
- Wait for a selector to become visible:
  - `openclaw browser wait "#main"`

These can be combined:

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Debugging workflow

When an action fails (for example, “not visible”, “strict mode violation”, “obscured”):

1. `openclaw browser snapshot --interactive`
2. Use `click <ref>` / `type <ref>` (prefer role refs in interactive mode)
3. If it still fails: `openclaw browser highlight <ref>` to see what Playwright is targeting
4. If the page behaves strangely:
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. Deep debug: record a trace:
   - `openclaw browser trace start`
   - Reproduce the issue
   - `openclaw browser trace stop` (prints `TRACE:<path>`)

## JSON output

`--json` is for scripts and structured tools.

Examples:

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

The Role snapshot in JSON includes `refs`, plus a small `stats` block (lines/chars/refs/interactive), which helps tools infer payload size and density.

## State and environment switches

These are useful for workflows like “make the site behave like X”:

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Storage: `storage local|session get|set|clear`
- Offline: `set offline on|off`
- Request headers: `set headers --headers-json '{"X-Debug":"1"}'` (the older `set headers --json '{"X-Debug":"1"}'` is still supported)
- HTTP basic auth: `set credentials user pass` (or `--clear`)
- Geolocation: `set geo <lat> <lon> --origin "https://example.com"` (or `--clear`)
- Media: `set media dark|light|no-preference|none`
- Timezone / locale: `set timezone ...`, `set locale ...`
- Device / viewport:
  - `set device "iPhone 14"` (Playwright device preset)
  - `set viewport 1280 720`

## Security and privacy

- openclaw browser profiles may contain logged-in sessions; treat them as sensitive.
- `browser act kind=evaluate` / `openclaw browser evaluate` and `wait --fn`
  execute arbitrary JavaScript in the page context. Prompt injection may affect them.
  If not needed, disable it with `browser.evaluateEnabled=false`.
- `openclaw browser evaluate --fn` accepts function source, expressions, or
  statement bodies. Statement bodies are wrapped as async functions, so use `return`
  to return the value you want. When your frontend function may need longer than the default evaluate timeout,
  use `--timeout-ms <ms>`.
- For login and anti-bot notes (X/Twitter etc.), see [Browser login + X/Twitter posting](/tools/browser-login).
- Keep Gateway/node hosts private (loopback or tailnet only).
- Remote CDP endpoints are highly privileged; tunnel them and protect them carefully.

Strict mode example (defaults to blocking private/internal targets):

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // optional exact allow
    },
  },
}
```

## Related

- [Browser](/tools/browser) - overview, configuration, profiles, security
- [Browser login](/tools/browser-login) - log in to websites
- [Browser Linux troubleshooting](/tools/browser-linux-troubleshooting)
- [Browser WSL2 troubleshooting](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
