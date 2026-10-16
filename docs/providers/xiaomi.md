---
summary: "将 Xiaomi MiMo 的按需付费和 Token Plan 模型与 OpenClaw 一起使用"
read_when:
  - "您想要 OpenClaw 中的 Xiaomi MiMo 模型"
  - "你需要 Xiaomi MiMo 认证或 Token Plan 配置"
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。官方外部 `xiaomi` 插件注册了两个文本提供商和一个语音（TTS）提供商：

- `xiaomi` - 按需付费密钥（`sk-...`）
- `xiaomi-token-plan` - 具有区域端点预设的 Token Plan 密钥（`tp-...`）

| 属性         | 值                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 提供商 ID     | `xiaomi`（即用即付）、`xiaomi-token-plan`（代币计划）                                                                                         |
| 认证环境变量    | `XIAOMI_API_KEY`, `XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| 引导配置标志 | `--auth-choice xiaomi-api-key`, `--auth-choice xiaomi-token-plan-cn`, `--auth-choice xiaomi-token-plan-sgp`, `--auth-choice xiaomi-token-plan-ams` |
| 直接 CLI 标志 | `--xiaomi-api-key <key>`, `--xiaomi-token-plan-api-key <key>`                                                                                      |
| API              | OpenAI- 兼容聊天完成 （`openai-completions`）                                                                                          |
| 语音契约  | `speechProviders: ["xiaomi"]`                                                                                                                      |
| 基本 URL        | 按量付费：`https://api.xiaomimimo.com/v1`；代币计划：`token-plan-{cn,sgp,ams}.xiaomimimo.com/v1`                                            |
| 默认模型   | `xiaomi/mimo-v2.6-pro`, `xiaomi-token-plan/mimo-v2.6-pro`                                                                                          |
| TTS 默认值      | `mimo-v2.5-tts`，语音 `mimo_default`；voicedesign 模型 `mimo-v2.5-tts-voicedesign`                                                               |

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/xiaomi-provider
    ```

    安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

  </Step>

  <Step id="get-the-right-key" title="获得正确的钥匙">
    在 [Xiaomi MiMo 控制台 ](https://platform.xiaomimimo.com/#/console/api-keys) 中创建即用即付密钥，或打开您的令牌计划订阅页面并复制区域 OpenAI- 兼容基础 URL 以及匹配的 `tp-...` 密钥。
  </Step>

  <Step id="run-onboarding" title="运行入门引导培训">
    按需付费：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    代币计划：

    ```bash
    openclaw onboard --auth-choice xiaomi-token-plan-sgp
    ```

    或直接传入密钥：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    openclaw onboard --auth-choice xiaomi-token-plan-sgp --xiaomi-token-plan-api-key "$XIAOMI_TOKEN_PLAN_API_KEY"
    ```

  </Step>
  <Step id="verify-the-model-is-available" title="验证模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    openclaw models list --provider xiaomi-token-plan
    ```
  </Step>
</Steps>

<Tip>
Onboarding 会验证密钥格式，并在将 `tp-...` 密钥输入按需付费路径，或将 `sk-...` 密钥输入 Token Plan 路径时发出警告。
</Tip>

## <a id="pay-as-you-go-catalog"></a> 按需付费模型目录

| 模型引用                         | 输入       | 上下文   | 最大输出 | 推理 | 笔记                  |
| --------------------------------- | ----------- | --------- | ---------- | --------- | ---------------------- |
| `xiaomi/mimo-v2.6-pro`            | 文本、图像 | 1,048,576 | 131,072    | 是       | 默认旗舰       |
| `xiaomi/mimo-v2.6-flash`          | 文本、图像 | 1,048,576 | 131,072    | 是       | 高效模式        |
| `xiaomi/mimo-v2.6-pro-ultraspeed` | 文本、图像 | 1,048,576 | 131,072    | 是       | 输出速度高达 20 倍 |
| `xiaomi/mimo-v2.5`                | 文本、图像 | 1,048,576 | 131,072    | 是       | 上一代    |
| `xiaomi/mimo-v2.5-pro`            | 文本        | 1,048,576 | 131,072    | 是       | 上一代    |

## <a id="token-plan-catalog"></a> Token Plan 模型目录

令牌计划设置会保存连接设置和别名，而无需将生成的目录行复制到您的配置中。显式 `models.mode: "replace"` 保持目录播种启用；自定义模型行保持不变。

选择与小米订阅 UI 中显示的区域基础 URL 相匹配的令牌计划身份验证选项：

| 认证选项             | 基础 URL                                   |
| ----------------------- | ------------------------------------------ |
| `xiaomi-token-plan-cn`  | `https://token-plan-cn.xiaomimimo.com/v1`  |
| `xiaomi-token-plan-sgp` | `https://token-plan-sgp.xiaomimimo.com/v1` |
| `xiaomi-token-plan-ams` | `https://token-plan-ams.xiaomimimo.com/v1` |

