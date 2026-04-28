---
summary: "OpenClaw 浏览器控制 API、CLI 参考和脚本操作"
read_when:
  - 通过本地控制 API 对代理浏览器进行脚本编写或调试
  - 查找 `openclaw browser` CLI 参考
  - 使用 snapshots 和 refs 添加自定义浏览器自动化
title: "浏览器控制 API"
---

有关设置、配置和故障排除，请参阅 [Browser](/tools/browser)。
本页是本地控制 HTTP API、`openclaw browser`
CLI 以及脚本模式（snapshots、refs、wait、debug flows）的参考。

## 控制 API（可选）

仅用于本地集成时，Gateway 提供一个小型回环 HTTP API：

- 状态/启动/停止: `GET /`, `POST /start`, `POST /stop`
- 标签页: `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- Snapshot/截图: `GET /snapshot`, `POST /screenshot`
- 操作: `POST /navigate`, `POST /act`
- 钩子: `POST /hooks/file-chooser`, `POST /hooks/dialog`
- 下载: `POST /download`, `POST /wait/download`
- 权限: `POST /permissions/grant`
- 调试: `GET /console`, `POST /pdf`
- 调试: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- 网络: `POST /response/body`
- 状态: `GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- 状态: `GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- 设置: `POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

所有端点都接受 `?profile=<name>`。

如果配置了共享密钥 Gateway 身份验证，浏览器 HTTP 路由也需要认证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用该密码的 HTTP Basic 认证

注意：

- 这个独立的回环浏览器 API **不会** 消耗受信任代理或
  Tailscale Serve 身份头。
- 如果 `gateway.auth.mode` 为 `none` 或 `trusted-proxy`，这些回环浏览器
  路由不会继承这些携带身份的模式；请仅将其用于回环环境。

### `/act` 错误契约

`POST /act` 为路由级校验和
策略失败使用结构化错误响应：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前 `code` 值：

- `ACT_KIND_REQUIRED`（HTTP 400）：`kind` 缺失或无法识别。
- `ACT_INVALID_REQUEST`（HTTP 400）：操作负载在规范化或校验时失败。
- `ACT_SELECTOR_UNSUPPORTED`（HTTP 400）：`selector` 用于不受支持的操作类型。
- `ACT_EVALUATE_DISABLED`（HTTP 403）：`evaluate`（或 `wait --fn`）被配置禁用。
- `ACT_TARGET_ID_MISMATCH`（HTTP 403）：顶层或批处理的 `targetId` 与请求目标冲突。
- `ACT_EXISTING_SESSION_UNSUPPORTED`（HTTP 501）：现有会话配置不支持该操作。

其他运行时失败仍可能返回 `{ "error": "<message>" }`，而没有
`code` 字段。

### Playwright 要求

某些功能（navigate/act/AI snapshot/role snapshot、元素截图、
PDF）需要 Playwright。如果未安装 Playwright，这些端点会返回
明确的 501 错误。

在没有 Playwright 的情况下仍可工作的功能：

- ARIA snapshots
- 当可用每个标签页的 CDP
  WebSocket 时，托管的 `openclaw` 浏览器的页面截图
- `existing-session` / Chrome MCP 配置文件的页面截图
- 来自 snapshot 输出的 `existing-session` 基于 ref 的截图（`--ref`）

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- AI snapshots / role snapshots
- CSS 选择器元素截图（`--element`）
- 完整浏览器 PDF 导出

元素截图也会拒绝 `--full-page`；该路由返回
`fullPage is not supported for element screenshots`。

如果你看到 `Playwright is not available in this gateway build`，请修复
捆绑浏览器插件运行时依赖，确保已安装 `playwright-core`，
然后重启 gateway。对于打包安装，请运行 `openclaw doctor --fix`。
对于 Docker，还需要按如下所示安装 Chromium 浏览器二进制文件。

#### Docker Playwright 安装

如果你的 Gateway 运行在 Docker 中，请避免使用 `npx playwright`（npm 覆盖冲突）。
请改用捆绑的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载，请设置 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`），并确保 `/home/node` 通过
`OPENCLAW_HOME_VOLUME` 或绑定挂载得以持久化。参见 [Docker](/install/docker)。

## 工作原理（内部）

一个小型回环控制服务器接收 HTTP 请求，并通过 CDP 连接到基于 Chromium 的浏览器。高级操作（click/type/snapshot/PDF）在 CDP 之上通过 Playwright 进行；当 Playwright 缺失时，仅可使用非 Playwright 操作。代理在本地/远程浏览器和配置文件在其下自由切换时，看到的是一个稳定接口。

## CLI 快速参考

所有命令都接受 `--browser-profile <name>` 以指定某个配置文件，以及 `--json` 以获得机器可读输出。

<AccordionGroup>

<Accordion title="基础：状态、标签页、打开/聚焦/关闭">

```bash
openclaw browser status
openclaw browser start
openclaw browser stop            # 连接到仅附加/远程 CDP 时也会清除仿真设置
openclaw browser tabs
openclaw browser tab             # 当前标签页快捷方式
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="检查：截图、snapshot、console、errors、requests">

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
openclaw browser click 12 --double           # 或使用 e12 作为 role refs
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

