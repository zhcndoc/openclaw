---
summary: "Chrome 扩展：让 OpenClaw 在无需远程调试提示的情况下控制你已登录的 Chrome"
read_when:
  - 你希望一个代理能从你的手机上操作你真实的、已登录的 Chrome
  - 你一直碰到 Chrome 的“允许远程调试？”提示，但没人坐在电脑前
  - 你想了解通过扩展实现浏览器接管的安全模型
title: "Chrome 扩展"
---

# Chrome 扩展

OpenClaw Chrome 扩展让代理可以控制你**已登录的 Chrome
标签页**，而无需启动一个单独的受管浏览器，且**不会出现** Chrome 阻止性的“允许远程调试？”提示。

当你通过手机（Telegram、WhatsApp 等）驱动 OpenClaw 时，这一点很重要：
[`user` 配置文件](/tools/browser#profiles-openclaw-user-chrome)会通过 Chrome 的远程调试端口进行连接，这会弹出一个桌面端确认对话框，而你不在座位前时没人能点击。该扩展改用 `chrome.debugger` API，因此页面内唯一的提示是 Chrome 可关闭的“OpenClaw 已开始调试此浏览器”横幅。

这与 Anthropic 的 Claude in Chrome 和 OpenAI 的 Codex Chrome 扩展所采用的方式相同。

## 工作原理

三个部分：

- **浏览器控制服务**（Gateway 或节点主机）：`browser`
  工具调用的 API。
- **扩展中继**（loopback WebSocket）：控制服务
  在 `127.0.0.1` 上启动的一个小型服务器。它向
  OpenClaw 提供 Chrome DevTools Protocol 端点，并与扩展通信。双方都使用
  主机本地令牌进行身份验证（见下文）。
- **OpenClaw Chrome 扩展**（MV3）：使用 `chrome.debugger` 附加到标签页，
  转发 CDP 流量，并管理 **OpenClaw 标签页组**。

OpenClaw 只能看到并控制位于 **OpenClaw 标签页组** 中的标签页。该
分组就是同意边界：将标签页拖入即可共享，将其拖出（或点击工具栏按钮）即可立即撤销访问权限。

## 安装并配对

1. 打印解压后的扩展路径：

   ```bash
   openclaw browser extension path
   ```

2. 打开 `chrome://extensions`，启用 **开发者模式**，点击 **加载已解压的扩展程序**，并选择打印出的目录。

3. 打印配对字符串：

   ```bash
   openclaw browser extension pair
   ```

4. 点击 OpenClaw 工具栏图标，并将配对字符串粘贴到弹出窗口中。  
   当扩展连接到中继时，徽标会变为 **ON**。

配对令牌是一个 **主机本地密钥**，在首次使用时创建，并存储在状态目录下的 `credentials/` 中（模式 `0600`）。每一台运行浏览器的机器——Gateway 主机以及每一台浏览器节点主机——都拥有自己的令牌，因此无需在机器之间传递任何凭据。要轮换它，请删除 `browser-extension-relay.secret` 文件，然后重新配对。

## 使用它

在 `browser` 工具调用中选择内置的 `chrome` 配置文件，或者将其设为默认：

```bash
openclaw config set browser.defaultProfile chrome
```

```json5
{
  browser: {
    profiles: {
      chrome: { driver: "extension", color: "#FF4500" },
    },
  },
}
```

- 共享标签页：点击该标签页上的 OpenClaw 工具栏按钮（它会加入 OpenClaw 标签页组），或者将任意标签页拖入该组。
- 代理也可以打开新标签页；这些标签页会自动进入该组。
- 撤销：再次点击按钮，将标签页拖出该组，或者关闭 Chrome 的调试横幅。代理会立即失去对该标签页的访问权限。

### 外部 CDP 客户端（chrome-devtools-mcp、Puppeteer）

中继是一个标准的 CDP 浏览器端点，因此 OpenClaw 之外的工具也可以通过它驱动已配对的 Chrome——使用相同的许可模型（仅限共享标签页）、相同的主机本地令牌，并且仍然不会出现“允许远程调试？”提示。打印端点和身份验证标头：

```bash
openclaw browser extension cdp
```

例如，Google 的 [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
可以通过以下方式连接：

```bash
npx chrome-devtools-mcp --wsEndpoint ws://127.0.0.1:18799/cdp \
  --wsHeaders '{"Authorization":"Bearer <token>"}'
```

`openclaw browser extension cdp --json` 会输出用于脚本处理的 `{ browserUrl, wsEndpoint,
headers }`。该令牌与配对字符串携带的主机本地中继密钥相同：请将其视为私密信息，并通过删除
`credentials/browser-extension-relay.secret` 后重新配对来轮换令牌。

[mcporter](https://github.com/openclaw/mcporter) 完全不需要额外配置：当已配对的中继在此主机上响应时，它会透明地将
`chrome-devtools-mcp --autoConnect` 服务器命令重写为中继端点，因此通过 mcporter 调用 Chrome DevTools 的代理会自动跳过远程调试提示（如需退出，请在此处设置
`MCPORTER_DISABLE_CHROME_DEVTOOLS_RELAY=1`）。

### 标签页 copilot 侧边栏

配对扩展后，在其工具栏弹出窗口中点击 **打开标签页 copilot**。

OpenClaw 会为那个特定的 Chrome 标签页配置 `sidepanel.html`；manifest 中没有全局侧边栏路径。因此，每个标签页都会获得一个单独的面板文档、Gateway 会话、消息订阅以及类型化的浏览器工具绑定。

该面板不会在你的消息中放入页面 URL、标题、DOM 或可见文本。它只发送你输入的文本。浏览器操作会携带一个单独的 Gateway 认证绑定，其中包含 Chrome 标签页和 CDP 目标，而浏览器工具会拒绝尝试替换该目标或使用全局浏览器操作。回复会留在面板中（`deliver: false`）；它们不会继承 Telegram、Discord 或其他渠道路由。

copilot 是一个专用的已配对 Gateway 设备，具有 `operator.read` 和 `operator.write` 范围。首次使用时，请检查并批准其请求：

```bash
openclaw devices list
openclaw devices approve <requestId>
```

扩展会保留该设备身份以及 Gateway 签发的设备令牌，并将其限定在签发它们的规范 Gateway 端点上。配对不同的 Gateway 会创建独立的身份、令牌和会话托管；凭据和会话绝不会跨端点复用。扩展不会持久保存 Gateway 共享密钥。面板只能订阅其自己的标签页会话，Gateway 会在投递前过滤这些事件。

如果在运行期间 Gateway 连接中断，扩展会保留该运行 ID 的持久托管。重连时，它会在重新启用任何面板之前终止未解决的运行，然后重新加载会话记录。这种故障关闭步骤可防止浏览器操作在投递间隙中无形继续执行。

关闭标签页会立即移除其活动订阅、中止任何可见运行，并将该标签页的会话标记为已归档。如果 Gateway 暂时离线，扩展会持久保存待处理的归档操作，并且仅在同一 Gateway 端点重新连接时重试；它绝不会向其他 Gateway 发送归档请求。浏览器崩溃后，下一次启动时会归档上一个浏览器实例留下的会话。已归档的会话会拒绝新工作，但其记录仍可在会话历史中使用。浏览器 copilot 密钥属于线程会话，因此常规的使用年限和条目数维护会保留这些密钥。每个代理的会话磁盘预算仍然适用（默认值为 `10gb`），并可能在磁盘空间紧张时淘汰最旧的会话；请参阅[会话维护](/reference/session-management-compaction#store-maintenance-and-disk-controls)。

侧边栏当前需要 Gateway 托管的扩展中继或直接的远程 Gateway 中继。浏览器节点上的回环中继目前无法提供类型化标签页绑定所需的节点路由，因此该面板会拒绝这种拓扑，而不是回退到全局浏览器路由。

## 将页面发送到 OpenClaw

在工具栏弹出窗口中使用 **发送页面到 OpenClaw**，将可读的页面文本分享给你的主 OpenClaw 会话。你可以添加可选备注，使用页面或选中文本的右键菜单，或按 `Alt+Shift+S`。OpenClaw 会优先使用你当前的选区（如果存在），将分享排队为系统事件，并立即唤醒主会话。

该标签页不需要位于 OpenClaw 标签组中。这是一次性、显式的分享：页面上不会暴露任何其他内容，并且不会授予任何持续访问权限。Google Docs 会使用你已登录的浏览器会话导出为纯文本，无需 Google API 设置。X 和 Twitter 线程会在去除周围界面外壳后提取。

页面文本被包裹在 OpenClaw 的外部内容安全边界中。你的可选备注保留在该边界之外，作为你自己的指令。页面文本和选区上限约为 120,000 个字符，超出时会包含截断标记。

当扩展中继由 Gateway 托管时，页面共享可正常工作，使用同主机配对或直接的 `wss://` Gateway 配对。目前由 Node 托管的中继会返回一个明确的错误。要重新映射键盘快捷键，请打开 `chrome://extensions/shortcuts`。

## 远程 / 跨机器

Chrome 不必运行在 Gateway 主机上。有三种拓扑可行：

- **同一主机**（Gateway + Chrome 在一台机器上）：在该机器上使用
  `openclaw browser extension pair` 进行配对。中继仅限于本机回环。
  如果本地 Gateway 使用 TLS，请显式传入其证书主机名
  `--gateway-url wss://gateway-host.example`；配对过程绝不会替换为回环 IP。
- **直接连接远程 Gateway**（Chrome 在你的笔记本上，Gateway 在 VPS 上，并且
  笔记本上**没有其他任何东西**）：在 Gateway 上运行
  `openclaw browser extension pair --gateway-url wss://your-gateway.example.com`。
  它会打印一个 `wss://…/browser/extension#<secret>` 字符串；在笔记本上加载并配对
  扩展。扩展会通过 `wss://` **直接连接到 Gateway** —— 笔记本上不需要 OpenClaw 安装、Node、CLI，也不需要开放入站端口。
  这是托管主机路径。
- **通过浏览器节点主机**（Chrome 在一台已经运行 OpenClaw
  节点的机器上）：在该节点上运行 `pair` 并在本地配对；Gateway 会通过其现有的已认证节点链接将浏览器操作代理到该节点。

配对密钥按主机区分（在直接连接的情况下是 Gateway 的主机），由 Gateway 的
`/browser/extension` 路由进行验证。对于直接路径，请通过 TLS（`wss://`）提供 Gateway，
以便配对密钥和 CDP 流量都被加密。
该密钥保留在配对字符串的 URL 片段中，并在 WebSocket 握手期间作为子协议凭据传递，因此正常的代理访问日志不会在请求 URL 中接收到它。请确保任何反向代理都保留标准的 `Sec-WebSocket-Protocol` 标头。

## 诊断

```bash
openclaw browser status --browser-profile chrome
openclaw browser doctor --browser-profile chrome
```

`doctor` 会将 **Chrome 扩展中继** 检查报告为失败，直到
扩展弹窗显示 **已连接**。

## 安全模型

- 中继仅绑定本地回环接口；WebSocket 双端都使用派生令牌进行身份验证，并且扩展端会将来源校验为 `chrome-extension://`。
- 直接 Gateway 配对不会在请求 URL 中接受中继令牌；捆绑的扩展会改为在 WebSocket 子协议列表中携带它。
- 代理只能查看和操作 **OpenClaw 标签组** 中的标签页。你的其他标签页仍然保持私有。
- 侧边栏运行会经过双重范围限制：Gateway 投递使用每个会话的允许列表，而浏览器工具会强制执行在提示之外传递的 Chrome 标签页/目标绑定。
- 与 `user`（Chrome MCP）配置文件相比，后者在你批准远程调试提示后会暴露你整个已登录的浏览器，而扩展只会将共享范围限制在一个你一眼就能掌控的标签组中。

另请参阅：[Browser](/tools/browser)，以了解完整的配置文件模型，以及受管理的 `openclaw` 和 Chrome MCP `user` 配置文件。
