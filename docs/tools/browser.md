---
summary: "OpenClaw 浏览器文档索引，每个读者作业一页"
read_when:
  - "添加由代理控制的浏览器自动化"
  - "排查 openclaw 为何干扰你自己的 Chrome"
  - "在 macOS 应用中实现浏览器设置 + 生命周期"
  - "您正在寻找与您的任务匹配的浏览器页面"
title: "浏览器（OpenClaw-托管）"
---

OpenClaw 可以运行一个由代理控制的**专用 Chrome/Brave/Edge/Chromium 配置文件**。它通过 Gateway 内部的一个小型本地控制服务运行（仅限回环地址），并且与您的个人浏览器隔离。

- 可以把它看作一个**独立的、仅供代理使用的浏览器**。`openclaw` 配置文件绝不会触碰您的个人浏览器配置文件。
- 代理会在这个隔离通道中打开标签页、读取页面、点击和输入。
- 内置的 `user` 配置文件通过 Chrome DevTools MCP 附加到您真实登录的 Chrome 会话。

此页是一个索引。浏览器文档分为九页，每个读者作业一页。打开与您的任务匹配的页面。

| 页面                                                                         | 读它的时候                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [浏览器设置](/tools/browser/setup)                                        | 您是第一次打开浏览器，或者缺少该工具。      |
| [浏览器配置文件](/tools/browser/profiles)                                  | 您正在托管浏览器和登录的 Chrome 会话之间进行选择。    |
| [浏览器配置](/tools/browser/configuration)                        | 您需要配置块、端口、SSRF 策略或不同的 Chromium 二进制文件。  |
| [远程和托管浏览器](/tools/browser/remote)                          | 浏览器位于另一台计算机上，或者您使用托管的 CDP 提供商。         |
| [浏览器安全](/tools/browser/security)                                  | 您正在查看 control-API 身份验证或处理远程 CDP 令牌。               |
| [多配置文件和现有会话附加](/tools/browser/existing-session) | 您需要在登录的浏览器中添加额外的命名配置文件或代理。       |
| [隔离和浏览器选择](/tools/browser/isolation)                  | 您需要隔离保证、二分搜索顺序或控制 API。 |
| [浏览器故障排除](/tools/browser/troubleshooting)                    | 浏览器将无法启动，或者导航被阻止。                         |
| [浏览器代理工具](/tools/browser/agent-tools)                            | 您需要浏览器工具操作和代理传递的参数。            |

## <a id="what-you-get"></a> 你将获得什么

- 一个名为 **openclaw** 的独立浏览器配置文件（默认橙色强调色）。
- 直接选项卡控件（list/open/focus/close）。
- Agent 操作 （click/type/drag/select）、快照、屏幕截图、PDF。
- 确定性的标签页控制（列表/打开/聚焦/关闭）。
- Playwright- 支持的配置文件将直接附件导航保存在托管下载目录下，并在最终 URL 策略验证后返回 `{ url, suggestedFilename, path }` 元数据。
- 当操作立即开始一项或多项下载时，Playwright- 支持的代理操作将返回具有相同托管元数据的 `downloads` 数组。
- 一个捆绑的 `browser-automation` 技能，在浏览器插件启用时，教导代理使用快照、稳定标签页、失效引用和手动阻塞恢复循环。
- 可选的多配置文件支持（`openclaw`、`work`、`remote`、...）。

这个浏览器**不是**你的日常主力浏览器。它是一个安全、隔离的表面，供代理自动化和验证使用。

