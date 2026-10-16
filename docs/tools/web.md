---
summary: "web_search、x_search 和 web_fetch —— 搜索网络、搜索 X 帖子，或获取页面内容"
title: "网页搜索"
sidebarTitle: "网页搜索"
read_when:
  - "你想启用或配置 web_search"
  - "你想启用或配置 x_search"
  - "你需要选择一个搜索提供商"
  - "你想了解自动检测和提供商选择"
---

`web_search` 使用您配置的提供商搜索网络并返回标准化结果，通过查询缓存 15 分钟（可配置）。 OpenClaw 还捆绑了用于 X（以前称为 Twitter）帖子的 `x_search` 和用于轻量级 URL 获取的 `web_fetch`。 `web_fetch`始终在本地运行；当 Grok 是提供者时，`web_search` 通过 xAI 响应进行路由，并且 `x_search` 始终使用 xAI 响应。

<Info>
  `web_search` 是一个轻量级的 HTTP 工具，而不是浏览器自动化。对于 JS-heavy 站点或登录，请使用 [Web Browser](/tools/browser)。要获取特定的 URL，请使用 [Web Fetch](/tools/web-fetch)。
</Info>

## <a id="quick-start"></a> 快速开始

<Steps>
  <Step id="choose-a-provider" title="选择提供商">
    选择一个提供商并完成任何所需的设置。有些提供商无需密钥，其他则需要 API 密钥。详情请参见下面的提供商页面。
  </Step>
  <Step id="configure" title="配置">
    打开 Control UI 中的 **Settings → Search** 以选择提供商、配置其凭据并测试搜索。或者使用 CLI：

    ```bash
    openclaw configure --section web
    ```
    这存储提供者和任何需要的凭证。对于 API- 支持的提供程序，您可以设置提供程序的环境变量（例如 `BRAVE_API_KEY`）并跳过此步骤。

    您还可以通过与 [OpenClaw](/cli/openclaw) 交谈来配置搜索：在 `openclaw setup` 或 Control UI 的 **设置中说 `configure web search` → 询问 OpenClaw** 聊天。托管流程拥有提供商选择和凭证输入 — API 密钥在浏览器中被屏蔽，终端聊天通过 `open search wizard` 交给屏蔽向导。

  </Step>
  <Step id="use-it" title="使用它">
    ```javascript
    await web_search({ query: "OpenClaw plugin SDK" });
    ```

    对于 X 帖子：

    ```javascript
    await x_search({ query: "dinner recipes" });
    ```

  </Step>
</Steps>

## <a id="search-settings"></a> 搜索设置

**Settings → Search** 将是否启用搜索与提供程序是否已配置和工作分开。选择代理和模型以查看有效的搜索路径：本机搜索、托管提供商、已禁用或不可用。对于外部harness，该页面会标识该harness并解释其搜索能力是在转弯开始时确定的。

- **Automatic** 使用受支持的本机搜索来进行模型连接，或使用凭证自动检测选择的托管提供程序。
- 选择托管提供程序后，该提供程序可通过 OpenClaw 的 `web_search` 进行使用，包括开放权重模型。提供者凭证和选项重用插件设置，包括兼容的自定义端点和 SearXNG 实例 URL。
- **Configured** 表示存在凭据或设置信息。它并不证明提供者接受该凭证或可以访问。
- **测试搜索** 通过指定的托管提供程序运行查询，并显示结果或带有延迟的错误。它使用提供商的正常帐户限制和计费。提供商测试检查该服务；它并不能证明外部harness使用了它。原生搜索在其模型或工具内部运行；聊天中的 **Test** 打开与显示的代理和所选模型的未发送聊天。要求它搜索以验证该路线。

提供商设置和搜索测试需要网关管理员访问权限。更改使用现有配置所有者；没有单独的搜索凭证存储。

当未配置托管提供程序时，OpenClaw 会从代理工具列表（包括工具搜索和代码模式目录）中省略 `web_search`。在没有本机搜索的回合中，代理会收到一个简短的设置提示。显式禁用或策略拒绝的搜索不会生成丢失配置提示。具有无效或不可用凭据的配置提供程序将保持其正常诊断；配置存在不是健康检查。本机搜索和明确选择的无密钥提供程序保持不变。新的工具上下文拾取已完成的设置；现有配置的工具在执行时继续读取当前凭据。

## <a id="choosing-a-provider"></a> 选择提供商

