---
summary: "Cohere 设置（认证 + 模型选择）"
title: "Cohere"
read_when:
  - 你想在 OpenClaw 中使用 Cohere
  - 你需要 Cohere API 密钥环境变量或 CLI 认证选项
---

[Cohere](https://cohere.com) 通过其兼容性 API 提供与 OpenAI 兼容的推理。OpenClaw 在外部化迁移期间捆绑了 Cohere 提供程序，并将其作为官方外部插件发布。

| 属性              | 值                                                   |
| --------------- | ---------------------------------------------------- |
| 提供程序 id      | `cohere`                                             |
| 插件             | 迁移期间随附；官方外部包                                  |
| 认证环境变量     | `COHERE_API_KEY`                                     |
| 上线标志         | `--auth-choice cohere-api-key`                       |
| 直接 CLI 标志    | `--cohere-api-key <key>`                             |
| API             | 与 OpenAI 兼容（`openai-completions`）                |
| 基础 URL         | `https://api.cohere.ai/compatibility/v1`             |
| 默认模型         | `cohere/command-a-plus-05-2026`                      |
| 上下文窗口       | 128,000 tokens                                       |

## 内置目录

| Model ref                            | 输入       | 上下文 | 最大输出 | 备注                                          |
| ------------------------------------ | ----------- | ------- | -------- | --------------------------------------------- |
| `cohere/command-a-plus-05-2026`      | 文本、图像   | 128,000 | 64,000     | 默认；旗舰级 agentic 与推理模型               |
| `cohere/command-a-03-2025`           | 文本        | 256,000 | 8,000      | 之前的 Command A 模型                         |
| `cohere/command-a-reasoning-08-2025` | 文本        | 256,000 | 32,000     | Agentic 推理与工具使用                        |
| `cohere/command-a-vision-07-2025`    | 文本、图像   | 128,000 | 8,000      | 视觉与文档分析；不支持工具使用                |
| `cohere/north-mini-code-1-0`         | 文本、图像   | 256,000 | 64,000     | Agentic 编码；推理；免费额度                  |

支持推理的 Cohere 模型支持两种 Compatibility API 推理模式。OpenClaw 将 **off** 映射为 `none`，并将所有已启用的 thinking 级别映射为 `high`。Command A Vision 不支持工具使用，因此 OpenClaw 会为该模型保持 agent 工具禁用。

## 开始使用

1. Cohere 随附当前的 OpenClaw 包。如果缺少，请安装外部包并重启 Gateway：

```bash
openclaw plugins install @openclaw/cohere-provider
openclaw gateway restart
```

2. 创建一个 Cohere API 密钥。
3. 运行 onboarding：

```bash
openclaw onboard --non-interactive \
  --auth-choice cohere-api-key \
  --cohere-api-key "$COHERE_API_KEY"
```

4. 确认模型目录可用：

```bash
openclaw models list --provider cohere
```

仅当尚未配置主模型时，onboarding 才会将 Cohere 设为主模型。

## 仅使用环境变量的设置

将 `COHERE_API_KEY` 提供给 Gateway 进程，然后选择 Cohere 模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "cohere/command-a-plus-05-2026" },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程或在 Docker 中运行，请为该服务设置 `COHERE_API_KEY`。仅在交互式 shell 中导出它，并不会让它对已经运行的 Gateway 可用。
</Note>

## 相关内容

- [模型提供方](/concepts/model-providers)
- [Models CLI](/cli/models)
- [提供方目录](/providers/index)
