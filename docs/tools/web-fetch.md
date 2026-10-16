---
summary: "web_fetch 工具 -- 具有可读内容提取的 HTTP 获取"
read_when:
  - "你想获取一个 URL 并提取可读内容"
  - "你需要配置 web_fetch 或其 Firecrawl 回退"
  - "你想了解 web_fetch 的限制和缓存"
title: "网页抓取"
sidebarTitle: "网页获取"
---

`web_fetch` 执行普通的 HTTP GET 并提取可读内容（HTML 到 markdown 或文本）。它执行 **not** 执行 JavaScript。对于 JS-heavy 站点或受登录保护的页面，请改用 [Web Browser](/tools/browser)。

## <a id="quick-start"></a> 快速开始

默认启用，无需配置：

```javascript
await web_fetch({ url: "https://example.com/article" });
```

## <a id="tool-parameters"></a> 工具参数

<ParamField path="url" type="string" required>
要获取的 URL。仅支持 `http(s)`。
</ParamField>

<ParamField path="extractMode" type="'markdown' | 'text'" default="markdown">
主要内容提取后的输出格式。对于 Markdown 响应，文本模式标准化散文空白，但保留受围栏代码块内的缩进、重复空格、制表符和空行。
</ParamField>

<ParamField path="maxChars" type="number">
将输出截断到这么多字符。会被限制为 `tools.web.fetch.maxCharsCap`。
</ParamField>

## <a id="result"></a> 结果

`web_fetch` 返回一个封闭的结构化结果，包含以下字段：

- 请求元数据：`url`、`finalUrl`、`status`、`extractMode` 和 `extractor`
- 可选的响应元数据：`contentType`、`title` 和 `warning`（在不存在时省略）
- 包装内容元数据：`externalContent`、`truncated`、`length`、`rawLength`、 `fetchedAt`、`tookMs` 和 `text`
- 命中缓存时可选的 `cached: true`
- 当截断内容被写入私有临时文件时，可选 `spill: { path, chars, truncated? }`； 仅当该文件包含部分源内容时才会出现 `truncated`

`length` 是包装后的 `text` 长度。`rawLength` 是外部内容包装前提取的内容长度。

`text`、`title` 和 `warning` 共享 `maxChars`，包括其内容包装器。标题和警告各自最多保留 256 个字符，合并后的字符数最多为 512 个字符，是 `maxChars` 的一半。警告优先于标题；未使用的元数据空间仍然可供正文使用。当元数据被缩短或省略时，`truncated` 也成立；仅元数据截断不会创建正文溢出文件。

JSON 成帧和协议元数据是额外的开销。 `contentType`、`extractor` 和 `fetchedAt` 的上限分别为 256、128 和 64 个字符。对于后续请求，URL 保持完整：返回的 redirect/provider URL 长度超过 2,048 个字符，则回退到请求的 `url` 并将结果标记为已截断。调用者请求的 URL 被保留。

## <a id="how-it-works"></a> 工作原理

<Steps>
  <Step id="fetch" title="拿来">
    发送带有类似 Chrome- 的用户代理和 `Accept-Language` 标头的 HTTP GET。阻止 private/internal 主机名并重新检查重定向。
  </Step>
  <Step id="extract" title="提炼">
    在 HTML 响应上运行 Readability（主内容提取）。
  </Step>
  <Step id="fallback-optional" title="后备（可选）">
    如果 Readability 失败且可用提取提供方，则通过该提供方重试 （例如 Firecrawl 的反爬绕过模式）。
  </Step>
  <Step id="cache" title="缓存">
    结果会缓存 15 分钟（可配置），以减少对同一 URL 的重复获取。
  </Step>
</Steps>

设置 `tools.web.fetch.cacheTtlMinutes: 0` 以绕过 OpenClaw 的读取和写入读取缓存。正值限制当前请求的 TTL 的重用；缓存的条目仍会在其原始截止日期到期。 Provider端缓存，例如Firecrawl的`maxAgeMs`，是单独配置的。

响应解码首先遵循字节顺序标记，然后是 HTTP `Content-Type` 字符集，然后是 XML 声明或 HTML 字符集元数据。如果没有受支持的字符集，它会回退到 UTF-8。在 XML 或 HTML 元数据中声明 UTF-16 的 ASCII- 兼容文档将被解码为 UTF-8；仍然支持正确声明的旧编码，例如 Windows-1252。

## <a id="progress-updates"></a> 进度更新

`web_fetch` 仅在获取仍处于等待状态且已超过五秒时，才会发出一条公开进度行：

```text
Fetching page content...
```

快速缓存命中和快速网络响应会在计时器触发之前完成，因此它们永远不会显示进度行。取消调用会清除计时器。进度行仅为频道 UI 状态，且绝不包含已获取的页面内容。

OpenClaw 将取消传递给后备提供商。遵守该信号的提供商可以停止他们的请求；即使提供者忽略取消，核心也会拒绝迟到的结果。即使存在缓存结果，已取消的调用也会被拒绝。如果在获取、回退处理或连接清理期间发生取消，OpenClaw 会拒绝调用，而不是返回成功或将结果添加到获取缓存。

