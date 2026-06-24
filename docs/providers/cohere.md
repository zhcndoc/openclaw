---
summary: "Cohere 设置（认证 + 模型选择）"
title: "Cohere"
read_when:
  - 你想在 OpenClaw 中使用 Cohere
  - 你需要 Cohere API 密钥环境变量或 CLI 认证选项
---

[Cohere](https://cohere.com) 通过其 Compatibility API 提供与 OpenAI 兼容的推理能力。OpenClaw 在其外部化迁移期间随附 Cohere provider，并且还将其作为官方外部插件发布，提供 Command A 模型目录。

| Property        | Value                                                |
| --------------- | ---------------------------------------------------- |
| Provider id     | `cohere`                                             |
| Plugin          | 迁移期间随附；官方外部包                                    |
| Auth env var    | `COHERE_API_KEY`                                     |
| Onboarding flag | `--auth-choice cohere-api-key`                       |
| Direct CLI flag | `--cohere-api-key <key>`                             |
| API             | 与 OpenAI 兼容（`openai-completions`）                |
| Base URL        | `https://api.cohere.ai/compatibility/v1`             |
| Default model   | `cohere/command-a-03-2025`                           |

## 开始使用

1. 当前 OpenClaw 包中已包含 Cohere。如果不可用，请安装外部包并重启 Gateway：

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

默认模型仅在尚未配置主模型时设置。

## 仅使用环境变量的设置

将 `COHERE_API_KEY` 提供给 Gateway 进程，然后选择 Cohere 模型：

```json5
{
  agents: {
    defaults: {
      model: { primary: "cohere/command-a-03-2025" },
    },
  },
}
```

<Note>
如果 Gateway 作为守护进程或在 Docker 中运行，请为该服务配置 `COHERE_API_KEY`。仅在交互式 shell 中导出它，不会让已运行的 Gateway 访问到它。
</Note>

## 相关内容

- [模型提供方](/concepts/model-providers)
- [Models CLI](/cli/models)
- [提供方目录](/providers)
