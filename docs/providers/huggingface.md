---
summary: "Hugging Face 推理设置（认证 + 模型选择）"
read_when:
  - 你想在 OpenClaw 中使用 Hugging Face Inference
  - 你需要 HF token 环境变量或 CLI 认证选项
title: "Hugging Face（推理）"
---

[Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers) 提供了一个与 OpenAI 兼容的聊天补全路由器，它使用一个 token 将多个托管模型（DeepSeek、Llama 等）统一接入。OpenClaw 只会与 **聊天补全端点** 通信；对于文本生成图像、嵌入或语音，请直接使用 [HF inference clients](https://huggingface.co/docs/api-inference/quicktour)。

| 属性         | 值                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Provider id  | `huggingface`                                                                                                               |
| 插件         | bundled（默认启用，无需安装）                                                                                                |
| 认证环境变量 | `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（细粒度 token）                                                                       |
| API          | OpenAI 兼容（`https://router.huggingface.co/v1`）                                                                           |
| 计费         | 单个 HF token；[定价](https://huggingface.co/docs/inference-providers/pricing) 遵循提供商费率，并提供免费层级                          |

## 开始使用

<Steps>
  <Step title="创建细粒度 token">
    前往 [Hugging Face Settings Tokens](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 并创建一个新的细粒度 token。

    <Warning>
    该 token 必须启用 **Make calls to Inference Providers** 权限，否则 API 请求将被拒绝。
    </Warning>

  </Step>
  <Step title="运行引导配置">
    在提供商下拉菜单中选择 **Hugging Face**，然后在提示时输入你的 API key：

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="选择默认模型">
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
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider huggingface
    ```
  </Step>
</Steps>

### 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

将 `huggingface/deepseek-ai/DeepSeek-R1` 设置为默认模型。

## 模型 ID

模型引用使用 `huggingface/<org>/<model>` 形式（Hub 风格 ID）。OpenClaw 内置目录：

| 模型         | 引用（以 `huggingface/` 为前缀） |
| ------------- | -------------------------------- |
| DeepSeek R1   | `deepseek-ai/DeepSeek-R1`        |
| DeepSeek V3.1 | `deepseek-ai/DeepSeek-V3.1`      |
| GPT-OSS 120B  | `openai/gpt-oss-120b`            |

<Tip>
当你的 token 有效时，OpenClaw 还会在入门流程和 Gateway 启动时，通过 **GET** `https://router.huggingface.co/v1/models` 发现其他模型，因此你的目录可以包含远超上述三个模型的模型。你可以将 `:fastest` 或 `:cheapest` 添加到任意模型 ID 后；HF 的 router 会将请求路由至匹配的推理提供商。在[推理提供商设置](https://hf.co/settings/inference-providers)中设置默认的提供商顺序。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="模型发现和引导下拉菜单">
    OpenClaw 通过以下方式发现模型：

    ```bash
    GET https://router.huggingface.co/v1/models
    Authorization: Bearer $HUGGINGFACE_HUB_TOKEN   # or $HF_TOKEN
    ```

    响应采用 OpenAI 风格：`{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

    使用已配置的密钥（引导过程中、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`），交互式设置期间的 **默认 Hugging Face 模型** 下拉菜单会从此端点填充。Gateway 启动时会重复同样的调用来刷新目录。发现的模型会与上方内置目录合并（当 id 匹配时，用于上下文窗口和成本等元数据）。如果请求失败、没有返回数据，或者未设置密钥，OpenClaw 将只回退到内置目录。

    如需禁用发现功能而不移除 provider：

    ```bash
    openclaw config set plugins.entries.huggingface.config.discovery.enabled false
    ```

  </Accordion>

  <Accordion title="模型名称、别名和策略后缀">
    - **来自 API 的名称：** 发现的模型在可用时会使用 API 的 `name`、`title` 或 `display_name`；否则 OpenClaw 会根据模型 id 推导名称（例如 `deepseek-ai/DeepSeek-R1` 会变为 “DeepSeek R1”）。
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
    - **配置合并：** `models.providers.huggingface.models` 中已有的条目（例如在 `models.json` 中）在配置合并时会保留，因此你在其中设置的任何自定义 `name`、`alias` 或模型选项都会在重启后继续保留。

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` 对该进程可用（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Note>
    OpenClaw 同时接受 `HUGGINGFACE_HUB_TOKEN` 和 `HF_TOKEN`。如果两者都设置了，则以 `HUGGINGFACE_HUB_TOKEN` 优先。
    </Note>

  </Accordion>

  <Accordion title="配置：DeepSeek R1，带回退">
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

  <Accordion title="配置：DeepSeek，包含最便宜和最快变体">
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

  <Accordion title="配置：DeepSeek + GPT-OSS，带别名">
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

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    所有 provider、模型引用和故障切换行为的概览。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Inference Providers 文档" href="https://huggingface.co/docs/inference-providers" icon="book">
    Hugging Face Inference Providers 的官方文档。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>