<CardGroup cols={2}>
  <Card title="Brave Search" icon="shield" href="/tools/brave-search">
    带有片段的结构化结果。支持`llm-context`模式、country/language滤波器。提供免费套餐。
  </Card>
  <Card title="Codex 托管搜索" icon="search" href="/plugins/codex-harness">
    AI- 通过您的 Codex 应用程序服务器帐户合成了可靠的答案。
  </Card>
  <Card title="DuckDuckGo" icon="bird" href="/tools/duckduckgo-search">
    无钥匙提供商。无需 API 密钥。基于非官方 HTML- 的集成。
  </Card>
  <Card title="Exa" icon="brain" href="/tools/exa-search">
    神经网络 + 关键词搜索，并提供内容提取（高亮、文本、摘要）。
  </Card>
  <Card title="Firecrawl" icon="flame" href="/tools/firecrawl">
    结构化结果。最适合与 `firecrawl_search` 和 `firecrawl_scrape` 搭配，用于深度提取。
  </Card>
  <Card title="Gemini" icon="sparkles" href="/tools/gemini-search">
    AI- 通过 Google 搜索接地综合了答案和引文。
  </Card>
  <Card title="Grok" icon="zap" href="/tools/grok-search">
    AI-通过xAI网络接地综合了答案和引文。
  </Card>
  <Card title="Kimi" icon="moon" href="/tools/kimi-search">
    通过 Moonshot 的搜索端点获得结构化结果，包含标题、URL 和片段。
  </Card>
  <Card title="MiniMax 搜索" icon="globe" href="/tools/minimax-search">
    通过 MiniMax Token Plan 搜索 API 提供结构化结果。
  </Card>
  <Card title="Ollama 网页搜索" icon="globe" href="/tools/ollama-search">
    通过已登录的本地 Ollama 主机或托管的 Ollama API 进行搜索。
  </Card>
  <Card title="平行线" icon="layer-group" href="/tools/parallel-search">
    付费的 Parallel Search API（`PARALLEL_API_KEY`）；更高的速率限制和目标调优。
  </Card>
  <Card title="Parallel Search（免费）" icon="layer-group" href="/tools/parallel-search">
    无钥匙选择加入。 Parallel 的免费搜索 MCP，带有 LLM- 优化的密集摘录，没有 API 密钥。
  </Card>
  <Card title="Perplexity" icon="search" href="/tools/perplexity-search">
    结构化结果，支持内容提取控制和域名过滤。
  </Card>
  <Card title="SearXNG" icon="server" href="/tools/searxng-search">
    自托管元搜索。不需要 API 密钥。聚合 Google、Bing、DuckDuckGo 等。
  </Card>
  <Card title="Tavily" icon="globe" href="/tools/tavily">
    通过搜索深度、主题过滤，以及用于 URL 提取的 `tavily_extract` 提供结构化结果。
  </Card>
</CardGroup>

### <a id="provider-comparison"></a> 提供商对比

| 提供者                                         | 结果样式                                       | 过滤器                                          | API 密钥                                                                                 |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [勇敢](/tools/brave-search)                     | 结构化摘要                                | 国家、语言、时间、`llm-context` 模式      | `BRAVE_API_KEY`                                                                         |
| [Codex 托管 Search](/plugins/codex-harness)    | AI-合成+源URL                       | 域、上下文大小、用户位置             | 没有任何；使用 Codex/OpenAI 登录                                                         |
| [DuckDuckGo](/tools/duckduckgo-search)           | 结构化摘要                                | --                                               | 无（无密钥）                                                                         |
| [Exa](/tools/exa-search)                         | 结构化+提取                             | Neural/keyword 模式、日期、内容提取    | `EXA_API_KEY`                                                                           |
| [Firecrawl](/tools/firecrawl)                    | 结构化摘要                                | 通过 `firecrawl_search` 工具                      | `FIRECRAWL_API_KEY`                                                                     |
| [双子座](/tools/gemini-search)                   | AI-综合+引用                         | --                                               | `GEMINI_API_KEY`                                                                        |
| [Grok](/tools/grok-search)                       | AI-综合+引用                         | --                                               | xAI OAuth, `XAI_API_KEY`, or `plugins.entries.xai.config.webSearch.apiKey`              |
| [Kimi](/tools/kimi-search)                       | 包含标题、URL 和摘要的结构化结果 | --                                               | `KIMI_API_KEY` / `MOONSHOT_API_KEY`                                                     |
| [MiniMax Search](/tools/minimax-search)          | 结构化摘要                                | 地区（`global` / `cn`）                         | `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN`              |
| [Ollama Web Search](/tools/ollama-search)        | 结构化摘要                                | --                                               | 对于已登录的本地主机，没有； `OLLAMA_API_KEY` 用于直接搜索 `https://ollama.com` |
| [并联](/tools/parallel-search)               | 按 LLM 上下文排序的密集摘录              | --                                               | `PARALLEL_API_KEY`（付费）                                                               |
| [并行搜索（免费）](/tools/parallel-search) | 按 LLM 上下文排序的密集摘录              | --                                               | 无（免费 Search MCP）                                                                  |
| [困惑](/tools/perplexity-search)           | 结构化摘要                                | 国家、语言、时间、域名、内容限制 | `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY`                                             |
| [SearXNG](/tools/searxng-search)                 | 结构化摘要                                | 类别、语言                             | 无（自托管）                                                                      |
| [泰维利](/tools/tavily)                          | 结构化摘要                                | 通过 `tavily_search` 工具                         | `TAVILY_API_KEY`                                                                        |

