---
summary: "在 OpenClaw 中使用 Xiaomi MiMo 模型"
read_when:
  - 你想在 OpenClaw 中使用 Xiaomi MiMo 模型
  - 你需要设置 XIAOMI_API_KEY
title: "Xiaomi MiMo"
---

Xiaomi MiMo 是 **MiMo** 模型的 API 平台。OpenClaw 使用带有 API 密钥认证的 Xiaomi
OpenAI 兼容端点。

| Property | Value                           |
| -------- | ------------------------------- |
| Provider | `xiaomi`                        |
| Auth     | `XIAOMI_API_KEY`                |
| API      | OpenAI-compatible               |
| Base URL | `https://api.xiaomimimo.com/v1` |

## 开始使用

<Steps>
  <Step title="获取 API 密钥">
    在 [Xiaomi MiMo 控制台](https://platform.xiaomimimo.com/#/console/api-keys) 中创建一个 API 密钥。
  </Step>
  <Step title="运行引导">
    ```bash
    openclaw onboard --auth-choice xiaomi-api-key
    ```

    或者直接传入密钥：

    ```bash
    openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"
    ```

  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider xiaomi
    ```
  </Step>
</Steps>

## 内置目录

| Model ref              | Input       | Context   | Max output | Reasoning | Notes         |
| ---------------------- | ----------- | --------- | ---------- | --------- | ------------- |
| `xiaomi/mimo-v2-flash` | text        | 262,144   | 8,192      | No        | 默认模型      |
| `xiaomi/mimo-v2-pro`   | text        | 1,048,576 | 32,000     | Yes       | 大上下文      |
| `xiaomi/mimo-v2-omni`  | text, image | 262,144   | 32,000     | Yes       | 多模态       |

<Tip>
默认模型引用是 `xiaomi/mimo-v2-flash`。当设置了 `XIAOMI_API_KEY` 或存在认证配置文件时，提供方会自动注入。
</Tip>

## 语音转文本

捆绑的 `xiaomi` 插件还会将 Xiaomi MiMo 注册为 `messages.tts` 的语音提供方。它会调用 Xiaomi 的 chat-completions TTS 协议，将文本作为
`assistant` 消息，并将可选的风格指导作为 `user` 消息。

| Property | Value                                    |
| -------- | ---------------------------------------- |
| TTS id   | `xiaomi` (`mimo` 别名)                  |
| Auth     | `XIAOMI_API_KEY`                         |
| API      | `POST /v1/chat/completions` with `audio` |
| Default  | `mimo-v2.5-tts`, voice `mimo_default`    |
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
          voice: "mimo_default",
          format: "mp3",
          style: "Bright, natural, conversational tone.",
        },
      },
    },
  },
}
```

支持的内置音色包括 `mimo_default`、`default_zh`、`default_en`、
`Mia`、`Chloe`、`Milo` 和 `Dean`。`mimo-v2-tts` 支持较旧的 MiMo
TTS 账号；默认使用当前的 MiMo-V2.5 TTS 模型。对于 Feishu 和 Telegram 等
语音笔记目标，OpenClaw 会在交付前使用 `ffmpeg` 将 Xiaomi 输出转码为 48kHz
Opus。

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
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
          {
            id: "mimo-v2-pro",
            name: "Xiaomi MiMo V2 Pro",
            reasoning: true,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1048576,
            maxTokens: 32000,
          },
          {
            id: "mimo-v2-omni",
            name: "Xiaomi MiMo V2 Omni",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="自动注入行为">
    当 `XIAOMI_API_KEY` 设置在你的环境中或存在认证配置文件时，`xiaomi` 提供方会自动注入。除非你想覆盖模型元数据或基础 URL，否则无需手动配置该提供方。
  </Accordion>

  <Accordion title="模型详情">
    - **mimo-v2-flash** — 轻量且快速，适合通用文本任务。不支持推理。
    - **mimo-v2-pro** — 支持推理，拥有 100 万 token 的上下文窗口，适用于长文档工作负载。
    - **mimo-v2-omni** — 支持推理的多模态模型，同时接受文本和图像输入。

    <Note>
    所有模型都使用 `xiaomi/` 前缀（例如 `xiaomi/mimo-v2-pro`）。
    </Note>

  </Accordion>

  <Accordion title="故障排查">
    - 如果模型未出现，请确认 `XIAOMI_API_KEY` 已设置且有效。
    - 当 Gateway 作为守护进程运行时，确保该进程能够访问该密钥（例如在 `~/.openclaw/.env` 中或通过 `env.shellEnv`）。

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
