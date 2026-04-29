---
summary: "OpenClaw 浏览器控制 API、CLI 参考和脚本操作"
read_when:
  - 通过本地控制 API 对代理浏览器进行脚本编写或调试
  - 查找 `openclaw browser` CLI 参考
  - 使用快照和 ref 添加自定义浏览器自动化
title: "浏览器控制 API"
---

有关安装、配置和故障排除，请参见 [Browser](/tools/browser)。
本页是本地控制 HTTP API、`openclaw browser`
CLI 以及脚本模式（快照、ref、等待、调试流程）的参考文档。

## 控制 API（可选）

仅用于本地集成时，Gateway 提供了一个小型回环 HTTP API：

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

某些功能（navigate/act/AI snapshot/role snapshot、元素截图、
PDF）需要 Playwright。如果未安装 Playwright，这些端点会返回
清晰的 501 错误。

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

如果你看到 `Playwright is not available in this gateway build`，请修复
捆绑的浏览器插件运行时依赖，确保已安装 `playwright-core`，
然后重启 gateway。对于打包安装，请运行 `openclaw doctor --fix`。
对于 Docker，还需要按如下所示安装 Chromium 浏览器二进制文件。

#### Docker 中安装 Playwright

如果你的 Gateway 运行在 Docker 中，请避免使用 `npx playwright`（npm 覆盖冲突）。
请改用捆绑的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`），并确保 `/home/node` 通过 `OPENCLAW_HOME_VOLUME` 或绑定挂载持久化。参见 [Docker](/install/docker)。

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
openclaw browser screenshot --ref 12        # 或 --ref e12
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
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
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

- `upload` 和 `dialog` 是**预先准备**调用；请在触发选择器/对话框的点击/按键之前运行它们。
- `click`/`type` 等需要来自 `snapshot` 的 `ref`（数字 `12`、role ref `e12`，或可操作的 ARIA ref `ax12`）。CSS 选择器有意不支持用于操作。仅当可见视口位置是唯一可靠目标时，使用 `click-coords`。
- 下载、trace 和上传路径受 OpenClaw 临时根目录限制：`/tmp/openclaw{,/downloads,/uploads}`（回退：`${os.tmpdir()}/openclaw/...`）。
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。

当 OpenClaw 能够证明替换后的标签页时，例如相同 URL 或提交表单后单个旧标签页变成单个新标签页，稳定的标签页 id 和标签会在 Chromium 原始 target 替换时保持不变。原始 target id 仍然是易变的；在脚本中优先使用 `tabs` 返回的 `suggestedTargetId`。

快照标志一览：

- `--format ai`（使用 Playwright 时默认）：带数字 refs 的 AI 快照（`aria-ref="<n>"`）。
- `--format aria`：带 `axN` refs 的可访问性树。可用 Playwright 时，OpenClaw 会将 refs 与后端 DOM id 绑定到实时页面，因此后续操作可以使用它们；否则请将输出视为仅供检查。
- `--efficient`（或 `--mode efficient`）：紧凑的角色快照预设。将 `browser.snapshotDefaults.mode: "efficient"` 设为默认值（参见 [Gateway 配置](/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 会强制使用带 `ref=e12` refs 的角色快照。`--frame "<iframe>"` 将角色快照限定到 iframe。
- `--labels` 会添加带覆盖 ref 标签的仅视口截图（打印 `MEDIA:<path>`）。
- `--urls` 会在 AI 快照中附加已发现的链接目的地。

## 快照和 ref

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字 refs）**: `openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字 refs 的文本快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在内部，ref 通过 Playwright 的 `aria-ref` 解析。

- **Role 快照（类似 `e12` 的 role refs）**: `openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：带有 `[ref=e12]`（以及可选 `[nth=1]`）的基于 role 的列表/树。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在内部，ref 通过 `getByRole(...)` 解析（重复项还会加上 `nth()`）。
  - 添加 `--labels` 以包含带有叠加 `e12` 标签的视口截图。
  - 当链接文本含义不明确、且代理需要具体
    导航目标时，添加 `--urls`。

- **ARIA 快照（类似 `ax12` 的 ARIA refs）**: `openclaw browser snapshot --format aria`
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

## 等待增强功能

你可以等待的不只是时间/文本：

- 等待 URL（Playwright 支持 glob）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 谓词：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待某个选择器变为可见：
  - `openclaw browser wait "#main"`

这些可以组合使用：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 调试工作流

当某个操作失败时（例如“not visible”、“strict mode violation”、“covered”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在交互模式下优先使用 role refs）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 正在定位什么
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 进行深度调试：录制 trace：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop`（打印 `TRACE:<path>`）

## JSON 输出

`--json` 用于脚本和结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的 Role 快照包含 `refs`，以及一个小的 `stats` 块（lines/chars/refs/interactive），方便工具推断负载大小和密度。

## 状态和环境开关

这些对于“让站点表现得像 X 一样”的工作流很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线：`set offline on|off`
- 请求头：`set headers --headers-json '{"X-Debug":"1"}'`（旧的 `set headers --json '{"X-Debug":"1"}'` 仍受支持）
- HTTP basic auth：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区 / 区域设置：`set timezone ...`、`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- openclaw browser 配置文件可能包含已登录会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  会在页面上下文中执行任意 JavaScript。提示注入可能会影响其行为。
  如果不需要，请通过 `browser.evaluateEnabled=false` 禁用它。
- 关于登录和反机器人提示（X/Twitter 等），请参见 [Browser login + X/Twitter posting](/tools/browser-login)。
- 保持 Gateway/node 主机私有（仅回环或仅 tailnet 可访问）。
- 远程 CDP 端点能力很强；请通过隧道并加以保护。

严格模式示例（默认阻止私有/内部目标）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // 可选的精确允许
    },
  },
}
```

## 相关内容

- [Browser](/tools/browser) — 概览、配置、配置文件、安全性
- [Browser login](/tools/browser-login) — 登录网站
- [Browser Linux troubleshooting](/tools/browser-linux-troubleshooting)
- [Browser WSL2 troubleshooting](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
