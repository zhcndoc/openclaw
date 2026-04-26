---
summary: "通过 Ollama（云端和本地模型）运行 OpenClaw"
read_when:
  - 您想通过 Ollama 使用云端或本地模型运行 OpenClaw
  - 您需要 Ollama 的设置与配置指南
  - 您想使用 Ollama 视觉模型进行图像理解
title: "Ollama"
---

OpenClaw 集成了 Ollama 的原生 API (`/api/chat`)，用于托管云端模型和本地/自托管的 Ollama 服务器。您可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机使用 `Cloud + Local`，通过 `https://ollama.com` 使用 `Cloud only`，或者通过可访问的 Ollama 主机使用 `Local only`。

<Warning>
**远程 Ollama 用户注意**：不要使用带有 `/v1` 的 OpenAI 兼容 URL（例如 `http://host:11434/v1`）与 OpenClaw 一起使用。这会导致工具调用失效，模型可能会以纯文本形式输出原始的工具 JSON。应使用 Ollama 的原生 API URL：`baseUrl: "http://host:11434"`（不要加 `/v1`）。
</Warning>

## 入门指南

选择您首选的设置方法和模式。

<Tabs>
  <Tab title="Onboarding (recommended)">
    **最适合：** 以最快路径完成可用的 Ollama 云端或本地设置。

    <Steps>
      <Step title="运行入门引导">
        ```bash
        openclaw onboard
        ```

        从提供者列表中选择 **Ollama**。
      </Step>
      <Step title="选择模式">
        - **Cloud + Local** - 本地 Ollama 主机加上经由该主机路由的云端模型
        - **Cloud only** - 通过 `https://ollama.com` 使用托管的 Ollama 模型
        - **Local only** - 仅使用本地模型
      </Step>
      <Step title="选择模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管云端默认值。`Cloud + Local` 和 `Local only` 会要求输入 Ollama 基础 URL，发现可用模型，并在所选本地模型尚不可用时自动拉取。`Cloud + Local` 还会检查该 Ollama 主机是否已登录以获得云端访问权限。
      </Step>
      <Step title="验证模型是否可用">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    ### 非交互模式

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --accept-risk
    ```

    可选地指定自定义基础 URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="Manual setup">
    **最适合：** 完全控制云端或本地设置。

    <Steps>
      <Step title="选择云端或本地">
        - **Cloud + Local**: 安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **Cloud only**: 使用 `https://ollama.com` 和 `OLLAMA_API_KEY`
        - **Local only**: 从 [ollama.com/download](https://ollama.com/download) 安装 Ollama
      </Step>
      <Step title="拉取本地模型（仅本地）">
        ```bash
        ollama pull gemma4
        # 或
        ollama pull gpt-oss:20b
        # 或
        ollama pull llama3.3
        ```
      </Step>
      <Step title="为 OpenClaw 启用 Ollama">
        对于 `Cloud only`，请使用真实的 `OLLAMA_API_KEY`。对于基于主机的设置，任何占位值都可以：

        ```bash
        # 云端
        export OLLAMA_API_KEY="your-ollama-api-key"

        # 仅本地
        export OLLAMA_API_KEY="ollama-local"

        # 或在配置文件中设置
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="检查并设置您的模型">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        或在配置中设置默认值：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 云端模型

<Tabs>
  <Tab title="Cloud + Local">
    `Cloud + Local` 使用一个可访问的 Ollama 主机作为本地模型和云端模型的控制点。这是 Ollama 推荐的混合流程。

    在设置期间使用 **Cloud + Local**。OpenClaw 会提示输入 Ollama 基础 URL，从该主机发现本地模型，并检查该主机是否已通过 `ollama signin` 登录以获得云端访问权限。主机登录后，OpenClaw 还会建议诸如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud` 之类的托管云端默认模型。

    如果该主机尚未登录，OpenClaw 会将设置保持为仅本地，直到您运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 针对 Ollama 托管的 API `https://ollama.com` 运行。

    在设置期间使用 **Cloud only**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并填充托管云端模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

    `openclaw onboard` 期间显示的云端模型列表是从 `https://ollama.com/api/tags` 实时填充的，最多 500 条，因此选择器反映的是当前托管目录，而不是静态种子数据。如果 `ollama.com` 在设置时不可访问或没有返回模型，OpenClaw 会回退到之前的硬编码建议，以便入门引导仍可完成。

  </Tab>

  <Tab title="Local only">
    在仅本地模式下，OpenClaw 会从已配置的 Ollama 实例中发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前建议 `gemma4` 作为本地默认值。

  </Tab>
</Tabs>

## 模型自动发现（隐式提供者）

当您设置 `OLLAMA_API_KEY`（或认证配置）并且**未**定义 `models.providers.ollama` 时，OpenClaw 会从 `http://127.0.0.1:11434` 的本地 Ollama 实例发现模型。

| 行为             | 详情                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询        | 查询 `/api/tags`                                                                                                                                                 |
| 能力检测 | 使用尽力而为的 `/api/show` 查找来读取 `contextWindow` 并检测能力（包括视觉）                                                             |
| 视觉模型        | 通过 `/api/show` 报告具有 `vision` 能力的模型被标记为支持图像（`input: ["text", "image"]`），因此 OpenClaw 会自动将图像注入提示词 |
| 推理检测  | 使用模型名称启发式方法（`r1`, `reasoning`, `think`）标记 `reasoning`                                                                                          |
| Token 限制         | 将 `maxTokens` 设置为 OpenClaw 使用的默认 Ollama 最大 token 上限                                                                                               |
| 成本                | 将所有成本设置为 `0`                                                                                                                                               |

此做法避免了手动维护模型条目，同时保证目录与本地 Ollama 实例保持一致。

```bash
# 查看可用模型
ollama list
openclaw models list
```

添加新模型，只需使用 Ollama 拉取：

```bash
ollama pull mistral
```

新模型会被自动发现并可用。

<Note>
如果您显式设置 `models.providers.ollama`，将跳过自动发现，您必须手动定义模型。请参阅下面的显式配置部分。
</Note>

## 视觉与图像描述

内置的 Ollama 插件会将 Ollama 注册为支持图像的媒体理解提供者。这使得 OpenClaw 可以通过本地或托管的 Ollama 视觉模型来路由显式的图像描述请求和已配置的图像模型默认值。

对于本地视觉功能，请拉取一个支持图像的模型：

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

然后使用 infer CLI 验证：

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` 必须是完整的 `<provider/model>` 引用。当它被设置时，`openclaw infer image describe` 会直接运行该模型，而不是因为模型支持原生视觉而跳过描述。

要让 Ollama 成为传入媒体的默认图像理解模型，请配置 `agents.defaults.imageModel`：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

如果您手动定义 `models.providers.ollama.models`，请将视觉模型标记为支持图像输入：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

对于未标记为支持图像的模型，OpenClaw 会拒绝图像描述请求。对于隐式发现，OpenClaw 会在 `/api/show` 报告视觉能力时从 Ollama 读取该信息。

## 配置

<Tabs>
  <Tab title="Basic (implicit discovery)">
    最简单的仅本地启用路径是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以省略提供者条目中的 `apiKey`，OpenClaw 会为其填充以进行可用性检查。
    </Tip>

  </Tab>

  <Tab title="Explicit (manual models)">
    当您想要托管云端设置、Ollama 运行在其他主机/端口上、您想强制指定特定的上下文窗口或模型列表，或者您想完全手动定义模型时，请使用显式配置。

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
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
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

  <Tab title="自定义基础 URL">
    如果 Ollama 运行在不同主机或端口上（显式配置会禁用自动发现，因此请手动定义模型）：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // 不要加 /v1 - 使用 Ollama 原生 API URL
            api: "ollama", // 显式设置以保证原生工具调用行为
          },
        },
      },
    }
    ```

    <Warning>
    不要向 URL 添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，其中工具调用不可靠。使用不带路径后缀的基础 Ollama URL。
    </Warning>

  </Tab>
</Tabs>

### 模型选择

配置完成后，您所有的 Ollama 模型都可用：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

## Ollama 网页搜索

OpenClaw 支持 **Ollama 网页搜索** 作为捆绑的 `web_search` 提供者。

| 属性    | 详情                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| 主机        | 使用您配置的 Ollama 主机（设置时为 `models.providers.ollama.baseUrl`，否则为 `http://127.0.0.1:11434`） |
| 认证        | 无需密钥                                                                                                          |
| 要求 | Ollama 必须正在运行并使用 `ollama signin` 登录                                                         |

在 `openclaw onboard` 或 `openclaw configure --section web` 期间选择 **Ollama 网页搜索**，或设置：

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

<Note>
有关完整设置和行为详情，请参阅 [Ollama 网页搜索](/tools/ollama-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="旧版 OpenAI 兼容模式">
    <Warning>
    **工具调用在 OpenAI 兼容模式下不可靠。** 仅当您需要代理的 OpenAI 格式且不依赖原生工具调用行为时使用此模式。
    </Warning>

    如果您需要使用 OpenAI 兼容端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // 默认：true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    此模式可能不支持同时流式传输和工具调用。您可能需要在模型配置中使用 `params: { streaming: false }` 禁用流式传输。

    当 Ollama 使用 `api: "openai-completions"` 时，OpenClaw 默认注入 `options.num_ctx`，以便 Ollama 不会静默回退到 4096 上下文窗口。如果您的代理/上游拒绝未知的 `options` 字段，请禁用此行为：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="上下文窗口">
    对于自动发现的模型，当可用时 OpenClaw 使用 Ollama 报告的上下文窗口，否则回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    您可以在显式提供者配置中覆盖 `contextWindow` 和 `maxTokens`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
              }
            ]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 默认将名称为 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具有推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    不需要额外配置 -- OpenClaw 会自动标记它们。

  </Accordion>

  <Accordion title="模型成本">
    Ollama 是免费的且在本地运行，因此所有模型成本均设置为 $0。这适用于自动发现和手动定义的模型。
  </Accordion>

  <Accordion title="内存嵌入">
    捆绑的 Ollama 插件为 [内存搜索](/concepts/memory) 注册了一个内存嵌入提供者。它使用配置的 Ollama 基础 URL 和 API 密钥。

    | 属性      | 值               |
    | ------------- | ------------------- |
    | 默认模型 | `nomic-embed-text`  |
    | 自动拉取     | 是 — 如果本地不存在嵌入模型，则会自动拉取 |

    要选择 Ollama 作为内存搜索嵌入提供者：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: { provider: "ollama" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式配置">
    OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API**（`/api/chat`），完全支持同时流式传输和工具调用。不需要特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 还会将思考控制直接转发给 Ollama：`/think off` 和 `openclaw agent --thinking off` 会发送顶层 `think: false`，而非 `off` 的思考级别会发送 `think: true`。

    <Tip>
    如果您需要使用 OpenAI 兼容端点，请参阅上面的“旧版 OpenAI 兼容模式”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排查

<AccordionGroup>
  <Accordion title="未检测到 Ollama">
    确保 Ollama 正在运行，并且您设置了 `OLLAMA_API_KEY`（或认证配置），并且您**未**定义显式的 `models.providers.ollama` 条目：

    ```bash
    ollama serve
    ```

    验证 API 是否可访问：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="没有可用模型">
    如果您的模型未列出，请在本地拉取模型或在 `models.providers.ollama` 中显式定义它。

    ```bash
    ollama list  # 查看已安装的内容
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # 或其他模型
    ```

  </Accordion>

  <Accordion title="连接被拒绝">
    检查 Ollama 是否在正确的端口上运行：

    ```bash
    # 检查 Ollama 是否正在运行
    ps aux | grep ollama

    # 或重启 Ollama
    ollama serve
    ```

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题解答](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model selection" href="/concepts/model-providers" icon="layers">
    所有提供者、模型引用和故障转移行为概览。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama 网页搜索" href="/tools/ollama-search" icon="magnifying-glass">
    Ollama 支持的网页搜索的完整设置和行为详情。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>