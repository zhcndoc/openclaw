---
summary: "通过本地 Ollama 主机或托管 Ollama API 进行 Ollama Web 搜索"
read_when:
  - "你想将 Ollama 用于 web_search"
  - "你想使用无需密钥的 web_search 提供商"
  - "你想使用带有 OLLAMA_API_KEY 的托管 Ollama Web Search"
  - "你需要 Ollama Web Search 的设置指导"
title: "Ollama 网页搜索"
---

OpenClaw 支持 **Ollama Web Search** 作为捆绑的 `web_search` 提供程序，返回来自 Ollama 的网络搜索 API 的标题、URL 和片段。

Local/self-hosted Ollama 默认不需要 API 密钥；它需要可访问的 Ollama 主机加上 `ollama signin`。直接托管搜索（无本地 Ollama）需要 `baseUrl: "https://ollama.com"` 和真实的 `OLLAMA_API_KEY`。

## <a id="setup"></a> 设置

如果你已经将 Ollama 用于模型，Ollama Web Search 会复用同一个已配置的主机。

### <a id="local-ollama"></a> 本地 Ollama

<Steps>
  <Step id="start-ollama" title="开始 Ollama">
    确保 Ollama 已安装并正在运行。
  </Step>
  <Step id="sign-in" title="登入">
    ```bash
    ollama signin
    ```
  </Step>
  <Step id="choose-ollama-web-search" title="选择 Ollama 网页搜索">
    ```bash
    openclaw configure --section web
    ```

    选择 **Ollama Web Search** 作为提供程序。

  </Step>
</Steps>

### <a id="hosted-ollama"></a> 托管 Ollama

1. 创建[Ollama API密钥](https://docs.ollama.com/api/authentication#api-keys)并在网关环境中设置`OLLAMA_API_KEY`。
2. 设置`models.providers.ollama.baseUrl`为`https://ollama.com`；请参见 [Config](#config)。这是共享的 Ollama 模型提供者主机，因此它还会将您的 Ollama **model** 流量发送到 `https://ollama.com` 而不是本地守护程序。要单独移动网络搜索，请将 `plugins.entries.ollama.config.webSearch.baseUrl` 设置为 `https://ollama.com` 并让 `models.providers.ollama.baseUrl` 指向您的本地主机。
3. 运行`openclaw configure --section web`并选择**Ollama网页搜索**。

托管搜索不需要本地 Ollama 守护程序或 `ollama signin`。

<Note>
  OpenClaw 从不会自动优先选择 Ollama Web Search 而覆盖更高优先级的带凭据提供程序；你必须使用 `tools.web.search.provider: "ollama"` 显式选择它。
</Note>

## <a id="config"></a> 配置

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

仅针对 Web 搜索的可选主机覆盖：

```json5
{
  plugins: {
    entries: {
      ollama: {
        config: {
          webSearch: {
            baseUrl: "http://ollama-host:11434",
          },
        },
      },
    },
  },
}
```

或者复用已为 Ollama 模型提供程序配置的主机：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

`models.providers.ollama.baseUrl` 是当前密钥；网络搜索提供商还接受 `baseURL` ，以便与 OpenAI SDK-style 配置示例兼容。如果未设置任何内容，则 OpenClaw 默认为 `http://127.0.0.1:11434`。

直接使用托管的 Ollama Web Search（不使用本地 Ollama）：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: { source: "env", provider: "default", id: "OLLAMA_API_KEY" },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

`models.providers.ollama.apiKey` 采用文字键字符串或 SecretRef 对象。裸露的 `"OLLAMA_API_KEY"` 字符串将作为密钥本身发送，而不是从环境中读取。

## <a id="auth-and-request-routing"></a> 认证与请求路由

- 不存在专门用于 Web 搜索的 API 密钥字段；当配置的主机受身份验证保护时，提供方会复用 `models.providers.ollama.apiKey`（或对应的环境变量注入提供方认证）。
- 主机解析顺序：`plugins.entries.ollama.config.webSearch.baseUrl` → `models.providers.ollama.baseUrl`（或 `baseURL`）→ `http://127.0.0.1:11434`。
- 如果解析后的主机是 `https://ollama.com`，OpenClaw 会直接调用 `https://ollama.com/api/web_search`，并将 API 密钥作为 bearer 认证。
- 否则 OpenClaw 会先调用本地代理端点 `/api/experimental/web_search`（该端点会签名并转发到 Ollama Cloud），然后回退到同一主机上的 `/api/web_search`。如果两者都失败且已设置 `OLLAMA_API_KEY`，它会使用该密钥重试一次 `https://ollama.com/api/web_search`——不会将其发送到本地主机。
- 如果本地 Ollama 主机无法访问或未登录，或者托管搜索没有 API 密钥，OpenClaw 在设置过程中会发出警告。这些警告不会阻止选择提供商。

## <a id="related"></a> 相关内容

- [网页搜索概述](/tools/web) -- 所有提供商和自动检测
- [Ollama](/providers/ollama) -- Ollama 模型设置和 cloud/local 模式
