---
summary: "火山引擎设置（豆包模型、代码端点和 Seed Speech TTS）"
title: "Volcengine（豆包）"
read_when:
  - 你想在 OpenClaw 中使用火山引擎或豆包模型
  - 你需要设置 Volcengine API 密钥
  - 你想使用 Volcengine Speech 文本转语音
---

Volcengine 提供程序可访问豆包模型以及托管在火山引擎上的第三方模型，并为通用工作负载和编程工作负载提供独立端点。相同的捆绑插件还会将 Volcengine Speech 注册为一个 TTS 提供程序。

| 详情       | 值                                                         |
| ---------- | ---------------------------------------------------------- |
| Providers  | `volcengine`（通用 + TTS），`volcengine-plan`（代码）   |
| Model auth | `VOLCANO_ENGINE_API_KEY`                                   |
| TTS auth   | `VOLCENGINE_TTS_API_KEY` 或 `BYTEPLUS_SEED_SPEECH_API_KEY` |
| API        | 兼容 OpenAI 的模型，BytePlus Seed Speech TTS         |

## 入门

<Steps>
  <Step title="设置 API 密钥">
    运行交互式引导：

    ```bash
    openclaw onboard --auth-choice volcengine-api-key
    ```

    这将通过一个 API 密钥同时注册通用（`volcengine`）和编码（`volcengine-plan`）提供方。

  </Step>
  <Step title="设置默认模型">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "volcengine-plan/ark-code-latest" },
        },
      },
    }
    ```
  </Step>
  <Step title="验证模型是否可用">
    ```bash
    openclaw models list --provider volcengine
    openclaw models list --provider volcengine-plan
    ```
  </Step>
</Steps>

<Tip>
对于非交互式设置（CI、脚本），直接传入密钥：

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

</Tip>

## 提供方和端点

| 提供方            | 端点                                       | 使用场景       |
| ----------------- | ------------------------------------------ | -------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | 通用模型       |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | 编码模型       |

<Note>
两个提供方均通过单个 API key 进行配置。设置过程会自动注册两者，而编码提供方的模型选择器也会复用通用提供方的认证（`volcengine-plan` 是 `volcengine` 的认证别名）。
</Note>

## 内置目录

<Tabs>
  <Tab title="General (volcengine)">
    | Model ref                                    | Name                            | Input       | Context |
    | -------------------------------------------- | ------------------------------- | ----------- | ------- |
    | `volcengine/deepseek-v3-2-251201`            | DeepSeek V3.2                   | text, image | 128,000 |
    | `volcengine/doubao-seed-1-8-251228`          | Doubao Seed 1.8                 | text, image | 256,000 |
    | `volcengine/doubao-seed-code-preview-251028` | doubao-seed-code-preview-251028 | text, image | 256,000 |
    | `volcengine/glm-4-7-251222`                  | GLM 4.7                         | text, image | 200,000 |
    | `volcengine/kimi-k2-5-260127`                | Kimi K2.5                       | text, image | 256,000 |
  </Tab>
  <Tab title="编码（volcengine-plan）">
    | 模型引用                                          | 名称                    | 输入  | 上下文   |
    | ------------------------------------------------- | ------------------------ | ----- | ------- |
    | `volcengine-plan/ark-code-latest`                 | Ark Coding Plan          | text  | 256,000 |
    | `volcengine-plan/doubao-seed-code`                | Doubao Seed Code         | text  | 256,000 |
    | `volcengine-plan/doubao-seed-code-preview-251028` | Doubao Seed Code Preview | text  | 256,000 |
    | `volcengine-plan/glm-4.7`                         | GLM 4.7 Coding           | text  | 200,000 |
    | `volcengine-plan/kimi-k2-thinking`                | Kimi K2 Thinking         | text  | 256,000 |
    | `volcengine-plan/kimi-k2.5`                       | Kimi K2.5 Coding         | text  | 256,000 |
  </Tab>
</Tabs>

这两个目录都是静态的（不需要 `/models` 发现调用），并支持与 OpenAI 兼容的流式用量统计。两个提供方的工具 schema 会自动删除 `minLength`、`maxLength`、`minItems`、`maxItems`、`minContains` 和 `maxContains` 关键字，因为 Volcengine 的工具调用 API 会拒绝它们。

## 文本转语音

Volcengine TTS 使用 BytePlus Seed Speech HTTP API（`voice.ap-southeast-1.bytepluses.com`），并且与 OpenAI 兼容的 Doubao 模型 API key 分开配置。在 BytePlus 控制台中，打开 Seed Speech > Settings > API Keys，复制 API key，然后设置：

```bash
export VOLCENGINE_TTS_API_KEY="byteplus_seed_speech_api_key"
export VOLCENGINE_TTS_RESOURCE_ID="seed-tts-1.0"
```

然后在 `openclaw.json` 中启用它：

```json5
{
  messages: {
    tts: {
      auto: "always",
      provider: "volcengine",
      providers: {
        volcengine: {
          apiKey: "byteplus_seed_speech_api_key",
          voice: "en_female_anna_mars_bigtts",
          speedRatio: 1.0,
        },
      },
    },
  },
}
```

`messages.tts.providers.volcengine` 下可用的字段有：`apiKey`、`voice`、`speedRatio`（0.2-3.0）、`emotion`、`cluster`、`resourceId`、`appKey` 和 `baseUrl`。当允许覆盖语音设置时，`!emotion=<value>` 也可以作为行内语音指令使用。

对于语音笔记目标，OpenClaw 会请求提供方原生的 `ogg_opus`。对于普通音频附件，它会请求 `mp3`。提供方别名 `bytedance` 和 `doubao` 也会解析到这个语音提供方。

默认的资源 ID 是 `seed-tts-1.0`，这是 BytePlus 默认授予新创建 Seed Speech API key 的权限。如果你的项目拥有 TTS 2.0 权限，请设置 `VOLCENGINE_TTS_RESOURCE_ID=seed-tts-2.0`。

<Warning>
`VOLCANO_ENGINE_API_KEY` 用于 ModelArk/Doubao 模型端点，不是 Seed Speech API key。TTS 需要来自 BytePlus Speech Console 的 Seed Speech API key，或者旧版 Speech Console 的 AppID/token 配对。
</Warning>

旧版 AppID/token 认证仍然支持较老的 Speech Console 应用：

```bash
export VOLCENGINE_TTS_APPID="speech_app_id"
export VOLCENGINE_TTS_TOKEN="speech_access_token"
export VOLCENGINE_TTS_CLUSTER="volcano_tts"
```

其他可选的 TTS 环境变量：`VOLCENGINE_TTS_VOICE`、`VOLCENGINE_TTS_APP_KEY` 和 `VOLCENGINE_TTS_BASE_URL`，在设置后会覆盖 `messages.tts.providers.volcengine` 中对应的配置字段。

## 高级配置

<AccordionGroup>
  <Accordion title="入门后的默认模型">
    `openclaw onboard --auth-choice volcengine-api-key` 会将 `volcengine-plan/ark-code-latest` 设置为默认模型，同时注册通用的 `volcengine` 目录。
  </Accordion>

  <Accordion title="模型选择器的回退行为">
    在入门/配置模型选择期间，Volcengine 认证选项会优先匹配 `volcengine/*` 和 `volcengine-plan/*` 两类条目。如果这些模型尚未加载，OpenClaw 会回退到未过滤的目录，而不是显示一个空的、按提供方范围过滤的选择器。
  </Accordion>

  <Accordion title="守护进程的环境变量">
    如果 Gateway 作为守护进程（launchd/systemd）运行，请确保模型和 TTS 环境变量可供该进程使用，例如 `VOLCANO_ENGINE_API_KEY`、`VOLCENGINE_TTS_API_KEY`、`BYTEPLUS_SEED_SPEECH_API_KEY`、`VOLCENGINE_TTS_APPID` 和 `VOLCENGINE_TTS_TOKEN`（例如放在 `~/.openclaw/.env` 中，或通过 `env.shellEnv` 提供）。
  </Accordion>
</AccordionGroup>

<Warning>
当 OpenClaw 作为后台服务运行时，在交互式 shell 中设置的环境变量不会自动继承。请参阅上面的守护进程说明。
</Warning>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    agents、models 和 providers 的完整配置参考。
  </Card>
  <Card title="故障排查" href="/help/troubleshooting" icon="wrench">
    常见问题和调试步骤。
  </Card>
  <Card title="常见问题" href="/help/faq" icon="circle-question">
    关于 OpenClaw 设置的常见问题。
  </Card>
</CardGroup>
