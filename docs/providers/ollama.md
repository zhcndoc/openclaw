---
summary: "使用 Ollama 运行 OpenClaw（云端和本地模型）"
read_when:
  - 你想通过 Ollama 使用云端或本地模型运行 OpenClaw
  - 你需要 Ollama 的设置和配置指导
  - 你想使用 Ollama 的视觉模型进行图像理解
title: "Ollama"
---

OpenClaw 通过 Ollama 的原生 API（`/api/chat`）集成了托管云端模型和本地/自托管的 Ollama 服务器。你可以通过三种模式使用 Ollama：通过可访问的 Ollama 主机进行 `Cloud + Local`，针对 `https://ollama.com` 的 `Cloud only`，或针对可访问的 Ollama 主机的 `Local only`。

<Warning>
**远程 Ollama 用户**：不要将 `/v1` 的 OpenAI 兼容 URL（`http://host:11434/v1`）与 OpenClaw 一起使用。这会破坏工具调用，并且模型可能会将原始工具 JSON 作为纯文本输出。请改用原生 Ollama API URL：`baseUrl: "http://host:11434"`（不要带 `/v1`）。
</Warning>

Ollama 提供方配置使用 `baseUrl` 作为规范键。为了兼容 OpenAI SDK 风格的示例，OpenClaw 也接受 `baseURL`，但新的配置应优先使用 `baseUrl`。

## 认证规则

<AccordionGroup>
  <Accordion title="本地和局域网主机">
    本地和局域网 Ollama 主机不需要真正的 bearer token。OpenClaw 仅对回环地址、私有网络、`.local` 和裸主机名的 Ollama base URL 使用本地的 `ollama-local` 标记。
  </Accordion>
  <Accordion title="远程和 Ollama Cloud 主机">
    远程公共主机和 Ollama Cloud（`https://ollama.com`）需要通过 `OLLAMA_API_KEY`、认证配置文件或提供方的 `apiKey` 提供真实凭据。
  </Accordion>
  <Accordion title="自定义提供方 id">
    设置了 `api: "ollama"` 的自定义提供方 id 遵循相同规则。例如，指向私有局域网 Ollama 主机的 `ollama-remote` 提供方可以使用 `apiKey: "ollama-local"`，子代理会通过 Ollama 提供方钩子解析该标记，而不是将其视为缺失的凭据。内存搜索也可以将 `agents.defaults.memorySearch.provider` 设置为该自定义提供方 id，这样嵌入就会使用匹配的 Ollama 端点。
  </Accordion>
  <Accordion title="认证配置文件">
    `auth-profiles.json` 会为某个提供方 id 存储凭据。将端点设置（`baseUrl`、`api`、模型 id、请求头、超时）放在 `models.providers.<id>` 中。像 `{ "ollama-windows": { "apiKey": "ollama-local" } }` 这样的旧式扁平认证配置文件不是运行时格式；运行 `openclaw doctor --fix` 可将其重写为带备份的规范 `ollama-windows:default` API 密钥配置文件。该文件中的 `baseUrl` 只是兼容性冗余，应移到提供方配置中。
  </Accordion>
  <Accordion title="内存嵌入作用域">
    当 Ollama 用于内存嵌入时，bearer 认证仅作用于其声明所在的主机：

    - 提供方级密钥只发送到该提供方的 Ollama 主机。
    - `agents.*.memorySearch.remote.apiKey` 只发送到其远程嵌入主机。
    - 纯 `OLLAMA_API_KEY` 环境变量值会被视为 Ollama Cloud 约定，默认不会发送到本地或自托管主机。

  </Accordion>
</AccordionGroup>

## 快速开始

选择你偏好的设置方式和模式。