## <a id="config"></a> 配置

```json5
{
  tools: {
    web: {
      fetch: {
        enabled: true, // default: true
        provider: "firecrawl", // optional; omit for auto-detect
        maxChars: 20000, // default output chars; capped by maxCharsCap
        maxCharsCap: 20000, // hard cap for maxChars param
        maxResponseBytes: 750000, // max download size before truncation (32000-10000000)
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
        maxRedirects: 3,
        useTrustedEnvProxy: false, // let a trusted HTTP(S) env proxy resolve DNS
        readability: true, // use Readability extraction
        userAgent: "Mozilla/5.0 ...", // override User-Agent
        headers: {
          // optional; every value is treated as sensitive
          "X-Routing-Target": "staging",
        },
        ssrfPolicy: {
          dangerouslyAllowPrivateNetwork: false, // broad private-network opt-in; keep false by default
          allowedHostnames: ["internal.example"], // narrow exact host exception
          allowRfc2544BenchmarkRange: true, // opt-in for trusted fake-IP proxies using 198.18.0.0/15
          allowIpv6UniqueLocalRange: true, // opt-in for trusted fake-IP proxies using fc00::/7
        },
      },
    },
  },
}
```

## <a id="firecrawl-fallback"></a> Firecrawl 回退

如果 Readability 提取失败，`web_fetch` 可以回退到 [Firecrawl](/tools/firecrawl)，以实现反机器人绕过和更好的提取：

```json5
{
  tools: {
    web: {
      fetch: {
        provider: "firecrawl", // optional; omit for auto-detect from available credentials
      },
    },
  },
  plugins: {
    entries: {
      firecrawl: {
        enabled: true,
        config: {
          webFetch: {
            // apiKey: "fc-...", // optional; omit for keyless starter access
            baseUrl: "https://api.firecrawl.dev",
            onlyMainContent: true,
            maxAgeMs: 172800000, // cache duration (2 days)
            timeoutSeconds: 60,
          },
        },
      },
    },
  },
}
```

`plugins.entries.firecrawl.config.webFetch.apiKey` 是可选的，支持 SecretRef 对象。旧版 `tools.web.fetch.firecrawl.*` 配置通过 `openclaw doctor --fix` 自动迁移到 `plugins.entries.firecrawl.config.webFetch`。

<Note>
  如果您配置 Firecrawl API-key SecretRef 并且未解析且没有 `FIRECRAWL_API_KEY` env 回退，则网关启动会快速失败。
</Note>

<Note>
  Firecrawl `baseUrl` 覆盖已被锁定：托管流量使用 `https://api.firecrawl.dev`；自托管覆盖必须指向私有或内部端点，并且仅对这些私有目标接受 `http://`。
</Note>

当前运行时行为：

- `tools.web.fetch.provider` 会显式选择抓取回退提供方。
- 如果省略 `provider`，OpenClaw 会从已配置凭据中自动检测第一个可用的 web-fetch 提供方。非沙盒的 `web_fetch` 可以使用已安装的插件，这些插件声明了 `contracts.webFetchProviders` 并在运行时注册匹配的提供方。 目前官方 Firecrawl 插件提供了这一回退。
- 沙盒化的 `web_fetch` 调用允许使用内置提供方以及其官方 npm 或 ClawHub 来源已验证的已安装提供方。 目前这允许使用官方 Firecrawl 插件；第三方外部抓取插件仍被排除在外。
- 如果禁用可读性，`web_fetch` 会直接跳至选定的提供程序回退。如果没有可用的提供者，则请求失败。

## <a id="custom-request-headers"></a> 自定义请求标头

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
  每个已配置的值都会被视为敏感信息，并从公开的配置和调试捕获内容中删去。标头仍会发送到 `web_fetch` 请求的每个初始 URL，而该 URL 由模型选择。仅当这符合预期的信任边界时， 才配置凭据标头。
</Warning>

需要了解的行为：

- 值为普通字符串，并支持像其他配置字符串一样使用 `${VAR}` 进行环境变量替换。不接受结构化的 SecretRef 值。
- 标头仅应用于直接的 `web_fetch` 请求。诸如 [Firecrawl](/tools/firecrawl) 之类的提供商回退方案会调用自己的 API，永远不会接收这些标头。
- E 条目在构建请求时进行验证，而不是在配置加载时验证，因此一个错误条目将被删除，而其余条目仍然适用。配置加载故意保持宽松：拒绝单个标头名称拼写错误的配置将禁用整个表面。每个删除的条目均按名称记录。
- 被丢弃的名称：
  - `Accept`、`Accept-Language` 和 `User-Agent` 属于获取和可读性协议。请使用 `tools.web.fetch.userAgent` 设置用户代理。
  - `Content-Length`、`Transfer-Encoding`、`Connection` 和 `Upgrade` 等成帧及逐跳名称，请求要么直接拒绝，要么忽略这些名称。
  - 不是有效 HTTP 令牌的名称，例如 `"X Routing Target"`。
