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

Ollama provider config uses `baseUrl` as the canonical key. OpenClaw also accepts `baseURL` for compatibility with OpenAI SDK-style examples, but new config should prefer `baseUrl`.

## Auth rules

<AccordionGroup>
  <Accordion title="Local and LAN hosts">
    本地和局域网的 Ollama 主机不需要真实的 bearer token。OpenClaw 仅在回环地址、私有网络、`.local` 和裸主机名的 Ollama base URL 上使用本地 `ollama-local` 标记。
  </Accordion>
  <Accordion title="Remote and Ollama Cloud hosts">
    远程公网主机和 Ollama Cloud（`https://ollama.com`）需要通过 `OLLAMA_API_KEY`、认证配置文件或提供者的 `apiKey` 提供真实凭证。
  </Accordion>
  <Accordion title="Custom provider ids">
    设置了 `api: "ollama"` 的自定义 provider id 遵循相同规则。例如，指向私有局域网 Ollama 主机的 `ollama-remote` provider 可以使用 `apiKey: "ollama-local"`，子代理会通过 Ollama provider 钩子解析该标记，而不是将其视为缺失的凭证。
  </Accordion>
  <Accordion title="Memory embedding scope">
    当 Ollama 用于内存嵌入时，bearer 认证仅作用于声明它的主机：

    - provider 级别的 key 仅发送到该 provider 的 Ollama 主机。
    - `agents.*.memorySearch.remote.apiKey` 仅发送到其远程嵌入主机。
    - 纯 `OLLAMA_API_KEY` 环境变量值会被视为 Ollama Cloud 约定，默认不会发送到本地或自托管主机。

  </Accordion>
</AccordionGroup>

## 快速开始

选择您首选的设置方法和模式。

<Tabs>
  <Tab title="入门引导（推荐）">
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
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议托管云端默认模型。`Cloud + Local` 和 `Local only` 会要求输入 Ollama base URL，发现可用模型，并在所选本地模型尚未可用时自动拉取它。When Ollama reports an installed `:latest` tag such as `gemma4:latest`, setup shows that installed model once instead of showing both `gemma4` and `gemma4:latest` or pulling the bare alias again. `Cloud + Local` 也会检查该 Ollama 主机是否已登录以获得云端访问权限。
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

  <Tab title="手动设置">
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

当您设置了 `OLLAMA_API_KEY`（或认证配置文件）且**未**定义 `models.providers.ollama` 或其他带有 `api: "ollama"` 的自定义远程 provider 时，OpenClaw 会从 `http://127.0.0.1:11434` 的本地 Ollama 实例发现模型。

| 行为             | 详情                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询        | 查询 `/api/tags`                                                                                                                                                 |
| 能力检测 | 使用尽力而为的 `/api/show` 查询来读取 `contextWindow`、展开的 `num_ctx` Modelfile 参数，以及包括视觉/工具在内的能力                      |
| 视觉模型        | 由 `/api/show` 报告具有 `vision` 能力的模型会被标记为支持图像（`input: ["text", "image"]`），因此 OpenClaw 会自动将图像注入提示词 |
| 推理检测  | 使用模型名称启发式（`r1`、`reasoning`、`think`）标记 `reasoning`                                                                                          |
| 令牌限制         | 将 `maxTokens` 设置为 OpenClaw 使用的默认 Ollama 最大令牌上限                                                                                               |
| 成本                | 将所有成本设为 `0`                                                                                                                                               |

This avoids manual model entries while keeping the catalog aligned with the local Ollama instance. You can use a full ref such as `ollama/<pulled-model>:latest` in local `infer model run`; OpenClaw resolves that installed model from Ollama's live catalog without requiring a hand-written `models.json` entry.

```bash
# 查看可用模型
ollama list
openclaw models list
```

For a narrow text-generation smoke test that avoids the full agent tool surface,
use local `infer model run` with a full Ollama model ref:

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "Reply with exactly: pong" \
    --json
```

That path still uses OpenClaw's configured provider, auth, and native Ollama
transport, but it does not start a chat-agent turn or load MCP/tool context. If
this succeeds while normal agent replies fail, troubleshoot the model's agent
prompt/tool capacity next.

When you switch a conversation with `/model ollama/<model>`, OpenClaw treats
that as an exact user selection. If the configured Ollama `baseUrl` is
unreachable, the next reply fails with the provider error instead of silently
answering from another configured fallback model.

Live-verify the local text path, native stream path, and embeddings against
local Ollama with:

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

要添加新模型，只需使用 Ollama 拉取它：

```bash
ollama pull mistral
```

新模型会被自动发现并可用。

<Note>
如果您显式设置了 `models.providers.ollama`，或者配置了诸如 `models.providers.ollama-cloud` 这类带有 `api: "ollama"` 的自定义远程 provider，则会跳过自动发现，您必须手动定义模型。回环自定义 provider，例如 `http://127.0.0.2:11434`，仍会被视为本地。请参阅下面的显式配置部分。
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

