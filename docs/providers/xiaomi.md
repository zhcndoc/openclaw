---
summary: "将 Xiaomi MiMo 的按需付费和 Token Plan 模型与 OpenClaw 一起使用"
read_when:
  - 你想在 OpenClaw 中使用 Xiaomi MiMo 模型
  - 你需要 Xiaomi MiMo 认证或 Token Plan 配置
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。捆绑的 `xiaomi`
插件（`enabledByDefault: true`，无需安装步骤）注册了两个文本
提供者以及一个语音（TTS）提供者：

- `xiaomi` - 按需付费密钥（`sk-...`）
- `xiaomi-token-plan` - 具有区域端点预设的 Token Plan 密钥（`tp-...`）

| Property         | Value                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider ids     | `xiaomi`（按需付费），`xiaomi-token-plan`（Token Plan）                                                                                         |
| Auth env vars    | `XIAOMI_API_KEY`, `XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                      |
| Onboarding flags | `--auth-choice xiaomi-api-key`, `--auth-choice xiaomi-token-plan-cn`, `--auth-choice xiaomi-token-plan-sgp`, `--auth-choice xiaomi-token-plan-ams` |
| Direct CLI flags | `--xiaomi-api-key <key>`, `--xiaomi-token-plan-api-key <key>`                                                                                      |
| API              | 兼容 OpenAI 的 chat completions（`openai-completions`）                                                                                          |
| Speech contract  | `speechProviders: ["xiaomi"]`                                                                                                                      |
| Base URLs        | 按需付费：`https://api.xiaomimimo.com/v1`; Token Plan：`token-plan-{cn,sgp,ams}.xiaomimimo.com/v1`                                            |
| Default models   | `xiaomi/mimo-v2-flash`, `xiaomi-token-plan/mimo-v2.5-pro`                                                                                          |
| TTS default      | `mimo-v2.5-tts`，语音 `mimo_default`；voicedesign 模型 `mimo-v2.5-tts-voicedesign`                                                               |

## 开始使用

<Steps>
  <Step title="获取正确的密钥">
    在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建一个按需付费密钥，或者打开你的 Token Plan 订阅页面，复制对应区域的 OpenAI 兼容 base URL 以及匹配的 `tp-...` 密钥。
  </Step>

  <Step title="运行 onboarding">
    按需付费：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    Token Plan：

    ```bash
    openclaw onboard --auth-choice xiaomi-token-plan-sgp
    ```

    或直接传入密钥：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    openclaw onboard --auth-choice xiaomi-token-plan-sgp --xiaomi-token-plan-api-key "$XIAOMI_TOKEN_PLAN_API_KEY"
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    openclaw models list --provider xiaomi-token-plan
    ```
  </Step>
</Steps>

<Tip>
Onboarding 会验证密钥格式，并在将 `tp-...` 密钥输入按需付费路径，或将 `sk-...` 密钥输入 Token Plan 路径时发出警告。
</Tip>

## 按需付费模型目录

| Model ref              | Input       | Context   | Max output | Reasoning | Notes         |
| ---------------------- | ----------- | --------- | ---------- | --------- | ------------- |
| `xiaomi/mimo-v2-flash` | text        | 262,144   | 8,192      | No        | 默认模型      |
| `xiaomi/mimo-v2-pro`   | text        | 1,048,576 | 32,000     | Yes       | 大上下文      |
| `xiaomi/mimo-v2-omni`  | text, image | 262,144   | 32,000     | Yes       | 多模态       |

## Token Plan 模型目录

选择与 Xiaomi 订阅界面中显示的区域 base URL 匹配的 Token Plan 认证选项：

| Auth choice             | Base URL                                   |
| ----------------------- | ------------------------------------------ |
| `xiaomi-token-plan-cn`  | `https://token-plan-cn.xiaomimimo.com/v1`  |
| `xiaomi-token-plan-sgp` | `https://token-plan-sgp.xiaomimimo.com/v1` |
| `xiaomi-token-plan-ams` | `https://token-plan-ams.xiaomimimo.com/v1` |

| Model ref                         | Input       | Context   | Max output | Reasoning | Notes         |
| --------------------------------- | ----------- | --------- | ---------- | --------- | ------------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | text        | 1,048,576 | 131,072    | Yes       | 默认模型       |
| `xiaomi-token-plan/mimo-v2.5`     | text, image | 1,048,576 | 131,072    | Yes       | 多模态       |

`xiaomi-token-plan` 需要一个区域 base URL 才能解析。支持的方式是使用打包的 Token Plan onboarding 选项，或显式提供带有 `baseUrl` 设置的 `models.providers.xiaomi-token-plan` 配置块；如果没有其中之一，则不会提供该 provider。

## 推理模型

`mimo-v2-pro`、`mimo-v2-omni`、`mimo-v2.5` 和 `mimo-v2.5-pro` 支持 OpenClaw 的 [`/think` 指令](/tools/thinking)，等级包括 `off`、`minimal`、`low`、`medium`、`high`、`xhigh` 和 `max`（默认 `high`）。`mimo-v2-flash` 不支持推理。

## 文本转语音

