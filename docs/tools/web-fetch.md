---
summary: "web_fetch 工具 -- 具有可读内容提取的 HTTP 获取"
read_when:
  - 你想获取一个 URL 并提取可读内容
  - 你需要配置 web_fetch 或其 Firecrawl 回退
  - 你想了解 web_fetch 的限制和缓存
title: "Web fetch"
sidebarTitle: "Web Fetch"
---

`web_fetch` 工具会执行普通的 HTTP GET 并提取可读内容
（HTML 转 markdown 或文本）。它**不会**执行 JavaScript。

对于重度依赖 JS 的站点或受登录保护的页面，请改用
[Web Browser](/tools/browser)。

## 快速开始

`web_fetch` 默认**已启用**——无需任何配置。代理可以
立即调用它：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## 工具参数

<ParamField path="url" type="string" required>
要获取的 URL。仅支持 `http(s)`。
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
主内容提取后的输出格式。
</ParamField>

<ParamField path="maxChars" type="number">
将输出截断到这么多字符。
</ParamField>

## 工作原理

<Steps>
  <Step title="Fetch">
    使用类似 Chrome 的 User-Agent 和 `Accept-Language`
    请求头发送 HTTP GET。会阻止私有/内部主机名，并重新检查重定向。
  </Step>
  <Step title="Extract">
    在 HTML 响应上运行 Readability（主内容提取）。
  </Step>
  <Step title="Fallback (optional)">
    如果 Readability 失败且已配置 Firecrawl，则通过
    Firecrawl API 以反机器人绕过模式重试。
  </Step>
  <Step title="Cache">
    结果会缓存 15 分钟（可配置），以减少对同一 URL 的重复
    获取。
  </Step>
</Steps>

## 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // 默认：true
        provider: "firecrawl", // 可选；省略则自动检测
        maxChars: 50000, // 最大输出字符数
        maxCharsCap: 50000, // maxChars 参数的硬上限
        maxResponseBytes: 2000000, // 截断前的最大下载大小
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        useTrustedEnvProxy: false, // 让受信任的 HTTP(S) 环境代理解析 DNS
        readability: true, // 使用 Readability 提取
        userAgent: "Mozilla/5.0 ...", // 覆盖 User-Agent
        ssrfPolicy: {
          allowRfc2544BenchmarkRange: true, // 针对使用 198.18.0.0/15 的受信任假 IP 代理进行可选启用
          allowIpv6UniqueLocalRange: true, // 针对使用 fc00::/7 的受信任假 IP 代理进行可选启用
        },
      },
    },
  },
}
```

## Firecrawl 回退

如果 Readability 提取失败，`web_fetch` 可以回退到
[Firecrawl](/tools/firecrawl)，以实现反机器人绕过和更好的提取：

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // 可选；省略则自动从可用凭据中检测
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            apiKey: "fc-...", // 如果已设置 FIRECRAWL_API_KEY，则可选
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 86400000, // 缓存时长（1 天）
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` 支持 SecretRef 对象。
旧版 `tools.web.fetch.firecrawl.*` 配置会通过 `openclaw doctor --fix` 自动迁移。

<Note>
  如果 Firecrawl 已启用，但其 SecretRef 未解析且没有
  `FIRECRAWL_API_KEY` 环境变量回退，网关启动将快速失败。
</Note>

<Note>
  Firecrawl `baseUrl` 覆盖已被锁定：托管流量使用
  `https://api.firecrawl.dev`；自托管覆盖必须指向私有或
  内部端点，并且仅对这些私有目标接受 `http://`。
</Note>

当前运行时行为：

- `tools.web.fetch.provider` 明确选择抓取回退提供方。
- 如果省略 `provider`，OpenClaw 会根据可用凭据自动检测第一个就绪的 web-fetch
  提供方。非沙箱化的 `web_fetch` 可以使用声明了 `contracts.webFetchProviders` 的
  已安装插件，并在运行时注册匹配的提供方。当前捆绑的提供方是 Firecrawl。
- 沙箱化的 `web_fetch` 调用仍仅限于捆绑提供方。
- 如果禁用了 Readability，`web_fetch` 会直接跳到所选
  提供方回退。如果没有可用提供方，则会安全失败。

## Trusted env proxy

如果你的部署要求 `web_fetch` 通过受信任的外部
HTTP(S) 代理，请设置 `tools.web.fetch.useTrustedEnvProxy: true`。

在此模式下，OpenClaw 在发送请求前仍会应用基于主机名的 SSRF 检查，
但它会让代理解析 DNS，而不是在本地进行 DNS 固定。仅当代理由操作员控制，
并且在 DNS 解析后强制执行外发策略时才启用此功能。

<Note>
  如果未配置 HTTP(S) 代理环境变量，或者目标主机被
  `NO_PROXY` 排除，`web_fetch` 将回退到带本地 DNS
  固定的正常严格路径。
</Note>

## 限制与安全

- `maxChars` 会被限制为 `tools.web.fetch.maxCharsCap`
- 在解析前，响应正文会被限制为 `maxResponseBytes`；超大
  响应会带警告地截断
- 私有/内部主机名会被阻止
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是针对受信任假 IP 代理栈的
  细粒度可选项；除非你的代理拥有这些合成范围并强制执行其自身的目标策略，否则请保持未设置
- 重定向会被检查并受 `maxRedirects` 限制
- `useTrustedEnvProxy` 是显式可选启用项，并且仅应为仍在 DNS
  解析后强制执行外发策略的、由操作员控制的代理启用
- `web_fetch` 尽力而为——某些站点需要 [Web Browser](/tools/browser)

## 工具配置文件

如果你使用工具配置文件或允许列表，请添加 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // 或：allow: ["group:web"]  （包含 web_fetch、web_search 和 x_search）
  },
}
```

## 相关内容

- [Web Search](/tools/web) -- 使用多个提供方搜索网页
- [Web Browser](/tools/browser) -- 面向重 JS 站点的完整浏览器自动化
- [Firecrawl](/tools/firecrawl) -- Firecrawl 搜索和抓取工具
