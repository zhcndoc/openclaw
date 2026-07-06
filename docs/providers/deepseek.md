---
summary: "DeepSeek 设置（认证 + 模型选择）"
title: "DeepSeek"
read_when:
  - 你想在 OpenClaw 中使用 DeepSeek
  - 你需要 API 密钥环境变量或 CLI 认证选项
---

[DeepSeek](https://www.deepseek.com) 提供强大的 AI 模型，并带有兼容 OpenAI 的 API。

| 属性 | 值                         |
| -------- | -------------------------- |
| Provider | `deepseek`                 |
| Auth     | `DEEPSEEK_API_KEY`         |
| API      | OpenAI 兼容                 |
| Base URL | `https://api.deepseek.com` |

## 安装插件

安装官方插件，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/deepseek-provider
openclaw gateway restart
```

## 入门

<Steps>
  <Step title="获取你的 API 密钥">
    在 [platform.deepseek.com](https://platform.deepseek.com/api_keys) 创建一个 API 密钥。
  </Step>
  <Step title="运行 onboarding">
    ```bash
    openclaw onboard --auth-choice deepseek-api-key
    ```

    会提示你输入 API 密钥，并将 `deepseek/deepseek-v4-flash` 设为默认模型。

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider deepseek
    ```

    如需在没有运行 Gateway 的情况下查看插件的静态目录：

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
如果 Gateway 作为守护进程运行（launchd/systemd），请确保 `DEEPSEEK_API_KEY` 对该进程可用（例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
</Warning>

## 内置目录

| Model ref                    | Name              | Input | Context   | Max output | Notes                                      |
| ---------------------------- | ----------------- | ----- | --------- | ---------- | ------------------------------------------ |
| `deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | text  | 1,000,000 | 384,000    | 默认模型；支持 V4 thinking 的接口        |
| `deepseek/deepseek-v4-pro`   | DeepSeek V4 Pro   | text  | 1,000,000 | 384,000    | 支持 V4 thinking 的接口                   |
| `deepseek/deepseek-chat`     | DeepSeek Chat     | text  | 131,072   | 8,192      | DeepSeek V3.2 非 thinking 接口           |
| `deepseek/deepseek-reasoner` | DeepSeek Reasoner | text  | 131,072   | 65,536     | 支持推理的 V3.2 接口                      |

<Tip>
V4 模型支持 DeepSeek 的 `thinking` 控制。OpenClaw 也会在后续轮次中重放
DeepSeek 的 `reasoning_content`，因此带工具调用的 thinking 会话可以继续。
在 DeepSeek V4 模型上使用 `/think xhigh` 或 `/think max` 可请求 DeepSeek 的
最大 `reasoning_effort`；这两者都会映射为 `"max"`。
</Tip>

## Thinking 与工具

DeepSeek V4 thinking 会话要求将来自启用了 thinking 的轮次的已重放 assistant 消息
在后续请求中包含 `reasoning_content`。
OpenClaw 的 DeepSeek 插件会自动回填该字段，因此正常的多轮工具使用可以在
`deepseek/deepseek-v4-flash` 和 `deepseek/deepseek-v4-pro` 上正常工作，即使历史记录来自另一个
OpenAI 兼容提供商（没有原生 `reasoning_content`）或普通的 assistant 消息。
在会话中途切换提供商后，也不需要使用 `/new`。

当 thinking 被禁用时（包括 UI 中选择 **None**），OpenClaw 会发送
`thinking: { type: "disabled" }`，并从外发历史记录中移除重放的 `reasoning_content`，
使会话保持在非 thinking 的 DeepSeek 路径上。

默认的快速路径请使用 `deepseek/deepseek-v4-flash`。当你能接受更高
成本或延迟时，可使用更强的模型 `deepseek/deepseek-v4-pro`。

## 在线测试

若只运行现代模型 live 套件中 DeepSeek V4 直接模型检查，请执行：

```bash
OPENCLAW_LIVE_PROVIDERS=deepseek \
OPENCLAW_LIVE_MODELS="deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro" \
pnpm test:live src/agents/models.profiles.live.test.ts
```

用于验证两个 V4 模型都能完成，并且 thinking/tool 后续轮次会保留 DeepSeek 所需的重放载荷。

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
