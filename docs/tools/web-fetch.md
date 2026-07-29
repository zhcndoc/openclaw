---
summary: "web_fetch 工具 -- 具有可读内容提取的 HTTP 获取"
read_when:
  - 你想获取一个 URL 并提取可读内容
  - 你需要配置 web_fetch 或其 Firecrawl 回退
  - 你想了解 web_fetch 的限制和缓存
title: "网页获取"
sidebarTitle: "网页获取"
---

`web_fetch` 会执行普通的 HTTP GET，并提取可读内容（将 HTML 转换为
markdown 或文本）。它**不会**执行 JavaScript。对于依赖 JS 的站点或
受登录保护的页面，请改用 [Web Browser](/tools/browser)。

## 快速开始

默认启用，无需配置：

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
将输出截断到这么多字符。会被限制为 `tools.web.fetch.maxCharsCap`。
</ParamField>

## 结果

`web_fetch` 返回一个封闭的结构化结果，包含以下字段：

- 请求元数据：`url`、`finalUrl`、`status`、`extractMode` 和 `extractor`
- 可选的响应元数据：`contentType`、`title` 和 `warning`（在不存在时省略）
- 包装内容元数据：`externalContent`、`truncated`、`length`、`rawLength`、
  `fetchedAt`、`tookMs` 和 `text`
- 命中缓存时可选的 `cached: true`
- 当截断内容被写入私有临时文件时，可选 `spill: { path, chars, truncated? }`；
  仅当该文件包含部分源内容时才会出现 `truncated`

`length` 是包装后的 `text` 长度。`rawLength` 是外部内容包装前提取的内容长度。

## 工作原理

<Steps>
  <Step title="获取">
    使用类似 Chrome 的 User-Agent 和 `Accept-Language`
    请求头发送 HTTP GET。会阻止私有/内部主机名，并重新检查重定向。
  </Step>
  <Step title="提取">
    在 HTML 响应上运行 Readability（主内容提取）。
  </Step>
  <Step title="备用方案（可选）">
    如果 Readability 失败且可用提取提供方，则通过该提供方重试
    （例如 Firecrawl 的反爬绕过模式）。
  </Step>
  <Step title="缓存">
    结果会缓存 15 分钟（可配置），以减少对同一 URL 的重复
    获取。
  </Step>
</Steps>

## 进度更新

`web_fetch` 仅在获取仍处于等待状态且已超过五秒时，才会发出一条公开进度行：

```text
正在获取页面内容...
```

快速缓存命中和快速网络响应会在计时器触发之前完成，因此它们永远不会显示进度行。取消调用会清除计时器。进度行仅为频道 UI 状态，且绝不包含已获取的页面内容。

## 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // 默认：true
        provider: "firecrawl", // 可选；自动检测时省略
        maxChars: 20000, // 默认输出字符数；受 maxCharsCap 限制
        maxCharsCap: 20000, // maxChars 参数的硬性上限
        maxResponseBytes: 750000, // 截断前的最大下载大小 (32000-10000000)
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
            // apiKey: "fc-...", // 可选；省略则使用无密钥入门访问
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000, // 缓存时长（2 天）
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` 是可选项，并支持 SecretRef 对象。
旧版 `tools.web.fetch.firecrawl.*` 配置会通过
`openclaw doctor --fix` 自动迁移到 `plugins.entries.firecrawl.config.webFetch`。

<Note>
  如果你配置了 Firecrawl API key 的 SecretRef，但它未解析且没有
  `FIRECRAWL_API_KEY` 环境变量回退，网关启动将快速失败。
</Note>

<Note>
  Firecrawl `baseUrl` 覆盖已被锁定：托管流量使用
  `https://api.firecrawl.dev`；自托管覆盖必须指向私有或
  内部端点，并且仅对这些私有目标接受 `http://`。
</Note>

当前运行时行为：

- `tools.web.fetch.provider` 会显式选择抓取回退提供方。
- 如果省略 `provider`，OpenClaw 会从已配置凭据中自动检测第一个可用的 web-fetch
  提供方。非沙盒的 `web_fetch` 可以使用已安装的插件，这些插件声明了 `contracts.webFetchProviders` 并在运行时注册匹配的提供方。
  目前官方 Firecrawl 插件提供了这一回退。
- 沙盒化的 `web_fetch` 调用允许使用内置提供方以及其官方 npm 或 ClawHub 来源已验证的已安装提供方。
  目前这允许使用官方 Firecrawl 插件；第三方外部抓取插件仍被排除在外。
- 如果 Readability 被禁用，`web_fetch` 会直接跳到所选的提供方回退。
  如果没有可用提供方，则会以关闭方式失败。

## 受信任的环境代理

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

- `maxChars` 被限制为 `tools.web.fetch.maxCharsCap`（默认 `20000`）
- 在解析之前，响应正文会被限制为 `maxResponseBytes`（默认 `750000`，限制在
  `32000-10000000` 之间）；超出大小的响应会被截断并给出警告
- 私有/内部主机名会被阻止
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是面向受信任的 fake-IP 代理栈的
  窄范围显式启用项；除非你的代理拥有这些合成地址段并执行自己的目标策略，否则请不要设置它们
- 重定向会通过 `maxRedirects`（默认 `3`）进行检查和限制
- `useTrustedEnvProxy` 是显式启用项，只应为由操作员控制、且在 DNS
  解析后仍会强制执行出站策略的代理启用
- `web_fetch` 采用尽力而为的方式——某些站点需要 [Web Browser](/tools/browser)

## 工具配置文件

如果您使用工具配置文件或允许列表，请添加 `web_fetch` 或 `group:web`：

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
