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

## 远程 / 跨机器

Chrome 不必运行在 Gateway 主机上。有三种拓扑可行：

- **同一主机**（Gateway + Chrome 在一台机器上）：在那台机器上使用
  `openclaw browser extension pair` 进行配对。中继仅限回环地址。
- **直接连接到远程 Gateway**（Chrome 在你的笔记本上，Gateway 在一台 VPS 上，而笔记本上
  **没有其他任何东西**）：在 Gateway 上运行
  `openclaw browser extension pair --gateway-url wss://your-gateway.example.com`。
  它会打印一个 `wss://…/browser/extension#<secret>` 字符串；在笔记本上加载并配对该
  扩展。扩展会通过 `wss://` **直接连接到 Gateway**——笔记本上不需要安装 OpenClaw、Node、
  CLI，也不需要开放入站端口。这是托管主机场景的路径。
- **通过浏览器节点主机**（Chrome 在一台已经运行 OpenClaw 节点的机器上）：在该节点上运行
  `pair` 并在本地配对；Gateway 通过该节点现有的已认证节点连接，将浏览器操作代理到该节点。

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

- 代理仅绑定本地回环；WebSocket 两端都使用派生令牌进行身份验证，扩展端还会将来源检查限制为 `chrome-extension://`。
- 直接 Gateway 配对不会在请求 URL 中接受 relay 令牌；捆绑的扩展会在 WebSocket 子协议列表中携带它。
- agent 只能查看和控制 **OpenClaw 标签页组** 中的标签页。你的其他标签页将保持私密。
- 与 `user`（Chrome MCP）配置文件相比，后者在你批准远程调试提示后会暴露整个已登录浏览器，而扩展会将共享范围限制在你一眼就能掌控的标签页组内。

另请参阅：[Browser](/tools/browser)，以了解完整的配置文件模型，以及受管理的 `openclaw` 和 Chrome MCP `user` 配置文件。
