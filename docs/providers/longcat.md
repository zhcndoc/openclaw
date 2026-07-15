---
summary: "LongCat API 设置用于 LongCat-2.0"
title: "LongCat"
read_when:
  - 你想在 OpenClaw 中使用 LongCat-2.0
  - 你需要 LongCat API 密钥或模型限制
---

[LongCat](https://longcat.ai) 为 LongCat-2.0 提供托管 API，LongCat-2.0 是一款专为编码和智能体工作负载打造的推理模型。OpenClaw 为 LongCat 的 OpenAI 兼容端点提供官方 `longcat` 插件。

| Property   | Value                              |
| ---------- | ---------------------------------- |
| Provider   | `longcat`                          |
| Auth       | `LONGCAT_API_KEY`                  |
| API        | OpenAI-compatible Chat Completions |
| Base URL   | `https://api.longcat.chat/openai`  |
| Model      | `longcat/LongCat-2.0`              |
| Context    | 1,048,576 tokens                   |
| Max output | 131,072 tokens                     |
| Input      | Text                               |

## 安装插件

安装官方包，然后重启 Gateway：

```bash
openclaw plugins install @openclaw/longcat-provider
openclaw gateway restart
```

## 开始使用

<Steps>
  <Step title="创建 API 密钥">
    登录 [LongCat API 平台](https://longcat.chat/platform/)，并在
    [API Keys](https://longcat.chat/platform/api_keys)
    页面创建一个密钥。
  </Step>
  <Step title="运行 onboarding">
    ```bash
    openclaw onboard --auth-choice longcat-api-key
    ```
  </Step>
  <Step title="验证模型">
    ```bash
    openclaw models list --provider longcat
    ```
  </Step>
</Steps>

onboarding 会添加托管目录，并在尚未配置主模型时选择 `longcat/LongCat-2.0`。

### 非交互式设置

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice longcat-api-key \
  --longcat-api-key "$LONGCAT_API_KEY"
```

## 推理行为

LongCat 提供二元思考控制。OpenClaw 将启用的思考级别映射为
`thinking: { type: "enabled" }`，并将 `/think off` 映射为
`thinking: { type: "disabled" }`。LongCat 目前没有记录
`reasoning_effort`，因此 OpenClaw 不会发送它。

LongCat 会在 `reasoning_content` 中返回推理内容。OpenClaw 在重放 assistant 工具调用轮次时会保留该字段，
以便多轮 agent 会话保持提供方期望的消息结构。

## 定价

内置目录使用 LongCat 的按量付费价目表，价格以每百万 token 计美元：未缓存输入 $0.75、缓存输入 $0.015，以及输出 $2.95。LongCat 可能会提供临时折扣；[定价页面](https://longcat.chat/platform/docs/Pricing/LongCat-2.0.html)
和您的账单记录为准。

## 自托管 LongCat-2.0

`longcat` 提供商面向 LongCat 的托管 API。对于 [Hugging Face](https://huggingface.co/meituan-longcat/LongCat-2.0) 上的开源权重，请通过兼容 OpenAI 的运行时来提供该模型，并改用 OpenClaw 现有的 [vLLM](/providers/vllm) 或 [SGLang](/providers/sglang) 提供商。

请在自托管提供商目录中保留运行时的精确模型标识符；不要将本地部署路由到 `longcat/LongCat-2.0`。

## 故障排查

<AccordionGroup>
  <Accordion title="密钥在 shell 中可用，但在 Gateway 中不可用">
    由守护进程管理的 Gateway 进程不会继承所有交互式 shell 变量。将 `LONGCAT_API_KEY` 放入 `~/.openclaw/.env`，通过
    onboarding 配置，或使用已批准的密钥引用。
  </Accordion>

  <Accordion title="请求失败，返回 402 或 429">
    `402` 表示账户的 token 配额不足。`429` 表示 API
    key 触发了速率限制。查看 [LongCat 使用情况](https://longcat.chat/platform/usage)
    并在提供方的退避窗口结束后重试受限请求。
  </Accordion>

  <Accordion title="模型没有出现">
    运行 `openclaw plugins list` 并确认 `longcat` 插件已
    启用，然后运行 `openclaw models list --provider longcat`。
  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供商配置、模型引用和故障转移行为。
  </Card>
  <Card title="LongCat API 文档" href="https://longcat.chat/platform/docs/" icon="arrow-up-right-from-square">
    托管 API 端点、身份验证、限制和示例。
  </Card>
  <Card title="LongCat-2.0 模型卡片" href="https://huggingface.co/meituan-longcat/LongCat-2.0" icon="arrow-up-right-from-square">
    架构、部署指南和模型详情。
  </Card>
  <Card title="密钥" href="/gateway/secrets" icon="key">
    存储提供商凭证，而无需将明文嵌入配置中。
  </Card>
</CardGroup>