在 macOS 上，您可以将 Cookie 从 Chrome-family 系统配置文件显式复制到单独的托管配置文件中。托管浏览器仍然使用自己的用户数据目录。仅复制选定的 cookie，并保留本地存储和 IndexedDB。有关导入命令和限制，请参阅 [Profiles](/tools/browser/existing-session#profiles-multi-browser) 或 [`openclaw browser` CLI 参考 ](/cli/browser)。

## <a id="where-each-section-moved"></a> 各部分移动的地方

先前单页版本的每个部分标题都保留其锚点，因此现有链接（例如 `/tools/browser#custom-chrome-mcp-launch`）仍然可以解析。每个条目都指向现在保存内容的页面。

- <a id="quick-start" />[快速入门](/tools/browser/setup#quick-start)
- <a id="plugin-control" />[插件控制](/tools/browser/setup#plugin-control)
- <a id="agent-guidance" />[代理指导](/tools/browser/setup#agent-guidance)
- <a id="missing-browser-command-or-tool" />[缺少浏览器命令或工具](/tools/browser/setup#missing-browser-command-or-tool)
- <a id="profiles%3A-openclaw%2C-user%2C-chrome" /><a id="profiles-openclaw-user-chrome" />[型材：`openclaw`、`user`、`chrome`](/tools/browser/profiles)
- <a id="browser-panel-in-the-control-ui" />[ Control 中的浏览器面板 UI](/tools/browser/profiles#browser-panel-in-the-control-ui)
- <a id="configuration" />[配置](/tools/browser/configuration#configuration)
- <a id="tab-cleanup-ownership" />[选项卡清理所有权](/tools/browser/configuration#tab-cleanup-ownership)
- <a id="screenshot-vision-(text-only-model-support)" /><a id="screenshot-vision-text-only-model-support" />[截图视觉（纯文字模型支持）](/tools/browser/configuration#screenshot-vision-text-only-model-support)
- <a id="ports-and-reachability" />[端口和可达性](/tools/browser/configuration#ports-and-reachability)
- <a id="ssrf-policy" />[SSRF 政策](/tools/browser/configuration#ssrf-policy)
- <a id="profile-behavior" />[个人资料行为](/tools/browser/configuration#profile-behavior)
- <a id="use-brave-or-another-chromium-based-browser" />[使用Brave或其他基于Chromium-的浏览器](/tools/browser/configuration#use-brave-or-another-chromium-based-browser)
- <a id="macos" />[macOS可执行路径选项卡](/tools/browser/configuration#macos)
- <a id="windows" />[Windows可执行路径选项卡](/tools/browser/configuration#windows)
- <a id="linux" />[Linux可执行路径选项卡](/tools/browser/configuration#linux)
- <a id="local-vs-remote-control" />[本地与远程控制](/tools/browser/remote#local-vs-remote-control)
- <a id="node-browser-proxy-(zero-config-default)" /><a id="node-browser-proxy-zero-config-default" />[节点浏览器代理（零配置默认）](/tools/browser/remote#node-browser-proxy-zero-config-default)
- <a id="browserless-(hosted-remote-cdp)" /><a id="browserless-hosted-remote-cdp" />[无浏览器（托管远程 CDP）](/tools/browser/remote#browserless-hosted-remote-cdp)
- <a id="browserless-docker-on-the-same-host" />[同一主机上的无浏览器 Docker](/tools/browser/remote#browserless-docker-on-the-same-host)
- <a id="direct-websocket-cdp-providers" />[直接 WebSocket CDP 提供商](/tools/browser/remote#direct-websocket-cdp-providers)
- <a id="browserbase" />[浏览器库](/tools/browser/remote#browserbase)
- <a id="notte" />[Notte](/tools/browser/remote#notte)
- <a id="security" />[安全](/tools/browser/security)
- <a id="profiles-(multi-browser)" /><a id="profiles-multi-browser" />[配置文件（多浏览器）](/tools/browser/existing-session#profiles-multi-browser)
- <a id="existing-session-via-chrome-devtools-mcp" />[通过 Chrome 进行的现有会话 DevTools MCP](/tools/browser/existing-session#existing-session-via-chrome-devtools-mcp)
- <a id="custom-chrome-mcp-launch" />[定制Chrome MCP推出](/tools/browser/existing-session#custom-chrome-mcp-launch)
- <a id="existing-session-feature-limitations" />[现有会话功能限制](/tools/browser/existing-session#existing-session-feature-limitations)
- <a id="isolation-guarantees" />[隔离保证](/tools/browser/isolation#isolation-guarantees)
- <a id="browser-selection" />[浏览器选择](/tools/browser/isolation#browser-selection)
- <a id="control-api-(optional)" /><a id="control-api-optional" />[控制API（可选）](/tools/browser/isolation#control-api-optional)
- <a id="troubleshooting" />[故障排除](/tools/browser/troubleshooting)
- <a id="cdp-startup-failure-vs-navigation-ssrf-block" />[CDP 启动失败 vs 导航 SSRF 阻塞](/tools/browser/troubleshooting#cdp-startup-failure-vs-navigation-ssrf-block)
- <a id="agent-tools-%2B-how-control-works" /><a id="agent-tools-+-how-control-works" />[代理工具+控制工作原理](/tools/browser/agent-tools)

## <a id="related"></a> 相关内容

- [Tools Overview](/tools) - 所有可用的代理工具。
- [沙箱环境](/gateway/sandboxing) - 沙箱环境中的浏览器控制
- [安全性](/gateway/security) - 浏览器控制风险与加固。
- [Web fetch](/tools/web-fetch) - 无需驱动浏览器即可检索页面
- [Diffs](/tools/diffs) - 代理的只读差异查看器和文件渲染器
- [浏览器登录](/tools/browser-login) - 在自动化之前将配置文件签名到站点中
