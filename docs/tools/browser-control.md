---
summary: "OpenClaw 浏览器控制 API、CLI 参考和脚本操作"
read_when:
  - "通过本地控制 API 对代理浏览器进行脚本编写或调试"
  - "查找 `openclaw browser` CLI 参考"
  - "使用快照和 ref 添加自定义浏览器自动化"
title: "浏览器控制 API"
---

有关安装、配置和故障排除，请参见 [浏览器](/tools/browser)。 本页是本地控制 HTTP API、`openclaw browser` CLI 以及脚本模式（快照、ref、等待、调试流程）的参考文档。

## <a id="control-api-(optional)"></a><a id="control-api-optional"></a> Control API（可选）

仅用于本地集成。Gateway 会暴露一个小型回环 HTTP API。 该独立服务器是可选启用的——在 gateway 服务环境中设置环境变量 `OPENCLAW_EAGER_BROWSER_CONTROL_SERVER=1`， 并在 HTTP 端点可用之前重启 gateway。若不设置此变量，浏览器控制运行时仍可通过 CLI 和代理工具工作，但不会有任何服务监听回环控制端口。

- Status/start/stop: `GET /`, `GET /doctor`, `POST /start`, `POST /stop`, `POST /reset-profile`
- 配置文件：`GET /profiles`、`POST /profiles/create`、`DELETE /profiles/:name`
- 标签页：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`、`POST /tabs/action`
- Snapshot/screenshot/stream: `GET /snapshot`, `POST /screenshot`, `POST /screencast`
- 操作：`POST /navigate`、`POST /act`
- 钩子：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下载：`POST /download`、`POST /wait/download`
- 权限：`POST /permissions/grant`
- 调试：`GET /console`、`GET /errors`、`GET /requests`、`GET /dialogs`、`POST /pdf`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 网络：`POST /response/body`
- 状态：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`、`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 设置：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

`POST /tabs/action` 是 CLI 内部用于 `browser tab` 子命令 （`{"action":"new"|"label"|"select"|"close"|"list", ...}`） 的批处理形式。直接编写脚本时，首选上面的单一用途选项卡路由。

所有端点均接受 `?profile=<name>`。 `POST /start?headless=true` 请求本地托管配置文件的一次性无头启动，而不更改持久的浏览器配置。仅附加、远程 CDP 和现有会话配置文件拒绝该覆盖，因为 OpenClaw 不会启动这些浏览器进程。

对于选项卡端点，`targetId` 是兼容性字段名称。优先从 `GET /tabs` 或 `POST /tabs/open` 传递 `suggestedTargetId`。也接受标签和 `tabId` 手柄，例如 `t1`。原始 CDP 目标 ID 和独特的原始目标 ID 前缀仍然有效，但它们是不稳定的诊断句柄。选项卡句柄的范围仅限于浏览器主机或节点和配置文件。发出后续请求时，请保留该路由与句柄。

对于使用 `driver: "extension"`、`GET /tabs` 配置的配置文件，浏览器工具还可以返回 `webExtensionTabId`、同一选项卡的运行时范围数字 Chrome WebExtensions 选项卡 ID。对于其他驱动程序或扩展元数据不可用时，将省略此字段。仅在调用 WebExtensions API 时使用；继续对 OpenClaw 浏览器操作使用 `suggestedTargetId` 或 `tabId`，因为 `webExtensionTabId` 可能会在浏览器或扩展程序重新连接后发生更改。

Control UI 的 `browser.request` 网关方法接受 `target: "host"` 来固定网关主机，或接受 `target: "node"` 和 `node: "<node-id>"` 来固定浏览器节点。传递 `query.profile` 中的配置文件。显式路由不会回退到另一台主机。省略它们会保留配置的自动路由。这些路由字段不会授予访问权限或更改浏览器策略。

浏览器预览需要具有已知路线的 `browser` 工具的结果。来自其他工具的浏览器形状的元数据不会触发屏幕截图或更改面板的选择。这些结果仍然是普通的工具输出。

当选项卡列出期间 URL 验证失败时，选项卡将保留其标识和标题，但返回 `url: ""` 和 `urlUnavailableReason`：

- `navigation_blocked`：导航规则拒绝该地址。
- `navigation_check_failed`：OpenClaw 无法验证地址，例如因为 DNS 查找失败。刷新一下再检查一下。

空的 URL 本身并不表示策略拒绝。导航策略错误也带有 `reason: "navigation_blocked"`。原始阻止的 URL 和 DNS 详细信息不包含在该元数据中。选项卡列表是观察，而不是授权：每个后续内容读取或操作仍然强制执行自己的检查。

如果配置了共享密钥网关身份验证，浏览器 HTTP 路由也需要身份验证：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>`，或使用该密码的 HTTP Basic 认证

