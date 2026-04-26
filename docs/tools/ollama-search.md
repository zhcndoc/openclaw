---
summary: "通过你配置的 Ollama 主机使用 Ollama Web Search"
read_when:
  - 你想使用 Ollama 进行 web_search
  - 你需要一个无需密钥的 web_search 提供商
  - 你需要 Ollama Web Search 的设置指导
title: "Ollama 网页搜索"
---

OpenClaw 支持 **Ollama Web Search** 作为捆绑的 `web_search` 提供商。
它使用 Ollama 的实验性 web-search API，并返回包含标题、URL 和摘要的结构化结果。

与 Ollama 模型提供商不同，此设置默认不需要 API 密钥。它需要：

- 一个 OpenClaw 可以访问的 Ollama 主机
- `ollama signin`

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

如果你已经在使用 Ollama 模型，Ollama Web Search 会复用相同的已配置主机。

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
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

如果没有显式设置 Ollama base URL，OpenClaw 会使用 `http://127.0.0.1:11434`。

如果你的 Ollama 主机需要 bearer 认证，OpenClaw 也会复用
`models.providers.ollama.apiKey`（或相应的基于环境变量的提供商认证）
用于 web-search 请求。

## 注意事项

- 此提供商不需要专门的 web-search API 密钥字段。
- 如果 Ollama 主机受认证保护，OpenClaw 会在存在时复用常规的 Ollama
  提供商 API 密钥。
- 如果 Ollama 无法访问或未登录，OpenClaw 会在设置期间发出警告，但
  不会阻止选择。
- 当未配置更高优先级的带凭据提供商时，运行时自动检测可以回退到 Ollama Web Search。
- 该提供商使用 Ollama 的实验性 `/api/experimental/web_search`
  端点。

## 相关内容

- [Web Search 概览](/tools/web) -- 所有提供商和自动检测
- [Ollama](/providers/ollama) -- Ollama 模型设置以及云端/本地模式
