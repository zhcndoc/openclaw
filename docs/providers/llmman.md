---
summary: "使用 llmman 运行 OpenClaw（本地模型、托管提供程序以及混合本地 + 托管路由）"
read_when:
  - "您想要通过 llmman 针对本地 GGUF 或 safetensors 模型运行 OpenClaw"
  - "您需要混合推理，将小请求保留在本地并将大请求溢出到托管模型"
  - "您需要 llmman 设置、配置、愿景或故障排除指南"
title: "llmman"
---

[llmman](https://github.com/llmmanorg/llmman) 从任何注册表或 Hugging Face 中提取模型作为 OCI 工件，并通过未经修改的上游引擎为它们提供服务：`llama-server` 用于 GGUF、`vllm` 或 `mlx-lm` 用于安全张量。一个守护程序公开 Ollama-、OpenAI- 和 Anthropic- 兼容 API，并且还可以将请求转发给托管提供程序。 OpenClaw 通过 `/v1` 上的通用 `openai-completions` 适配器与其进行通信。

支持三种模式：

| 模式              | 使用内容                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| 仅本地        | 网关主机上的 `llmman serve` 或 LAN，为 `qwen3.8` 等拉取模型提供服务                               |
| 杂交种            | 一件 `llmman.hybrid/<local>,<provider>/<model>` 参考； llmman 根据请求选择本地或托管端            |
| 通过 llmman 托管 | `llmman.provider/<provider>/<model>` 参考文献； llmman 转发到托管提供商，同时保留一个本地端点 |

| 属性         | 值                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| 提供方 id      | `llmman`（自定义；在`models.providers.llmman`下配置）                             |
| 插件           | 没有任何；不是捆绑的 OpenClaw 提供程序插件，因此明确列出了模型            |
| API              | OpenAI-兼容（`api: "openai-completions"`）                                          |
| 默认基础 URL | `http://127.0.0.1:17434/v1`                                                              |
| 认证             | llmman无认证； OpenClaw 发送您配置为承载的任何 `apiKey` |
| 参考模型  | `qwen3.8`（Qwen3.8 27B，具有视觉能力，262,144 个令牌本机上下文）                    |

<Warning>
`llmman serve`没有认证，也没有TLS。保留默认环回绑定，除非受信任的网络边界限制访问，并且切勿将其暴露在公共接口上。
</Warning>

<Info>
版本范围：此页面已根据 [llmman v0.1.334](https://github.com/llmmanorg/llmman/releases/tag/v0.1.334) 进行验证，提交 [`22b6d73`](https://github.com/llmmanorg/llmman/commit/22b6d7330e1b0882401e83e35fe592817eb7c816)。此页面上的模型名称、混合路由、视觉和工具调用是针对使用 `qwen3.8` 的构建进行的。
</Info>

## <a id="auth-rules"></a> 认证规则

<AccordionGroup>
  <Accordion id="local-llmman-has-no-auth" title="本地llmman无权限">
    `llmman serve` 从不检查凭据。 OpenClaw 仍需要提供程序条目上的非空 `apiKey`，以便提供程序按配置计数。本页面使用 `LLMMAN_API_KEY=llmman-local` 和 `apiKey: "${LLMMAN_API_KEY}"`，镜像 `OLLAMA_API_KEY=ollama-local` 约定。字面值 `apiKey: "llmman-local"` 也可以。
  </Accordion>
  <Accordion id="the-bearer-matters-for-hybrid-and-hosted-refs" title="承载者对于混合裁判和托管裁判很重要">
    对于 `llmman.hybrid/...` 和 `llmman.provider/...` 引用，llmman 将承载 OpenClaw 转发给托管提供商作为该提供商的 API 密钥。一个例外是文字占位符 `llmman`，它告诉守护程序使用自己的密钥。有关这两种模式，请参阅 [Hybrid 推理 ](#hybrid-inference)。诸如 `llmman-local` 之类的标记将被发送到托管提供商并在那里被拒绝。
  </Accordion>
  <Accordion id="remote-llmman-hosts" title="远程 llmman 主机">
    在其环境中以 `LLMMAN_HOST=0.0.0.0` 启动的守护进程会在没有身份验证的情况下绑定每个接口。仅将 OpenClaw 指向您信任的网络内的 LAN 主机；没有 OpenClaw 可以发送且 llmman 强制执行的凭证。脱离环回可达的守护进程也拒绝为不提供任何内容的调用者使用自己的托管提供程序密钥。
  </Accordion>
  <Accordion id="env-var-substitution" title="环境变量替换">
    `${LLMMAN_API_KEY}` 从网关进程环境或 `~/.openclaw/.env` 解析。如果变量丢失，OpenClaw 会记录配置警告并将提供程序视为不可用，因此将导出放在网关可以读取的位置。请参阅 [ 环境 ](/help/environment)。
  </Accordion>
</AccordionGroup>

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-llmman" title="安装llmman">
    ```bash
    curl -fsSL https://llmmanorg.github.io/install.sh | sh   # Linux, macOS
    brew install llmmanorg/tap/llmman                         # Homebrew
    ```

    Windows：`irm https://llmmanorg.github.io/install.ps1 | iex` 或 `winget install llmmanorg.llmman`。其他选项：`cargo binstall llmman`。

  </Step>
  <Step id="pull-a-model-and-start-the-server" title="拉取模型并启动服务器">
    ```bash
    llmman pull qwen3.8
    llmman serve
    ```

    诸如 `qwen3.8` 之类的裸名称解析为 Docker Hub 策划的 `docker.io/ai/<name>:latest`。 `owner/repo` 名称解析为 `hf.co/owner/repo`；完整参考（`ghcr.io/...`、`hf.co/...`）按原样使用。

    `llmman serve` 不需要任何参数（可选的模型参数预加载该模型）：它侦听 `127.0.0.1:17434` 并在第一个命名它的请求上加载任何拉取的模型，然后在五分钟空闲分钟后卸载它。自动检测 GPU 加速（CUDA、ROCm、Vulkan、Metal），如果 `PATH` 上没有，则下载匹配的 `llama-server`。其他一切都通过守护进程的环境进行调整：`LLMMAN_HOST` 用于绑定地址，`LLMMAN_CONTEXT_LENGTH` 用于服务器上下文，`LLMMAN_KEEP_ALIVE` 用于空闲卸载计时器（请参阅 [ 高级配置](#advanced-configuration)）。

    默认情况下，llmman 使用最多 262,144 个令牌，上限为模型的训练上下文（`qwen3.8` 为 262,144 个），并且在内存不足时，重试时上下文减半至 16,384 个下限。 `llmman ps` 显示加载模型实际获得的上下文；将 OpenClaw 模型的 `contextWindow` 保持在该值或以下。

  </Step>
  <Step id="verify-the-server" title="验证服务器">
    ```bash
    curl http://127.0.0.1:17434/api/version
    curl http://127.0.0.1:17434/v1/models
    llmman ps
    ```

    没有`/health`路由；使用 `/api/version` 或 `/v1/models` 作为准备情况检查。 `/v1/models` 列出完全限定的 ID，例如 `docker.io/ai/qwen3.8:latest`；请求可以使用该形式或简称。

  </Step>
  <Step id="set-the-marker-credential" title="设置标记凭证">
    添加到 `~/.openclaw/.env` （或在网关的 shell 中导出）：

    ```bash
    LLMMAN_API_KEY=llmman-local
    ```

  </Step>
  <Step id="add-the-provider-and-select-the-model" title="添加提供商并选择模型">
    添加以下配置，然后：

    ```bash
    openclaw models list --provider llmman
    openclaw models set llmman/qwen3.8
    ```

  </Step>
</Steps>

<Note>
`llmman launch openclaw --model qwen3.8` 可以通过针对 llmman 端点运行非交互式载入来引导首次运行的 OpenClaw 安装。仅当 `openclaw.json` 尚不存在时适用；对于现有安装，请使用此页面上的显式配置。
</Note>

## <a id="full-config-example"></a> 完整配置示例

本地 llmman 服务器上的 Qwen3.8：

```json5
{
  agents: {
    defaults: {
      model: { primary: "llmman/qwen3.8" },
      models: {
        "llmman/qwen3.8": { alias: "Qwen3.8 (llmman)" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "qwen3.8",
            name: "Qwen3.8 (llmman)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 65536,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

`models.mode: "merge"` 使托管提供商保持可用作为后备。 `timeoutSeconds` 在模型请求超时触发之前提供冷模型加载和长代空间。

## <a id="model-discovery"></a> 模型发现

llmman 不是捆绑的 OpenClaw 插件，因此不存在隐式发现。在 `models.providers.llmman.models` 下列出您想要的每个模型，并带有提供商本地 `id`（无 `llmman/` 前缀）。

| 行为     | 详情                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 模型 id    | 短 （`qwen3.8`、`qwen3.5:9b`）、Hugging Face （`unsloth/Qwen3.5-0.8B-GGUF`） 或完全合格 （`docker.io/ai/qwen3.8:latest`） 全部工作                                 |
| 默认标签  | `:latest` 省略时                                                                                                                                                   |
| 功能 | 当存在配套 `mmproj` 投影仪时，`llmman show <model>` 和 `POST /api/show` 报告 `completion` 和 `vision`；标记此类模型为`input: ["text", "image"]` |
| 推理    | 为Qwen3.8等思维模型设置`reasoning: true`； llmman 返回思维为 `reasoning_content`                                                                |
| 上下文      | `llmman show <model>` 打印训练好的上下文长度； `llmman ps` 打印正在运行的服务器启动时使用的上下文                                              |
| 成本        | 全部`0`；混合参考的托管部分由该提供商计费，而不是由 OpenClaw 跟踪                                                                             |

```bash
llmman list
llmman show qwen3.8
openclaw models list --provider llmman
```

要添加模型，请将其拉​​出并添加匹配的条目：

```bash
llmman pull qwen3.5:9b
```

### <a id="smoke-tests"></a> 冒烟测试

跳过完整代理工具表面的窄文本检查：

```bash
LLMMAN_API_KEY=llmman-local \
  openclaw infer model run \
    --local \
    --model llmman/qwen3.8 \
    --prompt "Reply with exactly: pong" \
    --json
```

添加带有图像的 `--file` 以进行精益视觉模型检查（PNG/JPEG/WebP；在调用 llmman 之前拒绝非图像文件；使用 `openclaw infer audio transcribe` 进行音频）：

```bash
LLMMAN_API_KEY=llmman-local \
  openclaw infer model run \
    --local \
    --model llmman/gemma4:e4b \
    --prompt "Describe this image in one sentence." \
    --file ./photo.jpg \
    --json
```

这两条路径都不会加载聊天工具、内存或会话上下文。如果检查成功而正常代理回复失败，则问题通常是后端的工具架构处理或上下文压力，而不是端点；请参阅 [ 故障排除 ](#troubleshooting)。

真正的测试是通过工具调用进行完整的代理轮换：

```bash
openclaw agent --local --session-id llmman-smoke \
  --message "Read the file ./README.md with a tool and summarize it in one sentence."
```

## <a id="hybrid-inference"></a> H混合推理

llmman 可以将本地模型与单个模型名称下的托管模型配对，并根据请求选择一侧。 OpenClaw 将该对配置为普通模型 ID 一次，并通过托管溢出获得本地优先推理，无需代理级回退开关。

参考号为 `llmman.hybrid/<local>,<provider>/<model>`。以 `qwen3.8` 作为本地一半，OpenAI 的 `gpt-5.6-luna` 作为托管一半：

```text
llmman.hybrid/qwen3.8,openai/gpt-5.6-luna
```

哪一方服务请求：

1. **`x-llmman-route: local` 或 `cloud`** 请求标头获胜。任何其他值都是 `400`。
2. **否则，size.** 大于本地上下文可以容纳的请求正文将转到托管模型。预算为 `LLMMAN_CONTEXT_LENGTH` 每个代币 4 个字节； `LLMMAN_HYBRID_LOCAL_BYTES` 直接设置它，`0` 禁用大小规则。
3. **否则，本地。**

如果保留在本地的请求 llmman 随后因大于其上下文而被本地后端拒绝，则 llmman 会在任何内容到达 OpenClaw 之前将其重新发送到托管部分。 `local` 引脚永远不会以这种方式被覆盖。每个路由请求都会记录其侧面和原因。原始完成响应可能报告后端模型或 GGUF 路径； OpenClaw 的结果包络保留配置的线对参考。

### <a id="hosted-provider-key"></a> 托管提供商密钥

托管半部分像任何 llmman `--provider` 请求一样进行身份验证。选择一项：

<Tabs>
  <Tab id="openclaw-presents-the-key-recommended" title="OpenClaw 呈现密钥（推荐）">
    将 llmman 提供商的 `apiKey` 设置为托管提供商的密钥。 llmman 根据请求转发它，并且从不保留它。同一提供程序条目上的仅限本地模型会忽略该值。

    ```bash
    # ~/.openclaw/.env
    LLMMAN_API_KEY=sk-...   # your OpenAI API key
    ```

    将 `apiKey: "${LLMMAN_API_KEY}"` 保留在下面的配置中。

  </Tab>
  <Tab id="llmman-holds-the-key" title="llmman 持有钥匙">
    为守护进程提供自己的密钥，并让 OpenClaw 发送文字占位符 `llmman`：

    ```bash
    llmman config set providers.openai.api_key sk-...
    llmman serve
    ```

    守护进程环境中的 `OPENAI_API_KEY` 也可以工作并覆盖配置文件。

    ```bash
    # ~/.openclaw/.env
    LLMMAN_API_KEY=llmman
    ```

    占位符必须正好是`llmman`；任何其他承载都被视为真正的密钥并转发给托管提供商。 llmman 仅将自己的密钥用于环回调用者，因此此模式要求守护程序和网关位于同一主机上。

  </Tab>
</Tabs>

### <a id="hybrid-config"></a> H混合配置

```json5
{
  agents: {
    defaults: {
      model: { primary: "llmman/llmman.hybrid/qwen3.8,openai/gpt-5.6-luna" },
      models: {
        "llmman/llmman.hybrid/qwen3.8,openai/gpt-5.6-luna": { alias: "Qwen3.8 + Luna" },
        "llmman/qwen3.8": { alias: "Qwen3.8 local" },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        timeoutSeconds: 300,
        models: [
          {
            id: "llmman.hybrid/qwen3.8,openai/gpt-5.6-luna",
            name: "Qwen3.8 + GPT-5.6 Luna (hybrid)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 65536,
            maxTokens: 8192,
          },
          {
            id: "qwen3.8",
            name: "Qwen3.8 (llmman)",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 65536,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}
```

守护进程在启动时计算一个混合字节预算：`LLMMAN_CONTEXT_LENGTH` 的每个令牌 4 字节，或未设置时为 `262144 × 4 = 1048576` 字节。此预算不遵循模型的训练上下文上限或后来的内存不足减少。在守护程序环境中设置 `LLMMAN_CONTEXT_LENGTH=65536` 以匹配示例，或设置 `LLMMAN_HYBRID_LOCAL_BYTES` 以直接选择字节预算。显式的 `LLMMAN_CONTEXT_LENGTH=0` 会禁用基于大小的路由，除非正的 `LLMMAN_HYBRID_LOCAL_BYTES` 提供预算；将字节覆盖设置为 `0` 也会禁用该规则。除非请求固定在本地，否则本地上下文拒绝回退仍然适用。

将货币对上的 `contextWindow` 设置为本地模型的可用令牌上下文。 OpenClaw 然后围绕局部模型的限制进行压缩，因此大多数转弯保持局部；当请求超过时，llmman 仍然溢出到 `gpt-5.6-luna`。如果您更喜欢更少的压缩和更多的托管流量，请将其设置为托管模型的窗口。

### <a id="pinning-a-side"></a> 固定一侧

OpenClaw 在每个请求上发送提供程序级别的 `headers`，因此同一基础 URL 上的第二个提供程序条目可以强制该对的一侧：

```json5
{
  models: {
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "llmman.hybrid/qwen3.8,openai/gpt-5.6-luna",
            name: "Hybrid",
            input: ["text", "image"],
          },
        ],
      },
      "llmman-cloud": {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        headers: { "x-llmman-route": "cloud" },
        models: [
          {
            id: "llmman.hybrid/qwen3.8,openai/gpt-5.6-luna",
            name: "Hybrid (hosted)",
            input: ["text", "image"],
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: "llmman/llmman.hybrid/qwen3.8,openai/gpt-5.6-luna",
        fallbacks: ["llmman-cloud/llmman.hybrid/qwen3.8,openai/gpt-5.6-luna"],
      },
    },
  },
}
```

使用 `/model llmman-cloud/...` 切换应托管的回合，或使用 `headers: { "x-llmman-route": "local" }` 切换永远不能离开机器的条目。

### <a id="hybrid-versus-openclaw-fallbacks"></a> Hybrid 与 OpenClaw 后备方案

| 机制                         | 决定                    | 打开                                                    |
| --------------------------------- | -------------------------- | -------------------------------------------------------------- |
| llmman 混合对                | 根据要求，在 llmman 内 | 请求大小与本地上下文或显式路由标头 |
| `agents.defaults.model.fallbacks` | 每转，内部 OpenClaw  | 提供商错误、超时、速率限制、身份验证失败          |

他们作曲。常见的形状是混合对，如 `primary` 和直接托管模型，作为 llmman 本身出现故障时的后备方案：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "llmman/llmman.hybrid/qwen3.8,openai/gpt-5.6-luna",
        fallbacks: ["openai/gpt-5.6-luna"],
      },
    },
  },
}
```

### <a id="hosted-models-through-llmman"></a> 通过llmman托管模型

`llmman.provider/<provider>/<model>` 转发到没有本地一半的托管提供商。当您希望每个模型（本地或托管）都位于一个端点和一个密钥处理故事后面时，请使用它：

```json5
{
  models: {
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "qwen3.8", name: "Qwen3.8 (llmman)", reasoning: true, input: ["text", "image"] },
          {
            id: "llmman.provider/openai/gpt-5.6-luna",
            name: "GPT-5.6 Luna via llmman",
            reasoning: true,
            input: ["text", "image"],
          },
        ],
      },
    },
  },
}
```

提供程序目录来自 [models.dev](https://models.dev)，并由守护进程缓存。 `llmman providers` 显示哪些提供商拥有密钥； `llmman list --provider openai` 列出了该提供商的模型和价格。对于路径中没有 llmman 的直接托管访问，请改为配置 [OpenAI](/providers/openai) 提供程序。

## <a id="vision-and-image-description"></a> 视觉与图像描述

附带 `mmproj` 投影仪的模型具有视觉功能； `qwen3.8` 和 `gemma4:e4b` 是。 `llmman show <model>` 记录 `found companion mmproj file`，`/api/show` 报告 `vision` 功能。标记这些模型 `input: ["text", "image"]`，以便将图像附件注入到代理轮次中。

```bash
llmman pull gemma4:e4b
openclaw infer image describe --file ./photo.jpg --model llmman/gemma4:e4b --json
```

`--model` 必须是完整的 `<provider/model>` 参考号。使用`infer image describe`进行OpenClaw的图像理解流程并配置`imageModel`；使用 `infer model run --file` 进行带有自定义提示的原始多模式检查。

要将 llmman 模型设为入站媒体的默认图像理解提供程序：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "llmman/gemma4:e4b",
      },
    },
  },
  models: {
    providers: {
      llmman: {
        baseUrl: "http://127.0.0.1:17434/v1",
        apiKey: "${LLMMAN_API_KEY}",
        api: "openai-completions",
        models: [{ id: "gemma4:e4b", name: "Gemma 4 E4B (llmman)", input: ["text", "image"] }],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
      },
    },
  },
}
```

OpenClaw 拒绝未标记为支持图像的模型的图像描述请求。慢速本地视觉模型可能需要比托管模型更长的图像理解超时； `models.providers.llmman.timeoutSeconds` 仍然控制普通模型调用的底层 HTTP 请求。

## <a id="configuration"></a> 配置

<Tabs>
  <Tab id="local-only" title="仅本地">
    ```json5
    {
      models: {
        providers: {
          llmman: {
            baseUrl: "http://127.0.0.1:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            models: [
              {
                id: "qwen3.8",
                name: "Qwen3.8 (llmman)",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 65536,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
    }
    ```

  </Tab>

  <Tab id="lan-llmman-host" title="LAN llmman 主机">
    在其环境中使用 `LLMMAN_HOST=0.0.0.0`（以及可选的 `LLMMAN_CONTEXT_LENGTH=65536`）启动 GPU 盒子上的服务器，然后将 OpenClaw 指向它：

    ```bash
    llmman serve
    ```

    ```json5
    {
      models: {
        providers: {
          llmman: {
            baseUrl: "http://gpu-box.local:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 420,
            models: [
              {
                id: "qwen3.8",
                name: "Qwen3.8 (gpu-box)",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 65536,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    远程守护程序没有身份验证。仅在受信任的网络内执行此操作，并且不要对非环回守护进程使用带有“llmman 持有密钥”的混合引用；它拒绝为远程调用者使用自己的密钥。
    </Warning>

  </Tab>

  <Tab id="on-demand-startup" title="按需启动">
    当请求 `llmman/...` 模型时，OpenClaw 按需启动 llmman。此示例使守护程序保持运行，直到 OpenClaw 退出 （`idleStopMs: 0`）。设置正值 `idleStopMs` 以在空闲毫秒后停止 OpenClaw-started 守护进程；这与 llmman 卸载闲置模型是分开的：

    ```json5
    {
      models: {
        providers: {
          llmman: {
            baseUrl: "http://127.0.0.1:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 300,
            localService: {
              command: "/opt/homebrew/bin/llmman",
              args: ["serve"],
              env: { LLMMAN_CONTEXT_LENGTH: "65536" },
              healthUrl: "http://127.0.0.1:17434/v1/models",
              readyTimeoutMs: 180000,
              idleStopMs: 0,
            },
            models: [
              {
                id: "qwen3.8",
                name: "Qwen3.8 (llmman)",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 65536,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
    }
    ```

    `command` 必须是绝对路径；使用网关主机上 `which llmman` 的输出。 `env` 是此处提供守护程序设置（例如 `LLMMAN_CONTEXT_LENGTH`）的方式。 `healthUrl` 必须是 `/v1/models` 或 `/api/version`，因为 llmman 没有 `/health`。启动后的第一个请求也会加载模型，因此请保持 `timeoutSeconds` 慷慨。全场参考：[本地模型服务](/gateway/local-model-services)。

  </Tab>
</Tabs>

## <a id="common-recipes"></a> 常见配方

将模型 ID 替换为 `llmman list` 或 `openclaw models list --provider llmman` 中的名称。

<AccordionGroup>
  <Accordion id="local-qwen3-8-as-the-default-agent-model" title="本地Qwen3.8为默认代理模型">
    ```bash
    llmman pull qwen3.8
    llmman serve
    echo 'LLMMAN_API_KEY=llmman-local' >> ~/.openclaw/.env
    openclaw models set llmman/qwen3.8
    ```

    使用 [ 完整配置示例 ](#full-config-example) 作为提供程序条目，如果您希望服务器上下文与其完全匹配，请在守护程序环境中设置 `LLMMAN_CONTEXT_LENGTH=65536`。

  </Accordion>

  <Accordion id="local-first-hosted-overflow" title="本地优先，托管溢出">
    上面的 [Hybrid 配置 ](#hybrid-config)：`llmman.hybrid/qwen3.8,openai/gpt-5.6-luna` 为 `primary`，`LLMMAN_API_KEY` 设置为 OpenAI 密钥，`LLMMAN_CONTEXT_LENGTH` 与该对的 `contextWindow` 匹配。将 `openai/gpt-5.6-luna` 添加到 `fallbacks`，以便停止的守护进程不会阻止回复。
  </Accordion>

  <Accordion id="small-local-profile" title="当地规模较小">
    未设置时，通过自定义 `openai-completions` 提供程序提供服务的本地模型会自动使用结构化 [Tool Search](/tools/tool-search)。下面的显式设置固定了表面，保持可选功能可用，同时仅在需要时加载其架构。将上下文限制为主机可以在守护程序环境中使用 `LLMMAN_CONTEXT_LENGTH=32768` 运行：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "llmman/qwen3.8" },
        },
      },
      tools: {
        toolSearch: { mode: "tools" },
      },
      models: {
        providers: {
          llmman: {
            baseUrl: "http://127.0.0.1:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "qwen3.8",
                name: "Qwen3.8 (llmman)",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 32768,
                contextTokens: 32768,
                maxTokens: 4096,
              },
            ],
          },
        },
      },
    }
    ```

    仅当模型或服务器在工具模式上可靠地失败时才使用 `compat.supportsTools: false`；它完全禁用工具的使用。对于有意缩小代理范围的代理，首选 `tools.profile` 或每个代理工具策略。

    当您将现有会话切换到无工具模型时，OpenClaw 会将早期的工具名称、参数和结果重播为助手文本。存储的会话历史记录保持不变。

  </Accordion>

  <Accordion id="multiple-llmman-hosts" title="多台 llmman 主机">
    运行多个守护进程时自定义提供者 ID；每个都有自己的主机、模型和超时：

    ```json5
    {
      models: {
        providers: {
          "llmman-fast": {
            baseUrl: "http://mini.local:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            models: [{ id: "qwen3.5:9b", name: "qwen3.5:9b", input: ["text"], contextWindow: 32768 }],
          },
          "llmman-large": {
            baseUrl: "http://gpu-box.local:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            timeoutSeconds: 420,
            models: [{ id: "qwen3.8", name: "qwen3.8", reasoning: true, input: ["text", "image"], contextWindow: 131072 }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "llmman-fast/qwen3.5:9b",
            fallbacks: ["llmman-large/qwen3.8"],
          },
        },
      },
    }
    ```

    llmman 本身也可以池化多个守护进程：`llmman config set aggregation.peers <host>,<host>`（或 `LLMMAN_PEERS`）使一个守护进程转发到对等点，因此 OpenClaw 会看到其模型列表跨越该组的单个端点。

  </Accordion>

  <Accordion id="hugging-face-or-private-registry-models" title="Hugging Face 或私有注册表模型">
    模型 ID 是 llmman 解析的任何内容。使用完整参考拉取并使用与 OpenClaw 模型 ID 相同的字符串：

    ```bash
    llmman pull hf.co/unsloth/Qwen3.5-0.8B-GGUF
    llmman pull ghcr.io/myorg/private-model:v1
    ```

    ```json5
    {
      models: {
        providers: {
          llmman: {
            baseUrl: "http://127.0.0.1:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
            api: "openai-completions",
            models: [
              { id: "hf.co/unsloth/Qwen3.5-0.8B-GGUF", name: "Qwen3.5 0.8B", input: ["text"] },
              { id: "ghcr.io/myorg/private-model:v1", name: "Private model", input: ["text"] },
            ],
          },
        },
      },
    }
    ```

    代理参考号为 `llmman/hf.co/unsloth/Qwen3.5-0.8B-GGUF`。首先针对私有注册表运行 `llmman login <registry>`。

  </Accordion>
</AccordionGroup>

### <a id="model-selection"></a> 模型选择

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "llmman/qwen3.8",
        fallbacks: ["llmman/qwen3.5:9b", "openai/gpt-5.6-luna"],
      },
    },
  },
}
```

对于缓慢的本地模型，在提高整个代理运行时超时之前，最好在提供程序范围内进行调整：`models.providers.llmman.timeoutSeconds` 仅涵盖该提供程序模型请求的连接设置、标头、正文流和总受保护的获取中止。

### <a id="quick-verification"></a> 快速验证

```bash
# llmman daemon visible to this machine
curl http://127.0.0.1:17434/api/version
llmman ps

# OpenClaw catalog and selected model
openclaw models list --provider llmman
openclaw models status

# Direct model smoke
LLMMAN_API_KEY=llmman-local openclaw infer model run \
  --local --model llmman/qwen3.8 --prompt "Reply with exactly: ok" --json
```

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 主机。如果 `curl` 可以工作但 OpenClaw 不行，请检查 Gateway 是否运行在不同的机器、容器或服务账号下。

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="context-windows" title="上下文窗口">
    `LLMMAN_CONTEXT_LENGTH` 是服务器端上下文（没有标志）。后端语义：

    - **llama-server （GGUF）：**集合，一代模型传递为`--ctx-size`； `0` 表示经过训练的上下文。未设置时，llmman 使用 `262144` 或模型的训练上下文（如果较小），并且在内存不足重试时，上下文减半至 16,384 层。
    - **vLLM（安全张量）：**正值变为`--max-model-len`；取消设置使用 vLLM 默认值。
    - **mlx_lm.server：** 未转发。

    `LLMMAN_NUM_PARALLEL` 按该系数放大 `--ctx-size`，以便每个插槽保留完整的上下文。

    在 OpenClaw 一侧，`contextWindow` 声明模型的窗口，`contextTokens` 限制活动输入。保持 `contextWindow` 等于或低于服务器值； OpenClaw 从中导出压缩和预检阈值。 OpenClaw的`contextWindow`不会改变llmman的混合字节预算；按照 [Hybrid config](#hybrid-config) 中的说明单独配置守护程序。

    ```json5
    {
      models: {
        providers: {
          llmman: {
            models: [
              {
                id: "qwen3.8",
                name: "qwen3.8",
                contextWindow: 65536,
                contextTokens: 49152,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="thinking-control" title="思维控制">
    Qwen3.8 默认认为； llmman 返回推理为 `reasoning_content`，OpenClaw 的 `openai-completions` 适配器将其与最终文本分开。请求被代理到 `llama-server`，因此 `chat_template_kwargs` 通过。要关闭对代理轮流的思考，使用本地 Qwen 模型：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "llmman/qwen3.8": {
              params: {
                chat_template_kwargs: { enable_thinking: false },
              },
            },
          },
        },
      },
    }
    ```

    对于每次运行或会话控制，声明本地 Qwen 模型的思维格式：

    ```json5
    {
      models: {
        providers: {
          llmman: {
            models: [
              {
                id: "qwen3.8",
                name: "Qwen3.8 (llmman)",
                reasoning: true,
                input: ["text", "image"],
                compat: { thinkingFormat: "qwen-chat-template" },
              },
            ],
          },
        },
      },
    }
    ```

    通过此声明，`openclaw agent --model llmman/qwen3.8 --thinking off`、`/think off` 和 `openclaw infer model run --local --model llmman/qwen3.8 --thinking off --prompt "Reply with exactly: pong" --json` 将思维设置映射到 `chat_template_kwargs.enable_thinking`。如果没有它，通用代理默认不发送此控件或 `reasoning_effort`。

    精益`infer model run`路径不会读取上面的代理级`params`配方；使用兼容性声明和 `--thinking off` 进行该检查。不要将固定 `enable_thinking` 代理参数与每次运行控制相结合，因为固定参数会覆盖生成的值。仅当混合引用的本地和托管后端都接受它们时，才将 Qwen- 特定控件应用于混合引用。

  </Accordion>

  <Accordion id="model-lifecycle-and-keep-alive" title="模型生命周期和保持活动">
    模型在第一个请求时加载，每个模型在其自己的后端子进程中加载​​，并在五分钟空闲分钟后卸载。调音：

    | 变量                   | 含义                                                                                  |
    | -------------------------- | ---------------------------------------------------------------------------------------- |
    | `LLMMAN_KEEP_ALIVE`        | 空闲卸载定时器（默认`5m`）； `0` 在每次请求后立即卸载                    |
    | `LLMMAN_MAX_LOADED_MODELS` | 并发加载模型的上限；空闲的被驱逐 LRU，忙碌的返回 `503`      |
    | `LLMMAN_MAX_QUEUE`         | `503` 之前的待处理请求上限（默认 `512`）                                          |
    | `LLMMAN_LOAD_TIMEOUT`      | 负载失速超时（默认`10m`）                                                       |

    `llmman ps` 显示加载的模型及其上下文和到期时间； `llmman stop <model>` 现在卸载一个。启动后的第一个请求或空闲卸载会支付加载成本，因此在提供程序上设置 `timeoutSeconds` 并提高 `LLMMAN_KEEP_ALIVE` 以使守护进程对聊天界面保持温暖。

  </Accordion>

  <Accordion id="gpu-and-backend-selection" title="GPU 及后端选择">
    llmman 检查 CUDA、ROCm、Vulkan （Linux/Windows） 或 Metal （macOS），如果 `PATH` 上没有，则下载匹配的 `llama-server` 版本。使用 `LLMMAN_LLM_LIBRARY` 覆盖：`cpu`、`cuda`、`cuda13`、`rocm`、`vulkan` 或 `metal`。其他旋钮：`LLMMAN_FLASH_ATTENTION`（`on`/`off`/`auto`）、`LLMMAN_KV_CACHE_TYPE`（`f16`、`q8_0`、`q4_0`）、`LLMMAN_SCHED_SPREAD`用于多层分割，GPU `LLMMAN_IGPU_ENABLE` 用于计算集成 GPU 数量。在 Linux 上，`llmman serve --ociman docker|podman` 从 `ghcr.io/ggml-org/llama.cpp` 映像运行 `llama-server`，而不是本地二进制文件。 `LLMMAN_DEBUG=1` 打印检查结果。
  </Accordion>

  <Accordion id="memory-embeddings" title="记忆嵌入">
    llmman 为 GGUF 嵌入模型提供 `/v1/embeddings` 服务，因此 [ 内存搜索 ](/concepts/memory) 可以通过通用 `openai-compatible` 嵌入提供程序使用它：

    ```bash
    llmman pull embeddinggemma
    ```

    ```json5
    {
      memory: {
        search: {
          provider: "openai-compatible",
          model: "embeddinggemma",
          remote: {
            baseUrl: "http://127.0.0.1:17434/v1",
            apiKey: "${LLMMAN_API_KEY}",
          },
        },
      },
    }
    ```

    来自 Ollama？ llmman 还为 `/api/embed` 提供服务，因此 `ollama` 提供程序仅与新的 `remote.baseUrl`（无 `/v1`）配合使用。提取相同的模型名称，然后运行 ​​`openclaw memory index --force`，以便每个向量都来自一台服务器：

    ```json5
    {
      memory: {
        search: {
          provider: "ollama",
          model: "embeddinggemma",
          remote: { baseUrl: "http://127.0.0.1:17434" },
        },
      },
    }
    ```

    无论 `LLMMAN_CONTEXT_LENGTH` 是多少，嵌入模型都仅限于其经过训练的上下文。其余字段请参见 [Memory config](/reference/memory-config#remote-endpoint-config)。

  </Accordion>

  <Accordion id="ollama-compatible-api" title="Ollama-兼容API">
    llmman 还实现了 Ollama 的原生 `/api/chat`、`/api/tags`、`/api/show` 和 `/api/ps`，而 `OLLAMA_HOST=127.0.0.1:17434 ollama run <model>` 与之相反。本机路由也适用于 OpenClaw。使用自定义提供商 ID，例如 `llmman`，而不是 `ollama`：该 id 上的发现读取 llmman 的 `/api/show`，它仅报告 `completion` 和 `vision`，并标记每个模型 `compat.supportsTools: false`。设置 `api: "ollama"`，省略 `/v1`，并显式列出模型：

    ```json5
    {
      models: {
        providers: {
          llmman: {
            baseUrl: "http://127.0.0.1:17434",
            apiKey: "${LLMMAN_API_KEY}",
            api: "ollama",
            models: [
              {
                id: "qwen3.8",
                name: "Qwen3.8 (llmman)",
                reasoning: true,
                input: ["text", "image"],
                contextWindow: 65536,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="compat-flags" title="兼容标志">
    llmman 将消息内容和工具模式转发到后端而不对其进行规范化，因此兼容性取决于所选的引擎和模型。结构化内容部分（文本 + 图像）和 OpenClaw 的完整工具架构可与 `llama-server` 上的 `qwen3.8` 配合使用。如果不同的后端或模型拒绝它们：

    - `messages[].content: invalid type: sequence, expected a string` → 在模型条目上设置 `compat.requiresStringContent: true`。 OpenClaw 然后将纯文本内容部分展平为纯字符串。
    - `400 JSON schema conversion failed` → `llama-server` 无法将工具模式编译到其语法子集中。先更新OpenClaw；如果第三方工具或 MCP 服务器提供了有问题的架构，请为该代理禁用它，并仅将 `compat.supportsTools: false` 作为最后的手段。

    ```json5
    {
      models: {
        providers: {
          llmman: {
            models: [
              {
                id: "qwen3.8",
                name: "qwen3.8",
                compat: {
                  requiresStringContent: true,
                },
              },
            ],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion id="proxy-style-behavior" title="代理式行为">
    由于 llmman 是非本机 `openai-completions` 端点，因此 OpenClaw 将其视为代理路由：无 `service_tier`、无响应 `store`、无提示缓存提示、无 OpenAI 推理兼容负载整形、无隐藏OpenClaw 归属标头，并且 `compat.supportsDeveloperRole` 强制为 `false`。供应商特定字段可以通过 `agents.defaults.models["llmman/<model>"].params.extra_body` 合并到请求正文中。
  </Accordion>

  <Accordion id="model-costs" title="模型成本">
    本地 llmman 模型是免费的，因此将所有成本设置为 `0`。混合或 `llmman.provider/...` 参考的托管一半由该提供商计费； `llmman list --provider openai` 显示其每百万代币的价格。
  </Accordion>
</AccordionGroup>

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="curl-v1-models-fails" title="卷曲 /v1/models 失败">
    `llmman serve` 未运行或无法在配置的地址访问。默认为`127.0.0.1:17434`；如果设置了 `LLMMAN_HOST`，请更新 OpenClaw、`baseUrl` 和 `healthUrl` 以匹配。

    ```bash
    llmman serve
    curl http://127.0.0.1:17434/api/version
    ```

  </Accordion>

  <Accordion id="provider-unavailable-or-secrets-could-not-be-resolved" title="提供者不可用或无法解析机密">
    配置警告中的 `models.providers.llmman.apiKey: *** env var "LLMMAN_API_KEY"` 表示替换没有发现值。将 `LLMMAN_API_KEY=llmman-local` 添加到 `~/.openclaw/.env`，或将 `"${LLMMAN_API_KEY}"` 替换为文字 `"llmman-local"`。
  </Accordion>

  <Accordion id="unknown-model" title="未知模型">
    模型未拉取，或者配置中的 id 与 llmman 解析的不匹配。与`llmman list`比较；短名称映射到 `docker.io/ai/<name>:latest`，`owner/repo` 名称映射到 `hf.co/owner/repo`。

    ```bash
    llmman pull qwen3.8
    llmman list
    ```

  </Accordion>

  <Accordion id="cold-model-times-out" title="冷模型超时">
    大型模型可能需要几分钟才能加载，尤其是在空闲卸载后的第一个请求时。提高 `models.providers.llmman.timeoutSeconds`，用第一个 `openclaw infer model run` 预热模型，并考虑在守护进程上使用更长的 `LLMMAN_KEEP_ALIVE`。
  </Accordion>

  <Accordion id="hybrid-request-fails-with-no-api-key-for-provider" title="混合请求失败，提供商没有 API 密钥">
    llmman 将请求路由到托管部分，但发现没有可用的密钥。发送的承载 OpenClaw 是一个标记 （`llmman-local`） 而不是真正的密钥，或者您使用了 `llmman` 占位符而没有为守护进程提供自己的 `OPENAI_API_KEY`，或者守护进程被绑定到环回并拒绝使用自己的密钥。请参阅 [ 托管提供商密钥 ](#hosted-provider-key)。
  </Accordion>

  <Accordion id="hybrid-requests-never-go-hosted-or-always-do" title="混合请求永远不会被托管（或总是会被托管）">
    检查守护进程日志；每个路由请求都会记录侧面和原因。除非设置了 `x-llmman-route`，否则路由是根据 `LLMMAN_CONTEXT_LENGTH` 的请求正文大小（每个令牌 4 个字节）进行的。降低 `LLMMAN_HYBRID_LOCAL_BYTES` 可以更快溢出，提高它可以在本地停留更长时间，或者用提供者 `headers` 条目固定一侧，如 [ 固定一侧 ](#pinning-a-side) 中所示。
  </Accordion>

  <Accordion id="direct-v1-chat-completions-calls-pass-but-openclaw-infer-model-run-fails" title="直接 /v1/chat/completions 调用通过，但 openclaw 推断模型运行失败">
    两项检查都是免工具的，因此`compat.supportsTools`无法改变这一故障。检查配置的基础 URL、模型 id 和 `LLMMAN_API_KEY`，检查守护程序和后端日志，并比较两个请求负载。
  </Accordion>

  <Accordion id="model-run-passes-but-a-normal-agent-turn-fails" title="模型运行通过，但正常的代理轮转失败">
    代理轮流添加了更大的提示和工具模式。 `400 JSON schema conversion failed` 是拒绝工具模式的 `llama-server`；更新OpenClaw并检查第三方工具或MCP服务器。否则，启用 [Tool Search](/tools/tool-search) 来推迟模式，确认服务器的实际上下文分配，并仅将 `compat.supportsTools: false` 作为最后的手段。请参阅 [ 更小或更严格的后端](/gateway/local-models#smaller-or-stricter-backends)。
  </Accordion>

  <Accordion id="llama-server-crashes-on-larger-agent-turns" title="骆驼服务器在代理轮数较大时崩溃">
    如果架构错误消失，但生成的 `llama-server` 在较大转弯时仍然崩溃，请将其视为上游 `llama.cpp` 或模型限制。降低`LLMMAN_CONTEXT_LENGTH`，设置`LLMMAN_KV_CACHE_TYPE=q8_0`减少内存，或者切换后端或模型。
  </Accordion>

  <Accordion id="model-outputs-tool-json-as-text" title="模型以文本形式输出工具 JSON">
    确认模型的聊天模板支持工具调用并且请求已达到`/v1/chat/completions`（不是Ollama or Anthropic通过代理表面）。如果模型仅在强制时调用工具，请设置`params.extra_body.tool_choice: "required"`在该模型参考上，如所述[本地模型](/gateway/local-models#other-openai-compatible-local-proxies)。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting)和[FAQ](/help/faq)。
</Note>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="本地模型" href="/gateway/local-models" icon="server">
    针对本地模型服务器运行 OpenClaw。
  </Card>
  <Card title="本地模型服务" href="/gateway/local-model-services" icon="play">
    根据配置的提供程序的需要启动本地模型服务器。
  </Card>
  <Card title="OpenAI" href="/providers/openai" icon="cloud">
    直接托管访问用作混合溢出一半的模型。
  </Card>
  <Card title="推理 CLI" href="/cli/infer" icon="terminal">
    `openclaw infer model run` 以及此页面上使用的其他一次性检查。
  </Card>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为的概述。
  </Card>
  <Card title="网关故障排除" href="/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    调试通过检查但代理运行失败的本地 OpenAI- 兼容后端。
  </Card>
</CardGroup>