- 删除的值：请求不能携带的字节（CR、LF、NUL或`U+00FF`以上的任何字符）。配置加载报告缺少环境变量；当文字 `${VAR}` 文本是故意的时，全局 `$${VAR}` 转义仍然可用。
- 名称仅大小写不同的两个条目会合并为后一个条目，因此请求永远不会携带接收网关无法解析的逗号连接值。被丢弃的名称会被记录日志，但不会记录任一值。如果后一个条目不可用，则不会发送任何一个值。
- 拒绝会发生在计算缓存键之前，因此缓存键始终与实际发送的字节相匹配：更改一个确实会发送的标头会对获取缓存进行分区，而添加一个会被丢弃的标头则不会。
- 当重定向跨越源时，会应用受保护获取的安全允许列表。该列表之外的路由标头会被丢弃；`Cache-Control`、`Content-Type` 和 `Range` 等标准安全标头会被保留。

## <a id="trusted-env-proxy"></a> 受信任的环境代理

如果你的部署要求 `web_fetch` 通过受信任的外部 HTTP(S) 代理，请设置 `tools.web.fetch.useTrustedEnvProxy: true`。

在此模式下，OpenClaw 在发送请求前仍会应用基于主机名的 SSRF 检查， 但它会让代理解析 DNS，而不是在本地进行 DNS 固定。仅当代理由操作员控制， 并且在 DNS 解析后强制执行外发策略时才启用此功能。

<Note>
  如果未配置 HTTP（S） 代理环境变量，或者目标主机被 `NO_PROXY` 排除，则 `web_fetch` 将回退到本地 DNS 固定的正常严格路径。主机名匹配忽略大小写以及 URL 或 `NO_PROXY` 条目中的单个尾随 DNS 点。
</Note>

## <a id="saved-output"></a> 保存的输出

当获取的内容超出内联限制时，`web_fetch` 包括 `spill.path` 和 **完整输出** 位置。使用 `read` 与该路径和有界 `offset`/`limit` 参数来检索省略的内容。保存的输出保留不受信任的内容警告，并且上限为 2,000,000 个字符； `spill.truncated` 表示保存的响应不完整。

本地 Docker 和 Podman 沙箱将此输出保存在其现有的专用输入暂存区域中，可通过沙箱读取器访问。缓存的已保存路径的范围仍然是请求会话和沙箱工作区。当来宾工作区访问权限为只读时，恢复也有效：受信任的输入暂存所有者在不授予来宾写入访问权限的情况下准备文件。

其他后端（包括远程 shell 沙箱）在保存的输出可用之前需要准备好输入暂存功能。如果没有它，内联结果会报告完整输出不可用，不会进行分段写入，并且不会通告仅主机路径。不成功的保存不会被缓存。

## <a id="limits-and-safety"></a> 限制与安全

- `maxChars` 会被限制在 `tools.web.fetch.maxCharsCap`（默认值为 `20000`）以内
- 解析前，响应正文会被限制为 `maxResponseBytes`（默认值为 `750000`，限制范围为 32000-10000000）；超出大小的响应会被截断并发出警告
- Private/internal 主机名被阻止
- `tools.web.fetch.ssrfPolicy.allowedHostnames` 允许精确信任的主机，同时阻止其他 private/internal 目标
- `tools.web.fetch.ssrfPolicy.blockedHostnames` 拒绝 DNS 之前的确切主机和通配符子域并允许规则，包括重定向和启用专用网络访问的规则。例如，`["tracker.example.com", "*.ads.example.com"]` 会阻止这些主机，而无需完整的白名单。通配符与顶点不匹配；单独添加`ads.example.com`来阻止它。匹配忽略大小写和尾随点；对于国际化域名使用 ASCII/Punycode。为空或未设置不会增加任何拒绝
- `tools.web.fetch.ssrfPolicy.dangerouslyAllowPrivateNetwork` 广泛允许私有网络目标；仅当模型选择的 URL 在此部署中受信任时才启用它
- `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange` 是针对受信任的虚假 IP 代理栈的有限选择加入项；除非您的代理拥有这些合成范围并执行自身的目标策略，否则请勿设置
- 重定向会经过检查，并受 `maxRedirects`（默认值为 `3`）限制
- `tools.web.fetch.headers` 的值会从公开的配置和调试捕获内容中脱敏；这些值会发送到最初获取的主机，并且仅当现有的受保护获取策略允许时才会在重定向过程中保留
- `useTrustedEnvProxy` 是一个显式选择加入项，仅应为由操作员控制、且在 DNS 解析后仍执行出站策略的代理启用
- `web_fetch` 是尽力而为 - 有些网站需要 [Web Browser](/tools/browser)

## <a id="tool-profiles"></a> 工具配置文件

如果您使用工具配置文件或允许列表，请添加 `web_fetch` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_fetch"],
    // or: allow: ["group:web"]  (includes web_fetch, web_search, and x_search)
  },
}
```

## <a id="related"></a> 相关内容

- [Web Search](/tools/web) -- 使用多个提供方搜索网页
- [Web Browser](/tools/browser) -- JS-heavy 站点的完全浏览器自动化
- [Firecrawl](/tools/firecrawl) -- Firecrawl 搜索和抓取工具
