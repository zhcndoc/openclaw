---
summary: "Hugging Face 推理设置（认证 + 模型选择）"
read_when:
  - 你想使用 OpenClaw 调用 Hugging Face 推理服务
  - 你需要 HF 令牌环境变量或命令行认证选项
title: "Hugging Face（推理）"
---

# Hugging Face（推理）

[Hugging Face 推理提供者](https://huggingface.co/docs/inference-providers) 通过单一路由器 API 提供兼容 OpenAI 的聊天补全服务。你可以使用一个令牌访问许多模型（DeepSeek、Llama 等）。OpenClaw 使用 **兼容 OpenAI 的端点**（仅限聊天补全）；对于图像生成、嵌入或语音，请直接使用 [HF 推理客户端](https://huggingface.co/docs/api-inference/quicktour)。

- 提供者：`huggingface`
- 认证：`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`（需要具备 **调用推理提供者** 权限的细粒度令牌）
- API：兼容 OpenAI (`https://router.huggingface.co/v1`)
- 计费：使用单一 HF 令牌；[价格](https://huggingface.co/docs/inference-providers/pricing) 根据提供者费率，有免费额度。

## 快速开始

1. 在 [Hugging Face → 设置 → 令牌](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) 创建具有 **调用推理提供者权限** 的细粒度令牌。
2. 运行引导程序（onboarding），在提供者下拉菜单选择 **Hugging Face**，根据提示输入你的 API 密钥：

```bash
openclaw onboard --auth-choice huggingface-api-key
```

3. 在 **默认 Hugging Face 模型** 下拉菜单选择你想用的模型（当你拥有有效令牌时，列表从推理 API 加载；否则显示内置列表）。你的选择将被保存为默认模型。
4. 你也可以后续在配置文件中设置或修改默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1" },
    },
  },
}
```

## 非交互示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice huggingface-api-key \
  --huggingface-api-key "$HF_TOKEN"
```

这会将 `huggingface/deepseek-ai/DeepSeek-R1` 设为默认模型。

## 环境注意事项

如果 Gateway 作为守护进程启动（launchd/systemd），请确保 `HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN` 对该进程可用（例如放在 `~/.openclaw/.env` 或通过 `env.shellEnv` 提供）。

## 模型发现和引导下拉菜单

OpenClaw 通过直接调用 **推理端点** 来发现模型：

```bash
GET https://router.huggingface.co/v1/models
```

（可选：发送 `Authorization: Bearer $HUGGINGFACE_HUB_TOKEN` 或 `$HF_TOKEN` 以获取完整列表；部分端点未认证时返回子集。）返回结果为 OpenAI 风格的 `{ "object": "list", "data": [ { "id": "Qwen/Qwen3-8B", "owned_by": "Qwen", ... }, ... ] }`。

当你配置 Hugging Face API 密钥（通过引导程序、`HUGGINGFACE_HUB_TOKEN` 或 `HF_TOKEN`）时，OpenClaw 使用此 GET 请求发现可用的聊天补全模型。在 **交互式设置** 中，输入令牌后，你会看到一个从该列表（如果请求失败则为内置目录）填充的 **默认 Hugging Face 模型** 下拉菜单。运行时（如 Gateway 启动时），如果有密钥，OpenClaw 会再次调用 **GET** `https://router.huggingface.co/v1/models` 以刷新目录。该列表与内置目录合并（用于上下文窗口和成本等元数据）。如果请求失败或未设置密钥，仅使用内置目录。

## 模型名称及可编辑选项

- **API 返回的名称：** 模型显示名称从 `GET /v1/models` 返回的 `name`、`title` 或 `display_name` 获取；否则根据模型 id 派生（例如 `deepseek-ai/DeepSeek-R1` 转为 “DeepSeek R1”）。
- **覆盖显示名称：** 你可以在配置中为每个模型设置自定义标签，使其在 CLI 和界面中按你的方式显示：

```json5
{
  agents: {
    defaults: {
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1": { alias: "DeepSeek R1（快速）" },
        "huggingface/deepseek-ai/DeepSeek-R1:cheapest": { alias: "DeepSeek R1（经济）" },
      },
    },
  },
}
```

