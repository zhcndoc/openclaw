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

- **浏览器控制服务**（Gateway 或节点主机）：`browser` 工具调用的 API。
- **扩展中继**：控制服务在回环地址上为同主机和浏览器节点设置的小型服务器，或通过 Gateway 的中继身份验证 WebSocket 路由为直接远程设置提供服务。它向 OpenClaw 提供 Chrome DevTools
  协议端点，并与扩展通信。
- **OpenClaw Chrome 扩展**（MV3）：负责访问策略，使用 `chrome.debugger` 附加到
  允许的标签页，转发 CDP 流量，并管理
  **OpenClaw 标签页组**。

配对时会选择两种由扩展控制的访问模式之一。**所有标签页**会让此 Chrome 配置文件中每个符合条件的普通标签页都可用，是个人浏览器推荐的默认模式。**选定的标签页**仅公开位于 **OpenClaw 标签页组**中的标签页。扩展只公布当前可访问的标签页，并会在带有权限的命令执行前后重新检查资格、模式和撤销状态，因此过时的中继状态无法恢复访问权限。

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

4. 点击 OpenClaw 工具栏图标，粘贴配对字符串，然后选择
   **所有标签页** 或 **选定的标签页**。新配对默认使用 **所有标签页**。扩展连接到中继服务后，徽章会变为 **开启**。

配对密钥是一个**按主机生成的密钥**，首次使用时创建，并以 `0600` 模式存储在状态目录下的
`credentials/` 中。每台运行浏览器的机器——Gateway 主机以及每台浏览器节点主机——都拥有自己的密钥，因此无需在机器之间传输任何凭据。若要轮换密钥，请删除
`browser-extension-relay.secret` 文件，然后重新配对。

密钥保留在配对字符串片段中，而不会出现在发送到服务器的 WebSocket URL 中。浏览器中继身份验证 v2 仅将其用作 HMAC 密钥：扩展先验证中继服务签名且与连接绑定的质询，然后发送一次性证明。密钥绝不会通过 URL、标头、WebSocket 子协议或应用程序帧发送。但仍应将完整的配对字符串视为密码。

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

### 选择标签页访问权限

- **所有标签页**：OpenClaw 可以枚举并控制此 Chrome 配置文件中所有符合条件的普通标签页，包括已登录的网站。OpenClaw 群组是代理创建的标签页的组织标记；将标签页拖入或拖出该群组不会改变访问权限。使用工具栏弹出窗口中的 **在此标签页上暂停 OpenClaw** 可排除某个标签页，使用 **允许 OpenClaw 访问此标签页** 可恢复访问。
- **选定的标签页**：群组成员身份是访问控制边界。点击 **与 OpenClaw 共享此标签页**，或将标签页拖入 OpenClaw 群组，即可授予访问权限。点击 **停止共享此标签页**，或将其拖出群组，即可撤销访问权限。

随时可以在弹出窗口设置中更改 **访问权限**。从 **所有标签页** 切换到 **选定的标签页** 时，会立即分离所有未分组的标签页，包括正在进行的连接。切换回来后，可用目标会刷新。已暂停的标签页 ID 在本次浏览器会话的剩余时间内保持暂停状态；如果返回 **所有标签页** 模式，它们会再次生效。

在访问模式推出之前创建的现有有效配对会迁移到 **选定的标签页**，保留其原有的仅限群组的安全承诺。格式错误的已存储模式也会被修复为 **选定的标签页**，且不会丢弃配对信息。新配对会明确选择模式，默认使用 **所有标签页**。

代理创建的标签页在两种模式下都会进入 OpenClaw 群组。标签页连接期间，Chrome 会显示可关闭的“OpenClaw 已开始调试此浏览器”横幅。在 **所有标签页** 模式下选择 **取消**，会在本次浏览器会话中暂停该标签页；在 **选定的标签页** 模式下，则会将该标签页移出群组。

