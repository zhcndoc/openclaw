---
summary: "可复制的 Ollama 配置配方、模型选择和快速验证"
read_when:
  - "您需要本地、LAN、云或混合设置的工作配置"
  - "您正在选择模型或端到端验证 Ollama 设置"
title: "Ollama 配置配方"
sidebarTitle: "食谱"
---

## <a id="common-recipes"></a> 常见配方

将模型 ID 替换为 `ollama list` 或 `openclaw models list --provider ollama` 中的确切名称。

<AccordionGroup>
  <Accordion id="local-model-with-auto-discovery" title="具有自动发现功能的本地模型">
    与 Gateway 运行在同一台机器上的 Ollama，会自动发现：

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    保留 `models.providers.ollama` 未设置以使用默认本地端点，或配置自托管端点；两者都保持发现资格。

  </Accordion>

  <Accordion id="lan-ollama-host-with-manual-models" title="LAN Ollama 主机配手动模型">
    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                contextTokens: 32768,
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

    `contextTokens` 限制了 OpenClaw 的有源输入预算； `params.num_ctx` 设置 Ollama 的请求上下文。当硬件无法运行模型的完整广告上下文时，请保持它们一致。

  </Accordion>

  <Accordion id="ollama-cloud-only" title="仅限 Ollama Cloud">
    无本地守护进程，直接通过专用 `ollama-cloud` 提供商托管模型：

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "ollama-cloud/kimi-k3" },
        },
      },
    }
    ```

    或者运行 `openclaw onboard --auth-choice ollama-cloud` 将密钥保存为 `ollama-cloud` 凭证。参见 [Ollama Cloud](/providers/ollama-cloud)。

  </Accordion>

  <Accordion id="cloud-plus-local-through-a-signed-in-daemon" title="通过登录守护程序实现云加本地">
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
              { id: "kimi-k2.6:cloud", name: "kimi-k2.6:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.6:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="multiple-ollama-hosts" title="多台 Ollama 主机">
    运行多个 Ollama 服务器时的自定义提供商 ID；每个都有自己的主机、模型、身份验证和超时。

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"], contextTokens: 32768 },
            ],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            maxTokens: 16384,
            models: [
              { id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"], contextTokens: 131072 },
            ],
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

    OpenClaw 在调用 Ollama 之前会去掉当前生效的 provider 前缀（若没有则回退为裸 `ollama/` 前缀），因此 `ollama-large/qwen3.5:27b` 传给 Ollama 时会变成 `qwen3.5:27b`。

  </Accordion>

  <Accordion id="small-local-model-profile" title="小局部模型简介">
    当 `tools.toolSearch` 未设置时，本地 Ollama 模型自动使用结构化 [Tool Search](/tools/tool-search)。这使得可选功能可用，同时仅在需要时加载其架构。安装程序未启用精益模式。应用程序、交互式 CLI 和非交互式设置使用 32,768 个令牌运行时上下文，或者模型的本机窗口（如果较小）。单独保留广告的原生窗口；已知的云路由保留其托管上下文。大文件读取使用 OpenClaw 的基于上下文的分页。本机适配器保留这些文本页面及其后续指令；结构化后备数据是单独界定的。将任何显式上下文覆盖绑定到主机可以支持的内容：

    ```json5
    {
      agents: {
        entries: {
          local: {
            model: { primary: "ollama/gemma4" },
          },
        },
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                contextTokens: 32768,
                params: { num_ctx: 32768 },
              },
            ],
          },
        },
      },
    }
    ```

    显式 `tools.toolSearch` 设置优先，包括 `false`。工具搜索不会改变Ollama的背景或思维模式。 Ollama 思维默认关闭；明确的思维环境可以独立改变这一点。如果您之前启用了 `localModelLean`，请将其设置为 `false` 以恢复可选工具，同时保留自动工具搜索。

    仅当模型或服务器在工具模式上可靠地失败时才使用 `compat.supportsTools: false`；它完全禁用工具的使用。对于有意缩小代理范围的代理，首选 `tools.profile` 或每个代理工具策略。

  </Accordion>
</AccordionGroup>

### <a id="model-selection"></a> 模型选择

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

自定义提供商 ID 的工作方式相同：对于使用活动提供商前缀（例如 `ollama-spark/qwen3:32b`）的引用，OpenClaw 在调用 Ollama 之前删除该前缀，发送 `qwen3:32b`。

对于较慢的本地模型，在提升整个 agent 运行时超时之前，优先进行 provider 级别的调优：

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

`timeoutSeconds` 覆盖模型的 HTTP 请求：连接建立、headers、 body 流式传输以及整个受保护的 fetch 中止。`params.keep_alive` 会作为顶层 `keep_alive` 在原生 `/api/chat` 请求中转发；当首次加载时间是瓶颈时，请按模型设置它。

### <a id="quick-verification"></a> 快速验证

```bash
# Ollama daemon visible to this machine
curl http://127.0.0.1:11434/api/tags

# OpenClaw catalog and selected model
openclaw models list --provider ollama
openclaw models status

# Direct model smoke
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 主机。如果 `curl` 可以工作但 OpenClaw 不行，请检查 Gateway 是否运行在不同的机器、容器或服务账号下。