## <a id="result-shape"></a> 结果形状

`web_search` 在核心工具边界统一规范化每个内置和外部插件提供方。调用者会收到以下闭合形状之一：

```typescript
type WebSearchOutput =
  | {
      kind: "error";
      provider: string;
      error: "provider_error";
      message: string;
      docs?: string;
    }
  | {
      kind: "results";
      provider: string;
      query: string;
      count: number;
      tookMs?: number;
      results: Array<{
        title: string;
        url: string;
        snippet?: string;
        published?: string;
        siteName?: string;
      }>;
      externalContent: {
        untrusted: true;
        source: "web_search";
        wrapped: true;
        provider: string;
      };
      cached?: true;
    }
  | {
      kind: "answer";
      provider: string;
      query: string;
      tookMs?: number;
      content: string;
      citations?: Array<{ url: string; title?: string }>;
      externalContent: {
        untrusted: true;
        source: "web_search";
        wrapped: true;
        provider: string;
      };
      cached?: true;
    }
  | {
      kind: "raw";
      provider: string;
      data: unknown;
    };
```

结构化提供方使用 `kind: "results"`；合成提供方使用 `kind: "answer"`。负载既不匹配这两种形状的外部插件提供方会按原样通过，作为 `kind: "raw"` 以保证兼容性。诸如原始分数、摘录、相关搜索、行内引用偏移、模型 id 或会话元数据等提供方特定字段，不会在规范化分支中透传。若某个提供方的更丰富响应是你工作流的一部分，请使用该提供方专用的工具。

`externalContent.wrapped: true` 是边界本身实现的信任标记：提供者散文（`title`、`snippet`、`siteName`、`content`、引文标题、错误 `message`）被剥离任何预先存在的信封行并在核心边界处重新包装一次，因此不会提供者元数据可以欺骗标记。 `query` 始终是请求的查询，引用和结果 URL 必须解析为 http（s），`published` 必须为 ISO-date 形状，URL 在输出之前进行标准化，携带 `error` 密钥的有效负载始终报告为 `kind: "error"`，原始提供程序代码保留在包装消息内。原始直通有效负载保留提供者设置的任何标记。

Perplexity、Tavily 和 xAI HTTP 错误保留状态代码和有限诊断，并编辑反映的请求凭据。在分享之前查看诊断结果；密文并不会删除所有类型的敏感内容。

## <a id="auto-detection"></a> 自动检测

文档和设置流程中的提供方列表按字母顺序排列。自动检测使用一套单独的固定优先级顺序，并且只会在找到已配置的提供方时选择一个需要凭据（`requiresCredential !== false`）的提供方。如果未设置 `provider`，OpenClaw 会按以下顺序检查各提供方，并使用第一个已就绪的提供方：

首先是 API- 支持的提供商：

