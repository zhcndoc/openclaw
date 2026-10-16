---
summary: "Ollama 提供程序的基本、显式和自定义基本 URL 配置形状"
read_when:
  - "您正在配置中写入 Ollama 提供程序条目"
  - "您需要隐式发现、手动模型列表或自定义基础 URL"
title: "Ollama配置"
sidebarTitle: "配置"
---

## <a id="configuration"></a> 配置

<Tabs>
  <Tab id="basic-implicit-discovery" title="基本（隐式发现）">
    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果已设置 `OLLAMA_API_KEY`，则可以在 provider 条目中省略 `apiKey`；OpenClaw 会在可用性检查时自动填入。
    </Tip>

  </Tab>

  <Tab id="explicit-manual-models" title="显式（手动模型）">
    使用显式配置进行托管云设置、非默认 host/port、强制上下文窗口或每个模型设置。托管`https://ollama.com`仅使用列出的模型；自托管端点还列出了其其他已安装的模型：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.6:cloud",
                name: "kimi-k2.6:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab id="custom-base-url" title="定制底座 URL">
    列出的模型保留这些设置；仍然会发现该主机上安装的其他模型：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // No /v1 - native Ollama API URL
            api: "ollama", // Explicit: guarantees native tool-calling behavior
            timeoutSeconds: 300, // Optional: longer connect/stream budget for cold local models
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // Optional: keep the model loaded between turns
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    不要添加 `/v1`。该路径选择 OpenAI- 兼容模式，该模式下工具调用不可靠。
    </Warning>

  </Tab>
</Tabs>