较慢的本地视觉模型可能需要比云端模型更长的图像理解超时时间。它们在 Ollama 尝试在受限硬件上分配完整声明的视觉上下文时，也可能崩溃或停止。请设置能力超时，并在只需要普通图像描述对话时限制模型条目中的 `num_ctx`：

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

此超时同时适用于传入图像理解以及代理在一次对话中可以调用的显式 `image` 工具。provider 级别的 `models.providers.ollama.timeoutSeconds` 仍然控制普通模型调用的底层 Ollama HTTP 请求保护。

使用以下命令可对本地 Ollama 进行显式图像工具的实时验证：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果您手动定义了 `models.providers.ollama.models`，请将视觉模型标记为支持图像输入：

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
  <Tab title="基础（隐式发现）">
    最简单的仅本地启用路径是通过环境变量：

    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果设置了 `OLLAMA_API_KEY`，您可以省略提供者条目中的 `apiKey`，OpenClaw 会为其填充以进行可用性检查。
    </Tip>

  </Tab>

  <Tab title="显式（手动模型）">
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
            baseUrl: "http://ollama-host:11434", // 不要带 /v1 - 使用原生 Ollama API URL
            api: "ollama", // 显式设置以保证原生工具调用行为
            timeoutSeconds: 300, // 可选：给冷启动的本地模型更多时间连接和流式输出
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // 可选：在轮次之间保持模型加载
                },
              },
            ],
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

## 常见配方

将这些作为起点，并用 `ollama list` 或 `openclaw models list --provider ollama` 中的准确名称替换模型 ID。

<AccordionGroup>
  <Accordion title="带自动发现的本地模型">
    当 Ollama 运行在与 Gateway 相同的机器上，并且您希望 OpenClaw 自动发现已安装模型时，请使用此配置。

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    此路径将配置保持在最简。除非您想手动定义模型，否则不要添加 `models.providers.ollama` 块。

  </Accordion>

  <Accordion title="带手动模型的局域网 Ollama 主机">
    对于局域网主机，请使用原生 Ollama URL。不要添加 `/v1`。

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

    `contextWindow` 是 OpenClaw 侧的上下文预算。`params.num_ctx` 会随请求发送给 Ollama。当您的硬件无法运行模型完整声明的上下文时，请保持两者一致。

  </Accordion>

  <Accordion title="仅 Ollama Cloud">
    当您不运行本地守护进程，而是想直接使用托管的 Ollama 模型时，请使用此配置。

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
    当本地或局域网中的 Ollama 守护进程已通过 `ollama signin` 登录，并且应同时提供本地模型和 `:cloud` 模型时，请使用此配置。

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
    当您有多个 Ollama 服务器时，请使用自定义提供者 ID。每个提供者都有自己的主机、模型、认证、超时和模型引用。

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

    当 OpenClaw 发送请求时，活动提供者前缀会被去除，因此 `ollama-large/qwen3.5:27b` 传给 Ollama 时会变为 `qwen3.5:27b`。

  </Accordion>

  <Accordion title="精简本地模型配置文件">
    某些本地模型可以回答简单提示，但在完整的代理工具能力上会吃力。在更改全局运行时设置之前，请先通过限制工具和上下文来开始。

    ```json5
    {
      agents: {
        defaults: {
          experimental: {
            localModelLean: true,
          },
          model: { primary: "ollama/gemma4" },
        },
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

    仅当模型或服务器在工具 schema 上稳定失败时，才使用 `compat.supportsTools: false`。这会以代理能力换取稳定性。
    `localModelLean` 会从代理能力面板中移除浏览器、cron 和消息工具，但不会改变 Ollama 的运行时上下文或思考模式。对于会循环或把响应预算花在隐藏推理上的小型 Qwen 风格思考模型，请将它与显式的 `params.num_ctx` 和 `params.thinking: false` 搭配使用。

  </Accordion>
</AccordionGroup>

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

也支持自定义 Ollama 提供者 id。当模型引用使用活动提供者前缀时，例如 `ollama-spark/qwen3:32b`，OpenClaw 在调用 Ollama 之前只会去掉该前缀，因此服务器收到的是 `qwen3:32b`。

对于较慢的本地模型，在提升整个代理运行时超时之前，优先进行按提供者范围的请求调优：

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

`timeoutSeconds` 适用于模型 HTTP 请求，包括连接建立、请求头、主体流式传输以及完整的受保护 fetch 中止。`params.keep_alive` 会在原生 `/api/chat` 请求中作为顶层 `keep_alive` 转发给 Ollama；当首次加载时间是瓶颈时，请按模型设置它。

### 快速验证

```bash
# 本机可见的 Ollama 守护进程
curl http://127.0.0.1:11434/api/tags

