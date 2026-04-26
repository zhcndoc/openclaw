---
summary: "Hugging Face 推理设置（认证 + 模型选择）"
read_when:
  - You want to use Hugging Face Inference with OpenClaw
  - You need the HF token env var or CLI auth choice
title: "Hugging Face (inference)"
---

[Hugging Face 推理提供者](https://huggingface.co/docs/inference-providers) 通过单一路由器 API 提供与 OpenAI 兼容的聊天补全。你可以使用一个令牌访问许多模型（DeepSeek、Llama 等等）。OpenClaw 使用 **OpenAI 兼容端点**（仅支持聊天补全）；对于文本生成图像、嵌入或语音，请直接使用 [HF 推理客户端](https://huggingface.co/docs/api-inference/quicktour)。

- 提供者：`huggingface`
- 认证：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（需要具备 **调用推理提供者** 权限的细粒度令牌）
- API：兼容 OpenAI (`https://router.huggingface.co/v1`)
- 计费：使用单一 HF 令牌；[价格](https://huggingface.co/docs/inference-providers/pricing) 根据提供者费率，有免费额度。

## 入门指南

<Steps>
  <Step title="创建细粒度令牌">
    前往 [Hugging Face 设置令牌](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 并创建一个新的细粒度令牌。

    <Warning>
    令牌必须启用 **Make calls to Inference Providers** 权限，否则 API 请求将被拒绝。
    </Warning>

  </Step>
  <Step title="运行初始化引导">
    在提供者下拉菜单中选择 **Hugging Face**，然后在提示时输入你的 API 密钥：

    ```bash
    openclaw onboard --auth-choice huggingface-api-key
    ```

  </Step>
  <Step title="选择默认模型">
    在 **Default Hugging Face model** 下拉菜单中，选择你想要的模型。当你拥有有效令牌时，列表会从 Inference API 加载；否则将显示内置列表。你的选择将保存为默认模型。

    你也可以稍后在配置中设置或更改默认模型：

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
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

这会将 `huggingface/deepseek-ai/DeepSeek-R1` 设为默认模型。

## 模型 ID

模型引用格式为 `huggingface/<机构>/<模型>`（Hub 风格 ID）。以下列表来自 **GET** `https://router.huggingface.co/v1/models`，你的目录可能更多。

| 模型 | 引用（前缀为 `huggingface/`） |
| ---------------------- | ----------------------------------- |
| DeepSeek R1            | `deepseek-ai/DeepSeek-R1`           |
| DeepSeek V3.2          | `deepseek-ai/DeepSeek-V3.2`         |
| Qwen3 8B               | `Qwen/Qwen3-8B`                     |
| Qwen2.5 7B Instruct    | `Qwen/Qwen2.5-7B-Instruct`          |
| Qwen3 32B              | `Qwen/Qwen3-32B`                    |
| Llama 3.3 70B Instruct | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct  | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B           | `openai/gpt-oss-120b`               |
| GLM 4.7                | `zai-org/GLM-4.7`                   |
| Kimi K2.5              | `moonshotai/Kimi-K2.5`              |

<Tip>
你可以将 `:fastest` 或 `:cheapest` 附加到任何模型 ID 后面。在 [推理提供者设置](https://hf.co/settings/inference-providers) 中设置你的默认顺序；查看 [推理提供者](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models` 获取完整列表。
</Tip>

## 高级配置

<AccordionGroup>
  <Accordion title="模型发现和初始化引导下拉菜单">
    OpenClaw 通过直接调用 **推理端点** 来发现模型：

    ```bash
    GET https://router.huggingface.co/v1/models
    ```

    （可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以获取完整列表；某些端点在没有认证的情况下返回子集。）响应是 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

    当你配置 Hugging Face API 密钥（通过初始化引导、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）时，OpenClaw 使用此 GET 请求来发现可用的聊天补全模型。在 **交互式设置** 期间，输入令牌后，你会看到一个 **Default Hugging Face model** 下拉菜单，其中填充了该列表（如果请求失败则显示内置目录）。在运行时（例如网关启动），当存在密钥时，OpenClaw 会再次调用 **GET** `https://router.huggingface.co/v1/models` 来刷新目录。该列表与内置目录合并（用于上下文窗口和成本等元数据）。如果请求失败或未设置密钥，则仅使用内置目录。

  </Accordion>

  <Accordion title="模型名称、别名和策略后缀">
    - **来自 API 的名称：** 当 API 返回 `name`、`title` 或 `display_name` 时，模型显示名称会 **从 GET /v1/models 填充**；否则它源自模型 ID（例如 `deepseek-ai/DeepSeek-R1` 变为 "DeepSeek R1"）。
    - **覆盖显示名称：** 你可以在配置中为每个模型设置自定义标签，以便它在 CLI 和 UI 中按你想要的方式显示：

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

    - **策略后缀：** OpenClaw 捆绑的 Hugging Face 文档和助手目前将这两个后缀视为内置策略变体：
      - **`:fastest`** — 最高吞吐量。
      - **`:cheapest`** — 每个输出令牌的成本最低。

      你可以将这些作为单独条目添加到 `models.providers.huggingface.models` 中，或者设置带后缀的 `model.primary`。你也可以在 [推理提供者设置](https://hf.co/settings/inference-providers) 中设置默认的提供者顺序（无前缀 = 使用该顺序）。

    - **配置合并：** 当配置合并时，`models.providers.huggingface.models` 中的现有条目（例如在 `models.json` 中）会被保留。因此，你在那里设置的任何自定义 `name`、`alias` 或模型选项都会被保留。

  </Accordion>

  <Accordion title="环境和守护进程设置">
    如果网关作为守护进程运行（launchd/systemd），请确保该进程可以使用 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Note>
    OpenClaw 接受 `HUGGINGFACE_HUB_TOKEN` 和 `HF_TOKEN` 作为环境变量别名。任一均可生效；如果两者都设置，`HUGGINGFACE_HUB_TOKEN` 优先。
    </Note>

  </Accordion>

  <Accordion title="配置：带 Qwen 回退的 DeepSeek R1">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-R1",
            fallbacks: ["huggingface/Qwen/Qwen3-8B"],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1" },
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="配置：带最便宜和最快变体的 Qwen">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen3-8B" },
          models: {
            "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
            "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B (cheapest)" },
            "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B (fastest)" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="配置：带别名的 DeepSeek + Llama + GPT-OSS">
    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "huggingface/deepseek-ai/DeepSeek-V3.2",
            fallbacks: [
              "huggingface/meta-llama/Llama-3.3-70B-Instruct",
              "huggingface/openai/gpt-oss-120b",
            ],
          },
          models: {
            "huggingface/deepseek-ai/DeepSeek-V3.2": { alias: "DeepSeek V3.2" },
            "huggingface/meta-llama/Llama-3.3-70B-Instruct": { alias: "Llama 3.3 70B" },
            "huggingface/openai/gpt-oss-120b": { alias: "GPT-OSS 120B" },
          },
        },
      },
    }
    ```
  </Accordion>

  <Accordion title="配置：带策略后缀的多个 Qwen 和 DeepSeek">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
          models: {
            "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
            "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B (cheap)" },
            "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1 (fast)" },
            "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
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
    所有提供者、模型引用和故障转移行为概览。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Inference Providers 文档" href="https://huggingface.co/docs/inference-providers" icon="book">
    官方 Hugging Face 推理提供者文档。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>