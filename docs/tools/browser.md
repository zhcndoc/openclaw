---
summary: "集成浏览器控制服务 + 操作命令"
read_when:
  - 添加代理控制的浏览器自动化
  - 调试为何 openclaw 干扰了你自己的 Chrome
  - 在 macOS 应用中实现浏览器设置和生命周期
title: "浏览器（OpenClaw 管理）"
---

# 浏览器（openclaw 管理）

OpenClaw 可以运行一个 **专用的 Chrome/Brave/Edge/Chromium 配置文件**，由代理控制。  
它与您的个人浏览器隔离，并通过网关（仅环回接口）内部一个小型本地控制服务进行管理。

初学者视角：

- 把它当作一个 **独立的，只允许代理使用的浏览器**。
- `openclaw` 配置文件**不会接触**您的个人浏览器配置文件。
- 代理可以在安全通道中 **打开标签页、读取页面、点击和输入**。
- 默认的 `chrome` 配置文件通过扩展中继使用 **系统默认的 Chromium 浏览器**；切换到 `openclaw` 即可使用隔离管理的浏览器。

## 你将获得

- 一个名为 **openclaw** 的独立浏览器配置文件（默认橙色风格）。
- 确定性的标签页控制（列出/打开/聚焦/关闭）。
- 代理操作（点击/输入/拖拽/选择）、快照、截屏、PDF 导出。
- 可选的多配置文件支持（`openclaw`、`work`、`remote` 等）。

此浏览器 **不是您的日常使用浏览器**，它是用于代理自动化和验证的安全隔离环境。

## 快速开始

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果提示“浏览器已禁用”，请在配置中启用（见下文），然后重启网关。

## 配置文件：`openclaw` vs `chrome`

- `openclaw`：托管的、隔离的浏览器（不需要扩展）。
- `chrome`：通过扩展中继连接您的**系统浏览器**（需要在标签页安装 OpenClaw 扩展）。

如果您希望默认使用托管模式，请设置 `browser.defaultProfile: "openclaw"`。

## 配置

浏览器设置存放于 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // 默认值：true
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // 默认信任网络模式
      // allowPrivateNetwork: true, // 旧别名
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // 旧版单配置文件覆盖
    remoteCdpTimeoutMs: 1500, // 远程 CDP HTTP 超时（毫秒）
    remoteCdpHandshakeTimeoutMs: 3000, // 远程 CDP WebSocket 握手超时（毫秒）
    defaultProfile: "chrome",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

备注：

- 浏览器控制服务绑定在环回接口端口，端口从 `gateway.port` 派生（默认：`18791`，即网关端口 + 2），中继使用下一个端口（`18792`）。
- 如果覆盖了网关端口（`gateway.port` 或环境变量 `OPENCLAW_GATEWAY_PORT`），浏览器端口也会相应调整。
- 未设置时，`cdpUrl` 默认为中继端口。
- `remoteCdpTimeoutMs` 用于远程（非环回）CDP 连接检查的超时。
- `remoteCdpHandshakeTimeoutMs` 用于远程 CDP WebSocket 握手的超时。
- 浏览器导航/打开标签页在导航前进行 SSRF 保护，导航后对最终 `http(s)` URL 尽力重新检查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 默认是 `true`（信任网络模式），设置为 `false` 可严格限制为仅公共网络访问。
- `browser.ssrfPolicy.allowPrivateNetwork` 仍作为旧别名保留兼容。
- `attachOnly: true` 表示“永不启动本地浏览器；仅在浏览器已运行时附加”。
- `color` 和每个配置文件的 `color` 用于染色浏览器 UI，方便区分当前激活配置。
- 默认配置文件是 `openclaw`（OpenClaw 管理的独立浏览器），使用 `defaultProfile: "chrome"` 切换到 Chrome 扩展中继。
- 自动检测顺序：系统默认 Chromium 浏览器；否则依次 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本地 `openclaw` 配置文件会自动分配 `cdpPort` / `cdpUrl`，只有远程 CDP 需要手动设置。

## 使用 Brave（或其他基于 Chromium 的浏览器）

如果您的 **系统默认** 浏览器是基于 Chromium（Chrome/Brave/Edge 等），OpenClaw 会自动使用它。  
可通过设置 `browser.executablePath` 来覆盖自动检测：

CLI 示例：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## 本地与远程控制

- **本地控制（默认）**：网关启动环回控制服务，并可启动本地浏览器。
- **远程控制（节点宿主）**：在安装浏览器机器上运行节点宿主，网关代理浏览器操作至该节点。
- **远程 CDP**：通过设置 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）连接远程 Chromium 浏览器。此时 OpenClaw 不会启动本地浏览器。