1. **Brave** -- `BRAVE_API_KEY` 或 `plugins.entries.brave.config.webSearch.apiKey`（顺序 10）
2. **MiniMax Search** -- `MINIMAX_CODE_PLAN_KEY` / `MINIMAX_CODING_API_KEY` / `MINIMAX_OAUTH_TOKEN` / `MINIMAX_API_KEY` 或 `plugins.entries.minimax.config.webSearch.apiKey`（顺序 15）
3. **Gemini** -- `plugins.entries.google.config.webSearch.apiKey`、`GEMINI_API_KEY` 或 `models.providers.google.apiKey`（顺序 20）
4. **Grok** -- xAI OAuth、`XAI_API_KEY` 或 `plugins.entries.xai.config.webSearch.apiKey`（顺序 30）
5. **Kimi** -- `KIMI_API_KEY` / `MOONSHOT_API_KEY` 或 `plugins.entries.moonshot.config.webSearch.apiKey`（顺序 40）
6. **Perplexity** -- `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` 或 `plugins.entries.perplexity.config.webSearch.apiKey`（顺序 50）
7. **Firecrawl** -- `FIRECRAWL_API_KEY` 或 `plugins.entries.firecrawl.config.webSearch.apiKey`（顺序 60）
8. **Exa** -- `EXA_API_KEY` 或 `plugins.entries.exa.config.webSearch.apiKey`；可选的 `plugins.entries.exa.config.webSearch.baseUrl` 会覆盖 Exa 端点（顺序 65）
9. **Tavily** -- `TAVILY_API_KEY` 或 `plugins.entries.tavily.config.webSearch.apiKey`（顺序 70）
10. **Parallel** -- 通过 `PARALLEL_API_KEY` 或 `plugins.entries.parallel.config.webSearch.apiKey` 使用付费的 Parallel Search API；可选的 `plugins.entries.parallel.config.webSearch.baseUrl` 会覆盖该端点（顺序 75）

随后是已配置端点的提供方：

11. **SearXNG** -- `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`（顺序 200）

如果自动检测到的提供程序失败，OpenClaw 将尝试下一个符合条件的提供程序。如果所有尝试都失败，它会报告第一个提供程序的错误，以帮助您诊断主要故障。明确选择的提供程序不使用自动回退。

无密钥提供程序，例如 **Parallel Search（免费）**、**DuckDuckGo**、**Ollama Web Search** 和**Codex 托管搜索** 永远不会赢得自动检测，即使它们具有内部订单值。仅当您使用 `tools.web.search.provider` 或通过 `openclaw configure --section web` 显式选择它们时，才会使用它们。 OpenClaw 不会仅仅因为未配置 API-backed 提供程序而将托管 `web_search` 查询发送到无密钥提供程序。

OpenAI Responses 模型是个例外：当 `tools.web.search.provider` 未设置时，它们会使用 OpenAI 原生的网页搜索，而不是上面列出的托管提供方（见下文）。将 `tools.web.search.provider` 设置为 `parallel-free`（或其他提供方）即可让它们改为通过托管路径路由。

<Note>
  所有提供程序关键字段都支持 SecretRef 对象。 `plugins.entries.<plugin>.config.webSearch.apiKey` 下的插件范围 SecretRefs 已解析为已安装的 API- 支持的 Web 搜索提供程序，包括 Brave、Exa、Firecrawl、Gemini、Grok、 Kimi、MiniMax、并行、Perplexity 和 Tavily，无论提供程序是通过 `tools.web.search.provider` 显式选择还是通过自动检测选择。在自动检测模式下，OpenClaw 仅解析选定的提供程序密钥 - 未选定的 SecretRefs 保持不活动状态，因此您可以保持配置多个提供程序，而无需为您不使用的提供程序支付解析成本。
</Note>

## <a id="native-openai-web-search"></a> 原生 OpenAI 网页搜索

直接 OpenAI 响应模型（`api: "openai-responses"`、提供商 `openai`、无基础 URL 或官方 OpenAI API 基础 URL）使用 OpenAI 的托管当启用 OpenClaw Web 搜索且未固定托管提供商时，`web_search` 工具会自动运行。这是捆绑的 OpenAI 插件中提供商拥有的行为，不适用于 OpenAI- 兼容的代理基本 URL 或 Azure 路由。将 `tools.web.search.provider` 设置为其他提供程序（例如 `brave`），以保留 OpenAI 模型的托管 `web_search` 工具，或设置 `tools.web.search.enabled: false` 以禁用托管搜索和本机 OpenAI 搜索。普通工具调用、工具搜索、代码模式的路由选择相同；托管搜索不会将第二个托管 `web_search` 可调用隐藏在目录中。如果插件策略禁用或排除 OpenAI 提供程序插件，则托管搜索路由保持可用。

