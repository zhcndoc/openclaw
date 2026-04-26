---
summary: "DeepSeek 设置（认证 + 模型选择）"
title: "DeepSeek"
read_when:
  - 您希望将 DeepSeek 与 OpenClaw 配合使用
  - 您需要 API 密钥环境变量或 CLI 认证选项
---

[DeepSeek](https://www.deepseek.com) 提供强大的 AI 模型，并支持 OpenAI 兼容的 API。

| 属性     | 值                         |
| -------- | -------------------------- |
| 提供商   | `deepseek`                 |
| 认证     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI 兼容                |
| 基础 URL | `https://api.deepseek.com` |

## 入门指南

<Steps>
  <Step title="获取您的 API 密钥">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 创建 API 密钥。
  </Step>
  <Step title="运行引导流程">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    这将提示您输入 API 密钥，并将 `deepseek/deepseek-v4-flash` 设为默认模型。

  </Step>
  <Step title="验证模型可用性">
    ```bash
    openclaw models list --provider deepseek
    ```

    要在不启动 Gateway 的情况下查看内置静态目录，
    请使用：

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非交互式设置">
    对于脚本化或无头安装，直接传递所有标志：

    ```bash
    openclaw onboard --non-interactive \
      --mode local \
      --auth-choice deepseek-api-key \
      --deepseek-api-key "$DEEPSEEK_API_KEY" \
      --skip-health \
      --accept-risk
    ```

  </Accordion>
</AccordionGroup>

<Warning>
如果 Gateway 作为守护进程运行（launchd/systemd），请确保该进程可以使用 `DEEPSEEK_API_KEY`
（例如，在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。
</Warning>

## 内置目录

| Model ref                    | Name              | Input | Context   | Max output | Notes                                      |
| ---------------------------- | ----------------- | ----- | --------- | ---------- | ------------------------------------------ |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | text  | 1,000,000 | 384,000    | 默认模型；具备 V4 thinking 能力的接口         |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | text  | 1,000,000 | 384,000    | 具备 V4 thinking 能力的接口                  |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text  | 131,072   | 8,192      | DeepSeek V3.2 non-thinking 接口             |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text  | 131,072   | 65,536     | 支持推理的 V3.2 接口                        |

<Tip>
V4 模型支持 DeepSeek 的 `thinking` 控制。OpenClaw 还会在后续轮次中重放
DeepSeek 的 `reasoning_content`，因此带有工具调用的思考会话可以继续进行。
</Tip>

## Thinking 和工具

DeepSeek V4 thinking 会话的重放契约比大多数
OpenAI 兼容提供商更严格：当启用了 thinking 的 assistant 消息包含
工具调用时，DeepSeek 期望将先前 assistant 的 `reasoning_content` 在
后续请求中一并发送回去。OpenClaw 会在 DeepSeek 插件内部处理这一点，
因此使用 `deepseek/deepseek-v4-flash` 和
`deepseek/deepseek-v4-pro` 时，正常的多轮工具使用可以正常工作。

当在 OpenClaw 中禁用 thinking 时（包括 UI 中选择 **None**），
OpenClaw 会发送 DeepSeek `thinking: { type: "disabled" }`，并从
发出的历史记录中移除已重放的 `reasoning_content`。这使得禁用 thinking 的
会话保持在 DeepSeek 的非 thinking 路径上。

默认快速路径请使用 `deepseek/deepseek-v4-flash`。当您希望使用更强大的 V4 模型，
并且可以接受更高的成本或延迟时，请使用
`deepseek/deepseek-v4-pro`。

## 实时测试

直接实时模型套件包含现代模型集合中的 DeepSeek V4。若要
仅运行 DeepSeek V4 直接模型检查：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

该实时检查会验证两个 V4 模型都能完成，以及 thinking/tool
后续轮次会保留 DeepSeek 所需的重放负载。

## 配置示例

```json5
{
  env: { DEEPSEEK_API_KEY: "sk-..." },
  agents: {
    defaults: {
      model: { primary: "deepseek/deepseek-v4-flash" },
    },
  },
}
```

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    代理、模型和提供商的完整配置参考。
  </Card>
</CardGroup>