| 模型引用                           | 输入       | 上下文   | 最大输出 | 推理 | 笔记               |
| ----------------------------------- | ----------- | --------- | ---------- | --------- | ------------------- |
| `xiaomi-token-plan/mimo-v2.6-pro`   | 文本、图像 | 1,048,576 | 131,072    | 是       | 默认模型       |
| `xiaomi-token-plan/mimo-v2.6-flash` | 文本、图像 | 1,048,576 | 131,072    | 是       | 高效模式     |
| `xiaomi-token-plan/mimo-v2.5-pro`   | 文本        | 1,048,576 | 131,072    | 是       | 上一代 |
| `xiaomi-token-plan/mimo-v2.5`       | 文本、图像 | 1,048,576 | 131,072    | 是       | 上一代 |

`xiaomi-token-plan` 需要区域基地 URL 来解决。支持的路径是令牌计划加入选择或设置了 `baseUrl` 的显式 `models.providers.xiaomi-token-plan` 配置块；如果没有其中之一，则不会提供该提供商。

## <a id="reasoning-models"></a> 推理模型

MiMo V2.5 和 V2.6 文本模型支持 OpenClaw 的 [`/think` 指令 ](/tools/thinking)，级别为 `off`、`minimal`、`low`、 `medium`、`high`、`xhigh` 和 `max`（默认 `high`）。

## <a id="text-to-speech"></a> 文本转语音

`xiaomi` 插件还会将 Xiaomi MiMo 注册为 `tts` 的语音提供商。 它会调用小米的聊天补全 TTS 接口契约，将文本作为 `assistant` 消息发送，并将可选的风格指导作为 `user` 消息发送。

| 属性 | 值                                    |
| -------- | ---------------------------------------- |
| TTS 标识   | `xiaomi`（`mimo` 别名）                  |
| 认证     | `XIAOMI_API_KEY`                         |
| API      | `POST /v1/chat/completions` 与 `audio` |
| 默认值  | `mimo-v2.5-tts`，语音 `mimo_default`    |
| 输出   | 默认输出 MP3；配置后为 WAV      |

```json5
{
  tts: {
    auto: "always",
    provider: "xiaomi",
    providers: {
      xiaomi: {
        apiKey: "${XIAOMI_API_KEY}",
        model: "mimo-v2.5-tts",
        speakerVoice: "mimo_default",
        format: "mp3",
        style: "Bright, natural, conversational tone.",
      },
    },
  },
}
```

内置语音：`mimo_default`、`default_zh`、`default_en`、`Mia`、`Chloe`、 `Milo`、`Dean`。预设语音模型 `mimo-v2.5-tts` 使用 `audio.voice`，因此 OpenClaw 会为该模型发送 `speakerVoice`。