扩展程序永远不会暴露隐身标签页、没有当前 ID 或 URL 的标签页，或 `chrome://`、`chrome-extension://`、`devtools://` 以及继承来源的 `about:blank` 等内部页面。它允许普通的 `http://`、`https://` 和 `data:` 文档、由 HTTP(S) 来源支持的 `blob:` 文档，以及在 Chrome 的 **允许访问文件网址** 设置允许调试器连接时的 `file://` 页面。

### 已认证的外部 CDP 客户端

中继支持 Browser Relay Authentication v2 客户端，例如 mcporter。它们使用相同的已配对 Chrome 和相同的扩展程序访问策略，不会触发 Chrome 的“允许远程调试吗？”提示。打印非机密的 v2 端点元数据：

```bash
openclaw browser extension cdp
```

`openclaw browser extension cdp --json` 会输出回环端点、协议版本、密钥 ID 以及固定的 challenge/complete 资源元数据。它永远不会输出中继密钥或授权标头。v2 客户端必须从 challenge 开始，到 `/json/version` 以及 `/cdp` WebSocket 升级期间，始终使用同一个原始回环 TCP 连接；重定向、重新连接以及第二个上游套接字都不属于有效的中继身份验证。

在迁移期间，旧版外部客户端可以显式请求旧版 Bearer 标头：

```bash
openclaw browser extension cdp --legacy-bearer
```

此命令会发出警告，因为它会在凭据标头中暴露中继密钥。只有在 `browser.extensionRelay.allowLegacyAuth` 为 `true` 时才有效；禁用旧版身份验证后，该命令会失败且不会打印凭据。

