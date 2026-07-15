---
summary: "在本地 LLM 上运行 OpenClaw（LM Studio、vLLM、LiteLLM、自定义 OpenAI 端点）"
read_when:
  - 你想从自己的 GPU 机器提供模型服务
  - 你正在对接 LM Studio 或 OpenAI 兼容代理
  - 你需要最安全的本地模型指南
title: "本地模型"
---

本地模型可以运行，但它们对硬件、上下文长度和提示注入防御提出了更高要求：小型模型或经过激进量化的模型会截断上下文，并跳过提供方侧的安全过滤。本页介绍更高端的本地栈和自定义的 OpenAI 兼容服务器。若想以最少的摩擦开始，请先使用 [LM Studio](/providers/lmstudio) 或 [Ollama](/providers/ollama) 和 `openclaw onboard`。

对于那些应仅在选定模型需要时才启动的本地服务器，请参阅 [本地模型服务](/gateway/local-model-services)。

## 硬件门槛

建议配备**2 台以上满配的 Mac Studio**或同等规格的 GPU 设备（约 **3 万美元以上**），以便获得更舒适的 agent 循环体验。单块 **24 GB** GPU 只能以更高延迟处理较轻量的提示。始终运行你能够承载的**最大 / 全尺寸变体**——较小或高度量化的检查点会提高提示注入风险（见 [安全](/gateway/security)）。

## 选择后端

| 后端                                                 | 适用场景                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| [ds4](/providers/ds4)                                | 在 macOS Metal 上本地运行 DeepSeek V4 Flash，并支持 OpenAI 兼容的工具调用   |
| [LM Studio](/providers/lmstudio)                     | 首次本地搭建、GUI 加载器、原生 Responses API                                |
| LiteLLM / OAI-proxy / 自定义 OpenAI 兼容代理         | 你在另一套模型 API 前面加了一层，并需要 OpenClaw 将其视为 OpenAI            |
| MLX / vLLM / SGLang                                  | 高吞吐量自托管服务，提供 OpenAI 兼容的 HTTP 端点                            |
| [Ollama](/providers/ollama)                          | CLI 工作流、模型库、免管理的 systemd 服务                                   |

当后端支持 `api: "openai-responses"` 时，请使用它（LM Studio 支持）。否则使用 `api: "openai-completions"`。如果自定义 provider 配置了 `baseUrl` 但省略了 `api`，OpenClaw 默认使用 `openai-completions`。