托管提供商失败会返回所选提供商的身份和安全、可操作的诊断。身份验证失败会识别 HTTP 状态，并要求您检查凭据或选择其他提供商。上游响应主体不包含在面向模型的诊断中。提供者的 `TimeoutError` 被报告为搜索超时，包括作为数字元数据提供时的有效时间限制。呼叫者取消仍然是取消，而不是提供商故障。自动选择可能会尝试另一个配置的提供商；明确的提供商选择永远不会退缩。

## <a id="native-codex-web-search"></a> 原生 Codex 网页搜索

当启用网页搜索且未选择任何受管理提供商时，Codex 应用服务器运行时会自动使用 Codex 托管的 `web_search` 工具。原生托管搜索与 OpenClaw 的受管理 `web_search` 动态工具是互斥的，因此受管理搜索无法绕过原生域名限制。当托管搜索不可用、被显式禁用或被所选受管理提供商替换时，OpenClaw 会使用受管理工具。OpenClaw 会保持 Codex 独立的 `web.run` 扩展处于禁用状态（`features.standalone_web_search: false`），因为生产应用服务器流量会拒绝其用户定义的 `web` 命名空间。

- 在 `tools.web.search.openaiCodex` 下配置原生搜索
- 将 `tools.web.search.provider: "codex"` 设置为将 Codex 托管搜索作为任何父模型的受管理 `web_search` 提供商。每次调用都会运行一个有边界的、短暂的 Codex 应用服务器回合，并在 Codex 未输出托管的 `webSearch` 项时失败。
- `mode: "cached"` 是默认首选项，但 Codex 会将其解析为对无限制应用服务器回合的实时外部访问；如需明确请求实时访问，请设置为 `"live"`
- 将 `tools.web.search.provider` 设置为诸如 `brave` 之类的受管理提供商，以使用 OpenClaw 的受管理 `web_search`
- 设置`tools.web.search.openaiCodex.enabled: false`选择退出Codex-托管搜索；其他托管提供商仍然可用
- 限制 Codex 原生工具面也会保持受管理 `web_search` 可用
- 设置 `allowedDomains` 时，它会在本机托管搜索处于活动状态时限制托管 `web_search` 和托管 `web_fetch`。使用托管搜索提供商的轮次没有变化。如果托管搜索不可用，自动托管搜索后备也会被阻止。
- Tool-disabled LLM-only 运行禁用本机搜索和托管搜索
- `tools.web.search.enabled: false` 会同时禁用受管理和原生搜索

对 Codex 搜索策略的持久有效更改会启动一个新的绑定线程，因此已加载的应用服务器线程不能保留过期的托管搜索访问权限。每回合的临时限制使用临时受限线程，并保留现有绑定以便之后恢复。

直接 OpenAI ChatGPT 响应流量也可以使用 OpenAI 的托管 `web_search` 工具。该单独路径仍然通过 `tools.web.search.openaiCodex.enabled: true` 选择加入，并且仅适用于使用 `api: "openai-chatgpt-responses"` 的合格 `openai/*` 模型。明确选择的托管搜索提供程序也优先于此传输。

```json5
{
  tools: {
    web: {
      search: {
        enabled: true,
        // Optional: use Codex Hosted Search from non-Codex parent models too.
        provider: "codex",
        openaiCodex: {
          enabled: true,
          mode: "cached",
          allowedDomains: ["example.com"],
          contextSize: "high",
          userLocation: {
            country: "US",
            city: "New York",
            timezone: "America/New_York",
          },
        },
      },
    },
  },
}
```

对于不支持本机 Codex 搜索的运行时和提供程序，Codex 可以通过 OpenClaw 的动态工具命名空间使用托管 `web_search` 回退。当您需要 OpenClaw 提供商特定的网络控制而不是 Codex- 托管搜索时，请使用显式托管提供商。

选择 `provider: "codex"` 会启用捆绑的 `codex` 插件，并使用上面显示的相同 `tools.web.search.openaiCodex` 限制。请先使用 `openclaw models auth login --provider openai` 对 Codex 应用服务器进行身份验证。父代理可以使用任何模型或运行时；只有受边界限制的搜索工作进程通过 Codex 运行。

## <a id="cli-harness-search"></a> CLI harness搜索

当 `tools.web.search.provider` 选择托管提供程序时，OpenClaw 的 Claude Code、Codex CLI 和 Gemini CLI 适配器会禁用其本机搜索工具。根据正常工具策略，所选提供商仍然可以通过 OpenClaw 的 MCP 连接使用。如果该连接或提供程序不可用，适配器不会以静默方式恢复本机搜索。