voicedesign 模型 `mimo-v2.5-tts-voicedesign` 会根据自然语言风格提示词生成语音，而不是使用预设语音 id。将 `style` 设为所需的语音描述；OpenClaw 会将其作为 `user` 消息发送，将朗读文本作为 `assistant` 消息发送，并且对该模型省略 `audio.voice`。

```json5
{
  tts: {
    provider: "xiaomi",
    providers: {
      xiaomi: {
        model: "mimo-v2.5-tts-voicedesign",
        format: "wav",
        style: "Warm, natural female voice with clear pronunciation.",
      },
    },
  },
}
```

对于请求语音笔记合成目标的渠道（Discord、Feishu、Matrix、Telegram 和 WhatsApp），OpenClaw 会在交付前使用 `ffmpeg` 将 Xiaomi 输出转码为 48kHz 单声道 Opus。

## <a id="config-example"></a> 配置示例

```json5
{
  env: { vars: { XIAOMI_API_KEY: "your-key" } },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2.6-pro" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2.6-pro",
            name: "Xiaomi MiMo V2.6 Pro",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 131072,
          },
          {
            id: "mimo-v2.6-flash",
            name: "Xiaomi MiMo V2.6 Flash",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

定价和兼容性标志来自插件清单，因此配置示例省略了 `cost` 和 `compat`，以避免与运行时行为不一致。

代币计划：

```json5
{
  env: { vars: { XIAOMI_TOKEN_PLAN_API_KEY: "tp-your-key" } },
  agents: { defaults: { model: { primary: "xiaomi-token-plan/mimo-v2.6-pro" } } },
  models: {
    mode: "merge",
    providers: {
      "xiaomi-token-plan": {
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_TOKEN_PLAN_API_KEY",
        models: [
          {
            id: "mimo-v2.6-pro",
            name: "Xiaomi MiMo V2.6 Pro",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 131072,
          },
          {
            id: "mimo-v2.6-flash",
            name: "Xiaomi MiMo V2.6 Flash",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 1048576,
            maxTokens: 131072,
          },
        ],
      },
    },
  },
}
```

令牌计划按固定订阅的积分收费，而不是按令牌 USD 定价，因此其目录行使用零 USD 成本，并且配置示例省略了 `cost`。

<AccordionGroup>
  <Accordion id="auto-injection-behavior" title="自动注入行为">
    当您的环境中设置了 `XIAOMI_API_KEY` 或存在身份验证配置文件时，`xiaomi` 提供程序会自动启用。 `xiaomi-token-plan` 需要区域基础 URL，因此支持的路径是令牌计划加入选择或显式 `models.providers.xiaomi-token-plan` 配置块。
  </Accordion>

  <Accordion id="model-details" title="模型详情">
    - **mimo-v2.6-pro** - 旗舰推理模型和两个提供商的默认模型。
    - **mimo-v2.6-flash** - 高效的即用即付和代币计划路线。
    - **mimo-v2.6-pro-ultraspeed** - 按量付费旗舰路线，输出速度高达20倍。
    - **mimo-v2.5** 和 **mimo-v2.5-pro** - 上一代兼容路线。

    <Note>
    按需付费模型使用 `xiaomi/` 前缀。Token Plan 模型使用 `xiaomi-token-plan/` 前缀。
    </Note>

  </Accordion>

  <Accordion id="troubleshooting" title="故障排查">
    - 如果模型没有出现，请确认相关的密钥环境变量或认证配置文件已存在且有效。
    - 对于 Token Plan，请确认所选 onboarding 区域与订阅页面的 base URL 一致，并且密钥以 `tp-` 开头。
    - 当网关作为守护进程运行时，使密钥可供该进程使用（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对于守护程序管理的网关进程不可见。使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置来实现持久可用性。
    </Warning>

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="思考级别" href="/tools/thinking" icon="brain">
    `/think` 指令语法和层级映射。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Xiaomi MiMo控制台" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 仪表盘和 API 密钥管理。
  </Card>
</CardGroup>
