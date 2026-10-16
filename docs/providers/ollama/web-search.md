---
summary: "使用 Ollama 作为 OpenClaw web_search 提供程序"
read_when:
  - "您希望 Ollama 为 web_search 工具提供服务"
  - "您需要 Ollama 搜索的主机、身份验证和要求规则"
title: "Ollama 网页搜索"
sidebarTitle: "网页搜索"
---

## <a id="ollama-web-search"></a> Ollama 网页搜索

OpenClaw 将 **Ollama 网页搜索** 作为 `web_search` 提供程序捆绑提供。

| 属性    | 详情                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主持人        | `models.providers.ollama.baseUrl`（如果已设置），否则为 `http://127.0.0.1:11434`；`https://ollama.com` 直接使用托管 API                          |
| 认证        | 登录本地主机无需密钥； `OLLAMA_API_KEY` 或为直接 `https://ollama.com` 搜索或受身份验证保护的主机配置的提供商身份验证           |
| 要求 | Local/self-hosted 主机必须正在运行并使用 `ollama signin` 登录；直接托管搜索需要 `baseUrl: "https://ollama.com"` 加上真正的 API 密钥 |

可在 `openclaw onboard` 或 `openclaw configure --section web` 时选择它，或设置：

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

若要通过 Ollama Cloud 直接使用托管搜索：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.6:cloud", name: "kimi-k2.6:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

对于自托管主机，OpenClaw 会先尝试本地的 `/api/experimental/web_search` 代理，然后回退到同一主机上的托管 `/api/web_search` 路径；已登录的本地守护进程通常会通过本地代理响应。直接的 `https://ollama.com` 调用始终使用托管的 `/api/web_search` 端点。

<Note>
有关完整设置和行为，请参见 [Ollama Web Search](/tools/ollama-search)。
</Note>
