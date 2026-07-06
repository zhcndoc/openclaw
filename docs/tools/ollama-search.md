---
summary: "通过本地 Ollama 主机或托管的 Ollama API 进行 Ollama Web Search"
read_when:
  - 你想将 Ollama 用于 web_search
  - 你想使用无需密钥的 web_search 提供商
  - 你想使用带有 OLLAMA_API_KEY 的托管 Ollama Web Search
  - 你需要 Ollama Web Search 的设置指导
title: "Ollama web search"
---

OpenClaw 支持 **Ollama Web Search** 作为内置的 `web_search` 提供商，
可返回来自 Ollama web-search API 的标题、URL 和摘要。

本地/自托管的 Ollama 默认不需要 API 密钥；它只需要一个可访问的
Ollama 主机以及 `ollama signin`。直接使用托管搜索（无需本地 Ollama）则需要
`baseUrl: "https://ollama.com"` 和一个真实的 `OLLAMA_API_KEY`。

## 设置

<Steps>
  <Step title="启动 Ollama">
    确保 Ollama 已安装并正在运行。
  </Step>
  <Step title="登录">
    ```bash
    ollama signin
    ```
  </Step>
  <Step title="选择 Ollama Web Search">
    ```bash
    openclaw configure --section web
    ```

    选择 **Ollama Web Search** 作为提供程序。

  </Step>
</Steps>

如果你已经将 Ollama 用于模型，Ollama Web Search 会复用同一个
已配置的主机。

<Note>
  OpenClaw 从不会自动优先选择 Ollama Web Search 而覆盖更高优先级的
  带凭据提供程序；你必须使用
  `tools.web.search.provider: "ollama"` 显式选择它。
</Note>

## 配置

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

`models.providers.ollama.baseUrl` 是规范键；为了与 OpenAI SDK 风格的配置示例兼容，web-search 提供程序也接受这里的 `baseURL`。如果未设置任何内容，OpenClaw 默认使用
`http://127.0.0.1:11434`。

直接使用托管的 Ollama Web Search（不使用本地 Ollama）：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
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

## 认证与请求路由

- 不存在专门用于 Web 搜索的 API 密钥字段；当配置的主机受身份验证保护时，提供方会复用
  `models.providers.ollama.apiKey`（或对应的环境变量注入提供方认证）。
- 主机解析顺序：`plugins.entries.ollama.config.webSearch.baseUrl` →
  `models.providers.ollama.baseUrl`（或 `baseURL`）→ `http://127.0.0.1:11434`。
- 如果解析后的主机是 `https://ollama.com`，OpenClaw 会直接调用
  `https://ollama.com/api/web_search`，并将 API 密钥作为 bearer
  认证。
- 否则 OpenClaw 会先调用本地代理端点
  `/api/experimental/web_search`（该端点会签名并转发到 Ollama
  Cloud），然后回退到同一主机上的 `/api/web_search`。如果两者都失败
  且已设置 `OLLAMA_API_KEY`，它会使用该密钥重试一次
  `https://ollama.com/api/web_search`——不会将其发送到本地主机。
- 如果 Ollama 无法访问或未登录，OpenClaw 会在设置过程中发出警告，但
  不会阻止选择该提供方。

## 相关

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [Ollama](/providers/ollama) -- Ollama 模型设置以及云/本地模式
