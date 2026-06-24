---
summary: "将 Xiaomi MiMo 的按需付费和 Token Plan 模型与 OpenClaw 一起使用"
read_when:
  - 你想在 OpenClaw 中使用 Xiaomi MiMo 模型
  - 你需要 Xiaomi MiMo 认证或 Token Plan 配置
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 内置了一个 Xiaomi 插件，带有两个文本提供方预设：

- `xiaomi` 用于按需付费密钥（`sk-...`）
- `xiaomi-token-plan` 用于 Token Plan 密钥（`tp-...`），并带有区域端点预设

同一个插件还会注册 `xiaomi` 语音（TTS）提供方。

| Property         | Value                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider ids     | `xiaomi`（按需付费），`xiaomi-token-plan`（Token Plan）                                                                                          |
| Plugin           | 内置，`enabledByDefault: true`                                                                                                                    |
| Auth env vars    | `XIAOMI_API_KEY`，`XIAOMI_TOKEN_PLAN_API_KEY`                                                                                                    |
| Onboarding flags | `--auth-choice xiaomi-api-key`，`--auth-choice xiaomi-token-plan-cn`，`--auth-choice xiaomi-token-plan-sgp`，`--auth-choice xiaomi-token-plan-ams` |
| Direct CLI flags | `--xiaomi-api-key <key>`，`--xiaomi-token-plan-api-key <key>`                                                                                    |
| Contracts        | chat completions + `speechProviders`                                                                                                              |
| API              | OpenAI 兼容（`openai-completions`）                                                                                                               |
| Base URLs        | 按需付费：`https://api.xiaomimimo.com/v1`；Token Plan 预设：`token-plan-{cn,sgp,ams}...`                                                        |
| Default models   | `xiaomi/mimo-v2-flash`，`xiaomi-token-plan/mimo-v2.5-pro`                                                                                        |
| TTS default      | `mimo-v2.5-tts`，voice `mimo_default`；voicedesign model `mimo-v2.5-tts-voicedesign`                                                            |

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

## 按需付费目录

| Model ref              | Input       | Context   | Max output | Reasoning | Notes         |
| ---------------------- | ----------- | --------- | ---------- | --------- | ------------- |
| `xiaomi/mimo-v2-flash` | text        | 262,144   | 8,192      | No        | 默认模型      |
| `xiaomi/mimo-v2-pro`   | text        | 1,048,576 | 32,000     | Yes       | 大上下文      |
| `xiaomi/mimo-v2-omni`  | text, image | 262,144   | 32,000     | Yes       | 多模态       |

<Tip>
默认模型引用是 `xiaomi/mimo-v2-flash`。当设置了 `XIAOMI_API_KEY` 或存在认证配置文件时，提供方会自动注入。
</Tip>

## Token Plan 目录

选择与 Xiaomi 订阅界面中显示的区域 base URL 匹配的 Token Plan 认证选项：

- `xiaomi-token-plan-cn` -> `https://token-plan-cn.xiaomimimo.com/v1`
- `xiaomi-token-plan-sgp` -> `https://token-plan-sgp.xiaomimimo.com/v1`
- `xiaomi-token-plan-ams` -> `https://token-plan-ams.xiaomimimo.com/v1`

| Model ref                         | Input       | Context   | Max output | Reasoning | Notes         |
| --------------------------------- | ----------- | --------- | ---------- | --------- | ------------- |
| `xiaomi-token-plan/mimo-v2.5-pro` | text        | 1,048,576 | 131,072    | Yes       | 默认模型       |
| `xiaomi-token-plan/mimo-v2.5`     | text, image | 1,048,576 | 131,072    | Yes       | 多模态       |

<Tip>
Token Plan onboarding 会验证密钥格式，并在将 `tp-...` 密钥输入按需付费路径，或将 `sk-...` 密钥输入 Token Plan 路径时发出警告。
</Tip>

## 文本转语音

捆绑的 `xiaomi` 插件还会将 Xiaomi MiMo 注册为 `messages.tts` 的语音提供方。它会调用 Xiaomi 的 chat-completions TTS 协议，将文本作为
`assistant` 消息，并将可选的风格指导作为 `user` 消息。

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

支持的内置语音包括 `mimo_default`、`default_zh`、`default_en`、
`Mia`、`Chloe`、`Milo` 和 `Dean`。预设语音模型使用 `audio.voice`，因此
OpenClaw 会为 `mimo-v2.5-tts` 和 `mimo-v2-tts` 发送 `speakerVoice`。

Xiaomi 的 voicedesign 模型 `mimo-v2.5-tts-voicedesign` 会根据自然语言风格提示
生成语音，而不是使用预设语音 id。使用所需的语音描述来配置
`style`；OpenClaw 会将其作为 `user`
消息发送，将待播报文本作为 `assistant` 消息发送，并且对该模型省略
`audio.voice`。

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

对于飞书和 Telegram 等语音消息目标，OpenClaw 会在投递前使用 `ffmpeg`
将 Xiaomi 输出转码为 48kHz Opus。

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
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
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
            name: "Xiaomi MiMo V2.5 Pro",
            reasoning: true,
            input: ["text"],
            contextWindow: 1048576,
            maxTokens: 131072,
          },
          {
            id: "mimo-v2.5",
            name: "Xiaomi MiMo V2.5",
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
    当 `XIAOMI_API_KEY` 设置在环境中，或者存在认证配置文件时，`xiaomi` 提供方会自动注入。`xiaomi-token-plan` 需要区域 base URL，因此支持的路径是捆绑的 Token Plan onboarding 选项，或者显式的 `models.providers.xiaomi-token-plan` 配置块。
  </Accordion>

  <Accordion title="模型详情">
    - **mimo-v2-flash** — 轻量且快速，适合通用文本任务。不支持推理。
    - **mimo-v2-pro** — 支持推理，拥有 100 万 token 的上下文窗口，适合长文档工作负载。
    - **mimo-v2-omni** — 支持推理的多模态模型，可接受文本和图像输入。
    - **mimo-v2.5-pro** — Xiaomi 当前 V2.5 推理栈的 Token Plan 默认模型。
    - **mimo-v2.5** — Token Plan 多模态 V2.5 路由。

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
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    完整的 OpenClaw 配置参考。
  </Card>
  <Card title="Xiaomi MiMo 控制台" href="https://platform.xiaomimimo.com" icon="arrow-up-right-from-square">
    Xiaomi MiMo 仪表盘和 API 密钥管理。
  </Card>
</CardGroup>