省略 `tools.web.search.provider` 以使本机搜索可用。自动选择由省略的提供程序表示，而不是字符串 `"auto"` 或 `"openai"`；配置的提供者 ID 必须由搜索插件声明。即使会话具有过时的启用覆盖，`tools.web.search.enabled: false` 也会禁用搜索。更改本机搜索设置会更新 CLI 会话指纹，因此恢复的进程无法保留旧的搜索策略。关闭对会话的搜索还会将其从 OpenClaw 的 MCP 工具列表和调用授权中删除，同时保留不相关的工具可用。

其他外部harness拥有其本机工具行为；配置 OpenClaw 的托管提供程序并不表明第三方工具使用它。

## <a id="network-safety"></a> 网络安全

受管的 HTTP `web_search` 提供方调用使用 OpenClaw 的受保护抓取路径， 其作用域仅限于当前提供方自身的主机名。仅针对该主机名， OpenClaw 允许 Surge、Clash 和 sing-box 在 `198.18.0.0/15` 和 `fc00::/7` 中返回 fake-IP DNS 结果。其他私有、回环、链路本地以及元数据目标仍然会被阻止。Codex Hosted Search 是个例外： 其受限 worker 会将网络访问委托给 Codex app-server 托管的 `web_search` 工具。

此自动限额不适用于任意 `web_fetch` URL。对于 `web_fetch`，仅当您的可信代理拥有这些合成范围时，才显式启用 `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange` 和 `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`。

## <a id="config"></a> 配置

```json5
{
  tools: {
    web: {
      search: {
        enabled: true, // default: true
        provider: "brave", // or omit for auto-detection
        maxResults: 5,
        timeoutSeconds: 30,
        cacheTtlMinutes: 15,
      },
    },
  },
}
```

`tools.web.search.cacheTtlMinutes` 控制 OpenClaw 的本地搜索结果缓存。将其设置为 `0` 以绕过读取和写入，即使对于以前缓存的查询也是如此。较短的正 TTL 限制了进入年龄的重复使用；较长的 TTL 不会延长条目的原始有效期。提供者端缓存是独立的。

特定于提供商的配置（API 密钥、基本 URL、模式）位于 `plugins.entries.<plugin>.config.webSearch.*` 下。 Gemini 还可以在其专用网络搜索配置和 `GEMINI_API_KEY` 之后重用 `models.providers.google.apiKey` 和 `models.providers.google.baseUrl` 作为较低优先级的后备。有关示例，请参阅提供商页面。 Grok 还可以重复使用 `openclaw models auth login --provider xai --method oauth` 中的 xAI OAuth 身份验证配置文件； API-key 配置仍然是后备。

`tools.web.search.provider` 根据捆绑和安装的插件清单声明的网络搜索提供商 ID 进行验证。诸如 `"brvae"` 之类的拼写错误会导致配置验证失败，而不是默默地退回到自动检测。如果配置的提供程序仅具有过时的插件证据，例如卸载第三方插件后剩余的 `plugins.entries.<plugin>` 块，则 OpenClaw 会保持启动弹性并报告警告，以便您可以重新安装插件或运行 `openclaw doctor --fix` 来清理过时的配置。

`web_fetch` 备用提供商的选择是独立的：

- 使用 `tools.web.fetch.provider` 选择它
- 或省略该字段，让 OpenClaw 根据已配置凭据自动检测第一个可用的 web-fetch 提供商
- 非沙箱化的 `web_fetch` 可以使用声明了 `contracts.webFetchProviders` 的已安装插件提供商；沙箱化抓取允许内置提供商和已验证的官方插件安装，但不包括第三方外部插件
- 官方 Firecrawl 插件是目前唯一的内置 `webFetchProviders` 贡献者，配置位于 `plugins.entries.firecrawl.config.webFetch.*`

当您在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Kimi** 时，OpenClaw 还可以请求 Moonshot API 区域（`https://api.moonshot.ai/v1` 或`https://api.moonshot.cn/v1`）。 Kimi 搜索使用 `POST /tools/search`，而不是聊天模型。以前的 `plugins.entries.moonshot.config.webSearch.model` 设置已弃用并被忽略；现有配置仍然有效。参见[Kimi搜索](/tools/kimi-search)。

