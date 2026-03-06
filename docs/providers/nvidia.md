---
summary: "在 OpenClaw 中使用 NVIDIA 的 OpenAI 兼容 API"
read_when:
  - 你想在 OpenClaw 中使用 NVIDIA 模型
  - 你需要设置 NVIDIA_API_KEY
title: "NVIDIA"
---

# NVIDIA

NVIDIA 提供了一个 OpenAI 兼容的 API，地址为 `https://integrate.api.nvidia.com/v1`，支持 Nemotron 和 NeMo 模型。使用来自 [NVIDIA NGC](https://catalog.ngc.nvidia.com/) 的 API 密钥进行身份验证。

## CLI 设置

导出密钥一次，然后运行引导并设置 NVIDIA 模型：

```bash
export NVIDIA_API_KEY="nvapi-..."
openclaw onboard --auth-choice skip
openclaw models set nvidia/nvidia/llama-3.1-nemotron-70b-instruct
```

如果你仍然传递 `--token`，请记住它会出现在 shell 历史记录和 `ps` 输出中；尽可能优先使用环境变量。

## 配置片段

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/llama-3.1-nemotron-70b-instruct" },
    },
  },
}
```

## 模型 ID

- `nvidia/llama-3.1-nemotron-70b-instruct`（默认）
- `meta/llama-3.3-70b-instruct`
- `nvidia/mistral-nemo-minitron-8b-8k-instruct`

## 注意事项

- OpenAI 兼容的 `/v1` 端点；使用来自 NVIDIA NGC 的 API 密钥。
- 当设置了 `NVIDIA_API_KEY` 时，提供商会自动启用；使用静态默认值（131,072 令牌上下文窗口，最大 4,096 令牌）。
