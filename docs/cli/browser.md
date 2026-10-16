---
summary: "CLI `openclaw browser` 参考（生命周期、配置文件、选项卡、操作、状态和调试）"
read_when:
  - "你使用 `openclaw browser`，并希望查看常见任务示例"
  - "你想通过节点主机远程控制运行在另一台机器上的浏览器"
  - "您想要通过 Chrome MCP 附加到本地登录的 Chrome"
title: "浏览器"
---

# `openclaw browser`

管理 OpenClaw 的浏览器控制面并运行浏览器操作：生命周期、配置文件、标签页、快照、截图、导航、输入、状态模拟和调试。

相关：[浏览器工具](/tools/browser)。

## <a id="common-flags"></a> 常用标志

- `--url <gatewayWsUrl>`: Gateway WebSocket URL（默认使用配置）。
- `--token <token>`: Gateway 令牌（如需要）。
- `--timeout <ms>`: 请求超时时间，单位为 ms（默认：`30000`）。
- `--expect-final`: 等待最终的 Gateway 响应。
- `--browser-profile <name>`: 选择浏览器配置文件（默认：`openclaw`，或 `browser.defaultProfile`）。
- `--json`: 机器可读输出（在支持的情况下）。这是一个浏览器级别的选项，因此请将其放在子命令之前，以获得明确无歧义的形式，例如 `openclaw browser --json status`。尾随位置例如 `openclaw browser status --json` 也可行，前提是所选子命令没有定义自己的 `--json`

CLI 在节点和网关传输的请求超时之外再保留 10 秒，允许浏览器超时诊断到达调用者。

## <a id="quick-start-(local)"></a><a id="quick-start-local"></a> Quick start（本地）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

代理可以使用 `browser({ action: "doctor" })` 执行相同的就绪检查。

## <a id="quick-troubleshooting"></a> 快速故障排除

如果 `start` 返回 `not reachable after start`，请先排查 CDP 就绪状态。如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则说明浏览器控制平面是健康的，失败通常是导航 SSRF 策略阻止所致。

最小执行序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