注意：

- 这个独立的回环浏览器 API **不会**消费可信代理或 Tailscale Serve 身份头。
- 如果`gateway.auth.mode`是`none`或`trusted-proxy`，则这些环回浏览器路由不会继承这些身份承载模式。让它们仅环回。

### <a id="screencast-stream"></a> 截屏流

`POST /screencast` 为所选选项卡的实时视图铸造一次性令牌。在 JSON 主体中传递可选的 `targetId`、`maxWidth`、`maxHeight` 和 `quality`。尺寸默认为 1280，并限制为 320 到 2000 之间的整数。JPEG 质量默认为 70，并限制为 30 到 90。

响应内容为`token`、`wsPath`、`expiresAtMs`、`targetId`、`url`。针对网关 URL 解析 `wsPath` 并在那里打开 WebSocket：`/browser/screencast?token=<token>`。 48个字符的十六进制令牌将在60秒后过期，并且只能消耗一次。升级前，无效、过期和重复使用的令牌将被拒绝，并显示 HTTP 401。查看者不发送应用程序消息。二进制查看器消息关闭连接。

通过网关铸造的票证和观众将绑定到请求的网关连接。结束该连接将撤销未使用的票证并关闭其查看器。在网关套接字完成关闭之前，已撤销（无效）的连接会立即被隔离：它们的票证无法升级，并且它们的查看者不会收到进一步的帧或元数据。环回 HTTP 控制 API 没有要绑定的网关连接，因此其票证仅保留 TTL-。

该插件为每个配置文件和选项卡共享一个 CDP 截屏视频。 Chrome 在重绘时发送 JPEG 帧，速度约为每秒 20 帧。慢速观看者会跳过帧而不是建立队列。导航立即退出捕获会话。新的 CDP 会话仅在地址被允许后启动，因此前一个文档中的延迟帧无法进入新流。被拒绝的导航会停止流。

文本消息为 JSON，`ready`、`meta` 或 `error` 中的 `type`。 `ready`消息包括`targetId`、`url`和`title`。 `meta` 在允许导航和页面加载后更新 `url` 和 `title`。二进制消息包含：

1. A 四字节无符号大端 JSON 标头长度。
2. UTF-8 JSON 的字节数：`{ "url", "cssWidth", "cssHeight", "scrollX", "scrollY", "ts" }`。
3. JPEG 字节。

`cssWidth` 和 `cssHeight` 来自 CDP 的 `deviceWidth` 和 `deviceHeight` 元数据，并以 CSS 像素描述布局视口。 `scrollX`和`scrollY`来自`scrollOffsetX`和`scrollOffsetY`。 `ts` 是 CDP 帧时间戳。

| 关闭代码 | 含义                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| 4001       | 令牌无效或过期（通常在使用 HTTP 401 升级之前被拒绝）                                   |
| 4003       | `navigation_blocked`                                                                                        |
| 4004       | `target_closed`，包括配置文件生命周期更改                                                       |
| 4005       | 不支持流媒体                                                                                       |
| 4006       | `authority_revoked`（请求网关连接结束或无效，e.g. 设备令牌已撤销） |
| 1012       | 网关关闭                                                                                       |

