---
summary: "LongCat API 设置用于 LongCat-2.0"
title: "LongCat"
read_when:
  - "你想在 OpenClaw 中使用 LongCat-2.0"
  - "你需要 LongCat API 密钥或模型限制"
---

[LongCat](https://longcat.ai) 为 LongCat-2.0 提供托管 API，这是一个为编码和代理工作负载构建的推理模型。 OpenClaw 为 LongCat 的 OpenAI- 兼容端点提供官方 LongCat 插件。

| 属性   | 值                              |
| ---------- | ---------------------------------- |
| 提供者   | `longcat`                          |
| 认证       | `LONGCAT_API_KEY`                  |
| API        | OpenAI- 兼容聊天完成 |
| 基础 URL   | `https://api.longcat.chat/openai`  |
| 模型      | `longcat/LongCat-2.0`              |
| 上下文    | 1,048,576 个令牌                   |
| 最大输出 | 131,072 个令牌                     |
| 输入      | 文本                               |

## <a id="install-plugin"></a> 安装插件

安装官方包：

```bash
openclaw plugins install @openclaw/longcat-provider
```

安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="create-an-api-key" title="创建 API 密钥">
    登录[LongCat API Platform](https://longcat.chat/platform/)，在[API Keys](https://longcat.chat/platform/api_keys)页面创建密钥。
  </Step>
  <Step id="run-onboarding" title="运行入门引导培训">
    ```bash
    openclaw onboard --auth-choice longcat-api-key
    ```
  </Step>
  <Step id="verify-the-model" title="验证模型">
    ```bash
    openclaw models list --provider longcat
    ```
  </Step>
</Steps>

onboarding 会添加托管目录，并在尚未配置主模型时选择 `longcat/LongCat-2.0`。

### <a id="non-interactive-setup"></a> 非交互式设置

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice longcat-api-key \
  --longcat-api-key "$LONGCAT_API_KEY"
```

## <a id="reasoning-behavior"></a> 推理行为

LongCat 暴露了二元思维控制。 OpenClaw 将启用的思维级别映射到 `thinking: { type: "enabled" }`，将 `/think off` 映射到 `thinking: { type: "disabled" }`。 OpenClaw 从 LongCat 请求中删除 `reasoning_effort`。

LongCat 会在 `reasoning_content` 中返回推理内容。OpenClaw 在重放 assistant 工具调用轮次时会保留该字段， 以便多轮 agent 会话保持提供方期望的消息结构。

## <a id="pricing"></a> 定价

内置目录使用 LongCat 的即用即付定价（以每百万代币 USD 为单位）：$0.75 未缓存输入、$0.015 缓存输入和 $2.95 输出。 LongCat可能会提供临时折扣； [定价页面](https://longcat.chat/platform/docs/pricing/long-cat-2.0)和您的账单记录具有权威性。

## <a id="self-hosted-longcat-2.0"></a><a id="self-hosted-longcat-2-0"></a> 自托管 LongCat-2.0

`longcat` 提供程序以 LongCat 的托管 API 为目标。对于 [Hugging Face](https://huggingface.co/meituan-longcat/LongCat-2.0) 上的开放权重，通过 OpenAI- 兼容运行时为模型提供服务，并使用 OpenClaw 的现有 [vLLM](/providers/vllm) 或 [SGLang](/providers/sglang) 提供程序相反。

请在自托管提供商目录中保留运行时的精确模型标识符；不要将本地部署路由到 `longcat/LongCat-2.0`。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="the-key-works-in-a-shell-but-not-in-the-gateway" title="密钥在 shell 中有效，但在网关中无效">
    由守护进程管理的 Gateway 进程不会继承所有交互式 shell 变量。将 `LONGCAT_API_KEY` 放入 `~/.openclaw/.env`，通过 onboarding 配置，或使用已批准的密钥引用。
  </Accordion>

  <Accordion id="requests-fail-with-402-or-429" title="请求失败并显示 402 或 429">
    `402` 表示账户的 token 配额不足。`429` 表示 API key 触发了速率限制。查看 [LongCat 使用情况](https://longcat.chat/platform/usage) 并在提供方的退避窗口结束后重试受限请求。
  </Accordion>

  <Accordion id="the-model-does-not-appear" title="模型没有出现">
    运行 `openclaw plugins list` 并确认 `longcat` 插件已启用，然后运行 `openclaw models list --provider longcat`。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="模型提供商" href="/concepts/model-providers" icon="layers">
    提供商配置、模型引用和故障转移行为。
  </Card>
  <Card title="LongCat API 文档" href="https://longcat.chat/platform/docs/" icon="arrow-up-right-from-square">
    托管 API 端点、身份验证、限制和示例。
  </Card>
  <Card title="LongCat-2.0模型卡" href="https://huggingface.co/meituan-longcat/LongCat-2.0" icon="arrow-up-right-from-square">
    架构、部署指南和模型详情。
  </Card>
  <Card title="密钥" href="/gateway/secrets" icon="key">
    存储提供商凭证，而无需将明文嵌入配置中。
  </Card>
</CardGroup>