详细指导：[浏览器故障排除](/tools/browser/troubleshooting#cdp-startup-failure-vs-navigation-ssrf-block)

## <a id="lifecycle"></a> 生命周期

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

- `doctor --deep` 添加了实时快照检查：当基本 CDP 就绪状态为绿色但您想要证明可以检查当前选项卡时很有用。
- 对于正在运行的本地托管配置文件，`status` 和 `doctor` 报告来自 Chrome 的缓存图形诊断：hardware/software 分类、渲染器、后端、device/driver、功能和禁用状态详细信息以及加​​速视频功能。 `openclaw browser --json status` 返回完整的结构化有效负载。被动状态绝不会仅仅为了收集这些事实而启动 Chrome。
- `stop` 关闭活动控制会话并清除临时仿真覆盖。这甚至适用于 `attachOnly` 和远程 CDP 配置文件，其中 OpenClaw 本身并未启动浏览器进程。对于本地托管配置文件，`stop` 还会停止生成的浏览器进程。
- `start --headless` 仅对该次启动请求生效，并且只在 OpenClaw 启动本地托管浏览器时适用。它不会改写 `browser.headless` 或配置文件配置，并且对于已经在运行的浏览器不会产生任何作用。
- 本地托管配置文件默认在每个平台上无头运行。 `OPENCLAW_BROWSER_HEADLESS=0`、`browser.headless=false` 或 `browser.profiles.<name>.headless=false` 显式请求可见浏览器； Linux 则需要 `DISPLAY` 或 `WAYLAND_DISPLAY`。外部拥有的浏览器保持其当前模式。

## <a id="if-the-command-is-missing"></a> 如果命令缺失

如果`openclaw browser`是未知命令，请检查`~/.openclaw/openclaw.json`中的`plugins.allow`。当 `plugins.allow` 存在时，明确列出捆绑的浏览器插件，除非配置已经具有根 `browser` 块：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

根级别显式的 `browser` 块（例如 `browser.enabled=true` 或 `browser.profiles.<name>`）也会在受限的插件允许列表下激活内置的 browser 插件。

有关的：[浏览器工具](/tools/browser/setup#missing-browser-command-or-tool)

## <a id="profiles"></a> 配置文件

配置文件是命名的浏览器路由配置：

- `openclaw`（默认）：启动或附加到专用的 OpenClaw- 托管 Chrome 实例（隔离的用户数据目录）。
- `user`：通过 Chrome DevTools MCP 控制现有登录的 Chrome 会话。
- 自定义 CDP 配置文件：指向本地或远程的 CDP 端点。

```bash
openclaw browser profiles
openclaw browser system-profiles
openclaw browser system-profiles --browser brave
openclaw browser import-profile --browser chrome --system Default --into imported
openclaw browser import-profile --system "Profile 1" --into work --domains google.com,youtube.com
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

可在任意子命令中使用 `--browser-profile <name>` 指定特定配置文件，例如 `openclaw browser --browser-profile work tabs`。

On macOS， `system-profiles`列出真实的Chrome， Brave、边或Chromium主机上可用的配置文件。`import-profile`一后解密他们的cookiemacOS Keychain/Touch ID同意提示并将它们注入新的OpenClaw-托管配置文件。它仅导入 cookie。本地存储和IndexedDB没有变化。一些Google会话使用设备绑定的会话凭据（DBSC）并且导入后仍然需要重新验证。

当 macOS 应用程序使用本地网关时，它可以提供一次此导入，并使隔离的导入配置文件成为代理浏览的默认设置。 Import always requires an explicit click.成功导入或取消会抑制以后的自动提示，并且 **设置→常规→浏览器登录** 仍然可用于重新导入。

系统配置文件导入默认已启用。将 `browser.allowSystemProfileImport=false` 可同时禁用 CLI 和 agent 触发的导入。导入仅在主机本地执行，无法通过 browser node proxy 运行。

### <a id="cookie-sync-to-a-remote-gateway"></a> Cookie 同步到远程网关

`import-profile`目标是同一主机上的托管配置文件。当你的OpenClaw网关和代理浏览器运行在单独的计算机上，使用`cookie-sync`反而。它解密此 Mac 上的 cookie，并通过操作员连接将它们推送到该远程网关上的托管配置文件中：

```bash
openclaw browser cookie-sync --domains github.com,news.ycombinator.com --into work
openclaw browser --url wss://gateway.example.com cookie-sync --domains github.com --into work --watch
```

- `--domains` is required. Cookie 同步复制实时会话 cookie，因此它永远不会发送不受限制的 cookie jar。 A missing or empty allowlist is a hard error。
- `--into` 选择网关上的目标托管配置文件（默认 `imported`）。 `--gateway`/`--url` 选择远程网关（默认为配置的网关或本地网关）。
- `--watch` 保持命令运行并在源 Cookies 数据库更改时重新推送。 macOS 钥匙串密钥在每个观看会话中都会读取一次，因此您可以批准单个同意提示，而不是每次更改一个同意提示。
- Decryption 是主机本地的（仅限 macOS），并重用与 `import-profile` 相同的允许列表和钥匙串路径。 Cookie 在此 Mac 上解密并通过现有的 TLS-pinned 网关连接传送。 No cookie values are printed。
- 某些 Google 会话使用设备绑定会话凭据 （DBSC），这些凭据与此 Mac 保持关联，并且在同步后仍然需要重新进行身份验证。对于这些站点，更喜欢通过 [ 浏览器节点代理 ](#remote-browser-control-node-host-proxy) 驱动 Mac 本身上的浏览器。

macOS 应用程序在 **Dashboard → 设置 → 本机 → 浏览器** 下公开了相同的功能：默认关闭切换、可编辑域白名单和目标配置文件字段。在远程模式下启用时，它会根据连接的网关监控 `cookie-sync --watch` 并显示实时状态行。

## <a id="chrome-extension-relay"></a> Chrome 扩展中继

```bash
openclaw browser extension path
openclaw browser extension setup --action inspect --json
openclaw browser extension setup --action install --json
openclaw browser extension setup --action verify --browser-profile chrome --json
openclaw browser extension install
openclaw browser extension install --no-store
openclaw browser extension install --json --wait-ms 60000
openclaw browser extension status
openclaw browser extension status --json
openclaw browser extension uninstall-host
openclaw browser extension uninstall-store
openclaw browser extension pair
openclaw browser extension pair --gateway-url wss://gateway.example.com
openclaw browser extension cdp
openclaw browser extension cdp --json
```

- `extension setup` 是 CLI、TUI 和本机桌面适配器的共享主机本地控制器。 `inspect` 是只读安装发现，`install` 准备本机引导程序，`verify` 验证所选本地中继。其经过编辑的 JSON 将准备、Chrome 批准和连接分开。有效 pending/blocked 状态退出 0；执行失败退出非零。它从不将远程仪表板或 SSH 环回 URL 视为本地浏览器主机的证明。
- `extension install` 预注册原点锁定的本机引导主机。 Google macOS上的Chrome可以在首次发布前准备好；其他支持的浏览器需要现有的用户数据目录。在 macOS 上，安装程序会请求 Google Chrome 中的官方应用商店安装该目录中的所有配置文件。 Chrome 在启动时发现了这一点。完全退出并在方便时重新打开 Chrome，然后批准或启用 OpenClaw。该命令永远不会重新启动 Chrome 或绕过批准。对于其他浏览器和平台，[ 从 Chrome Web Store](https://chromewebstore.google.com/detail/openclaw/kcdjddhmeafeomebliikmbpblkmkfoig) 添加 OpenClaw。 Linux 支持自动本机配对。 Windows 使用来自封装 CLI 或 Windows 配套产品的独立 `OpenClaw.BrowserBootstrap.exe`。 portable/local 安装程序可以将 `--native-host-executable <absolute-path>` 传递到 `extension setup --action install` 或 `extension install`。在通过共享 C# 注册服务进行用户级注册表注册之前，安装程序会检查拥有的 context/ACLs 和实际的框架子进程响应。 CLI 显式选择本机 Windows 上下文； Companion 拥有其托管 WSL 模式。冲突的环境和未知的传输结果永远不会触发另一个作家或模式回退。没有可执行文件或没有证据意味着没有自动引导程序；它永远不会回退到脚本主机或绕过 Chrome 批准。
- `extension install --no-store` 复制稳定开发扩展并注册本机主机，而不创建存储请求。现有请求不变。使用 **Load unpacked** 的打印路径。
- `extension status`报告`storeInstallRequests`州（`requested`， `missing`， `foreign`， `invalid`）分别于`storeDiscovered`审批字段（`enabled`， `awaitingApproval`）、批准的解压 ID 和路径以及本机主机注册运行状况。本地安装状态不能证明实时中继连接。JSON输出从不包含配对字符串或中继密钥。
- `extension uninstall-host` 仅删除经过验证的 OpenClaw- 拥有的本机主机清单和启动器。它不会从 Chrome 中删除扩展。在Windows上它委托给相同的注册服务； `--remove-store` 首先删除已验证的拥有的 Store 请求。 `--native-host-executable` 和 `--browser-profile` 为 status/removal. 选择相同的显式本地上下文
- `extension uninstall-store` 仅删除 OpenClaw- 拥有的 macOS Chrome 存储请求（仅限 macOS）。 Windows 使用 `uninstall-host --remove-store` 而不是单独的 Store writer。 Chrome 可能会在下次启动时删除外部安装的扩展。本机主机注册和开发副本保持不变。
- `extension path` 为只读操作。存在稳定的已安装副本时，它会打印该副本；否则打印捆绑的源目录。
- `extension pair` 仍然是高级手动流程。 `--gateway-url` 创建直接远程网关配对 URL。非环回 URL 必须使用 `wss://`。
- `extension pair --local-gateway --json` 允许桌面本机助手通过网关的 `/browser/extension` 唤醒路由获取现有的本地配对。它需要本地网关配置，并且不能与 `--gateway-url` 结合使用。 JSON 包含一个凭证：私下使用它，从不记录它。
- `extension cdp` 打印非秘密浏览器中继身份验证 v2 元数据：环回 browser/CDP 端点、协议版本、密钥 ID 和固定的 challenge/complete 绑定。默认情况下，它从不打印中继密钥或授权标头。

自动本地引导程序通过本地网关的确切 `/browser/extension` 路由进行连接，因此第一个经过身份验证的扩展连接会启动惰性浏览器控制服务。保持 `openclaw gateway run` 或托管网关服务运行。不需要单独的浏览器请求或预热。唤醒后，本地 OpenClaw 和 mcporter 调用仍使用 `extension pair` 或 `extension cdp` 报告的配置文件中继端口。浏览器节点配对继续使用浏览器节点主机上的中继，而显式 `--gateway-url` 配对仍然是直接远程和仅手动。

不带 `--gateway-url` 或 `--local-gateway` 的高级手动 `extension pair` 命令保留主机本地 `/extension` 中继 URL。安装本机主机、启用 **自动本地设置** 以及支持中继唤醒的扩展构建后，重新连接可以在已保存配对的配置端口上启动独立中继。这不会启动网关浏览器控制：经过身份验证的 CDP 客户端可以在没有网关的情况下使用独立中继，但 `openclaw browser` 操作仍然需要网关。对于源签出测试，请从同一 OpenClaw 安装加载托管解压副本。

`extension cdp --legacy-bearer` 是一个临时迁移逃生舱口。仅当 `browser.extensionRelay.allowLegacyAuth=true` 时，它才打印旧的 Bearer 标头并带有警告。否则，它将出现错误并退出，而不打印凭证。使用 `--json` 进行机器输出。 stderr 上仍保留警告，因此 stdout 保持有效 JSON。

设置、安全模型和恢复步骤：[Chrome extension](/tools/chrome-extension)。

在托管计算机上运行安装Chrome。在macOS应用程序，**仪表板 → 设置 → 本机 → 浏览器 → 设置Chrome在这台 Mac 上**调用本地的CLI即使连接到远程网关时也是如此。基于浏览器的仪表板提供了商店和文档链接。

如果扩展在本机主机存在之前已尝试自动设置，Chromium保留正在运行的浏览器进程的缺失。重新启动Chrome一次，运行`extension install`，然后重新打开商店扩展。仅弹出重试无法恢复现有进程。

## <a id="tabs"></a> 标签页

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` 首先返回 `suggestedTargetId`，然后返回稳定的 `tabId`（例如 `t1`）、可选标签和原始 `targetId`。将 `suggestedTargetId` 传递回 `focus`、`close`、快照和操作。分配带有 `open --label`、`tab new --label` 或 `tab label` 的标签。标签、选项卡 ID、原始目标 ID 和唯一目标 ID 前缀均被接受。为了兼容性，请求字段仍命名为 `targetId`，但它接受任何这些选项卡引用。

使用 `driver: "extension"` 配置的配置文件还可以返回数字 `webExtensionTabId`。它的作用域为当前浏览器运行时，仅用于调用 Chrome 的 WebExtensions API。它可能会在浏览器或扩展程序重新连接后发生更改，并且对于其他驱动程序或扩展程序元数据不可用时会被忽略。不要将其传递给 OpenClaw 浏览器命令；继续使用 `suggestedTargetId` 或 `tabId` 。

原始目标 ID 是易失性诊断句柄，而不是持久的代理内存。 Chromium 可以在导航或表单提交期间替换底层原始目标。然后，当 OpenClaw 可以证明匹配时，将稳定的 `tabId` 或标签贴在替换标签上。更喜欢 `suggestedTargetId`。

## <a id="snapshot-%2F-screenshot-%2F-actions"></a><a id="snapshot-/-screenshot-/-actions"></a> 快照 ／ 截图 ／ 操作

快照：

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

截图：

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

- `--full-page` 仅适用于页面捕获。它不能与 `--ref` 或 `--element` 组合使用。
- `existing-session` ／ `user` 配置文件支持整页截图，以及来自快照输出的 `--ref` 截图，但不支持 CSS `--element` 截图。
- `--labels` 在屏幕截图上覆盖当前快照参考。在 Playwright-backed 配置文件上，它可与 `--full-page`（全页覆盖）、`--ref`（ARIA 参考的元素剪辑覆盖）和 `--element`（CSS 选择器的元素剪辑覆盖）配合使用。在元素剪辑模式中，标签相对于元素进行投影。响应还包括 `annotations` 数组，空时省略。每个条目都带有一个参考的边界框：`ref`、`number`、`role`、可选的 `name` 和 `box: {x, y, width, height}`。坐标使用捕获图像的空间（视口、整页或相对元素）。 `existing-session` 配置文件在页面屏幕截图上呈现 chrome-mcp 叠加层，但不使用 Playwright 投影助手，也不包含 `annotations`。那里不支持 CSS `--element` 屏幕截图。如果没有 Playwright 或 chrome-mcp，则无法使用带标签的屏幕截图。
- `snapshot --urls` 会把发现的链接目标附加到 AI 快照中，这样代理就可以直接选择导航目标，而不必仅凭链接文本猜测。

Navigate/click/type（基于参考的 UI 自动化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
openclaw browser evaluate --fn 'const title = document.title; return title;'
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
```

`press` 接受命名键和快捷键，例如 `Escape`、`Control+Shift+T` 和 `Control++`。常见的 `Esc`、`Return`、`Del`、`Ctrl` 和 `Cmd` 别名已标准化。

对于托管浏览器配置文件，`select` 准确保留选项值。引用空值或空白敏感值，例如 `openclaw browser select <ref> ""` 或 `openclaw browser select <ref> " padded "`。

`evaluate --fn` 接受函数源代码、表达式或语句体。语句体会被包装为 async 函数，因此如果要返回值，请使用 `return`。当页面端函数可能需要比默认 evaluate 超时时间更长时，请使用 `--timeout-ms`。`browser.evaluateEnabled=false`（默认：`true`）会同时禁用 `evaluate` 和 `wait --fn`。

当 OpenClaw 可以证明替换选项卡时，操作响应在操作触发的页面替换后返回当前原始 `targetId`。脚本仍应存储并传递 `suggestedTargetId`/labels 以实现长期工作流程。

文件 ＋ 对话框辅助：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser upload media://inbound/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
```

托管 Chrome 配置文件将普通点击触发的下载保存到 OpenClaw 下载目录（默认情况下为 `/tmp/openclaw/downloads`，或配置的临时根目录）。当代理需要等待特定文件并返回其路径时，请使用 `waitfordownload` 或 `download`。那些明确的服务员拥有下一个下载。上传接受来自 OpenClaw 临时上传根和 OpenClaw- 管理的入站媒体的文件，包括 `media://inbound/<id>` 和沙箱相关的 `media/inbound/<id>` 引用。嵌套媒体引用、遍历和任意本地路径都会被拒绝。

对于远程浏览器节点，OpenClaw 会暂存私有副本并标准化文件名以实现可移植性，包括 Windows 设备名称和尾随点或空格。文件字节保持不变。

如果保存下载失败，OpenClaw 请求取消传输并报告原始保存错误。在开始新的下载之前更正输出路径或文件系统问题。

当操作打开模式对话框时，文本输出会报告块和待处理对话框 ID。 JSON 响应返回 `blockedByDialog` 和 `browserState.dialogs.pending`。通过`--dialog-id`直接接听。在 OpenClaw 外部处理的对话框出现在 `browserState.dialogs.recent` 下。

批量操作：

```bash
openclaw browser batch --actions '[{"kind":"wait","timeMs":500},{"kind":"click","ref":"12"},{"kind":"type","ref":"23","text":"hello"}]'
openclaw browser batch --actions-file plan.json
openclaw browser batch --actions-file - --continue
```

`openclaw browser batch` 发送带有嵌套 `BrowserActRequest` 操作的 `kind="batch"` `/act` 请求（`wait`、`click`、`type`、`evaluate`，...） — 不是 `open`/`navigate`/`snapshot`/`screenshot`，是 CLI 子命令，而不是 `/act` 类型。 `--continue` 设置 `stopOnError=false`（默认在第一次错误时停止）。 `--target-id` 将整个批次的范围限制为一个选项卡。失败的嵌套操作会使命令退出非零。使用 `--json` 保留有序的 `results` 响应。请参阅 [Browser 批次 CLI](/tools/browser-control#browser-batch-cli) 了解完整合约（引用生命周期、目标 ID 冲突、错误摘要）。 `profile="user"`/现有会话配置文件不支持 `batch`。

如果导航或关闭的页面停止批处理，文本输出会报告操作编号和跳过的计数。在继续相关操作之前拍摄新快照。

`--actions-file` 和 `--actions-file -` 标准输入的上限为 1,000,000 字节。将较大的计划拆分为多个 `openclaw browser batch` 命令。

`fill --fields-file`、`batch --actions-file` 和批处理标准输入需要有效的 UTF-8。在任何浏览器操作运行之前，格式错误的字节都会被拒绝。将输入保存为UTF-8并重试；保留有效的 Unicode 值，包括表情符号和 CJK 文本。

## <a id="state-and-storage"></a> 状态和存储

视口 + 模拟：

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookie + 存储：

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

存储键保留周围的空白。在 shell 命令中引用该键，例如 `openclaw browser storage local get " account "`。设置该密钥不会覆盖单独的 `account` 条目。空或仅有空格的键对于 `set` 仍然无效；省略 `get` 中的键会列出所有条目。

## <a id="debugging"></a> 调试

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

`responsebody` 将有界响应前缀写入 stdout，并在其被截断时在 stderr 上发出警告。 `--json` 包括响应元数据和 `truncated` 标志，没有单独的警告。使用 `--max-chars` 选择前缀限制。

## <a id="existing-chrome-via-mcp"></a> 现有 Chrome 通过 MCP

使用内置的 `user` 配置文件，或创建你自己的 `existing-session` 配置文件：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser create-profile --name chrome-port --driver existing-session --cdp-url http://127.0.0.1:9222
openclaw browser --browser-profile chrome-live tabs
```

默认的 existing-session 路径是仅限主机的 Chrome MCP 自动连接。如果浏览器已经以 DevTools 端点运行，请改为传入 `--cdp-url`，这样 Chrome MCP 会连接到该端点。对于 Docker、Browserless 或其他不需要 Chrome MCP 语义的远程环境，请改用 CDP 配置文件。

当前 existing-session 限制：

- 由快照驱动的操作使用引用，而不是 CSS 选择器。
- 当调用者省略 `timeoutMs` 时， 支持的 `act` 请求使用内置的 60000 毫秒默认值。接受的每次调用覆盖设置该操作预算。
- `click` 仅支持左键单击。
- `type` 不支持 `slowly=true`。
- `press` 不支持 `delayMs`。
- `hover`、`scrollintoview`、`drag`、`select` 和 `fill` 拒绝每次调用超时覆盖。 `evaluate` 接受 `--timeout-ms`。
- `select` 一次仅支持一个值。
- 不支持 `wait --load networkidle`（适用于托管配置文件和 raw/remote CDP 配置文件）。
- 文件上传需要`--ref` / `--input-ref`，不支持CSS `--element`。当页面的文件输入接受多个文件时传递多个路径。
- 对话框钩子不支持 `--timeout`。
- 屏幕截图支持页面捕获和 `--ref`，但不支持 CSS `--element`。
- `responsebody`、下载拦截、PDF 导出和批量操作仍然需要托管浏览器或原始 CDP 配置文件。

现有会话操作步骤共享一个执行预算：使用 `type` 填充和提交不会分别收到新的超时。有条件的 `wait` 允许其显式 `timeMs` 延迟加上操作预算（最小值 250 毫秒）来满足条件。纯定时器等待保留 `timeMs` 和操作预算中较大的一个。

导航验证有一个单独的共享行动预算津贴加上 1250 毫秒的计划延迟。 `resize` 和 `close` 跳过验证。浏览器和选项卡准备、执行和最终 URL 查找共享整个请求截止日期。内部呼叫和导航检查不会更新它。

## <a id="remote-browser-control-(node-host-proxy)"></a><a id="remote-browser-control-node-host-proxy"></a> 远程浏览器控制（节点主机代理）

如果网关与浏览器运行在不同的计算机上，请在具有 Chrome/Brave/Edge/Chromium. 的计算机上运行 **节点主机** 网关将浏览器操作代理到该节点。不需要单独的浏览器控制服务器。

自动路由优先选择网关主机的浏览器，并且仅当本地浏览器功能不可用时才使用单个连接的浏览器节点。使用 `gateway.nodes.browser.mode` 控制此后备，并使用 `gateway.nodes.browser.node` 显式选择节点，包括当主机具有浏览器时。已停止的本地托管浏览器（已安装可执行文件）仍保留在本地。

安全性和远程设置：[浏览器工具](/tools/browser)、[远程访问](/gateway/remote)、[Tailscale](/gateway/tailscale)、[安全性](/gateway/security)

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [浏览器](/tools/browser)
