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
        headers: {
          // 可选；每个值都将被视为敏感信息
          "X-Routing-Target": "staging",
        },
        ssrfPolicy: {
          dangerouslyAllowPrivateNetwork: false, // 广泛允许私有网络访问；默认保持 false
          allowedHostnames: ["internal.example"], // 窄范围的精确主机例外
          allowRfc2544BenchmarkRange: true, // 为使用 198.18.0.0/15 的受信任伪 IP 代理选择性启用
          allowIpv6UniqueLocalRange: true, // 为使用 fc00::/7 的受信任伪 IP 代理选择性启用
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
  提供方。非沙盒的 `web_fetch` 可以使用已安装的插件，这些插件声明了
  `contracts.webFetchProviders` 并在运行时注册匹配的提供方。
  目前官方 Firecrawl 插件提供了这一回退。
- 沙盒化的 `web_fetch` 调用允许使用内置提供方以及其官方 npm 或 ClawHub 来源已验证的已安装提供方。
  目前这允许使用官方 Firecrawl 插件；第三方外部抓取插件仍被排除在外。
- 如果 Readability 被禁用，`web_fetch` 会直接跳到所选的提供方回退。
  如果没有可用提供方，则会以关闭方式失败。

## 自定义请求标头

当您的部署需要在出站获取请求中附加请求元数据时，设置 `tools.web.fetch.headers`，例如使用路由或服务注入标头，将流量引导至您控制的网关。

```json5
{
  tools: {
    web: {
      fetch: {
        headers: {
          "X-Routing-Target": "${WEB_FETCH_ROUTING_TARGET}",
        },
      },
    },
  },
}
```

<Warning>
  每个已配置的值都会被视为敏感信息，并从公开的配置和调试捕获内容中删去。标头仍会发送到
  `web_fetch` 请求的每个初始 URL，而该 URL 由模型选择。仅当这符合预期的信任边界时，
  才配置凭据标头。
</Warning>

需要了解的行为：

- 值为普通字符串，并支持像其他配置字符串一样使用 `${VAR}` 进行环境变量替换。不接受结构化的 SecretRef 值。
- 标头仅应用于直接的 `web_fetch` 请求。诸如 [Firecrawl](/tools/firecrawl) 之类的提供商回退方案会调用自己的 API，永远不会接收这些标头。
- 条目会在构建请求时进行验证，而不是在加载配置时验证，因此某个错误条目会被丢弃，其余条目仍会应用。配置加载会有意保持宽松：针对单个标头名称拼写错误而导致的故障关闭验证错误，会禁用整个功能面。每个被丢弃的条目都会按名称记录日志。
- 被丢弃的名称：
  - `Accept`、`Accept-Language` 和 `User-Agent` 属于获取和可读性协议。请使用 `tools.web.fetch.userAgent` 设置用户代理。
  - `Content-Length`、`Transfer-Encoding`、`Connection` 和 `Upgrade` 等成帧及逐跳名称，请求要么直接拒绝，要么忽略这些名称。
  - 不是有效 HTTP 令牌的名称，例如 `"X Routing Target"`。
- 被丢弃的值：请求无法承载的字节（CR、LF、NUL 或任何高于 `U+00FF` 的字符）。缺失的环境变量会由配置加载报告；当字面量 `${VAR}` 文本确实是预期内容时，全局的 `$${VAR}` 转义仍然可用。
- 名称仅大小写不同的两个条目会合并为后一个条目，因此请求永远不会携带接收网关无法解析的逗号连接值。被丢弃的名称会被记录日志，但不会记录任一值。如果后一个条目不可用，则不会发送任何一个值。
- 拒绝会发生在计算缓存键之前，因此缓存键始终与实际发送的字节相匹配：更改一个确实会发送的标头会对获取缓存进行分区，而添加一个会被丢弃的标头则不会。
- 当重定向跨越源时，会应用受保护获取的安全允许列表。该列表之外的路由标头会被丢弃；`Cache-Control`、`Content-Type` 和 `Range` 等标准安全标头会被保留。

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

- `maxChars` 会被限制在 `tools.web.fetch.maxCharsCap`（默认值为 `20000`）以内
- 解析前，响应正文会被限制为 `maxResponseBytes`（默认值为 `750000`，限制范围为
  32000-10000000）；超出大小的响应会被截断并发出警告
- 会阻止私有/内部主机名
- `tools.web.fetch.ssrfPolicy.allowedHostnames` 允许精确匹配的受信任主机，同时继续阻止其他私有/内部目标
- `tools.web.fetch.ssrfPolicy.dangerouslyAllowPrivateNetwork` 会广泛允许访问私有网络目标；仅当本部署中模型选择的 URL 可信时才启用
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和
  `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是针对受信任的虚假 IP 代理栈的有限选择加入项；除非您的代理拥有这些
  合成范围并执行自身的目标策略，否则请勿设置
- 重定向会经过检查，并受 `maxRedirects`（默认值为 `3`）限制
- `tools.web.fetch.headers` 的值会从公开的配置和调试捕获内容中脱敏；这些值会发送到最初获取的主机，并且仅当现有的受保护获取策略允许时才会在重定向过程中保留
- `useTrustedEnvProxy` 是一个显式选择加入项，仅应为由操作员控制、且在 DNS 解析后仍执行出站策略的代理启用
- `web_fetch` 尽力而为——某些网站需要[网页浏览器](/tools/browser)

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