对于 `x_search`，请配置 `plugins.entries.xai.config.xSearch.*`。它使用与聊天相同的 xAI 认证配置文件，或者 Grok 网页搜索使用的 `XAI_API_KEY` / 插件网页搜索凭据。 旧版 `tools.web.x_search.*` 配置会由 `openclaw doctor --fix` 自动迁移。 当你在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 Grok 时， OpenClaw 还会在 Grok 设置完成后提供可选的 `x_search` 配置，且使用相同的凭据。 这是在 Grok 路径中的一个独立后续步骤，而不是另一个顶层网页搜索提供商选择。如果你选择其他提供商，OpenClaw 不会显示 `x_search` 提示。

### <a id="storing-api-keys"></a> 存储 API 密钥

<Tabs>
  <Tab id="config-file" title="配置文件">
    运行 `openclaw configure --section web` 或直接设置密钥：

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "YOUR_KEY", // pragma: allowlist secret
              },
            },
          },
        },
      },
    }
    ```

  </Tab>
  <Tab id="environment-variable" title="环境变量">
    在 Gateway 进程环境中设置提供商环境变量：

    ```bash
    export BRAVE_API_KEY="YOUR_KEY"
    ```

    对于网关安装，请将其放入 `~/.openclaw/.env`。 参见 [环境变量](/help/faq#env-vars-and-env-loading)。

  </Tab>
</Tabs>

## <a id="tool-parameters"></a> 工具参数

| 参数             | 描述                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `query`               | 搜索查询（必填）                                            |
| `count`               | 要返回的结果数（1-10，默认：5）                               |
| `country`             | 2 个字母 ISO 国家/地区代码（e.g.“US”、“DE”）                        |
| `language`            | ISO 639-1 语言代码（e.g.“en”、“de”）                          |
| `search_lang`         | 搜索语言代码（仅 Brave）                                  |
| `freshness`           | 时间筛选：`day`、`week`、`month` 或 `year`                     |
| `date_after`          | 此日期之后的结果（YYYY-MM-DD）                               |
| `date_before`         | 此日期之前的结果（YYYY-MM-DD）                              |
| `ui_lang`             | UI 语言代码（仅 Brave）                                      |
| `domain_filter`       | 域 allowlist/denylist 数组（仅限 Perplexity）                  |
| `max_tokens`          | 总内容 token 预算，仅原生 Perplexity Search API      |
| `max_tokens_per_page` | 每页提取 token 上限，仅原生 Perplexity Search API |

<Warning>
  并非所有参数都适用于所有提供者。 Brave `llm-context` 模式拒绝 `ui_lang`； `date_before` 还需要 `date_after`，因为 Brave 自定义新鲜度范围需要开始日期和结束日期。 Gemini 和 Grok 返回一个带有引文的综合答案。他们接受 `count` 来实现共享工具兼容性，但它不会改变接地答案的形状。 Gemini 将 `day` 新鲜度视为新近度提示；更广泛的新鲜度值和明确的日期设置 Google 搜索接地时间范围。当您使用 Sonar/OpenRouter 兼容性路径（`plugins.entries.perplexity.config.webSearch.baseUrl` / `model` 或 `OPENROUTER_API_KEY`）时，Perplexity 的行为方式相同；该路径还删除了 `max_tokens` 和 `max_tokens_per_page` 支持。 SearXNG 仅针对受信任的专用网络或环回主机接受 `http://`；公共 SearXNG 端点必须使用 `https://`。 Firecrawl 和 Tavily 仅支持 `query` 和 `count` 至 `web_search` - 使用其专用工具进行高级选项。
</Warning>

## x_search

`x_search` 使用 xAI 查询 X（以前称为 Twitter）帖子，并返回带有引用的 AI- 综合答案。它接受自然语言查询和可选的结构化过滤器。 OpenClaw 根据请求构造内置的 xAI `x_search` 工具，而不是永久注册它，因此它仅在实际调用它的回合中有效。

<Warning>
  `x_search` 在 xAI 的服务器上运行。 xAI 每 1,000 次工具调用收费 5 美元，加上模型的输入和输出令牌。
</Warning>

<Note>
  xAI 将 `x_search` 文档化为支持关键词搜索、语义搜索、用户搜索以及线程抓取。对于每个帖子的互动统计信息，例如转发、回复、 收藏或浏览，建议优先针对精确的帖子 URL 或状态 ID 进行定向查询。 广泛的关键词搜索可能会找到正确的帖子，但返回的单帖元数据可能不够完整。一个好的模式是：先定位帖子，然后再运行第二个聚焦于该精确帖子的 `x_search` 查询。
