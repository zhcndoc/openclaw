---
title: "Together AI"
summary: "Together AI setup (auth + model selection)"
read_when:
  - 你想使用 Together AI 与 OpenClaw 结合
  - 你需要 API 密钥环境变量或命令行认证选项
---

# Together AI

[Together AI](https://together.ai) 通过统一的 API 接入领先的开源模型，包括 Llama、DeepSeek、Kimi 等。

- 提供者：`together`
- 认证方式：`TOGETHER_API_KEY`
- API：兼容 OpenAI

## 快速开始

1. 设置 API 密钥（推荐：为 Gateway 存储密钥）：

```bash
openclaw onboard --auth-choice together-api-key
```

2. 设置默认模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## 非交互式示例

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

这将设置 `together/moonshotai/Kimi-K2.5` 作为默认模型。

## 环境说明

如果 Gateway 以守护进程方式运行（launchd/systemd），请确保 `TOGETHER_API_KEY`
对该进程可见（例如，放在 `~/.openclaw/.env` 中或通过 `env.shellEnv` 设置）。

## 可用模型

Together AI 提供许多流行的开源模型：

- **GLM 4.7 Fp8** - 默认模型，拥有 20 万上下文窗口
- **Llama 3.3 70B Instruct Turbo** - 快速高效的指令跟随模型
- **Llama 4 Scout** - 带有图像理解能力的视觉模型
- **Llama 4 Maverick** - 先进的视觉与推理模型
- **DeepSeek V3.1** - 强大的编码与推理模型
- **DeepSeek R1** - 高级推理模型
- **Kimi K2 Instruct** - 高性能模型，拥有 26.2 万上下文窗口

所有模型均支持标准聊天补全，并兼容 OpenAI API。