远程 CDP URL 可包含认证信息：

- 查询令牌（例如 `https://provider.example?token=<token>`）
- HTTP 基本认证（例如 `https://user:pass@provider.example`）

OpenClaw 会在调用 `/json/*` 端点及连接 CDP WebSocket 时保留认证信息。建议使用环境变量或密钥管理服务存储令牌，避免写入配置文件。

## 节点浏览器代理（零配置默认）

如果您在有浏览器的机器上运行 **节点宿主**，OpenClaw 可以自动将浏览器工具调用路由至该节点，无需额外浏览器配置。  
这是远程网关的默认方案。

说明：

- 节点宿主通过 **代理命令** 提供本地浏览器控制服务器。
- 配置文件来自节点自身的 `browser.profiles`（与本地一致）。
- 若想禁用：
  - 节点端：设置 `nodeHost.browserProxy.enabled=false`
  - 网关端：设置 `gateway.nodes.browser.mode="off"`

## Browserless（托管远程 CDP）

[Browserless](https://browserless.io) 是一个托管的 Chromium 服务，提供 HTTPS 上的 CDP 端点。  
您可以将 OpenClaw 浏览器配置文件指向某 Browserless 区域端点，并使用 API 密钥认证。

示例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

备注：

- 将 `<BROWSERLESS_API_KEY>` 替换为您的真实 Browserless 令牌。
- 选择与您的 Browserless 账户相匹配的区域端点（详见其文档）。

## 直接 WebSocket CDP 提供商

一些托管浏览器服务暴露**直接的 WebSocket**端点，而非标准基于 HTTP 的 CDP 发现（`/json/version`）。OpenClaw 两者均支持：

- **HTTP(S) 端点**（如 Browserless）— OpenClaw 调用 `/json/version` 发现 WebSocket 调试器 URL，然后连接。
- **WebSocket 端点**（`ws://` / `wss://`）— OpenClaw 直接连接，跳过 `/json/version`。适用于诸如 [Browserbase](https://www.browserbase.com) 或任何提供 WebSocket URL 的服务。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一个云平台，提供无头浏览器运行，内置验证码解决、隐身模式和住宅代理。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

说明：

- [注册账户](https://www.browserbase.com/sign-up)并从 [概览面板](https://www.browserbase.com/overview)复制您的 **API Key**。
- 将 `<BROWSERBASE_API_KEY>` 替换为真实的 Browserbase API 密钥。
- Browserbase 在 WebSocket 连接时自动创建浏览器会话，无需手动管理会话步骤。
- 免费套餐允许一个并发会话和每月一小时浏览器使用时间。付费计划详情见 [价格说明](https://www.browserbase.com/pricing)。
- 详见 [Browserbase 文档](https://docs.browserbase.com) 获取完整 API 参考、SDK 指南和集成示例。

## 安全性

关键点：

- 浏览器控制仅限环回接口；访问需经过网关认证或节点配对。
- 若启用浏览器控制且未配置认证，OpenClaw 会在启动时自动生成 `gateway.auth.token` 并保存至配置。
- 保持网关和节点宿主在私有网络（如 Tailscale）中，避免暴露到公网上。
- 远程 CDP URL 和令牌视为敏感信息，推荐使用环境变量或密钥管理服务。

远程 CDP 建议：

- 优先使用加密协议（HTTPS 或 WSS）以及短期令牌。
- 避免在配置文件中硬编码长期有效令牌。

## 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件类型包括：

- **openclaw 管理**：专用 Chromium 浏览器实例，拥有独立用户数据目录及 CDP 端口。
- **远程**：指向运行在其他机器上的 Chromium 浏览器的 CDP URL。
- **扩展中继**：通过本地中继 + Chrome 扩展，用现有 Chrome 标签控制。

默认：

- 如果缺失，自动创建 `openclaw` 配置文件。
- 内置 `chrome` 配置文件用于 Chrome 扩展中继（默认指向 `http://127.0.0.1:18792`）。
- 本地 CDP 端口默认为 **18800–18899** 范围内分配。
- 删除配置文件时，相应的本地数据目录会被移至回收站。

所有控制端点支持使用 `?profile=<name>`，CLI 使用 `--browser-profile`。

## Chrome 扩展中继（使用现有 Chrome）

OpenClaw 也可以通过本地 CDP 中继 + Chrome 扩展，驱动您**现有的 Chrome 标签页**（无需单独的 “openclaw” Chrome 实例）。

完整指南见：[Chrome 扩展](/tools/chrome-extension)

流程：

- 网关在本机运行，或节点宿主在具备浏览器的机器上运行。
- 本地**中继服务器**监听环回地址的 `cdpUrl`（默认 `http://127.0.0.1:18792`）。
- 您点击标签页上的 **OpenClaw Browser Relay** 扩展图标以完成附加（不会自动附加）。
- 代理通过选择正确配置文件，使用正常的 `browser` 工具控制该标签。

若网关运行于另一台机器，需在浏览器机器运行节点宿主，供网关代理浏览器操作。

### 沙箱化会话

若代理会话处于沙箱模式，`browser` 工具默认目标可能是 `target="sandbox"`（沙盒浏览器）。  
Chrome 扩展中继需要主机浏览器控制，因此需要：

- 让会话非沙箱化，  
- 或设置 `agents.defaults.sandbox.browser.allowHostControl: true`，并调用时指定 `target="host"`。

### 设置步骤

1. 加载扩展（开发者模式/加载未打包扩展）：

```bash
openclaw browser extension install
```

- Chrome 打开 `chrome://extensions`，启用“开发者模式”。
- 点击“加载已解压的扩展程序”，选择 `openclaw browser extension path` 输出的目录。
- 固定扩展图标，点击想控制的标签页图标（徽章显示 `ON`）。

2. 使用：

- CLI 示例：`openclaw browser --browser-profile chrome tabs`。
- 代理工具调用：用 `browser`，指定 `profile="chrome"`。

可选：若需用自定义名称或不同中继端口，创建配置文件：

```bash
openclaw browser create-profile \
  --name my-chrome \
  --driver extension \
  --cdp-url http://127.0.0.1:18792 \
  --color "#00AA00"
```

说明：

- 此模式依赖 Playwright-on-CDP 提供大多数操作支持（截图/快照/动作）。
- 点击扩展图标再次可断开连接。
- 默认保持中继仅环回监听。如需跨网络命名空间访问（例如 WSL2 中的网关，Windows 上的 Chrome），设置 `browser.relayBindHost` 为明确绑定地址如 `0.0.0.0`，并保证网络私密并认证。

WSL2 / 跨命名空间示例：

```json5
{
  browser: {
    enabled: true,
    relayBindHost: "0.0.0.0",
    defaultProfile: "chrome",
  },
}
```

## 隔离保障

- **独立用户数据目录**：绝不触及您的个人浏览器配置。
- **专属端口**：避开默认 `9222`，防止与开发工具冲突。
- **确定性标签控制**：通过 `targetId` 精确定位标签，而非“最后一个标签”。

## 浏览器选择

本地启动时，OpenClaw 按顺序尝试首个可用浏览器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

可通过 `browser.executablePath` 手动覆盖。

平台支持：

- macOS：检查 `/Applications` 和 `~/Applications`。
- Linux：查找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等可执行文件。
- Windows：检查常见安装路径。

## 控制 API（可选）

仅本地集成，网关暴露一个小型环回 HTTP API：

- 状态/启动/停止：`GET /`、`POST /start`、`POST /stop`
- 标签页：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/截图：`GET /snapshot`、`POST /screenshot`
- 操作：`POST /navigate`、`POST /act`
- 钩子：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 调试：`GET /console`、`POST /pdf`
- 调试：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 状态：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端点支持 `?profile=<name>`。

如果配置了网关认证，浏览器 HTTP 路由也需要认证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或 HTTP Basic 认证密码

### Playwright 依赖

部分功能（导航/动作/AI 快照/角色快照、元素截图、PDF）依赖 Playwright。  
若未安装 Playwright，相关端点会返回明确的 501 错误。  
ARIA 快照和基础截图对 OpenClaw 管理的 Chrome 仍可使用。  
Chrome 扩展中继驱动下，ARIA 快照和截图需要 Playwright。

如果收到 `Playwright is not available in this gateway build`，请安装完整 Playwright 包（非 `playwright-core`），然后重启网关；或者重新安装带有浏览器支持的 OpenClaw。

#### Docker 中安装 Playwright

若网关在 Docker 中运行，避免使用 `npx playwright`（防止 NPM 冲突）。  
可用内置 CLI 安装：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要持久化浏览器下载位置，设置环境变量 `PLAYWRIGHT_BROWSERS_PATH`（例如 `/home/node/.cache/ms-playwright`），并确保路径 `/home/node` 被 `OPENCLAW_HOME_VOLUME` 或绑定挂载持久化。详细见 [Docker](/install/docker)。

## 工作原理（内部）

流程概要：

- 一个小型 **控制服务器** 接收 HTTP 请求。
- 通过 **CDP** 连接 Chromium 浏览器（Chrome/Brave/Edge/Chromium）。
- 高级操作（点击/输入/快照/PDF）基于 CDP 上层的 **Playwright**。
- 若未安装 Playwright，仅提供非 Playwright 的基本操作。

此设计保证代理接口稳定明确，同时支持本地/远程浏览器和多配置文件切换。

## CLI 快速参考

所有命令支持 `--browser-profile <name>` 指定配置文件。  
支持 `--json` 选项以获取机器易解析的格式（payload 固定）。

基础命令：

- `openclaw browser status`
- `openclaw browser start`
- `openclaw browser stop`
- `openclaw browser tabs`
- `openclaw browser tab`
- `openclaw browser tab new`
- `openclaw browser tab select 2`
- `openclaw browser tab close 2`
- `openclaw browser open https://example.com`
- `openclaw browser focus abcd1234`
- `openclaw browser close abcd1234`

检查命令：

- `openclaw browser screenshot`
- `openclaw browser screenshot --full-page`
- `openclaw browser screenshot --ref 12`
- `openclaw browser screenshot --ref e12`
- `openclaw browser snapshot`
- `openclaw browser snapshot --format aria --limit 200`
- `openclaw browser snapshot --interactive --compact --depth 6`
- `openclaw browser snapshot --efficient`
- `openclaw browser snapshot --labels`
- `openclaw browser snapshot --selector "#main" --interactive`
- `openclaw browser snapshot --frame "iframe#main" --interactive`
- `openclaw browser console --level error`
- `openclaw browser errors --clear`
- `openclaw browser requests --filter api --clear`
- `openclaw browser pdf`
- `openclaw browser responsebody "**/api" --max-chars 5000`

操作命令：

- `openclaw browser navigate https://example.com`
- `openclaw browser resize 1280 720`
- `openclaw browser click 12 --double`
- `openclaw browser click e12 --double`
- `openclaw browser type 23 "hello" --submit`
- `openclaw browser press Enter`
- `openclaw browser hover 44`
- `openclaw browser scrollintoview e12`
- `openclaw browser drag 10 11`
- `openclaw browser select 9 OptionA OptionB`
- `openclaw browser download e12 report.pdf`
- `openclaw browser waitfordownload report.pdf`
- `openclaw browser upload /tmp/openclaw/uploads/file.pdf`
- `openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `openclaw browser dialog --accept`
- `openclaw browser wait --text "Done"`
- `openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `openclaw browser evaluate --fn '(el) => el.textContent' --ref 7`
- `openclaw browser highlight e12`
- `openclaw browser trace start`
- `openclaw browser trace stop`

状态命令：

- `openclaw browser cookies`
- `openclaw browser cookies set session abc123 --url "https://example.com"`
- `openclaw browser cookies clear`
- `openclaw browser storage local get`
- `openclaw browser storage local set theme dark`
- `openclaw browser storage session clear`
- `openclaw browser set offline on`
- `openclaw browser set headers --headers-json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

备注：

- `upload` 和 `dialog` 是 **预处理** 调用；请在触发文件选择/对话框的点击或按键之前运行。
- 下载和 trace 输出路径限制在 OpenClaw 临时根目录：
  - traces：`/tmp/openclaw`（备选：`${os.tmpdir()}/openclaw`）
  - downloads：`/tmp/openclaw/downloads`（备选：`${os.tmpdir()}/openclaw/downloads`）
- 上传路径限制在 OpenClaw 临时上传根目录：
  - uploads：`/tmp/openclaw/uploads`（备选：`${os.tmpdir()}/openclaw/uploads`）
- `upload` 也可以通过 `--input-ref` 或 `--element` 直接设置文件输入。
- `snapshot`:
  - `--format ai`（Playwright 安装时默认）：返回带数字引用的 AI 快照（`aria-ref="<n>"`）。
  - `--format aria`：返回辅助功能树（无引用，仅查看用）。
  - `--efficient`（或 `--mode efficient`）：紧凑角色快照预设（交互式 + 紧凑 + 深度限制 + 更低字符数）。
  - 配置默认（工具/CLI）：设置 `browser.snapshotDefaults.mode: "efficient"` ，未传入模式时使用紧凑模式。
  - 角色快照参数（`--interactive`、`--compact`、`--depth`、`--selector`）强制角色快照，附带 `ref=e12` 形式标识。
  - `--frame "<iframe 选择器>"` 限制作用域到 iframe（与 `e12` 等角色引用配合使用）。
  - `--interactive` 输出扁平且易选的交互元素列表（便于操作驱动）。
  - `--labels` 附加带叠加引用标签的视口截图（打印 `MEDIA:<路径>`）。
- `click`/`type`/等需使用从 `snapshot` 返回的 `ref` ，可用数字 `12` 或角色引用 `e12`。故意不支持 CSS 选择器。

## 快照与引用（refs）

OpenClaw 支持两种“快照”样式：

- **AI 快照（数字引用）**：`openclaw browser snapshot`（默认，`--format ai`）
  - 输出文本快照，包含数字引用。
  - 操作示例：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 内部通过 Playwright 的 `aria-ref` 实现。

- **角色快照（角色引用如 `e12`）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 输出角色列表树，带 `[ref=e12]`（可选 `[nth=1]`）。
  - 操作示例：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 内部通过 `getByRole(...)` 并结合 `nth()` 来定位。
  - 加 `--labels` 生成带叠加标签的视口截图。

引用行为：

- 引用在导航后不保证稳定；若失败请重新生成快照并使用新的引用。
- 角色快照用 `--frame` 采集时，引用限制在该 iframe 范围内，直至下次角色快照。

## 等待增强

您可以等待的不仅是时间或文本：

- 等待 URL（Playwright 支持的通配符）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
- 等待 JS 条件：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待元素可见：
  - `openclaw browser wait "#main"`

可组合使用：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 调试流程

操作失败（如“不显示”、“严格模式违规”、“被覆盖”）时：

1. 执行 `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（建议交互模式下用角色引用）
3. 若仍失败：执行 `openclaw browser highlight <ref>`，查看 Playwright 定位目标
4. 页面异常时：
   - 清空错误：`openclaw browser errors --clear`
   - 清空请求：`openclaw browser requests --filter api --clear`
5. 深度调试时录制 trace：
   - `openclaw browser trace start`
   - 重现问题
   - `openclaw browser trace stop`（打印 `TRACE:<路径>`）

## JSON 输出

`--json` 用于脚本或结构化工具。

示例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

角色快照 JSON 包含 `refs` 和小型 `stats`（行/字符数/引用数/交互元素数），方便工具分析负载大小与密度。

## 状态与环境调节

适合“让站点表现为 X” 的场景：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线模式：`set offline on|off`
- 头部信息：`set headers --headers-json '{"X-Debug":"1"}'`（旧版 `set headers --json '{"X-Debug":"1"}'` 继续支持）
- HTTP 基本认证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <纬度> <经度> --origin "https://example.com"`（或 `--clear`）
- 媒体模式：`set media dark|light|no-preference|none`
- 时区 / 语言环境：`set timezone ...`、`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## 安全与隐私

- openclaw 浏览器配置文件可能含已登录的会话，请视为敏感信息。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn` 会执行页面上下文中任意 JS，可能受提示注入控制。  
  如不需要，设置 `browser.evaluateEnabled=false` 禁用。
- 登录及防刷提示（X/Twitter 等），参考 [浏览器登录 + X/Twitter 发布](/tools/browser-login)。
- 保持网关/节点宿主私有（仅环回或 Tailscale 网络）。
- 远程 CDP 端点权限强大，务必使用隧道保护。

严格模式示例（默认阻断私有/内网目的地）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // 可选精确允许
    },
  },
}
```

## 故障排查

针对 Linux 特有问题（尤其 snap 安装的 Chromium），请参见  
[浏览器故障排查](/tools/browser-linux-troubleshooting)。

针对 WSL2 网关 + Windows Chrome 跨主机部署问题，请参见  
[WSL2 + Windows + 远程 Chrome CDP 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## 代理工具 + 控制机制

代理获得 **一个工具** 用于浏览器自动化：

- `browser` — 查询状态/启动/停止/标签页操作/打开/聚焦/关闭/快照/截图/导航/动作

映射说明：

- `browser snapshot` 返回稳定的 UI 树（AI 或 ARIA 格式）。
- `browser act` 使用快照返回的 `ref` ID 来点击/输入/拖拽/选择。
- `browser screenshot` 捕获像素（全页或单元素）。
- `browser` 支持：
  - `profile` 选择命名浏览器配置（openclaw、chrome 或远程 CDP）。
  - `target`（`sandbox` | `host` | `node`）选择浏览器运行位置。
  - 沙箱化会话中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 若不指定，沙箱会话默认 `sandbox`，非沙箱会话默认 `host`。
  - 连接了浏览器能力的节点时，工具可根据情况自动路由，除非指定固定 `target="host"` 或 `target="node"`。

此设计保证代理工具行为确定，避免易碎的选择器问题。