Chrome MCP 现有会话配置文件和缺失的 Playwright 返回 HTTP 501，其中包含 `code: "SCREENCAST_UNSUPPORTED"` 和 `reason: "existing-session"` 或 `"playwright"`。 Node- 路由请求在使用 `INVALID_REQUEST` 进行代理之前失败，并详细信息 `{ "code": "SCREENCAST_UNSUPPORTED", "reason": "node" }`。当流媒体不可用时，Control UI 会回退到现有的屏幕截图路线。导航元数据更新选项卡和地址栏。显示的图像保留其自己的 URL 和指标，直到替换帧到达。当“注释”或“检查”处于活动状态时，Control UI 会固定捕获的图像及其 URL，然后在捕获模式结束时显示最新保持的帧。

### <a id="%2Fact-error-contract"></a><a id="/act-error-contract"></a> `/act` 错误契约

`POST /act` 使用结构化错误响应来进行验证、策略和识别的交互失败：

```json
{ "error": "<message>", "code": "ACT_*" }
```

当前 `code` 值：

- `ACT_KIND_REQUIRED`（HTTP 400）：缺少 `kind` 或无法识别。
- `ACT_INVALID_REQUEST`（HTTP 400）：操作负载规范化或验证失败。
- `ACT_SELECTOR_UNSUPPORTED`（HTTP 400）：`selector` 用于不支持该操作种类的操作。
- `ACT_EVALUATE_DISABLED`（HTTP 403）：配置禁用了 `evaluate`（或 `wait --fn`）。
- `ACT_TARGET_ID_MISMATCH`（HTTP 403）：顶层或批处理的 `targetId` 与请求目标冲突。
- `ACT_OPERATION_FAILED` （HTTP 500）：所选元素无法执行操作，例如不可编辑的输入、覆盖的控件或不明确的引用。该消息描述了交互失败，但未将其视为浏览器连接中断。
- `ACT_EXISTING_SESSION_UNSUPPORTED`（HTTP 501）：现有会话配置文件不支持该操作。

其他运行时故障可能仍会返回没有 `code` 字段的 `{ "error": "<message>" }`。

### <a id="playwright-requirement"></a> Playwright 要求

某些功能（navigate/act/AI snapshot/role 快照、元素屏幕截图、PDF）需要 Playwright。如果未安装 Playwright，这些端点将返回明确的 501 错误。

不使用 Playwright 仍可用的功能：

- ARIA 快照
- 当每个选项卡 CDP WebSocket 可用时， 角色样式辅助功能快照（`--interactive`、`--compact`、`--depth`、`--efficient`）。这是检查和参考发现的后备措施。 Playwright 仍然是主要动作引擎。
- 当每个标签页可用 CDP WebSocket 时，受管的 `openclaw` 浏览器的页面截图
- `existing-session`／Chrome MCP 配置文件的页面截图
- 来自快照输出的 `existing-session` 基于 ref 的截图（`--ref`）

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- 依赖于 Playwright 原生 AI 快照格式的 AI 快照
- CSS-选择器元素屏幕截图（`--element`）
- 完整浏览器 PDF 导出

元素屏幕截图也拒绝 `--full-page`。该路由返回 `fullPage is not supported for element screenshots`。

如果你看到 `Playwright is not available in this gateway build`，说明打包的 Gateway 缺少核心浏览器运行时依赖。请重新安装或更新 OpenClaw，然后重启 gateway。对于 Docker，还请按如下所示安装 Chromium 浏览器二进制文件。

#### <a id="docker-playwright-install"></a> 在 Docker 中安装 Playwright

如果你的 Gateway 运行在 Docker 中，请避免使用 `npx playwright`（npm 覆盖冲突）。 对于自定义镜像，请将 Chromium 烘焙进镜像：

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

浏览器还需要系统库，因此在一次性 Compose 容器中安装 Chromium 并不持久。使用 `OPENCLAW_INSTALL_BROWSER=1` 重建映像。要保留浏览器下载和其他缓存，请使用 `OPENCLAW_HOME_VOLUME` 或绑定安装来保留 `/home/node`。请参阅 [Docker](/install/docker)。

## <a id="how-it-works-(internal)"></a><a id="how-it-works-internal"></a> 工作原理（内部）

小型环回控制服务器接受 HTTP 请求并通过 CDP 连接到基于 Chromium- 的浏览器。高级操作 （click/type/snapshot/PDF） 通过 CDP 之上的 Playwright。当 Playwright 缺失时，仅非 Playwright 操作可用。代理看到一个稳定的界面，而 local/remote 浏览器和配置文件可以在下面自由交换。