- **提供者 / 策略选择：** 在 **模型 id** 后追加后缀，决定路由如何选择后端：
  - **`:fastest`** — 最高吞吐量（路由器决定；提供者选择被**锁定**，无交互后端选择）
  - **`:cheapest`** — 每输出字成本最低（路由器决定；提供者选择被**锁定**）
  - **`:provider`** — 强制指定后端（例如 `:sambanova`、`:together`）

  选择 **:cheapest** 或 **:fastest**（例如在引导模型下拉中），提供者被锁定，路由器根据费用或速度选定，不显示“偏好特定后端”步骤。你可以将这些作为单独条目加入 `models.providers.huggingface.models`，或在 `model.primary` 里带后缀。也可在 [推理提供者设置](https://hf.co/settings/inference-providers) 配置默认顺序（无后缀时使用该顺序）。

- **配置合并：** 当配置合并时，`models.providers.huggingface.models` 中已有条目（如 `models.json`）保留，因此你在这里设置的任何自定义 `name`、`alias` 或模型选项都会被保留。

## 模型 ID 和配置示例

模型引用格式为 `huggingface/<机构>/<模型>`（Hub 风格 ID）。以下列表来自 **GET** `https://router.huggingface.co/v1/models`，你的目录可能更多。

**示例 ID（推理端点返回）：**

| 模型名称                | 引用（加前缀 `huggingface/`）         |
| ----------------------- | ------------------------------------ |
| DeepSeek R1             | `deepseek-ai/DeepSeek-R1`            |
| DeepSeek V3.2           | `deepseek-ai/DeepSeek-V3.2`          |
| Qwen3 8B                | `Qwen/Qwen3-8B`                      |
| Qwen2.5 7B Instruct     | `Qwen/Qwen2.5-7B-Instruct`           |
| Qwen3 32B               | `Qwen/Qwen3-32B`                     |
| Llama 3.3 70B Instruct  | `meta-llama/Llama-3.3-70B-Instruct` |
| Llama 3.1 8B Instruct   | `meta-llama/Llama-3.1-8B-Instruct`  |
| GPT-OSS 120B            | `openai/gpt-oss-120b`                |
| GLM 4.7                 | `zai-org/GLM-4.7`                    |
| Kimi K2.5               | `moonshotai/Kimi-K2.5`               |

你可以在模型 id 后追加 `:fastest`、`:cheapest`、或 `:provider`（例如 `:together`、`:sambanova`）。在 [推理提供者设置](https://hf.co/settings/inference-providers) 配置默认顺序；查看 [推理提供者文档](https://huggingface.co/docs/inference-providers) 和 **GET** `https://router.huggingface.co/v1/models` 了解完整列表。

### 完整配置示例

**主用 DeepSeek R1，备用 Qwen：**

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

**默认 Qwen，带 :cheapest 和 :fastest 变体：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen3-8B" },
      models: {
        "huggingface/Qwen/Qwen3-8B": { alias: "Qwen3 8B" },
        "huggingface/Qwen/Qwen3-8B:cheapest": { alias: "Qwen3 8B（最便宜）" },
        "huggingface/Qwen/Qwen3-8B:fastest": { alias: "Qwen3 8B（最快）" },
      },
    },
  },
}
```

**DeepSeek + Llama + GPT-OSS 带别名：**

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

**使用 :provider 强制指定后端：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/deepseek-ai/DeepSeek-R1:together" },
      models: {
        "huggingface/deepseek-ai/DeepSeek-R1:together": { alias: "DeepSeek R1（Together）" },
      },
    },
  },
}
```

**多个 Qwen 和 DeepSeek 模型，带策略后缀：**

```json5
{
  agents: {
    defaults: {
      model: { primary: "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest" },
      models: {
        "huggingface/Qwen/Qwen2.5-7B-Instruct": { alias: "Qwen2.5 7B" },
        "huggingface/Qwen/Qwen2.5-7B-Instruct:cheapest": { alias: "Qwen2.5 7B（经济）" },
        "huggingface/deepseek-ai/DeepSeek-R1:fastest": { alias: "DeepSeek R1（快速）" },
        "huggingface/meta-llama/Llama-3.1-8B-Instruct": { alias: "Llama 3.1 8B" },
      },
    },
  },
}
```