<Warning>
**WSL2 + Ollama + NVIDIA/CUDA：** 官方的 Ollama Linux 安装程序会启用一个带有 `Restart=always` 的 systemd 服务。在 WSL2 GPU 环境下，自动启动可能会在开机时重新加载上一个模型并锁定主机内存，从而导致 VM 反复重启。请参见 [WSL2 crash loop](/providers/ollama#troubleshooting)。
</Warning>

## LM Studio + 大型本地模型（Responses API）

这是当前最好的本地技术栈。在 LM Studio 中加载一个大型模型（完整尺寸的 Qwen、DeepSeek 或 Llama 构建版本），启用本地服务器（默认 `http://127.0.0.1:1234`），并使用 Responses API 将推理与最终文本分离。

```json5
{
  agents: {
    defaults: {
      model: { primary: "lmstudio/my-local-model" },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "lmstudio/my-local-model": { alias: "本地" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

设置清单：

- 安装 LM Studio: [https://lmstudio.ai](https://lmstudio.ai)
- 下载**可用的最大模型构建版本**（避免 “small”/高度量化变体），启动服务器，确认 `http://127.0.0.1:1234/v1/models` 列出了该模型。
- 将 `my-local-model` 替换为 LM Studio 中显示的实际模型 ID。
- 保持模型处于加载状态；冷启动会增加启动延迟。
- 如果你的 LM Studio 构建版本不同，请调整 `contextWindow`/`maxTokens`。
- 对于 WhatsApp，请坚持使用 Responses API，这样只会发送最终文本。
- 保持 `models.mode: "merge"`，这样托管模型仍可作为回退方案使用。

### 混合配置：托管主模型，本地回退

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-sonnet-4-6",
        fallbacks: ["lmstudio/my-local-model", "anthropic/claude-opus-4-6"],
      },
      models: {
        "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
        "lmstudio/my-local-model": { alias: "本地" },
        "anthropic/claude-opus-4-6": { alias: "Opus" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      lmstudio: {
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lmstudio",
        api: "openai-responses",
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 196608,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

如果要优先本地并带有托管安全网，请交换 `primary`/`fallbacks` 的顺序，并保持相同的 `providers` 块以及 `models.mode: "merge"`。

### 区域托管 / 数据路由

OpenRouter 上也提供托管的 MiniMax/Kimi/GLM 变体，并带有按区域固定的端点（例如，美国托管）。选择区域变体可以让流量留在你指定的司法辖区内，同时保留 `models.mode: "merge"` 以便使用 Anthropic/OpenAI 回退。仅本地仍然是最强的隐私方案；当你需要提供商功能但又想控制数据流向时，托管区域路由是中间方案。

## 其他 OpenAI 兼容的本地代理

MLX (`mlx_lm.server`)、vLLM、SGLang、LiteLLM、OAI-proxy，或任何自定义网关，只要暴露了 OpenAI 风格的 `/v1/chat/completions` 端点都可以使用。除非后端明确文档说明支持 `/v1/responses`，否则请使用 `openai-completions`。

```json5
{
  agents: {
    defaults: {
      model: { primary: "local/my-local-model" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      local: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "sk-local",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "my-local-model",
            name: "本地模型",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 120000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

自定义/本地提供方条目会信任其精确配置的 `baseUrl` 源用于受保护的模型请求，包括回环地址、局域网、tailnet 和私有 DNS 主机。元数据/链路本地来源始终会被阻止，不管怎样都是如此。对其他私有来源的请求仍然需要 `models.providers.<id>.request.allowPrivateNetwork: true`；将信任标志设为 `false` 可选择不启用精确来源信任。

`models.providers.<id>.models[].id` 是提供方本地的——不要包含提供方前缀。对于使用 `mlx_lm.server --model mlx-community/Qwen3-30B-A3B-6bit` 启动的 MLX 服务器：

- `models.providers.mlx.models[].id: "mlx-community/Qwen3-30B-A3B-6bit"`
- `agents.defaults.model.primary: "mlx/mlx-community/Qwen3-30B-A3B-6bit"`

在本地或代理的视觉模型上设置 `input: ["text", "image"]`，这样图像附件就会注入到代理轮次中。交互式自定义提供方引导会推断常见视觉模型 ID，并且只询问未知名称；非交互式引导会使用相同的推断，并通过 `--custom-image-input` / `--custom-text-input` 来覆盖它。

对于较慢的本地/远程模型服务器，在提高 `agents.defaults.timeoutSeconds` 之前，先使用 `models.providers.<id>.timeoutSeconds`。提供方超时仅覆盖模型 HTTP 请求的连接、响应头、正文流式传输，以及总的受保护抓取中止——如果代理/运行超时更低，也需要一并提高，因为提供方超时不能延长整个运行时间。

<Note>
对于自定义 OpenAI 兼容提供方，当 `baseUrl` 解析到回环地址、私有局域网、`.local` 或裸主机名时，允许使用像 `apiKey: "ollama-local"` 这样的非密钥本地标记——OpenClaw 会将其视为有效的本地凭据，而不是报告缺少密钥。对于任何接受公共主机名的提供方，请使用真实值。
</Note>

本地/代理 `/v1` 后端的行为说明：

- OpenClaw 将这些视为代理式 OpenAI 兼容路由，而不是原生 OpenAI 端点。
- 仅适用于原生 OpenAI 的请求塑形不适用：没有 `service_tier`，没有 Responses 的 `store`，没有 OpenAI reasoning 兼容有效载荷塑形，没有提示缓存提示。
- 不会在自定义代理 URL 上注入隐藏的 OpenClaw 归因头（`originator`、`version`、`User-Agent`）。

更严格的 OpenAI 兼容后端的兼容性覆盖：

- **仅字符串内容**：某些服务器只接受字符串形式的 `messages[].content`，不接受结构化的 content-part 数组。请设置 `models.providers.<provider>.models[].compat.requiresStringContent: true`。
- **严格消息键**：如果服务器拒绝除 `role`/`content` 之外包含更多字段的消息条目，请设置 `compat.strictMessageKeys: true`。
- **方括号工具文本**：某些本地模型会输出独立的方括号工具请求文本，例如 `[tool_name]`，后跟 JSON 和 `[END_TOOL_REQUEST]`。只有当名称与该轮已注册工具完全匹配时，OpenClaw 才会将其提升为真正的工具调用；否则它会保持为隐藏的、不受支持的文本。
- **非结构化的工具调用样式文本**：如果模型输出看起来像工具调用的 JSON/XML/ReAct 风格文本，但并不是结构化调用，OpenClaw 会将其保留为文本，并在可用时记录一条警告，包含运行 ID、提供方/模型、检测到的模式和工具名。这是提供方/模型不兼容，而不是一次完成的工具运行。
- **强制使用工具**：如果工具以助手文本的形式出现（原始 JSON/XML/ReAct，或空的 `tool_calls` 数组），请先确认服务器的 chat template/parser 支持工具调用。如果解析器只有在强制使用工具时才正常工作，可按模型覆盖默认代理值 `tool_choice: "auto"`：

  ```json5
  {
    agents: {
      defaults: {
        models: {
          "local/my-local-model": {
            params: {
              extra_body: {
                tool_choice: "required",
              },
            },
          },
        },
      },
    },
  }
  ```

  仅在每个正常轮次都应该调用工具的场景下使用。将 `local/my-local-model` 替换为 `openclaw models list` 中的精确引用，或者通过 CLI 设置：

  ```bash
  openclaw config set agents.defaults.models '{"local/my-local-model":{"params":{"extra_body":{"tool_choice":"required"}}}}' --strict-json --merge
  ```

- **额外的 reasoning 努力级别**：如果自定义 OpenAI 兼容模型支持超出内置配置文件的 OpenAI reasoning efforts，请在模型的兼容块中声明它们。添加 `"xhigh"` 会使该模型引用在 `/think xhigh`、会话选择器、Gateway 验证和 `llm-task` 验证中可见：

  ```json5
  {
    models: {
      providers: {
        local: {
          baseUrl: "http://127.0.0.1:8000/v1",
          apiKey: "sk-local",
          api: "openai-responses",
          models: [
            {
              id: "gpt-5.4",
              name: "通过本地代理的 GPT 5.4",
              reasoning: true,
              input: ["text"],
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
              contextWindow: 196608,
              maxTokens: 8192,
              compat: {
                supportedReasoningEfforts: ["low", "medium", "high", "xhigh"],
                reasoningEffortMap: { xhigh: "xhigh" },
              },
            },
          ],
        },
      },
    },
  }
  ```

## 更小或更严格的后端

如果模型能正常加载，但完整的 agent 轮次表现异常，请自上而下排查：先确认传输层，然后缩小范围。

1. **确认本地模型有响应** - 不使用工具，也不带 agent 上下文：

   ```bash
   openclaw infer model run --local --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

2. **确认 Gateway 路由** - 只发送提示词，跳过 transcript、AGENTS 引导、context-engine 组装、工具以及捆绑的 MCP servers，但仍会测试 Gateway 路由、认证和 provider 选择：

   ```bash
   openclaw infer model run --gateway --model <provider/model> --prompt "Reply with exactly: pong" --json
   ```

3. **如果前两项都通过，但真实的 agent 轮次因工具调用格式错误或提示词过大而失败，请尝试精简模式**：将 `agents.defaults.experimental.localModelLean: true`。它会移除重量级的浏览器、cron、消息、媒体生成、语音和 PDF 工具，除非显式需要；同时会在保持 `exec` 直接可见的前提下，通过结构化的 Tool Search 控制来默认收起更大的工具目录。详见 [Experimental Features -> Local model lean mode](/concepts/experimental-features#local-model-lean-mode)，以及如何确认它已开启。

4. **作为最后手段，完全禁用工具**：为该模型设置 `models.providers.<provider>.models[].compat.supportsTools: false`，这样 agent 就不会再进行工具调用。

5. **再往后，瓶颈就在上游了。** 如果在 lean mode 和 `supportsTools: false` 之后，后端仍然只在更大的 OpenClaw 运行中失败，那么剩下的问题通常是模型或服务器本身——上下文窗口、GPU 内存、kv-cache 驱逐，或者后端 bug——而不是 OpenClaw 的传输层。

## 故障排查

- **网关无法连接到代理？** `curl http://127.0.0.1:1234/v1/models`.
- **LM Studio 模型已卸载？** 重新加载；冷启动是常见的“卡住”原因。
- **本地服务器显示 `terminated`、`ECONNRESET`，或在对话中途关闭流？** OpenClaw 会在诊断信息中记录低基数的 `model.call.error.failureKind`，以及 OpenClaw 进程的 RSS/heap 快照。对于 LM Studio/Ollama 的内存压力，请将该时间戳与服务器日志或 macOS 崩溃/jetsam 日志进行匹配，以确认模型服务器是否被杀死。
- **上下文错误？** OpenClaw 会根据检测到的模型窗口（或在 `agents.defaults.contextTokens` 降低它时的上限窗口）推导上下文窗口预检阈值：低于 20% 时警告，并设有 **8k** 下限；低于 10% 时硬阻断，并设有 **4k** 下限（会按有效上下文窗口进行封顶，因此过大的模型元数据不会拒绝有效的用户上限）。降低 `contextWindow` 或提高服务器/模型的上下文限制。
- **`messages[].content ... expected a string`？** 在该模型条目上添加 `compat.requiresStringContent: true`。
- **`validation.keys`，或“message entries only allow `role` and `content`”？** 在该模型条目上添加 `compat.strictMessageKeys: true`。
- **直接调用 `/v1/chat/completions` 可用，但 `openclaw infer model run --local` 在 Gemma 或其他本地模型上失败？** 首先检查 provider URL、model ref、auth 标记和服务器日志——`model run` 会完全跳过 agent tools。如果 `model run` 成功但更大的 agent turn 失败，请通过 `localModelLean` 或 `compat.supportsTools: false` 减少工具面。
- **工具调用显示为原始 JSON/XML/ReAct 文本，或者 provider 返回空的 `tool_calls` 数组？** 不要添加一个会盲目把 assistant 文本转换为工具执行的代理——先修复服务器的 chat template/parser。如果模型只有在强制使用工具时才可用，请在上方添加 `params.extra_body.tool_choice: "required"` 覆盖，并且只将该模型条目用于每一轮都预期会发生工具调用的会话。
- **安全性**：本地模型会跳过 provider 侧过滤。保持 agent 范围窄并开启 compaction，以限制 prompt injection 的影响范围。

## 相关

- [配置参考](/gateway/configuration-reference)
- [模型故障转移](/concepts/model-failover)
