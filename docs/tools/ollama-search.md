---
summary: "通过本地 Ollama 主机或托管的 Ollama API 进行 Ollama Web Search"
read_when:
  - 你想将 Ollama 用于 web_search
  - 你想使用无需密钥的 web_search 提供商
  - 你想使用带有 OLLAMA_API_KEY 的托管 Ollama Web Search
  - 你需要 Ollama Web Search 的设置指导
title: "Ollama web search"
---

OpenClaw 支持 **Ollama Web Search** 作为内置的 `web_search` 提供商。它
使用 Ollama 的 web-search API，并返回包含标题、URL 和摘要的结构化结果。

对于本地或自托管的 Ollama，默认情况下此设置不需要 API 密钥。它确实需要：

- 一个 OpenClaw 可访问的 Ollama 主机
- `ollama signin`

对于直接使用托管搜索，请将 Ollama 提供商的基础 URL 设置为 `https://ollama.com`
并提供真实的 `OLLAMA_API_KEY`。

## 设置

<Steps>
  <Step title="启动 Ollama">
    确保 Ollama 已安装并正在运行。
  </Step>
  <Step title="登录">
    运行：

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="选择 Ollama Web Search">
    运行：

    ```bash
    openclaw configure --section web
    ```

    然后选择 **Ollama Web Search** 作为提供商。

  </Step>
</Steps>

如果你已经将 Ollama 用于模型，Ollama Web Search 会复用同一个
已配置的主机。

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

可选的 Ollama 主机覆盖：

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

如果你已经将 Ollama 配置为模型提供商，web-search 提供商也可以改为
复用该主机：

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

Ollama 模型提供商将 `baseUrl` 作为规范键。web-search 提供商也会兼容地识别
`models.providers.ollama` 上的 `baseURL`，以兼容 OpenAI SDK 风格的配置示例。

如果未显式设置 Ollama 的基础 URL，OpenClaw 将使用 `http://127.0.0.1:11434`。

如果你的 Ollama 主机需要 bearer 认证，OpenClaw 会复用
`models.providers.ollama.apiKey`（或对应的环境变量提供商认证）
来向该已配置主机发起请求。

直接使用托管的 Ollama Web Search：

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

## 注意事项

- 此提供商不需要单独的 web-search 专用 API 密钥字段。
- 如果 Ollama 主机受认证保护，OpenClaw 会在可用时复用常规 Ollama
  提供商 API 密钥。
- 如果 `baseUrl` 是 `https://ollama.com`，OpenClaw 会直接调用
  `https://ollama.com/api/web_search`，并将已配置的 Ollama
  API 密钥作为 bearer 认证发送。
- 如果已配置的主机不提供 web search 且设置了 `OLLAMA_API_KEY`，
  OpenClaw 可以回退到 `https://ollama.com/api/web_search`，而不会将
  该环境变量密钥发送到本地主机。
- 如果 Ollama 无法访问或未登录，OpenClaw 会在设置期间发出警告，但
  不会阻止选择。
- 当未配置更高优先级的已认证提供商时，OpenClaw 不会自动选择 Ollama Web Search；
  请通过 `tools.web.search.provider: "ollama"` 显式选择它。
- 本地 Ollama 守护进程主机会使用本地代理端点
  `/api/experimental/web_search`，该端点会签名并转发到 Ollama Cloud。
- `https://ollama.com` 主机会直接使用公共托管端点
  `/api/web_search`，并通过 bearer API 密钥认证。

## 相关

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [Ollama](/providers/ollama) -- Ollama 模型设置以及云/本地模式