- `upload` 和 `dialog` 是 **arming** 调用；请在触发选择器/对话框的 click/press 之前运行它们。
- `click`/`type` 等操作需要来自 `snapshot` 的 `ref`（数字 `12` 或 role ref `e12`）。CSS 选择器有意不支持用于操作。
- 下载、trace 和上传路径受 OpenClaw 临时根目录限制：`/tmp/openclaw{,/downloads,/uploads}`（备用：`${os.tmpdir()}/openclaw/...`）。
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。

Snapshot 标志一览：

- `--format ai`（Playwright 下默认）：带有数字 refs 的 AI snapshot（`aria-ref="<n>"`）。
- `--format aria`：辅助功能树，无 refs；仅用于检查。
- `--efficient`（或 `--mode efficient`）：紧凑的 role snapshot 预设。设置 `browser.snapshotDefaults.mode: "efficient"` 可将其设为默认值（参见 [Gateway configuration](/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 会强制使用带 `ref=e12` refs 的 role snapshot。`--frame "<iframe>"` 将 role snapshot 限定在某个 iframe 内。
- `--labels` 会添加带叠加 ref 标签的仅视口截图（打印 `MEDIA:<path>`）。
- `--urls` 会将发现的链接目标附加到 AI snapshots。

## Snapshots 和 refs

OpenClaw 支持两种 “snapshot” 风格：

- **AI snapshot（数字 refs）**：`openclaw browser snapshot`（默认；`--format ai`）
  - 输出：包含数字 refs 的文本 snapshot。
  - 操作：`openclaw browser click 12`，`openclaw browser type 23 "hello"`。
  - 内部上，ref 通过 Playwright 的 `aria-ref` 解析。

- **Role snapshot（类似 `e12` 的 role refs）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出：基于 role 的列表/树，包含 `[ref=e12]`（以及可选的 `[nth=1]`）。
  - 操作：`openclaw browser click e12`，`openclaw browser highlight e12`。
  - 内部上，ref 通过 `getByRole(...)`（以及重复项的 `nth()`）解析。
  - 添加 `--labels` 可包含带叠加 `e12` 标签的视口截图。
  - 当链接文本含糊、代理需要明确
    导航目标时，添加 `--urls`。

ref 行为：

- refs 在导航之间**不会保持稳定**；如果某些操作失败，请重新运行 `snapshot` 并使用新的 ref。
- 如果 role snapshot 是使用 `--frame` 采集的，则 role refs 会限定在该 iframe 中，直到下一次 role snapshot。

## 等待增强功能

你可以等待的不只是时间/文本：

- 等待 URL（Playwright 支持通配符）：
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

当某个操作失败时（例如：“不可见”、“严格模式违规”、“被覆盖”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在交互模式下优先使用角色引用）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 正在定位什么
4. 如果页面表现异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 如需深度调试：录制 trace：
   - `openclaw browser trace start`
   - 重现问题
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

JSON 中的角色快照包含 `refs` 以及一个小的 `stats` 块（lines/chars/refs/interactive），以便工具能够推断负载大小和密度。

## 状态和环境开关

这些对于“让网站表现得像 X”这类工作流很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线：`set offline on|off`
- 请求头：`set headers --headers-json '{"X-Debug":"1"}'`（仍支持旧版 `set headers --json '{"X-Debug":"1"}'`）
- HTTP 基本认证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区 / 区域设置：`set timezone ...`、`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- openclaw browser 配置文件可能包含已登录会话；请将其视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  会在页面上下文中执行任意 JavaScript。提示注入可能会影响它。
  如果不需要，可通过 `browser.evaluateEnabled=false` 将其禁用。
- 有关登录和反机器人注意事项（X/Twitter 等），请参见 [Browser login + X/Twitter posting](/tools/browser-login)。
- 保持 Gateway/node 主机私有（仅限回环或 tailnet）。
- 远程 CDP 端点功能强大；请通过隧道并加以保护。

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

## 相关内容

- [浏览器](/tools/browser) — 概览、配置、配置文件、安全性
- [浏览器登录](/tools/browser-login) — 登录网站
- [浏览器 Linux 故障排查](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
