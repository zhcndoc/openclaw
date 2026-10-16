---
summary: "适用于 Cerebras、Kimi、llama.cpp、LM Studio、MiniMax、Moonshot、OpenCode、Synthetic 和 Z.AI 的定制提供商配置"
read_when:
  - "复制特定提供程序的工作配置"
  - "将自定义提供商 ID 指向本地 llama-server"
  - "寻找提供商的入门引导快捷方式"
title: "配置——提供者示例"
---

适用于 `models.providers` 配置。有关每个字段的含义，请参阅 [ 自定义提供程序和基本 URL](/gateway/config-tools/custom-providers)。

## <a id="provider-examples"></a> Provider 示例

<AccordionGroup>
  <Accordion title="Cerebras (GPT OSS)">
    官方外部 `cerebras` 提供商插件可以通过 `openclaw onboard --auth-choice cerebras-api-key` 进行配置。只有在覆盖默认值时才使用显式提供商配置。

    ```json5
    {
      env: { vars: { CEREBRAS_API_KEY: "sk-..." } },
      agents: {
        defaults: {
          model: {
            primary: "cerebras/gpt-oss-120b",
          },
          models: {
            "cerebras/gpt-oss-120b": { alias: "Cerebras GPT OSS 120B" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          cerebras: {
            baseUrl: "https://api.cerebras.ai/v1",
            apiKey: "${CEREBRAS_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "gpt-oss-120b", name: "GPT OSS 120B (Cerebras)" },
            ],
          },
        },
      },
    }
    ```

    将 `cerebras/gpt-oss-120b` 用于 Cerebras。对于 Z.AI 模型，请使用单独的 `zai` 提供程序。

  </Accordion>
  <Accordion id="kimi-coding" title="Kimi 编码">
    ```json5
    {
      env: { vars: { KIMI_API_KEY: "sk-..." } },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-for-coding" },
          models: { "kimi/kimi-for-coding": { alias: "Kimi Code" } },
        },
      },
    }
    ```

    Anthropic- 兼容，内置提供程序。快捷方式：`openclaw onboard --auth-choice kimi-code-api-key`。

  </Accordion>
  <Accordion id="local-models-llama-cpp-llama-server" title="本地模型（llama.cpp / llama-server）">
    内置 `llama-cpp` 提供程序在托管和现有服务器模式下应用 llama.cpp 架构清理器。如果您将 **自定义提供程序 ID** 指向远程 `llama-server`（或另一个 OpenAI- 兼容的 llama.cpp 端点），请在其聊天模板将工具参数编译为的每个模型上设置 `compat.toolSchemaProfile: "llamacpp"` GBNF。该配置文件删除了 2000 或以上的 `pattern` 和 `maxLength` 值，覆盖了 `cron` 工具的 `trigger.script` 限制 65536。它是有针对性的缓解措施，并不完全兼容每个 JSON 架构约束或 `minLength`。

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "my-llamacpp/qwen35" },
        },
      },
      models: {
        mode: "merge",
        providers: {
          "my-llamacpp": {
            baseUrl: "http://127.0.0.1:8080/v1",
            apiKey: "llamacpp-no-key",
            api: "openai-completions",
            models: [
              {
                id: "qwen35",
                name: "Qwen3.5 (llama-server)",
                contextWindow: 8192,
                maxTokens: 2048,
                compat: {
                  supportsTools: true,
                  toolSchemaProfile: "llamacpp",
                },
              },
            ],
          },
        },
      },
    }
    ```

    如需更广泛的手动替代方案，请设置 `compat.unsupportedToolSchemaKeywords: ["pattern", "patternProperties", "format", "propertyNames", "uniqueItems", "contains", "minContains", "maxContains", "minLength", "maxLength"]`。与配置文件不同，这会无条件删除每个列出的关键字。

  </Accordion>
  <Accordion id="local-models-lm-studio" title="本地模型（LM Studio）">
    See [Local Models](/gateway/local-models). TL；DR：在严格的硬件上通过 LM Studio 响应 API 运行大型本地模型；保持托管模型合并以供后备。
  </Accordion>
  <Accordion id="minimax-m3-direct" title="MiniMax M3（直接）">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "Minimax" },
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
                contextWindow: 1000000,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    设置 `MINIMAX_API_KEY`。快捷方式：`openclaw onboard --auth-choice minimax-global-api` 或 `openclaw onboard --auth-choice minimax-cn-api`。模型目录默认为 M3，还包括 M2.7 变体。在Anthropic-兼容的流路径上，OpenClaw默认禁用MiniMax M2.x思考，除非你自己显式设置`thinking`；默认情况下，MiniMax-M3（和M3.x）保留在提供商的omitted/adaptive思维路径上。 `/fast on` 或 `params.fastMode: true` 将 `MiniMax-M2.7` 重写为 `MiniMax-M2.7-highspeed`。

  </Accordion>
  <Accordion title="Moonshot AI (Kimi)">
    ```json5
    {
      env: { vars: { MOONSHOT_API_KEY: "sk-..." } },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: { "moonshot/kimi-k2.6": { alias: "Kimi K2.6" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
            ],
          },
        },
      },
    }
    ```

    中国区端点使用：`baseUrl: "https://api.moonshot.cn/v1"`，或使用 `openclaw onboard --auth-choice moonshot-api-key-cn`。

    本机 Moonshot 端点在共享 `openai-completions` 传输上通告流使用兼容性，并且 OpenClaw 密钥关闭端点功能，而不是单独的内置提供商 ID。

  </Accordion>
  <Accordion title="OpenCode">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "opencode/claude-opus-4-6" },
          models: { "opencode/claude-opus-4-6": { alias: "Opus" } },
        },
      },
    }
    ```

    设置 `OPENCODE_API_KEY`（或 `OPENCODE_ZEN_API_KEY`）。Zen 目录使用 `opencode/...` 引用，Go 目录使用 `opencode-go/...` 引用。快捷方式：`openclaw onboard --auth-choice opencode-zen` 或 `openclaw onboard --auth-choice opencode-go`。

  </Accordion>
  <Accordion id="synthetic-anthropic-compatible" title="Synthetic （Anthropic-兼容的）">
    ```json5
    {
      env: { vars: { SYNTHETIC_API_KEY: "sk-..." } },
      agents: {
        defaults: {
          model: { primary: "synthetic/hf:MiniMaxAI/MiniMax-M3" },
          models: { "synthetic/hf:MiniMaxAI/MiniMax-M3": { alias: "MiniMax M3" } },
        },
      },
      models: {
        mode: "merge",
        providers: {
          synthetic: {
            baseUrl: "https://api.synthetic.new/anthropic",
            apiKey: "${SYNTHETIC_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "hf:MiniMaxAI/MiniMax-M3",
                name: "MiniMax M3",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 65536,
              },
            ],
          },
        },
      },
    }
    ```

    基础 URL 应省略 `/v1`（Anthropic 客户端会自动追加）。快捷方式：`openclaw onboard --auth-choice synthetic-api-key`。

  </Accordion>
  <Accordion title="Z.AI (GLM-4.7)">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-4.7" },
          models: { "zai/glm-4.7": {} },
        },
      },
    }
    ```

    设置 `ZAI_API_KEY`。模型参考使用标准 `zai/*` 提供程序 ID。快捷方式：`openclaw onboard --auth-choice zai-api-key`。

    - 通用端点：`https://api.z.ai/api/paas/v4`
    - 编程端点：`https://api.z.ai/api/coding/paas/v4`
    - 默认的 `zai-api-key` 身份验证选择会检查您的密钥并自动检测它属于哪个端点（如果检测不确定，则返回到提示，默认为全局）。专用的 CN 和编码计划身份验证选项也可用于显式选择。
    - 对于通用端点，请定义一个带有基础 URL 覆盖的自定义提供商。

  </Accordion>
</AccordionGroup>