## <a id="cli-quick-reference"></a> CLI 快速参考

所有命令都接受 `--browser-profile <name>` 以定位特定配置文件，并接受 `--json` 以输出机器可读结果。

<AccordionGroup>

<Accordion id="basics-status-tabs-open-focus-close" title="基础知识：状态、选项卡、open/focus/close">

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep    # add a live snapshot check
openclaw browser start
openclaw browser start --headless # one-shot local managed headless launch
openclaw browser stop            # also clears emulation on attach-only/remote CDP
openclaw browser reset-profile   # moves the profile's browser data to Trash
openclaw browser tabs
openclaw browser tab             # shortcut for current tab
openclaw browser tab new
openclaw browser tab new --label research
openclaw browser tab label abcd1234 research
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion id="profiles-list-create-delete" title="配置文件：列出、创建、删除">

```bash
openclaw browser profiles
openclaw browser create-profile --name research --color "#0066CC"
openclaw browser create-profile --name attach --driver existing-session --cdp-url http://127.0.0.1:9222
openclaw browser delete-profile --name research
```

</Accordion>

<Accordion id="inspection-screenshot-snapshot-console-errors-requests" title="检查：屏幕截图、快照、控制台、错误、请求">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # or --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser snapshot --out snapshot.txt
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion id="actions-navigate-click-type-drag-wait-evaluate" title="操作：导航、单击、键入、拖动、等待、评估">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # or e12 for role refs
openclaw browser click-coords 120 340        # viewport coordinates
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref e12
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

<Accordion id="state-cookies-storage-offline-headers-geo-device" title="状态：cookie、存储、离线、标头、地理、设备">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear to remove
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

注意：

- 面向代理的 `browser` 工具公开 `action=download`（必需 `ref` 和 `path`）和 `action=waitfordownload`（可选 `path`）。两者都返回保存的下载 URL、建议的文件名和受保护的本地路径。显式下载拦截可用于托管 Playwright 配置文件。现有会话配置文件返回不支持的操作错误。
- Prefer原子选择器上传：通过上传传递触发器`--ref`，以便OpenClaw在一个请求中武装并点击。当有意稍后触发时，仅路径 `upload` 仍受支持。使用`--input-ref`或`--element`直接设置文件输入。 `dialog` 是布防呼叫。在触发对话框的 click/press 之前运行它。如果操作打开模态，则操作响应包括 `blockedByDialog` 和 `browserState.dialogs.pending`。通过`dialogId`直接响应。在 OpenClaw 外部处理的对话框出现在 `browserState.dialogs.recent` 下。
- 取消挂起的定位器单击、键入或上传操作会使其他选项卡保持连接。上传服务器属于所选选项卡。该选项卡上的新上传将取代之前的服务员。
- `click`/`type`/etc 需要 `snapshot` 中的 `ref`（例如，Playwright 参考 `f1e12`、角色参考 `e12` 或可操作 ARIA 参考） `ax12`）。复制返回的 ref 不变，包括任何帧前缀。操作故意不支持 CSS 选择器。当可见视口位置是唯一可靠的目标时，请使用 `click-coords`。
- 下载和跟踪路径受限于 OpenClaw 临时根目录：`/tmp/openclaw{,/downloads}` （备用路径：`${os.tmpdir()}/openclaw/...`）。
- `upload` 接受来自 OpenClaw 临时上传根和 OpenClaw- 托管入站媒体的文件。托管入站媒体可以引用为 `media://inbound/<id>`、沙箱相关 `media/inbound/<id>` 或托管入站媒体目录内的已解析路径。嵌套媒体引用、遍历、符号链接、硬链接和任意本地路径仍然被拒绝。
- `upload`也可以直接通过`--input-ref`或`--element`设置文件输入；这些操作遵守上传超时。
- Dialog提示文本准确保留空格和空字符串。读取所有本地或会话存储会保留空密钥和 `__proto__` 等密钥。