# OpenClaw 目录和已选模型
openclaw models list --provider ollama
openclaw models status

# 直接模型自检
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 中使用的主机。如果 `curl` 可用但 OpenClaw 不可用，请检查 Gateway 是否运行在不同的机器、容器或服务账户下。

## Ollama 网页搜索

OpenClaw 支持 **Ollama 网页搜索** 作为捆绑的 `web_search` 提供者。

| 属性    | 详情                                                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 主机        | 使用您配置的 Ollama 主机（设置了 `models.providers.ollama.baseUrl` 时使用该值，否则为 `http://127.0.0.1:11434`）；`https://ollama.com` 直接使用托管 API |
| 认证        | 已登录的本地 Ollama 主机无需密钥；直接对 `https://ollama.com` 搜索或受认证保护的主机则需要 `OLLAMA_API_KEY` 或已配置的提供者认证               |
| 要求 | 本地/自托管主机必须正在运行并通过 `ollama signin` 登录；直接托管搜索需要 `baseUrl: "https://ollama.com"` 以及真实的 Ollama API 密钥 |

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

用于通过 Ollama Cloud 进行直接托管搜索：

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

对于已登录的本地守护进程，OpenClaw 使用该守护进程的 `/api/experimental/web_search` 代理。对于 `https://ollama.com`，它直接调用托管的 `/api/web_search` 端点。

