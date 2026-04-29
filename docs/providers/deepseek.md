---
summary: "DeepSeek 设置（认证 + 模型选择）"
title: "DeepSeek"
read_when:
  - 你想在 OpenClaw 中使用 DeepSeek
  - 你需要 API 密钥环境变量或 CLI 认证选项
---

[DeepSeek](https://www.deepseek.com) 提供强大的 AI 模型，并带有兼容 OpenAI 的 API。

| Property | Value                      |
| -------- | -------------------------- |
| Provider | `deepseek`                 |
| Auth     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI-compatible          |
| Base URL | `https://api.deepseek.com` |

## 开始使用

<Steps>
  <Step title="获取你的 API 密钥">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行 onboarding">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    这会提示你输入 API 密钥，并将 `deepseek/deepseek-v4-flash` 设置为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```

    要在不需要运行中的 Gateway 的情况下查看内置静态目录，
    请使用：

    ```bash
    openclaw models list --all --provider deepseek
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="非交互式设置">
    对于脚本化或无头安装，请直接传入所有标志：

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
如果 Gateway 以守护进程（launchd/systemd）运行，请确保 `DEEPSEEK_API_KEY`
对该进程可用（例如，放在 `~/.openclaw/.env` 中或通过
`env.shellEnv` 提供）。
</Warning>

## 内置目录

| Model ref                    | Name              | Input | Context   | Max output | Notes                                      |
| ---------------------------- | ----------------- | ----- | --------- | ---------- | ------------------------------------------ |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | text  | 1,000,000 | 384,000    | 默认模型；支持 V4 thinking 的接口        |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | text  | 1,000,000 | 384,000    | 支持 V4 thinking 的接口                   |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text  | 131,072   | 8,192      | DeepSeek V3.2 非 thinking 接口           |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text  | 131,072   | 65,536     | 支持推理的 V3.2 接口                      |

<Tip>
V4 模型支持 DeepSeek 的 `thinking` 控制。OpenClaw 还会在后续轮次重放
DeepSeek 的 `reasoning_content`，因此带工具调用的 thinking 会话可以继续。
</Tip>

## Thinking 与工具

DeepSeek V4 thinking 会话的重放契约比大多数兼容 OpenAI 的提供方更严格：
在启用 thinking 的轮次使用工具后，DeepSeek 期望该轮中重放的 assistant 消息在后续请求里包含
`reasoning_content`。OpenClaw 会在 DeepSeek 插件内部处理这一点，因此正常的多轮工具使用在
`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro` 上都能正常工作。

如果你将现有会话从另一个兼容 OpenAI 的提供方切换到 DeepSeek V4 模型，
较早的 assistant 工具调用轮次可能没有原生的 DeepSeek `reasoning_content`。OpenClaw 会在
重放给 DeepSeek V4 thinking 请求的 assistant 消息中补齐该缺失字段，这样提供方就能
接受历史记录而不需要 `/new`。

当在 OpenClaw 中禁用 thinking 时（包括 UI 中的 **None** 选项），OpenClaw 会发送
DeepSeek `thinking: { type: "disabled" }`，并从外发历史记录中移除重放的
`reasoning_content`。这会让禁用 thinking 的会话走 DeepSeek 的非 thinking 路径。

默认快速路径使用 `deepseek/deepseek-v4-flash`。当你想使用更强的 V4 模型并且可以接受
更高成本或更高延迟时，使用 `deepseek/deepseek-v4-pro`。

## 在线测试

直接在线模型套件中包含现代模型集合里的 DeepSeek V4。要仅运行 DeepSeek V4 的直接模型检查：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

该在线检查会验证两个 V4 模型都能完成，并且 thinking/tool 的后续轮次会保留 DeepSeek
所要求的重放载荷。

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
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
</CardGroup>