当 OpenClaw 可以证明替换选项卡时，稳定的选项卡 ID 和标签可以在 Chromium 原始目标替换中幸存下来，例如同一 URL 的唯一 old/new 对或单个旧选项卡在表单提交后成为单个新选项卡。不明确的重复 URL 替换件会收到新的手柄。原始目标 ID 仍然不稳定。在脚本中，优先选择 `suggestedTargetId` 而不是 `tabs`。

快照标志一览：

- `--format ai`（默认为 Playwright）：带有本机 Playwright 引用的 AI 快照，包括帧限定引用，例如 `f1e12`。
- `--format aria`：带有 `axN` 参考的可访问性树。当 Playwright 可用时，OpenClaw 将具有后端 DOM id 的引用绑定到实时页面。后续操作就可以使用它们。否则将输出视为仅检查。
- `--efficient`（或`--mode efficient`）：紧凑角色快照预设。设置 `browser.snapshotDefaults.mode: "efficient"` 使其成为默认值（请参阅 [ 网关配置](/gateway/config-browser-ui-desktop#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 会强制使用带 `ref=e12` refs 的 role 快照。`--frame "<iframe>"` 会将 role 快照限定到某个 iframe。
- Selector 和框架范围的角色引用绑定到捕获的 DOM 控件，包括影子 DOM 和外部 `aria-owns` 成员。重新排序控件不会重新定位这些引用。已删除的控件或失败的绑定需要新的快照，而不是按名称匹配另一个控件。
- 在作用域角色快照中，忽略的节点和未命名的通用包装器在深度过滤之前是透明的。深度从选定的根开始统计剩余的角色节点；包装行和参考号可能与旧快照不同。状态属性、URL 附录和输出限制仍然适用。
- A 选择器范围的快照是时间点观察。如果在请求时没有元素匹配，它将立即返回一个空快照。它不会等待快照超时。当页面预计稍后添加元素时，请使用 `openclaw browser wait "<selector>"`。
- `--selector` 不会更改页面范围或帧范围的传输失败的行为。它们仍然使用配置的快照超时和诊断。
- 与Playwright一起，`--labels`添加了带有重叠参考标签的屏幕截图（打印`MEDIA:<path>`）以及带有每个参考边界框的`annotations`数组。在 `screenshot` 上，Playwright- 支持的标签可与 `--full-page`、`--ref` 和 `--element` 配合使用。在 `snapshot` 上，随附的屏幕截图仍然仅限视口。现有的 session/chrome-mcp 配置文件在页面屏幕截图上呈现覆盖标签，但不返回 `annotations` 或使用 Playwright 完整 page/ref/element 投影助手。如果没有 Playwright 或 chrome-mcp，则无法使用带标签的屏幕截图。
- `--urls` 会将发现的链接目标附加到 AI 快照中。

## <a id="snapshots-and-refs"></a> 快照和 ref

OpenClaw 支持三种“快照”样式：

- **AI 快照（本机引用）**：`openclaw browser snapshot`（默认，`--format ai`）
  - Output：包含 `f1e12` 等引用和匹配的 `refs` 元数据的文本快照。
  - Actions：`openclaw browser click f1e12`、`openclaw browser type f1e23 "hello"`（使用快照的参考）。
  - 在内部，ref 通过 Playwright 的 `aria-ref` 解析。

- **Role 快照（类似 `e12` 的 role refs）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - Output：基于角色的 list/tree 和 `[ref=e12]`（以及可选的 `[nth=1]`）。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在内部，ref 通过 `getByRole(...)`（以及重复项的 `nth()`）解析。
  - 包含引号、反斜杠或 YAML 标点符号的名称仍然可操作。使用 ref 而不是根据显示的名称重建定位器。
  - A 缺少显示名称可能意味着空的可访问名称或高于 Playwright 的 900 UTF-16- 单位限制的名称。继续使用返回的引用。
  - 添加 `--labels` 以包含带有叠加 `e12` 标签的屏幕截图。在 Playwright- 支持的配置文件上，这还会返回每个引用边界框元数据 （`annotations[]`）。带标签的元素屏幕截图保留了生成它的快照中的引用和框架。
  - 当链接文本不明确并且代理需要具体的导航目标时添加 `--urls`。对于 `--frame`，URL 附录来自该框架。

- **ARIA 快照（类似 `ax12` 的 ARIA refs）**：`openclaw browser snapshot --format aria`
  - 输出：作为结构化节点的可访问性树。
  - 操作：当快照路径可以通过 Playwright 和 Chrome 后端 DOM id 绑定 ref 时，`openclaw browser click ax12` 可正常工作。
- 如果 Playwright 不可用，ARIA 快照仍可用于检查，但 refs 可能不可操作。在需要操作 refs 时，使用 `--format ai` 或 `--interactive` 重新快照。
- 当驱动程序公开稳定的文档标识时，同一配置文件、选项卡、文档和选项系列的连续 AI 和角色快照会将 `[new]` 附加到先前快照中缺少的引用承载行。导航启动一个新的未标记基线，包括当快照包含该帧时相同的 URL iframe 重新加载。现有会话快照忽略增量。第一个快照建立了没有标记的基线。稍后的响应还公开 `newElements`，并在该值非零时添加计数页脚。具有 `axN` 引用的结构化 `--format aria` 快照不使用增量标记。
- 贡献者：原始CDP后备路径有一个Docker证明通道，如[Docker测试套件](/reference/test/docker)中所述。

Ref 行为：

- Refs 是 **在导航中不稳定**。如果出现故障，请重新运行 `snapshot` 并使用新的引用。
- A 批处理在提交的主机导航（包括相同的 URL 重新加载）后或页面关闭后停止。其 `aborted` 摘要报告操作编号和跳过计数。在发出相关操作之前拍摄新快照，或者在需要导航时使用单独的操作调用。
- 当可以证明替换选项卡时，`/act` 在操作触发替换后返回当前原始 `targetId`。继续使用稳定选项卡 ids/labels 进行后续命令。
- 使用 `--frame` 拍摄的 A 角色快照将角色引用范围限定到该 iframe，直到下一个角色快照。
- 未知或过期的 `axN` refs 会快速失败，而不会回退到 Playwright 的 `aria-ref` 选择器。发生这种情况时，请在同一标签页上运行新的快照。

## <a id="browser-batch-cli"></a> 浏览器批量 CLI

`openclaw browser batch` 在一个 `/act` 调用中运行一系列嵌套的 `/act` 操作（通过代理工具达到相同的 `kind="batch"` 运行时），因此 CLI 用户和脚本可以组合 `wait`、`click` 等操作， `type` 和 `evaluate` 集成到单个可重播计划中，无需按操作往返。 `actions[]` 中的每个条目都是 `BrowserActRequest` — `/act` 路由接受的封闭联合（`click`、`clickCoords`、`type`、`press`、`hover`、 `scrollIntoView`、`drag`、`select`、`fill`、`resize`、`wait`、`evaluate`、`close`、`batch`） — 不是任意的`openclaw browser` 子命令。 `profile="user"` 和其他现有会话 （chrome-mcp） 配置文件不支持 `batch`。在那里单独发送操作。

- CLI：`openclaw browser batch --actions '<json>'`、`openclaw browser batch --actions-file plan.json` 或 `openclaw browser batch --actions-file -` 从 stdin 读取 JSON 数组。 `--continue` 设置 `stopOnError=false`。默认值是在出现第一个错误时停止。 `--target-id` 将整个批次的范围限制为一个选项卡。 `--actions-file` 和 stdin 输入上限为 1,000,000 字节。将较大的计划拆分为多个批处理命令。
- Ref 生命周期：引用来自批处理之前运行的 `snapshot`（快照不是嵌套操作）。更改页面状态的嵌套操作（例如触发导航的 `click` 或改变 DOM 的 `evaluate`）可能会使批次其余部分的早期引用无效。先把状态改变的动作放在前面，或者重新快照后分成后续批次。导航和重新快照发生在批处理 （`openclaw browser navigate` / `snapshot`） 之外，因为 `open`、`navigate` 和 `snapshot` 不是 `/act` 类型。
- 目标 ID 冲突：嵌套操作可能会省略 `targetId` 或重复请求级别 `targetId`。在运行任何操作之前，解析为不同选项卡的显式嵌套 `targetId` 会被拒绝，并显示为 `ACT_TARGET_ID_MISMATCH`。批量操作按设计共享请求的选项卡。
- 错误摘要：响应为 `{ "results": [{ "ok": true }, { "ok": false, "error": "<message>" }, ...] }`，按顺序每个操作一个条目。当 `stopOnError` 为默认值时，阵列在第一次故障时结束。 `--continue` 涵盖了每一个动作。任何失败的条目都会使 CLI 退出非零。传递 `--json` 以保留脚本的完整有序响应。
- 嵌套批次占用一个父结果。如果子操作失败，该结果将报告第一个子错误。每个批次应用自己的 `stopOnError`：在嵌套批次内继续不会使其成功或使其父级继续。

## <a id="wait-power-ups"></a> 等待增强功能

您可以等待的不仅仅是 time/text：

- 等待 URL（Playwright 支持 glob）：
  - `openclaw browser wait --url "**/dash"`
- 等待加载状态：
  - `openclaw browser wait --load networkidle`
  - 在托管 `openclaw` 和 raw/remote CDP 配置文件上受支持。使用 `existing-session` 驱动程序的配置文件（包括默认的 `user` 配置文件）拒绝 `networkidle`。使用 `--url`、`--text`、选择器或 `--fn` 在那里等待。
- 等待 JS 谓词：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待选择器变为可见：
  - `openclaw browser wait "#main"`

这些可以组合使用：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## <a id="debug-workflows"></a> 调试工作流

当操作失败时（e.g.“不可见”、“严格模式违规”、“已覆盖”）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在交互模式中优先使用 role refs）
3. 如果仍然失败：`openclaw browser highlight <ref>` 查看 Playwright 正在定位什么
4. 如果页面行为异常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 深度调试：记录 trace：
   - `openclaw browser trace start`
   - 复现问题
   - `openclaw browser trace stop`（输出 `TRACE:<path>`）。

## <a id="json-output"></a> JSON 输出

`--json` 适用于脚本和结构化工具。

示例：

```bash
openclaw browser --json status
openclaw browser --json snapshot --interactive
openclaw browser --json requests --filter api
openclaw browser --json cookies
```

JSON 中的 Role 快照包含 `refs`，以及一个小型 `stats` 块（lines/chars/refs/interactive），这有助于工具推断负载大小和密度。

## <a id="state-and-environment-knobs"></a> 状态和环境开关

这些对类似“让站点表现得像 X”的工作流很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 存储：`storage local|session get|set|clear`
- 离线：`set offline on|off`
- 请求头：`set headers --headers-json '{"X-Debug":"1"}'`（或位置参数形式 `set headers '{"X-Debug":"1"}'`）
- HTTP 基本认证：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒体：`set media dark|light|no-preference|none`
- 时区 / 区域设置：`set timezone ...`、`set locale ...`
- 设备 / 视口：
  - `set device "iPhone 14"`（Playwright 设备预设）
  - `set viewport 1280 720`

## <a id="security-and-privacy"></a> 安全与隐私

- openclaw 浏览器配置文件可能包含登录会话。将其视为敏感。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn` 会在页面上下文中执行任意 JavaScript。提示注入可能会影响它们。 如果不需要，请使用 `browser.evaluateEnabled=false` 将其禁用。
- `openclaw browser evaluate --fn` 接受函数源码、表达式或语句体。语句体会被包装为异步函数，因此请使用 `return` 返回你想要的值。当你的前端函数可能需要比默认 evaluate 超时更长的时间时， 请使用 `--timeout-ms <ms>`。
- 关于登录和反机器人说明（X/Twitter 等），请参见 [Browser login + X/Twitter posting](/tools/browser-login)。
- 保持 Gateway/node 主机私有（仅限 loopback 或 tailnet）。
- 远程CDP端点功能强大。挖掘隧道并保护他们。

严格模式示例（默认阻止 private/internal 目标）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      allowedHostnames: ["*.example.com", "example.com", "localhost"],
    },
  },
}
```

## <a id="related"></a> 相关内容

- [浏览器](/tools/browser) - 概览、配置、配置文件、安全性
- [浏览器登录](/tools/browser-login) - 登录网站
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
