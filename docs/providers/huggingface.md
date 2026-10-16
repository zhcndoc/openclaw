---
summary: "Hugging Face 推理设置（认证 + 模型选择）"
read_when:
  - "您想要将 Hugging Face 推理与 OpenClaw 一起使用"
  - "你需要 HF token 环境变量或 CLI 认证选项"
title: "Hugging Face（推理）"
---

[Hugging Face 推理 Providers](https://huggingface.co/docs/inference-providers) 在一个令牌下的许多托管模型（DeepSeek、Llama 等）前面公开了一个 OpenAI- 兼容的聊天完成路由器。 OpenClaw 仅与 **聊天完成端点进行对话**；对于文本到图像、嵌入或语音，请直接使用 [HF 推理客户端](https://huggingface.co/docs/api-inference/quicktour)。

| 属性     | 值                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 提供方 id  | `huggingface`                                                                                                               |
| 插件       | bundled（默认启用，无需安装）                                                                               |
| 认证环境变量 | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（细粒度 token）                                                                  |
| API          | OpenAI-兼容（`https://router.huggingface.co/v1`）                                                                      |
| 计费      | 单个 HF token；[定价](https://huggingface.co/docs/inference-providers/pricing) 遵循提供商费率，并提供免费层级 |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="create-a-fine-grained-token" title="创建细粒度令牌">
    Go 至 [H 修改 Face 设置 Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 并创建新的细粒度令牌。

    <Warning>
    该 token 必须启用 **Make calls to Inference Providers** 权限，否则 API 请求将被拒绝。
    </Warning>

  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    在提供商下拉菜单中选择 **Hugging Face**，然后在提示时输入你的 API key：

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step id="select-a-default-model" title="选择默认模型">
    在 **默认 Hugging Face 模型** 下拉菜单中选择一个模型。只要你的 token 有效，列表就会从 Inference API 加载；否则 OpenClaw 会显示下面内置的目录。你的选择会保存为 `agents.defaults.model.primary`：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
        },
      },
    }
    ```

  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### <a id="non-interactive-setup"></a> 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

将 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## <a id="model-ids"></a> 模型 ID

模型参考使用 `huggingface/<org>/<model>` 形式（集线器样式 ID）。 OpenClaw的内置目录：

| 模型         | 引用（以 `huggingface/` 为前缀） |
| ------------- | -------------------------------- |
| DeepSeek R1   | `deepseek-ai/DeepSeek-R1`        |
| DeepSeek V3.1 | `deepseek-ai/DeepSeek-V3.1`      |
| GPT-OSS 120B  | `openai/gpt-oss-120b`            |

<Tip>
当您的令牌有效时，OpenClaw 还会在登录时和网关启动时发现 **GET** `https://router.huggingface.co/v1/models` 中的任何其他模型，因此您的目录可以包含远远多于上述三个模型。您可以将 `:fastest` 或 `:cheapest` 附加到任何模型 ID； HF 的路由器路由到匹配的推理提供程序。在 [ 推理提供程序设置 ](https://hf.co/settings/inference-providers) 中设置默认提供程序顺序。
</Tip>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="model-discovery-and-onboarding-dropdown" title="模型发现和入门下拉菜单">
    OpenClaw 通过以下方式发现模型：

    ```http
    GET https://router.huggingface.co/v1/models
    Authorization: Bearer $HUGGINGFACE_HUB_TOKEN   # or $HF_TOKEN
    ```

    响应为 OpenAI- 样式：`{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

    使用配置的密钥（加入、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`），交互式设置期间的 **Default Hugging Face model** 下拉列表从此端点填充。网关启动重复相同的调用来刷新目录。匹配的内置模型提供元数据，例如上下文窗口和成本。失败的发现会产生目录失败结果；成功的空响应将保持为空。如果没有密钥，静态目录仍然可用，而无需开始发现。

    如需禁用发现功能而不移除 provider：

    ```bash
    openclaw config set plugins.entries.huggingface.config.discovery.enabled false
    ```

  </Accordion>

  <Accordion id="model-names-aliases-and-policy-suffixes" title="模型名称、别名和策略后缀">
    - **来自 API 的名称：** 发现的模型使用 API 的 `name`、`title` 或 `display_name`（如果存在）；否则，OpenClaw 从模型 ID 中派生出一个名称（e.g. `deepseek-ai/DeepSeek-R1` 变为“DeepSeek R1”）。
    - **覆盖显示名称：** 在配置中为每个模型设置自定义标签：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1 (fast)" },
            "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheap)" },
          },
        },
      },
    }
    ```

    - **策略后缀：** `:fastest` 和 `:cheapest` 是 HF router 的约定，不是 OpenClaw 会重写的内容：该后缀会作为模型 id 的一部分原样发送，HF 的 router 会选择匹配的推理 provider。如果你希望每个后缀都有不同的别名，请将每个变体作为单独条目添加到 `models.providers.huggingface.models` 下（或在 `model.primary` 中）。
    - **配置合并：`models.providers.huggingface.models`中的**（`models.json`中的e.g.）中的现有条目保留在配置合并中，因此您在其中设置的任何自定义`name`、`alias`或模型选项都将持续存在重新启动。

  </Accordion>

  <Accordion id="environment-and-daemon-setup" title="环境和守护进程设置">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Note>
    OpenClaw 同时接受 `HUGGINGFACE_HUB_TOKEN` 和 `HF_TOKEN`。如果两者都设置了，则以 `HUGGINGFACE_HUB_TOKEN` 优先。
    </Note>

  </Accordion>

  <Accordion id="config-deepseek-r1-with-fallback" title="配置：DeepSeek R1 带后备">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-R1",
            fallbacks: ["huggingface/openai/gpt-oss-120b"],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
            "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion id="config-deepseek-with-cheapest-and-fastest-variants" title="配置：DeepSeek，具有最便宜和最快的变体">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
            "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1 (cheapest)" },
            "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fastest)" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion id="config-deepseek-gpt-oss-with-aliases" title="配置：DeepSeek + GPT-OSS 带别名">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-V3.1",
            fallbacks: ["huggingface/openai/gpt-oss-120b"],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-V3.1": { alias: "DeepSeek V3.1" },
            "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    所有提供程序、模型引用和故障转移行为的概述。
  </Card>
  <Card title="模型" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="推理提供者文档" href="https://huggingface.co/docs/inference-providers" icon="book">
    Hugging Face Inference Providers 的官方文档。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>