内置的 `xiaomi` 插件也会将 Xiaomi MiMo 注册为 `messages.tts` 的语音提供方。它使用 Xiaomi 的 chat-completions TTS 协议，将文本作为 `assistant` 消息，并将可选的风格指导作为 `user` 消息。

| Property | Value                                    |
| -------- | ---------------------------------------- |
| TTS id   | `xiaomi` (`mimo` 别名)                  |
| Auth     | `XIAOMI_API_KEY`                         |
| API      | `POST /v1/chat/completions` with `audio` |
| Default  | `mimo-v2.5-tts`，voice `mimo_default`    |
| Output   | 默认输出 MP3；配置后为 WAV               |

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "xiaomi",
      providers: {
        xiaomi: {
          apiKey: "xiaomi_api_key",
          model: "mimo-v2.5-tts",
          speakerVoice: "mimo_default",
          format: "mp3",
          style: "明亮、自然、对话感的语气。",
        },
      },
    },
  },
}
```

内置语音：`mimo_default`、`default_zh`、`default_en`、`Mia`、`Chloe`、`Milo`、`Dean`。预设语音模型（`mimo-v2.5-tts`、`mimo-v2-tts`）使用 `audio.voice`，因此 OpenClaw 会为这些模型发送 `speakerVoice`。

voicedesign 模型 `mimo-v2.5-tts-voicedesign` 会根据自然语言风格提示词生成语音，而不是使用预设语音 id。将 `style` 设为所需的语音描述；OpenClaw 会将其作为 `user` 消息发送，将朗读文本作为 `assistant` 消息发送，并且对该模型省略 `audio.voice`。

```json5
{
  messages: {
    tts: {
      provider: "xiaomi",
      providers: {
        xiaomi: {
          model: "mimo-v2.5-tts-voicedesign",
          format: "wav",
          style: "温暖、自然的女性声音，发音清晰。",
        },
      },
    },
  },
}
```

对于请求语音笔记合成目标的渠道（Discord、Feishu、Matrix、Telegram 和 WhatsApp），OpenClaw 会在交付前使用 `ffmpeg` 将 Xiaomi 输出转码为 48kHz 单声道 Opus。

## 配置示例

```json5
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "小米 MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "小米 MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "小米 MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

定价和兼容性标志来自捆绑的插件清单，因此配置示例省略了 `cost` 和 `compat`，以避免与运行时行为不一致。

Token Plan：

```json5
{
  env: { XIAOMI_TOKEN_PLAN_API_KEY: "tp-your-key" },
  agents: { defaults: { model: { primary: "xiaomi-token-plan/mimo-v2.5-pro" } } },
  models: {
    mode: "merge",
    providers: {
      "xiaomi-token-plan": {
        baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1",
        api: "openai-completions",
        apiKey: "XIAOMI_TOKEN_PLAN_API_KEY",
        models: [
          {
            id: "mimo-v2.5-pro",
            name: "小米 MiMo V2.5 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 131072,
          },
          {
            id: "mimo-v2.5",
            name: "小米 MiMo V2.5",
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

定价来自捆绑的清单（Token Plan 模型包含分层的 cache-read 定价），因此配置示例省略了 `cost`。

<AccordionGroup>
  <Accordion title="自动注入行为">
    当你的环境中设置了 `XIAOMI_API_KEY` 或存在认证配置文件时，`xiaomi` 提供程序会自动启用。`xiaomi-token-plan` 需要区域性 base URL，因此受支持的路径是捆绑的 Token Plan 入门选择，或显式的 `models.providers.xiaomi-token-plan` 配置块。
  </Accordion>

  <Accordion title="模型详情">
    - **mimo-v2-flash** - 轻量且快速，适合通用文本任务。不支持推理。
    - **mimo-v2-pro** - 支持推理，提供 100 万 token 上下文窗口，适用于长文档工作负载。
    - **mimo-v2-omni** - 支持推理的多模态模型，接受文本和图像输入。
    - **mimo-v2.5-pro** - Token Plan 默认模型，采用小米当前的 V2.5 推理栈。
    - **mimo-v2.5** - Token Plan 多模态 V2.5 路由。

    <Note>
    按需付费模型使用 `xiaomi/` 前缀。Token Plan 模型使用 `xiaomi-token-plan/` 前缀。
    </Note>

  </Accordion>

  <Accordion title="故障排除">
    - 如果模型没有出现，请确认相关的密钥环境变量或认证配置文件已存在且有效。
    - 对于 Token Plan，请确认所选 onboarding 区域与订阅页面的 base URL 一致，并且密钥以 `tp-` 开头。
    - 当 Gateway 作为守护进程运行时，请确保该进程可以访问密钥（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

    <Warning>
    仅在交互式 shell 中设置的密钥对由守护进程管理的 Gateway 进程不可见。请使用 `~/.openclaw/.env` 或 `env.shellEnv` 配置以实现持久可用。
    </Warning>

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用以及故障转移行为。
  </Card>
  <Card title="思考层级" href="/tools/thinking" icon="brain">
    `/think` 指令语法和层级映射。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    OpenClaw 完整配置参考。
  </Card>
  <Card title="Xiaomi MiMo 控制台" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 仪表盘和 API 密钥管理。
  </Card>
</CardGroup>