<Note>
有关完整设置和行为详情，请参阅 [Ollama 网页搜索](/tools/ollama-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="旧版 OpenAI 兼容模式">
    <Warning>
    **OpenAI 兼容模式下的工具调用不可靠。** 仅当您需要代理的 OpenAI 格式且不依赖原生工具调用行为时使用此模式。
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
    对于自动发现的模型，OpenClaw 会在可用时使用 Ollama 报告的上下文窗口，包括来自自定义 Modelfile 的更大的 `PARAMETER num_ctx` 值。否则，它会回退到 OpenClaw 使用的默认 Ollama 上下文窗口。

    您可以为该 Ollama 提供者下的每个模型设置提供者级别的 `contextWindow`、`contextTokens` 和 `maxTokens` 默认值，然后在需要时按模型覆盖它们。`contextWindow` 是 OpenClaw 的提示词和压缩预算。原生 Ollama 请求会保留 `options.num_ctx` 为未设置状态，除非您显式配置 `params.num_ctx`，这样 Ollama 就可以应用其自身的模型、`OLLAMA_CONTEXT_LENGTH` 或基于 VRAM 的默认值。若要在不重建 Modelfile 的情况下限制或强制 Ollama 的每次请求运行时上下文，请设置 `params.num_ctx`；无效、零、负数以及非有限值都会被忽略。OpenAI 兼容的 Ollama 适配器仍会默认根据已配置的 `params.num_ctx` 或 `contextWindow` 注入 `options.num_ctx`；如果您的上游拒绝 `options`，请使用 `injectNumCtxForOpenAICompat: false` 禁用此行为。

    原生 Ollama 模型条目也接受 `params` 下常见的 Ollama 运行时选项，包括 `temperature`、`top_p`、`top_k`、`min_p`、`num_predict`、`stop`、`repeat_penalty`、`num_batch`、`num_thread` 和 `use_mmap`。OpenClaw 只转发 Ollama 请求键，因此 OpenClaw 运行时参数（例如 `streaming`）不会泄露给 Ollama。使用 `params.think` 或 `params.thinking` 发送顶层 Ollama `think`；`false` 会为 Qwen 风格的思考模型禁用 API 级思考。

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

    每个模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也同样有效。如果两者都进行了配置，则显式的提供者模型条目优先于代理默认值。

  </Accordion>

  <Accordion title="思考控制">
    对于原生 Ollama 模型，OpenClaw 会按照 Ollama 的预期转发思考控制：顶层 `think`，而不是 `options.think`。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    您也可以设置模型默认值：

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

    按模型设置的 `params.think` 或 `params.thinking` 可以为特定已配置模型禁用或强制启用 Ollama API 思考。诸如 `/think off` 之类的运行时命令仍然适用于当前运行。

  </Accordion>

  <Accordion title="推理模型">
    OpenClaw 默认将名称包含 `deepseek-r1`、`reasoning` 或 `think` 的模型视为具备推理能力。

    ```bash
    ollama pull deepseek-r1:32b
    ```

    无需额外配置。OpenClaw 会自动标记它们。

  </Accordion>

  <Accordion title="模型成本">
    Ollama 是免费的且在本地运行，因此所有模型成本均设置为 $0。这适用于自动发现和手动定义的模型。
  </Accordion>

  <Accordion title="内存嵌入">
    捆绑的 Ollama 插件会为
    [内存搜索](/concepts/memory) 注册一个内存嵌入提供者。它使用已配置的 Ollama 基础 URL
    和 API 密钥，调用 Ollama 当前的 `/api/embed` 端点，并在可能时将
    多个内存块批量合并为一个 `input` 请求。

    | 属性      | 值               |
    | ------------- | ------------------- |
    | 默认模型 | `nomic-embed-text`  |
    | 自动拉取     | 是 — 如果本地不存在嵌入模型，则会自动拉取 |

    查询时嵌入会对需要或建议使用检索前缀的模型启用检索前缀，包括 `nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。内存文档批次保持原始格式，因此现有索引无需进行格式迁移。

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

    对于远程嵌入主机，请将认证范围限制在该主机上：

    ```json5
    {
      agents: {
        defaults: {
          memorySearch: {
            provider: "ollama",
            remote: {
              baseUrl: "http://gpu-box.local:11434",
              model: "nomic-embed-text",
              apiKey: "ollama-local",
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式配置">
    OpenClaw 的 Ollama 集成默认使用 **原生 Ollama API**（`/api/chat`），完全支持同时流式传输和工具调用。不需要特殊配置。

    对于原生 `/api/chat` 请求，OpenClaw 还会直接将思考控制转发给 Ollama：`/think off` 和 `openclaw agent --thinking off` 会发送顶层 `think: false`，而 `/think low|medium|high` 会发送对应的顶层 `think` 强度字符串。`/think max` 映射到 Ollama 的最高原生强度，即 `think: "high"`。

    <Tip>
    如果您需要使用 OpenAI 兼容端点，请参阅上面的“旧版 OpenAI 兼容模式”部分。在该模式下，流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排查

<AccordionGroup>
  <Accordion title="WSL2 崩溃循环（重复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 上，官方 Ollama Linux 安装程序会创建一个带有 `Restart=always` 的 `ollama.service` systemd 单元。如果该服务在 WSL2 启动时自动启动并加载 GPU 支持的模型，Ollama 可能会在模型加载期间锁定主机内存。Hyper-V 内存回收并不总是能够回收这些被锁定的页面，因此 Windows 可能会终止 WSL2 虚拟机，systemd 随后再次启动 Ollama，循环就会重复。

    常见迹象：

    - Windows 侧出现重复的 WSL2 重启或终止
    - WSL2 启动后不久 `app.slice` 或 `ollama.service` 的 CPU 占用很高
    - 来自 systemd 的 SIGTERM，而不是 Linux OOM-killer 事件

    当 OpenClaw 检测到 WSL2、已启用 `ollama.service` 且存在可见 CUDA 标记时，会记录启动警告。

    缓解方法：

    ```bash
    sudo systemctl disable ollama
    ```

    在 Windows 侧将以下内容添加到 `%USERPROFILE%\.wslconfig`，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    在 Ollama 服务环境中设置更短的 keep-alive，或者仅在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    请确保 Ollama 正在运行，并且您已设置 `OLLAMA_API_KEY`（或认证配置文件），且**没有**显式定义 `models.providers.ollama` 条目：

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

  <Accordion title="远程主机可被 curl 访问但 OpenClaw 不行">
    请在运行 Gateway 的同一台机器和运行时环境中验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 运行在 Docker 中或另一台主机上。
    - 该 URL 使用了 `/v1`，这会选择 OpenAI 兼容行为而不是原生 Ollama。
    - 远程主机需要在 Ollama 侧更改防火墙或 LAN 绑定设置。
    - 模型存在于您笔记本电脑的 daemon 中，但不在远程 daemon 中。

  </Accordion>

  <Accordion title="模型输出工具 JSON 作为文本">
    这通常意味着提供者使用的是 OpenAI 兼容模式，或者模型无法处理工具 schema。

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

  <Accordion title="冷启动本地模型超时">
    大型本地模型在开始流式传输之前可能需要很长的首次加载时间。请将超时限制在 Ollama 提供者范围内，并可选择让 Ollama 在轮次之间保持模型已加载：

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

    如果主机本身接受连接较慢，`timeoutSeconds` 也会为此提供者延长受保护的 Undici 连接超时。

  </Accordion>

  <Accordion title="大上下文模型过慢或内存不足">
    许多 Ollama 模型声明的上下文大小大于您的硬件能够舒适运行的范围。原生 Ollama 会使用其自身的运行时上下文默认值，除非您设置 `params.num_ctx`。当您希望获得可预测的首个 token 延迟时，请同时限制 OpenClaw 的预算和 Ollama 的请求上下文：

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

    如果 OpenClaw 发送的提示词过多，请先降低 `contextWindow`。如果 Ollama 加载的运行时上下文对机器来说过大，请降低 `params.num_ctx`。如果生成时间过长，请降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题解答](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="Model providers" href="/concepts/model-providers" icon="layers">
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