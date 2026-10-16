---
summary: "为模型提供真正的浏览器会暴露什么，以及限制它的 SSRF 策略"
read_when:
  - "启用浏览器控制或 Chrome 扩展中继"
  - "决定代理可以驱动哪个浏览器配置文件"
  - "调整浏览器 SSRF 允许和阻止列表"
title: "浏览器控制风险"
sidebarTitle: "浏览器控制"
---

## <a id="browser-control-risks"></a> 浏览器控制风险

启用浏览器控制会让模型获得一个真实浏览器。如果该配置文件已经有登录会话，模型就可以访问那些账户和数据——请将浏览器配置文件视为敏感状态。

- 优先为 agent 使用专用配置文件（默认的 `openclaw` 配置文件）；避免使用你个人日常使用的配置文件。
- 除非你信任沙箱 agent，否则请保持对其禁用主机浏览器控制。
- 独立的 loopback 浏览器控制 API 仅支持 shared-secret 认证（Gateway token bearer 认证或 Gateway password）——它不会使用 trusted-proxy 或 Tailscale Serve 身份标头。
- 将浏览器下载内容视为不受信任的输入；优先使用隔离的下载目录。
- 如果可能，请在代理配置文件中禁用浏览器 sync/password 管理器。
- 对于远程 Gateway，“浏览器控制”等同于对该配置文件能够访问的任何内容拥有“操作者访问权限”。
- 保持 Gateway 和 node 主机仅限 tailnet 访问；避免将浏览器控制端口暴露给 LAN 或公共互联网。
- 不需要时禁用浏览器代理路由（`gateway.nodes.browser.mode="off"`）。
- Chrome MCP existing-session 模式并不“更安全”——它可以代表你操作该主机上的 Chrome 配置文件能够访问的任何内容。
- Browser Relay Authentication v2 永远不会发送持久化的扩展 relay key。扩展和外部 CDP 客户端会在返回短期、一次性、与连接绑定的 HMAC proof 之前，验证带签名的服务器 challenge。Proof 会绑定 protocol version、role、transport、method、resource、flow、profile 和 relay instance；在同一或其他 socket 上重放都会失败。
- `browser.extensionRelay.allowLegacyAuth` 默认设为 `true`，用于一个迁移窗口期。这会临时接受旧版 Bearer、Basic 和 token-subprotocol relay 客户端。更新所有 relay 客户端后，将其设为 `false`。V2 客户端在 proof 失败或收到不支持的响应后永远不会降级。
- Chrome 扩展配对会将其访问模式存储在扩展自有的 Chrome 存储中，而不是 Gateway 配置中。**All tabs** 会暴露该 Chrome 配置文件中所有符合条件的普通标签页，但会排除已暂停会话的标签页；**Selected tabs** 使用 OpenClaw 标签页组作为其 ACL。现有配对会迁移到 **Selected tabs**，而新的个人浏览器配对推荐使用 **All tabs**。无论哪种模式，Incognito 和 Chrome 内部页面都会被排除。
- 自动 Chrome 扩展设置使用从 Chrome 配置文件元数据中的确切解压扩展路径发现的源锁定本机消息传递清单。一次性主机仅接受带有新随机数的版本化请求，将输入上限设置为 4 KiB，验证 Chrome- 提供的源，并仅返回本地拥有的配对。它从不传输远程网关密钥。
- Native 主机清单、启动器和状态输出不包含配对密钥。 OpenClaw 拒绝符号链接、不安全的 ownership/modes、通配符来源以及使用相同主机名的外部注册。 Windows 使用手动配对回退，直到支持可执行的本机主机路径。
- 在浏览器机器上运行**节点主机**，并让网关在网关远离浏览器时代理浏览器操作（请参阅[浏览器工具](/tools/browser)）；将节点配对视为管理员访问，将网关和节点主机保持在同一尾网上，并避免通过 LAN、公共互联网或 Tailscale 漏斗公开 relay/control 端口。

### <a id="browser-ssrf-policy-(strict-by-default)"></a><a id="browser-ssrf-policy-strict-by-default"></a> 浏览器 SSRF 策略（默认严格）

除非您明确选择加入，否则 Private/internal 目标将保持被阻止状态。

- 默认：`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 未设置，因此 private/internal/special-use 目标保持阻止状态。仍接受旧别名 `allowPrivateNetwork`。
- 选择性启用：将 `dangerouslyAllowPrivateNetwork: true` 设为允许这些目标。
- `browser.ssrfPolicy.blockedHostnames` 拒绝 DNS 之前的确切主机和通配符子域以及任何允许规则，包括专用网络例外。 `*.example.com`不遮挡顶点`example.com`；添加两者以阻止整个域。空列表或不存在的列表不会添加任何拒绝。 `tools.web.fetch.ssrfPolicy.blockedHostnames` 为受保护的获取（包括重定向）提供相同的策略。
- 在严格模式下，对 `*.example.com` 等模式和精确主机异常使用通配符感知 `allowedHostnames` 条目，包括 `localhost` 等其他被阻止的名称。
- 直接导航请求会经过预检检查。在操作期间及有界的操作后宽限期内，受保护的 Playwright 交互（点击、坐标点击、悬停、拖拽、滚动、选择、按键、输入、表单填充和 evaluate）会在 HTTP 请求字节发出之前拦截策略拒绝的顶层和子框架文档加载，然后以尽力而为的方式再次检查最终的 `http(s)` URL。
- 在每次新托管的 Chrome 启动之前，OpenClaw 会尽力禁用网络预测，从而抑制 Chromium 针对那些被拒绝的负载观察到的推测性预连接。这是深度防御，而不是策略边界：在控制服务重新启动期间重用的浏览器和其他浏览器后端可能不会共享强化。页面路由仍然是请求级拦截，而不是网络防火墙：重定向跃点、弹出窗口的第一个请求、Service Worker 流量、在有界保护窗口之后运行的页面代码以及一些 background/subresource 路径可以绕过它。最终-URL检查仍然保持detection/quarantine防御；完全预防需要所有者端出口隔离或策略执行代理。

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
