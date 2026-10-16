---
summary: "Cohere 设置（认证 + 模型选择）"
title: "Cohere"
read_when:
  - "您想要将 Cohere 与 OpenClaw 一起使用"
  - "你需要 Cohere API 密钥环境变量或 CLI 认证选项"
---

[Cohere](https://cohere.com) 通过其兼容性 API 提供 OpenAI- 兼容推理。 OpenClaw 提供 Cohere 作为官方外部插件。

| 属性        | 值                                    |
| --------------- | ---------------------------------------- |
| 提供方 id     | `cohere`                                 |
| 插件          | `@openclaw/cohere-provider`              |
| 认证环境变量    | `COHERE_API_KEY`                         |
| 引导标志 | `--auth-choice cohere-api-key`           |
| 直接 CLI 标志 | `--cohere-api-key <key>`                 |
| API             | OpenAI-兼容（`openai-completions`） |
| 基础 URL        | `https://api.cohere.ai/compatibility/v1` |
| 默认模型   | `cohere/command-a-plus-05-2026`          |
| 上下文窗口  | 128,000 个令牌                           |

## <a id="built-in-catalog"></a> 内置目录

| 模型引用                            | 可见性 | 输入       | 上下文 | 最大输出 | 笔记                                         |
| ------------------------------------ | ---------- | ----------- | ------- | ---------- | --------------------------------------------- |
| `cohere/command-a-plus-05-2026`      | 可见    | 文本、图像 | 128,000 | 64,000     | 默认；旗舰级代理和推理模型 |
| `cohere/command-a-03-2025`           | 隐藏     | 文本        | 256,000 | 8,000      | 上一代模型；已由 Command A+ 替代   |
| `cohere/command-a-reasoning-08-2025` | 隐藏     | 文本        | 256,000 | 32,000     | 上一代模型；已由 Command A+ 替代   |
| `cohere/command-a-vision-07-2025`    | 隐藏     | 文本、图像 | 128,000 | 8,000      | 上一代模型；已由 Command A+ 替代   |
| `cohere/north-mini-code-1-0`         | 可见    | 文本        | 256,000 | 64,000     | 代理式编程；推理；免费额度        |

支持推理的 Cohere 模型支持两种兼容性 API 推理模式。OpenClaw 将 **off** 映射为 `none`，并将所有已启用的思考级别映射为 `high`。Command A Vision 不支持工具使用，因此 OpenClaw 会为该模型保持代理工具禁用。

## <a id="get-started"></a> 开始使用

1. 安装官方插件：

```bash
openclaw plugins install @openclaw/cohere-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

2. 创建一个 Cohere API 密钥。
3. 运行引导流程：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice cohere-api-key \
  --cohere-api-key "$COHERE_API_KEY"
```

4. 确认模型目录可用：

```bash
openclaw models list --provider cohere
```

仅当尚未配置主模型时，引导流程才会将 Cohere 设为主模型。

Onboarding 会保留您的模型条目，并将生成的目录行留给发现。对于 `models.mode: "replace"`，它还会写入内置目录，因为该模式会跳过发现。

## <a id="environment-only-setup"></a> 仅使用环境变量的设置

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

## <a id="related"></a> 相关内容

- [模型提供商](/concepts/model-providers)
- [模型 CLI](/cli/models)
- [提供商目录](/providers/index)