</Note>

### <a id="x_search-config"></a> x_search 配置

如果省略 `enabled`，则仅当活动模型的提供者是 `xai` 并且 xAI 凭据解析时，`x_search` 才会公开。对于具有已知非 xAI 提供商的活动模型，请将 `plugins.entries.xai.config.xSearch.enabled` 设置为 `true` 以选择跨提供商使用。如果活动模型提供程序丢失或未解析，该工具将保持隐藏状态。将 `enabled` 设置为 `false` 以对每个提供程序禁用它。始终需要 xAI 凭据。

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          xSearch: {
            enabled: true, // required for a known non-xAI model provider
            model: "grok-4.3",
            baseUrl: "https://api.x.ai/v1", // optional, overrides webSearch.baseUrl
            inlineCitations: false,
            maxTurns: 2,
            timeoutSeconds: 30,
            cacheTtlMinutes: 15,
          },
          webSearch: {
            apiKey: "xai-...", // optional if an xAI auth profile or XAI_API_KEY is set
            baseUrl: "https://api.x.ai/v1", // optional shared xAI Responses base URL
          },
        },
      },
    },
  },
}
```

当 `plugins.entries.xai.config.xSearch.baseUrl` 被设置时，`x_search` 发送到 `<baseUrl>/responses`。如果省略该字段，则它将回退到 `plugins.entries.xai.config.webSearch.baseUrl`，然后是公共 xAI 端点 （`https://api.x.ai/v1`）。

`plugins.entries.xai.config.xSearch.cacheTtlMinutes` 控制 OpenClaw 的本地 `x_search` 结果缓存。将其设置为 `0` 以绕过读取和写入。较短的 TTL 限制了现有条目的重用；较长的 TTL 不会延长其原始有效期。

### <a id="x_search-parameters"></a> x_search 参数

| 参数                    | 描述                                            |
| ---------------------------- | ------------------------------------------------------ |
| `query`                      | 搜索查询（必填）                                |
| `allowed_x_handles`          | 将结果限制为最多 20 个 X 账号               |
| `excluded_x_handles`         | 排除最多 20 个 X 账号                           |
| `from_date`                  | 仅包含此日期当天及之后的帖子（YYYY-MM-DD）  |
| `to_date`                    | 仅包含此日期当天及之前的帖子（YYYY-MM-DD） |
| `enable_image_understanding` | 允许 xAI 检查匹配帖子所附图片      |
| `enable_video_understanding` | 允许 xAI 检查匹配帖子所附视频      |

`allowed_x_handles` 和 `excluded_x_handles` 互斥。

### <a id="x_search-example"></a> x_search 示例

```javascript
await x_search({
  query: "dinner recipes",
  allowed_x_handles: ["nytfood"],
  from_date: "2026-03-01",
});
```

```javascript
// Per-post stats: use the exact status URL or status ID when possible
await x_search({
  query: "https://x.com/huntharo/status/1905678901234567890",
});
```

## <a id="examples"></a> 示例

```javascript
// Basic search
await web_search({ query: "OpenClaw plugin SDK" });

// German-specific search
await web_search({ query: "TV online schauen", country: "DE", language: "de" });

// Recent results (past week)
await web_search({ query: "AI developments", freshness: "week" });

// Date range
await web_search({
  query: "climate research",
  date_after: "2024-01-01",
  date_before: "2024-06-30",
});

// Domain filtering (Perplexity only)
await web_search({
  query: "product reviews",
  domain_filter: ["-reddit.com", "-pinterest.com"],
});
```

## <a id="tool-profiles"></a> 工具配置文件

如果您使用工具配置文件或允许列表，请添加 `web_search`、`x_search` 或 `group:web`：

```json5
{
  tools: {
    allow: ["web_search", "x_search"],
    // or: allow: ["group:web"]  (includes web_search, x_search, and web_fetch)
  },
}
```

## <a id="related"></a> 相关内容

- [Web Fetch](/tools/web-fetch) -- 获取 URL 并提取可读内容
- [Web Browser](/tools/browser) -- JS-heavy 站点的完全浏览器自动化
- [Grok Search](/tools/grok-search) -- 将 Grok 作为 `web_search` 提供商
- [Ollama Web Search](/tools/ollama-search) -- 通过你的 Ollama 主机进行免密钥网页搜索
- [Moonshot AI](/providers/moonshot) -- Kimi 作为 `web_search` 提供商
