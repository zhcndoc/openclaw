---
summary: "Cohere 设置（认证 + 模型选择）"
title: "Cohere"
read_when:
  - 你想在 OpenClaw 中使用 Cohere
  - 你需要 Cohere API 密钥环境变量或 CLI 认证选项
---

[Cohere](https://cohere.com) 通过其兼容性 API 提供与 OpenAI 兼容的推理服务。OpenClaw 将 Cohere 作为官方外部插件提供。

| 属性             | 值                                        |
| ---------------- | ----------------------------------------- |
| 提供商 ID        | `cohere`                                  |
| 插件             | `@openclaw/cohere-provider`               |
| 认证环境变量     | `COHERE_API_KEY`                          |
| 引导标志         | `--auth-choice cohere-api-key`            |
| 直接 CLI 标志    | `--cohere-api-key <key>`                  |
| API              | 与 OpenAI 兼容（`openai-completions`）    |
| 基础 URL         | `https://api.cohere.ai/compatibility/v1`  |
| 默认模型         | `cohere/command-a-plus-05-2026`           |
| 上下文窗口       | 128,000 个令牌                            |

## 内置目录

| 模型引用                             | 可见性     | 输入        | 上下文  | 最大输出   | 备注                                         |
| ------------------------------------ | ---------- | ----------- | ------- | ---------- | -------------------------------------------- |
| `cohere/command-a-plus-05-2026`      | 可见       | 文本、图像  | 128,000 | 64,000     | 默认；旗舰级代理和推理模型                   |
| `cohere/command-a-03-2025`           | 隐藏       | 文本        | 256,000 | 8,000      | 上一代模型；已由 Command A+ 替代             |
| `cohere/command-a-reasoning-08-2025` | 隐藏       | 文本        | 256,000 | 32,000     | 上一代模型；已由 Command A+ 替代             |
| `cohere/command-a-vision-07-2025`    | 隐藏       | 文本、图像  | 128,000 | 8,000      | 上一代模型；已由 Command A+ 替代             |
| `cohere/north-mini-code-1-0`         | 可见       | 文本、图像  | 256,000 | 64,000     | 代理式编程；推理；免费额度                   |

支持推理的 Cohere 模型支持两种兼容性 API 推理模式。OpenClaw 将 **off** 映射为 `none`，并将所有已启用的思考级别映射为 `high`。Command A Vision 不支持工具使用，因此 OpenClaw 会为该模型保持代理工具禁用。

## 开始使用

1. 安装官方插件并重启网关：

```bash
openclaw plugins install @openclaw/cohere-provider
openclaw gateway restart
```

2. 创建一个 Cohere API 密钥。
3. 运行引导流程：

```bash
openclaw onboard --non-interactive \
  --auth-choice cohere-api-key \
  --cohere-api-key "$COHERE_API_KEY"
```

4. 确认模型目录可用：

```bash
openclaw models list --provider cohere
```

仅当尚未配置主模型时，引导流程才会将 Cohere 设为主模型。

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