[mcporter](https://github.com/openclaw/mcporter) 是受支持的外部 CDP 适配器。请使用支持 Browser Relay Authentication v2 的版本；OpenClaw 端的升级不会更新 mcporter。当已配对的中继在此主机上响应时，兼容的 mcporter 版本会透明地将 `chrome-devtools-mcp --autoConnect` 服务器命令重写为中继端点，因此通过 mcporter 调用 Chrome DevTools 的代理会自动跳过远程调试提示（在其中设置 `MCPORTER_DISABLE_CHROME_DEVTOOLS_RELAY=1` 可选择退出）。

## 迁移中继身份验证

新的 OpenClaw 扩展使用浏览器中继身份验证 v2，并且在证明无效、超时、响应不受支持或连接失败后绝不会重试旧版身份验证。

- 现有的有效配对字符串会在本地迁移为 `authVersion: 2`；你无需再次配对即可完成协议升级。
- 迁移期间会清除位于路径前缀代理之后的已存储直接 Gateway 配对。请使用不带路径前缀的 Gateway URL 重新运行 `openclaw browser extension pair`；v2 仅支持确切的 `/browser/extension` 路由。
- 请先升级 OpenClaw，再升级扩展。v2 扩展会将旧服务器报告为需要升级，而不是发送旧令牌。
- 当 `browser.extensionRelay.allowLegacyAuth` 保持默认值 `true` 时，旧版扩展和外部 CDP 客户端会在一个迁移窗口内继续工作。
- 当所有扩展和外部 CDP 客户端都使用 v2 后，将 `browser.extensionRelay.allowLegacyAuth` 设置为 `false`，并重启 Gateway 或浏览器节点主机。
- 轮换 `credentials/browser-extension-relay.secret` 会更改密钥 ID，关闭已通过身份验证的中继会话，清除待处理状态和重放状态，并要求重新配对扩展。

V2 外部 CDP 访问要求客户端实现同一套基于同一套接字的 HTTP 挑战、完成、发现和 WebSocket 升级序列。通用的 Puppeteer 或 chrome-devtools-mcp 客户端本身并未实现该序列；请使用支持 v2 的适配器，或仅在迁移窗口期间使用明确警告的旧版逃生通道。

### 标签页 copilot 侧边栏

配对扩展后，点击其工具栏弹出窗口中的 **打开标签页 copilot**。
OpenClaw 会为那个特定的 Chrome 标签页配置 `sidepanel.html`；manifest 中没有全局侧边栏路径。因此，每个标签页都会获得一个单独的面板文档、Gateway 会话、消息订阅以及类型化的浏览器工具绑定。

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

- **同一主机**（Gateway + Chrome 在同一台机器上）：在该机器上使用
  `openclaw browser extension pair` 完成配对。中继仅监听回环地址。
  如果本地 Gateway 使用 TLS，请使用 `--gateway-url wss://gateway-host.example` 显式传入其证书主机名；配对过程绝不会用回环 IP 替代该主机名。
- **直接连接远程 Gateway**（Chrome 在你的笔记本电脑上，Gateway 在 VPS 上，并且
  **笔记本电脑上没有其他组件**）：在 Gateway 上运行 `openclaw browser extension pair --gateway-url wss://your-gateway.example.com`。
  它会输出一个 `wss://…/browser/extension#<secret>` 字符串；在笔记本电脑上加载并配对扩展。扩展通过 `wss://` **直接连接到 Gateway**
  ——笔记本电脑上无需安装 OpenClaw、Node 或 CLI，也无需开放入站端口。这是托管环境使用路径。Gateway URL 必须在没有路径重写代理前缀的情况下暴露 `/browser/extension`，因为 v2 会将精确的请求路径绑定到每个证明中。
- **通过浏览器节点主机**（Chrome 在一台已经运行 OpenClaw
  节点的机器上）：在该节点上运行 `pair` 并在本地完成配对；Gateway 会通过现有的已认证节点连接，将浏览器操作代理到该节点。

配对密钥按主机区分（在直接连接的情况下，使用 Gateway 的密钥），并由 Gateway 的 `/browser/extension` 路由进行验证。对于直接连接路径，请通过 TLS（`wss://`）提供 Gateway 服务，以便加密证明交换和 CDP 流量。密钥保留在配对字符串的 URL 片段中，绝不会发送给服务器。扩展只提供不包含密钥的
`openclaw-extension-relay.v2` WebSocket 子协议。请确保任何反向代理都保留标准的 `Sec-WebSocket-Protocol` 请求头。

## 诊断

```bash
openclaw browser status --browser-profile chrome
openclaw browser doctor --browser-profile chrome
```

在扩展弹出窗口显示 **已连接** 之前，`doctor` 会报告 **Chrome 扩展中继** 检查失败。`openclaw doctor` 还会在旧版中继身份验证仍处于启用状态时发出警告，并告知你何时设置
`browser.extensionRelay.allowLegacyAuth=false`。

## 安全模型

- 同主机和浏览器节点中继绑定到回环地址；直接远程配对使用网关的
  `wss://` 路由。两者都使用根据每主机密钥派生的、与连接绑定的 HMAC 证明，扩展端则会校验来源是否为
  `chrome-extension://`。
- 在验证中继的服务器证明之前，客户端只发送非机密的密钥 ID 和新鲜随机数；它绝不会发送 HMAC 证明。客户端证明具有较短的有效期、只能使用一次，并且绑定到确切的套接字、协议版本、角色、传输方式、方法、资源、流程、配置文件和中继实例。
- 在 v2 中，每主机密钥永远不会被传输。证明验证失败时，不会回退到传统的 Bearer、Basic 或令牌子协议身份验证。
- 中继只公开所选访问模式允许的标签页。扩展会在每次具有权限的现有标签页命令之前和之后，独立重新检查资格和当前策略。在**已选标签页**模式下，分组就是访问控制列表（ACL）；在**所有标签页**模式下，明确暂停的标签页仍保持隐藏。
- 侧边栏运行会受到双重限制：网关交付使用按会话设置的允许列表，浏览器工具则强制执行提示词之外携带的 Chrome 标签页/目标绑定。
- **所有标签页**会授予对此配置文件中符合条件的已登录网站的广泛权限，以换取最佳的无人值守体验。**已选标签页**会将权限缩小到一个可见分组，但需要有意识地管理标签页。与 `user`（Chrome MCP）配置文件相比，该扩展增加了这种模式选择和按标签页暂停会话的功能，同时不会弹出阻塞性的远程调试提示。

另请参阅：[浏览器](/tools/browser)，以了解完整的配置文件模型，以及受管理的 `openclaw` 和 Chrome MCP `user` 配置文件。