<Tabs>
  <Tab title="入门引导（推荐）">
    **最适合：** 以最快路径完成可用的 Ollama 云端或本地设置。

    <Steps>
      <Step title="运行引导">
        ```bash
        openclaw onboard
        ```

        从提供方列表中选择 **Ollama**。
      </Step>
      <Step title="选择你的模式">
        - **Cloud + Local** — 通过该主机路由的本地 Ollama 主机和云端模型
        - **Cloud only** — 通过 `https://ollama.com` 使用托管的 Ollama 模型
        - **Local only** — 仅本地模型

      </Step>
      <Step title="选择一个模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管云端默认模型。`Cloud + Local` 和 `Local only` 会要求提供一个 Ollama base URL，发现可用模型，并在所选本地模型尚不可用时自动拉取该模型。当 Ollama 报告已安装的 `:latest` 标签（例如 `gemma4:latest`）时，设置会只显示一次已安装的模型，而不会同时显示 `gemma4` 和 `gemma4:latest`，也不会再次拉取裸别名。`Cloud + Local` 还会检查该 Ollama 主机是否已登录以获取云端访问权限。
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

    也可以指定自定义 base URL 或模型：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

  </Tab>

  <Tab title="手动设置">
    **最适合：** 对云端或本地设置进行完全控制。

    <Steps>
      <Step title="选择云端或本地">
        - **Cloud + Local**：安装 Ollama，使用 `ollama signin` 登录，并通过该主机路由云端请求
        - **Cloud only**：使用带有 `OLLAMA_API_KEY` 的 `https://ollama.com`
        - **Local only**：从 [ollama.com/download](https://ollama.com/download) 安装 Ollama

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
        对于 `Cloud only`，请使用你真实的 `OLLAMA_API_KEY`。对于基于主机的设置，任何占位值都可以：

        ```bash
        # 云端
        export OLLAMA_API_KEY="your-ollama-api-key"

        # 仅本地
        export OLLAMA_API_KEY="ollama-local"

        # 或在配置文件中进行配置
        openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"
        ```
      </Step>
      <Step title="检查并设置你的模型">
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
    `Cloud + Local` 使用一个可访问的 Ollama 主机作为本地和云端模型的控制点。这是 Ollama 首选的混合流程。

    在设置过程中使用 **Cloud + Local**。OpenClaw 会提示输入 Ollama base URL，从该主机发现本地模型，并检查该主机是否已通过 `ollama signin` 登录以获得云端访问权限。当主机已登录时，OpenClaw 还会建议诸如 `kimi-k2.5:cloud`、`minimax-m2.7:cloud` 和 `glm-5.1:cloud` 之类的托管云端默认模型。

    如果主机尚未登录，OpenClaw 会保持仅本地设置，直到你运行 `ollama signin`。

  </Tab>

  <Tab title="Cloud only">
    `Cloud only` 针对 Ollama 托管 API `https://ollama.com` 运行。

    在设置过程中使用 **Cloud only**。OpenClaw 会提示输入 `OLLAMA_API_KEY`，设置 `baseUrl: "https://ollama.com"`，并初始化托管云端模型列表。此路径**不**需要本地 Ollama 服务器或 `ollama signin`。

    `openclaw onboard` 期间显示的云端模型列表会从 `https://ollama.com/api/tags` 实时填充，最多 500 个条目，因此选择器反映的是当前托管目录，而不是静态种子。如果在设置时 `ollama.com` 不可访问或未返回任何模型，OpenClaw 会回退到之前的硬编码建议，以确保引导仍能完成。

  </Tab>

  <Tab title="Local only">
    在仅本地模式下，OpenClaw 会从已配置的 Ollama 实例发现模型。此路径适用于本地或自托管的 Ollama 服务器。

    OpenClaw 目前将 `gemma4` 作为本地默认模型建议。

  </Tab>
</Tabs>

## 模型发现（隐式提供方）

当你设置了 `OLLAMA_API_KEY`（或认证配置文件），并且**没有**定义 `models.providers.ollama` 或另一个带有 `api: "ollama"` 的自定义远程提供方时，OpenClaw 会从位于 `http://127.0.0.1:11434` 的本地 Ollama 实例发现模型。

| 行为                 | 细节                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询             | 查询 `/api/tags`                                                                                                                                                  |
| 能力检测             | 尽力使用 `/api/show` 查询来读取 `contextWindow`、展开后的 `num_ctx` Modelfile 参数，以及包括视觉/工具在内的能力                       |
| 视觉模型             | `/api/show` 报告具有 `vision` 能力的模型会被标记为可处理图像（`input: ["text", "image"]`），因此 OpenClaw 会自动将图像注入提示词  |
| 推理检测             | 在可用时使用 `/api/show` 能力，包括 `thinking`；当 Ollama 省略能力信息时，则回退到基于模型名称的启发式判断（`r1`、`reasoning`、`think`） |
| Token 限制           | 将 `maxTokens` 设置为 OpenClaw 使用的默认 Ollama 最大 token 上限                                                                                                |
| 成本                 | 将所有成本设为 `0`                                                                                                                                                |

这避免了手动录入模型，同时保持目录与本地 Ollama 实例一致。你可以在本地 `infer model run` 中使用完整引用，例如 `ollama/<pulled-model>:latest`；OpenClaw 会从 Ollama 的实时目录中解析该已安装模型，而无需手写 `models.json` 条目。

对于已登录的 Ollama 主机，某些 `:cloud` 模型在出现在 `/api/tags` 之前，可能就已经可以通过 `/api/chat`
和 `/api/show` 使用。当你显式选择一个完整的
`ollama/<model>:cloud` 引用时，OpenClaw 会使用
`/api/show` 验证那个确实缺失的模型，并且只有在 Ollama 确认模型
元数据时才将其添加到运行时目录中。拼写错误仍然会作为未知模型失败，而不会被自动创建。

```bash
# 查看可用模型
ollama list
openclaw models list
```

若要进行一个避免完整代理工具面的窄文本生成冒烟测试，
请在本地 `infer model run` 中使用完整的 Ollama 模型引用：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

该路径仍然使用 OpenClaw 已配置的提供方、认证和原生 Ollama
传输，但不会启动一次聊天代理轮次，也不会加载 MCP/工具上下文。如果
这一步成功而正常的代理回复失败，则下一步应排查模型的代理
提示词/工具能力。

对于同一路径上的窄视觉模型冒烟测试，可在 `infer model run` 中添加一个或多个
图像文件。这会将提示词和图像直接发送到所选的 Ollama 视觉模型，而不会加载聊天工具、内存或先前的
会话上下文：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "用一句话描述这张图片。" \
    --file ./photo.jpg \
    --json
```

`model run --file` 接受被检测为 `image/*` 的文件，包括常见的 PNG、
JPEG 和 WebP 输入。非图像文件会在调用 Ollama 之前被拒绝。
如需语音识别，请改用 `openclaw infer audio transcribe`。

当你使用 `/model ollama/<model>` 切换对话时，OpenClaw 会将
其视为精确的用户选择。如果已配置的 Ollama `baseUrl`
不可访问，下一次回复将因提供方错误而失败，而不会静默地
从其他已配置的回退模型作答。

隔离的 cron 任务在启动代理轮次前会多做一次本地安全检查。如果所选模型解析到本地、私有网络或 `.local` 的 Ollama 提供方，并且 `/api/tags` 不可访问，OpenClaw 会将该 cron 运行记录为 `skipped`，并在错误文本中包含所选的 `ollama/<model>`。端点预检会缓存 5 分钟，因此指向同一个已停止 Ollama 守护进程的多个 cron 任务不会都发起失败的模型请求。

使用以下命令对本地 Ollama 进行本地文本路径、原生流式路径和嵌入的实时验证：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

For Ollama Cloud API-key smoke tests, point the live test at `https://ollama.com`
and choose a hosted model from the current catalog:

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'

OPENCLAW_LIVE_TEST=1 \
OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

The cloud smoke runs text, native stream, and web search. It skips embeddings by
default for `https://ollama.com` because Ollama Cloud API keys may not authorize
`/api/embed`. Set `OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1` when you explicitly want
the live test to fail if the configured cloud key cannot use the embed endpoint.

To add a new model, simply pull it with Ollama:

```bash
ollama pull mistral
```

新模型会被自动发现并可供使用。

<Note>
如果你显式设置了 `models.providers.ollama`，或配置了诸如 `models.providers.ollama-cloud` 之类且 `api: "ollama"` 的自定义远程提供方，则会跳过自动发现，你必须手动定义模型。像 `http://127.0.0.2:11434` 这样的回环自定义提供方仍会被视为本地。请参见下面的显式配置部分。
</Note>

## 视觉与图像描述

打包的 Ollama 插件将 Ollama 注册为支持图像的媒体理解提供方。这使 OpenClaw 能够通过本地或托管的 Ollama 视觉模型来路由显式的图像描述请求，以及已配置的图像模型默认项。

对于本地视觉模型，请拉取一个支持图像的模型：

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
```

然后使用 infer CLI 进行验证：

```bash
openclaw infer image describe \
  --file ./photo.jpg \
  --model ollama/qwen2.5vl:7b \
  --json
```

`--model` 必须是完整的 `<provider/model>` 引用。当它被设置时，`openclaw infer image describe` 会直接运行该模型，而不是因为模型支持原生视觉而跳过描述。

当你想要使用 OpenClaw 的图像理解提供方流程、已配置的 `agents.defaults.imageModel`，以及图像描述输出结构时，请使用 `infer image describe`。当你想要使用自定义提示词和一张或多张图像对原始多模态模型进行探测时，请使用 `infer model run --file`。

要将 Ollama 设为传入媒体的默认图像理解模型，请配置 `agents.defaults.imageModel`：

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

优先使用完整的 `ollama/<model>` 引用。如果同一模型同时列在 `models.providers.ollama.models` 下，并且 `input: ["text", "image"]`，且没有其他已配置的图像提供方暴露该裸模型 ID，那么 OpenClaw 也会将诸如 `qwen2.5vl:7b` 这样的裸 `imageModel` 引用规范化为 `ollama/qwen2.5vl:7b`。如果有多个已配置的图像提供方拥有相同的裸 ID，请显式使用提供方前缀。

缓慢的本地视觉模型可能需要比云模型更长的图像理解超时时间。它们在 Ollama 尝试在受限硬件上分配完整的、声明的视觉上下文时，也可能崩溃或停止。当你只需要一次普通的图像描述交互时，请设置能力超时，并在模型条目上限制 `num_ctx`：

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

此超时适用于传入的图像理解，也适用于代理在一次交互中可调用的显式 `image` 工具。提供方级别的 `models.providers.ollama.timeoutSeconds` 仍然控制普通模型调用的底层 Ollama HTTP 请求保护。

使用以下命令对本地 Ollama 上的显式图像工具进行实时验证：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果你手动定义了 `models.providers.ollama.models`，请将视觉模型标记为支持图像输入：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝对未标记为支持图像的模型发起图像描述请求。通过隐式发现时，OpenClaw 会在 `/api/show` 报告视觉能力时从 Ollama 读取这一信息。

## 配置

<Tabs>
  <Tab title="基础（隐式发现）">
    最简单的仅本地启用方式是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，你可以在提供方条目中省略 `apiKey`，OpenClaw 会在可用性检查时自动填充。
    </Tip>

  </Tab>

  <Tab title="显式（手动模型）">
    当你想要使用托管云端配置、Ollama 运行在另一台主机/端口上、你想强制指定上下文窗口或模型列表，或者你想完全手动定义模型时，请使用显式配置。

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
    如果 Ollama 运行在不同的主机或端口上（显式配置会禁用自动发现，因此请手动定义模型）：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // 不要加 /v1 - 使用原生 Ollama API URL
            api: "ollama", // 显式设置以保证原生工具调用行为
            timeoutSeconds: 300, // 可选：给冷启动的本地模型更多连接和流式传输时间
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // 可选：让模型在轮次之间保持加载
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    不要在 URL 中添加 `/v1`。`/v1` 路径使用 OpenAI 兼容模式，其中工具调用不可靠。请使用不带路径后缀的 Ollama 基础 URL。
    </Warning>

  </Tab>
</Tabs>

## 常见配方

请将这些作为起点，并将模型 ID 替换为 `ollama list` 或 `openclaw models list --provider ollama` 中的精确名称。

<AccordionGroup>
  <Accordion title="带自动发现的本地模型">
    当 Ollama 运行在与 Gateway 相同的机器上，并且你希望 OpenClaw 自动发现已安装的模型时，请使用此方式。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    这种方式会将配置保持在最小。不要添加 `models.providers.ollama` 块，除非你想手动定义模型。

  </Accordion>

  <Accordion title="带手动模型的局域网 Ollama 主机">
    对局域网主机使用原生 Ollama URL。不要添加 `/v1`。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` 是 OpenClaw 侧的上下文预算。`params.num_ctx` 会作为请求发送给 Ollama。当你的硬件无法运行模型完整声明的上下文时，请保持两者一致。

  </Accordion>

  <Accordion title="仅 Ollama Cloud">
    当你不运行本地守护进程，并且希望直接使用托管的 Ollama 模型时，请使用此方式。

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

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
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="通过已登录守护进程同时使用云端和本地">
    当本地或局域网的 Ollama 守护进程已通过 `ollama signin` 登录，并且应同时提供本地模型和 `:cloud` 模型时，请使用此方式。

    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="多个 Ollama 主机">
    当你有不止一个 Ollama 服务器时，请使用自定义提供方 ID。每个提供方都有自己独立的主机、模型、认证、超时和模型引用。

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    当 OpenClaw 发送请求时，活动提供方前缀会被剥离，因此 `ollama-large/qwen3.5:27b` 会以 `qwen3.5:27b` 的形式到达 Ollama。

  </Accordion>

  <Accordion title="精简本地模型配置">
    一些本地模型可以回答简单提示，但在完整的代理工具表面前会吃力。在更改全局运行时设置之前，先从限制工具和上下文开始。

    ```json5
    {
      agents: {
        list: [
          {
            id: "local",
            experimental: {
              localModelLean: true,
            },
            model: { primary: "ollama/gemma4" },
          },
        ],
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    只有当模型或服务器在工具模式上可靠失败时，才使用 `compat.supportsTools: false`。它以代理能力换取稳定性。
    `localModelLean` 会从代理表面移除浏览器、cron 和消息工具，但不会改变 Ollama 的运行时上下文或思考模式。对于会循环或将响应预算消耗在隐藏推理上的小型 Qwen 风格思考模型，请将其与显式的 `params.num_ctx` 和 `params.thinking: false` 配合使用。

  </Accordion>
</AccordionGroup>

### 模型选择

一旦完成配置，所有你的 Ollama 模型都可用：

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

也支持自定义 Ollama 提供方 id。当一个模型引用使用活动提供方前缀时，例如 `ollama-spark/qwen3:32b`，OpenClaw 在调用 Ollama 之前只会剥离该前缀，因此服务器收到的是 `qwen3:32b`。

对于较慢的本地模型，优先在提供方范围内调整请求，而不是提高整个代理运行时超时：

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` 适用于模型 HTTP 请求，包括连接建立、头部、正文流式传输以及整个受保护的 fetch 中止。`params.keep_alive` 会在原生 `/api/chat` 请求中作为顶层 `keep_alive` 转发给 Ollama；当首次加载时间是瓶颈时，请按模型设置它。

### 快速验证

```bash
# 此机器可见的 Ollama 守护进程
curl http://127.0.0.1:11434/api/tags

# OpenClaw 目录和已选模型
openclaw models list --provider ollama
openclaw models status

# 直接模型冒烟测试
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 中使用的主机。如果 `curl` 可以工作但 OpenClaw 不行，请检查 Gateway 是否运行在不同的机器、容器或服务账户下。

## Ollama Web Search

OpenClaw 支持 **Ollama Web Search**，作为内置的 `web_search` 提供程序。

| 属性         | 详情                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 主机         | 使用你配置的 Ollama 主机（如果设置了 `models.providers.ollama.baseUrl`，则使用它；否则使用 `http://127.0.0.1:11434`）；`https://ollama.com` 会直接使用托管 API |
| 认证         | 已登录的本地 Ollama 主机无需密钥；直接使用 `https://ollama.com` 搜索或受认证保护的主机时，使用 `OLLAMA_API_KEY` 或已配置的提供程序认证               |
| 要求         | 本地/自托管主机必须正在运行，并通过 `ollama signin` 登录；直接使用托管搜索需要 `baseUrl: "https://ollama.com"` 以及真实的 Ollama API key |

在 `openclaw onboard` 或 `openclaw configure --section web` 时选择 **Ollama Web Search**，或者设置：

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
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
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

对于已登录的本地守护进程，OpenClaw 使用该守护进程的 `/api/experimental/web_search` 代理。对于 `https://ollama.com`，它会直接调用托管的 `/api/web_search` 端点。

<Note>
有关完整的设置与行为细节，请参阅 [Ollama Web Search](/tools/ollama-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="旧版 OpenAI 兼容模式">
    <Warning>
    **在 OpenAI 兼容模式下，工具调用并不可靠。** 仅在你确实需要代理所用的 OpenAI 格式，并且不依赖原生工具调用行为时，才使用此模式。
    </Warning>

    如果你需要改用 OpenAI 兼容端点（例如，在仅支持 OpenAI 格式的代理后面），请显式设置 `api: "openai-completions"`：

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

    此模式可能无法同时支持流式传输和工具调用。你可能需要在模型配置中使用 `params: { streaming: false }` 来禁用流式传输。

    当 `api: "openai-completions"` 与 Ollama 一起使用时，OpenClaw 默认会注入 `options.num_ctx`，以免 Ollama 悄然回退到 4096 的上下文窗口。如果你的代理/上游服务拒绝未知的 `options` 字段，请禁用此行为：

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
    对于自动发现的模型，OpenClaw 会在可用时使用 Ollama 报告的上下文窗口，包括来自自定义 Modelfile 的更大 `PARAMETER num_ctx` 值。否则会回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    You can set provider-level `contextWindow`, `contextTokens`, and `maxTokens` defaults for every model under that Ollama provider, then override them per model when needed. `contextWindow` is OpenClaw's prompt and compaction budget. Native Ollama requests leave `options.num_ctx` unset unless you explicitly configure `params.num_ctx`, so Ollama can apply its own model, `OLLAMA_CONTEXT_LENGTH`, or VRAM-based default. To cap or force Ollama's per-request runtime context without rebuilding a Modelfile, set `params.num_ctx`; invalid, zero, negative, and non-finite values are ignored. If you upgraded an older config that used only `contextWindow` or `maxTokens` to force a native Ollama request context, run `openclaw doctor --fix` to copy those explicit provider or model budgets into `params.num_ctx`. The OpenAI-compatible Ollama adapter still injects `options.num_ctx` by default from the configured `params.num_ctx` or `contextWindow`; disable that with `injectNumCtxForOpenAICompat: false` if your upstream rejects `options`.

    原生 Ollama 模型条目也接受 `params` 下常见的 Ollama 运行时选项，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 只转发 Ollama 请求键，因此 OpenClaw 运行时参数（如 `streaming`）不会泄漏给 Ollama。使用 `params.think` 或 `params.thinking` 发送顶层 Ollama `think`；`false` 会为 Qwen 风格的思考模型禁用 API 级思考。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    每个模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也同样有效。如果两者都已配置，则显式的提供程序模型条目会优先于 agent 默认值。

  </Accordion>

  <Accordion title="思考控制">
    对于原生 Ollama 模型，OpenClaw 会按 Ollama 预期的方式转发思考控制：使用顶层 `think`，而不是 `options.think`。其 `/api/show` 响应中包含 `thinking` 能力的自动发现模型会暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；非思考模型只会暴露 `/think off`。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    你也可以设置模型默认值：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    每个模型的 `params.think` 或 `params.thinking` 可以为特定已配置模型禁用或强制启用 Ollama API thinking。OpenClaw 在当前运行仅具有隐式默认值 `off` 时会保留这些显式模型参数；非 off 的运行时命令，如 `/think medium`，仍会覆盖当前运行。

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 默认将名称类似 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    无需额外配置。OpenClaw 会自动标记它们。

  </Accordion>

  <Accordion title="模型成本">
    Ollama 是免费的，并在本地运行，因此所有模型成本都设为 $0。这同时适用于自动发现和手动定义的模型。
  </Accordion>

  <Accordion title="记忆嵌入">
    内置的 Ollama 插件会为
    [memory search](/concepts/memory) 注册一个记忆嵌入提供程序。
    它使用已配置的 Ollama base URL
    和 API key，调用 Ollama 当前的 `/api/embed` 端点，并在可能时将
    多个记忆块批量合并为一个 `input` 请求。

    When `proxy.enabled=true`, Ollama memory embedding requests to the exact
    host-local loopback origin derived from the configured `baseUrl` use
    OpenClaw's guarded direct path instead of the managed forward proxy. The
    configured hostname must itself be `localhost` or a loopback IP literal;
    DNS names that merely resolve to loopback still use the managed proxy path.
    LAN, tailnet, private-network, and public Ollama hosts also stay on the
    managed proxy path. Redirects to another host or port do not inherit trust.
    Operators can still set the global `proxy.loopbackMode: "proxy"` setting to
    send loopback traffic through the proxy, or `proxy.loopbackMode: "block"`
    to deny loopback connections before opening a connection; see
    [Managed proxy](/security/network-proxy#gateway-loopback-mode) for the
    process-wide effect of this setting.

    | Property      | Value               |
    | ------------- | ------------------- |
    | Default model | `nomic-embed-text`  |
    | Auto-pull     | Yes — the embedding model is pulled automatically if not present locally |

    查询时的嵌入会对需要或建议使用检索前缀的模型进行处理，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。记忆文档批次会保持原始格式，因此现有索引无需迁移格式。

    若要选择 Ollama 作为记忆搜索嵌入提供程序：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              // Ollama 的默认值。如果重新索引太慢，在更大的主机上可提高此值。
              nonBatchConcurrency: 1,
            },
          },
        },
      },
    }
    ```

    对于远程嵌入主机，请将认证范围限定在该主机：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            model: "nomic-embed-text",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              apiKey: "ollama-local",
              nonBatchConcurrency: 2,
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式传输配置">
    OpenClaw 的 Ollama 集成默认使用**原生 Ollama API**（`/api/chat`），它完全支持同时进行流式传输和工具调用。无需特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 也会直接将思考控制转发给 Ollama：`/think off` 和 `openclaw agent --thinking off` 会发送顶层 `think: false`，除非已配置显式模型 `params.think`/`params.thinking` 值；而 `/think low|medium|high` 会发送匹配的顶层 `think` 努力字符串。`/think max` 映射到 Ollama 最高的原生努力值，`think: "high"`。

    <Tip>
    如果你需要使用 OpenAI 兼容端点，请参阅上面的“旧版 OpenAI 兼容模式”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="WSL2 崩溃循环（重复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 上，官方 Ollama Linux 安装程序会创建一个 `ollama.service` systemd 单元，并设置 `Restart=always`。如果该服务自动启动，并在 WSL2 启动期间加载 GPU 支持的模型，Ollama 在模型加载时可能会锁定主机内存。Hyper-V 内存回收并不总能回收这些被锁定的页面，因此 Windows 可能会终止 WSL2 虚拟机，systemd 随后再次启动 Ollama，循环便会重复。

    常见迹象：

    - 来自 Windows 一侧的 WSL2 重启或终止反复发生
    - WSL2 启动后不久，`app.slice` 或 `ollama.service` 出现高 CPU 占用
    - 来自 systemd 的 SIGTERM，而不是 Linux OOM killer 事件

    当 OpenClaw 检测到 WSL2、已启用且 `Restart=always` 的 `ollama.service`，以及可见的 CUDA 标记时，会记录启动警告。

    缓解方法：

    ```bash
    sudo systemctl disable ollama
    ```

    在 Windows 一侧的 `%USERPROFILE%\.wslconfig` 中添加以下内容，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服务环境中设置更短的 keep-alive，或者只在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    确保 Ollama 正在运行，并且你已设置 `OLLAMA_API_KEY`（或认证配置文件），同时你**没有**定义显式的 `models.providers.ollama` 条目：

    ```bash
    ollama serve
    ```

    验证 API 是否可访问：

    ```bash
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="没有可用模型">
    如果你的模型未列出，请先在本地拉取该模型，或者在 `models.providers.ollama` 中显式定义它。

    ```bash
    ollama list  # 查看已安装内容
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # 或其他模型
    ```

  </Accordion>

  <Accordion title="连接被拒绝">
    检查 Ollama 是否在正确端口上运行：

    ```bash
    # 检查 Ollama 是否正在运行
    ps aux | grep ollama

    # 或重启 Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="远程主机在 curl 中可用，但 OpenClaw 不可用">
    请在运行 Gateway 的同一台机器和运行时中进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 运行在 Docker 中或另一台主机上。
    - URL 使用了 `/v1`，这会选择 OpenAI 兼容行为，而不是原生 Ollama。
    - 远程主机需要在 Ollama 侧进行防火墙或局域网绑定设置更改。
    - 模型存在于你笔记本电脑的守护进程中，但不在远程守护进程中。

  </Accordion>

  <Accordion title="模型输出将工具 JSON 作为文本返回">
    这通常意味着提供程序正在使用 OpenAI 兼容模式，或者模型无法处理工具 schema。

    优先使用原生 Ollama 模式：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    如果某个较小的本地模型仍然在工具 schema 上失败，请在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

  </Accordion>

  <Accordion title="Kimi 或 GLM 返回乱码符号">
    对于托管的 Kimi/GLM 响应，如果其内容是较长的、非语言性的符号串，则会被视为提供程序输出失败，而不是成功的助手回答。这样正常的重试、回退或错误处理就可以接管，而不会将损坏的文本持久写入会话。

    如果这种情况反复发生，请捕获原始模型名称、当前会话文件，以及运行是否使用了 `Cloud + Local` 或 `Cloud only`，然后尝试新的会话和备用模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="本地冷启动模型超时">
    大型本地模型在开始流式传输前可能需要较长的首次加载时间。请将超时限制限定在 Ollama 提供程序上，并可选地让 Ollama 在轮次之间保持模型加载：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    如果主机本身连接接受速度较慢，`timeoutSeconds` 也会延长该提供程序受保护的 Undici 连接超时。

  </Accordion>

  <Accordion title="大上下文模型太慢或内存不足">
    许多 Ollama 模型声明的上下文比你的硬件实际能够舒适运行的还要大。原生 Ollama 会使用 Ollama 自己的运行时上下文默认值，除非你设置了 `params.num_ctx`。当你希望获得可预测的首 token 延迟时，请同时限制 OpenClaw 的预算和 Ollama 的请求上下文：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    如果 OpenClaw 发送的提示词过多，先降低 `contextWindow`。如果 Ollama 加载的运行时上下文对机器来说太大，则降低 `params.num_ctx`。如果生成时间过长，则降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>
更多帮助： [Troubleshooting](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型提供程序" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为概览。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama Web Search" href="/tools/ollama-search" icon="magnifying-glass">
    基于 Ollama 的网页搜索的完整设置与行为细节。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>